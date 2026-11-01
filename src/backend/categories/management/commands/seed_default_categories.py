from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from categories.defaults import create_default_categories


class Command(BaseCommand):
    help = "Tạo danh mục mặc định cho người dùng chưa có danh mục nào"

    def handle(self, *args, **options):
        count = 0
        for user in get_user_model().objects.filter(categories__isnull=True):
            create_default_categories(user)
            count += 1
        self.stdout.write(f"Đã tạo cho {count} người dùng")
