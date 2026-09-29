from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed


class CustomJWTAuthentication(JWTAuthentication):
    """
    Extends SimpleJWT's JWTAuthentication to enforce immediate token invalidation:
    When user.token_version is incremented (e.g. employee fired, password reset,
    admin ban/unban), any active JWT token with an older token_version is immediately
    rejected with 401 Unauthorized.
    """

    def get_user(self, validated_token):
        user = super().get_user(validated_token)

        token_version = validated_token.get("token_version")
        if token_version is not None and token_version != user.token_version:
            raise AuthenticationFailed(
                "Token has been revoked or expired.",
                code="token_revoked",
            )

        return user
