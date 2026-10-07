from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response

from api.permissions import HasEmployeePermission
from apps.sales.models import Counterparty, DebtPayment, Sale
from apps.sales.services import (
    CounterpartyService,
    CounterpartyServiceError,
    DebtService,
    DebtServiceError,
)
from api.v1.sales.serializers import (
    CounterpartyOutputSerializer,
    CounterpartyCreateSerializer,
    CounterpartyUpdateSerializer,
    DebtPaymentOutputSerializer,
    DebtPaymentCreateSerializer,
    DebtPaymentCorrectionSerializer,
    SaleOutputSerializer,
)
from ._base import SalesAPIView


class CounterpartyListCreateView(SalesAPIView):
    permission_classes = [HasEmployeePermission]
    permission_map = {
        'GET': 'sales.manage_counterparty',
        'POST': 'sales.manage_counterparty',
    }

    def get(self, request):
        active_only = request.query_params.get('active', 'true').lower() == 'true'
        qs = Counterparty.objects.filter(tenant=self.tenant)
        if active_only:
            qs = qs.filter(is_active=True)

        search = request.query_params.get('search')
        if search:
            search = search.strip()
            qs = qs.filter(Q(name__icontains=search) | Q(phone_number__icontains=search))

        has_debt = request.query_params.get('has_debt')
        if has_debt and has_debt.lower() in ('true', '1'):
            qs = qs.filter(Q(debt_balance_uzs__gt=0) | Q(debt_balance_usd__gt=0))

        return Response(CounterpartyOutputSerializer(qs, many=True).data)

    def post(self, request):
        serializer = CounterpartyCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            cp = CounterpartyService.create(tenant=self.tenant, **serializer.validated_data)
        except CounterpartyServiceError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(CounterpartyOutputSerializer(cp).data, status=status.HTTP_201_CREATED)


class CounterpartyDetailView(SalesAPIView):
    permission_classes = [HasEmployeePermission]
    permission_map = {
        'GET': 'sales.manage_counterparty',
        'PATCH': 'sales.manage_counterparty',
        'DELETE': 'sales.manage_counterparty',
    }

    def get(self, request, pk):
        cp = get_object_or_404(Counterparty, pk=pk, tenant=self.tenant)
        return Response(CounterpartyOutputSerializer(cp).data)

    def patch(self, request, pk):
        cp = get_object_or_404(Counterparty, pk=pk, tenant=self.tenant)
        serializer = CounterpartyUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        cp = CounterpartyService.update(cp, **serializer.validated_data)
        return Response(CounterpartyOutputSerializer(cp).data)

    def delete(self, request, pk):
        cp = get_object_or_404(Counterparty, pk=pk, tenant=self.tenant)
        CounterpartyService.archive(cp)
        return Response({'detail': 'Kontragent arxivlandi.'}, status=status.HTTP_200_OK)


class DebtPaymentListCreateView(SalesAPIView):
    permission_classes = [HasEmployeePermission]
    permission_map = {
        'GET': 'sales.manage_counterparty',
        'POST': 'sales.record_debt_payment',
    }

    def get(self, request, counterparty_id):
        cp = get_object_or_404(Counterparty, pk=counterparty_id, tenant=self.tenant)
        payments = DebtPayment.objects.filter(counterparty=cp).select_related('recorded_by')
        return Response(DebtPaymentOutputSerializer(payments, many=True).data)

    def post(self, request, counterparty_id):
        cp = get_object_or_404(Counterparty, pk=counterparty_id, tenant=self.tenant)
        serializer = DebtPaymentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            payment = DebtService.record_payment(
                counterparty=cp,
                amount=data['amount'],
                currency=data['currency'],
                recorded_by=request.user,
                is_correction=False,
                note=data.get('note', ''),
            )
        except DebtServiceError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(DebtPaymentOutputSerializer(payment).data, status=status.HTTP_201_CREATED)


class DebtPaymentCorrectionView(SalesAPIView):
    permission_classes = [HasEmployeePermission]
    permission_map = {'POST': 'sales.record_debt_payment'}

    def post(self, request, counterparty_id):
        cp = get_object_or_404(Counterparty, pk=counterparty_id, tenant=self.tenant)
        serializer = DebtPaymentCorrectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            payment = DebtService.record_payment(
                counterparty=cp,
                amount=data['amount'],
                currency=data['currency'],
                recorded_by=request.user,
                is_correction=True,
                note=data['note'],
            )
        except DebtServiceError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(DebtPaymentOutputSerializer(payment).data, status=status.HTTP_201_CREATED)


class CounterpartySalesListView(SalesAPIView):
    permission_classes = [HasEmployeePermission]
    permission_map = {
        'GET': 'sales.manage_counterparty',
    }

    def get(self, request, counterparty_id):
        cp = get_object_or_404(Counterparty, pk=counterparty_id, tenant=self.tenant)
        qs = Sale.objects.filter(
            tenant=self.tenant,
            counterparty=cp,
        ).select_related(
            'sold_by', 'counterparty', 'b2b_target_tenant'
        ).prefetch_related(
            'items__product_variant__product'
        ).order_by('-created_at')

        payment_type = request.query_params.get('payment_type')
        if payment_type:
            qs = qs.filter(payment_type=payment_type)

        search = request.query_params.get('search')
        if search:
            search = search.strip()
            qs = qs.filter(
                Q(receipt_number__icontains=search)
                | Q(items__product_variant__product__name__icontains=search)
                | Q(items__product_variant__name__icontains=search)
            ).distinct()

        sales_data = SaleOutputSerializer(qs, many=True).data

        total_sales_count = Sale.objects.filter(tenant=self.tenant, counterparty=cp).count()
        debt_sales_count = Sale.objects.filter(tenant=self.tenant, counterparty=cp, payment_type=Sale.PAYMENT_DEBT).count()

        return Response({
            'counterparty': CounterpartyOutputSerializer(cp).data,
            'total_sales_count': total_sales_count,
            'debt_sales_count': debt_sales_count,
            'sales': sales_data,
        })
