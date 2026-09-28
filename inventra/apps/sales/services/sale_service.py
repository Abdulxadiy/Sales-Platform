from decimal import Decimal
from datetime import timedelta
from collections import defaultdict
from django.db import transaction
from django.utils import timezone

from apps.catalog.models import ProductVariant
from apps.inventory.services import StockService
from apps.sales.models import Sale, SaleItem, Counterparty, Notification
from apps.sales.services.debt_service import DebtService


class SaleServiceError(Exception):
    pass


class SaleService:
    @staticmethod
    def _next_receipt_number(tenant) -> str:
        today_str = timezone.now().strftime('%Y%m%d')
        prefix = f"POS-{today_str}-"
        
        last_sale = (
            Sale.objects.select_for_update()
            .filter(tenant=tenant, receipt_number__startswith=prefix)
            .order_by('-receipt_number')
            .first()
        )
        if last_sale:
            last_seq = int(last_sale.receipt_number.split('-')[-1])
            next_seq = last_seq + 1
        else:
            next_seq = 1
        return f"{prefix}{next_seq:04d}"

    @classmethod
    @transaction.atomic
    def create_sale(
        cls,
        *,
        tenant,
        user,
        items_data: list,
        payment_type: str = 'cash',
        counterparty: Counterparty = None,
        is_partner_sale: bool = False,
        idempotency_key: str = None,
    ) -> list[Sale]:
        """
        Creates sale(s). If items belong to both UZS and USD categories,
        splits them into 2 separate Sale instances within 1 atomic transaction.
        """
        if idempotency_key:
            existing_sales = list(Sale.objects.filter(tenant=tenant, idempotency_key=idempotency_key))
            if existing_sales:
                return existing_sales

        if not items_data:
            raise SaleServiceError("Savatda kamida bitta tovar bo'lishi shart.")

        if len(items_data) > 100:
            raise SaleServiceError("Bitta chekda ko'pi bilan 100 ta tovar bo'lishi mumkin.")

        if payment_type == Sale.PAYMENT_DEBT and not counterparty:
            raise SaleServiceError("Qarz (nasiya) savdosi uchun kontragent tanlanishi shart.")

        # Load all variants
        variant_ids = [item['product_variant_id'] for item in items_data]
        variants_by_id = {
            v.id: v for v in ProductVariant.objects.select_related('product__category').filter(
                id__in=variant_ids, tenant=tenant, is_active=True
            )
        }

        if len(variants_by_id) != len(set(variant_ids)):
            raise SaleServiceError("Ayrim tovarlar topilmadi yoki nofaol holatda.")

        # Group items by currency
        items_by_currency = defaultdict(list)
        for item in items_data:
            variant = variants_by_id[item['product_variant_id']]
            qty = Decimal(str(item['quantity']))
            if qty <= 0:
                raise SaleServiceError(f"{variant.name} uchun miqdor 0 dan katta bo'lishi shart.")

            # Partner price validation
            if is_partner_sale:
                if variant.price_partner is None or variant.price_partner <= 0:
                    raise SaleServiceError(
                        f"{variant.product.name} ({variant.name}) uchun 1-narx belgilanmagan. To'ldirish majburiy."
                    )
                unit_price = Decimal(str(item.get('unit_price', variant.price_partner)))
            else:
                unit_price = Decimal(str(item.get('unit_price', variant.price_recommended or variant.price_min)))

            if unit_price <= 0:
                raise SaleServiceError(f"{variant.name} narxi 0 dan katta bo'lishi shart.")

            items_by_currency[variant.currency].append({
                'variant': variant,
                'quantity': qty,
                'unit_price': unit_price,
            })

        created_sales = []

        # Sort each currency's items by variant id to prevent deadlocks
        for currency, currency_items in items_by_currency.items():
            sorted_items = sorted(currency_items, key=lambda x: x['variant'].id)
            receipt_number = cls._next_receipt_number(tenant)

            is_b2b = bool(counterparty and counterparty.target_tenant)
            status = Sale.STATUS_B2B_PENDING if is_b2b else Sale.STATUS_COMPLETED
            b2b_expires_at = timezone.now() + timedelta(days=7) if is_b2b else None

            sale = Sale.objects.create(
                tenant=tenant,
                receipt_number=receipt_number,
                sold_by=user,
                counterparty=counterparty,
                currency=currency,
                is_partner_sale=is_partner_sale,
                total_amount=Decimal('0.00'),
                payment_type=payment_type,
                status=status,
                b2b_target_tenant=counterparty.target_tenant if is_b2b else None,
                b2b_expires_at=b2b_expires_at,
                idempotency_key=idempotency_key,
            )

            total_amount = Decimal('0.00')

            for item in sorted_items:
                variant = item['variant']
                qty = item['quantity']
                price = item['unit_price']
                line_total = qty * price

                # Reduce stock & link to sale
                movement = StockService._apply_movement(
                    tenant=tenant,
                    product_variant=variant,
                    type='sotuv',
                    direction='out',
                    quantity=qty,
                    created_by=user,
                    sale=sale,
                    note=f"Sotuv cheki: {receipt_number}",
                )

                cost_price = variant.stock.last_cost_price or Decimal('0.00')

                SaleItem.objects.create(
                    tenant=tenant,
                    sale=sale,
                    product_variant=variant,
                    quantity=qty,
                    unit_price=price,
                    cost_price=cost_price,
                    original_partner_price=variant.price_partner,
                    total_price=line_total,
                    status=SaleItem.STATUS_ACTIVE,
                )

                total_amount += line_total

            sale.total_amount = total_amount
            sale.save(update_fields=['total_amount'])

            # If debt payment, update counterparty balance
            if payment_type == Sale.PAYMENT_DEBT:
                cp = Counterparty.objects.select_for_update().get(pk=counterparty.pk)
                if currency == 'UZS':
                    cp.debt_balance_uzs += total_amount
                else:
                    cp.debt_balance_usd += total_amount
                cp.save()
                DebtService.check_threshold_and_notify(cp)

            # If B2B, notify recipient tenant owner
            if is_b2b:
                target_owner = counterparty.target_tenant.owner
                Notification.objects.create(
                    tenant=counterparty.target_tenant,
                    recipient=target_owner,
                    type=Notification.TYPE_B2B_REQUEST,
                    title="Yangi B2B tovar o'tkazmasi",
                    message=f"{tenant.name} dan {total_amount:,.2f} {currency} qiymatida tovarlar yuborildi.",
                    link=f"/sales/b2b/inbox/",
                )

            created_sales.append(sale)

        return created_sales
