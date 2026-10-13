"""Field permissions shared by tenant business responses."""
from apps.accounts.services.permission_service import PermissionService


class SensitiveCostSerializerMixin:
    cost_fields = ('cost_price', 'last_cost_price')

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        allowed = request is not None and PermissionService.has_permission(
            request.user, 'catalog.view_cost_price', tenant=getattr(request, 'tenant', None),
            employee=getattr(request, 'employee', None),
        )
        if not allowed:
            for field in self.cost_fields:
                data.pop(field, None)
        return data
