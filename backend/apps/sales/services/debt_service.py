from decimal import Decimal
import hashlib
import json
from django.db import transaction
from apps.core import event_clock as timezone
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
        branch = None,
        is_correction: bool = False,
        note: str = '',
        payment_type: str = None,
        idempotency_key: str = None,
    ) -> DebtPayment:
        from apps.accounts.services.permission_service import PermissionService
        if not PermissionService.has_permission(recorded_by, 'sales.record_debt_payment', tenant=counterparty.tenant):
            raise DebtServiceError("Qarz to‘lovi uchun ruxsat berilmagan.")
        payment_type = payment_type or ('none' if is_correction else 'cash')
        if payment_type not in ('cash', 'card', 'none') or (not is_correction and payment_type == 'none'):
            raise DebtServiceError("To‘lov turi naqd yoki karta bo‘lishi kerak.")
        target_branch = branch or counterparty.tenant
        if not PermissionService.has_permission(recorded_by, "sales.record_debt_payment", tenant=target_branch):
            raise DebtServiceError("To‘lov qabul qiluvchi do‘kon uchun ruxsat berilmagan.")
        idempotency_key = (idempotency_key or "").strip() or None
        if target_branch.owner_id != counterparty.tenant.owner_id or not target_branch.is_active:
            raise DebtServiceError("To‘lov faqat faol va shu egaga tegishli do‘konda qabul qilinadi.")
        from apps.tenants.models import Tenant
        target_branch = Tenant.objects.select_for_update().get(pk=target_branch.pk)
        fingerprint = hashlib.sha256(json.dumps({
            'branch': target_branch.pk, 'amount': str(amount.normalize()), 'currency': currency,
            'type': payment_type, 'correction': is_correction, 'note': note.strip(),
        }, sort_keys=True).encode()).hexdigest()
        cp = Counterparty.objects.select_for_update().get(pk=counterparty.pk)
        if idempotency_key:
            existing = DebtPayment.objects.filter(counterparty=cp, idempotency_key=idempotency_key).first()
            if existing:
                if existing.request_fingerprint != fingerprint:
                    raise DebtServiceError("Idempotency kaliti boshqa to‘lov uchun ishlatilgan.")
                return existing
        shift = None
        if payment_type != 'none':
            from apps.cashbox.services.cashbox_service import CashboxService, CashboxServiceError
            try:
                shift = CashboxService.lock_open_shift(target_branch)
            except CashboxServiceError as exc:
                raise DebtServiceError(str(exc)) from exc

        if amount == 0:
            raise DebtServiceError("To'lov summasi 0 bo'lishi mumkin emas.")

        if not is_correction and amount < 0:
            raise DebtServiceError("To'lov summasi musbat bo'lishi kerak.")

        if is_correction and not note.strip():
            raise DebtServiceError("Tuzatish (korrektirovka) uchun izoh yozish majburiy.")

        if currency not in ('UZS', 'USD'):
            raise DebtServiceError("Valyuta 'UZS' yoki 'USD' bo'lishi shart.")

        effective_note = note.strip()
        exchange_rate = None
        exchange_rate_source = ""
        exchange_rate_date = None
        converted_amount_uzs = None
        if currency == 'UZS':
            cp.debt_balance_uzs -= amount
        else:
            # If counterparty has USD debt, pay off USD debt first
            if cp.debt_balance_usd > 0:
                usd_to_usd_debt = min(amount, cp.debt_balance_usd)
                cp.debt_balance_usd -= usd_to_usd_debt
                remaining_usd = amount - usd_to_usd_debt
            else:
                remaining_usd = amount

            # Deduct remaining USD from UZS debt at shop rate
            if remaining_usd != 0:
                from apps.tenants.exchange_rates import ExchangeRateError, resolve_usd_rate
                try:
                    exchange_rate, exchange_rate_source, exchange_rate_date = resolve_usd_rate(target_branch)
                except ExchangeRateError as exc:
                    raise DebtServiceError(str(exc)) from exc
                uzs_equivalent = (remaining_usd * exchange_rate).quantize(Decimal('0.01'))
                converted_amount_uzs = uzs_equivalent
                cp.debt_balance_uzs -= uzs_equivalent
                conv_text = f"(Kurs: 1 USD = {exchange_rate:,.2f} UZS → {uzs_equivalent:,.2f} UZS so‘m qarzidan ayirildi)"
                effective_note = f"{effective_note} {conv_text}".strip()

        payment = DebtPayment.objects.create(
            tenant=target_branch,
            branch=target_branch, shift=shift, payment_type=payment_type,
            idempotency_key=idempotency_key, request_fingerprint=fingerprint,
            counterparty=cp,
            amount=amount,
            currency=currency,
            exchange_rate=exchange_rate,
            exchange_rate_source=exchange_rate_source,
            exchange_rate_date=exchange_rate_date,
            converted_amount_uzs=converted_amount_uzs,
            recorded_by=recorded_by,
            is_correction=is_correction,
            note=effective_note,
        )

        cls.check_threshold_and_notify(cp)
        return payment

    @classmethod
    def format_telegram_debt_warning(cls, counterparty: Counterparty, currency: str, balance: Decimal) -> str:
        tenant_name = counterparty.tenant.name if counterparty.tenant else "Noma'lum do'kon"
        cp_name = counterparty.name
        phone = counterparty.phone_number if counterparty.phone_number else "Kiritilmagan"
        if currency == "UZS":
            balance_str = f"{balance:,.2f} UZS"
            limit_str = f"{cls.THRESHOLD_UZS:,.2f} UZS"
        else:
            balance_str = f"${balance:,.2f}"
            limit_str = f"${cls.THRESHOLD_USD:,.2f}"

        lines = [
            "⚠️ *QARZ CHEGARASI OGOHLANTIRISHI!*",
            f"🏢 *Do'kon:* {tenant_name}",
            f"👤 *Mijoz / Kontragent:* {cp_name}",
            f"📞 *Telefon:* `{phone}`",
            f"💰 *Umumiy qarzdorlik:* `{balance_str}`",
            "",
            f"⚠️ Belgilangan qarz limiti ({limit_str}) dan oshdi!",
        ]
        return "\n".join(lines)

    @classmethod
    def _notify_owner_telegram(cls, counterparty: Counterparty, currency: str, balance: Decimal):
        tenant = counterparty.tenant
        if not tenant:
            return

        if not getattr(tenant, "notify_on_debt", True):
            return

        owner = getattr(tenant, "owner", None)
        if not owner or not getattr(owner, "phone_number", None):
            return

        from apps.tg_bot.models import TelegramContact
        contact = TelegramContact.objects.filter(phone_number=owner.phone_number).first()
        if not contact or not contact.chat_id:
            return

        text = cls.format_telegram_debt_warning(counterparty, currency, balance)

        try:
            from apps.sales.tasks import send_async_telegram_message_task
            transaction.on_commit(lambda: send_async_telegram_message_task.delay(contact.chat_id, text), robust=True)
        except Exception:
            from apps.tg_bot.services import send_telegram_message
            send_telegram_message(contact.chat_id, text)

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
                cls._notify_owner_telegram(counterparty, currency="UZS", balance=counterparty.debt_balance_uzs)
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
                cls._notify_owner_telegram(counterparty, currency="USD", balance=counterparty.debt_balance_usd)
                counterparty.last_notified_debt_step_usd = step_usd
            elif step_usd < counterparty.last_notified_debt_step_usd:
                counterparty.last_notified_debt_step_usd = max(0, step_usd)
        else:
            counterparty.last_notified_debt_step_usd = 0

        if counterparty.debt_balance_uzs <= 0 and counterparty.debt_balance_usd <= 0:
            counterparty.debt_due_date = None
            counterparty.last_notified_debt_due_date = None
        counterparty.save(update_fields=[
            'debt_balance_uzs', 'debt_balance_usd',
            'last_notified_debt_step_uzs', 'last_notified_debt_step_usd',
            'debt_due_date', 'last_notified_debt_due_date',
        ])
