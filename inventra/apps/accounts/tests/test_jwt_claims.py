"""
Tests verifying custom JWT claims (role, tenant_id) added to access and refresh tokens.
Roadmap reference: Phase 6a (JWT custom claims).
"""

import pytest
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from api.v1.accounts.views.misc import issue_tokens
from tests.factories import UserFactory, TenantFactory

pytestmark = pytest.mark.django_db


class TestJWTCustomClaims:
    """Tests that issue_tokens attaches proper 'role' and 'tenant_id' claims."""

    def test_staff_token_claims(self):
        """Staff tokens must contain role='staff' and the valid tenant_id."""
        tenant = TenantFactory()
        staff_user = UserFactory(role="staff", tenant=tenant)

        tokens = issue_tokens(staff_user)

        # Verify access token claims
        access_token = AccessToken(tokens["access"])
        assert access_token["role"] == "staff"
        assert access_token["tenant_id"] == tenant.id

        # Verify refresh token claims
        refresh_token = RefreshToken(tokens["refresh"])
        assert refresh_token["role"] == "staff"
        assert refresh_token["tenant_id"] == tenant.id

    def test_owner_token_claims(self):
        """Owner tokens must contain role='owner' and their tenant_id."""
        tenant = TenantFactory()
        owner_user = tenant.owner

        tokens = issue_tokens(owner_user)

        access_token = AccessToken(tokens["access"])
        assert access_token["role"] == "owner"
        assert access_token["tenant_id"] == tenant.id

        refresh_token = RefreshToken(tokens["refresh"])
        assert refresh_token["role"] == "owner"
        assert refresh_token["tenant_id"] == tenant.id

    def test_platform_admin_token_claims(self):
        """Platform admin tokens must have role='platform_admin' and tenant_id=None."""
        admin_user = UserFactory(role="platform_admin", tenant=None)

        tokens = issue_tokens(admin_user)

        access_token = AccessToken(tokens["access"])
        assert access_token["role"] == "platform_admin"
        assert access_token["tenant_id"] is None

        refresh_token = RefreshToken(tokens["refresh"])
        assert refresh_token["role"] == "platform_admin"
        assert refresh_token["tenant_id"] is None
