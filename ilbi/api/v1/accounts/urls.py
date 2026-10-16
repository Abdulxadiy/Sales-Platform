from django.urls import path

from api.v1.accounts.views import (
    AcceptTermsView,
    AdminLoginSendOTPView,
    AdminLoginTelegramStatusView,
    AdminLoginVerifyOTPView,
    AdminLoginView,
    ChangePasswordView,
    ChangePasswordWithOldView,
    CompleteProfileView,
    DocumentationView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    PasswordResetResumeView,
    PasswordResetVerifyView,
    UnbanView,
    UserAvatarUploadView,
    UserProfileView,
)
from api.v1.accounts.views.token_refresh import RevocableTokenRefreshView

from .views.docs_views import documentation_image

urlpatterns = [
    path('docs/images/<str:filename>', documentation_image, name='documentation-image'),
    path('auth/token/refresh/', RevocableTokenRefreshView.as_view(), name='token-refresh'),
    path('auth/profile/', UserProfileView.as_view(), name='user-profile'),
    path('auth/me/', UserProfileView.as_view(), name='current-user-profile'),
    path('auth/profile/avatar/', UserAvatarUploadView.as_view(), name='user-avatar-upload'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('auth/complete-profile/', CompleteProfileView.as_view(), name='complete-profile'),
    path('auth/accept-terms/', AcceptTermsView.as_view(), name='accept-terms'),
    path('docs/', DocumentationView.as_view(), name='documentation'),
    path('auth/admin-login/', AdminLoginView.as_view(), name='admin-login'),
    path(
        'auth/admin-login/telegram-status/',
        AdminLoginTelegramStatusView.as_view(),
        name='admin-login-telegram-status',
    ),
    path('auth/admin-login/send-otp/', AdminLoginSendOTPView.as_view(), name='admin-login-send-otp'),
    path('auth/admin-login/verify-otp/', AdminLoginVerifyOTPView.as_view(), name='admin-login-verify-otp'),
    path('auth/unban/', UnbanView.as_view(), name='unban'),

    # Password setup (first login) and reset (forgot password) — both use the
    # same one-time magic-link flow.  See PasswordResetService for details.
    path('auth/password-reset/request/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('auth/password-reset/verify/', PasswordResetVerifyView.as_view(), name='password-reset-verify'),
    path('auth/password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('auth/password-reset/resume/', PasswordResetResumeView.as_view(), name='password-reset-resume'),
    path(
        'auth/password-reset/change-with-old/',
        ChangePasswordWithOldView.as_view(),
        name='password-reset-change-with-old',
    ),
]
