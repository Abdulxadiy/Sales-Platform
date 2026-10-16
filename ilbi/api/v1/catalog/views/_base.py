"""Shared base for catalog views. See api/mixins.py's OwnerStaffOnlyAPIView
for the platform_admin-blocking rationale (originally written here for
catalog, 2026-09; moved to api/mixins.py once `inventory` needed the
exact same behaviour)."""

from api.mixins import OwnerStaffOnlyAPIView


class CatalogAPIView(OwnerStaffOnlyAPIView):
    pass
