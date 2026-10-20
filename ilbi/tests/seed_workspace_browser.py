"""Create synthetic browser fixtures only in the dedicated workspace QA database."""
import json
from datetime import timedelta
from pathlib import Path
from uuid import uuid4

import django

django.setup()

from django.conf import settings
from django.core.management import call_command
from django.utils import timezone

from api.v1.accounts.views.misc import issue_tokens
from apps.cashbox.models import CashShift
from apps.core.models import WorkspaceReminder
from apps.inventory.services import StockService
from apps.permissions.models import Permission
from tests.factories import (
    CategoryFactory, CounterpartyFactory, EmployeeFactory, OwnerFactory, PlatformAdminFactory,
    ProductVariantFactory, SaleFactory, SaleItemFactory, StaffFactory, TenantFactory,
    UserFactory,
)

if settings.DATABASES['default']['NAME'] != 'ilbi_workspace_qa':
    raise RuntimeError('Browser fixtures require the disposable ilbi_workspace_qa database.')
call_command('migrate', verbosity=0)
tag = uuid4().hex[:8]
UserFactory.reset_sequence(int(tag, 16) % 10000000, force=True)
owner = OwnerFactory(username=f'workspace_owner_{tag}', first_name='Akmal', last_name='Karimov')
tenant = TenantFactory(owner=owner, name=f'Chilonzor QA {tag}', usd_rate='12500')
second = TenantFactory(owner=owner, name=f'Yunusobod QA {tag}', usd_rate='12500')
for shop in (tenant, second):
    EmployeeFactory(user=owner, tenant=shop, is_owner=True)
    CashShift.objects.get_or_create(tenant=shop, closed_at__isnull=True, defaults={'opened_by': owner})
category = CategoryFactory(tenant=tenant, name='Oziq-ovqat', currency='UZS')
variants = []
for index, name in enumerate(['Anvar un', 'Sut', 'Qahva']):
    variant = ProductVariantFactory(tenant=tenant, product__tenant=tenant, product__category=category,
        product__name=name, name='Standart', barcode=f'99822200000{index}', price_recommended='15000',
        price_min='12000', price_partner='13000')
    StockService.intake(tenant=tenant, product_variant=variant, quantity=3 if index == 1 else 40,
        cost_price=9000, created_by=owner)
    variants.append(variant)
cp = CounterpartyFactory(tenant=tenant, name='Anvar Abdullayev', phone_number='+998901234567', debt_balance_uzs='3200000')
CounterpartyFactory(tenant=tenant, name='Nodira Karimova', phone_number='+998901234568')
for index in range(3):
    sale = SaleFactory(tenant=tenant, sold_by=owner, counterparty=cp, receipt_number=f'QA-{tag}-{index}', total_amount='30000')
    SaleItemFactory(sale=sale, tenant=tenant, product_variant=variants[0], quantity='2', unit_price='15000', total_price='30000', cost_price='9000')
WorkspaceReminder.objects.create(tenant=tenant, created_by=owner, assigned_to=owner,
    title='Nasiya bo‘yicha qo‘ng‘iroq', due_at=timezone.now() - timedelta(minutes=5))
WorkspaceReminder.objects.create(tenant=tenant, created_by=owner, assigned_to=owner,
    title='Tovar buyurtmasini tekshirish', due_at=timezone.now() + timedelta(hours=2))
staff = StaffFactory(username=f'workspace_staff_{tag}', first_name='Malika')
membership = EmployeeFactory(user=staff, tenant=tenant)
membership.permissions.add(Permission.objects.get(category='sales', codename='manage_counterparty'))
admin = PlatformAdminFactory(username=f'workspace_admin_{tag}')


def profile(user, shops):
    return {'id': user.pk, 'role': user.role, 'username': user.username, 'first_name': user.first_name,
            'last_name': user.last_name, 'terms_accepted': True, 'tenants': shops,
            'permissions': ['*'] if user == owner else ['sales.manage_counterparty'] if user == staff else []}


shops = [{'id': shop.pk, 'name': shop.name, 'is_owner': True, 'permissions': ['*']} for shop in (tenant, second)]
seed = {'_meta': {'synthetic': True, 'database': 'ilbi_workspace_qa'},
        'owner': {'user': profile(owner, shops), **issue_tokens(owner)},
        'staff': {'user': profile(staff, [{**shops[0], 'is_owner': False, 'permissions': ['sales.manage_counterparty']}]), **issue_tokens(staff)},
        'admin': {'user': profile(admin, []), **issue_tokens(admin)},
        'customer_id': cp.pk, 'variant_id': variants[0].pk, 'second_tenant': second.pk}
Path('/tmp/ilbi-workspace-seed.json').write_text(json.dumps(seed))
print('Synthetic workspace browser session saved to /tmp/ilbi-workspace-seed.json')
