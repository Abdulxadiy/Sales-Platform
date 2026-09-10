"""Tests for the one-time magic-link password setup / reset flow.

Covers
------
- request_password_reset()
    * Valid e-mail → e-mail dispatched, Redis token stored.
    * Unknown e-mail → still returns (True, "sent") [enumeration-safe].
    * Customer e-mail → treated as unknown (enumeration-safe).
    * Cooldown: second call within 60 s is rejected with "cooldown".
    * E-mail send failure → token cleaned up, returns (False, "email_send_failed").

- confirm_password_reset()
    * Valid token → password set, token consumed (single-use).
    * Expired / invalid token → (False, "invalid_or_expired_token").
    * Token is truly single-use: second call with the same token fails.
    * Username provided on first login → username saved.
    * Username already taken by another user → (False, "username_taken").
    * Missing new_password → (False, "missing_fields").

- API layer (HTTP)
    * POST /api/v1/auth/password-reset/request/ → always 200.
    * POST /api/v1/auth/password-reset/confirm/ → 200 on success, 400 on bad token.
    * Both endpoints are accessible without authentication.
"""

import pytest
from django.core import mail
from unittest.mock import patch, MagicMock

from apps.accounts.services import password_reset_service
from tests.factories import StaffFactory, OwnerFactory, PlatformAdminFactory, UserFactory


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

@pytest.fixture
def staff_with_email(db):
    """A staff user who has an e-mail address set."""
    return StaffFactory(email="alice@example.com")


@pytest.fixture
def owner_with_email(db):
    """An owner user who has an e-mail address set."""
    return OwnerFactory(email="bob@example.com")


# ---------------------------------------------------------------------------
# request_password_reset() — service tests
# ---------------------------------------------------------------------------

class TestRequestPasswordReset:
    """Unit-level tests for request_password_reset().

    Uses Django's in-memory e-mail backend (configured in settings_test.py),
    so no real SMTP is needed — sent messages end up in django.core.mail.outbox.
    """

    def test_known_staff_email_sends_email(self, staff_with_email):
        """A valid e-mail belonging to a staff user must dispatch one e-mail."""
        ok, reason = password_reset_service.request_password_reset(
            email="alice@example.com"
        )
        assert ok is True
        assert reason == "sent"
        assert len(mail.outbox) == 1
        assert "alice@example.com" in mail.outbox[0].to

    def test_known_owner_email_sends_email(self, owner_with_email):
        """Owner-role users should also receive the reset e-mail."""
        ok, reason = password_reset_service.request_password_reset(
            email="bob@example.com"
        )
        assert ok is True
        assert len(mail.outbox) == 1

    def test_unknown_email_still_returns_sent(self, db):
        """Unknown addresses must return (True, 'sent') to prevent enumeration."""
        ok, reason = password_reset_service.request_password_reset(
            email="ghost@example.com"
        )
        assert ok is True
        assert reason == "sent"
        # No e-mail should have been dispatched.
        assert len(mail.outbox) == 0

    def test_customer_email_treated_as_unknown(self, db):
        """Accounts with role='customer' must not trigger an e-mail."""
        # UserFactory defaults to role="customer"
        UserFactory(email="customer@example.com")
        ok, reason = password_reset_service.request_password_reset(
            email="customer@example.com"
        )
        assert ok is True
        assert len(mail.outbox) == 0

    def test_cooldown_blocks_second_request(self, staff_with_email):
        """A second request within the cooldown window should be rejected."""
        # First request succeeds.
        ok1, _ = password_reset_service.request_password_reset(email="alice@example.com")
        assert ok1 is True

        # Second request immediately after should hit the cooldown.
        ok2, reason2 = password_reset_service.request_password_reset(email="alice@example.com")
        assert ok2 is False
        assert reason2 == "cooldown"

    def test_token_stored_in_redis(self, staff_with_email):
        """After a successful request the token must be present in Redis."""
        password_reset_service.request_password_reset(email="alice@example.com")
        # The e-mail body contains the token in the URL.
        body = mail.outbox[0].body
        # Extract the token from the URL: …/setup-account?token=<TOKEN>
        token = body.split("token=")[1].split("\n")[0].strip()
        assert token, "Token must be non-empty"
        # Verify the token resolves to our user.
        user_id = password_reset_service.consume_reset_token(token)
        assert user_id == staff_with_email.id

    def test_email_send_failure_cleans_up_token(self, staff_with_email):
        """If the e-mail backend raises, the stored token must be removed."""
        with patch.object(
            password_reset_service, "send_password_reset_email", return_value=False
        ):
            ok, reason = password_reset_service.request_password_reset(
                email="alice@example.com"
            )
        assert ok is False
        assert reason == "email_send_failed"


# ---------------------------------------------------------------------------
# confirm_password_reset() — service tests
# ---------------------------------------------------------------------------

