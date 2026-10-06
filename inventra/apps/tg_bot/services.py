import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

TELEGRAM_API_URL = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"

def send_telegram_message(chat_id: str, text: str, parse_mode: str = "Markdown") -> bool:
    try:
        payload = {
            "chat_id": chat_id,
            "text": text,
        }
        if parse_mode:
            payload["parse_mode"] = parse_mode

        response = requests.post(
            TELEGRAM_API_URL,
            json=payload,
            timeout=5,
        )

        # If Telegram rejects markdown formatting (e.g. 400 Bad Request: can't parse entities),
        # retry sending as plain text so the message is never lost.
        if response.status_code == 400 and parse_mode:
            logger.warning("Telegram parse_mode=%s failed: %s. Retrying as plain text...", parse_mode, response.text)
            payload.pop("parse_mode", None)
            response = requests.post(
                TELEGRAM_API_URL,
                json=payload,
                timeout=5,
            )

        response.raise_for_status()

        data = response.json()
        if not data.get("ok"):
            logger.error("Telegram API error: %s", data)
            return False
        return True
    except Exception as e:
        logger.error("Telegram send failed for chat_id: %s | error: %s", chat_id, e)
        return False
