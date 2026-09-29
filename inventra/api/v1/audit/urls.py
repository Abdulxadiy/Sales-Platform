from django.urls import path
from api.v1.audit.views import AuditLogListView

urlpatterns = [
    path("logs/", AuditLogListView.as_view(), name="audit-log-list"),
]
