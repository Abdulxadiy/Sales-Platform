from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response

from api.permissions import HasEmployeePermission
from apps.sales.models import Counterparty, DebtPayment
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
