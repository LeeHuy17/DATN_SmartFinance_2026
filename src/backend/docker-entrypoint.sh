#!/bin/sh
# Chỉ service web (DJANGO_MIGRATE=1) chạy migrate và collectstatic trước khi khởi động,
# để scheduler dùng chung image không migrate song song.
set -e

if [ "$DJANGO_MIGRATE" = "1" ]; then
    python manage.py migrate --noinput
    python manage.py collectstatic --noinput
fi

exec "$@"
