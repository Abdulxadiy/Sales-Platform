from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework.response import Response

from api.permissions import HasEmployeePermission
from apps.catalog.models import ProductVariant
from apps.inventory.models import Stock
from api.v1.inventory.serializers import StockOutputSerializer, StockPriceUpdateSerializer
from ._base import InventoryAPIView


class StockListView(InventoryAPIView):
    """GET /api/v1/inventory/stock/ -- current balance for every variant
    that has ever had a movement. A variant with no Stock row yet simply
    doesn't appear here -- that absence IS "0 dona"."""

    permission_classes = [HasEmployeePermission]
    required_permission = "inventory.view_stock"

    def get(self, request):
        stock = (
            Stock.objects.filter(tenant=self.tenant)
            .select_related("branch", "product_variant", "product_variant__product", "product_variant__product__category")
        )

        branch_id = request.query_params.get("branch_id")
        if branch_id:
            stock = stock.filter(branch_id=branch_id)
        elif hasattr(request.user, "employments"):
            emp = request.user.employments.filter(tenant=self.tenant, is_active=True).first()
            if emp and emp.branch and request.user != self.tenant.owner and not request.user.is_superuser:
                stock = stock.filter(branch=emp.branch)

        search = request.query_params.get("search")
        if search:
            s = search.strip()
            stock = stock.filter(
                Q(product_variant__product__name__icontains=s)
                | Q(product_variant__name__icontains=s)
                | Q(product_variant__sku__icontains=s)
                | Q(product_variant__code__icontains=s)
                | Q(product_variant__barcode__icontains=s)
            )
        if request.query_params.get("page"):
            from api.pagination import StandardResultsSetPagination
            paginator = StandardResultsSetPagination()
            page_data = paginator.paginate_queryset(stock.order_by("id"), request)
            return paginator.get_paginated_response(StockOutputSerializer(page_data, many=True).data)

        return Response(StockOutputSerializer(stock, many=True).data)


class StockDetailView(InventoryAPIView):
    """GET /api/v1/inventory/stock/{product_variant_id}/ -- current
    balance for one variant for the specified branch (or default).
    PATCH /api/v1/inventory/stock/{product_variant_id}/ -- update custom branch prices."""

    permission_classes = [HasEmployeePermission]
    required_permission = "inventory.view_stock"

    def _resolve_branch(self, request, data=None):
        branch_id = (data.get("branch_id") if data else None) or request.query_params.get("branch_id")
        if branch_id:
            return self.tenant.branches.filter(pk=branch_id).first()
        if hasattr(request.user, "employments"):
            emp = request.user.employments.filter(tenant=self.tenant, is_active=True).first()
            if emp and emp.branch:
                return emp.branch
        return self.tenant.get_main_branch()

    def get(self, request, product_variant_id):
        variant = get_object_or_404(ProductVariant, pk=product_variant_id, tenant=self.tenant)
        branch = self._resolve_branch(request)
        stock = Stock.objects.filter(tenant=self.tenant, branch=branch, product_variant=variant).first()
        if stock is None:
            return Response({
                "product_variant": variant.id,
                "branch": branch.id if branch else None,
                "branch_name": branch.name if branch else "",
                "quantity": "0.000",
                "last_cost_price": None,
                "base_price_recommended": variant.price_recommended,
                "base_price_min": variant.price_min,
                "base_price_partner": variant.price_partner,
                "effective_price_recommended": variant.price_recommended,
                "effective_price_min": variant.price_min,
                "effective_price_partner": variant.price_partner,
            })
        return Response(StockOutputSerializer(stock).data)

    def patch(self, request, product_variant_id):
        variant = get_object_or_404(ProductVariant, pk=product_variant_id, tenant=self.tenant)
        serializer = StockPriceUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        branch = self._resolve_branch(request, data)
        stock, _ = Stock.objects.get_or_create(
            tenant=self.tenant, branch=branch, product_variant=variant, defaults={"quantity": 0}
        )

        for field in ("custom_price_recommended", "custom_price_min", "custom_price_partner"):
            if field in data:
                setattr(stock, field, data[field])
        stock.save(update_fields=["custom_price_recommended", "custom_price_min", "custom_price_partner", "updated_at"])
        return Response(StockOutputSerializer(stock).data)


class DeficitStockListView(InventoryAPIView):
    """
    GET /api/v1/inventory/deficits/
    Returns list of products whose 30-day sales >= 10 and current stock <= 5.
    """

    permission_classes = [HasEmployeePermission]
    required_permission = "inventory.view_stock"

    def get(self, request):
        from apps.inventory.services import DeficitService

        search = request.query_params.get("search")
        deficits = DeficitService.get_deficit_variants(self.tenant, search_query=search)
        return Response(deficits)
