"""Service layer for creating tenants together with their owner."""

from apps.accounts.services.employee_service import EmployeeService, EmployeeServiceError
from django.db import transaction
from apps.tenants.models import Tenant
from django.contrib.auth import get_user_model

User = get_user_model()


class TenantServiceError(Exception):
    """Base exception for TenantService failures."""

class TenantService:
    """Encapsulates the business rules for creating and managing tenants."""

    @staticmethod
    @transaction.atomic
    def create_with_owner(
            *,
            name: str,
            created_by: User,
            owner_phone_number: str = None,
            owner_user: User = None,
            description: str = ""
    ) -> Tenant:
        """
        Create a new Tenant with an owner, and open the matching 'Owner'
        Employee record in one atomic operation.

        Only platform_admin may call this.
        Accepts either `owner_phone_number` (preferred per updated roadmap:
        gets or creates the User record automatically) or `owner_user` (for backward
        compatibility with existing callers/tests).
        Rejected upfront if owner is already an owner elsewhere or is platform_admin.
        """
        if created_by.role != "platform_admin":
            raise TenantServiceError("Only platform_admin may create tenants.")

        if owner_phone_number:
            owner_user, _ = User.objects.get_or_create(
                phone_number=owner_phone_number,
                defaults={"role": "owner", "profile_completed": False}
            )
        elif owner_user is None:
            raise TenantServiceError("Either owner_phone_number or owner_user must be provided.")

        if owner_user.role == "platform_admin":
            raise TenantServiceError("A platform_admin cannot be assigned as a tenant owner.")

        if Tenant.objects.filter(owner=owner_user).exists():
            raise TenantServiceError("This user already is the owner of another tenant.")

        if Tenant.objects.filter(name=name).exists():
            raise TenantServiceError(f"A tenant named '{name}' already exists.")

        tenant = Tenant.objects.create(
            name=name,
            owner=owner_user,
            description=description,
        )

        try:
            EmployeeService.hire(
                target_user=owner_user,
                tenant=tenant,
                hired_by=created_by,
                position="Owner",
                role="owner",
            )
        except EmployeeServiceError as exc:
            raise TenantServiceError(str(exc)) from exc
        return tenant

    @staticmethod
    @transaction.atomic
    def change_owner(
            *,
            tenant: Tenant,
            new_owner: User,
            changed_by: User,
    ) -> Tenant:
        """
        Replace a tenant's owner. Fires the current owner (demoting them to customer,
        per the standard fire() flow) and hires the new owner.
        Only platform_admin may call this.
        :param tenant:
        :param new_owner:
        :param changed_by:
        :return Tenant:
        """
        if changed_by.role != "platform_admin":
            raise TenantServiceError("Only platform_admin may change tenant's owner.")
        if new_owner.role == "platform_admin":
            raise TenantServiceError("A platform_admin cannot be assigned as a tenant owner.")
        if Tenant.objects.filter(owner=new_owner).exclude(pk=tenant.pk).exists():
            raise TenantServiceError("This user already is the owner of another tenant.")

        old_owner = tenant.owner
        try:
            EmployeeService.fire(
                target_user=old_owner,
                fired_by=changed_by,
            )
        except EmployeeServiceError as exc:
            raise TenantServiceError(str(exc)) from exc

        try:
            EmployeeService.hire(
                target_user=new_owner,
                tenant=tenant,
                hired_by=changed_by,
                position="Owner",
                role="owner",
            )
        except EmployeeServiceError as exc:
            raise TenantServiceError(str(exc)) from exc

        tenant.owner = new_owner
        tenant.save(update_fields=["owner"])
        return tenant
