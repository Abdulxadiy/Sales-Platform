from decimal import Decimal
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError

from api.permissions import IsInternalService
from apps.tenants.models import Tenant
from apps.catalog.models import ProductVariant
from apps.sales.models import Counterparty
from apps.sales.services import SaleService, SaleServiceError
from apps.inventory.services import StockServiceError
from api.v1.internal.shop.serializers import (
    ShopProductVariantSerializer,
    ShopOrderDeductSerializer,
)


class ShopTenantProductsView(APIView):
    """
    Shop mikroservisi uchun: bitta do'konning barcha faol tovar variantlari va narxlarini olish.
    """
    authentication_classes = []
    permission_classes = [IsInternalService]

    def get(self, request, tenant_id):
        tenant = get_object_or_404(Tenant, pk=tenant_id, is_active=True)
        variants = (
            ProductVariant.objects.filter(
                tenant=tenant,
                is_active=True,
                product__is_active=True,
            )
            .select_related("product", "product__category")
            .prefetch_related("stocks", "product__gallery_images")
        )

        in_stock_only = request.query_params.get("in_stock", "false").lower() in ("true", "1")
        if in_stock_only:
            variants = variants.filter(stocks__quantity__gt=Decimal("0.000"))

        serializer = ShopProductVariantSerializer(variants, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class ShopTenantProductDetailView(APIView):
    """
    Shop mikroservisi uchun: bitta tovar variantining jonli narxi va ombordagi qoldig'i.
    """
    authentication_classes = []
    permission_classes = [IsInternalService]

    def get(self, request, tenant_id, variant_id):
        tenant = get_object_or_404(Tenant, pk=tenant_id, is_active=True)
        variant = get_object_or_404(
            ProductVariant.objects.select_related("product", "product__category").prefetch_related("stocks", "product__gallery_images"),
            pk=variant_id,
            tenant=tenant,
            is_active=True,
            product__is_active=True,
        )
        serializer = ShopProductVariantSerializer(variant, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class ShopOrderDeductView(APIView):
    """
    Shop mikroservisi uchun: onlayn buyurtma tasdiqlanganda Inventra omboridan tovarlarni chiqarish va sotuv sifatida qayd etish.
    """
    authentication_classes = []
    permission_classes = [IsInternalService]

    def post(self, request, tenant_id):
        tenant = get_object_or_404(Tenant, pk=tenant_id, is_active=True)
        serializer = ShopOrderDeductSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        customer_phone = data["customer_phone"].strip()
        customer_name = data.get("customer_name", "").strip() or f"Mijoz ({customer_phone})"

        # Find or create counterparty for this customer in tenant
        cp, _ = Counterparty.objects.get_or_create(
            tenant=tenant,
            phone_number=customer_phone,
            defaults={"name": customer_name},
        )

        # Prepare items for SaleService
        sale_items = []
        for it in data["items"]:
            sale_items.append({
                "product_variant_id": it["product_variant_id"],
                "quantity": it["quantity"],
                "unit_price": it["unit_price"],
            })

        idempotency = f"SHOP-ORDER-{data['order_id']}"

        try:
            sales = SaleService.create_sale(
                tenant=tenant,
                user=tenant.owner,
                items_data=sale_items,
                payment_type=data.get("payment_type", "card"),
                counterparty=cp,
                idempotency_key=idempotency,
            )
            created_sale = sales[0] if sales else None
            return Response(
                {
                    "status": "success",
                    "order_id": data["order_id"],
                    "sale_id": created_sale.id if created_sale else None,
                    "receipt_number": created_sale.receipt_number if created_sale else None,
                },
                status=status.HTTP_201_CREATED,
            )
        except (SaleServiceError, StockServiceError) as exc:
            return Response(
                {
                    "error": {
                        "code": "order_deduct_failed",
                        "message": str(exc),
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
