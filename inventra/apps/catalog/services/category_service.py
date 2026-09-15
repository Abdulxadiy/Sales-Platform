"""Service layer for Category: creation with an auto-assigned `kod`,
owner-driven editing, and archiving. The 2-level depth cap lives here
(not on the model) -- see Architectures/inventra-yol-xaritasi.md,
9-bosqich."""

from django.db import transaction

from apps.catalog.models import Category


class CategoryServiceError(Exception):
    """Raised for invalid Category operations (e.g. depth violation, duplicate kod)."""


class CategoryService:
    @staticmethod
    def _next_kod(tenant) -> str:
        """
        Return the next free sequential `kod` for this tenant.

        `kod` is freely editable after creation (see update()), so a
        plain count()+1 is not safe -- an owner may already have
        hand-picked a number that collides with the "next" one. This
        locks the tenant's existing rows (select_for_update) and walks
        forward past any collision.
        """
        existing = set(
            Category.objects.select_for_update()
            .filter(tenant=tenant)
            .values_list("kod", flat=True)
        )
        n = len(existing) + 1
        candidate = f"{n:02d}"
        while candidate in existing:
            n += 1
            candidate = f"{n:02d}"
        return candidate

    @classmethod
    @transaction.atomic
    def create(cls, *, tenant, name: str, parent: Category = None) -> Category:
        """
        Create a Category. `kod` is always system-assigned (see
        _next_kod) -- the owner may only change it afterwards, via
        update().
        """
        if parent is not None:
            if parent.tenant_id != tenant.id:
                raise CategoryServiceError("parent must belong to the same tenant.")
            if parent.parent_id is not None:
                raise CategoryServiceError(
                    "Categories are limited to 2 levels -- the chosen parent is "
                    "already a subcategory."
                )

        kod = cls._next_kod(tenant)
        return Category.objects.create(tenant=tenant, name=name, kod=kod, parent=parent)

    @staticmethod
    @transaction.atomic
    def update(category: Category, *, name: str = None, kod: str = None) -> Category:
        """Owner-driven edit of name and/or kod. `parent` is intentionally
        not reassignable here -- not discussed/agreed in the roadmap;
        add it later if a real need shows up."""
        if name is not None:
            category.name = name

        if kod is not None and kod != category.kod:
            already_used = (
                Category.objects.filter(tenant=category.tenant, kod=kod)
                .exclude(pk=category.pk)
                .exists()
            )
            if already_used:
                raise CategoryServiceError(
                    f"kod '{kod}' is already used by another category in this tenant."
                )
            category.kod = kod

        category.save()
        return category

    @staticmethod
    @transaction.atomic
    def archive(category: Category) -> Category:
        category.is_active = False
        category.save(update_fields=["is_active"])
        return category
