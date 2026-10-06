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

        has_activity = sales.exists() or incomes.exists() or expenses.exists()
        is_open = (last_report is None) or has_activity
        status_str = "OPEN" if is_open else "CLOSED"

        return {
            "is_open": is_open,
            "status": status_str,
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
            "incomes": [
                {
                    "source": inc.source,
                    "amount": str(inc.amount),
                    "currency": inc.currency,
                    "note": inc.note,
                }
                for inc in incomes
            ],
            "expenses": [
                {
                    "category": exp.category,
                    "amount": str(exp.amount),
                    "currency": exp.currency,
                    "note": exp.note,
                }
                for exp in expenses
            ],
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
            if not has_discrepancy:
                final_reason = ""
            elif not final_reason:
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

            if has_discrepancy:
                from apps.core.models import AuditAction
                from apps.core.services.audit_service import AuditService
                AuditService.log(
                    action=AuditAction.CASH_DISCREPANCY,
                    actor=user,
                    tenant=tenant,
                    target_model="DailyCashReport",
                    target_id=str(report.id),
                    changes={
                        "expected_uzs": str(expected_uzs),
                        "actual_uzs": str(actual_cash_uzs),
                        "discrepancy_uzs": str(discrepancy_uzs),
                        "expected_usd": str(expected_usd),
                        "actual_usd": str(actual_cash_usd),
                        "discrepancy_usd": str(discrepancy_usd),
                        "reason": final_reason,
                    },
                    description=f"Cash discrepancy on shift close: UZS {discrepancy_uzs}, USD {discrepancy_usd}. Reason: {final_reason}",
                )


            # Send Notification to owner (web interface) if enabled
            if getattr(tenant, "notify_web_reports", True):
                owner = tenant.owner
                notif_msg = cls.format_daily_report_message(report)
                Notification.objects.create(
                    tenant=tenant,
                    recipient=owner,
                    type="daily_z_report",
                    title=f"Kunlik Z-Hisobot (#{report.id})",
                    message=notif_msg,
                )

            # Send Telegram if enabled and configured
            shift_target = getattr(tenant, "shift_report_target", "both")
            if shift_target != "none":
                dest_chat_ids = set()
                if shift_target in ("personal", "both"):
                    contact = TelegramContact.objects.filter(phone_number=owner.phone_number).first()
                    if contact and contact.chat_id:
                        dest_chat_ids.add(contact.chat_id)
                if shift_target in ("group", "both"):
                    if getattr(tenant, "telegram_group_id", "") and tenant.telegram_group_id.strip():
                        dest_chat_ids.add(tenant.telegram_group_id.strip())

                if dest_chat_ids:
                    telegram_msg = cls.format_daily_telegram_report(report)
                    for c_id in dest_chat_ids:
                        send_telegram_message(c_id, telegram_msg)

            return report

    @classmethod
    def format_daily_report_message(cls, report: DailyCashReport) -> str:
        """
        To'liq Z-Hisobot formati: veb-interfeys va ichki bildirishnomalar uchun.
        Barcha bandlar (Naqd, Karta, Nasiya, Qo'shimcha kirim va Chiqimlar) to'liq saqlanadi.
        """
        name_parts = [report.closed_by.first_name, report.closed_by.last_name]
        seller_name = " ".join(p for p in name_parts if p).strip() or report.closed_by.username or report.closed_by.phone_number

        def _fmt_usd(val):
            v = Decimal(str(val or 0))
            if v < 0:
                return f"-${abs(v):,.2f}"
            return f"${v:,.2f}"

        def _fmt_uzs(val):
            v = Decimal(str(val or 0))
            if v < 0:
                return f"-{abs(v):,.2f} UZS"
            return f"{v:,.2f} UZS"

        has_diff = report.discrepancy_uzs != 0 or report.discrepancy_usd != 0

        lines = [
            "📊 *KUNLIK Z-HISOBOT (SMENA YOPILDI)*",
            f"🏢 *Do'kon:* {report.tenant.name}",
            f"📅 *Sana:* {report.date} | {report.closed_at.strftime('%H:%M')}",
            f"👤 *Smenani yopdi:* {seller_name}",
            "",
            "💵 *KASSA NAQD PULI:*",
            f"• Kutilgan: `{_fmt_uzs(report.expected_cash_uzs)}` | `{_fmt_usd(report.expected_cash_usd)}`",
            f"• Haqiqiy: `{_fmt_uzs(report.actual_cash_uzs)}` | `{_fmt_usd(report.actual_cash_usd)}`",
        ]

        if not has_diff:
            lines.append("• Tafovut: `0.00 UZS`")
            lines.append("✅ *Tafovut holati:* Tafovut mavjud emas (Kassa to'liq)")
        else:
            diff_parts = []
            if report.discrepancy_uzs != 0:
                diff_parts.append(_fmt_uzs(report.discrepancy_uzs))
            if report.discrepancy_usd != 0:
                diff_parts.append(_fmt_usd(report.discrepancy_usd))
            diff_str = " | ".join(f"`{p}`" for p in diff_parts)
            is_kamomad = (report.discrepancy_uzs < 0 or report.discrepancy_usd < 0)
            status_text = "Kamomad aniqlandi" if is_kamomad else "Ortiqchalik aniqlandi"
            lines.append(f"• Tafovut: {diff_str} ({'Kamomad' if is_kamomad else 'Ortiqcha'})")
            lines.append(f"⚠️ *Tafovut holati:* {status_text}")
            if report.discrepancy_reason:
                lines.append(f"⚠️ *Tafovut izohi:* {report.discrepancy_reason}")

        lines.extend([
            "",
            "📈 *SAVDOLAR:*",
            f"• Naqd: `{_fmt_uzs(report.total_sale_cash_uzs)}` | `{_fmt_usd(report.total_sale_cash_usd)}`",
            f"• Karta: `{_fmt_uzs(report.total_sale_card_uzs)}` | `{_fmt_usd(report.total_sale_card_usd)}`",
            f"• Nasiya: `{_fmt_uzs(report.total_sale_debt_uzs)}` | `{_fmt_usd(report.total_sale_debt_usd)}`",
            "",
        ])

        # Qo'shimcha kirimlar tafsiloti
        incomes = list(report.incomes.all().order_by("created_at"))
        if incomes:
            lines.append(f"📥 *QO'SHIMCHA KIRIMLAR:* `{_fmt_uzs(report.total_extra_income_uzs)}` | `{_fmt_usd(report.total_extra_income_usd)}`")
            for inc in incomes:
                note_part = f" — _{inc.note}_" if inc.note else ""
                lines.append(f"   • *{inc.source}:* `+{Decimal(str(inc.amount)):,.2f} {inc.currency}`{note_part}")
        else:
            lines.append(f"📥 *Qo'shimcha kirim:* `0.00 UZS` | `$0.00`")

        lines.append("")

        # Chiqimlar / Xarajatlar tafsiloti
        expenses = list(report.expenses.all().order_by("created_at"))
        if expenses:
            lines.append(f"📤 *XARAJATLAR / CHIQIMLAR:* `-{abs(Decimal(str(report.total_expenses_uzs))):,.2f} UZS` | `{_fmt_usd(-abs(Decimal(str(report.total_expenses_usd))))}`")
            for exp in expenses:
                note_part = f" — _{exp.note}_" if exp.note else ""
                lines.append(f"   • *{exp.category}:* `-{Decimal(str(exp.amount)):,.2f} {exp.currency}`{note_part}")
        else:
            lines.append(f"📤 *Xarajatlar:* `0.00 UZS` | `$0.00`")

        if report.staff_notes:
            lines.extend([
                "",
                f"📝 *Xodim qo'shimchasi:* {report.staff_notes}",
            ])

        return "\n".join(lines)

    @classmethod
    def format_daily_telegram_report(cls, report: DailyCashReport) -> str:
        name_parts = [report.closed_by.first_name, report.closed_by.last_name]
        seller_name = " ".join(p for p in name_parts if p).strip() or report.closed_by.username or report.closed_by.phone_number

        def _fmt_usd(val):
            v = Decimal(str(val or 0))
            if v < 0:
                return f"-${abs(v):,.2f}"
            return f"${v:,.2f}"

        def _fmt_uzs(val):
            v = Decimal(str(val or 0))
            if v < 0:
                return f"-{abs(v):,.2f} UZS"
            return f"{v:,.2f} UZS"

        def _fmt_line_amounts(val_uzs, val_usd, prefix=""):
            v_uzs = Decimal(str(val_uzs or 0))
            v_usd = Decimal(str(val_usd or 0))
            parts = []
            if v_uzs != 0:
                uzs_text = f"{v_uzs:,.2f} UZS" if v_uzs >= 0 else f"-{abs(v_uzs):,.2f} UZS"
                if prefix and v_uzs > 0:
                    uzs_text = f"{prefix}{uzs_text}"
                parts.append(uzs_text)
            if v_usd != 0:
                usd_text = f"${v_usd:,.2f}" if v_usd >= 0 else f"-${abs(v_usd):,.2f}"
                if prefix and v_usd > 0:
                    usd_text = f"{prefix}{usd_text}"
                parts.append(usd_text)
            if not parts:
                return "0.00 UZS"
            return " | ".join(parts)

        has_diff = report.discrepancy_uzs != 0 or report.discrepancy_usd != 0

        lines = [
            "📊 *KUNLIK Z-HISOBOT (SMENA YOPILDI)*",
            f"🏢 *Do'kon:* {report.tenant.name}",
            f"📅 *Sana:* {report.date} | {report.closed_at.strftime('%H:%M')}",
            f"👤 *Smenani yopdi:* {seller_name}",
            "",
            "💵 *KASSA NAQD PULI:*",
            f"• Kutilgan: `{_fmt_line_amounts(report.expected_cash_uzs, report.expected_cash_usd)}`",
            f"• Haqiqiy: `{_fmt_line_amounts(report.actual_cash_uzs, report.actual_cash_usd)}`",
        ]

        if not has_diff:
            lines.append("• Tafovut: `0.00 UZS`")
            lines.append("✅ *Tafovut holati:* Tafovut mavjud emas (Kassa to'liq)")
        else:
            diff_parts = []
            if report.discrepancy_uzs != 0:
                diff_parts.append(_fmt_uzs(report.discrepancy_uzs))
            if report.discrepancy_usd != 0:
                diff_parts.append(_fmt_usd(report.discrepancy_usd))
            diff_str = " | ".join(f"`{p}`" for p in diff_parts)
            is_kamomad = (report.discrepancy_uzs < 0 or report.discrepancy_usd < 0)
            status_text = "Kamomad aniqlandi" if is_kamomad else "Ortiqchalik aniqlandi"
            lines.append(f"• Tafovut: {diff_str} ({'Kamomad' if is_kamomad else 'Ortiqcha'})")
            lines.append(f"⚠️ *Tafovut holati:* {status_text}")
            if report.discrepancy_reason:
                lines.append(f"⚠️ *Tafovut izohi:* {report.discrepancy_reason}")

        # SAVDOLAR: Faqat o'sha kuni amalga oshirilgan (mavjud / > 0) to'lov turlari
        sales_lines = []
        c_uzs = Decimal(str(report.total_sale_cash_uzs or 0))
        c_usd = Decimal(str(report.total_sale_cash_usd or 0))
        if c_uzs != 0 or c_usd != 0:
            sales_lines.append(f"• Naqd: `{_fmt_line_amounts(c_uzs, c_usd)}`")

        card_uzs = Decimal(str(report.total_sale_card_uzs or 0))
        card_usd = Decimal(str(report.total_sale_card_usd or 0))
        if card_uzs != 0 or card_usd != 0:
            sales_lines.append(f"• Karta: `{_fmt_line_amounts(card_uzs, card_usd)}`")

        debt_uzs = Decimal(str(report.total_sale_debt_uzs or 0))
        debt_usd = Decimal(str(report.total_sale_debt_usd or 0))
        if debt_uzs != 0 or debt_usd != 0:
            sales_lines.append(f"• Nasiya: `{_fmt_line_amounts(debt_uzs, debt_usd)}`")

        if not sales_lines:
            sales_lines.append("• Savdolar mavjud emas (0.00 UZS)")

        lines.append("")
        lines.append("📈 *SAVDOLAR:*")
        lines.extend(sales_lines)

        # Qo'shimcha kirimlar tafsiloti (faqat mavjud bo'lsa)
        incomes = list(report.incomes.all().order_by("created_at"))
        has_incomes = len(incomes) > 0 or Decimal(str(report.total_extra_income_uzs or 0)) != 0 or Decimal(str(report.total_extra_income_usd or 0)) != 0
        if has_incomes:
            lines.append("")
            lines.append(f"📥 *QO'SHIMCHA KIRIMLAR:* `{_fmt_line_amounts(report.total_extra_income_uzs, report.total_extra_income_usd, prefix='+')}`")
            for inc in incomes:
                note_part = f" — _{inc.note}_" if inc.note else ""
                lines.append(f"   • *{inc.source}:* `+{Decimal(str(inc.amount)):,.2f} {inc.currency}`{note_part}")

        # Chiqimlar / Xarajatlar tafsiloti (faqat mavjud bo'lsa)
        expenses = list(report.expenses.all().order_by("created_at"))
        has_expenses = len(expenses) > 0 or Decimal(str(report.total_expenses_uzs or 0)) != 0 or Decimal(str(report.total_expenses_usd or 0)) != 0
        if has_expenses:
            lines.append("")
            total_exp_uzs = -abs(Decimal(str(report.total_expenses_uzs or 0)))
            total_exp_usd = -abs(Decimal(str(report.total_expenses_usd or 0))) if Decimal(str(report.total_expenses_usd or 0)) != 0 else Decimal(0)
            lines.append(f"📤 *XARAJATLAR / CHIQIMLAR:* `{_fmt_line_amounts(total_exp_uzs, total_exp_usd)}`")
            for exp in expenses:
                note_part = f" — _{exp.note}_" if exp.note else ""
                lines.append(f"   • *{exp.category}:* `-{Decimal(str(exp.amount)):,.2f} {exp.currency}`{note_part}")

        if report.staff_notes:
            lines.extend([
                "",
                f"📝 *Xodim qo'shimchasi:* {report.staff_notes}",
            ])

        return "\n".join(lines)
