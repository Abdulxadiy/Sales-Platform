"""
Service layer for password setup and reset via secure one-time links sent by email.
Roadmap reference: Phase 7 (Password reset / setup via email).
"""

import logging
import secrets
import redis
from django.db.models import Q
from django.conf import settings
from django.core.mail import send_mail
from django.contrib.auth import get_user_model

from apps.accounts.models import Employee
from apps.accounts.services import login_throttle
from apps.accounts.services.email_utils import mask_email

logger = logging.getLogger(__name__)

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
    Send an email containing the one-time account setup / password reset link
    both in plain text and formatted responsive HTML for Gmail/clients.
    """
    reset_url = f"{settings.FRONTEND_URL}/setup-account?token={token}"
    subject = "Inventra — Hisobingizni faollashtiring va parol o‘rnating"

    # Plain text version for non-HTML clients
    plain_message = (
        f"Assalomu alaykum,\n\n"
        f"Siz Inventra platformasiga do‘kon egasi yoki xodim sifatida qo‘shildingiz (yoki parolni tiklash so‘rovi yubordingiz).\n\n"
        f"Tizimga kirish uchun username va parolingizni quyidagi havola orqali o‘rnating:\n"
        f"{reset_url}\n\n"
        f"Keyingi qadam: Parolni o‘rnatganingizdan so‘ng, telefon raqamingizga Telegram bot orqali 6 xonali tasdiqlash kodi yuboriladi va tizimga avtomatik kirasiz.\n\n"
        f"Ushbu havola 24 soat davomida faqat bir marta foydalanish uchun amal qiladi.\n"
        f"Agar bu so‘rovni siz yubormagan bo‘lsangiz, ushbu xatni e’tiborsiz qoldirishingiz mumkin."
    )

    # Minimalist Stripe-style responsive HTML template for Gmail & modern clients
    html_message = f"""
    <!DOCTYPE html>
    <html lang="uz">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>{subject}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; padding: 40px 15px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03); overflow: hidden;">
              <tr>
                <td style="padding: 40px 36px 36px 36px;">
                  
                  <!-- Brand Header (Minimalist Monogram + Wordmark) -->
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 32px;">
                    <tr>
                      <td valign="middle" style="width: 38px; height: 38px; background-color: #0f172a; border-radius: 10px; text-align: center;">
                        <span style="font-size: 20px; font-weight: 800; color: #ffffff; line-height: 38px; display: block;">I</span>
                      </td>
                      <td valign="middle" style="padding-left: 12px;">
                        <span style="font-size: 19px; font-weight: 800; letter-spacing: -0.02em; color: #0f172a;">INVENTRA</span>
                      </td>
                    </tr>
                  </table>

                  <!-- Title -->
                  <h1 style="font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 14px 0; letter-spacing: -0.02em;">
                    Hisobingizni faollashtiring
                  </h1>

                  <!-- Message -->
                  <p style="font-size: 14.5px; line-height: 1.65; color: #475569; margin: 0 0 28px 0;">
                    Assalomu alaykum! Siz Inventra platformasiga do‘kon boshqaruvchisi sifatida biriktirildingiz. Xavfsiz ishlashni boshlash uchun quyidagi tugma orqali shaxsiy parolingizni belgilang.
                  </p>

                  <!-- Primary Action Button -->
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 28px 0;">
                    <tr>
                      <td align="center" style="background-color: #0f172a; border-radius: 10px;">
                        <a href="{reset_url}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 14.5px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 10px; letter-spacing: -0.01em;">
                          Parol o‘rnatish &rarr;
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Next Step Note -->
                  <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; padding: 14px 18px; margin: 0 0 24px 0;">
                    <div style="font-size: 12.5px; font-weight: 700; color: #334155; margin-bottom: 4px;">
                      💡 Keyingi qadam:
                    </div>
                    <div style="font-size: 12.5px; line-height: 1.55; color: #64748b;">
                      Parol o‘rnatilgach, telefoningizga Telegram orqali 6 xonali tasdiqlash kodi boradi va avtomatik tizimga kirasiz.
                    </div>
                  </div>

                  <!-- Direct URL Fallback -->
                  <p style="font-size: 12px; line-height: 1.6; color: #94a3b8; margin: 0 0 20px 0;">
                    Agar tugma ishlamasa, quyidagi havolani brauzeringizga nusxalang:<br>
                    <a href="{reset_url}" style="color: #0f172a; text-decoration: underline; word-break: break-all;">{reset_url}</a>
                  </p>

                  <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0 20px 0;">

                  <!-- Security Footnote -->
                  <p style="font-size: 11.5px; line-height: 1.55; color: #94a3b8; margin: 0;">
                    🔒 Ushbu havola <strong>24 soat</strong> davomida faqat bir marta foydalanish uchun amal qiladi. Agar bu so‘rovni siz yubormagan bo‘lsangiz, xatni xavotirsiz e’tiborsiz qoldirishingiz mumkin.
                  </p>
                </td>
              </tr>

              <!-- Clean Card Footer -->
              <tr>
                <td style="background-color: #fafbfc; border-top: 1px solid #f1f5f9; padding: 18px 36px; text-align: center; font-size: 11px; color: #94a3b8;">
                  © 2026 Inventra Platform. Barcha huquqlar himoyalangan.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

    logger.warning("=" * 60)
    logger.warning("PAROL O'RNATISH HAVOLASI [%s]: %s", user.email, reset_url)
    logger.warning("=" * 60)

    try:
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info("Email muvaffaqiyatli jo'natildi: %s", user.email)
        return True
    except Exception as exc:
        logger.error("Email jo'natishda xatolik yuz berdi (%s): %s", user.email, exc)
        return False


