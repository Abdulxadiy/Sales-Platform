from django.urls import path, include

urlpatterns = [
    path('', include('api.v1.accounts.urls')),
    path('', include('api.v1.tg_bot.urls')),
    path("tenants/", include('api.v1.tenants.urls')),
    path("catalog/", include('api.v1.catalog.urls')),
]