from aiogram.types import ReplyKeyboardMarkup, KeyboardButton
from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart
import requests
import asyncio
import logging
import os

BOT_TOKEN = os.environ['BOT_TOKEN']
INVENTRA_INTERNAL_URL = os.environ['INVENTRA_INTERNAL_URL']
SHOP_INTERNAL_URL = os.environ['SHOP_INTERNAL_URL']
INTERNAL_SERVICE_TOKEN = os.environ['INTERNAL_SERVICE_TOKEN']

# One bot now serves two separate services (Inventra staff/owner 2FA
# linking, and Shop customer login linking). A deep-link start
# parameter (?start=inventra / ?start=shop) tells us which service to
# forward the phone_number+chat_id pair to once the person shares
# their contact. Kept in memory, keyed by chat_id, until the contact
# arrives -- lost on restart, and won't work if this bot is ever
# scaled to multiple processes (see main.py review notes).
TARGET_URLS = {
    "inventra": INVENTRA_INTERNAL_URL,
    "shop": SHOP_INTERNAL_URL,
}

logger = logging.getLogger(__name__)
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

pending_target: dict[str, str] = {}


@dp.message(CommandStart())
async def start_handler(message: types.Message):
    args = message.text.split(maxsplit=1)
    target = args[1].split()[0].strip() if len(args) > 1 else None

    if target not in TARGET_URLS:
        await message.answer(
            "Iltimos, Inventra yoki Shop login sahifasidagi havola orqali kiring."
        )
        return

    pending_target[str(message.chat.id)] = target

    keyboard = ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="📱 Telefon raqamni ulashish", request_contact=True)]],
        resize_keyboard=True,
        one_time_keyboard=True
    )
    await message.answer(
        "Tasdiqlash kodini olish uchun telefon raqamingizni yuboring.",
        reply_markup=keyboard,
    )


@dp.message(lambda message: message.contact is not None)
async def contact_handler(message: types.Message):
    chat_id = str(message.chat.id)
    target = pending_target.get(chat_id)

    if target is None:
        await message.answer(
            "Iltimos, avval Inventra yoki Shop login sahifasidagi havola orqali /start bosing."
        )
        return

    phone_number = message.contact.phone_number

    if phone_number.startswith("998"):
        phone_number = "+" + phone_number

    try:
        response = requests.post(
            TARGET_URLS[target],
            json={"phone_number": phone_number, "chat_id": chat_id},
            headers={"Authorization": f"Internal {INTERNAL_SERVICE_TOKEN}"},
            timeout=5,
        )
        response.raise_for_status()
        await message.answer("✅ Raqamingiz muvaffaqiyatli ulandi. Endi login sahifasida davom etishingiz mumkin.")
        del pending_target[chat_id]
    except requests.RequestException as e:
        await message.answer("❌ Xatolik yuz berdi, birozdan so'ng qayta urinib ko'ring.")
        logger.error(f"Telegram send failed error: {e}")

async def main():
    await dp.start_polling(bot)

if __name__ == '__main__':
    asyncio.run(main())