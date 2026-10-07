from django.urls import path
from api.v1.sales.views.sale_views import (
    SaleListCreateView,
    SaleDetailView,
    SaleVoidView,
    SaleItemVoidView,
)
from api.v1.sales.views.counterparty_views import (
    CounterpartyListCreateView,
    CounterpartyDetailView,
    DebtPaymentListCreateView,
    DebtPaymentCorrectionView,
    CounterpartySalesListView,
)
from api.v1.sales.views.b2b_views import (
    B2BInboxListView,
    B2BAcceptView,
    B2BRejectView,
)
from api.v1.sales.views.notification_views import (
    NotificationListView,
    NotificationDetailView,
    NotificationReadView,
)

urlpatterns = [
    # Sales
    path('', SaleListCreateView.as_view(), name='sale-list-create'),
    path('<int:pk>/', SaleDetailView.as_view(), name='sale-detail'),
    path('<int:pk>/void/', SaleVoidView.as_view(), name='sale-void'),
    path('items/<int:pk>/void/', SaleItemVoidView.as_view(), name='sale-item-void'),

    # Counterparties & Debt
    path('counterparties/', CounterpartyListCreateView.as_view(), name='counterparty-list-create'),
    path('counterparties/<int:pk>/', CounterpartyDetailView.as_view(), name='counterparty-detail'),
    path('counterparties/<int:counterparty_id>/sales/', CounterpartySalesListView.as_view(), name='counterparty-sales-list'),
    path('counterparties/<int:counterparty_id>/payments/', DebtPaymentListCreateView.as_view(), name='debt-payment-list-create'),
    path('counterparties/<int:counterparty_id>/payments/correct/', DebtPaymentCorrectionView.as_view(), name='debt-payment-correct'),

    # B2B
    path('b2b/inbox/', B2BInboxListView.as_view(), name='b2b-inbox-list'),
    path('b2b/<int:sale_id>/accept/', B2BAcceptView.as_view(), name='b2b-accept'),
    path('b2b/<int:sale_id>/reject/', B2BRejectView.as_view(), name='b2b-reject'),

    # Notifications
    path('notifications/', NotificationListView.as_view(), name='notification-list'),
    path('notifications/<int:pk>/', NotificationDetailView.as_view(), name='notification-detail'),
    path('notifications/<int:pk>/read/', NotificationReadView.as_view(), name='notification-read'),
]
