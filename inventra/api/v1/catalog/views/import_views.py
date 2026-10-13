from django.db import IntegrityError
from django.shortcuts import get_object_or_404
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from api.permissions import HasEmployeePermission
from apps.catalog.models.import_model import CatalogImportJob
from apps.catalog.services import CategoryServiceError, ProductServiceError
from apps.catalog.services.import_service import TEMPLATE_HEADERS, CatalogImportService
from apps.core.spreadsheets import XLSX_MIME, excel_response
from apps.inventory.services import StockServiceError

from ._base import CatalogAPIView


class ImportFileSerializer(serializers.Serializer):
    file = serializers.FileField()


class ImportJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = CatalogImportJob
        fields = ["id", "rows", "expires_at", "completed_at", "result"]
        read_only_fields = fields


class CatalogImportTemplateView(CatalogAPIView):
    permission_classes = [HasEmployeePermission]
    required_permission = "catalog.add_product"

    @extend_schema(responses={(200, XLSX_MIME): OpenApiTypes.BINARY})
    def get(self, request):
        return excel_response(TEMPLATE_HEADERS, [], "inventra-import-template.xlsx", "Katalog")


class CatalogImportPreviewView(CatalogAPIView):
    permission_classes = [HasEmployeePermission]
    required_permission = "catalog.add_product"
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(request=ImportFileSerializer, responses={201: ImportJobSerializer})
    def post(self, request):
        serializer = ImportFileSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        job = CatalogImportService.preview(
            upload=serializer.validated_data["file"], tenant=self.tenant, user=request.user
        )
        return Response(ImportJobSerializer(job).data, status=201)


class CatalogImportCommitView(CatalogAPIView):
    permission_classes = [HasEmployeePermission]
    required_permission = "catalog.add_product"

    @extend_schema(request=None, responses={200: OpenApiTypes.OBJECT})
    def post(self, request, job_id):
        get_object_or_404(CatalogImportJob, pk=job_id, tenant=self.tenant, created_by=request.user)
        try:
            result = CatalogImportService.commit(job_id=job_id, tenant=self.tenant, user=request.user, request=request)
        except (ProductServiceError, CategoryServiceError, StockServiceError, IntegrityError) as exc:
            return Response(
                {
                    "detail": "Import saqlanmadi. Faylni qayta tekshiring.",
                    "reason": str(exc) if not isinstance(exc, IntegrityError) else "Takror ma’lumot.",
                },
                status=400,
            )
        return Response(result)
