from decimal import Decimal
from django.db.models import Q
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
    ProductImageSerializer,
)
from ._base import CatalogAPIView


class ProductListCreateView(CatalogAPIView):
    """GET  /api/v1/catalog/products/
    POST /api/v1/catalog/products/ -- creates the Product AND its
    mandatory first ProductVariant in one call."""

    permission_classes = [HasEmployeePermission]
    permission_map = {"GET": "catalog.view_product", "POST": "catalog.add_product"}

    def get(self, request):
        qs = (
            Product.objects.filter(tenant=self.tenant, is_active=True)
            .select_related("category")
            .prefetch_related("variants", "gallery_images")
        )
        search = request.query_params.get("search")
        if search:
            search = search.strip()
            qs = qs.filter(
                Q(name__icontains=search)
                | Q(variants__name__icontains=search)
                | Q(variants__sku__icontains=search)
                | Q(variants__barcode__icontains=search)
            ).distinct()

        category_id = request.query_params.get("category")
        if category_id:
            qs = qs.filter(category_id=category_id)

        return Response(
            ProductOutputSerializer(qs, many=True, context={"request": request}).data
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

        price_fields = ("price_partner", "price_min", "price_recommended")
        old_prices = {f: getattr(variant, f) for f in price_fields}

        for field, value in data.items():
            setattr(variant, field, value)
        variant.save()

        price_changes = {}
        for f in price_fields:
            if f in data and old_prices[f] != getattr(variant, f):
                price_changes[f] = {"old": str(old_prices[f]), "new": str(getattr(variant, f))}

        if price_changes:
            from apps.core.models import AuditAction
            from apps.core.services.audit_service import AuditService
            AuditService.log(
                action=AuditAction.PRICE_CHANGE,
                actor=request.user,
                tenant=self.tenant,
                target_model="ProductVariant",
                target_id=str(variant.id),
                changes=price_changes,
                description=f"Prices changed for variant '{variant.name}'",
                request=request,
            )

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


class ProductImageUploadView(CatalogAPIView):
    """POST /api/v1/catalog/products/{pk}/images/ -- uploads an image (up to 3 max)."""
    permission_classes = [HasEmployeePermission]
    required_permission = "catalog.change_product"

    def post(self, request, pk):
        product = get_object_or_404(Product, pk=pk, tenant=self.tenant)
        image_file = request.FILES.get("image")
        if not image_file:
            return Response(
                {"error": {"code": "image_required", "message": "'image' fayli talab qilinadi."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            order = int(request.data.get("order", 0))
        except (ValueError, TypeError):
            order = 0

        try:
            prod_image = ProductService.add_image(product=product, image_file=image_file, order=order)
            return Response(ProductImageSerializer(prod_image, context={"request": request}).data, status=status.HTTP_201_CREATED)
        except Exception as exc:
            return Response(
                {"error": {"code": "image_error", "message": str(exc)}},
                status=status.HTTP_400_BAD_REQUEST,
            )


class ProductImageDeleteView(CatalogAPIView):
    """DELETE /api/v1/catalog/products/{pk}/images/{image_id}/ -- deletes a gallery image."""
    permission_classes = [HasEmployeePermission]
    required_permission = "catalog.change_product"

    def delete(self, request, pk, image_id):
        product = get_object_or_404(Product, pk=pk, tenant=self.tenant)
        try:
            ProductService.remove_image(product=product, image_id=image_id)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ProductServiceError as exc:
            return Response(
                {"error": {"code": "not_found", "message": str(exc)}},
                status=status.HTTP_404_NOT_FOUND,
            )

class ProductVariantListView(CatalogAPIView):
    """
    GET /api/v1/catalog/variants/
    POS va savdo uchun tovar variantlarini qidirish va filterlash.
    Filtrlar:
      - search: nomi, mahsulot nomi, sku, code, barcode bo'yicha qidiruv
      - barcode: shtrix-kod bo'yicha aniq qidiruv
      - sku: SKU bo'yicha qidiruv
      - category: kategoriya ID si
      - currency: UZS / USD
      - min_price, max_price: narxlar oralig'i (price_min bo'yicha)
      - in_stock: true bo'lsa faqat omborda mavjud tovarlar (quantity > 0)
    """
    permission_classes = [HasEmployeePermission]
    required_permission = "catalog.view_product"

    def get(self, request):
        qs = (
            ProductVariant.objects.filter(
                tenant=self.tenant, is_active=True, product__is_active=True
            )
            .select_related("product", "product__category", "stock")
        )

        search = request.query_params.get("search")
        if search:
            search = search.strip()
            qs = qs.filter(
                Q(name__icontains=search)
                | Q(product__name__icontains=search)
                | Q(sku__icontains=search)
                | Q(code__icontains=search)
                | Q(barcode__icontains=search)
            )

        barcode = request.query_params.get("barcode")
        if barcode:
            qs = qs.filter(barcode=barcode.strip())

        sku = request.query_params.get("sku")
        if sku:
            qs = qs.filter(sku__iexact=sku.strip())

        category_id = request.query_params.get("category")
        if category_id:
            qs = qs.filter(product__category_id=category_id)

        currency = request.query_params.get("currency")
        if currency:
            qs = qs.filter(product__category__currency=currency.upper())

        min_price = request.query_params.get("min_price")
        if min_price:
            try:
                qs = qs.filter(price_min__gte=Decimal(min_price))
            except Exception:
                pass

        max_price = request.query_params.get("max_price")
        if max_price:
            try:
                qs = qs.filter(price_min__lte=Decimal(max_price))
            except Exception:
                pass

        in_stock = request.query_params.get("in_stock")
        if in_stock and in_stock.lower() in ("true", "1"):
            qs = qs.filter(stock__quantity__gt=Decimal("0.000"))

        return Response(
            ProductVariantOutputSerializer(qs, many=True, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )
