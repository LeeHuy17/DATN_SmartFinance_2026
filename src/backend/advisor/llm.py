import json
import logging

import httpx
from django.conf import settings

logger = logging.getLogger(__name__)
URL = "https://api.groq.com/openai/v1/chat/completions"


class LLMError(Exception):
    pass


def chat_json(system: str, payload: dict) -> dict:
    if not settings.GROQ_API_KEY:
        raise LLMError("Chưa cấu hình GROQ_API_KEY")
    body = {
        "model": settings.GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.3,
        "max_completion_tokens": 2000,
    }
    try:
        res = httpx.post(
            URL, json=body, timeout=settings.GROQ_TIMEOUT,
            headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
        )
        res.raise_for_status()
        return json.loads(res.json()["choices"][0]["message"]["content"])
    except httpx.HTTPStatusError as e:
        # Chỉ ghi mã lỗi, không ghi header hay nội dung request (có key và số liệu)
        logger.warning("Groq trả về %s", e.response.status_code)
        raise LLMError(f"HTTP {e.response.status_code}") from e
    except (httpx.HTTPError, KeyError, IndexError, ValueError, TypeError) as e:
        logger.warning("Gọi Groq thất bại: %s", type(e).__name__)
        raise LLMError(type(e).__name__) from e
