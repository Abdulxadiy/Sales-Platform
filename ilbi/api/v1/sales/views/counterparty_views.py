from django.db.models import Q
from django.shortcuts import get_object_or_404
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.response import Response

from api.permissions import HasEmployeePermission
from api.schema import optional_pagination
from api.v1.sales.serializers import (
    CounterpartyCreateSerializer,
    CounterpartyOutputSerializer,
    CounterpartyUpdateSerializer,
    DebtPaymentCorrectionSerializer,
    DebtPaymentCreateSerializer,
    DebtPaymentOutputSerializer,
    SaleOutputSerializer,
)
from apps.sales.models import Counterparty, DebtPayment, Sale
from apps.sales.services import (
    CounterpartyService,
    CounterpartyServiceError,
    DebtService,
    DebtServiceError,
)

from ._base import SalesAPIView


class CounterpartyListCreateView(SalesAPIView):
    permission_classes = [HasEmployeePermission]
    permission_map = {
        'GET': ('sales.manage_counterparty', 'sales.record_debt_payment'),
        'POST': 'sales.manage_counterparty',
    }

    @extend_schema(request=None, responses={200: optional_pagination(CounterpartyOutputSerializer)})
    def get(self, request):
        active_only = request.query_params.get('active', 'true').lower() == 'true'
        from django.db.models import Prefetch
        payments_prefetch = Prefetch(
            'payments',
            queryset=DebtPayment.objects.select_related('recorded_by', 'branch', 'tenant').order_by('-paid_at'),
            to_attr='prefetched_payments'
        )
        qs = Counterparty.objects.filter(tenant=self.tenant).prefetch_related(payments_prefetch)
        if active_only:
            qs = qs.filter(is_active=True)

        search = request.query_params.get('search')
        if search:
            search = search.strip()
            qs = qs.filter(Q(name__icontains=search) | Q(phone_number__icontains=search))

        has_debt = request.query_params.get('has_debt')
        if has_debt and has_debt.lower() in ('true', '1'):
            qs = qs.filter(Q(debt_balance_uzs__gt=0) | Q(debt_balance_usd__gt=0))

        if request.query_params.get('page'):
            from api.pagination import StandardResultsSetPagination
            paginator = StandardResultsSetPagination()
            page_data = paginator.paginate_queryset(qs, request)
            return paginator.get_paginated_response(CounterpartyOutputSerializer(page_data, many=True).data)

        return Response(CounterpartyOutputSerializer(qs, many=True).data)

    @extend_schema(request=CounterpartyCreateSerializer, responses={201: CounterpartyOutputSerializer})
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
        'GET': ('sales.manage_counterparty', 'sales.record_debt_payment'),
        'PATCH': 'sales.manage_counterparty',
        'DELETE': 'sales.manage_counterparty',
    }

    @extend_schema(request=None, responses={200: CounterpartyOutputSerializer})
    def get(self, request, pk):
        from django.db.models import Prefetch
        payments_prefetch = Prefetch(
            'payments',
            queryset=DebtPayment.objects.select_related('recorded_by', 'branch', 'tenant').order_by('-paid_at'),
            to_attr='prefetched_payments'
        )
        cp = get_object_or_404(
            Counterparty.objects.prefetch_related(payments_prefetch),
            pk=pk,
            tenant=self.tenant
        )
        return Response(CounterpartyOutputSerializer(cp).data)

    @extend_schema(request=CounterpartyUpdateSerializer, responses={200: CounterpartyOutputSerializer})
    def patch(self, request, pk):
        cp = get_object_or_404(Counterparty, pk=pk, tenant=self.tenant)
        serializer = CounterpartyUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            cp = CounterpartyService.update(cp, **serializer.validated_data)
        except CounterpartyServiceError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(CounterpartyOutputSerializer(cp).data)

    @extend_schema(request=None, responses={200: OpenApiTypes.OBJECT})
    def delete(self, request, pk):
        cp = get_object_or_404(Counterparty, pk=pk, tenant=self.tenant)
        try:
            CounterpartyService.archive(cp)
        except CounterpartyServiceError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response({'detail': 'Kontragent arxivlandi.'}, status=status.HTTP_200_OK)


