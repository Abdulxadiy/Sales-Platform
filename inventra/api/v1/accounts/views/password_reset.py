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
)
from apps.accounts.services import password_reset_service

__all__ = ["PasswordResetRequestView", "PasswordResetConfirmView"]


class PasswordResetRequestView(APIView):
    """POST /api/v1/auth/password-reset/request/

    Accept an e-mail address and dispatch a magic-link e-mail to that address
    if a staff/owner/platform_admin account with that e-mail exists.

    The response is always HTTP 200 regardless of whether the address was found
    in the database — this prevents user-enumeration attacks.
    """

    permission_classes = [AllowAny]
    # Light throttle should be applied here via a throttle_classes setting or
    # a dedicated middleware layer — left to the infrastructure team.

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # The service always returns (True, "sent") or (False, <reason>).
        # We deliberately swallow the internal reason and always return 200.
        password_reset_service.request_password_reset(
            email=serializer.validated_data["email"]
        )

        return Response(
            {"detail": "If that e-mail address is registered, a reset link has been sent."},
            status=status.HTTP_200_OK,
        )


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

        ok, reason, _user = password_reset_service.confirm_password_reset(
            token=serializer.validated_data["token"],
            new_password=serializer.validated_data["new_password"],
            username=serializer.validated_data.get("username", ""),
        )

        if not ok:
            return Response({"detail": reason}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {"detail": "Password set successfully. You can now log in."},
            status=status.HTTP_200_OK,
        )
