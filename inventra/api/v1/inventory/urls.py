"""URL routes for the inventory API. Flat, owner/staff-only -- same
routing rationale as catalog's urls.py (see
api/v1/catalog/views/_base.py / api/mixins.py's OwnerStaffOnlyAPIView)."""

from django.urls import path

from .views.stock_views import StockListView, StockDetailView
from .views.movement_views import (
    StockMovementListView,
    StockIntakeCreateView,
    StockAdjustCreateView,
    CustomerReturnCreateView,
    SupplierReturnCreateView,
    WriteOffCreateView,
)

urlpatterns = [
    path("stock/", StockListView.as_view(), name="stock-list"),
    path("stock/<int:product_variant_id>/", StockDetailView.as_view(), name="stock-detail"),

    path("movements/", StockMovementListView.as_view(), name="movement-list"),
    path("intake/", StockIntakeCreateView.as_view(), name="stock-intake"),
    path("adjust/", StockAdjustCreateView.as_view(), name="stock-adjust"),
    path("customer-return/", CustomerReturnCreateView.as_view(), name="stock-customer-return"),
    path("supplier-return/", SupplierReturnCreateView.as_view(), name="stock-supplier-return"),
    path("write-off/", WriteOffCreateView.as_view(), name="stock-write-off"),
]
