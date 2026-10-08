from django.urls import path

from .views.stock_views import StockListView, StockDetailView, DeficitStockListView
from .views.movement_views import (
    StockMovementListView,
    StockIntakeCreateView,
    StockBatchIntakeCreateView,
    StockAdjustCreateView,
    CustomerReturnCreateView,
    SupplierReturnCreateView,
    WriteOffCreateView,
)
from .views.transfer_views import (
    StockTransferListCreateView,
    StockTransferDetailView,
    StockTransferAcceptView,
    StockTransferRejectView,
)

urlpatterns = [
    path("stock/", StockListView.as_view(), name="stock-list"),
    path("stock/<int:product_variant_id>/", StockDetailView.as_view(), name="stock-detail"),
    path("deficits/", DeficitStockListView.as_view(), name="deficit-stock-list"),

    path("movements/", StockMovementListView.as_view(), name="movement-list"),
    path("intake/", StockIntakeCreateView.as_view(), name="stock-intake"),
    path("intake/batch/", StockBatchIntakeCreateView.as_view(), name="stock-batch-intake"),
    path("adjust/", StockAdjustCreateView.as_view(), name="stock-adjust"),
    path("customer-return/", CustomerReturnCreateView.as_view(), name="stock-customer-return"),
    path("supplier-return/", SupplierReturnCreateView.as_view(), name="stock-supplier-return"),
    path("write-off/", WriteOffCreateView.as_view(), name="stock-write-off"),

    path("transfers/", StockTransferListCreateView.as_view(), name="transfer-list-create"),
    path("transfers/<int:pk>/", StockTransferDetailView.as_view(), name="transfer-detail"),
    path("transfers/<int:pk>/accept/", StockTransferAcceptView.as_view(), name="transfer-accept"),
    path("transfers/<int:pk>/reject/", StockTransferRejectView.as_view(), name="transfer-reject"),
]
