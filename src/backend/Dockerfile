FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends libglib2.0-0     && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
# Bản PyTorch CPU trước để không kéo về bản CUDA nặng
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu     && pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "120"]
