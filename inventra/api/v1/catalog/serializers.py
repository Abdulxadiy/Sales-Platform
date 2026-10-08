from decimal import Decimal
from rest_framework import serializers

from apps.catalog.models import Category, Product, ProductVariant, ProductImage


class CategoryOutputSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "kod", "parent", "currency", "is_active"]
        read_only_fields = fields


class CategoryCreateSerializer(serializers.Serializer):
    """Validates input for creating a Category. `kod` can be optionally
    provided by caller or system-assigned (see CategoryService.create())."""

    name = serializers.CharField(max_length=150)
    kod = serializers.CharField(max_length=20, required=False, allow_blank=True)
    parent_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source="parent", required=False, allow_null=True
    )
    currency = serializers.ChoiceField(
        choices=Category.CURRENCY_CHOICES, default=Category.CURRENCY_UZS, required=False
    )


class CategoryUpdateSerializer(serializers.Serializer):
    """Validates input for editing a Category. All fields optional."""

    name = serializers.CharField(max_length=150, required=False)
    kod = serializers.CharField(max_length=20, required=False)
    parent_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source="parent", required=False, allow_null=True
    )
    clear_parent = serializers.BooleanField(required=False, default=False)
    currency = serializers.ChoiceField(
        choices=Category.CURRENCY_CHOICES, required=False
    )


def _clean_media_url(url: str, request=None) -> str:
    if not url:
        return None
    res = request.build_absolute_uri(url) if request else url
    if res.startswith("http://nginx/") or res.startswith("http://inventra/"):
        return "/" + "/".join(res.split("/")[3:])
    return res


class ProductVariantOutputSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    currency = serializers.CharField(read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    category_id = serializers.IntegerField(source="product.category_id", read_only=True)
    category_name = serializers.CharField(source="product.category.name", read_only=True)
    stock_quantity = serializers.SerializerMethodField()
    price_recommended = serializers.SerializerMethodField()
    price_min = serializers.SerializerMethodField()
    price_partner = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = [
            "id", "product", "product_name", "category_id", "category_name",
            "name", "sku", "code", "barcode", "image", "unit",
            "currency", "price_partner", "price_min", "price_recommended",
            "stock_quantity", "is_active",
        ]
        read_only_fields = ["id", "product", "sku", "is_active", "currency", "stock_quantity"]

    def _get_branch_stock(self, obj):
        branch = self.context.get("branch")
        if not branch:
            request = self.context.get("request")
            if request and hasattr(request, "user") and request.user.is_authenticated:
                if hasattr(request.user, "employments"):
                    tenant = getattr(request, "tenant", None) or getattr(obj, "tenant", None)
                    emp = request.user.employments.filter(tenant=tenant, is_active=True).first() if tenant else None
                    if emp and emp.branch:
                        branch = emp.branch
        if branch:
            if hasattr(obj, "_prefetched_stocks"):
                for st in obj._prefetched_stocks:
                    if st.branch_id == branch.id:
                        return st
            return obj.stocks.filter(branch=branch).first()
        return getattr(obj, "stock", None)

    def get_stock_quantity(self, obj):
        st = self._get_branch_stock(obj)
        return str(st.quantity) if st else "0.000"

    def get_price_recommended(self, obj):
        st = self._get_branch_stock(obj)
        if st and st.custom_price_recommended is not None:
            return st.custom_price_recommended
        return obj.price_recommended

    def get_price_min(self, obj):
        st = self._get_branch_stock(obj)
        if st and st.custom_price_min is not None:
            return st.custom_price_min
        return obj.price_min

    def get_price_partner(self, obj):
        st = self._get_branch_stock(obj)
        if st and st.custom_price_partner is not None:
            return st.custom_price_partner
        return obj.price_partner

    def get_image(self, obj):
        image = obj.image or obj.product.image
        if not image:
            return None
        return _clean_media_url(image.url, self.context.get("request"))



class ProductVariantCreateSerializer(serializers.Serializer):
    """Validates input for adding a variant to an existing Product."""

    name = serializers.CharField(max_length=150)
    code = serializers.CharField(max_length=64, required=False, allow_blank=True)
    unit = serializers.ChoiceField(choices=ProductVariant.UNIT_CHOICES, default="dona")
    barcode = serializers.CharField(max_length=64, required=False, allow_null=True, allow_blank=True)
    image = serializers.ImageField(required=False, allow_null=True)
    price_partner = serializers.DecimalField(max_digits=12, decimal_places=2)
    price_min = serializers.DecimalField(max_digits=12, decimal_places=2)
    price_recommended = serializers.DecimalField(max_digits=12, decimal_places=2)


class ProductVariantUpdateSerializer(serializers.Serializer):
    """Validates input for editing an existing variant -- everything
    optional, a PATCH may touch any subset. `code` is included here on
    purpose: it's freely editable, including its price segment (see
    ProductVariant.code docstring -- it never auto-resyncs)."""

    name = serializers.CharField(max_length=150, required=False)
    code = serializers.CharField(max_length=64, required=False, allow_blank=True)
    unit = serializers.ChoiceField(choices=ProductVariant.UNIT_CHOICES, required=False)
    barcode = serializers.CharField(max_length=64, required=False, allow_null=True, allow_blank=True)
    image = serializers.ImageField(required=False, allow_null=True)
    price_partner = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    price_min = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    price_recommended = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)


class ProductImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ["id", "image", "image_url", "order", "created_at"]
        read_only_fields = ["id", "image_url", "created_at"]

    def get_image_url(self, obj):
        if not obj.image:
            return None
        return _clean_media_url(obj.image.url, self.context.get("request"))


class ProductOutputSerializer(serializers.ModelSerializer):
    variants = ProductVariantOutputSerializer(many=True, read_only=True)
    gallery_images = ProductImageSerializer(many=True, read_only=True)
    image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ["id", "name", "category", "image", "gallery_images", "is_active", "variants"]
        read_only_fields = ["id", "is_active", "variants", "gallery_images"]

    def get_image(self, obj):
        if not obj.image:
            return None
        return _clean_media_url(obj.image.url, self.context.get("request"))


class ProductCreateSerializer(serializers.Serializer):
    """Validates input for creating a Product together with its
    mandatory first ProductVariant (see ProductService.create())."""

    name = serializers.CharField(max_length=200)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source="category"
    )
    image = serializers.ImageField(required=False, allow_null=True)
    unit = serializers.ChoiceField(choices=ProductVariant.UNIT_CHOICES, default="dona")
    variant_name = serializers.CharField(max_length=150, required=False, default="Standart")
    code = serializers.CharField(max_length=64, required=False, allow_blank=True)
    barcode = serializers.CharField(max_length=64, required=False, allow_blank=True, allow_null=True)
    price_partner = serializers.DecimalField(max_digits=12, decimal_places=2)
    price_min = serializers.DecimalField(max_digits=12, decimal_places=2)
    price_recommended = serializers.DecimalField(max_digits=12, decimal_places=2)

    # Optional immediate stock intake fields
    initial_quantity = serializers.DecimalField(
        max_digits=14, decimal_places=3, required=False, allow_null=True, min_value=Decimal("0.001")
    )
    initial_cost_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, allow_null=True, min_value=Decimal("0")
    )
    supplier = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    intake_note = serializers.CharField(required=False, allow_blank=True, default="")


class ProductUpdateSerializer(serializers.Serializer):
    """Validates input for editing a Product and optionally its variant fields."""

    name = serializers.CharField(max_length=200, required=False)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source="category", required=False
    )
    image = serializers.ImageField(required=False, allow_null=True)

    # Optional variant convenience fields
    variant_id = serializers.IntegerField(required=False)
    unit = serializers.ChoiceField(choices=ProductVariant.UNIT_CHOICES, required=False)
    code = serializers.CharField(max_length=64, required=False, allow_blank=True)
    barcode = serializers.CharField(max_length=64, required=False, allow_null=True, allow_blank=True)
    price_partner = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    price_min = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    price_recommended = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
