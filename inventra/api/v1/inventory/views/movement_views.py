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
    BatchIntakeCreateSerializer,
    SimpleMovementCreateSerializer,
    AdjustCreateSerializer,
)
from ._base import InventoryAPIView


class StockMovementListView(InventoryAPIView):
    """GET /api/v1/inventory/movements/?product_variant_id=X -- full
    audit history. `product_variant_id` is optional; can also filter by `branch_id`."""

    permission_classes = [HasEmployeePermission]
    required_permission = "inventory.view_stock"

    def get(self, request):
        movements = StockMovement.objects.filter(tenant=self.tenant).select_related(
            "branch", "transfer", "created_by", "product_variant", "product_variant__product", "product_variant__product__category"
        )
        variant_id = request.query_params.get("product_variant_id")
        if variant_id:
            get_object_or_404(ProductVariant, pk=variant_id, tenant=self.tenant)
            movements = movements.filter(product_variant_id=variant_id)

        branch_id = request.query_params.get("branch_id")
        if branch_id:
            movements = movements.filter(branch_id=branch_id)
        elif hasattr(request.user, "employments"):
            emp = request.user.employments.filter(tenant=self.tenant, is_active=True).first()
            if emp and emp.branch and request.user != self.tenant.owner and not request.user.is_superuser:
                movements = movements.filter(branch=emp.branch)

        return Response(StockMovementOutputSerializer(movements, many=True).data)


class _BaseMovementCreateView(InventoryAPIView):
    serializer_class = None
    service_method_name = None

    def _resolve_branch(self, request, val_data):
        branch_id = val_data.pop("branch_id", None) or request.query_params.get("branch_id")
        if branch_id:
            return self.tenant.branches.filter(pk=branch_id).first()
        if hasattr(request.user, "employments"):
            emp = request.user.employments.filter(tenant=self.tenant, is_active=True).first()
            if emp and emp.branch:
                return emp.branch
        return self.tenant.get_main_branch()

    def post(self, request):
        serializer = self.serializer_class(
            data=request.data,
            context={"tenant": self.tenant, "request": request},
        )
        serializer.is_valid(raise_exception=True)
        val_data = dict(serializer.validated_data)
        branch = self._resolve_branch(request, val_data)

        service_method = getattr(StockService, self.service_method_name)
        try:
            movement = service_method(
                tenant=self.tenant, branch=branch, created_by=request.user, **val_data
            )
        except StockServiceError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(StockMovementOutputSerializer(movement).data, status=status.HTTP_201_CREATED)


class StockIntakeCreateView(_BaseMovementCreateView):
    permission_classes = [HasEmployeePermission]
    required_permission = "inventory.add_stock_intake"
    serializer_class = IntakeCreateSerializer
    service_method_name = "intake"


class StockBatchIntakeCreateView(InventoryAPIView):
    permission_classes = [HasEmployeePermission]
    required_permission = "inventory.add_stock_intake"

    def _resolve_branch(self, request, val_data):
        branch_id = val_data.pop("branch_id", None) or request.query_params.get("branch_id")
        if branch_id:
            return self.tenant.branches.filter(pk=branch_id).first()
        if hasattr(request.user, "employments"):
            emp = request.user.employments.filter(tenant=self.tenant, is_active=True).first()
            if emp and emp.branch:
                return emp.branch
        return self.tenant.get_main_branch()

    def post(self, request):
        serializer = BatchIntakeCreateSerializer(
            data=request.data,
            context={"tenant": self.tenant, "request": request},
        )
        serializer.is_valid(raise_exception=True)
        val_data = dict(serializer.validated_data)
        branch = self._resolve_branch(request, val_data)

        try:
            movements = StockService.batch_intake(
                tenant=self.tenant,
                branch=branch,
                created_by=request.user,
                items=val_data["items"],
                supplier=val_data.get("supplier", ""),
                faktura_number=val_data.get("faktura_number", ""),
                common_note=val_data.get("note", ""),
            )
        except StockServiceError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(StockMovementOutputSerializer(movements, many=True).data, status=status.HTTP_201_CREATED)


class CustomerReturnCreateView(_BaseMovementCreateView):
    permission_classes = [HasEmployeePermission]
    required_permission = "inventory.adjust_stock"
    serializer_class = SimpleMovementCreateSerializer
    service_method_name = "customer_return"


class SupplierReturnCreateView(_BaseMovementCreateView):
    permission_classes = [HasEmployeePermission]
    required_permission = "inventory.adjust_stock"
    serializer_class = SimpleMovementCreateSerializer
    service_method_name = "supplier_return"


class WriteOffCreateView(_BaseMovementCreateView):
    permission_classes = [HasEmployeePermission]
    required_permission = "inventory.adjust_stock"
    serializer_class = SimpleMovementCreateSerializer
    service_method_name = "write_off"


class StockAdjustCreateView(_BaseMovementCreateView):
    permission_classes = [HasEmployeePermission]
    required_permission = "inventory.adjust_stock"
    serializer_class = AdjustCreateSerializer
    service_method_name = "adjust"
