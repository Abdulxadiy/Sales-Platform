from django.urls import path

from .views import ActorGrantView, DeviceEnrollView, DeviceRevokeView, PushView, SnapshotView

urlpatterns = [
    path("devices/", DeviceEnrollView.as_view()),
    path("actors/", ActorGrantView.as_view()),
    path("devices/<uuid:device_id>/revoke/", DeviceRevokeView.as_view()),
    path("snapshot/", SnapshotView.as_view()),
    path("push/", PushView.as_view()),
]
