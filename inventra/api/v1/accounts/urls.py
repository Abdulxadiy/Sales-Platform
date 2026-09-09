from django.urls import path
from api.v1.accounts.views import (
    CompleteProfileView,
    AdminLoginView,
    AdminLoginVerifyOTPView,
    UnbanView,
)


urlpatterns = [
    path('auth/complete-profile/', CompleteProfileView.as_view(), name='complete-profile'),
    path('auth/admin-login/', AdminLoginView.as_view(), name='admin-login'),
    path('auth/admin-login/verify-otp/', AdminLoginVerifyOTPView.as_view(), name='admin-login-verify-otp'),
    path('auth/unban/', UnbanView.as_view(), name='unban'),

]