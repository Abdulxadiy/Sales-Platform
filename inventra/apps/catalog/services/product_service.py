"""Service layer for Product + ProductVariant. Encapsulates the rules
that don't belong in views or models: the mandatory first variant, sku
generation, code assembly, and cascading archive. See
Architectures/inventra-yol-xaritasi.md, 9-bosqich, for the full
design rationale."""

from decimal import Decimal

from django.db import transaction

from apps.catalog.models import Product, ProductVariant, ProductImage
from apps.core.utils.image_optimizer import optimize_image


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
        price_segment = int(price_min) if getattr(category, "currency", "UZS") == "USD" else int(price_min // Decimal("1000"))
        if category.parent_id is not None:
            return f"{category.parent.kod}/{category.kod}/{price_segment}"
        return f"{category.kod}/{price_segment}"

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
        code: str = None,
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
        variant_code = code.strip() if code and code.strip() else cls._build_code(category, price_min)
        ProductVariant.objects.create(
            tenant=tenant,
            product=product,
            name=variant_name,
            sku=cls._next_sku(tenant),
            code=variant_code,
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
        code: str = None,
    ) -> ProductVariant:
        """Add an additional variant to an existing Product (e.g. a new
        size/colour of an already-created item)."""
        already_used = ProductVariant.objects.filter(product=product, name=name).exists()
        if already_used:
            raise ProductServiceError(
                f"'{name}' already exists as a variant of this product."
            )

        variant_code = code.strip() if code and code.strip() else cls._build_code(product.category, price_min)
        return ProductVariant.objects.create(
            tenant=product.tenant,
            product=product,
            name=name,
            sku=cls._next_sku(product.tenant),
            code=variant_code,
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

    @classmethod
    @transaction.atomic
    def delete(cls, product: Product) -> bool:
        """
        Delete a Product safely.
        - If any variant has sales or stock movement history,
          hard delete is blocked to preserve financial and accounting audit trails.
          Automatically cascades to archive the Product and all variants.
        - If no sales or stock history exists (freshly created or never traded),
          performs clean hard delete from the database.
        Returns True.
        """
        has_sales = product.variants.filter(sale_items__isnull=False).exists()
        has_stock_moves = product.variants.filter(stock_movements__isnull=False).exists()

        if has_sales or has_stock_moves:
            cls.archive(product)
            return True

        # Clean hard delete (cascades to variants, stock, images)
        product.delete()
        return True

    @classmethod
    @transaction.atomic
    def delete_variant(cls, variant: ProductVariant) -> bool:
        """
        Delete a ProductVariant safely.
        - If it's the last active variant of the product, deletes/archives the product.
        - If other active variants exist:
            - If this variant has sales or stock movements, archives it (is_active=False).
            - Otherwise hard deletes it.
        Returns True.
        """
        product = variant.product
        remaining_variants = product.variants.filter(is_active=True).exclude(pk=variant.pk)
        if not remaining_variants.exists():
            return cls.delete(product)

        has_sales = variant.sale_items.exists()
        has_stock_moves = variant.stock_movements.exists()

        if has_sales or has_stock_moves:
            variant.is_active = False
            variant.save(update_fields=["is_active"])
        else:
            variant.delete()
        return True

    @classmethod
    @transaction.atomic
    def add_image(cls, *, product: Product, image_file, order: int = 0) -> ProductImage:
        """Add a gallery image to a product (maximum 3 images allowed per product)."""
        current_count = ProductImage.objects.filter(product=product).count()
        if current_count >= 3:
            raise ProductServiceError("Bitta mahsulotga maksimal 3 tagacha rasm yuklash mumkin.")

        optimized = optimize_image(image_file)
        return ProductImage.objects.create(
            tenant=product.tenant,
            product=product,
            image=optimized,
            order=order,
        )

    @classmethod
    @transaction.atomic
    def remove_image(cls, *, product: Product, image_id: int):
        """Remove a gallery image from a product."""
        deleted, _ = ProductImage.objects.filter(product=product, id=image_id).delete()
        if not deleted:
            raise ProductServiceError("Rasm topilmadi.")
