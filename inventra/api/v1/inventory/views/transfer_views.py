from rest_framework import status
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from api.permissions import HasEmployeePermission
from apps.inventory.models import StockTransfer
from apps.inventory.services import StockTransferService, StockTransferServiceError
from apps.catalog.models import ProductVariant
from apps.tenants.models import Branch
from api.v1.inventory.serializers import (
    StockTransferOutputSerializer,
    StockTransferCreateSerializer,
)
from ._base import InventoryAPIView


class StockTransferListCreateView(InventoryAPIView):
    permission_classes = [HasEmployeePermission]
    required_permission = "inventory.view_stock"

    def get(self, request):
        qs = (
            StockTransfer.objects.filter(tenant=self.tenant)
            .select_related("from_branch", "to_branch", "sent_by", "resolved_by")
            .prefetch_related("items__product_variant__product")
        )

        status_param = request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        branch_id = request.query_params.get("branch_id")
        if branch_id:
            qs = qs.filter(from_branch_id=branch_id) | qs.filter(to_branch_id=branch_id)
        elif hasattr(request.user, "employments"):
            emp = request.user.employments.filter(tenant=self.tenant, is_active=True).first()
            if emp and emp.branch and request.user != self.tenant.owner and not request.user.is_superuser:
                qs = qs.filter(from_branch=emp.branch) | qs.filter(to_branch=emp.branch)

        return Response(StockTransferOutputSerializer(qs, many=True).data)

    def post(self, request):
        serializer = StockTransferCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        from_branch = get_object_or_404(Branch, pk=data["from_branch_id"], tenant=self.tenant)
        to_branch = get_object_or_404(Branch, pk=data["to_branch_id"], tenant=self.tenant)

        # Check permission: if staff, cannot transfer from branch other than their assigned branch
        if hasattr(request.user, "employments"):
            emp = request.user.employments.filter(tenant=self.tenant, is_active=True).first()
            if emp and emp.branch and request.user != self.tenant.owner and not request.user.is_superuser:
                if from_branch != emp.branch:
                    return Response(
                        {"detail": "Faqat o'z filialingizdan boshqa filialga transfer jo'natishingiz mumkin."},
                        status=status.HTTP_403_FORBIDDEN,
                    )

        # Owner transfer can auto_accept if confirmed
        is_owner = (request.user == self.tenant.owner or request.user.is_superuser)
        auto_accept = is_owner and data.get("auto_accept", False)

        items = []
        for it in data["items"]:
            variant = get_object_or_404(ProductVariant, pk=it["product_variant_id"], tenant=self.tenant)
            items.append({
                "product_variant": variant,
                "quantity": it["quantity"],
            })

        try:
            transfer = StockTransferService.create_transfer(
                tenant=self.tenant,
                from_branch=from_branch,
                to_branch=to_branch,
                items=items,
                created_by=request.user,
                note=data.get("note", ""),
                auto_accept=auto_accept,
            )
            return Response(StockTransferOutputSerializer(transfer).data, status=status.HTTP_201_CREATED)
        except (StockTransferServiceError, Exception) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class StockTransferDetailView(InventoryAPIView):
    permission_classes = [HasEmployeePermission]
    required_permission = "inventory.view_stock"

    def get(self, request, pk):
        transfer = get_object_or_404(
            StockTransfer.objects.select_related("from_branch", "to_branch", "sent_by", "resolved_by")
            .prefetch_related("items__product_variant__product"),
            pk=pk,
            tenant=self.tenant,
        )
        return Response(StockTransferOutputSerializer(transfer).data)


class StockTransferAcceptView(InventoryAPIView):
    permission_classes = [HasEmployeePermission]
    required_permission = "inventory.adjust_stock"

    def post(self, request, pk):
        transfer = get_object_or_404(StockTransfer, pk=pk, tenant=self.tenant)
        # Check that user belongs to target branch or is owner
        if hasattr(request.user, "employments"):
            emp = request.user.employments.filter(tenant=self.tenant, is_active=True).first()
            if emp and emp.branch and request.user != self.tenant.owner and not request.user.is_superuser:
                if transfer.to_branch != emp.branch:
                    return Response(
                        {"detail": "Transferni faqat qabul qiluvchi filial xodimi qabul qilishi mumkin."},
                        status=status.HTTP_403_FORBIDDEN,
                    )

        try:
            transfer = StockTransferService.accept_transfer(transfer=transfer, user=request.user)
            return Response(StockTransferOutputSerializer(transfer).data)
        except (StockTransferServiceError, Exception) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class StockTransferRejectView(InventoryAPIView):
    permission_classes = [HasEmployeePermission]
    required_permission = "inventory.adjust_stock"

    def post(self, request, pk):
        transfer = get_object_or_404(StockTransfer, pk=pk, tenant=self.tenant)
        reason = request.data.get("reason", "").strip()

        # Check that user belongs to target branch or is owner
        if hasattr(request.user, "employments"):
            emp = request.user.employments.filter(tenant=self.tenant, is_active=True).first()
            if emp and emp.branch and request.user != self.tenant.owner and not request.user.is_superuser:
                if transfer.to_branch != emp.branch:
                    return Response(
                        {"detail": "Transferni faqat qabul qiluvchi filial xodimi rad qilishi mumkin."},
                        status=status.HTTP_403_FORBIDDEN,
                    )

        try:
            transfer = StockTransferService.reject_transfer(transfer=transfer, user=request.user, reason=reason)
            return Response(StockTransferOutputSerializer(transfer).data)
        except (StockTransferServiceError, Exception) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
