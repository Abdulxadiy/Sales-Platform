from django.db.models import Q
from apps.sales.models import Counterparty


def filtered_counterparties(tenant, params):
    qs = Counterparty.objects.filter(tenant=tenant)
    if params.get('active', 'true').lower() == 'true':
        qs = qs.filter(is_active=True)
    search = (params.get('search') or '').strip()
    if search:
        qs = qs.filter(Q(name__icontains=search) | Q(phone_number__icontains=search) | Q(note__icontains=search))
    balance = params.get('balance_status')
    if balance == 'debtors' or params.get('has_debt', '').lower() in ('true', '1'):
        qs = qs.filter(Q(debt_balance_uzs__gt=0) | Q(debt_balance_usd__gt=0))
    elif balance == 'credit':
        qs = qs.filter(Q(debt_balance_uzs__lt=0) | Q(debt_balance_usd__lt=0))
    elif balance == 'settled':
        qs = qs.filter(debt_balance_uzs=0, debt_balance_usd=0)
    return qs.order_by('name', 'pk')
