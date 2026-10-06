import datetime
from django.db import models
from django.contrib.auth import get_user_model
User = get_user_model()


class Tenant(models.Model):
    TARGET_PERSONAL = 'personal'
    TARGET_GROUP = 'group'
    TARGET_BOTH = 'both'
    TARGET_NONE = 'none'
    TARGET_CHOICES = [
        (TARGET_PERSONAL, 'Faqat Shaxsiy chat'),
        (TARGET_GROUP, 'Faqat Guruh yoki Kanal'),
        (TARGET_BOTH, 'Ikkalasiga ham'),
        (TARGET_NONE, 'Yuborilmasin'),
    ]

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

    # Telegram va Bildirishnoma sozlamalari
    daily_report_target = models.CharField(
        max_length=20,
        choices=TARGET_CHOICES,
        default=TARGET_BOTH,
        help_text="Kunlik hisobot yuboriladigan manzil",
    )
    shift_report_target = models.CharField(
        max_length=20,
        choices=TARGET_CHOICES,
        default=TARGET_BOTH,
        help_text="Smena yopilgandagi Z-hisobot yuboriladigan manzil",
    )
    telegram_group_id = models.CharField(
        max_length=100,
        blank=True,
        default="",
        help_text="Telegram guruh yoki kanal ID si (masalan: -1001234567890 yoki @kanal_nomi)",
    )
    notify_web_reports = models.BooleanField(
        default=True,
        help_text="Smena va kunlik hisobotlarni veb interfeys bildirishnomalariga yuborish",
    )
    notify_on_sale = models.BooleanField(
        default=False,
        help_text="Har bir savdodan so'ng Telegramga xabar yuborish",
    )
    notify_on_debt = models.BooleanField(
        default=True,
        help_text="Nasiya chegarasi va qarzdorlik haqida ogohlantirish",
    )

    # Chek va Kassa sozlamalari
    receipt_header = models.TextField(
        blank=True,
        default="",
        help_text="Kassa cheki yuqori qismidagi matn",
    )
    receipt_footer = models.TextField(
        blank=True,
        default="Xaridingiz uchun rahmat!",
        help_text="Kassa cheki pastki qismidagi matn/shior",
    )
    receipt_phone = models.CharField(
        max_length=30,
        blank=True,
        default="",
        help_text="Chekda ko'rinadigan aloqa raqami",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name