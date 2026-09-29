from django.urls import path, include

urlpatterns = [
    path('', include('api.v1.accounts.urls')),
    path('', include('api.v1.tg_bot.urls')),
    path("tenants/", include('api.v1.tenants.urls')),
    path("catalog/", include('api.v1.catalog.urls')),
    path("inventory/", include('api.v1.inventory.urls')),
    path("sales/", include('api.v1.sales.urls')),
    path("analytics/", include('api.v1.analytics.urls')),
    path("cashbox/", include('api.v1.cashbox.urls')),
    path("internal/shop/", include('api.v1.internal.shop.urls')),
]
