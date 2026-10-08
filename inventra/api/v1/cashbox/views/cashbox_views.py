from rest_framework.response import Response
from rest_framework import status
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


class _BaseCashboxAPIView(OwnerStaffOnlyAPIView):
    def get_branch(self, request):
        branch_id = request.query_params.get('branch_id') or (request.data.get('branch_id') if isinstance(request.data, dict) else None)
        if branch_id:
            from apps.tenants.models import Branch
            return Branch.objects.filter(pk=branch_id, tenant=self.tenant).first()
        if hasattr(request.user, 'employments'):
            emp = request.user.employments.filter(tenant=self.tenant, is_active=True).first()
            if emp and emp.branch:
                return emp.branch
        return None


class CashExpenseListCreateView(_BaseCashboxAPIView):
    """
    Kassadan xarajatlar ro'yxati va yangi xarajat kiritish.
    """
    def get(self, request):
        branch = self.get_branch(request)
        expenses = CashExpense.objects.filter(tenant=self.tenant)
        if branch:
            expenses = expenses.filter(branch=branch)
        serializer = CashExpenseSerializer(expenses, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = CashExpenseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        branch = self.get_branch(request)

        try:
            expense = CashboxService.record_expense(
                tenant=self.tenant,
                branch=branch,
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


class CashIncomeListCreateView(_BaseCashboxAPIView):
    """
    Kassaga qo'shimcha kirimlar ro'yxati va yangi kirim kiritish.
    """
    def get(self, request):
        branch = self.get_branch(request)
        incomes = CashIncome.objects.filter(tenant=self.tenant)
        if branch:
            incomes = incomes.filter(branch=branch)
        serializer = CashIncomeSerializer(incomes, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = CashIncomeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        branch = self.get_branch(request)

        try:
            income = CashboxService.record_income(
                tenant=self.tenant,
                branch=branch,
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


class CurrentShiftStatusView(_BaseCashboxAPIView):
    """
    Kassaning joriy smenadagi jonli holati (kutilgan pul, tushumlar, xarajatlar).
    """
    def get(self, request):
        branch = self.get_branch(request)
        status_data = CashboxService.get_current_shift_status(self.tenant, branch=branch)
        # Format decimals to strings for clean JSON
        formatted = {
            k: f"{v:.2f}" if hasattr(v, "quantize") else v
            for k, v in status_data.items()
        }
        return Response(formatted, status=status.HTTP_200_OK)


class ShiftCloseView(_BaseCashboxAPIView):
    """
    Smenani yopish va Z-Hisobot yaratish.
    """
    def post(self, request):
        serializer = ShiftCloseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        branch = self.get_branch(request)

        try:
            report = CashboxService.close_shift(
                tenant=self.tenant,
                branch=branch,
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


class DailyCashReportListView(_BaseCashboxAPIView):
    """
    O'tgan Z-Hisobotlar ro'yxati.
    """
    def get(self, request):
        branch = self.get_branch(request)
        reports = DailyCashReport.objects.filter(tenant=self.tenant)
        if branch:
            reports = reports.filter(branch=branch)
        serializer = DailyCashReportSerializer(reports, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DailyCashReportDetailView(_BaseCashboxAPIView):
    """
    Alohida Z-Hisobot tafsilotlari.
    """
    def get(self, request, pk):
        report = get_object_or_404(DailyCashReport, tenant=self.tenant, pk=pk)
        serializer = DailyCashReportSerializer(report)
        return Response(serializer.data, status=status.HTTP_200_OK)
