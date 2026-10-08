from rest_framework import serializers
from decimal import Decimal
from apps.sales.models import (
    Counterparty,
    DebtPayment,
    Sale,
    SaleItem,
    SaleVoidLog,
    Notification,
)


class CounterpartyOutputSerializer(serializers.ModelSerializer):
    target_tenant_name = serializers.CharField(source='target_tenant.name', read_only=True)

    class Meta:
        model = Counterparty
        fields = [
            'id', 'name', 'phone_number', 'target_tenant', 'target_tenant_name',
            'debt_balance_uzs', 'debt_balance_usd', 'note', 'is_active', 'created_at',
        ]
        read_only_fields = fields


class CounterpartyCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    phone_number = serializers.CharField(max_length=20)
    note = serializers.CharField(required=False, allow_blank=True, default='')


class CounterpartyUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150, required=False)
    note = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)


class DebtPaymentOutputSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source='recorded_by.get_full_name', read_only=True)

    class Meta:
        model = DebtPayment
        fields = [
            'id', 'counterparty', 'amount', 'currency', 'paid_at',
            'recorded_by', 'recorded_by_name', 'is_correction', 'note',
        ]
        read_only_fields = fields


class DebtPaymentCreateSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal('0.01'))
    currency = serializers.ChoiceField(choices=['UZS', 'USD'])
    note = serializers.CharField(required=False, allow_blank=True, default='')


class DebtPaymentCorrectionSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    currency = serializers.ChoiceField(choices=['UZS', 'USD'])
    note = serializers.CharField(required=True, allow_blank=False)


class SaleItemOutputSerializer(serializers.ModelSerializer):
    product_variant_name = serializers.CharField(source='product_variant.name', read_only=True)
    product_name = serializers.CharField(source='product_variant.product.name', read_only=True)
    product_code = serializers.CharField(source='product_variant.code', read_only=True)
    product_sku = serializers.CharField(source='product_variant.sku', read_only=True)
    unit = serializers.CharField(source='product_variant.unit', read_only=True)

    class Meta:
        model = SaleItem
        fields = [
            'id', 'product_variant', 'product_name', 'product_variant_name',
            'product_code', 'product_sku', 'unit',
            'quantity', 'unit_price', 'cost_price', 'original_partner_price',
            'total_price', 'status', 'voided_quantity', 'b2b_accepted_quantity',
            'b2b_rejected_quantity',
        ]
        read_only_fields = fields


class SaleOutputSerializer(serializers.ModelSerializer):
    sold_by_name = serializers.CharField(source='sold_by.get_full_name', read_only=True)
    counterparty_name = serializers.CharField(source='counterparty.name', read_only=True)
    counterparty_phone = serializers.CharField(source='counterparty.phone_number', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    branch_address = serializers.CharField(source='branch.address', read_only=True)
    branch_phone = serializers.CharField(source='branch.phone_number', read_only=True)
    b2b_target_tenant_name = serializers.CharField(source='b2b_target_tenant.name', read_only=True)
    items = SaleItemOutputSerializer(many=True, read_only=True)

    class Meta:
        model = Sale
        fields = [
            'id', 'receipt_number', 'branch', 'branch_name', 'branch_address', 'branch_phone',
            'sold_by', 'sold_by_name',
            'counterparty', 'counterparty_name', 'counterparty_phone', 'currency', 'is_partner_sale',
            'total_amount', 'payment_type', 'status',
            'b2b_target_tenant', 'b2b_target_tenant_name', 'b2b_expires_at', 'b2b_reject_reason',
            'voided_at', 'voided_by', 'void_reason', 'items', 'created_at',
        ]
        read_only_fields = fields


class SaleCreateItemInputSerializer(serializers.Serializer):
    product_variant_id = serializers.IntegerField()
    quantity = serializers.DecimalField(max_digits=14, decimal_places=3, min_value=Decimal('0.001'))
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, min_value=Decimal('0.01'))


class SaleCreateInputSerializer(serializers.Serializer):
    branch_id = serializers.IntegerField(required=False, allow_null=True)
    items = SaleCreateItemInputSerializer(many=True)
    payment_type = serializers.ChoiceField(choices=['cash', 'card', 'debt'], default='cash')
    counterparty_id = serializers.IntegerField(required=False, allow_null=True)
    is_partner_sale = serializers.BooleanField(default=False)
    idempotency_key = serializers.CharField(max_length=64, required=False, allow_null=True, allow_blank=True)


class SaleVoidSerializer(serializers.Serializer):
    reason = serializers.CharField(required=True, allow_blank=False)


class SaleItemVoidSerializer(serializers.Serializer):
    quantity = serializers.DecimalField(max_digits=14, decimal_places=3, min_value=Decimal('0.001'))
    reason = serializers.CharField(required=True, allow_blank=False)


class B2BAcceptItemSerializer(serializers.Serializer):
    sale_item_id = serializers.IntegerField()
    accepted_quantity = serializers.DecimalField(max_digits=14, decimal_places=3, min_value=Decimal('0.000'))
    target_category_id = serializers.IntegerField(required=False, allow_null=True)
    target_variant_id = serializers.IntegerField(required=False, allow_null=True)


class B2BAcceptInputSerializer(serializers.Serializer):
    items = B2BAcceptItemSerializer(many=True)


class B2BRejectInputSerializer(serializers.Serializer):
    reason = serializers.CharField(required=True, allow_blank=False)


class NotificationOutputSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'recipient', 'type', 'title', 'message', 'link', 'is_read', 'created_at']
        read_only_fields = fields


class PublicReceiptItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product_variant.product.name', read_only=True)
    product_variant_name = serializers.CharField(source='product_variant.name', read_only=True)
    unit = serializers.CharField(source='product_variant.unit', read_only=True)

    class Meta:
        model = SaleItem
        fields = [
            'id',
            'product_name',
            'product_variant_name',
            'unit',
            'quantity',
            'unit_price',
            'total_price',
        ]
        read_only_fields = fields


class PublicReceiptSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='tenant.name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True, default='')
    branch_address = serializers.CharField(source='branch.address', read_only=True, default='')
    branch_phone = serializers.CharField(source='branch.phone_number', read_only=True, default='')
    sold_by_name = serializers.SerializerMethodField()
    counterparty_name = serializers.CharField(source='counterparty.name', read_only=True, default=None)
    payment_type_display = serializers.CharField(source='get_payment_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    items = serializers.SerializerMethodField()

    class Meta:
        model = Sale
        fields = [
            'id',
            'receipt_number',
            'store_name',
            'branch_name',
            'branch_address',
            'branch_phone',
            'sold_by_name',
            'counterparty_name',
            'currency',
            'total_amount',
            'payment_type',
            'payment_type_display',
            'status',
            'status_display',
            'created_at',
            'items',
        ]
        read_only_fields = fields

    def get_sold_by_name(self, obj):
        if not obj.sold_by:
            return "Kassir"
        return obj.sold_by.get_full_name() or obj.sold_by.username

    def get_items(self, obj):
        return PublicReceiptItemSerializer(obj.items.all(), many=True).data

