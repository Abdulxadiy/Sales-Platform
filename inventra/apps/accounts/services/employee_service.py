"""Service layer for hiring and firing Employee records."""

from django.db import transaction
from django.utils import timezone
from apps.accounts.models import User, Employee


class EmployeeServiceError(Exception):
    """Base exception for EmployeeService failures."""


class PermissionDeniedError(EmployeeServiceError):
    """Raised when the acting user lacks the authority to perform the operation."""


class EmployeeService:
    """Encapsulates the business rules for assigning and revoking staff/owner roles."""

    @staticmethod
    def _check_hire_permission(hired_by: User, role: str) -> None:
        """Validate that hired_by is allowed to assign the given role."""
        if role == "owner":
            if hired_by.role != "platform_admin":
                raise PermissionDeniedError("Only platform_admin can assign the owner role.")
        elif role == "staff":
            if hired_by.role not in ("owner", "platform_admin"):
                raise PermissionDeniedError("Only owner or platform_admin can hire staff.")
        else:
            raise EmployeeServiceError(f"hire() cannot assign role '{role}'.")

    @staticmethod
    def _check_fire_permission(fired_by: User, employee: Employee) -> None:
        """Validate that fired_by is allowed to fire this employee."""
        if fired_by.role == "platform_admin":
            return
        if (
            fired_by.role == "owner"
            and employee.tenant == fired_by.tenant
            and employee.user.role != "owner"
        ):
            return
        raise PermissionDeniedError("You are not allowed to fire this employee.")

    @classmethod
    @transaction.atomic
    def hire(
        cls,
        *,
        target_user: User = None,
        phone_number: str = None,
        email: str = None,
        tenant,
        hired_by: User,
        permissions=None,
        position: str = "",
        role: str = "staff",
    ) -> Employee:
        """
        Assign target_user (or user identified/created by phone_number) to tenant
        with the given role, creating a new active Employee record.

        Per updated roadmap:
        - Accepts either `phone_number` (preferred: gets or creates User record)
          or `target_user` (for backward compatibility with existing tests/callers).
        - Optionally accepts `email` to associate with the user for invitation links.
        - If the user already has an active Employee record elsewhere or here,
          hire is blocked with EmployeeServiceError (must be explicitly fired first).
        - Does NOT touch username/password: password is set via email flow.
        """
        cls._check_hire_permission(hired_by, role)

        if phone_number:
            defaults = {"role": role, "profile_completed": False}
            if email:
                defaults["email"] = email
            target_user, created = User.objects.get_or_create(
                phone_number=phone_number,
                defaults=defaults,
            )
            if not created and email and not target_user.email:
                target_user.email = email
                target_user.save(update_fields=["email"])
        elif target_user is None:
            raise EmployeeServiceError("Either phone_number or target_user must be provided.")
        elif email and not target_user.email:
            target_user.email = email
            target_user.save(update_fields=["email"])

        if target_user.role == "platform_admin":
            raise EmployeeServiceError("Cannot hire a platform_admin user.")

        existing_active = (
            Employee.objects.select_for_update()
            .filter(user=target_user, is_active=True)
            .first()
        )
        if existing_active:
            raise EmployeeServiceError(
                "User already has an active employment. They must be fired from their current position before being hired."
            )

        target_user.role = role
        target_user.tenant = tenant
        target_user.save(update_fields=["role", "tenant"])

        employee = Employee.objects.create(
            user=target_user,
            tenant=tenant,
            position=position,
            is_active=True,
            hired_by=hired_by,
        )

        if permissions:
            employee.permissions.set(permissions)

        return employee

    @staticmethod
    @transaction.atomic
    def fire(*, target_user: User, fired_by: User) -> Employee:
        """
        Deactivate target_user's current active Employee record.

        Per Variant A:
        - target_user.role is retained (not demoted to customer).
        - target_user password is set unusable so they cannot log in.
        - The Employee record is marked is_active=False with fired_at/fired_by.
        - Because PermissionService only grants access to active Employee records,
          the fired employee immediately loses all permissions across the system.
        """
        employee = (
            Employee.objects.select_for_update()
            .filter(user=target_user, is_active=True)
            .first()
        )
        if employee is None:
            raise EmployeeServiceError("No active Employee record found for this user.")

        EmployeeService._check_fire_permission(fired_by, employee)

        employee.is_active = False
        employee.fired_at = timezone.now()
        employee.fired_by = fired_by
        employee.save(update_fields=["is_active", "fired_at", "fired_by"])

        target_user.set_unusable_password()
        target_user.save(update_fields=["password"])

        return employee