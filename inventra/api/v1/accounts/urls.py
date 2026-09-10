from django.urls import path
from api.v1.accounts.views import (
    CompleteProfileView,
    AdminLoginView,
    AdminLoginVerifyOTPView,
    UnbanView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
)


urlpatterns = [
    path('auth/complete-profile/', CompleteProfileView.as_view(), name='complete-profile'),
    path('auth/admin-login/', AdminLoginView.as_view(), name='admin-login'),
    path('auth/admin-login/verify-otp/', AdminLoginVerifyOTPView.as_view(), name='admin-login-verify-otp'),
    path('auth/unban/', UnbanView.as_view(), name='unban'),

    # Password setup (first login) and reset (forgot password) — both use the
    # same one-time magic-link flow.  See PasswordResetService for details.
    path('auth/password-reset/request/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('auth/password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
]