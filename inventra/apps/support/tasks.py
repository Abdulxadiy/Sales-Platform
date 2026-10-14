import logging

from celery import shared_task
from django.conf import settings

from apps.tg_bot.identity import current_bot_id
from apps.tg_bot.models import TelegramContact
from apps.tg_bot.services import send_telegram_message

logger = logging.getLogger(__name__)


@shared_task(autoretry_for=(RuntimeError,), retry_kwargs={"max_retries": 3, "countdown": 10})
def notify_operators(conversation_id):
    from apps.support.models import Conversation

    conversation = Conversation.objects.filter(pk=conversation_id).first()
    if not conversation or conversation.status == Conversation.Status.CLOSED:
        return False
    bot_id = current_bot_id()
    if not bot_id:
        return False
    phones = settings.SUPPORT_OPERATOR_PHONES
    contacts = TelegramContact.objects.filter(
        phone_number__in=phones,
        bot_id=bot_id,
        chat_id__regex=r"^[0-9]+$",
    )
    # Telegram receives no guest name, question, attachment or browser credential.
    url = settings.FRONTEND_URL.rstrip("/") + "/support?conversation=" + str(conversation.id)
    text = f"Inventra: yangi yordam xabari / New support message\n{conversation.language.upper()}\n{url}"
    failed = False
    for contact in contacts:
        if not send_telegram_message(contact.chat_id, text, parse_mode=None):
            failed = True
    if failed:
        raise RuntimeError("Support notification delivery failed")
    return True


def enqueue_notification(conversation_id):
    try:
        notify_operators.delay(str(conversation_id))
    except Exception:
        logger.warning("Support notification could not be queued for %s", conversation_id)
