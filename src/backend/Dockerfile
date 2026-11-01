FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
# Bản PyTorch CPU trước để không kéo về bản CUDA nặng
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

# Chạy bằng user thường thay vì root. Mã nguồn vẫn thuộc root nên user app chỉ đọc được;
# riêng các thư mục ghi dữ liệu thuộc app để volume mới tạo nhận đúng quyền.
RUN useradd --create-home --uid 1000 app \
    && mkdir -p /app/media /app/staticfiles /models \
    && chown app:app /app/media /app/staticfiles /models

COPY . .
RUN chmod +x docker-entrypoint.sh

USER app

EXPOSE 8000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "120"]
