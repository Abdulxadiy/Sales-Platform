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


import json

def store_reset_token(
    token: str,
    user_id: int,
    purpose: str = "reset_password",
    extra_context: dict | None = None,
) -> None:
    """
    Store the token mapped to user_id, purpose, and context metadata with 24-hour expiration
    and set the 60-second cooldown key.
    """
    payload = {
        "user_id": user_id,
        "purpose": purpose,
        "extra_context": extra_context or {},
    }
    redis_client.set(_token_key(token), json.dumps(payload), ex=TOKEN_TTL_SECONDS)
    redis_client.set(_cooldown_key(user_id), "1", ex=COOLDOWN_SECONDS)


def _parse_token_raw(raw_val: str | None) -> dict | None:
    """Safely parse token payload, supporting both new JSON format and legacy integer string."""
    if raw_val is None:
        return None
    try:
        data = json.loads(raw_val)
        if isinstance(data, dict):
            return data
    except (json.JSONDecodeError, ValueError, TypeError):
        pass
    # Legacy fallback: raw string was just user_id integer
    try:
        return {
            "user_id": int(raw_val),
            "purpose": "reset_password",
            "extra_context": {},
        }
    except (ValueError, TypeError):
        return None


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

    raw_val = results[0]
    parsed = _parse_token_raw(raw_val)
    if not parsed:
        return None
    return parsed.get("user_id")


def peek_reset_token(token: str) -> dict | None:
    """
    Inspect token metadata without deleting it.
    Used by frontend on mount to validate token and retrieve tailored UI context.
    """
    if not token:
        return None
    key = _token_key(token)
    raw_val = redis_client.get(key)
    parsed = _parse_token_raw(raw_val)
    if not parsed:
        return None

    user_id = parsed.get("user_id")
    if not user_id:
        return None

    user = User.objects.filter(id=user_id).first()
    if not user:
        return None

    ctx = parsed.get("extra_context") or {}
    tenant_name = ctx.get("tenant_name")
    if not tenant_name:
        if hasattr(user, "tenant") and user.tenant:
            tenant_name = user.tenant.name
        elif hasattr(user, "employees"):
            emp = user.employees.filter(is_active=True).select_related("tenant").first()
            if emp and emp.tenant:
                tenant_name = emp.tenant.name

    from apps.accounts.services.phone_utils import mask_phone_number

    return {
        "valid": True,
        "purpose": parsed.get("purpose", "reset_password"),
        "has_username": bool(user.username),
        "username": user.username or "",
        "phone_hint": mask_phone_number(user.phone_number) if user.phone_number else "",
        "email_hint": mask_email(user.email) if user.email else "",
        "tenant_name": tenant_name or "",
        "position": ctx.get("position", ""),
        "role": user.role,
    }


