from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework.exceptions import AuthenticationFailed

from apps.accounts.authentication import CustomJWTAuthentication
from .local import get_state


class DesktopJWTAuthentication(CustomJWTAuthentication):
    def get_user(self, validated_token):
        device = get_state("device")
        if not device or validated_token.get("desktop_device") != device["device_id"]:
            raise AuthenticationFailed("Offline qurilma sessiyasi tasdiqlanmadi.")
        if timezone.now() >= parse_datetime(device["lease_until"]):
            raise AuthenticationFailed("Offline ruxsat muddati tugadi. Internetga ulanib qayta tasdiqlang.")
        user = super().get_user(validated_token)
        actors = get_state("actors", {})
        if str(user.pk) not in actors:
            raise AuthenticationFailed("Bu hisob qurilmaga ulanmagan.")
        return user
