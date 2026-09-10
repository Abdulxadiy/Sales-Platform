"""
Service layer for password setup and reset via secure one-time links sent by email.
Roadmap reference: Phase 7 (Password reset / setup via email).
"""

import secrets
import redis
from django.conf import settings
from django.core.mail import send_mail
from django.contrib.auth import get_user_model

from apps.accounts.services import login_throttle

User = get_user_model()
redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)

TOKEN_TTL_SECONDS = 86400  # 24 hours
COOLDOWN_SECONDS = 60      # Minimum interval between email dispatch requests


def _token_key(token: str) -> str:
    """Redis key for storing token -> user_id mapping."""
    return f"pwd_reset:{token}"


def _cooldown_key(user_id: int) -> str:
    """Redis key tracking cooldown per user to prevent email spam."""
    return f"pwd_reset_cooldown:{user_id}"


def generate_reset_token() -> str:
    """Generate a cryptographically secure 32-byte URL-safe token."""
    return secrets.token_urlsafe(32)


def is_in_cooldown(user_id: int) -> bool:
    """Check if the user is currently throttled from requesting another reset email."""
    return redis_client.exists(_cooldown_key(user_id)) == 1


def store_reset_token(token: str, user_id: int) -> None:
    """
    Store the token mapped to user_id with 24-hour expiration
    and set the 60-second cooldown key.
    """
    redis_client.set(_token_key(token), str(user_id), ex=TOKEN_TTL_SECONDS)
    redis_client.set(_cooldown_key(user_id), "1", ex=COOLDOWN_SECONDS)


def consume_reset_token(token: str) -> int | None:
    """
    Retrieve user_id associated with token and immediately delete it
    to enforce single-use semantics. Returns user_id or None if invalid/expired.
    """
    key = _token_key(token)
    pipe = redis_client.pipeline()
    pipe.get(key)
    pipe.delete(key)
    results = pipe.execute()

    user_id_str = results[0]
    if user_id_str is None:
        return None
    try:
        return int(user_id_str)
    except (ValueError, TypeError):
        return None


def send_password_reset_email(user, token: str) -> bool:
    """
    Send an email containing the one-time account setup / password reset link.
    """
    reset_url = f"{settings.FRONTEND_URL}/setup-account?token={token}"
    subject = "Inventra — Set up your account password"
    message = (
        f"Hello,\n\n"
        f"You have been invited to or requested a password reset on Inventra.\n"
        f"Please click the link below to set your username and password:\n\n"
        f"{reset_url}\n\n"
        f"This link is single-use and will expire in 24 hours.\n\n"
        f"If you did not make this request, you can safely ignore this email."
    )

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        return True
    except Exception:
        return False


def request_password_reset(email: str) -> tuple[bool, str]:
    """
    Process request for a password reset / setup link.

    Guards against email enumeration by returning success (True, 'sent')
    even if the email is not registered in the system.
    """
    if not email:
        return False, "email_required"

    user = User.objects.filter(email__iexact=email).first()

    # Generic success response to avoid leaking registered emails
    if user is None or user.role not in ("staff", "owner", "platform_admin"):
        return True, "sent"

    if is_in_cooldown(user.id):
        return False, "cooldown"

    token = generate_reset_token()
    store_reset_token(token, user.id)

    sent = send_password_reset_email(user, token)
    if not sent:
        # If email delivery fails, clean up the stored token so user can retry
        redis_client.delete(_token_key(token))
        return False, "email_send_failed"

    return True, "sent"


def confirm_password_reset(
    token: str, new_password: str, username: str = ""
) -> tuple[bool, str, User | None]:
    """
    Validate the one-time token, update username (if provided) and password,
    and clear any lingering login throttle strikes.
    """
    if not token or not new_password:
        return False, "missing_fields", None

    user_id = consume_reset_token(token)
    if not user_id:
        return False, "invalid_or_expired_token", None

    user = User.objects.filter(id=user_id).first()
    if not user:
        return False, "user_not_found", None

    # Handle username update if provided
    cleaned_username = username.strip() if username else ""
    if cleaned_username:
        if (
            User.objects.filter(username__iexact=cleaned_username)
            .exclude(id=user.id)
            .exists()
        ):
            return False, "username_taken", None
        user.username = cleaned_username

    user.set_password(new_password)
    user.save()

    # Clear throttle lock if user was previously banned/throttled on login
    if user.username:
        login_throttle.register_success(user.username)

    return True, "success", user
