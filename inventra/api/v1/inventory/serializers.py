from decimal import Decimal

from rest_framework import serializers

from apps.catalog.models import ProductVariant
from apps.inventory.models import Stock, StockMovement


class StockOutputSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stock
        fields = ["id", "product_variant", "quantity", "last_cost_price"]
        read_only_fields = fields


class StockMovementOutputSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model = StockMovement
        fields = [
            "id", "product_variant", "type", "direction", "quantity",
            "cost_price", "note", "created_by", "created_by_name", "created_at",
        ]
        read_only_fields = fields


class _BaseMovementInputSerializer(serializers.Serializer):
    """Base validator for stock movements enforcing tenant isolation.

    Ensures that the incoming product_variant strictly belongs to the acting
    tenant passed in the serializer context.
    """

    product_variant_id = serializers.PrimaryKeyRelatedField(
        queryset=ProductVariant.objects.all(), source="product_variant"
    )

    def validate_product_variant_id(self, value):
        """Validate that the variant belongs to the acting tenant."""
        tenant = self.context.get("tenant")
        if tenant and value.tenant_id != tenant.id:
            raise serializers.ValidationError(
                "Product variant does not belong to your tenant."
            )
        return value


class IntakeCreateSerializer(_BaseMovementInputSerializer):
    """POST body for StockService.intake() -- the only movement type
    that requires cost_price."""

    quantity = serializers.DecimalField(max_digits=14, decimal_places=3, min_value=Decimal("0.001"))
    cost_price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0"))
    note = serializers.CharField(required=False, allow_blank=True, default="")


class SimpleMovementCreateSerializer(_BaseMovementInputSerializer):
    """POST body shared by customer_return / supplier_return / write_off
    -- no cost_price, direction is fixed by the endpoint itself."""

    quantity = serializers.DecimalField(max_digits=14, decimal_places=3, min_value=Decimal("0.001"))
    note = serializers.CharField(required=False, allow_blank=True, default="")


class AdjustCreateSerializer(_BaseMovementInputSerializer):
    """POST body for StockService.adjust() -- the one type where the
    caller must say which way the correction goes."""

    quantity = serializers.DecimalField(max_digits=14, decimal_places=3, min_value=Decimal("0.001"))
    direction = serializers.ChoiceField(choices=StockMovement.DIRECTION_CHOICES)
    note = serializers.CharField(required=False, allow_blank=True, default="")

