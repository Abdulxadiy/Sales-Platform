from django.shortcuts import get_object_or_404
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.mixins import TenantContextMixin
from api.v1.sales.serializers import NotificationOutputSerializer
from apps.sales.models import Notification


class NotificationListView(TenantContextMixin, APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses={200: NotificationOutputSerializer(many=True)})
    def get(self, request):
        if request.user.role == 'platform_admin':
            qs = Notification.objects.filter(recipient=request.user)
        else:
            if not self.tenant:
                return Response([])
            qs = Notification.objects.filter(tenant=self.tenant, recipient=request.user)
        return Response(NotificationOutputSerializer(qs, many=True).data)

    @extend_schema(request=None, responses={204: None})
    def delete(self, request):
        """Clear all notifications for the current user."""
        if request.user.role == 'platform_admin':
            Notification.objects.filter(recipient=request.user).delete()
        else:
            if not self.tenant:
                return Response(status=status.HTTP_204_NO_CONTENT)
            Notification.objects.filter(tenant=self.tenant, recipient=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class NotificationDetailView(TenantContextMixin, APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses={204: None})
    def delete(self, request, pk):
        """Delete an individual notification."""
        if request.user.role == 'platform_admin':
            notif = get_object_or_404(Notification, pk=pk, recipient=request.user)
        else:
            if not self.tenant:
                return Response({"detail": "Do'kon topilmadi."}, status=status.HTTP_403_FORBIDDEN)
            notif = get_object_or_404(Notification, pk=pk, tenant=self.tenant, recipient=request.user)
        notif.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class NotificationReadView(TenantContextMixin, APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=OpenApiTypes.OBJECT, responses={200: OpenApiTypes.OBJECT})
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
