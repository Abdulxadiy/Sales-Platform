from decimal import Decimal
from rest_framework import serializers

from apps.catalog.models import ProductVariant
from apps.inventory.models import Stock, StockMovement, StockTransfer, StockTransferItem


class StockOutputSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product_variant.product.name", read_only=True)
    variant_name = serializers.CharField(source="product_variant.name", read_only=True)
    sku = serializers.CharField(source="product_variant.sku", read_only=True)
    code = serializers.CharField(source="product_variant.code", read_only=True)
    barcode = serializers.CharField(source="product_variant.barcode", read_only=True)
    category_id = serializers.IntegerField(source="product_variant.product.category_id", read_only=True)
    category_name = serializers.CharField(source="product_variant.product.category.name", read_only=True)
    unit = serializers.CharField(source="product_variant.unit", read_only=True)
    currency = serializers.CharField(source="product_variant.currency", read_only=True)
    branch_name = serializers.CharField(source="branch.name", read_only=True, default="")

    base_price_recommended = serializers.DecimalField(source="product_variant.price_recommended", max_digits=12, decimal_places=2, read_only=True)
    base_price_min = serializers.DecimalField(source="product_variant.price_min", max_digits=12, decimal_places=2, read_only=True)
    base_price_partner = serializers.DecimalField(source="product_variant.price_partner", max_digits=12, decimal_places=2, read_only=True)

    effective_price_recommended = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    effective_price_min = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    effective_price_partner = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Stock
        fields = [
            "id", "branch", "branch_name", "product_variant", "quantity", "last_cost_price",
            "custom_price_recommended", "custom_price_min", "custom_price_partner",
            "base_price_recommended", "base_price_min", "base_price_partner",
            "effective_price_recommended", "effective_price_min", "effective_price_partner",
            "product_name", "variant_name", "sku", "code", "barcode",
            "category_id", "category_name", "unit", "currency",
        ]
        read_only_fields = fields


class StockPriceUpdateSerializer(serializers.Serializer):
    branch_id = serializers.IntegerField(required=False, allow_null=True)
    custom_price_recommended = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    custom_price_min = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    custom_price_partner = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)


class StockMovementOutputSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.username", read_only=True)
    product_name = serializers.CharField(source="product_variant.product.name", read_only=True)
    variant_name = serializers.CharField(source="product_variant.name", read_only=True)
    code = serializers.CharField(source="product_variant.code", read_only=True)
    unit = serializers.CharField(source="product_variant.unit", read_only=True)
    currency = serializers.CharField(source="product_variant.currency", read_only=True)
    branch_name = serializers.CharField(source="branch.name", read_only=True, default="")
    transfer_number = serializers.CharField(source="transfer.transfer_number", read_only=True, default=None)

    class Meta:
        model = StockMovement
        fields = [
            "id", "branch", "branch_name", "transfer", "transfer_number",
            "product_variant", "product_name", "variant_name", "code", "unit", "currency",
            "type", "direction", "quantity", "cost_price", "note", "created_by", "created_by_name", "created_at",
        ]
        read_only_fields = fields


class _BaseMovementInputSerializer(serializers.Serializer):
    product_variant_id = serializers.PrimaryKeyRelatedField(
        queryset=ProductVariant.objects.all(), source="product_variant"
    )
    branch_id = serializers.IntegerField(required=False, allow_null=True)

    def validate_product_variant_id(self, value):
        tenant = self.context.get("tenant")
        if tenant and value.tenant_id != tenant.id:
            raise serializers.ValidationError(
                "Product variant does not belong to your tenant."
            )
        return value


class IntakeCreateSerializer(_BaseMovementInputSerializer):
    quantity = serializers.DecimalField(max_digits=14, decimal_places=3, min_value=Decimal("0.001"))
    cost_price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0"))
    note = serializers.CharField(required=False, allow_blank=True, default="")


class BatchIntakeItemInputSerializer(serializers.Serializer):
    product_variant_id = serializers.PrimaryKeyRelatedField(
        queryset=ProductVariant.objects.all(), source="product_variant"
    )
    quantity = serializers.DecimalField(max_digits=14, decimal_places=3, min_value=Decimal("0.001"))
    cost_price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0"))
    note = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_product_variant_id(self, value):
        tenant = self.context.get("tenant")
        if tenant and value.tenant_id != tenant.id:
            raise serializers.ValidationError("Tovar ushbu do'konga tegishli emas.")
        return value


class BatchIntakeCreateSerializer(serializers.Serializer):
    branch_id = serializers.IntegerField(required=False, allow_null=True)
    items = BatchIntakeItemInputSerializer(many=True)
    supplier = serializers.CharField(required=False, allow_blank=True, default="")
    faktura_number = serializers.CharField(required=False, allow_blank=True, default="")
    note = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("Kamida bitta tovar kiritilishi shart.")
        if len(value) > 100:
            raise serializers.ValidationError("Bitta partiyada ko'pi bilan 100 ta tovar bo'lishi mumkin.")
        return value


class SimpleMovementCreateSerializer(_BaseMovementInputSerializer):
    quantity = serializers.DecimalField(max_digits=14, decimal_places=3, min_value=Decimal("0.001"))
    note = serializers.CharField(required=False, allow_blank=True, default="")


class AdjustCreateSerializer(_BaseMovementInputSerializer):
    quantity = serializers.DecimalField(max_digits=14, decimal_places=3, min_value=Decimal("0.001"))
    direction = serializers.ChoiceField(choices=StockMovement.DIRECTION_CHOICES)
    note = serializers.CharField(required=False, allow_blank=True, default="")


class StockTransferItemOutputSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product_variant.product.name", read_only=True)
    variant_name = serializers.CharField(source="product_variant.name", read_only=True)
    code = serializers.CharField(source="product_variant.code", read_only=True)
    sku = serializers.CharField(source="product_variant.sku", read_only=True)
    unit = serializers.CharField(source="product_variant.unit", read_only=True)

    class Meta:
        model = StockTransferItem
        fields = [
            "id", "product_variant", "product_name", "variant_name",
            "code", "sku", "unit", "quantity",
        ]
        read_only_fields = fields


class StockTransferOutputSerializer(serializers.ModelSerializer):
    from_branch_name = serializers.CharField(source="from_branch.name", read_only=True)
    to_branch_name = serializers.CharField(source="to_branch.name", read_only=True)
    sent_by_name = serializers.CharField(source="sent_by.username", read_only=True)
    resolved_by_name = serializers.CharField(source="resolved_by.username", read_only=True, default=None)
    items = StockTransferItemOutputSerializer(many=True, read_only=True)

    class Meta:
        model = StockTransfer
        fields = [
            "id", "transfer_number", "from_branch", "from_branch_name",
            "to_branch", "to_branch_name", "status", "sent_by",
            "sent_by_name", "sent_at", "resolved_by", "resolved_by_name",
            "resolved_at", "note", "reject_reason", "items", "created_at",
        ]
        read_only_fields = fields


class StockTransferItemInputSerializer(serializers.Serializer):
    product_variant_id = serializers.IntegerField()
    quantity = serializers.DecimalField(max_digits=14, decimal_places=3, min_value=Decimal("0.001"))


class StockTransferCreateSerializer(serializers.Serializer):
    from_branch_id = serializers.IntegerField()
    to_branch_id = serializers.IntegerField()
    items = StockTransferItemInputSerializer(many=True)
    note = serializers.CharField(required=False, allow_blank=True, default="")
    auto_accept = serializers.BooleanField(required=False, default=False)
