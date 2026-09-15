"""Service layer for Product + ProductVariant. Encapsulates the rules
that don't belong in views or models: the mandatory first variant, sku
generation, code assembly, and cascading archive. See
Architectures/inventra-yol-xaritasi.md, 9-bosqich, for the full
design rationale."""

from decimal import Decimal

from django.db import transaction

from apps.catalog.models import Product, ProductVariant


class ProductServiceError(Exception):
    """Raised for invalid Product/ProductVariant operations."""


class ProductService:
    @staticmethod
    def _next_sku(tenant) -> str:
        """Next free, tenant-scoped, zero-padded sequential sku. Purely
        internal -- never shown to or edited by the owner (mirrors
        CategoryService._next_kod's collision-safe approach)."""
        existing = set(
            ProductVariant.objects.select_for_update()
            .filter(tenant=tenant)
            .values_list("sku", flat=True)
        )
        n = len(existing) + 1
        candidate = f"{n:06d}"
        while candidate in existing:
            n += 1
            candidate = f"{n:06d}"
        return candidate

    @staticmethod
    def _build_code(category, price_min: Decimal) -> str:
        """
        "{category.kod}/{price_min // 1000}", or
        "{parent.kod}/{category.kod}/{price_min // 1000}" when
        `category` is itself a subcategory (a product may also be
        filed directly under a top-level category that has no
        subcategories of its own).

        This is a system default at creation time only -- the caller
        may freely overwrite the resulting `code` afterwards (see
        ProductVariant.code docstring), including the price segment.
        """
        thousands = int(price_min // Decimal("1000"))
        if category.parent_id is not None:
            return f"{category.parent.kod}/{category.kod}/{thousands}"
        return f"{category.kod}/{thousands}"

    @classmethod
    @transaction.atomic
    def create(
        cls,
        *,
        tenant,
        name: str,
        category,
        price_partner: Decimal,
        price_min: Decimal,
        price_recommended: Decimal,
        unit: str = "dona",
        image=None,
        variant_name: str = "Standart",
    ) -> Product:
        """
        Create a Product together with its mandatory first
        ProductVariant. A Product is never created "empty" -- every
        Product has at least one ProductVariant, even shops with no
        real size/color variation get one named "Standart" by default.
        """
        if category.tenant_id != tenant.id:
            raise ProductServiceError("category must belong to the same tenant.")

        product = Product.objects.create(
            tenant=tenant, name=name, category=category, image=image
        )
        ProductVariant.objects.create(
            tenant=tenant,
            product=product,
            name=variant_name,
            sku=cls._next_sku(tenant),
            code=cls._build_code(category, price_min),
            unit=unit,
            price_partner=price_partner,
            price_min=price_min,
            price_recommended=price_recommended,
        )
        return product

    @classmethod
    @transaction.atomic
    def add_variant(
        cls,
        *,
        product: Product,
        name: str,
        price_partner: Decimal,
        price_min: Decimal,
        price_recommended: Decimal,
        unit: str = "dona",
        barcode: str = None,
        image=None,
    ) -> ProductVariant:
        """Add an additional variant to an existing Product (e.g. a new
        size/colour of an already-created item)."""
        already_used = ProductVariant.objects.filter(product=product, name=name).exists()
        if already_used:
            raise ProductServiceError(
                f"'{name}' already exists as a variant of this product."
            )

        return ProductVariant.objects.create(
            tenant=product.tenant,
            product=product,
            name=name,
            sku=cls._next_sku(product.tenant),
            code=cls._build_code(product.category, price_min),
            unit=unit,
            # Stored as None, never "" -- the partial unique constraint
            # on barcode only ever compares real, non-null values.
            barcode=barcode or None,
            image=image,
            price_partner=price_partner,
            price_min=price_min,
            price_recommended=price_recommended,
        )

    @staticmethod
    @transaction.atomic
    def archive(product: Product) -> Product:
        """Archive a Product AND cascade to all its variants (confirmed
        2026-09: archiving a Product always archives its variants
        too, in one atomic action)."""
        product.is_active = False
        product.save(update_fields=["is_active"])
        product.variants.update(is_active=False)
        return product
