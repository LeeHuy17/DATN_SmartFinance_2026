from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserChangeForm, UserCreationForm

from .models import User


class UserCreateForm(UserCreationForm):
    class Meta:
        model = User
        fields = ("email",)


class UserEditForm(UserChangeForm):
    class Meta:
        model = User
        fields = "__all__"


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    form = UserEditForm
    add_form = UserCreateForm

    list_display = ("email", "full_name", "phone", "currency", "is_staff", "is_active", "date_joined")
    list_filter = ("is_staff", "is_superuser", "is_active", "currency")
    search_fields = ("email", "full_name", "phone")
    ordering = ("-date_joined",)

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Thông tin cá nhân", {"fields": ("full_name", "phone", "currency")}),
        ("Phân quyền", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Thời gian", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "password1", "password2"),
        }),
    )
