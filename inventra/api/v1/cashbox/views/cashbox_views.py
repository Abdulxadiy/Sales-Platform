from rest_framework.response import Response
from rest_framework import status
from rest_framework.generics import ListCreateAPIView, RetrieveAPIView, ListAPIView
from django.shortcuts import get_object_or_404

from api.mixins import OwnerStaffOnlyAPIView
from apps.cashbox.models import CashExpense, CashIncome, DailyCashReport
from apps.cashbox.services.cashbox_service import CashboxService, CashboxServiceError
from api.v1.cashbox.serializers import (
    CashExpenseSerializer,
    CashIncomeSerializer,
    ShiftCloseSerializer,
    DailyCashReportSerializer,
)


class CashExpenseListCreateView(OwnerStaffOnlyAPIView):
    """
    Kassadan xarajatlar ro'yxati va yangi xarajat kiritish.
    """
    def get(self, request):
        expenses = CashExpense.objects.filter(tenant=self.tenant)
        serializer = CashExpenseSerializer(expenses, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = CashExpenseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            expense = CashboxService.record_expense(
                tenant=self.tenant,
                user=request.user,
                amount=data['amount'],
                currency=data.get('currency', CashExpense.CURRENCY_UZS),
                category=data['category'],
                note=data.get('note', ''),
                date=data.get('date'),
            )
            return Response(CashExpenseSerializer(expense).data, status=status.HTTP_201_CREATED)
        except CashboxServiceError as e:
            return Response(
                {"error": {"code": "invalid_expense", "message": str(e)}},
                status=status.HTTP_400_BAD_REQUEST,
            )


class CashIncomeListCreateView(OwnerStaffOnlyAPIView):
    """
    Kassaga qo'shimcha kirimlar ro'yxati va yangi kirim kiritish.
    """
    def get(self, request):
        incomes = CashIncome.objects.filter(tenant=self.tenant)
        serializer = CashIncomeSerializer(incomes, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = CashIncomeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            income = CashboxService.record_income(
                tenant=self.tenant,
                user=request.user,
                amount=data['amount'],
                currency=data.get('currency', CashIncome.CURRENCY_UZS),
                source=data['source'],
                note=data.get('note', ''),
                date=data.get('date'),
            )
            return Response(CashIncomeSerializer(income).data, status=status.HTTP_201_CREATED)
        except CashboxServiceError as e:
            return Response(
                {"error": {"code": "invalid_income", "message": str(e)}},
                status=status.HTTP_400_BAD_REQUEST,
            )


class CurrentShiftStatusView(OwnerStaffOnlyAPIView):
    """
    Kassaning joriy smenadagi jonli holati (kutilgan pul, tushumlar, xarajatlar).
    """
    def get(self, request):
        status_data = CashboxService.get_current_shift_status(self.tenant)
        # Format decimals to strings for clean JSON
        formatted = {
            k: f"{v:.2f}" if hasattr(v, "quantize") else v
            for k, v in status_data.items()
        }
        return Response(formatted, status=status.HTTP_200_OK)


class ShiftCloseView(OwnerStaffOnlyAPIView):
    """
    Smenani yopish va Z-Hisobot yaratish.
    """
    def post(self, request):
        serializer = ShiftCloseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            report = CashboxService.close_shift(
                tenant=self.tenant,
                user=request.user,
                actual_cash_uzs=data['actual_cash_uzs'],
                actual_cash_usd=data['actual_cash_usd'],
                discrepancy_reason=data.get('discrepancy_reason', ''),
                staff_notes=data.get('staff_notes', ''),
            )
            return Response(DailyCashReportSerializer(report).data, status=status.HTTP_201_CREATED)
        except CashboxServiceError as e:
            return Response(
                {"error": {"code": "shift_close_error", "message": str(e)}},
                status=status.HTTP_400_BAD_REQUEST,
            )


class DailyCashReportListView(OwnerStaffOnlyAPIView):
    """
    O'tgan Z-Hisobotlar ro'yxati.
    """
    def get(self, request):
        reports = DailyCashReport.objects.filter(tenant=self.tenant)
        serializer = DailyCashReportSerializer(reports, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DailyCashReportDetailView(OwnerStaffOnlyAPIView):
    """
    Alohida Z-Hisobot tafsilotlari.
    """
    def get(self, request, pk):
        report = get_object_or_404(DailyCashReport, tenant=self.tenant, pk=pk)
        serializer = DailyCashReportSerializer(report)
        return Response(serializer.data, status=status.HTTP_200_OK)
