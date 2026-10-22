from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AvatarView, ChangePasswordView, LoginView, LogoutView, MeView, PasswordResetConfirmView,
    PasswordResetRequestView, PasswordResetVerifyView, RegisterView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", MeView.as_view(), name="me"),
    path("me/avatar/", AvatarView.as_view(), name="avatar"),
    path("change-password/", ChangePasswordView.as_view(), name="change_password"),
    path("password-reset/request/", PasswordResetRequestView.as_view(), name="password_reset_request"),
    path("password-reset/verify/", PasswordResetVerifyView.as_view(), name="password_reset_verify"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password_reset_confirm"),
]
