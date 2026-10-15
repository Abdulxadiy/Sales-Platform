from django.db import transaction
from apps.sales.models import Counterparty
from apps.tenants.models import Tenant



class CounterpartyServiceError(Exception):
    pass


class CounterpartyService:
    @classmethod
    @transaction.atomic
    def create(cls, *, tenant, name: str, phone_number: str, note: str = '', target_tenant_code: str = '') -> Counterparty:
        Tenant.objects.select_for_update().get(pk=tenant.pk)
        phone_number = phone_number.strip()
        if not phone_number:
            raise CounterpartyServiceError("Telefon raqami kiritilishi shart.")

        if Counterparty.objects.filter(tenant=tenant, phone_number=phone_number).exists():
            raise CounterpartyServiceError(f"{phone_number} raqamli kontragent allaqachon mavjud.")

        target_tenant = None
        if target_tenant_code.strip():
            target_tenant = Tenant.objects.filter(public_code=target_tenant_code.strip().upper(), is_active=True).first()
            if target_tenant is None or target_tenant.pk == tenant.pk:
                raise CounterpartyServiceError("Boshqa faol do‘konning to‘g‘ri public kodini kiriting.")
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
        counterparty = Counterparty.objects.select_for_update().get(pk=counterparty.pk)
        if is_active is False and (counterparty.debt_balance_uzs != 0 or counterparty.debt_balance_usd != 0):
            raise CounterpartyServiceError("Avval mijozning qarzi yoki ortiqcha to‘lovini yakunlang.")
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
        return cls.update(counterparty, is_active=False)
