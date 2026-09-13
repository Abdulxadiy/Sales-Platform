from rest_framework import serializers

from apps.catalog.models import Category, Product, ProductVariant


class CategoryOutputSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "kod", "parent", "is_active"]
        read_only_fields = fields


class CategoryCreateSerializer(serializers.Serializer):
    """Validates input for creating a Category. `kod` is never accepted
    here -- it's always system-assigned (see CategoryService.create())."""

    name = serializers.CharField(max_length=150)
    parent_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source="parent", required=False, allow_null=True
    )


class CategoryUpdateSerializer(serializers.Serializer):
    """Validates input for editing a Category. Both fields optional --
    a PATCH may touch either or both."""

    name = serializers.CharField(max_length=150, required=False)
    kod = serializers.CharField(max_length=20, required=False)


class ProductVariantOutputSerializer(serializers.ModelSerializer):
    # Falls back to the parent Product's image when this variant has
    # none of its own -- see ProductVariant.image docstring.
    image = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = [
            "id", "product", "name", "sku", "code", "barcode", "image", "unit",
            "price_partner", "price_min", "price_recommended", "is_active",
        ]
        read_only_fields = ["id", "product", "sku", "is_active"]

    def get_image(self, obj):
        image = obj.image or obj.product.image
        if not image:
            return None
        request = self.context.get("request")
        url = image.url
        return request.build_absolute_uri(url) if request else url


class ProductVariantCreateSerializer(serializers.Serializer):
    """Validates input for adding a variant to an existing Product."""

    name = serializers.CharField(max_length=150)
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


class ProductOutputSerializer(serializers.ModelSerializer):
    variants = ProductVariantOutputSerializer(many=True, read_only=True)
    image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ["id", "name", "category", "image", "is_active", "variants"]
        read_only_fields = ["id", "is_active", "variants"]

    def get_image(self, obj):
        if not obj.image:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.image.url) if request else obj.image.url


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
    price_partner = serializers.DecimalField(max_digits=12, decimal_places=2)
    price_min = serializers.DecimalField(max_digits=12, decimal_places=2)
    price_recommended = serializers.DecimalField(max_digits=12, decimal_places=2)


class ProductUpdateSerializer(serializers.Serializer):
    """Validates input for editing a Product's own fields (not its
    variants -- see ProductVariantUpdateSerializer for those)."""

    name = serializers.CharField(max_length=200, required=False)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source="category", required=False
    )
    image = serializers.ImageField(required=False, allow_null=True)