from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response

from api.permissions import HasEmployeePermission
from apps.sales.models import Sale, SaleItem, Counterparty
from apps.sales.services import SaleService, SaleServiceError, VoidService, VoidServiceError
from apps.inventory.services import StockServiceError
from api.v1.sales.serializers import (
    SaleOutputSerializer,
    SaleCreateInputSerializer,
    SaleVoidSerializer,
    SaleItemVoidSerializer,
    SaleItemOutputSerializer,
)
from ._base import SalesAPIView


class SaleListCreateView(SalesAPIView):
    permission_classes = [HasEmployeePermission]
    permission_map = {
        'GET': 'sales.view_sale',
        'POST': 'sales.add_sale',
    }

    def get(self, request):
        qs = Sale.objects.filter(tenant=self.tenant).select_related('sold_by', 'counterparty', 'b2b_target_tenant').prefetch_related('items__product_variant__product')
        status_param = request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)

        currency_param = request.query_params.get('currency')
        if currency_param:
            qs = qs.filter(currency=currency_param)

        cp_param = request.query_params.get('counterparty_id')
        if cp_param:
            qs = qs.filter(counterparty_id=cp_param)

        payment_type = request.query_params.get('payment_type')
        if payment_type:
            qs = qs.filter(payment_type=payment_type)

        search = request.query_params.get('search')
        if search:
            search = search.strip()
            qs = qs.filter(
                Q(receipt_number__icontains=search)
                | Q(counterparty__name__icontains=search)
                | Q(counterparty__phone_number__icontains=search)
            )

        date_from = request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)

        date_to = request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        return Response(SaleOutputSerializer(qs, many=True).data)

    def post(self, request):
        serializer = SaleCreateInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        counterparty = None
        cp_id = data.get('counterparty_id')
        if cp_id:
            counterparty = get_object_or_404(Counterparty, pk=cp_id, tenant=self.tenant)

        try:
            sales = SaleService.create_sale(
                tenant=self.tenant,
                user=request.user,
                items_data=data['items'],
                payment_type=data.get('payment_type', 'cash'),
                counterparty=counterparty,
                is_partner_sale=data.get('is_partner_sale', False),
                idempotency_key=data.get('idempotency_key'),
            )
        except (SaleServiceError, StockServiceError) as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(SaleOutputSerializer(sales, many=True).data, status=status.HTTP_201_CREATED)


class SaleDetailView(SalesAPIView):
    permission_classes = [HasEmployeePermission]
    permission_map = {'GET': 'sales.view_sale'}

    def get(self, request, pk):
        sale = get_object_or_404(
            Sale.objects.select_related('sold_by', 'counterparty', 'b2b_target_tenant').prefetch_related('items__product_variant__product'),
            pk=pk,
            tenant=self.tenant,
        )
        return Response(SaleOutputSerializer(sale).data)


class SaleVoidView(SalesAPIView):
    permission_classes = [HasEmployeePermission]
    permission_map = {'POST': 'sales.void_sale'}

    def post(self, request, pk):
        sale = get_object_or_404(Sale, pk=pk, tenant=self.tenant)
        serializer = SaleVoidSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            voided_sale = VoidService.void_sale(
                sale=sale,
                user=request.user,
                reason=serializer.validated_data['reason'],
            )
        except VoidServiceError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(SaleOutputSerializer(voided_sale).data, status=status.HTTP_200_OK)


class SaleItemVoidView(SalesAPIView):
    permission_classes = [HasEmployeePermission]
    permission_map = {'POST': 'sales.void_sale'}

    def post(self, request, pk):
        sale_item = get_object_or_404(SaleItem, pk=pk, tenant=self.tenant)
        serializer = SaleItemVoidSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            item = VoidService.void_sale_item(
                sale_item=sale_item,
                user=request.user,
                quantity=serializer.validated_data['quantity'],
                reason=serializer.validated_data['reason'],
            )
        except VoidServiceError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(SaleItemOutputSerializer(item).data, status=status.HTTP_200_OK)
