from django.db import transaction
from django.contrib.auth import get_user_model
from apps.sales.models import Counterparty
from apps.accounts.models import Employee
from apps.tenants.models import Tenant

User = get_user_model()


class CounterpartyServiceError(Exception):
    pass


class CounterpartyService:
    @staticmethod
    def _find_target_tenant(phone_number: str) -> Tenant:
        """
        Search User by phone number. If user has active Employee record or
        is a Tenant owner, return that Tenant.
        """
        user = User.objects.filter(phone_number=phone_number).first()
        if not user:
            return None

        # Check if user is owner of an active tenant
        owned_tenant = Tenant.objects.filter(owner=user, is_active=True).first()
        if owned_tenant:
            return owned_tenant

        # Check active Employee record
        active_emp = Employee.objects.filter(user=user, is_active=True).select_related('tenant').first()
        if active_emp and active_emp.tenant.is_active:
            return active_emp.tenant

        return None

    @classmethod
    @transaction.atomic
    def create(cls, *, tenant, name: str, phone_number: str, note: str = '') -> Counterparty:
        phone_number = phone_number.strip()
        if not phone_number:
            raise CounterpartyServiceError("Telefon raqami kiritilishi shart.")

        if Counterparty.objects.filter(tenant=tenant, phone_number=phone_number).exists():
            raise CounterpartyServiceError(f"{phone_number} raqamli kontragent allaqachon mavjud.")

        target_tenant = cls._find_target_tenant(phone_number)
        return Counterparty.objects.create(
            tenant=tenant,
            name=name.strip(),
            phone_number=phone_number,
            target_tenant=target_tenant,
            note=note.strip(),
        )

    @classmethod
    @transaction.atomic
    def update(cls, counterparty: Counterparty, *, name: str = None, note: str = None, is_active: bool = None) -> Counterparty:
        if name is not None:
            counterparty.name = name.strip()
        if note is not None:
            counterparty.note = note.strip()
        if is_active is not None:
            counterparty.is_active = is_active
        counterparty.save()
        return counterparty

    @classmethod
    @transaction.atomic
    def archive(cls, counterparty: Counterparty) -> Counterparty:
        counterparty.is_active = False
        counterparty.save(update_fields=['is_active'])
        return counterparty
