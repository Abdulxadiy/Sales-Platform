"""URL routes for the catalog API. Flat (not nested under tenants/<id>/)
on purpose -- see api/v1/catalog/views/_base.py: catalog is owner/staff
territory only, tenant always comes from the authenticated user via
TenantContextMixin, never from the URL."""

from django.urls import path

from .views import (
    CategoryListCreateView,
    CategoryDetailView,
    CategoryArchiveView,
    ProductListCreateView,
    ProductDetailView,
    ProductArchiveView,
    ProductVariantCreateView,
    ProductVariantDetailView,
    ProductVariantArchiveView,
)

urlpatterns = [
    path("categories/", CategoryListCreateView.as_view(), name="category-list-create"),
    path("categories/<int:pk>/", CategoryDetailView.as_view(), name="category-detail"),
    path("categories/<int:pk>/archive/", CategoryArchiveView.as_view(), name="category-archive"),

    path("products/", ProductListCreateView.as_view(), name="product-list-create"),
    path("products/<int:pk>/", ProductDetailView.as_view(), name="product-detail"),
    path("products/<int:pk>/archive/", ProductArchiveView.as_view(), name="product-archive"),
    path("products/<int:product_id>/variants/", ProductVariantCreateView.as_view(), name="product-variant-create"),

    path("variants/<int:pk>/", ProductVariantDetailView.as_view(), name="product-variant-detail"),
    path("variants/<int:pk>/archive/", ProductVariantArchiveView.as_view(), name="product-variant-archive"),
]
