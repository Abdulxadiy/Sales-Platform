"""Views for the one-time magic-link password setup / reset flow.

Both endpoints are intentionally *unauthenticated* — a brand-new employee who
has never set a password must be able to reach them before they can log in.

Flow
----
1. Owner/platform_admin hires a staff member and optionally supplies their
   e-mail address.  ``EmployeeHireView`` calls ``EmployeeService.hire()``,
   which delegates to ``PasswordResetService.request_password_reset()`` to
   send the first-login magic link.

2. Alternatively, an existing user who forgot their password calls
   ``POST /api/v1/auth/password-reset/request/`` with their e-mail address.

3. The user clicks the link in their inbox, which hits the frontend.  The
   frontend sends the opaque token + desired password (+ optional username for
   first-time setup) to ``POST /api/v1/auth/password-reset/confirm/``.

4. ``PasswordResetService.confirm_password_reset()`` validates the token
   atomically via Redis pipeline (single-use guarantee), sets the password,
   and — if a username was provided — sets it too.
"""

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from api.v1.accounts.serializers import (
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    ChangePasswordWithOldSerializer,
)
from apps.accounts.services import password_reset_service, login_throttle
from apps.accounts.services.phone_utils import mask_phone_number
from api.v1.accounts.views.misc import (
    get_telegram_contact_or_error,
    send_otp_or_error,
)

__all__ = [
    "PasswordResetRequestView",
    "PasswordResetConfirmView",
    "ChangePasswordWithOldView",
    "PasswordResetVerifyView",
]


class PasswordResetRequestView(APIView):
    """POST /api/v1/auth/password-reset/request/

    Accept a login (username, phone, or email) and dispatch a magic-link
    email to the associated email address if the account exists.

    Returns the masked email (e.g. ab***ov@gmail.com) without exposing
    the full address.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        identifier = serializer.validated_data.get("identifier") or serializer.validated_data.get("email") or ""
        ok, reason, email_hint = password_reset_service.request_password_reset_with_hint(
            identifier=identifier,
            purpose="reset_password",
        )

        if reason == "no_email":
            return Response(
                {
                    "detail": "Ushbu hisobga email manzili biriktirilmagan. Parolni eski parol orqali yangilashingiz mumkin.",
                    "has_email": False,
                    "email_hint": None,
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {
                "detail": (
                    f"Parolni tiklash havolasi emailingizga ({email_hint}) yuborildi. Agar xat kelmasa, iltimos, 'Spam' papkasini ham tekshiring."
                    if email_hint
                    else "Tiklash havolasi emailingizga yuborildi. Agar xat kelmasa, iltimos, 'Spam' papkasini ham tekshiring."
                ),
                "has_email": bool(email_hint),
                "email_hint": email_hint,
            },
            status=status.HTTP_200_OK,
        )


class ChangePasswordWithOldView(APIView):
    """POST /api/v1/auth/password-reset/change-with-old/

    Allows resetting password using old/current password when email is inaccessible.
    Protected against brute-force attacks via login_throttle.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ChangePasswordWithOldSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        login = serializer.validated_data["login"]
        old_password = serializer.validated_data["old_password"]
        new_password = serializer.validated_data["new_password"]

        locked, remaining = login_throttle.is_locked(login)
        if locked:
            return Response(
                {
                    "detail": (
                        "Ushbu hisobga kirish urinishlari ko‘payib ketgani sababli "
                        f"vaqtincha bloklandi. Iltimos, {remaining} soniyadan keyin qayta urinib ko‘ring."
                    ),
                    "retry_after_seconds": remaining,
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        ok, msg, user = password_reset_service.change_password_with_old(
            login=login,
            old_password=old_password,
            new_password=new_password,
        )

        if not ok:
            login_throttle.register_failure(login)
            return Response({"detail": msg}, status=status.HTTP_400_BAD_REQUEST)

        login_throttle.register_success(login)
        return Response({"detail": msg}, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    """POST /api/v1/auth/password-reset/confirm/

    Consume a one-time token (from the magic link URL) and set a new password.

    Optional ``username`` field: only needed when the user is setting their
    password for the very first time and has no username yet.  If the user
    already has a username the field is silently ignored.

    Possible error responses
    ------------------------
    400 — invalid / expired token.
    400 — username already taken by another account.
    400 — new_password too short (< 8 chars, validated by the serializer).
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ok, reason, user = password_reset_service.confirm_password_reset(
            token=serializer.validated_data["token"],
            new_password=serializer.validated_data["new_password"],
            username=serializer.validated_data.get("username", ""),
        )

        if not ok:
            return Response({"detail": reason}, status=status.HTTP_400_BAD_REQUEST)

        # Trigger 2FA Telegram OTP right after password setup
        contact, _err = get_telegram_contact_or_error(user.phone_number)
        otp_sent = False
        if contact:
            send_err = send_otp_or_error(user.phone_number, contact)
            otp_sent = (send_err is None)

        return Response(
            {
                "detail": "Password set successfully. Verification code sent to Telegram.",
                "username": user.username or user.phone_number,
                "phone_number": user.phone_number,
                "phone_hint": mask_phone_number(user.phone_number),
                "telegram_linked": contact is not None,
                "otp_sent": otp_sent,
            },
            status=status.HTTP_200_OK,
        )


class PasswordResetVerifyView(APIView):
    """GET /api/v1/auth/password-reset/verify/?token=<token>

    Validates a password reset or onboarding setup token and returns tailored UI metadata
    (purpose, tenant_name, position, username, masked phone/email).
    Does NOT consume the token (read-only peek).
    """

    permission_classes = [AllowAny]

    def get(self, request):
        token = request.query_params.get("token", "").strip()
        if not token:
            return Response(
                {"valid": False, "detail": "Xavfsizlik tokeni kiritilmadi."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        info = password_reset_service.peek_reset_token(token)
        if not info:
            return Response(
                {
                    "valid": False,
                    "detail": "Ushbu havola eskirgan yoki undan allaqachon foydalanilgan.",
                },
                status=status.HTTP_200_OK,
            )

        return Response(info, status=status.HTTP_200_OK)

