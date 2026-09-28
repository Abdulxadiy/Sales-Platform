from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from apps.sales.models import Counterparty, DebtPayment, Notification


class DebtServiceError(Exception):
    pass


class DebtService:
    THRESHOLD_UZS = Decimal('10000000.00')  # 10 mln UZS
    THRESHOLD_USD = Decimal('1000.00')      # 1000 USD

    @classmethod
    @transaction.atomic
    def record_payment(
        cls,
        *,
        counterparty: Counterparty,
        amount: Decimal,
        currency: str,
        recorded_by,
        is_correction: bool = False,
        note: str = ''
    ) -> DebtPayment:
        # Permission check: only owner and platform_admin
        if getattr(recorded_by, 'role', None) not in ('owner', 'platform_admin'):
            raise DebtServiceError("Qarz to'lovlarini faqat do'kon egasi yoki admin kiritishi mumkin.")

        if amount == 0:
            raise DebtServiceError("To'lov summasi 0 bo'lishi mumkin emas.")

        if not is_correction and amount < 0:
            raise DebtServiceError("To'lov summasi musbat bo'lishi kerak.")

        if is_correction and not note.strip():
            raise DebtServiceError("Tuzatish (korrektirovka) uchun izoh yozish majburiy.")

        if currency not in ('UZS', 'USD'):
            raise DebtServiceError("Valyuta 'UZS' yoki 'USD' bo'lishi shart.")

        cp = Counterparty.objects.select_for_update().get(pk=counterparty.pk)

        if currency == 'UZS':
            cp.debt_balance_uzs -= amount
        else:
            cp.debt_balance_usd -= amount

        payment = DebtPayment.objects.create(
            tenant=cp.tenant,
            counterparty=cp,
            amount=amount,
            currency=currency,
            recorded_by=recorded_by,
            is_correction=is_correction,
            note=note.strip(),
        )

        cls.check_threshold_and_notify(cp)
        return payment

    @classmethod
    def check_threshold_and_notify(cls, counterparty: Counterparty):
        # 1. UZS Check
        if counterparty.debt_balance_uzs > 0:
            step_uzs = int(counterparty.debt_balance_uzs // cls.THRESHOLD_UZS)
            if step_uzs > counterparty.last_notified_debt_step_uzs:
                Notification.objects.create(
                    tenant=counterparty.tenant,
                    recipient=counterparty.tenant.owner,
                    type=Notification.TYPE_DEBT_WARNING,
                    title="Qarz chegarasi ogohlantirishi (UZS)",
                    message=f"{counterparty.name} ning qarzi {counterparty.debt_balance_uzs:,.2f} UZS ga yetdi!",
                    link=f"/sales/counterparties/{counterparty.id}/",
                )
                counterparty.last_notified_debt_step_uzs = step_uzs
            elif step_uzs < counterparty.last_notified_debt_step_uzs:
                counterparty.last_notified_debt_step_uzs = max(0, step_uzs)
        else:
            counterparty.last_notified_debt_step_uzs = 0

        # 2. USD Check
        if counterparty.debt_balance_usd > 0:
            step_usd = int(counterparty.debt_balance_usd // cls.THRESHOLD_USD)
            if step_usd > counterparty.last_notified_debt_step_usd:
                Notification.objects.create(
                    tenant=counterparty.tenant,
                    recipient=counterparty.tenant.owner,
                    type=Notification.TYPE_DEBT_WARNING,
                    title="Qarz chegarasi ogohlantirishi (USD)",
                    message=f"{counterparty.name} ning qarzi {counterparty.debt_balance_usd:,.2f} USD ga yetdi!",
                    link=f"/sales/counterparties/{counterparty.id}/",
                )
                counterparty.last_notified_debt_step_usd = step_usd
            elif step_usd < counterparty.last_notified_debt_step_usd:
                counterparty.last_notified_debt_step_usd = max(0, step_usd)
        else:
            counterparty.last_notified_debt_step_usd = 0

        counterparty.save(update_fields=[
            'debt_balance_uzs', 'debt_balance_usd',
            'last_notified_debt_step_uzs', 'last_notified_debt_step_usd'
        ])
