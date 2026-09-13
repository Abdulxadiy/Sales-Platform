"""Shared base for catalog views. See api/mixins.py for the general
TenantContextMixin design (8-bosqich)."""

from rest_framework.exceptions import PermissionDenied
from rest_framework.views import APIView

from api.mixins import TenantContextMixin


class CatalogAPIView(TenantContextMixin, APIView):
    """
    Every catalog endpoint is owner/staff territory ONLY -- platform_admin
    has no reason to edit a shop's day-to-day catalog (confirmed
    2026-09, see Architectures/inventra-yol-xaritasi.md, 9-bosqich:
    platform_admin manages owners, not a shop's products).

    `PermissionService.has_permission()` grants platform_admin every
    permission unconditionally, by design, for OTHER features (see its
    docstring) -- so `HasEmployeePermission` alone would let
    platform_admin through here too. `self.tenant` is also `None` for
    platform_admin (TenantContextMixin only populates it for
    staff/owner), which would otherwise surface as a confusing empty
    queryset on GET and a crash on POST (tenant=None is not a valid FK
    value). This class closes both gaps with one explicit, loud check.
    """

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if self.tenant is None:
            raise PermissionDenied(
                "catalog is only accessible to a tenant's own owner/staff."
            )