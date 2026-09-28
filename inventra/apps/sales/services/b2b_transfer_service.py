from decimal import Decimal
from django.db import transaction
from django.utils import timezone

from apps.catalog.models import Category, Product, ProductVariant
from apps.catalog.services import ProductService
from apps.inventory.services import StockService
from apps.sales.models import Sale, SaleItem, Notification


class B2BTransferServiceError(Exception):
    pass


class B2BTransferService:
    @classmethod
    @transaction.atomic
    def accept_transfer(
        cls,
        *,
        sale: Sale,
        accepting_user,
        items_payload: list[dict],
    ) -> Sale:
        """
        B tenant owner accepts items.
        items_payload: [
            {
                'sale_item_id': int,
                'accepted_quantity': Decimal,
                'target_category_id': int (optional),
                'target_variant_id': int (optional),
            }, ...
        ]
        """
        sale = Sale.objects.select_for_update().get(pk=sale.pk)
        if sale.status not in (Sale.STATUS_B2B_PENDING, Sale.STATUS_B2B_PARTIALLY_ACCEPTED):
            raise B2BTransferServiceError("Faqat kutilayotgan B2B transferni qabul qilish mumkin.")

        if accepting_user.tenant != sale.b2b_target_tenant:
            raise B2BTransferServiceError("Faqat qabul qiluvchi do'kon foydalanuvchisi qabul qila oladi.")

        if sale.b2b_expires_at and timezone.now() > sale.b2b_expires_at:
            raise B2BTransferServiceError("Ushbu transfer muddati tugagan (7 kun o'tgan).")

        b_tenant = sale.b2b_target_tenant
        items_by_id = {it.id: it for it in sale.items.select_for_update().all()}

        total_accepted_items = 0
        total_items_count = len(items_by_id)

        for payload in items_payload:
            item_id = payload['sale_item_id']
            if item_id not in items_by_id:
                raise B2BTransferServiceError(f"SaleItem {item_id} ushbu chekka tegishli emas.")

            item = items_by_id[item_id]
            accepted_qty = Decimal(str(payload['accepted_quantity']))
            max_qty = item.quantity - item.b2b_accepted_quantity

            if accepted_qty < 0 or accepted_qty > max_qty:
                raise B2BTransferServiceError(
                    f"{item.product_variant.name} uchun qabul miqdori noto'g'ri (0 dan {max_qty} gacha bo'lishi kerak)."
                )

            if accepted_qty > 0:
                target_variant = None
                target_variant_id = payload.get('target_variant_id')
                target_category_id = payload.get('target_category_id')

                if target_variant_id:
                    target_variant = ProductVariant.objects.filter(
                        pk=target_variant_id, tenant=b_tenant, is_active=True
                    ).first()
                    if not target_variant:
                        raise B2BTransferServiceError("Tanlangan mavjud variant topilmadi.")
                    if target_variant.currency != sale.currency:
                        raise B2BTransferServiceError("Mavjud variantning valyutasi transfer valyutasiga mos kelmaydi.")
                elif target_category_id:
                    category = Category.objects.filter(
                        pk=target_category_id, tenant=b_tenant, is_active=True
                    ).first()
                    if not category:
                        raise B2BTransferServiceError("Tanlangan kategoriya topilmadi.")
                    if category.currency != sale.currency:
                        raise B2BTransferServiceError("Tanlangan kategoriya valyutasi transfer valyutasiga mos kelmaydi.")

                    # Create Product & ProductVariant in B
                    orig_variant = item.product_variant
                    orig_product = orig_variant.product

                    new_product = Product.objects.create(
                        tenant=b_tenant,
                        name=orig_product.name,
                        category=category,
                    )
                    target_variant = ProductService.add_variant(
                        product=new_product,
                        name=orig_variant.name,
                        unit=orig_variant.unit,
                        price_partner=Decimal('0.00'),
                        price_min=Decimal('0.00'),
                        price_recommended=Decimal('0.00'),
                    )
                else:
                    raise B2BTransferServiceError(
                        f"{item.product_variant.name} uchun kategoriya yoki mavjud variant tanlanishi shart."
                    )

                # Intake into B's stock with cost_price = item.unit_price
                StockService.intake(
                    tenant=b_tenant,
                    product_variant=target_variant,
                    quantity=accepted_qty,
                    cost_price=item.unit_price,
                    created_by=accepting_user,
                    note=f"B2B qabul qilindi: {sale.receipt_number} ({sale.tenant.name} dan)",
                )

                item.b2b_accepted_quantity += accepted_qty

            rejected_qty = item.quantity - item.b2b_accepted_quantity
            item.b2b_rejected_quantity = rejected_qty

            if item.b2b_accepted_quantity == item.quantity:
                item.status = SaleItem.STATUS_B2B_ACCEPTED
                total_accepted_items += 1
            elif item.b2b_accepted_quantity > 0:
                item.status = SaleItem.STATUS_PARTIALLY_VOIDED  # partially accepted
            else:
                item.status = SaleItem.STATUS_B2B_REJECTED

            item.save(update_fields=['b2b_accepted_quantity', 'b2b_rejected_quantity', 'status'])

        if total_accepted_items == total_items_count:
            sale.status = Sale.STATUS_B2B_ACCEPTED
        else:
            sale.status = Sale.STATUS_B2B_PARTIALLY_ACCEPTED

        sale.save(update_fields=['status'])

        # Notify A's owner
        Notification.objects.create(
            tenant=sale.tenant,
            recipient=sale.tenant.owner,
            type=Notification.TYPE_B2B_ACCEPTED,
            title="B2B transfer qabul qilindi",
            message=f"{b_tenant.name} {sale.receipt_number} raqamli transferni qabul qildi (holati: {sale.get_status_display()}).",
            link=f"/sales/{sale.id}/",
        )

        return sale

    @classmethod
    @transaction.atomic
    def reject_transfer(cls, *, sale: Sale, rejecting_user, reason: str) -> Sale:
        if not reason or not reason.strip():
            raise B2BTransferServiceError("Rad etish sababi kiritilishi shart.")

        sale = Sale.objects.select_for_update().get(pk=sale.pk)
        if sale.status != Sale.STATUS_B2B_PENDING:
            raise B2BTransferServiceError("Faqat kutilayotgan transferni rad etish mumkin.")

        if rejecting_user.tenant != sale.b2b_target_tenant:
            raise B2BTransferServiceError("Faqat qabul qiluvchi do'kon rad eta oladi.")

        sale.status = Sale.STATUS_B2B_REJECTED
        sale.b2b_reject_reason = reason.strip()
        sale.save(update_fields=['status', 'b2b_reject_reason'])

        for item in sale.items.all():
            item.b2b_rejected_quantity = item.quantity
            item.status = SaleItem.STATUS_B2B_REJECTED
            item.save(update_fields=['b2b_rejected_quantity', 'status'])

        # Notify A
        Notification.objects.create(
            tenant=sale.tenant,
            recipient=sale.tenant.owner,
            type=Notification.TYPE_B2B_REJECTED,
            title="B2B transfer rad etildi",
            message=f"{sale.b2b_target_tenant.name} {sale.receipt_number} raqamli transferni rad etdi. Sababi: {reason.strip()}",
            link=f"/sales/{sale.id}/",
        )
        return sale

    @classmethod
    @transaction.atomic
    def auto_expire_transfers(cls, tenant=None) -> int:
        """
        Finds pending/partially accepted B2B sales older than b2b_expires_at,
        marks them b2b_rejected with reject reason 'Muddati o'tib ketgan (7 kun).'
        and notifies sender tenant's owner.
        """
        qs = Sale.objects.select_for_update().filter(
            status__in=[Sale.STATUS_B2B_PENDING, Sale.STATUS_B2B_PARTIALLY_ACCEPTED],
            b2b_expires_at__lt=timezone.now(),
        )
        if tenant:
            qs = qs.filter(tenant=tenant)

        count = 0
        for sale in qs:
            sale.status = Sale.STATUS_B2B_REJECTED
            sale.b2b_reject_reason = "Muddati o'tib ketgan (7 kun)."
            sale.save(update_fields=['status', 'b2b_reject_reason'])
            for item in sale.items.all():
                if item.status != SaleItem.STATUS_B2B_ACCEPTED:
                    item.status = SaleItem.STATUS_B2B_REJECTED
                    item.b2b_rejected_quantity = item.quantity - item.b2b_accepted_quantity
                    item.save(update_fields=['status', 'b2b_rejected_quantity'])

            Notification.objects.create(
                tenant=sale.tenant,
                recipient=sale.tenant.owner,
                type=Notification.TYPE_B2B_REJECTED,
                title="B2B transfer muddati tugadi",
                message=f"{sale.receipt_number} raqamli transfer muddati (7 kun) o'tib ketganligi sababli bekor qilindi.",
                link=f"/sales/{sale.id}/",
            )
            count += 1
        return count

