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
            owner_email: str = None,
            owner_user: User = None,
            description: str = ""
    ) -> Tenant:
        """
        Create a new Tenant with an owner, and open the matching 'Owner'
        Employee record in one atomic operation.

        Only platform_admin may call this.
        Accepts `owner_phone_number` and optional `owner_email` (preferred:
        gets or creates the User record automatically) or `owner_user` (for backward
        compatibility with existing callers/tests).
        Rejected upfront if owner is already an owner elsewhere or is platform_admin.
        """
        if created_by.role != "platform_admin":
            raise TenantServiceError("Only platform_admin may create tenants.")

        if owner_phone_number:
            defaults = {"role": "owner", "profile_completed": False}
            if owner_email:
                defaults["email"] = owner_email
            owner_user, created = User.objects.get_or_create(
                phone_number=owner_phone_number,
                defaults=defaults
            )
            if not created and owner_email and not owner_user.email:
                owner_user.email = owner_email
                owner_user.save(update_fields=["email"])
        elif owner_user is None:
            raise TenantServiceError("Either owner_phone_number or owner_user must be provided.")
        elif owner_email and not owner_user.email:
            owner_user.email = owner_email
            owner_user.save(update_fields=["email"])

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

        # Automatically send account setup / password reset email to the owner
        if owner_user.email:
            from apps.accounts.services.password_reset_service import request_password_reset
            import logging
            _logger = logging.getLogger(__name__)
            try:
                ok, reason = request_password_reset(
                    owner_user.email,
                    purpose="new_owner",
                    extra_context={"tenant_name": tenant.name},
                )
                if not ok:
                    _logger.warning("Failed to dispatch password setup email to %s: %s", owner_user.email, reason)
            except Exception as exc:
                _logger.error("Error sending password setup email to %s: %s", owner_user.email, exc)

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
        Replace a tenant's owner. Fires the current owner via the standard
        fire() flow -- their Employee record is deactivated and their
        password is set unusable, but User.role stays "owner" for audit
        purposes (Variant A). This is safe: PermissionService requires an
        ACTIVE Employee record for the owner role, so the former owner
        loses all permissions immediately despite the retained role label.
        Then hires the new owner.
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
            if "No active Employee record found" not in str(exc):
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

        from apps.core.models import AuditAction
        from apps.core.services.audit_service import AuditService
        AuditService.log(
            action=AuditAction.OWNER_TRANSFER,
            actor=changed_by,
            tenant=tenant,
            target_model="Tenant",
            target_id=str(tenant.id),
            changes={"owner_id": {"old": old_owner.id, "new": new_owner.id}},
            description=f"Tenant '{tenant.name}' owner changed from {old_owner.id} to {new_owner.id} by {changed_by.id}",
        )

        # Automatically send account setup / password reset email to the new owner
        if new_owner.email:
            from apps.accounts.services.password_reset_service import request_password_reset
            import logging
            _logger = logging.getLogger(__name__)
            try:
                ok, reason = request_password_reset(
                    new_owner.email,
                    purpose="transfer_owner",
                    extra_context={"tenant_name": tenant.name},
                )
                if not ok:
                    _logger.warning("Failed to dispatch password setup email to %s: %s", new_owner.email, reason)
            except Exception as exc:
                _logger.error("Error sending password setup email to %s: %s", new_owner.email, exc)

        return tenant