def request_password_reset(
    email: str = "", identifier: str = "", return_hint: bool = False
) -> tuple[bool, str] | tuple[bool, str, str | None]:
    """
    Process request for a password reset / setup link.
    Supports lookup by email, username, or phone_number.

    Guards against user enumeration by returning success (True, 'sent')
    even if the user/email is not registered in the system.
    """
    ident = (identifier or email or "").strip()
    if not ident:
        if return_hint:
            return False, "identifier_required", None
        return False, "email_required"

    user = User.objects.filter(
        Q(email__iexact=ident) | Q(username__iexact=ident) | Q(phone_number=ident)
    ).first()

    # Generic success response to avoid leaking registered accounts.
    if user is None or user.role not in ("staff", "owner", "platform_admin"):
        if return_hint:
            return True, "sent", None
        return True, "sent"

    if user.role != "platform_admin" and not Employee.objects.filter(
        user=user, is_active=True
    ).exists():
        if return_hint:
            return True, "sent", None
        return True, "sent"

    if not user.email:
        if return_hint:
            return False, "no_email", None
        return False, "no_email"

    if is_in_cooldown(user.id):
        if return_hint:
            return False, "cooldown", None
        return False, "cooldown"

    token = generate_reset_token()
    store_reset_token(token, user.id)

    sent = send_password_reset_email(user, token)
    if not sent:
        # If email delivery fails, clean up the stored token so user can retry
        redis_client.delete(_token_key(token))
        if return_hint:
            return False, "email_send_failed", None
        return False, "email_send_failed"

    email_hint = mask_email(user.email)
    if return_hint:
        return True, "sent", email_hint
    return True, "sent"


def request_password_reset_with_hint(identifier: str) -> tuple[bool, str, str | None]:
    """Helper returning (ok, reason, email_hint) for API views."""
    return request_password_reset(identifier=identifier, return_hint=True)


def change_password_with_old(login: str, old_password: str, new_password: str) -> tuple[bool, str, User | None]:
    """
    Change password by providing valid old_password when email reset is not accessible.
    Validates user credentials, new password policy, updates password and token_version,
    and logs audit trail.
    """
    if not login or not old_password or not new_password:
        return False, "Barcha maydonlar to‘ldirilishi shart.", None

    if len(new_password) < 8:
        return False, "Yangi parol kamida 8 ta belgidan iborat bo‘lishi kerak.", None

    if old_password == new_password:
        return False, "Yangi parol joriy paroldan farq qilishi kerak.", None

    ident = login.strip()
    user = User.objects.filter(
        Q(username__iexact=ident) | Q(phone_number=ident) | Q(email__iexact=ident)
    ).first()

    if user is None or not user.check_password(old_password):
        return False, "Login yoki eski parol noto‘g‘ri.", None

    if user.role not in ("staff", "owner", "platform_admin"):
        return False, "Ruxsat etilmagan foydalanuvchi.", None

    if user.role != "platform_admin" and not Employee.objects.filter(
        user=user, is_active=True
    ).exists():
        return False, "Foydalanuvchi faol emas.", None

    user.set_password(new_password)
    user.token_version = getattr(user, 'token_version', 1) + 1
    user.save()

    try:
        from apps.core.models import AuditAction
        from apps.core.services.audit_service import AuditService
        AuditService.log(
            action=AuditAction.PASSWORD_RESET,
            actor=user,
            tenant=getattr(user, 'tenant', None),
            target_model="User",
            target_id=str(user.id),
            changes={"token_version": user.token_version},
            description=f"User {user.username or user.phone_number} changed password via old password verification",
        )
    except Exception:
        pass

    return True, "Parolingiz muvaffaqiyatli yangilandi! Endi yangi parol bilan kirishingiz mumkin.", user


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
    user.token_version = getattr(user, "token_version", 1) + 1
    user.save()

    from apps.core.models import AuditAction
    from apps.core.services.audit_service import AuditService
    AuditService.log(
        action=AuditAction.PASSWORD_RESET,
        actor=user,
        tenant=getattr(user, "tenant", None),
        target_model="User",
        target_id=str(user.id),
        changes={"token_version": user.token_version},
        description=f"Password reset for user {user.phone_number or user.username or user.id}",
    )

    # Clear throttle lock if user was previously banned/throttled on login
    if user.username:
        login_throttle.register_success(user.username)

    return True, "success", user