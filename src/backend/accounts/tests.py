from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()

EMAIL = "an@example.com"
PASSWORD = "StrongPass123!"


class AuthTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email=EMAIL, password=PASSWORD, full_name="Nguyen An"
        )

    def _login(self):
        res = self.client.post(
            reverse("login"), {"email": EMAIL, "password": PASSWORD}
        )
        return res.data

    def _auth(self, access):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

    # ---- Đăng ký ----
    def test_register_success(self):
        res = self.client.post(reverse("register"), {
            "email": "binh@example.com",
            "password": PASSWORD,
            "full_name": "Tran Binh",
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertNotIn("password", res.data)
        self.assertTrue(User.objects.filter(email="binh@example.com").exists())

    def test_register_duplicate_email_case_insensitive(self):
        res = self.client.post(reverse("register"), {
            "email": "AN@Example.com", "password": PASSWORD,
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", res.data)

    def test_register_weak_password(self):
        res = self.client.post(reverse("register"), {
            "email": "c@example.com", "password": "123",
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", res.data)

    # ---- Đăng nhập ----
    def test_login_success(self):
        res = self.client.post(
            reverse("login"), {"email": EMAIL, "password": PASSWORD}
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)

    def test_login_wrong_password(self):
        res = self.client.post(
            reverse("login"), {"email": EMAIL, "password": "sai-mat-khau"}
        )
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    # ---- Refresh ----
    def test_refresh_token(self):
        tokens = self._login()
        res = self.client.post(
            reverse("token_refresh"), {"refresh": tokens["refresh"]}
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("access", res.data)

    # ---- Hồ sơ ----
    def test_me_requires_auth(self):
        res = self.client.get(reverse("me"))
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_get(self):
        self._auth(self._login()["access"])
        res = self.client.get(reverse("me"))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["email"], EMAIL)

    def test_me_update(self):
        self._auth(self._login()["access"])
        res = self.client.patch(reverse("me"), {"full_name": "Nguyen Van An"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.full_name, "Nguyen Van An")

    def test_me_cannot_change_email(self):
        self._auth(self._login()["access"])
        self.client.patch(reverse("me"), {"email": "hacker@example.com"})
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, EMAIL)

    # ---- Đăng xuất ----
    def test_logout_blacklists_refresh_token(self):
        tokens = self._login()
        self._auth(tokens["access"])
        res = self.client.post(reverse("logout"), {"refresh": tokens["refresh"]})
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

        res = self.client.post(
            reverse("token_refresh"), {"refresh": tokens["refresh"]}
        )
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
