"""Run with the bot's Python environment; all outbound calls are mocked."""

import asyncio
import importlib.util
import os
import unittest
from pathlib import Path
from threading import Event
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch


class ContactHandlerTests(unittest.IsolatedAsyncioTestCase):
    @classmethod
    def setUpClass(cls):
        path = Path(__file__).resolve().parents[1] / "main.py"
        spec = importlib.util.spec_from_file_location("ilbi_login_bot_under_test", path)
        cls.bot_module = importlib.util.module_from_spec(spec)
        with patch.dict(
            os.environ,
            {
                "TELEGRAM_BOT_TOKEN": "100001:synthetic-bot-test-token",
                "ILBI_INTERNAL_URL": "https://internal.invalid/register/",
                "INTERNAL_SERVICE_TOKEN": "synthetic-internal-test-token",
            },
        ):
            spec.loader.exec_module(cls.bot_module)

    def setUp(self):
        self.bot_module._rate_limit_cache.clear()
        self.post_patch = patch.object(self.bot_module.requests, "post")
        self.post = self.post_patch.start()
        self.addCleanup(self.post_patch.stop)

    async def asyncTearDown(self):
        await self.bot_module.bot.session.close()

    def message(self, *, chat_type="private", chat_id=12345, sender_id=12345, contact_id=12345):
        return SimpleNamespace(
            chat=SimpleNamespace(id=chat_id, type=chat_type),
            from_user=SimpleNamespace(id=sender_id, is_bot=False, username="synthetic-user"),
            contact=SimpleNamespace(user_id=contact_id, phone_number="998 90 123-45-67"),
            answer=AsyncMock(),
        )

    async def test_non_private_contacts_never_register(self):
        for chat_type in ("group", "supergroup", "channel", "unknown"):
            with self.subTest(chat_type=chat_type):
                message = self.message(chat_type=chat_type, chat_id=-1001234567890)
                await self.bot_module.contact_handler(message)
                self.post.assert_not_called()
                message.answer.assert_awaited_once()
                self.assertIn("shaxsiy chat", message.answer.call_args.args[0])
                self.assertNotIn("reply_markup", message.answer.call_args.kwargs)

    async def test_missing_sender_does_not_crash_or_register(self):
        message = self.message()
        message.from_user = None
        await self.bot_module.contact_handler(message)
        self.post.assert_not_called()
        message.answer.assert_awaited_once()

    async def test_wrong_private_chat_identity_never_registers(self):
        for chat_id, sender_id in ((98765, 12345), (-12345, 12345), (0, 0), (-12345, -12345)):
            with self.subTest(chat_id=chat_id, sender_id=sender_id):
                message = self.message(chat_id=chat_id, sender_id=sender_id, contact_id=sender_id)
                await self.bot_module.contact_handler(message)
                self.post.assert_not_called()

    async def test_bot_sender_never_registers(self):
        message = self.message()
        message.from_user.is_bot = True
        await self.bot_module.contact_handler(message)
        self.post.assert_not_called()

    async def test_other_or_unverified_contact_never_registers(self):
        for contact_id in (99999, None):
            with self.subTest(contact_id=contact_id):
                self.bot_module._rate_limit_cache.clear()
                message = self.message(contact_id=contact_id)
                await self.bot_module.contact_handler(message)
                self.post.assert_not_called()
                message.answer.assert_awaited_once()

    async def test_own_contact_in_private_chat_registers_normalized_phone(self):
        message = self.message()
        await self.bot_module.contact_handler(message)
        self.post.assert_called_once_with(
            "https://internal.invalid/register/",
            json={"phone_number": "+998901234567", "chat_id": "12345"},
            headers={"Authorization": "Internal synthetic-internal-test-token"},
            timeout=5,
        )
        self.post.return_value.raise_for_status.assert_called_once()
        message.answer.assert_awaited_once()
        self.assertIn("muvaffaqiyatli ulandi", message.answer.call_args.args[0])

    async def test_existing_rate_limit_is_preserved(self):
        message = self.message()
        await self.bot_module.contact_handler(message)
        await self.bot_module.contact_handler(message)
        self.post.assert_called_once()
        self.assertIn("kuting", message.answer.call_args.args[0])

    async def test_invalid_phone_does_not_register(self):
        message = self.message()
        message.contact.phone_number = "invalid-number"
        await self.bot_module.contact_handler(message)
        self.post.assert_not_called()

    async def test_slow_registration_does_not_block_another_command(self):
        entered = Event()
        release = Event()
        response = self.post.return_value

        def slow_post(*args, **kwargs):
            entered.set()
            if not release.wait(timeout=3):
                raise self.bot_module.requests.Timeout("synthetic wait exceeded")
            return response

        self.post.side_effect = slow_post
        registration = self.message()
        other = self.message(chat_id=98765, sender_id=98765)
        task = asyncio.create_task(self.bot_module.contact_handler(registration))
        try:
            self.assertTrue(await asyncio.to_thread(entered.wait, 2))
            self.assertFalse(task.done(), "Registration must still be waiting for the backend")
            await asyncio.wait_for(self.bot_module.status_handler(other), timeout=1)
            other.answer.assert_awaited_once()
            registration.answer.assert_not_awaited()
            self.assertFalse(task.done())
        finally:
            release.set()
            await asyncio.wait_for(task, timeout=3)

        self.post.assert_called_once()
        registration.answer.assert_awaited_once()
        self.assertIn("muvaffaqiyatli ulandi", registration.answer.call_args.args[0])

    async def test_slow_contact_does_not_delay_another_contact_and_keeps_flood_guard(self):
        entered = Event()
        release = Event()
        response = self.post.return_value

        def slow_first_post(*args, **kwargs):
            if kwargs["json"]["chat_id"] == "12345":
                entered.set()
                if not release.wait(timeout=3):
                    raise self.bot_module.requests.Timeout("synthetic wait exceeded")
            return response

        self.post.side_effect = slow_first_post
        first = self.message()
        duplicate = self.message()
        second = self.message(chat_id=98765, sender_id=98765, contact_id=98765)
        second.contact.phone_number = "+998900000002"
        task = asyncio.create_task(self.bot_module.contact_handler(first))
        try:
            self.assertTrue(await asyncio.to_thread(entered.wait, 2))
            self.assertFalse(task.done(), "First contact must still be waiting for the backend")
            await asyncio.wait_for(self.bot_module.contact_handler(duplicate), timeout=1)
            self.assertIn("kuting", duplicate.answer.call_args.args[0])
            await asyncio.wait_for(self.bot_module.contact_handler(second), timeout=1)
            second.answer.assert_awaited_once()
            self.assertIn("muvaffaqiyatli ulandi", second.answer.call_args.args[0])
            first.answer.assert_not_awaited()
            self.assertFalse(task.done())
            self.assertEqual(self.post.call_count, 2)
        finally:
            release.set()
            await asyncio.wait_for(task, timeout=3)

        first.answer.assert_awaited_once()
        self.assertEqual(self.post.call_count, 2)

    async def test_connection_errors_keep_the_generic_failure_message(self):
        for error_type in (
            self.bot_module.requests.ConnectTimeout,
            self.bot_module.requests.ReadTimeout,
            self.bot_module.requests.ConnectionError,
        ):
            with self.subTest(error=error_type.__name__):
                self.bot_module._rate_limit_cache.clear()
                self.post.reset_mock()
                self.post.side_effect = error_type("synthetic connection failure")
                message = self.message()
                await self.bot_module.contact_handler(message)
                self.post.assert_called_once()
                self.assertEqual(self.post.call_args.kwargs["timeout"], 5)
                message.answer.assert_awaited_once()
                self.assertIn("Server bilan bog‘lanishda xatolik", message.answer.call_args.args[0])
                self.assertNotIn("synthetic connection failure", message.answer.call_args.args[0])

    async def test_http_error_keeps_the_generic_failure_message(self):
        self.post.return_value.raise_for_status.side_effect = self.bot_module.requests.HTTPError(
            "synthetic HTTP failure"
        )
        message = self.message()
        await self.bot_module.contact_handler(message)
        self.post.assert_called_once()
        self.post.return_value.raise_for_status.assert_called_once()
        message.answer.assert_awaited_once()
        self.assertIn("Server bilan bog‘lanishda xatolik", message.answer.call_args.args[0])
        self.assertNotIn("synthetic HTTP failure", message.answer.call_args.args[0])


if __name__ == "__main__":
    unittest.main()
