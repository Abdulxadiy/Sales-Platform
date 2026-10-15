from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from api.mixins import OwnerStaffOnlyAPIView
from api.permissions import HasEmployeePermission
from api.v1.sales.serializers import SaleListQuerySerializer
from api.v1.sales.views.sale_views import SaleListCreateView
from apps.accounts.services.permission_service import PermissionService
from apps.core.spreadsheets import MAX_EXPORT_ROWS, XLSX_MIME, excel_response
from apps.inventory.models import Stock
from apps.sales.models import Counterparty


class SelectedRowsSerializer(serializers.Serializer):
    ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1), max_length=MAX_EXPORT_ROWS, allow_empty=True
    )


class SelectedExportView(OwnerStaffOnlyAPIView):
    permission_classes = [HasEmployeePermission]

    def selected(self, request, queryset):
        serializer = SelectedRowsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ids = set(serializer.validated_data["ids"])
        result = queryset.filter(pk__in=ids)
        if result.count() != len(ids):
            raise ValidationError("Tanlangan qatorlar ushbu do‘konda topilmadi.")
        return result


class StockExportView(SelectedExportView):
    required_permission = "inventory.view_stock"

    @extend_schema(request=SelectedRowsSerializer, responses={(200, XLSX_MIME): OpenApiTypes.BINARY})
    def post(self, request):
        stock = self.selected(
            request, Stock.objects.filter(tenant=self.tenant).select_related("product_variant__product__category")
        )
        cost_allowed = PermissionService.has_permission(
            request.user, "catalog.view_cost_price", tenant=self.tenant, employee=self.employee
        )
        headers = ["Mahsulot", "Variant", "Kategoriya", "SKU", "Shtrix-kod", "Birlik", "Qoldiq", "Valyuta"]
        if cost_allowed:
            headers.append("Tannarx")
        rows = []
        for record in stock.order_by("product_variant__product__name", "pk"):
            v = record.product_variant
            row = [
                v.product.name,
                v.name,
                v.product.category.name,
                v.sku,
                v.barcode or "",
                v.unit,
                record.quantity,
                v.currency,
            ]
            if cost_allowed:
                row.append(record.last_cost_price)
            rows.append(row)
        return excel_response(headers, rows, "ilbi-stock.xlsx", "Ombor")


class CounterpartyExportView(SelectedExportView):
    required_permission = "sales.manage_counterparty"

    @extend_schema(request=SelectedRowsSerializer, responses={(200, XLSX_MIME): OpenApiTypes.BINARY})
    def post(self, request):
        entries = self.selected(request, Counterparty.objects.filter(tenant=self.tenant))
        rows = [
            [c.name, c.phone_number, c.debt_balance_uzs, c.debt_balance_usd, c.note]
            for c in entries.order_by("name", "pk")
        ]
        return excel_response(
            ["Kontragent", "Telefon", "Qarz UZS", "Qarz USD", "Izoh"], rows, "ilbi-debts.xlsx", "Qarzdorlik"
        )


class SalesExportView(SaleListCreateView):
    http_method_names = ["get", "head", "options"]

    @extend_schema(parameters=[SaleListQuerySerializer], responses={(200, XLSX_MIME): OpenApiTypes.BINARY})
    def get(self, request):
        sales = self.get_queryset(request)
        if sales.count() > MAX_EXPORT_ROWS:
            raise ValidationError("Eksport 20 000 qatordan oshdi. Sana yoki boshqa filtrlarni toraytiring.")
        rows = [
            [
                s.receipt_number,
                s.created_at,
                s.sold_by.get_full_name() or s.sold_by.username,
                s.counterparty.name if s.counterparty_id else "",
                s.get_payment_type_display(),
                s.get_status_display(),
                s.currency,
                s.total_amount,
                s.refunded_amount,
                s.net_amount,
            ]
            for s in sales.order_by("-created_at", "-pk")
        ]
        return excel_response(
            [
                "Chek",
                "Vaqt (Toshkent)",
                "Sotuvchi",
                "Kontragent",
                "To‘lov",
                "Holat",
                "Valyuta",
                "Asl summa",
                "Qaytarilgan",
                "Sof summa",
            ],
            rows,
            "ilbi-sales.xlsx",
            "Savdolar",
        )
