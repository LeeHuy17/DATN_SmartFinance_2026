import os
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ["DJANGO_SECRET_KEY"]
DEBUG = os.environ.get("DJANGO_DEBUG", "0") == "1"
ALLOWED_HOSTS = [h for h in os.environ.get("DJANGO_ALLOWED_HOSTS", "").split(",") if h]

INSTALLED_APPS = [
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
        "DIRS": [],
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
    "DEFAULT_FROM_EMAIL", f"Smart Finance <{EMAIL_HOST_USER or 'no-reply@smartfinance.local'}>"
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
