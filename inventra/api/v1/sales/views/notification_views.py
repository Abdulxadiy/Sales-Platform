from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response

from api.permissions import HasEmployeePermission
from apps.sales.models import Notification
from api.v1.sales.serializers import NotificationOutputSerializer
from ._base import SalesAPIView


class NotificationListView(SalesAPIView):
    def get(self, request):
        qs = Notification.objects.filter(tenant=self.tenant, recipient=request.user)
        return Response(NotificationOutputSerializer(qs, many=True).data)


class NotificationReadView(SalesAPIView):
    def post(self, request, pk):
        notif = get_object_or_404(Notification, pk=pk, tenant=self.tenant, recipient=request.user)
        notif.is_read = True
        notif.save(update_fields=['is_read'])
        return Response({"detail": "Xabarnoma o'qildi deb belgilandi."}, status=status.HTTP_200_OK)
