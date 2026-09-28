from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response

from api.permissions import HasEmployeePermission
from apps.sales.models import Sale
from apps.sales.services import B2BTransferService, B2BTransferServiceError
from api.v1.sales.serializers import (
    SaleOutputSerializer,
    B2BAcceptInputSerializer,
    B2BRejectInputSerializer,
)
from ._base import SalesAPIView


class B2BInboxListView(SalesAPIView):
    permission_classes = [HasEmployeePermission]
    permission_map = {'GET': 'sales.manage_b2b'}

    def get(self, request):
        incoming = Sale.objects.filter(
            b2b_target_tenant=self.tenant,
            status__in=[Sale.STATUS_B2B_PENDING, Sale.STATUS_B2B_PARTIALLY_ACCEPTED]
        ).select_related('tenant', 'sold_by').prefetch_related('items__product_variant__product')
        return Response(SaleOutputSerializer(incoming, many=True).data)


class B2BAcceptView(SalesAPIView):
    permission_classes = [HasEmployeePermission]
    permission_map = {'POST': 'sales.manage_b2b'}

    def post(self, request, sale_id):
        # Incoming sale belongs to sender tenant, but b2b_target_tenant must match current tenant
        sale = get_object_or_404(Sale, pk=sale_id, b2b_target_tenant=self.tenant)
        serializer = B2BAcceptInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            updated_sale = B2BTransferService.accept_transfer(
                sale=sale,
                accepting_user=request.user,
                items_payload=serializer.validated_data['items'],
            )
        except B2BTransferServiceError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(SaleOutputSerializer(updated_sale).data, status=status.HTTP_200_OK)


class B2BRejectView(SalesAPIView):
    permission_classes = [HasEmployeePermission]
    permission_map = {'POST': 'sales.manage_b2b'}

    def post(self, request, sale_id):
        sale = get_object_or_404(Sale, pk=sale_id, b2b_target_tenant=self.tenant)
        serializer = B2BRejectInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            rejected_sale = B2BTransferService.reject_transfer(
                sale=sale,
                rejecting_user=request.user,
                reason=serializer.validated_data['reason'],
            )
        except B2BTransferServiceError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(SaleOutputSerializer(rejected_sale).data, status=status.HTTP_200_OK)
