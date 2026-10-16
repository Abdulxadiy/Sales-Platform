from apps.accounts.token_validation import has_current_token_version
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView


class RevocableTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        token = RefreshToken(attrs["refresh"])
        user = get_user_model().objects.filter(pk=token.get("user_id"), is_active=True).first()
        if user is None or not has_current_token_version(token, user):
            raise InvalidToken("Sessiya bekor qilingan. Qaytadan kiring.")
        return super().validate(attrs)


class RevocableTokenRefreshView(TokenRefreshView):
    serializer_class = RevocableTokenRefreshSerializer
