from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Tenant, Branch


@receiver(post_save, sender=Tenant)
def create_default_branch_for_tenant(sender, instance, created, **kwargs):
    if created:
        Branch.objects.get_or_create(
            tenant=instance,
            is_main=True,
            defaults={
                "name": "Asosiy filial",
                "is_active": True,
            },
        )