def _resolve_email_copy(
    purpose: str,
    user,
    extra_context: dict | None = None,
) -> dict:
    """
    Resolve email subject, title, body, CTA, and hints based on the purpose:
    - 'reset_password': User forgot password on Login or requested reset from Profile.
    - 'new_owner': Brand-new tenant store owner onboarding.
    - 'new_employee': Brand-new employee onboarding invitation.
    - 'transfer_owner': Tenant store ownership transferred to user.
    """
    ctx = extra_context or {}
    tenant_name = ctx.get("tenant_name", "")
    position = ctx.get("position", "")

    if purpose == "new_owner":
        tenant_badge = f" (Do‘kon: <strong>{tenant_name}</strong>)" if tenant_name else ""
        return {
            "subject": "Inventra — Yangi do‘koningiz yaratildi! Hisobingizni faollashtiring",
            "title": "Do‘koningizga xush kelibsiz! 🎉",
            "message_html": (
                f"Assalomu alaykum! Siz Inventra savdo platformasiga do‘kon egasi sifatida ro‘yxatdan o‘tkazildingiz{tenant_badge}. "
                "Do‘koningizni boshqarish, tovarlarni kiritish va savdoni yo‘lga qo‘yish uchun shaxsiy parolingizni belgilang va hisobingizni faollashtiring."
            ),
            "plain_intro": (
                f"Siz Inventra platformasiga do‘kon egasi sifatida ro‘yxatdan o‘tkazildingiz{f' ({tenant_name})' if tenant_name else ''}.\n"
                "Do‘koningizni boshqarishni boshlash uchun shaxsiy parolingizni belgilang va hisobingizni faollashtiring."
            ),
            "button_text": "Hisobni faollashtirish &rarr;",
            "step_title": "🚀 Boshlash uchun qadamlar:",
            "step_desc": "1. Shaxsiy parol va username belgilang &rarr; 2. Telegram orqali 2FA kodni tasdiqlang &rarr; 3. Do‘koningiz boshqaruv paneliga to‘g‘ridan-to‘g‘ri kiring.",
            "security_note": "🔒 Ushbu xavfsiz havola <strong>24 soat</strong> davomida faqat bir marta foydalanish uchun amal qiladi. Xavfsizligingiz uchun parolingizni hech kimga bermang.",
        }

    elif purpose == "new_employee":
        pos_str = f" ({position})" if position else ""
        tenant_badge = f" (Do‘kon: <strong>{tenant_name}</strong>)" if tenant_name else ""
        return {
            "subject": "Inventra — Siz jamoaga taklif qilindingiz",
            "title": "Inventra jamoasiga xush kelibsiz! 👋",
            "message_html": (
                f"Assalomu alaykum! Siz Inventra tizimiga do‘kon xodimi{pos_str} sifatida taklif qilindingiz{tenant_badge}. "
                "Tizimda ishlashni boshlash uchun shaxsiy parolingizni belgilang va hisobingizni faollashtiring."
            ),
            "plain_intro": (
                f"Siz Inventra tizimiga xodim{pos_str} sifatida taklif qilindingiz.\n"
                "Tizimda ishlashni boshlash uchun shaxsiy parolingizni o‘rnating."
            ),
            "button_text": "Parol o‘rnatish va kirish &rarr;",
            "step_title": "💡 Keyingi qadam:",
            "step_desc": "Parol belgilagach, telefoningizga Telegram orqali kelgan 6 xonali tasdiqlash kodini kiritib tizimga kirasiz.",
            "security_note": "🔒 Ushbu taklif havolasi <strong>24 soat</strong> davomida amal qiladi.",
        }

    elif purpose == "transfer_owner":
        tenant_badge = f" (<strong>{tenant_name}</strong>)" if tenant_name else ""
        return {
            "subject": "Inventra — Do‘kon egaligi sizga topshirildi",
            "title": "Do‘kon boshqaruvi topshirildi 🏢",
            "message_html": (
                f"Assalomu alaykum! Sizga Inventra tizimidagi do‘kon{tenant_badge} egaligi va to‘liq boshqaruv huquqi topshirildi. "
                "Yangi boshqaruvchi sifatida tizimga kirish uchun shaxsiy parolingizni belgilang."
            ),
            "plain_intro": (
                f"Sizga Inventra tizimidagi do‘kon{f' ({tenant_name})' if tenant_name else ''} egaligi topshirildi.\n"
                "Tizimga kirish uchun shaxsiy parolingizni belgilang."
            ),
            "button_text": "Boshqaruvni qabul qilish &rarr;",
            "step_title": "💡 Keyingi qadam:",
            "step_desc": "Parol o‘rnatilgach, Telegram orqali xavfsizlik tasdig‘idan o‘tib, do‘koningizni to‘liq boshqarishni boshlaysiz.",
            "security_note": "🔒 Ushbu havola <strong>24 soat</strong> davomida faqat bir marta foydalanish uchun amal qiladi.",
        }

    else:
        # Default: reset_password
        return {
            "subject": "Inventra — Parolingizni qayta tiklash",
            "title": "Parolingizni qayta tiklash",
            "message_html": (
                "Assalomu alaykum! Sizning Inventra hisobingiz uchun parolni qayta tiklash so‘rovi qabul qilindi. "
                "Yangi xavfsiz parol o‘rnatish uchun quyidagi tugmani bosing."
            ),
            "plain_intro": (
                "Sizning Inventra hisobingiz uchun parolni qayta tiklash so‘rovi qabul qilindi.\n"
                "Yangi xavfsiz parol o‘rnatish uchun quyidagi havoladan foydalaning."
            ),
            "button_text": "Parolni qayta tiklash &rarr;",
            "step_title": "💡 Keyingi qadam:",
            "step_desc": "Yangi parol belgilagach, hisobingiz xavfsizligi uchun Telegram orqali 6 xonali tasdiqlash kodi yuboriladi va tizimga avtomatik kirasiz.",
            "security_note": (
                "🔒 Ushbu havola <strong>24 soat</strong> davomida faqat bir marta foydalanish uchun amal qiladi. "
                "Agar bu so‘rovni siz yubormagan bo‘lsangiz, xavotir olmang — parolingiz o‘zgarmaydi. Xatni shunchaki e’tiborsiz qoldirishingiz mumkin."
            ),
        }


