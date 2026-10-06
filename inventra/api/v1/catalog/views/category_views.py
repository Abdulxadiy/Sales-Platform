from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response

from api.permissions import HasEmployeePermission
from apps.catalog.models import Category
from apps.catalog.services import CategoryService, CategoryServiceError
from api.v1.catalog.serializers import (
    CategoryOutputSerializer,
    CategoryCreateSerializer,
    CategoryUpdateSerializer,
)
from ._base import CatalogAPIView


class CategoryListCreateView(CatalogAPIView):
    """GET  /api/v1/catalog/categories/
    POST /api/v1/catalog/categories/"""

    permission_classes = [HasEmployeePermission]
    permission_map = {"GET": "catalog.view_category", "POST": "catalog.add_category"}

    def get(self, request):
        categories = Category.objects.filter(tenant=self.tenant, is_active=True)
        search = request.query_params.get("search")
        if search:
            s = search.strip()
            categories = categories.filter(Q(name__icontains=s) | Q(kod__icontains=s))
        currency = request.query_params.get("currency")
        if currency:
            categories = categories.filter(currency=currency.upper())
        parent = request.query_params.get("parent")
        if parent == "null" or parent == "none" or parent == "0":
            categories = categories.filter(parent__isnull=True)
        elif parent:
            categories = categories.filter(parent_id=parent)
        return Response(CategoryOutputSerializer(categories, many=True).data)

    def post(self, request):
        serializer = CategoryCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            category = CategoryService.create(tenant=self.tenant, **serializer.validated_data)
        except CategoryServiceError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(CategoryOutputSerializer(category).data, status=status.HTTP_201_CREATED)


class CategoryDetailView(CatalogAPIView):
    """GET   /api/v1/catalog/categories/{pk}/
    PATCH /api/v1/catalog/categories/{pk}/"""

    permission_classes = [HasEmployeePermission]
    permission_map = {
        "GET": "catalog.view_category",
        "PATCH": "catalog.change_category",
        "DELETE": "catalog.archive_category",
    }

    def get(self, request, pk):
        # Filtering by tenant here does double duty: a category that
        # exists but belongs to a different tenant 404s exactly the
        # same way as one that doesn't exist at all -- no cross-tenant
        # existence leak.
        category = get_object_or_404(Category, pk=pk, tenant=self.tenant)
        return Response(CategoryOutputSerializer(category).data)

    def patch(self, request, pk):
        category = get_object_or_404(Category, pk=pk, tenant=self.tenant)
        serializer = CategoryUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        try:
            category = CategoryService.update(category, **serializer.validated_data)
        except CategoryServiceError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(CategoryOutputSerializer(category).data)

    def delete(self, request, pk):
        category = get_object_or_404(Category, pk=pk, tenant=self.tenant)
        try:
            CategoryService.delete(category)
        except CategoryServiceError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CategoryArchiveView(CatalogAPIView):
    """POST /api/v1/catalog/categories/{pk}/archive/"""

    permission_classes = [HasEmployeePermission]
    required_permission = "catalog.archive_category"

    def post(self, request, pk):
        category = get_object_or_404(Category, pk=pk, tenant=self.tenant)
        category = CategoryService.archive(category)
        return Response(CategoryOutputSerializer(category).data)
