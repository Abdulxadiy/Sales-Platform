import asyncio
import logging
import os
import re
import time

import requests
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command, CommandStart
from aiogram.types import KeyboardButton, ReplyKeyboardMarkup, ReplyKeyboardRemove

# Environment Variables
TELEGRAM_BOT_TOKEN = os.environ['TELEGRAM_BOT_TOKEN']
ILBI_INTERNAL_URL = os.getenv('ILBI_INTERNAL_URL') or os.environ['INVENTRA_INTERNAL_URL']
INTERNAL_SERVICE_TOKEN = os.environ['INTERNAL_SERVICE_TOKEN']

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ilbi_bot")

bot = Bot(token=TELEGRAM_BOT_TOKEN)
dp = Dispatcher()

# Security: Rate limiting in-memory cache {chat_id: last_timestamp}
_rate_limit_cache: dict[int, float] = {}
RATE_LIMIT_SECONDS = 3.0


def is_rate_limited(chat_id: int) -> bool:
    now = time.time()
    last_time = _rate_limit_cache.get(chat_id, 0)
    if now - last_time < RATE_LIMIT_SECONDS:
        return True
    _rate_limit_cache[chat_id] = now
    return False


def get_contact_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="📱 Telefon raqamni ulashish", request_contact=True)]],
        resize_keyboard=True,
        one_time_keyboard=True,
    )


@dp.message(CommandStart())
async def start_handler(message: types.Message):
    """
    /start handler specifically for ILBI.
    No deep-link parameter required. Simply welcoming the user and requesting contact.
    """
    first_name = message.from_user.first_name if message.from_user else "Foydalanuvchi"
    text = (
        f"Assalomu alaykum, *{first_name}*!\n\n"
        "🔐 *ILBI* platformasining rasmiy 2-bosqichli xavfsizlik (2FA) boti.\n\n"
        "Platformaga xavfsiz kirish va tasdiqlash kodlarini (OTP) qabul qilish uchun "
        "pastdagi *«📱 Telefon raqamni ulashish»* tugmasini bosing."
    )
    await message.answer(text, parse_mode="Markdown", reply_markup=get_contact_keyboard())


@dp.message(Command("help"))
async def help_handler(message: types.Message):
    text = (
        "ℹ️ *ILBI Xavfsizlik Boti*\n\n"
        "Ushbu bot ILBI savdo platformasida xodimlar va do‘kon egalarining hisoblarini "
        "2-bosqichli tasdiqlash (2FA) orqali himoya qilish uchun xizmat qiladi.\n\n"
        "🔹 *Qanday ishlatiladi?*\n"
        "1. /start buyrug‘ini yuboring.\n"
        "2. *«📱 Telefon raqamni ulashish»* tugmasi orqali hisobingizni ulang.\n"
        "3. ILBI tizimiga kirishda bir martalik tasdiqlash kodlari ushbu botga keladi.\n\n"
        "🔒 _Xavfsizlik eslatmasi: Kodlarni hech qachon begonalarga bermang!_"
    )
    await message.answer(text, parse_mode="Markdown")


@dp.message(Command("status"))
async def status_handler(message: types.Message):
    user_id = message.from_user.id if message.from_user else "Noma'lum"
    text = (
        "📊 *Bot holati:* Faol va ILBI tizimiga ulangan ✅\n\n"
        f"👤 Sizning Telegram ID: `{user_id}`\n\n"
        "Agar raqamingizni qayta ulamoqchi bo‘lsangiz, /start buyrug‘ini bosing."
    )
    await message.answer(text, parse_mode="Markdown")