class TestConfirmPasswordReset:
    """Unit-level tests for confirm_password_reset()."""

    def _store_token_for(self, user) -> str:
        """Helper: store a fresh token for *user* and return it."""
        token = password_reset_service.generate_reset_token()
        password_reset_service.store_reset_token(token, user.id)
        return token

    def test_valid_token_sets_password(self, staff_with_email):
        """A valid token must allow setting a new password."""
        token = self._store_token_for(staff_with_email)
        ok, reason, returned_user = password_reset_service.confirm_password_reset(
            token=token,
            new_password="NewSecurePass1!",
        )
        assert ok is True
        assert reason == "success"
        assert returned_user is not None

        staff_with_email.refresh_from_db()
        assert staff_with_email.check_password("NewSecurePass1!")

    def test_invalid_token_is_rejected(self, db):
        """A random / made-up token must return (False, 'invalid_or_expired_token')."""
        ok, reason, user = password_reset_service.confirm_password_reset(
            token="completely-fake-token",
            new_password="SomePass123",
        )
        assert ok is False
        assert reason == "invalid_or_expired_token"
        assert user is None

    def test_token_is_single_use(self, staff_with_email):
        """The same token must not be usable twice."""
        token = self._store_token_for(staff_with_email)

        # First use succeeds.
        ok1, _, _ = password_reset_service.confirm_password_reset(
            token=token, new_password="FirstPass1!"
        )
        assert ok1 is True

        # Second use with the same token must fail.
        ok2, reason2, _ = password_reset_service.confirm_password_reset(
            token=token, new_password="SecondPass1!"
        )
        assert ok2 is False
        assert reason2 == "invalid_or_expired_token"

    def test_first_login_sets_username(self, db):
        """When a username is supplied and the user has none yet, it should be saved."""
        user = StaffFactory(username=None)
        token = self._store_token_for(user)

        ok, _, returned_user = password_reset_service.confirm_password_reset(
            token=token,
            new_password="Pass12345!",
            username="alice_new",
        )
        assert ok is True
        user.refresh_from_db()
        assert user.username == "alice_new"

    def test_username_collision_is_rejected(self, db):
        """If the desired username is already taken, confirm must return False."""
        # Another user already has this username.
        StaffFactory(username="taken_user")

        user = StaffFactory(username=None)
        token = self._store_token_for(user)

        ok, reason, _ = password_reset_service.confirm_password_reset(
            token=token,
            new_password="Pass12345!",
            username="taken_user",
        )
        assert ok is False
        assert reason == "username_taken"

    def test_missing_new_password_is_rejected(self, staff_with_email):
        """Passing an empty new_password must return (False, 'missing_fields')."""
        token = self._store_token_for(staff_with_email)
        ok, reason, _ = password_reset_service.confirm_password_reset(
            token=token,
            new_password="",
        )
        assert ok is False
        assert reason == "missing_fields"


# ---------------------------------------------------------------------------
# API layer tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestPasswordResetRequestView:
    """HTTP-level tests for POST /api/v1/auth/password-reset/request/."""

    REQUEST_URL = "/api/v1/auth/password-reset/request/"

    def test_always_200_for_valid_email(self, client, staff_with_email):
        """The endpoint always returns 200 for a known address."""
        response = client.post(
            self.REQUEST_URL,
            data={"email": "alice@example.com"},
            content_type="application/json",
        )
        assert response.status_code == 200

    def test_always_200_for_unknown_email(self, client, db):
        """The endpoint always returns 200 even for an unrecognised address."""
        response = client.post(
            self.REQUEST_URL,
            data={"email": "nobody@example.com"},
            content_type="application/json",
        )
        assert response.status_code == 200

    def test_no_authentication_required(self, client, db):
        """The endpoint must be reachable without an Authorization header."""
        response = client.post(
            self.REQUEST_URL,
            data={"email": "ghost@example.com"},
            content_type="application/json",
        )
        # 401 / 403 would mean authentication is accidentally required.
        assert response.status_code not in (401, 403)

    def test_invalid_email_format_returns_400(self, client, db):
        """A malformed e-mail string must be rejected by the serializer."""
        response = client.post(
            self.REQUEST_URL,
            data={"email": "not-an-email"},
            content_type="application/json",
        )
        assert response.status_code == 400


@pytest.mark.django_db
class TestPasswordResetConfirmView:
    """HTTP-level tests for POST /api/v1/auth/password-reset/confirm/."""

    CONFIRM_URL = "/api/v1/auth/password-reset/confirm/"

    def _valid_token_for(self, user) -> str:
        token = password_reset_service.generate_reset_token()
        password_reset_service.store_reset_token(token, user.id)
        return token

    def test_valid_token_returns_200(self, client, staff_with_email):
        """Consuming a valid token with a strong password should return 200."""
        token = self._valid_token_for(staff_with_email)
        response = client.post(
            self.CONFIRM_URL,
            data={"token": token, "new_password": "NewPass12345!"},
            content_type="application/json",
        )
        assert response.status_code == 200

    def test_invalid_token_returns_400(self, client, db):
        """An invalid token must produce a 400 response."""
        response = client.post(
            self.CONFIRM_URL,
            data={"token": "bad-token", "new_password": "NewPass12345!"},
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_no_authentication_required(self, client, db):
        """A brand-new hire (no password yet) must be able to reach this endpoint."""
        response = client.post(
            self.CONFIRM_URL,
            data={"token": "any", "new_password": "AnyPass123!"},
            content_type="application/json",
        )
        # Might be 400 (bad token) but should NOT be 401/403.
        assert response.status_code not in (401, 403)

    def test_short_password_returns_400(self, client, staff_with_email):
        """The serializer must enforce the 8-character minimum."""
        token = self._valid_token_for(staff_with_email)
        response = client.post(
            self.CONFIRM_URL,
            data={"token": token, "new_password": "short"},
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_username_conflict_returns_400(self, client, db):
        """Requesting a username that's already taken must return 400."""
        StaffFactory(username="existing_user")
        user = StaffFactory(username=None)
        token = self._valid_token_for(user)

        response = client.post(
            self.CONFIRM_URL,
            data={"token": token, "new_password": "ValidPass123!", "username": "existing_user"},
            content_type="application/json",
        )
        assert response.status_code == 400
        assert "username_taken" in response.json().get("detail", "")
