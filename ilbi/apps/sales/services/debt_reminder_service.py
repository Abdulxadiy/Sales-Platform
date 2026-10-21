"""Optional deadline for a customer's outstanding balance, in the shop timezone."""

from django.db import transaction
from django.db.models import F, Q
from django.utils import timezone

from apps.sales.models import Counterparty, Notification

UNSET = object()


def set_debt_due_date(counterparty, value):
    if value is not UNSET and value != counterparty.debt_due_date:
        counterparty.debt_due_date = value
        counterparty.last_notified_debt_due_date = None


def notify_due_debts(*, tenant_id=None):
    # Use real local time, including when called after replaying older commands.
    due = Counterparty.objects.filter(
        is_active=True, tenant__is_active=True, debt_due_date__lte=timezone.localdate(),
    ).filter(Q(debt_balance_uzs__gt=0) | Q(debt_balance_usd__gt=0)).exclude(
        last_notified_debt_due_date=F('debt_due_date'),
    )
    if tenant_id is not None:
        due = due.filter(tenant_id=tenant_id)
    count = 0
    for pk in due.order_by('pk').values_list('pk', flat=True).iterator(chunk_size=200):
        # The scheduler and an owner's notification poll may run simultaneously.
        with transaction.atomic():
            cp = due.select_for_update(of=('self',)).select_related('tenant').filter(pk=pk).first()
            if cp is None:
                continue
            balances = [f'{amount:,.2f} {currency}' for amount, currency in (
                (cp.debt_balance_uzs, 'UZS'), (cp.debt_balance_usd, 'USD'),
            ) if amount > 0]
            Notification.objects.create(
                tenant_id=cp.tenant_id, recipient_id=cp.tenant.owner_id,
                type=Notification.TYPE_DEBT_DUE, title='Qarzni qaytarish sanasi keldi',
                message=(f'{cp.name} ({cp.phone_number})\n'
                         f'Qaytarish sanasi: {cp.debt_due_date:%d.%m.%Y}\n'
                         f'Qolgan qarz: {" / ".join(balances)}'),
                link=f'/debts?workspace_id={cp.pk}',
            )
            cp.last_notified_debt_due_date = cp.debt_due_date
            cp.save(update_fields=['last_notified_debt_due_date'])
            count += 1
    return count
