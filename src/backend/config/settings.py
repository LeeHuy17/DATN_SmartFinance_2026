import os
from datetime import timedelta
from pathlib import Path

from django.templatetags.static import static
from django.urls import reverse_lazy

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ["DJANGO_SECRET_KEY"]
DEBUG = os.environ.get("DJANGO_DEBUG", "0") == "1"
ALLOWED_HOSTS = [h for h in os.environ.get("DJANGO_ALLOWED_HOSTS", "").split(",") if h]
# Domain HTTPS khi deploy (vd https://finbuddy.eastasia.cloudapp.azure.com), cần để đăng nhập trang admin không lỗi CSRF
CSRF_TRUSTED_ORIGINS = [o for o in os.environ.get("DJANGO_CSRF_TRUSTED_ORIGINS", "").split(",") if o]
# Chỉ bật khi chạy sau proxy HTTPS (Caddy trên VM): proxy chuyển tiếp bằng HTTP kèm X-Forwarded-Proto,
# thiếu dòng này thì URL ảnh trả về là http:// và app Android chặn tải
if os.environ.get("DJANGO_BEHIND_HTTPS_PROXY", "0") == "1":
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

INSTALLED_APPS = [
    # Giao diện admin, phải đặt trước django.contrib.admin để ghi đè template
    "unfold",
    "unfold.contrib.filters",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",          # nếu dùng Django REST Framework cho API mobile
    "rest_framework_simplejwt.token_blacklist",  # để hỗ trợ logout
    "corsheaders",
    "django_filters",
    "accounts",
    "transactions",
    "categories.apps.CategoriesConfig",
    "wallets",
    "budgets",
    "reports",
    "notifications",
    "advisor",
    "receipts",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",   # phải đặt trên CommonMiddleware
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# Cho phép app mobile gọi API khi đang phát triển
CORS_ALLOW_ALL_ORIGINS = DEBUG

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ["POSTGRES_DB"],
        "USER": os.environ["POSTGRES_USER"],
        "PASSWORD": os.environ["POSTGRES_PASSWORD"],
        "HOST": os.environ.get("POSTGRES_HOST", "db"),
        "PORT": os.environ.get("POSTGRES_PORT", "5432"),
    }
}

AUTH_USER_MODEL = "accounts.User"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    # Chỉ áp dụng cho view có throttle_scope tương ứng (ScopedRateThrottle)
    "DEFAULT_THROTTLE_RATES": {
        "advisor": "20/hour",
        "avatar_upload": "20/hour",
        "receipt_scan": "30/hour",
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "vi"
TIME_ZONE = "Asia/Ho_Chi_Minh"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Email: gửi qua Gmail SMTP khi đã cấu hình EMAIL_HOST_USER, nếu chưa thì in email ra log (dev)
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
# App Password Google hiển thị dạng "abcd efgh ijkl mnop", bỏ khoảng trắng cho chắc
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "").replace(" ", "")
if EMAIL_HOST_USER:
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_HOST = "smtp.gmail.com"
    EMAIL_PORT = 587
    EMAIL_USE_TLS = True
    EMAIL_TIMEOUT = 15
else:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
DEFAULT_FROM_EMAIL = os.environ.get(
    "DEFAULT_FROM_EMAIL", f"FinBuddy <{EMAIL_HOST_USER or 'no-reply@finbuddy.local'}>"
)

# Trợ lý AI (Groq, API tương thích OpenAI). Llama 3.3 70B đã bị Groq gỡ ngày 16/08/2026,
# nên tên model đọc từ .env để đổi mà không sửa code
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")
GROQ_TIMEOUT = int(os.environ.get("GROQ_TIMEOUT", "30"))


# Quét hóa đơn (EasyOCR + OpenCV, chạy ngay trên server)
OCR_LANGUAGES = ["vi", "en"]
OCR_MODEL_DIR = os.environ.get("OCR_MODEL_DIR", str(BASE_DIR / "ocr_models"))
OCR_PERSPECTIVE = os.environ.get("OCR_PERSPECTIVE", "1") == "1"  # tắt nếu tự cắt khung bị sai

