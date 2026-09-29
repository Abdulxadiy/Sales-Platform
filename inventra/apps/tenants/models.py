import datetime
from django.db import models
from django.contrib.auth import get_user_model
User = get_user_model()


class Tenant(models.Model):
    name = models.CharField(max_length=100, unique=True)
    owner = models.OneToOneField(User, on_delete=models.CASCADE, related_name="owned_tenant")
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    usd_rate = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=12800.00,
        help_text="Ichki dollar kursi (ko'rgazmali hisoblash uchun)",
    )
    daily_report_time = models.TimeField(
        default=datetime.time(22, 0),
        help_text="Kunlik Z-hisobot xabari yuboriladigan vaqt (masalan 22:00)",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name