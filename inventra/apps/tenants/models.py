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

    # Kamayib qolgan tovarlar (Kamchiliklar / Defitsit) sozlamalari
    FREQUENCY_DAILY = 'daily'
    FREQUENCY_WEEKLY = 'weekly'
    FREQUENCY_MONTHLY = 'monthly'
    FREQUENCY_CHOICES = [
        (FREQUENCY_DAILY, 'Har kuni'),
        (FREQUENCY_WEEKLY, 'Haftalik'),
        (FREQUENCY_MONTHLY, 'Oylik'),
    ]

    low_stock_report_target = models.CharField(
        max_length=20,
        choices=TARGET_CHOICES,
        default=TARGET_BOTH,
        help_text="Kamchilik tovarlar hisoboti yuboriladigan manzil",
    )
    low_stock_report_time = models.TimeField(
        default=datetime.time(9, 0),
        help_text="Kamayib qolgan tovarlar hisoboti yuboriladigan vaqt (masalan 09:00)",
    )
    low_stock_frequency = models.CharField(
        max_length=10,
        choices=FREQUENCY_CHOICES,
        default=FREQUENCY_DAILY,
        help_text="Kamchilik tovarlar hisoboti davriyligi",
    )
    low_stock_weekday = models.PositiveSmallIntegerField(
        default=1,
        help_text="Haftalik reja uchun hafta kuni (1=Dushanba .. 7=Yakshanba)",
    )
    low_stock_day_of_month = models.PositiveSmallIntegerField(
        default=1,
        help_text="Oylik reja uchun oyning sanasi (1 .. 31)",
    )
    notify_web_low_stock = models.BooleanField(
        default=True,
        help_text="Kamayib qolgan tovarlar hisobotini veb interfeys bildirishnomalariga yuborish",
    )
    last_low_stock_report_sent_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="So'nggi marta kamchiliklar hisoboti yuborilgan sana va vaqt",
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