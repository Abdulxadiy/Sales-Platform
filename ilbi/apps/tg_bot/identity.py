"""Identify which Telegram bot recorded a contact without storing its secret token."""

from django.conf import settings


def current_bot_id() -> str | None:
    token = getattr(settings, "TELEGRAM_BOT_TOKEN", "") or ""
    bot_id, separator, _secret = token.partition(":")
    return bot_id if separator and bot_id.isdecimal() else None
