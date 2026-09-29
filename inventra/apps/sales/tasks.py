import logging
from celery import shared_task
from apps.sales.services.b2b_transfer_service import B2BTransferService
from apps.tg_bot.services import send_telegram_message

logger = logging.getLogger(__name__)


@shared_task(name="apps.sales.tasks.auto_expire_transfers_task")
def auto_expire_transfers_task():
    """
    Periodic task: automatically expires B2B transfer requests older than 7 days.
    """
    logger.info("Starting B2B auto-expire transfers task...")
    count = B2BTransferService.auto_expire_transfers()
    logger.info(f"B2B auto-expire completed: {count} transfers expired.")
    return count


@shared_task(
    name="apps.sales.tasks.send_async_telegram_message_task",
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 3, "countdown": 5},
)
def send_async_telegram_message_task(chat_id: str, text: str):
    """
    Asynchronous task to send Telegram messages with automatic retry.
    """
    logger.info(f"Sending async Telegram message to {chat_id}")
    success = send_telegram_message(chat_id=chat_id, text=text)
    if not success:
        logger.warning(f"Telegram message delivery failed for {chat_id}")
    return success
