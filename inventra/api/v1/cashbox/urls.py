from django.urls import path
from api.v1.cashbox.views.cashbox_views import (
    CashExpenseListCreateView,
    CashIncomeListCreateView,
    CurrentShiftStatusView,
    ShiftCloseView,
    DailyCashReportListView,
    DailyCashReportDetailView,
)

urlpatterns = [
    path('expenses/', CashExpenseListCreateView.as_view(), name='cashbox-expenses'),
    path('income/', CashIncomeListCreateView.as_view(), name='cashbox-income'),
    path('shift/current/', CurrentShiftStatusView.as_view(), name='cashbox-shift-current'),
    path('shift/close/', ShiftCloseView.as_view(), name='cashbox-shift-close'),
    path('reports/', DailyCashReportListView.as_view(), name='cashbox-reports-list'),
    path('reports/<int:pk>/', DailyCashReportDetailView.as_view(), name='cashbox-reports-detail'),
]
