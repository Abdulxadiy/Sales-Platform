from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response

from api.permissions import HasEmployeePermission
from apps.catalog.models import Product, ProductVariant
from apps.catalog.services import ProductService, ProductServiceError
from api.v1.catalog.serializers import (
    ProductOutputSerializer,
    ProductCreateSerializer,
    ProductUpdateSerializer,
    ProductVariantOutputSerializer,
    ProductVariantCreateSerializer,
    ProductVariantUpdateSerializer,
)
from ._base import CatalogAPIView


class ProductListCreateView(CatalogAPIView):
    """GET  /api/v1/catalog/products/
    POST /api/v1/catalog/products/ -- creates the Product AND its
    mandatory first ProductVariant in one call."""

    permission_classes = [HasEmployeePermission]
    permission_map = {"GET": "catalog.view_product", "POST": "catalog.add_product"}

    def get(self, request):
        products = Product.objects.filter(tenant=self.tenant, is_active=True).prefetch_related("variants")
        return Response(
            ProductOutputSerializer(products, many=True, context={"request": request}).data
        )

    def post(self, request):
        serializer = ProductCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            product = ProductService.create(tenant=self.tenant, **serializer.validated_data)
        except ProductServiceError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            ProductOutputSerializer(product, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class ProductDetailView(CatalogAPIView):
    """GET   /api/v1/catalog/products/{pk}/
    PATCH /api/v1/catalog/products/{pk}/ -- edits the Product's own
    fields only (name/category/image), never its variants."""

    permission_classes = [HasEmployeePermission]
    permission_map = {"GET": "catalog.view_product", "PATCH": "catalog.change_product"}

    def get(self, request, pk):
        product = get_object_or_404(
            Product.objects.prefetch_related("variants"), pk=pk, tenant=self.tenant
        )
        return Response(ProductOutputSerializer(product, context={"request": request}).data)

    def patch(self, request, pk):
        product = get_object_or_404(Product, pk=pk, tenant=self.tenant)
        serializer = ProductUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        category = serializer.validated_data.pop("category", None)
        if category is not None:
            if category.tenant_id != self.tenant.id:
                return Response(
                    {"detail": "category must belong to the same tenant."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            product.category = category
        for field, value in serializer.validated_data.items():
            setattr(product, field, value)
        product.save()

        return Response(ProductOutputSerializer(product, context={"request": request}).data)


class ProductArchiveView(CatalogAPIView):
    """POST /api/v1/catalog/products/{pk}/archive/ -- cascades to every
    variant of this product (see ProductService.archive())."""

    permission_classes = [HasEmployeePermission]
    required_permission = "catalog.archive_product"

    def post(self, request, pk):
        product = get_object_or_404(Product, pk=pk, tenant=self.tenant)
        product = ProductService.archive(product)
        return Response(ProductOutputSerializer(product, context={"request": request}).data)


class ProductVariantCreateView(CatalogAPIView):
    """POST /api/v1/catalog/products/{product_id}/variants/ -- adds an
    additional variant (e.g. a new size/colour) to an existing product.
    Gated on "change_product", per the consolidated permission model --
    a variant has no permission of its own (9-bosqich)."""

    permission_classes = [HasEmployeePermission]
    required_permission = "catalog.change_product"

    def post(self, request, product_id):
        product = get_object_or_404(Product, pk=product_id, tenant=self.tenant)
        serializer = ProductVariantCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            variant = ProductService.add_variant(product=product, **serializer.validated_data)
        except ProductServiceError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            ProductVariantOutputSerializer(variant, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class ProductVariantDetailView(CatalogAPIView):
    """PATCH /api/v1/catalog/variants/{pk}/ -- edits a single variant's
    own fields (price, code, barcode, unit, image, name). Also gated on
    "change_product" for the same reason as above."""

    permission_classes = [HasEmployeePermission]
    required_permission = "catalog.change_product"

    def patch(self, request, pk):
        variant = get_object_or_404(ProductVariant, pk=pk, tenant=self.tenant)
        serializer = ProductVariantUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        if "barcode" in data:
            # Never persist "" for "no barcode" -- see ProductVariant.barcode.
            data["barcode"] = data["barcode"] or None
        for field, value in data.items():
            setattr(variant, field, value)
        variant.save()

        return Response(ProductVariantOutputSerializer(variant, context={"request": request}).data)


class ProductVariantArchiveView(CatalogAPIView):
    """POST /api/v1/catalog/variants/{pk}/archive/ -- archives ONE
    variant without touching its Product or sibling variants (e.g.
    discontinuing just one colour). The reverse (Product -> all
    variants) is ProductService.archive(); this is the single-variant
    complement, not explicitly discussed in the roadmap but a direct,
    low-risk consequence of variants being independently sellable
    units."""

    permission_classes = [HasEmployeePermission]
    required_permission = "catalog.change_product"

    def post(self, request, pk):
        variant = get_object_or_404(ProductVariant, pk=pk, tenant=self.tenant)
        variant.is_active = False
        variant.save(update_fields=["is_active"])
        return Response(ProductVariantOutputSerializer(variant, context={"request": request}).data)