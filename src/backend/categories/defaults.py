from .models import Category

# Icon là tên Ionicons và màu thuộc CATEGORY_COLORS của app mobile
# (src/mobile/src/features/transactions/categories.ts) để app hiển thị được
DEFAULTS = [
    # (tên, loại, icon, màu)
    ("Ăn uống", "expense", "cafe-outline", "#E08A1E"),
    ("Di chuyển", "expense", "car-outline", "#2F6FB5"),
    ("Mua sắm", "expense", "cart-outline", "#0F6B4F"),
    ("Hóa đơn & tiện ích", "expense", "flash-outline", "#7C5CB5"),
    ("Nhà ở", "expense", "home-outline", "#8A6A3D"),
    ("Giải trí", "expense", "film-outline", "#1F8A85"),
    ("Sức khỏe", "expense", "heart-outline", "#C8436B"),
    ("Giáo dục", "expense", "book-outline", "#2F6FB5"),
    ("Chi tiêu khác", "expense", "pricetag-outline", "#5E6A65"),
    ("Lương", "income", "wallet-outline", "#0F6B4F"),
    ("Thưởng", "income", "gift-outline", "#E08A1E"),
    ("Đầu tư", "income", "trending-up-outline", "#1F8A85"),
    ("Thu nhập khác", "income", "pricetag-outline", "#5E6A65"),
]


def create_default_categories(user):
    Category.objects.bulk_create(
        Category(user=user, name=n, kind=k, icon=i, color=c) for n, k, i, c in DEFAULTS
    )
