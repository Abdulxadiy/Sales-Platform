from django.shortcuts import get_object_or_404
from rest_framework.response import Response

from api.permissions import HasEmployeePermission
from apps.catalog.models import ProductVariant
from apps.inventory.models import Stock
from api.v1.inventory.serializers import StockOutputSerializer
from ._base import InventoryAPIView


class StockListView(InventoryAPIView):
    """GET /api/v1/inventory/stock/ -- current balance for every variant
    that has ever had a movement. A variant with no Stock row yet simply
    doesn't appear here -- that absence IS "0 dona" (see Stock's
    docstring: rows are created lazily, catalog never creates them)."""

    permission_classes = [HasEmployeePermission]
    required_permission = "inventory.view_stock"

    def get(self, request):
        stock = Stock.objects.filter(tenant=self.tenant).select_related("product_variant")
        return Response(StockOutputSerializer(stock, many=True).data)


class StockDetailView(InventoryAPIView):
    """GET /api/v1/inventory/stock/{product_variant_id}/ -- current
    balance for one variant. Returns quantity=0 (no last_cost_price)
    for a variant that has never had a movement, rather than 404 --
    "no stock yet" is a valid, common state for a freshly-created
    ProductVariant, not an error."""

    permission_classes = [HasEmployeePermission]
    required_permission = "inventory.view_stock"

    def get(self, request, product_variant_id):
        variant = get_object_or_404(ProductVariant, pk=product_variant_id, tenant=self.tenant)
        stock = Stock.objects.filter(tenant=self.tenant, product_variant=variant).first()
        if stock is None:
            return Response({
                "product_variant": variant.id, "quantity": "0.000", "last_cost_price": None,
            })
        return Response(StockOutputSerializer(stock).data)
