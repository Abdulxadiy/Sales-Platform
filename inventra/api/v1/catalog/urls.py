from django.urls import path

from .views import (
    CategoryListCreateView,
    CategoryDetailView,
    CategoryArchiveView,
    ProductListCreateView,
    ProductDetailView,
    ProductArchiveView,
    ProductVariantListView,
    ProductVariantCreateView,
    ProductVariantDetailView,
    ProductVariantArchiveView,
    ProductImageUploadView,
    ProductImageDeleteView,
)

urlpatterns = [
    path("categories/", CategoryListCreateView.as_view(), name="category-list-create"),
    path("categories/<int:pk>/", CategoryDetailView.as_view(), name="category-detail"),
    path("categories/<int:pk>/archive/", CategoryArchiveView.as_view(), name="category-archive"),

    path("products/", ProductListCreateView.as_view(), name="product-list-create"),
    path("products/<int:pk>/", ProductDetailView.as_view(), name="product-detail"),
    path("products/<int:pk>/archive/", ProductArchiveView.as_view(), name="product-archive"),
    path("products/<int:pk>/images/", ProductImageUploadView.as_view(), name="product-image-upload"),
    path("products/<int:pk>/images/<int:image_id>/", ProductImageDeleteView.as_view(), name="product-image-delete"),
    path("products/<int:product_id>/variants/", ProductVariantCreateView.as_view(), name="product-variant-create"),

    path("variants/", ProductVariantListView.as_view(), name="product-variant-list"),
    path("variants/<int:pk>/", ProductVariantDetailView.as_view(), name="product-variant-detail"),
    path("variants/<int:pk>/archive/", ProductVariantArchiveView.as_view(), name="product-variant-archive"),
]
