import re
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core import mail
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import PasswordResetCode

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


class PasswordResetTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email=EMAIL, password=PASSWORD, full_name="Nguyen An"
        )

    def _request(self, email=EMAIL):
        return self.client.post(reverse("password_reset_request"), {"email": email})

    def _code_from_mail(self):
        return re.search(r"\b(\d{6})\b", mail.outbox[-1].body).group(1)

    def _verify(self, code, email=EMAIL):
        return self.client.post(
            reverse("password_reset_verify"), {"email": email, "code": code}
        )

    def _reset_token(self):
        self._request()
        return self._verify(self._code_from_mail()).data["reset_token"]

    def test_request_sends_code_email(self):
        res = self._request("AN@Example.com")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [EMAIL])
        self.assertRegex(mail.outbox[0].body, r"\b\d{6}\b")

    def test_request_unknown_email_same_response_no_mail(self):
        res = self._request("khong-ton-tai@example.com")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data, self._request().data)
        self.assertEqual(len(mail.outbox), 1)  # chỉ email có thật mới nhận mail

    def test_request_cooldown(self):
        self._request()
        self._request()
        self.assertEqual(len(mail.outbox), 1)

    def test_resend_invalidates_old_code(self):
        self._request()
        old_code = self._code_from_mail()
        PasswordResetCode.objects.update(created_at=timezone.now() - timedelta(minutes=2))
        self._request()
        self.assertEqual(len(mail.outbox), 2)
        if old_code != self._code_from_mail():
            self.assertEqual(self._verify(old_code).status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self._verify(self._code_from_mail()).status_code, status.HTTP_200_OK)

    def test_verify_wrong_code(self):
        self._request()
        wrong = "000000" if self._code_from_mail() != "000000" else "111111"
        res = self._verify(wrong)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_verify_too_many_attempts(self):
        self._request()
        code = self._code_from_mail()
        wrong = "000000" if code != "000000" else "111111"
        for _ in range(5):
            self._verify(wrong)
        self.assertEqual(self._verify(code).status_code, status.HTTP_400_BAD_REQUEST)

    def test_verify_expired_code(self):
        self._request()
        PasswordResetCode.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
        res = self._verify(self._code_from_mail())
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_code_single_use(self):
        self._request()
        code = self._code_from_mail()
        self.assertEqual(self._verify(code).status_code, status.HTTP_200_OK)
        self.assertEqual(self._verify(code).status_code, status.HTTP_400_BAD_REQUEST)

    def test_confirm_resets_password_and_revokes_sessions(self):
        old_refresh = self.client.post(
            reverse("login"), {"email": EMAIL, "password": PASSWORD}
        ).data["refresh"]

        res = self.client.post(reverse("password_reset_confirm"), {
            "reset_token": self._reset_token(), "new_password": "NewStrong456!",
        })
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewStrong456!"))
        res = self.client.post(reverse("token_refresh"), {"refresh": old_refresh})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_confirm_token_single_use(self):
        token = self._reset_token()
        url = reverse("password_reset_confirm")
        self.client.post(url, {"reset_token": token, "new_password": "NewStrong456!"})
        res = self.client.post(url, {"reset_token": token, "new_password": "Other789!pass"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_confirm_weak_password(self):
        res = self.client.post(reverse("password_reset_confirm"), {
            "reset_token": self._reset_token(), "new_password": "123",
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("new_password", res.data)

    def test_confirm_invalid_token(self):
        res = self.client.post(reverse("password_reset_confirm"), {
            "reset_token": "gia-mao", "new_password": "NewStrong456!",
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class ProfileAndChangePasswordTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email=EMAIL, password=PASSWORD)
        self.client.force_authenticate(self.user)

    def test_update_birth_date_and_gender(self):
        res = self.client.patch(reverse("me"), {"birth_date": "1998-08-15", "gender": "female"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["birth_date"], "1998-08-15")
        self.assertEqual(res.data["gender"], "female")

    def test_birth_date_in_future_rejected(self):
        future = (timezone.localdate() + timedelta(days=1)).isoformat()
        res = self.client.patch(reverse("me"), {"birth_date": future})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("birth_date", res.data)

    def test_invalid_gender_rejected(self):
        res = self.client.patch(reverse("me"), {"gender": "unknown"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_change_password_success_returns_new_tokens(self):
        old_refresh = self.client.post(
            reverse("login"), {"email": EMAIL, "password": PASSWORD}
        ).data["refresh"]
        res = self.client.post(reverse("change_password"), {
            "current_password": PASSWORD, "new_password": "NewStrong456!",
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewStrong456!"))
        # Phiên cũ bị thu hồi, refresh token mới vẫn dùng được
        self.client.force_authenticate(None)
        url = reverse("token_refresh")
        self.assertEqual(self.client.post(url, {"refresh": old_refresh}).status_code, 401)
        self.assertEqual(self.client.post(url, {"refresh": res.data["refresh"]}).status_code, 200)

    def test_change_password_wrong_current(self):
        res = self.client.post(reverse("change_password"), {
            "current_password": "sai-mat-khau", "new_password": "NewStrong456!",
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("current_password", res.data)

    def test_change_password_same_as_current(self):
        res = self.client.post(reverse("change_password"), {
            "current_password": PASSWORD, "new_password": PASSWORD,
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("new_password", res.data)

    def test_change_password_weak(self):
        res = self.client.post(reverse("change_password"), {
            "current_password": PASSWORD, "new_password": "123",
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("new_password", res.data)
