from decimal import Decimal
from rest_framework import serializers
from apps.catalog.models import ProductVariant


class ShopProductVariantSerializer(serializers.ModelSerializer):
    product_id = serializers.IntegerField(source="product.id", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    category_id = serializers.IntegerField(source="product.category_id", read_only=True)
    category_name = serializers.CharField(source="product.category.name", read_only=True)
    price = serializers.DecimalField(source="price_recommended", max_digits=12, decimal_places=2, read_only=True)
    stock_quantity = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    gallery_images = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = [
            "id",
            "product_id",
            "product_name",
            "category_id",
            "category_name",
            "name",
            "sku",
            "barcode",
            "price",
            "currency",
            "stock_quantity",
            "image_url",
            "gallery_images",
            "is_active",
        ]
        read_only_fields = fields

    def get_stock_quantity(self, obj):
        stock = getattr(obj, "stock", None)
        return str(stock.quantity) if stock else "0.000"

    def get_image_url(self, obj):
        image = obj.image or obj.product.image
        if not image:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(image.url) if request else image.url

    def get_gallery_images(self, obj):
        request = self.context.get("request")
        urls = []
        for g in obj.product.gallery_images.all():
            if g.image:
                urls.append(request.build_absolute_uri(g.image.url) if request else g.image.url)
        return urls


class ShopOrderItemSerializer(serializers.Serializer):
    product_variant_id = serializers.IntegerField()
    quantity = serializers.DecimalField(max_digits=14, decimal_places=3, min_value=Decimal("0.001"))
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.00"))


class ShopOrderDeductSerializer(serializers.Serializer):
    order_id = serializers.CharField(max_length=64)
    customer_phone = serializers.CharField(max_length=20)
    customer_name = serializers.CharField(max_length=150, required=False, default="")
    payment_type = serializers.ChoiceField(choices=["card", "cash"], default="card")
    items = serializers.ListField(
        child=ShopOrderItemSerializer(),
        allow_empty=False,
    )
