from decimal import Decimal
from datetime import datetime, time, timedelta
from collections import defaultdict
from django.utils import timezone
from django.db.models import Sum, Q, F

from apps.sales.models import Sale, SaleItem, Counterparty


class AnalyticsServiceError(Exception):
    pass


class AnalyticsService:
    @staticmethod
    def resolve_date_range(period: str = "today", start_date_str: str = None, end_date_str: str = None):
        now = timezone.now()
        today = now.date()

        if period == "today":
            start_dt = timezone.make_aware(datetime.combine(today, time.min))
            end_dt = timezone.make_aware(datetime.combine(today, time.max))
        elif period == "this_week":
            # 1 haftalik hisobot: so'nggi 7 kun (bugun va oldingi 6 kun)
            start_of_week = today - timedelta(days=6)
            start_dt = timezone.make_aware(datetime.combine(start_of_week, time.min))
            end_dt = timezone.make_aware(datetime.combine(today, time.max))
        elif period == "this_month":
            start_of_month = today.replace(day=1)
            start_dt = timezone.make_aware(datetime.combine(start_of_month, time.min))
            end_dt = timezone.make_aware(datetime.combine(today, time.max))
        elif period == "this_year":
            start_of_year = today.replace(month=1, day=1)
            start_dt = timezone.make_aware(datetime.combine(start_of_year, time.min))
            end_dt = timezone.make_aware(datetime.combine(today, time.max))
        elif period == "custom":
            if not start_date_str or not end_date_str:
                raise AnalyticsServiceError("custom davr uchun start_date va end_date kiritilishi shart.")
            try:
                s_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
                e_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
            except ValueError:
                raise AnalyticsServiceError("Sana formati YYYY-MM-DD bo'lishi kerak.")
            if s_date > e_date:
                raise AnalyticsServiceError("start_date end_date dan katta bo'lishi mumkin emas.")
            start_dt = timezone.make_aware(datetime.combine(s_date, time.min))
            end_dt = timezone.make_aware(datetime.combine(e_date, time.max))
        else:
            raise AnalyticsServiceError(f"Noto'g'ri period: {period}. 'today', 'this_week', 'this_month', 'this_year', 'custom' tanlang.")

        return start_dt, end_dt

    @classmethod
    def get_dashboard_summary(cls, *, tenant, period: str = "today", start_date_str: str = None, end_date_str: str = None) -> dict:
        start_dt, end_dt = cls.resolve_date_range(period, start_date_str, end_date_str)

        # Sales in scope: not fully voided and not b2b_rejected
        valid_statuses = [
            Sale.STATUS_COMPLETED,
            Sale.STATUS_PARTIALLY_VOIDED,
            Sale.STATUS_B2B_ACCEPTED,
            Sale.STATUS_B2B_PARTIALLY_ACCEPTED,
            Sale.STATUS_B2B_PENDING,
        ]

        sales = list(
            Sale.objects.filter(
                tenant=tenant,
                status__in=valid_statuses,
                created_at__range=(start_dt, end_dt),
            ).select_related("sold_by").prefetch_related("items__product_variant__product")
        )

        total_revenue_uzs = Decimal("0.00")
        total_revenue_usd = Decimal("0.00")
        net_profit_uzs = Decimal("0.00")
        net_profit_usd = Decimal("0.00")

        sales_count_uzs = 0
        sales_count_usd = 0

        # Day-by-day chart data (pre-populate all days in range so empty days have 0.00 instead of vanishing)
        daily_data = {}
        curr = start_dt.date()
        while curr <= end_dt.date():
            d_key = curr.strftime("%Y-%m-%d")
            daily_data[d_key] = {
                "date": d_key,
                "revenue_uzs": Decimal("0.00"),
                "revenue_usd": Decimal("0.00"),
                "profit_uzs": Decimal("0.00"),
                "profit_usd": Decimal("0.00"),
                "sales_count": 0,
            }
            curr += timedelta(days=1)

        # Payment methods breakdown
        payment_methods = {
            "cash": {"count": 0, "amount_uzs": Decimal("0.00"), "amount_usd": Decimal("0.00")},
            "card": {"count": 0, "amount_uzs": Decimal("0.00"), "amount_usd": Decimal("0.00")},
            "debt": {"count": 0, "amount_uzs": Decimal("0.00"), "amount_usd": Decimal("0.00")},
        }

        # Cashiers leaderboard
        cashiers = defaultdict(lambda: {
            "name": "",
            "sales_count": 0,
            "total_amount_uzs": Decimal("0.00"),
            "total_amount_usd": Decimal("0.00"),
        })

        # Top products tracking
        product_sales = defaultdict(lambda: {
            "name": "",
            "sku": "",
            "quantity_sold": Decimal("0.000"),
            "revenue": Decimal("0.00"),
            "profit": Decimal("0.00"),
            "currency": "UZS",
        })

        for sale in sales:
            date_key = sale.created_at.strftime("%Y-%m-%d")
            if date_key not in daily_data:
                daily_data[date_key] = {
                    "date": date_key,
                    "revenue_uzs": Decimal("0.00"),
                    "revenue_usd": Decimal("0.00"),
                    "profit_uzs": Decimal("0.00"),
                    "profit_usd": Decimal("0.00"),
                    "sales_count": 0,
                }
            daily_data[date_key]["sales_count"] += 1

            if sale.currency == Sale.CURRENCY_UZS:
                sales_count_uzs += 1
            else:
                sales_count_usd += 1

            # Cashier
            name_parts = [sale.sold_by.first_name, sale.sold_by.last_name]
            full_name = " ".join(p for p in name_parts if p).strip()
            seller_name = full_name or sale.sold_by.username or sale.sold_by.phone_number or f"User #{sale.sold_by.id}"
            cashiers[sale.sold_by_id]["name"] = seller_name
            cashiers[sale.sold_by_id]["sales_count"] += 1

            # Payment type
            if sale.payment_type in payment_methods:
                payment_methods[sale.payment_type]["count"] += 1

            # Process items for net profit and top products
            for item in sale.items.all():
                active_qty = item.quantity - item.voided_quantity
                if active_qty <= 0:
                    continue

                item_rev = active_qty * item.unit_price
                item_cost = active_qty * item.cost_price
                item_prof = item_rev - item_cost

                prod_key = item.product_variant_id
                product_sales[prod_key]["name"] = f"{item.product_variant.product.name} ({item.product_variant.name})"
                product_sales[prod_key]["sku"] = item.product_variant.sku
                product_sales[prod_key]["quantity_sold"] += active_qty
                product_sales[prod_key]["revenue"] += item_rev
                product_sales[prod_key]["profit"] += item_prof
                product_sales[prod_key]["currency"] = sale.currency

                if sale.currency == Sale.CURRENCY_UZS:
                    total_revenue_uzs += item_rev
                    net_profit_uzs += item_prof
                    daily_data[date_key]["revenue_uzs"] += item_rev
                    daily_data[date_key]["profit_uzs"] += item_prof
                    payment_methods[sale.payment_type]["amount_uzs"] += item_rev
                    cashiers[sale.sold_by_id]["total_amount_uzs"] += item_rev
                else:
                    total_revenue_usd += item_rev
                    net_profit_usd += item_prof
                    daily_data[date_key]["revenue_usd"] += item_rev
                    daily_data[date_key]["profit_usd"] += item_prof
                    payment_methods[sale.payment_type]["amount_usd"] += item_rev
                    cashiers[sale.sold_by_id]["total_amount_usd"] += item_rev

        # Debts summary
        debt_qs = Counterparty.objects.filter(tenant=tenant, is_active=True)
        total_debt_uzs = debt_qs.filter(debt_balance_uzs__gt=0).aggregate(s=Sum("debt_balance_uzs"))["s"] or Decimal("0.00")
        total_debt_usd = debt_qs.filter(debt_balance_usd__gt=0).aggregate(s=Sum("debt_balance_usd"))["s"] or Decimal("0.00")

        # Top 10 products
        sorted_products = sorted(product_sales.values(), key=lambda p: p["revenue"], reverse=True)[:10]

        # Sorted daily chart
        sorted_chart = [daily_data[k] for k in sorted(daily_data.keys())]

        avg_check_uzs = (total_revenue_uzs / sales_count_uzs) if sales_count_uzs > 0 else Decimal("0.00")
        avg_check_usd = (total_revenue_usd / sales_count_usd) if sales_count_usd > 0 else Decimal("0.00")

        return {
            "period": period,
            "start_date": start_dt.strftime("%Y-%m-%d %H:%M:%S"),
            "end_date": end_dt.strftime("%Y-%m-%d %H:%M:%S"),
            "kpi": {
                "total_revenue_uzs": f"{total_revenue_uzs:.2f}",
                "total_revenue_usd": f"{total_revenue_usd:.2f}",
                "net_profit_uzs": f"{net_profit_uzs:.2f}",
                "net_profit_usd": f"{net_profit_usd:.2f}",
                "total_debt_uzs": f"{total_debt_uzs:.2f}",
                "total_debt_usd": f"{total_debt_usd:.2f}",
                "sales_count": len(sales),
                "average_check_uzs": f"{avg_check_uzs:.2f}",
                "average_check_usd": f"{avg_check_usd:.2f}",
            },
            # Top-level aliases for direct frontend compatibility
            "total_revenue_uzs": f"{total_revenue_uzs:.2f}",
            "total_revenue_usd": f"{total_revenue_usd:.2f}",
            "net_profit_uzs": f"{net_profit_uzs:.2f}",
            "net_profit_usd": f"{net_profit_usd:.2f}",
            "total_debt_uzs": f"{total_debt_uzs:.2f}",
            "total_debt_usd": f"{total_debt_usd:.2f}",
            "sales_count": len(sales),
            "average_check_uzs": f"{avg_check_uzs:.2f}",
            "average_check_usd": f"{avg_check_usd:.2f}",
            "sales_chart": [
                {
                    "date": d["date"],
                    "revenue_uzs": f"{d['revenue_uzs']:.2f}",
                    "revenue_usd": f"{d['revenue_usd']:.2f}",
                    "profit_uzs": f"{d['profit_uzs']:.2f}",
                    "profit_usd": f"{d['profit_usd']:.2f}",
                    "sales_count": d["sales_count"],
                }
                for d in sorted_chart
            ],
            "top_products": [
                {
                    "name": p["name"],
                    "product_name": p["name"],
                    "sku": p["sku"],
                    "quantity_sold": f"{p['quantity_sold']:.3f}",
                    "total_quantity": f"{p['quantity_sold']:.3f}",
                    "revenue": f"{p['revenue']:.2f}",
                    "total_revenue_uzs": f"{p['revenue']:.2f}",
                    "profit": f"{p['profit']:.2f}",
                    "currency": p["currency"],
                }
                for p in sorted_products
            ],
            "payment_methods": {
                k: {
                    "count": v["count"],
                    "amount_uzs": f"{v['amount_uzs']:.2f}",
                    "amount_usd": f"{v['amount_usd']:.2f}",
                }
                for k, v in payment_methods.items()
            },
            "payment_methods_list": [
                {
                    "method": k.upper(),
                    "count": v["count"],
                    "total_uzs": f"{v['amount_uzs']:.2f}",
                    "total_usd": f"{v['amount_usd']:.2f}",
                }
                for k, v in payment_methods.items()
            ],
            "cashiers_leaderboard": [
                {
                    "name": v["name"],
                    "cashier_name": v["name"],
                    "sales_count": v["sales_count"],
                    "total_sales_count": v["sales_count"],
                    "total_amount_uzs": f"{v['total_amount_uzs']:.2f}",
                    "total_revenue_uzs": f"{v['total_amount_uzs']:.2f}",
                    "total_amount_usd": f"{v['total_amount_usd']:.2f}",
                }
                for v in sorted(cashiers.values(), key=lambda c: c["sales_count"], reverse=True)
            ],
        }
