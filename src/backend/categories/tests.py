from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .defaults import DEFAULTS
from .models import Category

User = get_user_model()


class CategoryTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="an@example.com", password="StrongPass123!")
        self.other = User.objects.create_user(email="binh@example.com", password="StrongPass123!")
        self.client.force_authenticate(self.user)

    def test_register_seeds_default_categories(self):
        self.assertEqual(self.user.categories.count(), len(DEFAULTS))

    def test_list_only_own_categories(self):
        res = self.client.get(reverse("category-list"))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), len(DEFAULTS))
        own_ids = set(self.user.categories.values_list("id", flat=True))
        self.assertTrue({c["id"] for c in res.data} <= own_ids)

    def test_filter_by_kind(self):
        res = self.client.get(reverse("category-list"), {"kind": "income"})
        self.assertTrue(res.data)
        self.assertTrue(all(c["kind"] == "income" for c in res.data))

    def test_create_category(self):
        res = self.client.post(reverse("category-list"), {
            "name": "Thú cưng", "kind": "expense", "icon": "paw", "color": "#AABBCC",
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(self.user.categories.filter(name="Thú cưng").exists())

    def test_duplicate_name_same_kind_rejected(self):
        res = self.client.post(reverse("category-list"), {"name": "ăn uống", "kind": "expense"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", res.data)

    def test_same_name_other_kind_allowed(self):
        res = self.client.post(reverse("category-list"), {"name": "Ăn uống", "kind": "income"})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_invalid_color_rejected(self):
        res = self.client.post(reverse("category-list"), {"name": "X", "kind": "expense", "color": "red"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_and_delete_own_category(self):
        cat = self.user.categories.first()
        res = self.client.patch(reverse("category-detail", args=[cat.pk]), {"name": "Ăn ngoài"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        res = self.client.delete(reverse("category-detail", args=[cat.pk]))
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

    def test_cannot_touch_other_users_category(self):
        cat = self.other.categories.first()
        url = reverse("category-detail", args=[cat.pk])
        self.assertEqual(self.client.get(url).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.delete(url).status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Category.objects.filter(pk=cat.pk).exists())

    def test_requires_auth(self):
        self.client.force_authenticate(None)
        res = self.client.get(reverse("category-list"))
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_seed_command_only_for_users_without_categories(self):
        self.user.categories.all().delete()
        out = StringIO()
        call_command("seed_default_categories", stdout=out)
        self.assertIn("1", out.getvalue())
        self.assertEqual(self.user.categories.count(), len(DEFAULTS))
        self.assertEqual(self.other.categories.count(), len(DEFAULTS))

    def test_hide_category(self):
        cat = self.user.categories.first()
        res = self.client.patch(reverse("category-detail", args=[cat.pk]), {"is_hidden": True})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["is_hidden"])
