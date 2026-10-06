import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from apps.accounts.models import User
from apps.tg_bot.models import TelegramContact

pytestmark = pytest.mark.django_db


def test_custom_createsuperuser_with_chat_id(monkeypatch):
    monkeypatch.setenv("DJANGO_SUPERUSER_PASSWORD", "SuperPass123!")

    call_command(
        "createsuperuser",
        phone_number="+998901112233",
        username="superadmin",
        chat_id="987654321",
        interactive=False,
    )

    user = User.objects.filter(username="superadmin").first()
    assert user is not None
    assert user.role == "platform_admin"
    assert user.is_superuser is True
    assert user.check_password("SuperPass123!")

    contact = TelegramContact.objects.filter(phone_number=user.phone_number).first()
    assert contact is not None
    assert contact.chat_id == "987654321"


def test_custom_createsuperuser_missing_chat_id_raises_error(monkeypatch):
    monkeypatch.setenv("DJANGO_SUPERUSER_PASSWORD", "SuperPass123!")

    with pytest.raises(CommandError, match="You must provide --chat_id"):
        call_command(
            "createsuperuser",
            phone_number="+998909998877",
            username="failadmin",
            interactive=False,
        )


def test_custom_createsuperuser_only_one_allowed(monkeypatch):
    monkeypatch.setenv("DJANGO_SUPERUSER_PASSWORD", "SuperPass123!")

    call_command(
        "createsuperuser",
        phone_number="+998901110001",
        username="firstadmin",
        chat_id="111111111",
        interactive=False,
    )

    with pytest.raises(CommandError, match="Platform Admin allaqachon mavjud"):
        call_command(
            "createsuperuser",
            phone_number="+998901110002",
            username="secondadmin",
            chat_id="222222222",
            interactive=False,
        )

