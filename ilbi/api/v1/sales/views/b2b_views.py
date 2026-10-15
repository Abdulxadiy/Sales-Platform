from django.db.models import Q
from django.shortcuts import get_object_or_404
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.response import Response

from api.permissions import HasEmployeePermission
from api.pagination import StandardResultsSetPagination
from api.schema import optional_pagination
from api.v1.sales.serializers import (
    B2BAcceptInputSerializer,
    B2BIncomingSaleSerializer,
    B2BRejectInputSerializer,
    B2BReturnDiscrepancyCloseInputSerializer,
    B2BReturnInputSerializer,
    SaleOutputSerializer,
)
from apps.sales.models import Sale
from apps.sales.services import B2BTransferService, B2BTransferServiceError

from ._base import SalesAPIView


class B2BInboxListView(SalesAPIView):
    permission_classes = [HasEmployeePermission]
    permission_map = {"GET": "sales.manage_b2b"}

    @extend_schema(request=None, responses={200: optional_pagination(B2BIncomingSaleSerializer)})
    def get(self, request):
        incoming = (
            Sale.objects.filter(
                b2b_target_tenant=self.tenant, status__in=[Sale.STATUS_B2B_PENDING, Sale.STATUS_B2B_PARTIALLY_ACCEPTED]
            )
            .select_related("tenant", "sold_by")
            .prefetch_related("items__product_variant__product")
        )
        incoming = incoming.order_by('-created_at', '-pk')
        search = (request.query_params.get('search') or '').strip()
        if search:
            incoming = incoming.filter(Q(receipt_number__icontains=search) | Q(tenant__name__icontains=search))
        if request.query_params.get('page'):
            paginator = StandardResultsSetPagination()
            rows = paginator.paginate_queryset(incoming, request)
            return paginator.get_paginated_response(B2BIncomingSaleSerializer(rows, many=True).data)
        return Response(B2BIncomingSaleSerializer(incoming, many=True).data)


class B2BAcceptView(SalesAPIView):
    permission_classes = [HasEmployeePermission]
    permission_map = {"POST": "sales.manage_b2b"}

    @extend_schema(request=B2BAcceptInputSerializer, responses={200: B2BIncomingSaleSerializer})
    def post(self, request, sale_id):
        # Incoming sale belongs to sender tenant, but b2b_target_tenant must match current tenant
        sale = get_object_or_404(Sale, pk=sale_id, b2b_target_tenant=self.tenant)
        serializer = B2BAcceptInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            updated_sale = B2BTransferService.accept_transfer(
                sale=sale,
                accepting_user=request.user,
                tenant=self.tenant,
                items_payload=serializer.validated_data["items"],
            )
        except B2BTransferServiceError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(B2BIncomingSaleSerializer(updated_sale).data, status=status.HTTP_200_OK)


class B2BRejectView(SalesAPIView):
    permission_classes = [HasEmployeePermission]
    permission_map = {"POST": "sales.manage_b2b"}

    @extend_schema(request=B2BRejectInputSerializer, responses={200: B2BIncomingSaleSerializer})
    def post(self, request, sale_id):
        sale = get_object_or_404(Sale, pk=sale_id, b2b_target_tenant=self.tenant)
        serializer = B2BRejectInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            rejected_sale = B2BTransferService.reject_transfer(
                sale=sale,
                rejecting_user=request.user,
                tenant=self.tenant,
                reason=serializer.validated_data["reason"],
            )
        except B2BTransferServiceError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(B2BIncomingSaleSerializer(rejected_sale).data, status=status.HTTP_200_OK)


class B2BReturnReceiveView(SalesAPIView):
    permission_classes = [HasEmployeePermission]
    permission_map = {"POST": "sales.manage_b2b"}

    @extend_schema(request=B2BReturnInputSerializer, responses={200: OpenApiTypes.OBJECT})
    def post(self, request, sale_id):
        sale = get_object_or_404(Sale, pk=sale_id, tenant=self.tenant, b2b_target_tenant__isnull=False)
        serializer = B2BReturnInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            receipt = B2BTransferService.receive_return(
                sale=sale,
                receiving_user=request.user,
                tenant=self.tenant,
                items_payload=serializer.validated_data["items"],
                reason=serializer.validated_data["reason"],
                idempotency_key=serializer.validated_data["idempotency_key"],
            )
        except B2BTransferServiceError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            {
                "receipt_id": receipt.id,
                "sale": SaleOutputSerializer(receipt.sale, context={"request": request}).data,
            },
            status=status.HTTP_200_OK,
        )


class B2BReturnDiscrepancyCloseView(SalesAPIView):
    permission_classes = [HasEmployeePermission]
    permission_map = {"POST": "sales.manage_b2b"}

    @extend_schema(request=B2BReturnDiscrepancyCloseInputSerializer, responses={200: OpenApiTypes.OBJECT})
    def post(self, request, sale_id):
        sale = get_object_or_404(Sale, pk=sale_id, tenant=self.tenant, b2b_target_tenant__isnull=False)
        serializer = B2BReturnDiscrepancyCloseInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            closure = B2BTransferService.close_return_discrepancy(
                sale=sale,
                closing_user=request.user,
                tenant=self.tenant,
                items_payload=serializer.validated_data["items"],
                reason=serializer.validated_data["reason"],
                idempotency_key=serializer.validated_data["idempotency_key"],
            )
        except B2BTransferServiceError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        closure.sale.refresh_from_db()
        return Response(
            {
                "closure_id": closure.id,
                "sale": SaleOutputSerializer(closure.sale, context={"request": request}).data,
            },
            status=status.HTTP_200_OK,
        )