def send_password_reset_email(
    user,
    token: str,
    purpose: str = "reset_password",
    extra_context: dict | None = None,
) -> bool:
    """
    Send an email containing the one-time account setup / password reset link
    both in plain text and formatted responsive HTML for Gmail/clients.
    Supports tailored messaging for password resets, new store owners, new employees, etc.
    """
    reset_url = f"{settings.FRONTEND_URL}/setup-account?token={token}"
    copy = _resolve_email_copy(purpose, user, extra_context=extra_context)

    subject = copy["subject"]
    title = copy["title"]
    message_html = copy["message_html"]
    button_text = copy["button_text"]
    step_title = copy["step_title"]
    step_desc = copy["step_desc"]
    security_note = copy["security_note"]

    # Plain text version for non-HTML clients
    plain_message = (
        f"Assalomu alaykum,\n\n"
        f"{copy['plain_intro']}\n\n"
        f"Tizimga kirish uchun havola:\n"
        f"{reset_url}\n\n"
        f"{step_title} {step_desc}\n\n"
        f"Ushbu havola 24 soat davomida faqat bir marta foydalanish uchun amal qiladi.\n"
        f"Agar bu so‘rovni siz yubormagan bo‘lsangiz, xatni e’tiborsiz qoldirishingiz mumkin."
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
                    {title}
                  </h1>

                  <!-- Message -->
                  <p style="font-size: 14.5px; line-height: 1.65; color: #475569; margin: 0 0 28px 0;">
                    {message_html}
                  </p>

                  <!-- Primary Action Button -->
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 28px 0;">
                    <tr>
                      <td align="center" style="background-color: #0f172a; border-radius: 10px;">
                        <a href="{reset_url}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 14.5px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 10px; letter-spacing: -0.01em;">
                          {button_text}
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Next Step Note -->
                  <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; padding: 14px 18px; margin: 0 0 24px 0;">
                    <div style="font-size: 12.5px; font-weight: 700; color: #334155; margin-bottom: 4px;">
                      {step_title}
                    </div>
                    <div style="font-size: 12.5px; line-height: 1.55; color: #64748b;">
                      {step_desc}
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
                    {security_note}
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
    logger.warning("EMAIL JO'NATISH [%s, purpose=%s]: %s", user.email, purpose, reset_url)
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
        logger.info("Email muvaffaqiyatli jo'natildi: %s (purpose=%s)", user.email, purpose)
        return True
    except Exception as exc:
        logger.error("Email jo'natishda xatolik yuz berdi (%s): %s", user.email, exc)
        return False


def request_password_reset(
    email: str = "",
    identifier: str = "",
    return_hint: bool = False,
    purpose: str = "auto",
    extra_context: dict | None = None,
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

    # Smart auto-detection of email purpose if caller left as 'auto'
    resolved_purpose = purpose
    if resolved_purpose == "auto":
        if not user.has_usable_password():
            if user.role == "owner":
                resolved_purpose = "new_owner"
            elif user.role == "staff":
                resolved_purpose = "new_employee"
            else:
                resolved_purpose = "reset_password"
        else:
            resolved_purpose = "reset_password"

    token = generate_reset_token()
    store_reset_token(
        token,
        user.id,
        purpose=resolved_purpose,
        extra_context=extra_context,
    )

    sent = send_password_reset_email(
        user,
        token,
        purpose=resolved_purpose,
        extra_context=extra_context,
    )
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


def request_password_reset_with_hint(
    identifier: str,
    purpose: str = "reset_password",
    extra_context: dict | None = None,
) -> tuple[bool, str, str | None]:
    """Helper returning (ok, reason, email_hint) for API views."""
    return request_password_reset(
        identifier=identifier,
        return_hint=True,
        purpose=purpose,
        extra_context=extra_context,
    )


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