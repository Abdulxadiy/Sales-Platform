from decimal import Decimal
from datetime import timedelta
from django.db import transaction
from django.utils import timezone

from apps.inventory.services import StockService
from apps.sales.models import Sale, SaleItem, SaleVoidLog, Notification
from apps.sales.services.debt_service import DebtService


class VoidServiceError(Exception):
    pass


class VoidService:
    @staticmethod
    def _validate_void_eligibility(sale, user, reason: str):
        if not reason or not reason.strip():
            raise VoidServiceError("Bekor qilish sababi kiritilishi shart.")

        if timezone.now() - sale.created_at > timedelta(days=7):
            raise VoidServiceError("Sotuv qilinganiga 1 haftadan (7 kundan) oshgan, bekor qilib bo'lmaydi.")

        if sale.status == Sale.STATUS_B2B_ACCEPTED:
            raise VoidServiceError("Qabul qilingan B2B transferni bekor qilib bo'lmaydi.")

        if sale.status == Sale.STATUS_VOIDED:
            raise VoidServiceError("Ushbu sotuv allaqachon bekor qilingan.")

    @classmethod
    @transaction.atomic
    def void_sale(cls, *, sale: Sale, user, reason: str) -> Sale:
        sale = Sale.objects.select_for_update().get(pk=sale.pk)
        cls._validate_void_eligibility(sale, user, reason)

        reason = reason.strip()
        items = list(sale.items.select_for_update().all())

        for item in items:
            remaining_qty = item.quantity - item.voided_quantity
            if remaining_qty > 0:
                StockService.customer_return(
                    tenant=sale.tenant,
                    branch=sale.branch,
                    product_variant=item.product_variant,
                    quantity=remaining_qty,
                    created_by=user,
                    note=f"Sotuv bekor qilindi ({sale.receipt_number}): {reason}",
                    sale=sale,
                )
                SaleVoidLog.objects.create(
                    tenant=sale.tenant,
                    sale_item=item,
                    quantity=remaining_qty,
                    reason=reason,
                    voided_by=user,
                )
                item.voided_quantity = item.quantity
                item.status = SaleItem.STATUS_VOIDED
                item.save(update_fields=['voided_quantity', 'status'])

        sale.status = Sale.STATUS_VOIDED
        sale.voided_at = timezone.now()
        sale.voided_by = user
        sale.void_reason = reason
        sale.save(update_fields=['status', 'voided_at', 'voided_by', 'void_reason'])

        # Adjust counterparty debt if sale was on debt
        if sale.payment_type == Sale.PAYMENT_DEBT and sale.counterparty_id:
            from apps.sales.models import Counterparty
            cp = Counterparty.objects.select_for_update().get(pk=sale.counterparty_id)
            if sale.currency == 'UZS':
                cp.debt_balance_uzs -= sale.total_amount
            else:
                cp.debt_balance_usd -= sale.total_amount
            cp.save(update_fields=['debt_balance_uzs', 'debt_balance_usd'])
            DebtService.check_threshold_and_notify(cp)

        # If B2B transfer was pending or rejected, notify receiver
        if sale.b2b_target_tenant:
            Notification.objects.create(
                tenant=sale.b2b_target_tenant,
                recipient=sale.b2b_target_tenant.owner,
                type=Notification.TYPE_B2B_CANCELLED,
                title="B2B o'tkazma bekor qilindi",
                message=f"{sale.tenant.name} {sale.receipt_number} raqamli B2B transferni bekor qildi.",
                link="/sales/b2b/inbox/",
            )

        from apps.core.models import AuditAction
        from apps.core.services.audit_service import AuditService
        AuditService.log(
            action=AuditAction.VOID_SALE,
            actor=user,
            tenant=sale.tenant,
            target_model="Sale",
            target_id=str(sale.id),
            changes={
                "status": {"old": "completed", "new": Sale.STATUS_VOIDED},
                "total_amount": str(sale.total_amount),
                "reason": reason,
            },
            description=f"Sale {sale.receipt_number} voided: {reason}",
        )

        return sale

    @classmethod
    @transaction.atomic
    def void_sale_item(cls, *, sale_item: SaleItem, user, quantity: Decimal, reason: str) -> SaleItem:
        if not reason or not reason.strip():
            raise VoidServiceError("Bekor qilish sababi kiritilishi shart.")

        sale = Sale.objects.select_for_update().get(pk=sale_item.sale.pk)
        cls._validate_void_eligibility(sale, user, reason)

        sale_item = SaleItem.objects.select_for_update().get(pk=sale_item.pk)
        available_qty = sale_item.quantity - sale_item.voided_quantity

        if quantity <= 0:
            raise VoidServiceError("Bekor qilinadigan miqdor 0 dan katta bo'lishi shart.")
        if quantity > available_qty:
            raise VoidServiceError(f"Qaytariladigan miqdor mavjud qoldiqdan ({available_qty}) katta bo'lishi mumkin emas.")

        reason = reason.strip()
        StockService.customer_return(
            tenant=sale.tenant,
            branch=sale.branch,
            product_variant=sale_item.product_variant,
            quantity=quantity,
            created_by=user,
            note=f"Qisman qaytarish ({sale.receipt_number}): {reason}",
            sale=sale,
        )

        SaleVoidLog.objects.create(
            tenant=sale.tenant,
            sale_item=sale_item,
            quantity=quantity,
            reason=reason,
            voided_by=user,
        )

        sale_item.voided_quantity += quantity
        if sale_item.voided_quantity == sale_item.quantity:
            sale_item.status = SaleItem.STATUS_VOIDED
        else:
            sale_item.status = SaleItem.STATUS_PARTIALLY_VOIDED
        sale_item.save(update_fields=['voided_quantity', 'status'])

        # Adjust counterparty debt
        refund_amount = quantity * sale_item.unit_price
        if sale.payment_type == Sale.PAYMENT_DEBT and sale.counterparty_id:
            from apps.sales.models import Counterparty
            cp = Counterparty.objects.select_for_update().get(pk=sale.counterparty_id)
            if sale.currency == 'UZS':
                cp.debt_balance_uzs -= refund_amount
            else:
                cp.debt_balance_usd -= refund_amount
            cp.save(update_fields=['debt_balance_uzs', 'debt_balance_usd'])
            DebtService.check_threshold_and_notify(cp)

        # Adjust sale total amount
        sale.total_amount = max(Decimal('0.00'), sale.total_amount - refund_amount)

        # Check all items status in sale
        all_items = list(sale.items.all())
        all_voided = all(it.voided_quantity == it.quantity for it in all_items)
        if all_voided:
            sale.status = Sale.STATUS_VOIDED
            sale.voided_at = timezone.now()
            sale.voided_by = user
            sale.void_reason = reason
        else:
            sale.status = Sale.STATUS_PARTIALLY_VOIDED

        sale.save(update_fields=['status', 'voided_at', 'voided_by', 'void_reason', 'total_amount'])

        from apps.core.models import AuditAction
        from apps.core.services.audit_service import AuditService
        AuditService.log(
            action=AuditAction.VOID_SALE,
            actor=user,
            tenant=sale.tenant,
            target_model="SaleItem",
            target_id=str(sale_item.id),
            changes={
                "sale_id": str(sale.id),
                "quantity": str(quantity),
                "reason": reason,
            },
            description=f"Sale item {sale_item.id} from {sale.receipt_number} voided ({quantity} qty): {reason}",
        )

        return sale_item
