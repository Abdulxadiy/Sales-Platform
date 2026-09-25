from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response

from api.permissions import HasEmployeePermission
from apps.catalog.models import ProductVariant
from apps.inventory.models import StockMovement
from apps.inventory.services import StockService, StockServiceError
from api.v1.inventory.serializers import (
    StockMovementOutputSerializer,
    IntakeCreateSerializer,
    SimpleMovementCreateSerializer,
    AdjustCreateSerializer,
)
from ._base import InventoryAPIView


class StockMovementListView(InventoryAPIView):
    """GET /api/v1/inventory/movements/?product_variant_id=X -- full
    audit history. `product_variant_id` is optional (omit it for every
    movement across the tenant); when given, it must belong to this
    tenant, same 404-not-403 rule as catalog's detail views."""

    permission_classes = [HasEmployeePermission]
    required_permission = "inventory.view_stock"

    def get(self, request):
        movements = StockMovement.objects.filter(tenant=self.tenant)
        variant_id = request.query_params.get("product_variant_id")
        if variant_id:
            get_object_or_404(ProductVariant, pk=variant_id, tenant=self.tenant)
            movements = movements.filter(product_variant_id=variant_id)
        return Response(StockMovementOutputSerializer(movements, many=True).data)


class _BaseMovementCreateView(InventoryAPIView):
    """Shared POST handling for every write endpoint below -- each
    subclass only names its serializer and which StockService method to
    call. Validation errors (wrong tenant, insufficient stock) come back
    as 400, matching the rest of the API's EmployeeServiceError-style
    pattern."""

    serializer_class = None
    service_method_name = None

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)

        service_method = getattr(StockService, self.service_method_name)
        try:
            movement = service_method(
                tenant=self.tenant, created_by=request.user, **serializer.validated_data
            )
        except StockServiceError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(StockMovementOutputSerializer(movement).data, status=status.HTTP_201_CREATED)


class StockIntakeCreateView(_BaseMovementCreateView):
    """POST /api/v1/inventory/intake/ -- the only endpoint that accepts
    cost_price, gated on its own permission (see 0002_seed_permissions.py)."""

    permission_classes = [HasEmployeePermission]
    required_permission = "inventory.add_stock_intake"
    serializer_class = IntakeCreateSerializer
    service_method_name = "intake"


class StockAdjustCreateView(_BaseMovementCreateView):
    """POST /api/v1/inventory/adjust/ -- inventory-count correction,
    caller supplies `direction`."""

    permission_classes = [HasEmployeePermission]
    required_permission = "inventory.adjust_stock"
    serializer_class = AdjustCreateSerializer
    service_method_name = "adjust"


class CustomerReturnCreateView(_BaseMovementCreateView):
    """POST /api/v1/inventory/customer-return/"""

    permission_classes = [HasEmployeePermission]
    required_permission = "inventory.adjust_stock"
    serializer_class = SimpleMovementCreateSerializer
    service_method_name = "customer_return"


class SupplierReturnCreateView(_BaseMovementCreateView):
    """POST /api/v1/inventory/supplier-return/"""

    permission_classes = [HasEmployeePermission]
    required_permission = "inventory.adjust_stock"
    serializer_class = SimpleMovementCreateSerializer
    service_method_name = "supplier_return"


class WriteOffCreateView(_BaseMovementCreateView):
    """POST /api/v1/inventory/write-off/"""

    permission_classes = [HasEmployeePermission]
    required_permission = "inventory.adjust_stock"
    serializer_class = SimpleMovementCreateSerializer
    service_method_name = "write_off"
