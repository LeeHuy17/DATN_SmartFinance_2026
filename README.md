# FinBuddy – Ứng dụng quản lý chi tiêu cá nhân

[![Backend CI](https://github.com/LeeHuy17/DATN_SmartFinance_2026/actions/workflows/backend-ci.yml/badge.svg?branch=develop)](https://github.com/LeeHuy17/DATN_SmartFinance_2026/actions/workflows/backend-ci.yml)
[![Mobile CI](https://github.com/LeeHuy17/DATN_SmartFinance_2026/actions/workflows/mobile-ci.yml/badge.svg?branch=develop)](https://github.com/LeeHuy17/DATN_SmartFinance_2026/actions/workflows/mobile-ci.yml)

Đồ án tốt nghiệp: ứng dụng di động giúp ghi chép thu chi, quản lý ví và ngân sách, xem báo cáo, quét hoá đơn bằng OCR và nhận lời khuyên tài chính từ trợ lý AI.

## Tính năng

- **Tài khoản:** đăng ký, đăng nhập (JWT), đổi mật khẩu, quên mật khẩu qua mã OTP gửi email, ảnh đại diện
- **Ví và danh mục:** nhiều ví, danh mục thu/chi tuỳ chỉnh (có sẵn bộ danh mục mặc định)
- **Giao dịch:** thêm, sửa, xoá, lọc theo thời gian, ví, danh mục
- **Ngân sách:** đặt hạn mức theo danh mục, cảnh báo khi sắp chạm hoặc vượt hạn mức
- **Báo cáo:** tổng quan, theo tháng, theo ngày, theo danh mục
- **Quét hoá đơn:** chụp hoặc chọn ảnh, EasyOCR đọc tổng tiền và ngày để tạo giao dịch nhanh
- **Trợ lý AI:** nhận xét và lời khuyên chi tiêu qua Groq; khi không có API key thì dùng lời khuyên theo luật
- **Thông báo:** nhắc ghi chép buổi tối, email tổng kết tháng, cài đặt bật/tắt từng loại
- **Giao diện:** sáng/tối, trang trợ giúp, giới thiệu, điều khoản

## Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Mobile | React Native 0.88, Expo SDK 58, Expo Router, TypeScript |
| Backend | Django 5.2, Django REST Framework, SimpleJWT, django-unfold (trang admin) |
| Cơ sở dữ liệu | PostgreSQL 16 |
| OCR | EasyOCR, OpenCV, PyTorch (bản CPU) |
| AI | Groq API |
| Hạ tầng | Docker Compose, Gunicorn, WhiteNoise |
| CI | GitHub Actions |

## Cấu trúc thư mục

```
.
├── .github/workflows/   # CI: backend-ci.yml, mobile-ci.yml
├── designs/             # Logo, thiết kế giao diện
├── docs/                # PRD, SRS, sơ đồ (ERD, class, use case), kế hoạch
└── src/
    ├── backend/         # Django API
    │   ├── config/      # settings, urls, wsgi
    │   ├── accounts/  categories/  wallets/  transactions/  budgets/
    │   ├── reports/   notifications/  advisor/  receipts/
    │   ├── Dockerfile
    │   └── docker-compose.yml (+ docker-compose.override.yml cho dev)
    └── mobile/          # Ứng dụng Expo
        ├── app/         # Màn hình (Expo Router)
        └── src/         # Component, API client, theme...
```

## Chạy dự án

Yêu cầu: Docker Desktop, Node.js 24, ứng dụng Expo Go trên điện thoại (hoặc máy ảo Android).

### 1. Backend

```bash
cd src/backend
cp .env.example .env
```

Điền tối thiểu `DJANGO_SECRET_KEY` và `POSTGRES_PASSWORD` trong `.env`. Các biến email và `GROQ_API_KEY` có thể để trống. Thêm IP LAN của máy vào `DJANGO_ALLOWED_HOSTS` để điện thoại gọi được API.

```bash
docker compose up -d --build
docker compose exec web python manage.py createsuperuser
docker compose exec web python manage.py download_ocr_models   # tải trước mô hình OCR, chỉ cần một lần
```

Service `web` tự chạy `migrate` và `collectstatic` mỗi lần khởi động (xem `docker-entrypoint.sh`).

- API: http://localhost:8000/api/
- Trang quản trị: http://localhost:8000/admin/

Khi chạy dev, `docker-compose.override.yml` được nạp tự động: dùng `runserver`, gắn mã nguồn vào container nên sửa code là có hiệu lực ngay.

Container chạy bằng user thường `app` (uid 1000), không phải root. Nếu máy đã có volume tạo từ image cũ (chạy bằng root), sửa quyền một lần:

```bash
docker compose run --rm --no-deps -u root --entrypoint "" web chown -R 1000:1000 /app/media /app/staticfiles /models
```

### 2. Mobile

```bash
cd src/mobile
cp .env.example .env
npm install
npx expo start
```

Trong `.env`, đổi `EXPO_PUBLIC_API_URL` thành `http://<IP-LAN-của-máy>:8000/api` khi chạy trên điện thoại thật (máy ảo Android dùng `http://10.0.2.2:8000/api`). Quét mã QR bằng Expo Go để mở app.

## Kiểm thử

```bash
# Backend (cần PostgreSQL đang chạy)
cd src/backend
docker compose exec web python manage.py test
ruff check .

# Mobile
cd src/mobile
npm run lint          # tsc --noEmit
npx expo-doctor
```

## CI

Mỗi pull request vào `develop` hoặc `main` tự động chạy:

| Workflow | Job | Nội dung |
|---|---|---|
| Backend CI | `Lint (ruff)` | Kiểm tra lỗi code Python |
| Backend CI | `Test (Django + PostgreSQL)` | `manage.py check`, kiểm tra thiếu migration, chạy toàn bộ test |
| Mobile CI | `Typecheck (tsc)` | Kiểm tra kiểu TypeScript |
| Mobile CI | `Expo doctor` | Kiểm tra phiên bản gói khớp Expo SDK (chỉ cảnh báo) |
| Docker Publish | `Build image` | Build image backend khi PR có sửa `src/backend/` (không đẩy lên registry) |

Khi merge vào `main` hoặc gắn tag `v*`, workflow Docker Publish build và đẩy image backend lên GitHub Container Registry:

```bash
docker pull ghcr.io/leehuy17/finbuddy-backend:latest
```

Tag có sẵn: `latest` (bản mới nhất trên `main`), `sha-<commit>`, và `1.2.3` / `1.2` khi phát hành bằng tag `v1.2.3`.

Sau khi đẩy image, job `Deploy to Azure VM` SSH vào VM và chạy bản mới (PostgreSQL chạy cùng VM, HTTPS qua Caddy). Hướng dẫn thiết lập: [docs/deploy-azure.md](docs/deploy-azure.md).

## Quy trình làm việc với Git

- `main`: bản ổn định để phát hành
- `develop`: nhánh tích hợp
- `feature/*`, `fix/*`, `chore/*`, `docs/*`: tách từ `develop`, merge lại qua pull request sau khi CI xanh

Commit message theo [Conventional Commits](https://www.conventionalcommits.org/), ví dụ `feat(mobile): ...`, `fix(backend): ...`, `ci(backend): ...`.

## Tài liệu

- Đặc tả yêu cầu: [docs/src/](docs/src/) (PRD, SRS)
- Deploy backend lên Azure VM: [docs/deploy-azure.md](docs/deploy-azure.md)
- Sơ đồ ERD, class, use case: [docs/diagrams/](docs/diagrams/) (mở bằng draw.io)
- Thiết kế giao diện: [designs/](designs/)
