from decimal import Decimal
from datetime import datetime, time
from django.db import transaction
from django.utils import timezone
from django.db.models import Sum

from apps.cashbox.models import DailyCashReport, CashExpense, CashIncome
from apps.sales.models import Sale, Notification
from apps.tg_bot.models import TelegramContact
from apps.tg_bot.services import send_telegram_message


class CashboxServiceError(Exception):
    pass


class CashboxService:
    @classmethod
    def record_expense(
        cls,
        *,
        tenant,
        user,
        amount: Decimal,
        currency: str = CashExpense.CURRENCY_UZS,
        category: str,
        note: str = "",
        date=None,
    ) -> CashExpense:
        if amount <= Decimal("0.00"):
            raise CashboxServiceError("Xarajat summasi musbat bo'lishi kerak.")
        if currency not in (CashExpense.CURRENCY_UZS, CashExpense.CURRENCY_USD):
            raise CashboxServiceError(f"Noto'g'ri valyuta: {currency}.")
        if not category or not category.strip():
            raise CashboxServiceError("Xarajat kategoriyasi kiritilishi shart.")

        return CashExpense.objects.create(
            tenant=tenant,
            recorded_by=user,
            amount=amount,
            currency=currency,
            category=category.strip(),
            note=note.strip() if note else "",
            date=date or timezone.now().date(),
        )

    @classmethod
    def record_income(
        cls,
        *,
        tenant,
        user,
        amount: Decimal,
        currency: str = CashIncome.CURRENCY_UZS,
        source: str,
        note: str = "",
        date=None,
    ) -> CashIncome:
        if amount <= Decimal("0.00"):
            raise CashboxServiceError("Kirim summasi musbat bo'lishi kerak.")
        if currency not in (CashIncome.CURRENCY_UZS, CashIncome.CURRENCY_USD):
            raise CashboxServiceError(f"Noto'g'ri valyuta: {currency}.")
        if not source or not source.strip():
            raise CashboxServiceError("Kirim manbasi kiritilishi shart.")

        return CashIncome.objects.create(
            tenant=tenant,
            recorded_by=user,
            amount=amount,
            currency=currency,
            source=source.strip(),
            note=note.strip() if note else "",
            date=date or timezone.now().date(),
        )

    @classmethod
    def get_current_shift_status(cls, tenant) -> dict:
        last_report = DailyCashReport.objects.filter(tenant=tenant).order_by("-closed_at").first()
        if last_report:
            shift_start_dt = last_report.closed_at
        else:
            today = timezone.now().date()
            shift_start_dt = timezone.make_aware(datetime.combine(today, time.min))

        now_dt = timezone.now()

        # Sales during current shift
        valid_statuses = [
            Sale.STATUS_COMPLETED,
            Sale.STATUS_PARTIALLY_VOIDED,
            Sale.STATUS_B2B_ACCEPTED,
            Sale.STATUS_B2B_PARTIALLY_ACCEPTED,
            Sale.STATUS_B2B_PENDING,
        ]

        sales = Sale.objects.filter(
            tenant=tenant,
            status__in=valid_statuses,
            created_at__gte=shift_start_dt,
            created_at__lte=now_dt,
        ).prefetch_related("items")

        total_sale_cash_uzs = Decimal("0.00")
        total_sale_cash_usd = Decimal("0.00")
        total_sale_card_uzs = Decimal("0.00")
        total_sale_card_usd = Decimal("0.00")
        total_sale_debt_uzs = Decimal("0.00")
        total_sale_debt_usd = Decimal("0.00")

        for s in sales:
            if s.status == Sale.STATUS_PARTIALLY_VOIDED:
                sale_amt = sum((it.quantity - it.voided_quantity) * it.unit_price for it in s.items.all())
            else:
                sale_amt = s.total_amount

            if s.currency == Sale.CURRENCY_UZS:
                if s.payment_type == Sale.PAYMENT_CASH:
                    total_sale_cash_uzs += sale_amt
                elif s.payment_type == Sale.PAYMENT_CARD:
                    total_sale_card_uzs += sale_amt
                elif s.payment_type == Sale.PAYMENT_DEBT:
                    total_sale_debt_uzs += sale_amt
            else:
                if s.payment_type == Sale.PAYMENT_CASH:
                    total_sale_cash_usd += sale_amt
                elif s.payment_type == Sale.PAYMENT_CARD:
                    total_sale_card_usd += sale_amt
                elif s.payment_type == Sale.PAYMENT_DEBT:
                    total_sale_debt_usd += sale_amt

        # Incomes unlinked to a shift report
        incomes = CashIncome.objects.filter(tenant=tenant, shift_report__isnull=True)
        total_extra_income_uzs = incomes.filter(currency=CashIncome.CURRENCY_UZS).aggregate(s=Sum("amount"))["s"] or Decimal("0.00")
        total_extra_income_usd = incomes.filter(currency=CashIncome.CURRENCY_USD).aggregate(s=Sum("amount"))["s"] or Decimal("0.00")

        # Expenses unlinked to a shift report
        expenses = CashExpense.objects.filter(tenant=tenant, shift_report__isnull=True)
        total_expenses_uzs = expenses.filter(currency=CashExpense.CURRENCY_UZS).aggregate(s=Sum("amount"))["s"] or Decimal("0.00")
        total_expenses_usd = expenses.filter(currency=CashExpense.CURRENCY_USD).aggregate(s=Sum("amount"))["s"] or Decimal("0.00")

        expected_cash_uzs = total_sale_cash_uzs + total_extra_income_uzs - total_expenses_uzs
        expected_cash_usd = total_sale_cash_usd + total_extra_income_usd - total_expenses_usd

        return {
            "shift_start": shift_start_dt.strftime("%Y-%m-%d %H:%M:%S"),
            "total_sale_cash_uzs": total_sale_cash_uzs,
            "total_sale_cash_usd": total_sale_cash_usd,
            "total_sale_card_uzs": total_sale_card_uzs,
            "total_sale_card_usd": total_sale_card_usd,
            "total_sale_debt_uzs": total_sale_debt_uzs,
            "total_sale_debt_usd": total_sale_debt_usd,
            "total_extra_income_uzs": total_extra_income_uzs,
            "total_extra_income_usd": total_extra_income_usd,
            "total_expenses_uzs": total_expenses_uzs,
            "total_expenses_usd": total_expenses_usd,
            "expected_cash_uzs": expected_cash_uzs,
            "expected_cash_usd": expected_cash_usd,
        }

    @classmethod
    def close_shift(
        cls,
        *,
        tenant,
        user,
        actual_cash_uzs: Decimal,
        actual_cash_usd: Decimal,
        discrepancy_reason: str = "",
        staff_notes: str = "",
    ) -> DailyCashReport:
        if actual_cash_uzs < Decimal("0.00") or actual_cash_usd < Decimal("0.00"):
            raise CashboxServiceError("Amaldagi naqd pul manfiy bo'lishi mumkin emas.")

        with transaction.atomic():
            status = cls.get_current_shift_status(tenant)

            expected_uzs = status["expected_cash_uzs"]
            expected_usd = status["expected_cash_usd"]

            discrepancy_uzs = actual_cash_uzs - expected_uzs
            discrepancy_usd = actual_cash_usd - expected_usd

            has_discrepancy = (discrepancy_uzs != Decimal("0.00") or discrepancy_usd != Decimal("0.00"))
            final_reason = discrepancy_reason.strip() if discrepancy_reason else ""
            if has_discrepancy and not final_reason:
                final_reason = "Smenani yopgan xodim tafovut farqining sababini bilmaydi"

            report = DailyCashReport.objects.create(
                tenant=tenant,
                closed_by=user,
                date=timezone.now().date(),
                total_sale_cash_uzs=status["total_sale_cash_uzs"],
                total_sale_cash_usd=status["total_sale_cash_usd"],
                total_sale_card_uzs=status["total_sale_card_uzs"],
                total_sale_card_usd=status["total_sale_card_usd"],
                total_sale_debt_uzs=status["total_sale_debt_uzs"],
                total_sale_debt_usd=status["total_sale_debt_usd"],
                total_extra_income_uzs=status["total_extra_income_uzs"],
                total_extra_income_usd=status["total_extra_income_usd"],
                total_expenses_uzs=status["total_expenses_uzs"],
                total_expenses_usd=status["total_expenses_usd"],
                expected_cash_uzs=expected_uzs,
                expected_cash_usd=expected_usd,
                actual_cash_uzs=actual_cash_uzs,
                actual_cash_usd=actual_cash_usd,
                discrepancy_uzs=discrepancy_uzs,
                discrepancy_usd=discrepancy_usd,
                discrepancy_reason=final_reason,
                staff_notes=staff_notes.strip() if staff_notes else "",
                is_closed=True,
            )

            # Link unclosed income & expense rows
            CashIncome.objects.filter(tenant=tenant, shift_report__isnull=True).update(shift_report=report)
            CashExpense.objects.filter(tenant=tenant, shift_report__isnull=True).update(shift_report=report)

            # Send Notification to owner
            owner = tenant.owner
            report_msg = cls.format_daily_telegram_report(report)
            Notification.objects.create(
                tenant=tenant,
                recipient=owner,
                type="daily_z_report",
                title=f"Kunlik Z-Hisobot (#{report.id})",
                message=report_msg,
            )

            # Send Telegram if owner has linked telegram
            contact = TelegramContact.objects.filter(phone_number=owner.phone_number).first()
            if contact:
                send_telegram_message(contact.chat_id, report_msg)

            return report

    @classmethod
    def format_daily_telegram_report(cls, report: DailyCashReport) -> str:
        name_parts = [report.closed_by.first_name, report.closed_by.last_name]
        seller_name = " ".join(p for p in name_parts if p).strip() or report.closed_by.username or report.closed_by.phone_number

        lines = [
            "📊 *KUNLIK Z-HISOBOT (SMENA YOPILDI)*",
            f"🏢 *Do'kon:* {report.tenant.name}",
            f"📅 *Sana:* {report.date} | {report.closed_at.strftime('%H:%M')}",
            f"👤 *Smenani yopdi:* {seller_name}",
            "",
            "💵 *KASSA NAQD PULI:*",
            f"• Kutilgan: `{report.expected_cash_uzs:,.2f} UZS` | `${report.expected_cash_usd:,.2f}`",
            f"• Haqiqiy: `{report.actual_cash_uzs:,.2f} UZS` | `${report.actual_cash_usd:,.2f}`",
            f"• Tafovut: `{report.discrepancy_uzs:,.2f} UZS` | `${report.discrepancy_usd:,.2f}`",
        ]

        if report.discrepancy_reason:
            lines.append(f"⚠️ *Tafovut izohi:* {report.discrepancy_reason}")

        lines.extend([
            "",
            "📈 *SAVDOLAR:*",
            f"• Naqd: `{report.total_sale_cash_uzs:,.2f} UZS` | `${report.total_sale_cash_usd:,.2f}`",
            f"• Karta: `{report.total_sale_card_uzs:,.2f} UZS` | `${report.total_sale_card_usd:,.2f}`",
            f"• Nasiya: `{report.total_sale_debt_uzs:,.2f} UZS` | `${report.total_sale_debt_usd:,.2f}`",
            "",
            f"📥 *Qo'shimcha kirim:* `{report.total_extra_income_uzs:,.2f} UZS` | `${report.total_extra_income_usd:,.2f}`",
            f"📤 *Xarajatlar:* `{report.total_expenses_uzs:,.2f} UZS` | `${report.total_expenses_usd:,.2f}`",
        ])

        if report.staff_notes:
            lines.extend([
                "",
                f"📝 *Xodim qo'shimchasi:* {report.staff_notes}",
            ])

        return "\n".join(lines)
