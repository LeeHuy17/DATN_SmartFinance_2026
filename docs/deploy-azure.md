# Deploy backend lên Azure VM

Backend và PostgreSQL chạy bằng Docker Compose trên một VM Linux của Azure for Students, dữ liệu lưu trên ổ đĩa VM. Mỗi lần merge vào `main`, GitHub Actions build image, đẩy lên GHCR rồi SSH vào VM để chạy bản mới.

```
merge vào main ──► Docker Publish: build image ──► GHCR (sha-<commit>, latest)
                                  └─► deploy: SSH vào VM ──► docker compose pull && up -d
                                                               ├─ caddy  (HTTPS, cổng 80/443)
                                                               ├─ web    (gunicorn, migrate khi khởi động)
                                                               ├─ scheduler
                                                               └─ db     (PostgreSQL, volume trên ổ đĩa VM)
```

Cấu hình chạy trên VM nằm trong [`deploy/`](../deploy/): `docker-compose.yml`, `Caddyfile`, `.env.example`.

## 1. Tạo VM

Azure Portal → **Virtual machines** → **Create**:

| Mục | Giá trị |
|---|---|
| Image | Ubuntu Server 24.04 LTS |
| Size | Tối thiểu 4 GB RAM (vd B2s: 2 vCPU, 4 GB). Kiểm tra giá trước khi chọn |
| Authentication | SSH public key, username `azureuser` |
| Inbound ports | SSH (22), HTTP (80), HTTPS (443) |

Sau khi tạo: VM → **Overview** → **DNS name** → **Configure** → đặt DNS name label (vd `finbuddy`). Domain sẽ có dạng `finbuddy.<region>.cloudapp.azure.com`; Caddy dùng domain này để xin chứng chỉ HTTPS miễn phí.

> Tiết kiệm credit: **Stop** VM khi không dùng (trạng thái "Stopped (deallocated)" thì không tính tiền compute). IP public có thể đổi sau khi khởi động lại nhưng DNS name thì giữ nguyên.

## 2. Cài Docker trên VM

```bash
ssh azureuser@finbuddy.<region>.cloudapp.azure.com

curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker azureuser

# Swap 2 GB phòng khi OCR dùng nhiều bộ nhớ
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

sudo mkdir -p /opt/finbuddy && sudo chown azureuser:azureuser /opt/finbuddy
exit   # đăng nhập lại để nhóm docker có hiệu lực
```

## 3. Tạo file `.env` trên VM

Chép nội dung [`deploy/.env.example`](../deploy/.env.example) vào `/opt/finbuddy/.env` rồi điền giá trị thật (domain, secret key, mật khẩu PostgreSQL tự đặt). File này chỉ nằm trên VM, không commit.

```bash
nano /opt/finbuddy/.env
chmod 600 /opt/finbuddy/.env
```

## 4. Tạo SSH key riêng cho GitHub Actions

Trên máy cá nhân (không đặt passphrase):

```bash
ssh-keygen -t ed25519 -f finbuddy-deploy -N "" -C "github-actions-deploy"
```

Thêm public key vào VM:

```bash
ssh azureuser@<domain> "echo '$(cat finbuddy-deploy.pub)' >> ~/.ssh/authorized_keys"
```

Lấy fingerprint của VM để GitHub Actions xác minh đúng máy:

```bash
ssh-keyscan <domain>
```

## 5. Khai báo trên GitHub

Repo → **Settings** → **Environments** → **New environment** `production`, rồi thêm:

| Loại | Tên | Giá trị |
|---|---|---|
| Variable | `VM_HOST` | domain của VM, vd `finbuddy.eastasia.cloudapp.azure.com` |
| Variable | `VM_USER` | `azureuser` |
| Secret | `VM_SSH_KEY` | toàn bộ nội dung file `finbuddy-deploy` (private key) |
| Secret | `VM_SSH_KNOWN_HOSTS` | kết quả lệnh `ssh-keyscan` ở bước 4 |

Xoá file `finbuddy-deploy` trên máy cá nhân sau khi đã dán vào GitHub.

## 6. Deploy

Merge vào `main` (qua PR release) → workflow **Docker Publish** chạy job `Build image` rồi `Deploy to Azure VM`. Job deploy kết thúc bằng việc gọi `https://<domain>/admin/login/` để chắc site đã chạy.

Sau lần deploy đầu tiên, tạo tài khoản admin và tải sẵn mô hình OCR:

```bash
ssh azureuser@<domain>
cd /opt/finbuddy
docker compose exec web python manage.py createsuperuser
docker compose exec web python manage.py download_ocr_models
```

## Vận hành

```bash
cd /opt/finbuddy
docker compose ps                    # trạng thái các service
docker compose logs -f web           # xem log
IMAGE_TAG=sha-abc1234 docker compose up -d   # quay lại một bản cũ
```

## Sao lưu dữ liệu

DB nằm trên ổ đĩa VM nên **VM hỏng hoặc bị xoá là mất dữ liệu**. Sao lưu định kỳ ra file:

```bash
mkdir -p ~/backups
# Thêm vào crontab (crontab -e): sao lưu lúc 2:00 hằng ngày, giữ 7 bản gần nhất
0 2 * * * cd /opt/finbuddy && docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > ~/backups/db-$(date +\%F).sql.gz && ls -t ~/backups/db-*.sql.gz | tail -n +8 | xargs -r rm
```

Khôi phục:

```bash
gunzip -c ~/backups/db-2026-11-01.sql.gz | docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'
```

Nên tải bản sao lưu về máy cá nhân trước những mốc quan trọng (vd trước buổi bảo vệ): `scp azureuser@<domain>:~/backups/db-*.sql.gz .`

Muốn deploy lại mà không có commit mới: Actions → Docker Publish → chọn lần chạy trên `main` → **Re-run all jobs**.