class DebtPaymentListCreateView(SalesAPIView):
    permission_classes = [HasEmployeePermission]
    permission_map = {
        'GET': ('sales.manage_counterparty', 'sales.record_debt_payment'),
        'POST': 'sales.record_debt_payment',
    }

    @extend_schema(request=None, responses={200: DebtPaymentOutputSerializer(many=True)})
    def get(self, request, counterparty_id):
        cp = get_object_or_404(Counterparty, pk=counterparty_id, tenant=self.tenant)
        payments = DebtPayment.objects.filter(counterparty=cp).select_related('recorded_by', 'branch', 'tenant')
        return Response(DebtPaymentOutputSerializer(payments, many=True).data)

    @extend_schema(request=DebtPaymentCreateSerializer, responses={201: DebtPaymentOutputSerializer})
    def post(self, request, counterparty_id):
        cp = get_object_or_404(Counterparty, pk=counterparty_id, tenant=self.tenant)
        serializer = DebtPaymentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        branch_id = data.get('branch_id')
        branch = None
        if branch_id:
            from apps.tenants.models import Tenant
            if request.user.role == 'platform_admin':
                branch = get_object_or_404(Tenant, pk=branch_id)
            else:
                owner_id = self.tenant.owner_id if self.tenant else request.user.id
                branch = get_object_or_404(Tenant, pk=branch_id, owner_id=owner_id)
        else:
            branch = self.tenant

        try:
            payment = DebtService.record_payment(
                counterparty=cp,
                amount=data['amount'],
                currency=data['currency'],
                recorded_by=request.user,
                branch=branch,
                payment_type=data["payment_type"], idempotency_key=data.get("idempotency_key"),
                is_correction=False,
                note=data.get('note', ''),
            )
        except DebtServiceError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(DebtPaymentOutputSerializer(payment).data, status=status.HTTP_201_CREATED)


class DebtPaymentCorrectionView(SalesAPIView):
    permission_classes = [HasEmployeePermission]
    permission_map = {'POST': 'sales.record_debt_payment'}

    @extend_schema(request=DebtPaymentCorrectionSerializer, responses={201: DebtPaymentOutputSerializer})
    def post(self, request, counterparty_id):
        cp = get_object_or_404(Counterparty, pk=counterparty_id, tenant=self.tenant)
        serializer = DebtPaymentCorrectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        branch_id = data.get('branch_id')
        branch = None
        if branch_id:
            from apps.tenants.models import Tenant
            if request.user.role == 'platform_admin':
                branch = get_object_or_404(Tenant, pk=branch_id)
            else:
                owner_id = self.tenant.owner_id if self.tenant else request.user.id
                branch = get_object_or_404(Tenant, pk=branch_id, owner_id=owner_id)
        else:
            branch = self.tenant

        try:
            payment = DebtService.record_payment(
                counterparty=cp,
                amount=data['amount'],
                currency=data['currency'],
                recorded_by=request.user,
                branch=branch,
                payment_type=data["payment_type"], idempotency_key=data.get("idempotency_key"),
                is_correction=True,
                note=data['note'],
            )
        except DebtServiceError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(DebtPaymentOutputSerializer(payment).data, status=status.HTTP_201_CREATED)


class CounterpartySalesListView(SalesAPIView):
    permission_classes = [HasEmployeePermission]
    permission_map = {
        'GET': ('sales.manage_counterparty', 'sales.record_debt_payment'),
    }

    @extend_schema(request=None, responses={200: OpenApiTypes.OBJECT})
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

        sales_data = SaleOutputSerializer(qs, many=True, context={"request": request}).data

        total_sales_count = Sale.objects.filter(tenant=self.tenant, counterparty=cp).count()
        debt_sales_count = Sale.objects.filter(tenant=self.tenant, counterparty=cp, payment_type=Sale.PAYMENT_DEBT).count()

        return Response({
            'counterparty': CounterpartyOutputSerializer(cp).data,
            'total_sales_count': total_sales_count,
            'debt_sales_count': debt_sales_count,
            'sales': sales_data,
        })
