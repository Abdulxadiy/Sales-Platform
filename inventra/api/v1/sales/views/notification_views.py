from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.mixins import TenantContextMixin
from apps.sales.models import Notification
from api.v1.sales.serializers import NotificationOutputSerializer


class NotificationListView(TenantContextMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role == 'platform_admin':
            qs = Notification.objects.filter(recipient=request.user)
        else:
            if not self.tenant:
                return Response([])
            qs = Notification.objects.filter(tenant=self.tenant, recipient=request.user)
        return Response(NotificationOutputSerializer(qs, many=True).data)


class NotificationReadView(TenantContextMixin, APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if request.user.role == 'platform_admin':
            notif = get_object_or_404(Notification, pk=pk, recipient=request.user)
        else:
            if not self.tenant:
                return Response({"detail": "Do'kon topilmadi."}, status=status.HTTP_403_FORBIDDEN)
            notif = get_object_or_404(Notification, pk=pk, tenant=self.tenant, recipient=request.user)
        notif.is_read = True
        notif.save(update_fields=['is_read'])
        return Response({"detail": "Xabarnoma o'qildi deb belgilandi."}, status=status.HTTP_200_OK)