@dp.message(lambda message: message.contact is not None)
async def contact_handler(message: types.Message):
    """
    Handle user contact sharing with security verification.
    """
    chat_id = message.chat.id
    from_user = message.from_user

    if message.chat.type != "private":
        await message.answer("🔐 Raqamni ulash uchun bot bilan shaxsiy chatni oching va /start bosing.")
        return

    if from_user is None or from_user.is_bot or from_user.id <= 0 or chat_id != from_user.id:
        await message.answer("❌ Kontaktni o‘zingizning shaxsiy Telegram chatingizdan yuboring.")
        return

    # 1. Anti-flood / Rate limit check
    if is_rate_limited(chat_id):
        await message.answer("⚠️ Iltimos, bir oz kuting va qayta urinib ko‘ring.")
        return

    # 2. Critical Security Check: Ensure the shared contact belongs to the sender!
    # Prevents 2FA hijacking by forwarding someone else's contact card.
    if message.contact.user_id != from_user.id:
        logger.warning(
            f"Security Alert: User {from_user.id} ({from_user.username}) tried to submit "
            f"another user's contact: {message.contact.phone_number} (owner: {message.contact.user_id})"
        )
        await message.answer(
            "❌ *Xavfsizlik xatosi!*\n\n"
            "Birovning kontakt kartasini ulashish taqiqlanadi.\n"
            "Iltimos, faqat o‘zingizning ushbu Telegram akkauntingizga tegishli raqamni "
            "pastdagi *«📱 Telefon raqamni ulashish»* tugmasi orqali yuboring.",
            parse_mode="Markdown",
            reply_markup=get_contact_keyboard(),
        )
        return

    # 3. Normalize phone number (E.164 format)
    raw_phone = message.contact.phone_number.strip().replace(" ", "").replace("-", "")
    if raw_phone.startswith("998"):
        phone_number = "+" + raw_phone
    elif not raw_phone.startswith("+"):
        phone_number = "+" + raw_phone
    else:
        phone_number = raw_phone

    # Validate phone format
    if not re.match(r"^\+[1-9]\d{7,14}$", phone_number):
        await message.answer("❌ Telefon raqami formati noto‘g‘ri. Iltimos, qaytadan urinib ko‘ring.")
        return

    # 4. Register contact directly in ILBI
    try:
        response = await asyncio.to_thread(
            requests.post,
            ILBI_INTERNAL_URL,
            json={"phone_number": phone_number, "chat_id": str(chat_id)},
            headers={"Authorization": f"Internal {INTERNAL_SERVICE_TOKEN}"},
            timeout=5,
        )
        response.raise_for_status()

        logger.info(f"Successfully linked phone {phone_number} to chat_id {chat_id} in ILBI")
        await message.answer(
            "✅ *Raqamingiz muvaffaqiyatli ulandi!*\n\n"
            f"📱 Raqam: `{phone_number}`\n"
            "🔐 Endi ILBI login sahifasida bemalol davom etishingiz mumkin. "
            "Tasdiqlash kodlari (OTP) ushbu bot orqali yuboriladi.",
            parse_mode="Markdown",
            reply_markup=ReplyKeyboardRemove(),
        )
    except requests.RequestException as e:
        logger.error(f"Failed to register contact in ILBI for chat_id {chat_id}: {e}")
        await message.answer(
            "❌ Server bilan bog‘lanishda xatolik yuz berdi. Iltimos, bir ozdan so‘ng qayta urinib ko‘ring.",
            reply_markup=get_contact_keyboard(),
        )


@dp.message()
async def fallback_handler(message: types.Message):
    """
    Helpful guidance for any text message.
    """
    await message.answer(
        "👋 ILBI platformasida tasdiqlash kodlarini olish uchun telefon raqamingizni ulashingiz kerak.\n\n"
        "Buning uchun pastdagi *«📱 Telefon raqamni ulashish»* tugmasini bosing yoki /start buyrug‘idan foydalaning.",
        parse_mode="Markdown",
        reply_markup=get_contact_keyboard(),
    )


async def main():
    logger.info("ILBI 2FA Telegram Bot starting...")
    await dp.start_polling(bot)


if __name__ == '__main__':
    asyncio.run(main())