# Giao diện trang admin (django-unfold)
UNFOLD = {
    "SITE_TITLE": "FinBuddy Admin",
    "SITE_HEADER": "FinBuddy",
    "SITE_SUBHEADER": "Trang quản trị",
    "SITE_SYMBOL": "account_balance_wallet",  # tên icon Material Symbols
    "SITE_URL": None,  # backend chỉ có API, không có trang chủ để quay về
    "SHOW_VIEW_ON_SITE": False,
    "DASHBOARD_CALLBACK": "config.admin_dashboard.dashboard_callback",
    "STYLES": [lambda request: static("admin/smartfinance.css")],
    "COLORS": {
        # Cùng tông xanh với app mobile: 600 là primary (#0F6B4F), 500 là primary chế độ tối (#1F9A6F)
        "primary": {
            "50": "oklch(97.6% .015 166)",
            "100": "oklch(93.6% .03 166)",
            "200": "oklch(88% .055 166)",
            "300": "oklch(80% .09 165)",
            "400": "oklch(70% .12 164)",
            "500": "oklch(61.1% .123 163.7)",
            "600": "oklch(47% .093 166.3)",
            "700": "oklch(41% .082 166)",
            "800": "oklch(36% .07 167)",
            "900": "oklch(31% .056 168)",
            "950": "oklch(24% .042 168)",
        },
    },
    "SIDEBAR": {
        "show_search": True,
        "show_all_applications": True,
        "navigation": [
            {
                "items": [
                    {"title": "Tổng quan", "icon": "dashboard", "link": reverse_lazy("admin:index")},
                ],
            },
            {
                "title": "Người dùng",
                "separator": True,
                "items": [
                    {
                        "title": "Tài khoản",
                        "icon": "person",
                        "link": reverse_lazy("admin:accounts_user_changelist"),
                        "permission": lambda request: request.user.has_perm("accounts.view_user"),
                    },
                    {
                        "title": "Nhóm quyền",
                        "icon": "group",
                        "link": reverse_lazy("admin:auth_group_changelist"),
                        "permission": lambda request: request.user.has_perm("auth.view_group"),
                    },
                ],
            },
            {
                "title": "Tài chính",
                "separator": True,
                "items": [
                    {
                        "title": "Giao dịch",
                        "icon": "receipt_long",
                        "link": reverse_lazy("admin:transactions_transaction_changelist"),
                        "permission": lambda request: request.user.has_perm("transactions.view_transaction"),
                    },
                    {
                        "title": "Ví",
                        "icon": "account_balance_wallet",
                        "link": reverse_lazy("admin:wallets_wallet_changelist"),
                        "permission": lambda request: request.user.has_perm("wallets.view_wallet"),
                    },
                    {
                        "title": "Danh mục",
                        "icon": "category",
                        "link": reverse_lazy("admin:categories_category_changelist"),
                        "permission": lambda request: request.user.has_perm("categories.view_category"),
                    },
                    {
                        "title": "Ngân sách",
                        "icon": "savings",
                        "link": reverse_lazy("admin:budgets_budget_changelist"),
                        "permission": lambda request: request.user.has_perm("budgets.view_budget"),
                    },
                ],
            },
            {
                "title": "Thông báo & trợ lý AI",
                "separator": True,
                "items": [
                    {
                        "title": "Thông báo",
                        "icon": "notifications",
                        "link": reverse_lazy("admin:notifications_notification_changelist"),
                        "permission": lambda request: request.user.has_perm("notifications.view_notification"),
                    },
                    {
                        "title": "Cài đặt thông báo",
                        "icon": "tune",
                        "link": reverse_lazy("admin:notifications_notificationsetting_changelist"),
                        "permission": lambda request: request.user.has_perm("notifications.view_notificationsetting"),
                    },
                    {
                        "title": "Báo cáo AI",
                        "icon": "smart_toy",
                        "link": reverse_lazy("admin:advisor_advisorreport_changelist"),
                        "permission": lambda request: request.user.has_perm("advisor.view_advisorreport"),
                    },
                ],
            },
        ],
    },
}
