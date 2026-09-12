"""Shared tenant-context resolution for tenant-scoped API views.

Design background (see Architectures/inventra-yol-xaritasi.md, 8-bosqich):

- This is deliberately NOT a Django `MIDDLEWARE` entry. Django middleware
  runs before DRF authenticates the request (DRF authenticates lazily,
  the first time `request.user` is touched -- typically inside
  `APIView.initial()`), so a real middleware has no reliable access to
  `request.user` or JWT claims. Re-decoding the JWT a second time inside
  a separate middleware would duplicate `JWTAuthentication`'s validation
  logic and risk the two falling out of sync.
- Instead, tenant context is resolved inside `initial()`, AFTER
  `super().initial()` has run authentication and permission checks. Any
  view using this mixin can assume `request.user` is authenticated by
  the time `self.tenant` is set.
- Tenant is always derived from `request.user.tenant` (a fresh DB read
  through the authenticated user), never from a JWT claim, a query
  parameter, or a request body field. JWT claims can go stale between
  issuance and use (e.g. after a fire()); the DB read cannot.
"""

from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied

from apps.tenants.models import Tenant


class TenantContextMixin:
    """
    Mixin for DRF views that need to know which tenant a request is
    acting on.

    Sets `self.tenant` during `initial()`:
      - staff / owner    -> `request.user.tenant` (DB, always fresh).
      - platform_admin   -> `None` (platform_admin is not scoped to any
        single tenant by default).

    Views whose URL carries an explicit `tenant_id` (sub-resource
    endpoints like hire/fire, and future 9-bosqich business endpoints)
    should additionally call `resolve_tenant_from_url()` and use ITS
    return value as the acting tenant -- `self.tenant` alone is not
    enough there, since it is `None` for platform_admin even when the
    URL names a specific tenant.
    """

    # Name of the URL kwarg carrying an explicit tenant id, for views
    # that use resolve_tenant_from_url(). Override on the view if the
    # URL conf names it differently.
    tenant_url_kwarg = "tenant_id"

    def initial(self, request, *args, **kwargs):
        # Runs authentication + permission checks + throttling first,
        # via DRF's own APIView.initial(). Only after this returns can
        # we trust request.user.
        super().initial(request, *args, **kwargs)
        self.tenant = self._resolve_tenant_from_user(request)
        self._ensure_tenant_active(self.tenant)

    @staticmethod
    def _resolve_tenant_from_user(request):
        """Derive the acting tenant strictly from the authenticated user."""
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return None
        if user.role in ("staff", "owner"):
            return user.tenant
        return None

    def resolve_tenant_from_url(self, request, tenant_id=None):
        """
        Resolve the tenant a request is acting on when the URL names an
        explicit tenant (sub-resource endpoints, e.g.
        /tenants/{tenant_id}/employees/hire/).

        Authority rules:
          - platform_admin: may act on ANY tenant named in the URL.
          - owner: may act only on the tenant they own.
          - staff: never resolves a tenant via URL -- staff act on their
            own tenant only (`self.tenant`), so reaching this method as
            staff is always a 403.

        Raises (both handled by DRF's default exception handler into a
        `{"detail": "..."}` response, matching prior behaviour):
          - Http404 (via get_object_or_404) if the tenant doesn't exist.
          - PermissionDenied (403) if the requester has no authority
            over it, or if the tenant is deactivated.
        """
        if tenant_id is None:
            tenant_id = self.kwargs.get(self.tenant_url_kwarg)

        tenant = get_object_or_404(Tenant, pk=tenant_id)
        user = request.user

        if user.role == "platform_admin":
            pass
        elif user.role == "owner" and tenant.owner_id == user.id:
            pass
        else:
            raise PermissionDenied("You don't have authority over this tenant.")

        self._ensure_tenant_active(tenant)
        return tenant

    @staticmethod
    def _ensure_tenant_active(tenant):
        """A deactivated tenant is closed for business: no action on its
        behalf is allowed, regardless of who is asking."""
        if tenant is not None and not tenant.is_active:
            raise PermissionDenied("This tenant is deactivated.")