import logging
from datetime import datetime
from decimal import Decimal
from celery import shared_task
from django.utils import timezone

from apps.tenants.models import Tenant
from apps.cashbox.models import DailyCashReport
from apps.cashbox.services.cashbox_service import CashboxService
from apps.tg_bot.models import TelegramContact
from apps.sales.tasks import send_async_telegram_message_task

logger = logging.getLogger(__name__)


@shared_task(name="apps.cashbox.tasks.send_daily_report_for_tenant_task")
def send_daily_report_for_tenant_task(tenant_id: int):
    """
    Sends the daily shift summary notification for a given tenant.
    """
    tenant = Tenant.objects.filter(pk=tenant_id, is_active=True).select_related("owner").first()
    if not tenant:
        return False

    owner = tenant.owner
    contact = TelegramContact.objects.filter(phone_number=owner.phone_number).first()
    if not contact:
        logger.info(f"No Telegram contact found for tenant {tenant.name} owner ({owner.phone_number}).")
        return False

    status = CashboxService.get_current_shift_status(tenant)

    def _fmt_usd(val):
        v = Decimal(str(val or 0))
        if v < 0:
            return f"-${abs(v):,.2f}"
        return f"${v:,.2f}"

    lines = [
        "📊 *KUNLIK HISOBOT VAQTI KELDI*",
        f"🏢 *Do'kon:* {tenant.name}",
        f"📅 *Sana:* {timezone.now().date()} | {timezone.now().strftime('%H:%M')}",
        "",
        "💵 *KASSA KUTILAYOTGAN NAQD PUL:*",
        f"• UZS: `{status['expected_cash_uzs']:,.2f} UZS`",
        f"• USD: `{_fmt_usd(status['expected_cash_usd'])}`",
        "",
        "📈 *SAVDOLAR:*",
        f"• Naqd: `{status['total_sale_cash_uzs']:,.2f} UZS` | `{_fmt_usd(status['total_sale_cash_usd'])}`",
        f"• Karta: `{status['total_sale_card_uzs']:,.2f} UZS` | `{_fmt_usd(status['total_sale_card_usd'])}`",
        f"• Nasiya: `{status['total_sale_debt_uzs']:,.2f} UZS` | `{_fmt_usd(status['total_sale_debt_usd'])}`",
        "",
    ]

    incomes_list = status.get("incomes", [])
    if incomes_list:
        lines.append(f"📥 *QO'SHIMCHA KIRIMLAR:* `{status['total_extra_income_uzs']:,.2f} UZS` | `{_fmt_usd(status['total_extra_income_usd'])}`")
        for inc in incomes_list:
            note_part = f" — _{inc['note']}_" if inc.get("note") else ""
            lines.append(f"   • *{inc['source']}:* `+{Decimal(str(inc['amount'])):,.2f} {inc['currency']}`{note_part}")
    else:
        lines.append("📥 *Qo'shimcha kirim:* `0.00 UZS`")

    lines.append("")

    expenses_list = status.get("expenses", [])
    if expenses_list:
        lines.append(f"📤 *XARAJATLAR / CHIQIMLAR:* `-{Decimal(str(status['total_expenses_uzs'])):,.2f} UZS` | `{_fmt_usd(-abs(Decimal(str(status['total_expenses_usd']))))}`")
        for exp in expenses_list:
            note_part = f" — _{exp['note']}_" if exp.get("note") else ""
            lines.append(f"   • *{exp['category']}:* `-{Decimal(str(exp['amount'])):,.2f} {exp['currency']}`{note_part}")
    else:
        lines.append("📤 *Xarajatlar:* `0.00 UZS`")

    lines.extend([
        "",
        "ℹ️ _Xodimlar smenani yopgach, yakuniy tafovut bilan to'liq Z-hisobot yuboriladi._",
    ])
    message_text = "\n".join(lines)
    send_async_telegram_message_task.delay(contact.chat_id, message_text)
    return True


@shared_task(name="apps.cashbox.tasks.check_and_send_daily_reports_task")
def check_and_send_daily_reports_task():
    """
    Periodic task: checks active tenants whose daily_report_time matches current hour/minute window.
    """
    now = timezone.now()
    current_time = now.time()

    tenants = Tenant.objects.filter(is_active=True)
    count = 0
    for tenant in tenants:
        report_time = tenant.daily_report_time
        if (
            report_time.hour == current_time.hour
            and abs(report_time.minute - current_time.minute) <= 5
        ):
            send_daily_report_for_tenant_task.delay(tenant.id)
            count += 1

    return count
