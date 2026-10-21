"""Bounded HTTPS transport; a completed upload is distinct from cloud acceptance."""

import json
import os
import threading
from pathlib import Path
from urllib.parse import urlparse

import requests
from cryptography.fernet import Fernet
from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder

from .local import activity


def server_url(value):
    parsed = urlparse(value)
    local = parsed.hostname in {"127.0.0.1", "localhost", "::1"}
    if parsed.scheme != "https" and not (local and parsed.scheme == "http"):
        raise ValueError("Server uchun HTTPS manzil kerak.")
    if parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path not in {"", "/"}:
        raise ValueError("Serverning asosiy manzilini kiriting, masalan https://ilbi.uz")
    return value.rstrip("/")


class Vault:
    lock = threading.RLock()
    def __init__(self):
        self.path = Path(settings.DESKTOP_DATA_DIR) / "cloud.credentials"
        self.cipher = Fernet(os.environ["ILBI_DESKTOP_VAULT_KEY"].encode())

    def read(self):
        with self.lock:
            return json.loads(self.cipher.decrypt(self.path.read_bytes())) if self.path.exists() else {}

    def write(self, value):
        with self.lock:
            temporary = self.path.with_suffix(".new")
            temporary.write_bytes(self.cipher.encrypt(json.dumps(value).encode()))
            temporary.chmod(0o600)
            temporary.replace(self.path)

    def put_user(self, user_id, value, primary=False):
        with self.lock:
            current = self.read()
            current.setdefault("actors", {})[str(user_id)] = value
            current["server"] = value["server"]
            if primary:
                current.update(value)
                current["primary_user"] = user_id
            self.write(current)


class UploadBody:
    def __init__(self, data):
        self.data = data

    def __len__(self):
        return len(self.data)

    def __iter__(self):
        for offset in range(0, len(self.data), 32768):
            chunk = self.data[offset : offset + 32768]
            activity["progress"] = round(min(len(self.data), offset + len(chunk)) / len(self.data) * 100)
            yield chunk
        activity["stage"] = "confirming"


def cloud_request(method, path, *, body=None, progress=False, headers=None, user_id=None, raw=None):
    vault = Vault()
    stored = vault.read()
    credentials = stored if user_id is None else stored.get("actors", {})[str(user_id)]
    base = server_url(stored["server"])
    auth = {"Authorization": "Bearer " + credentials["access"], **(headers or {})}
    kwargs = {"allow_redirects": False, "headers": auth}
    if raw is not None:
        kwargs["data"] = raw
    if body is not None:
        data = json.dumps(body, cls=DjangoJSONEncoder).encode()
        kwargs["data"] = UploadBody(data) if progress else data
        kwargs["headers"]["Content-Type"] = "application/json"
        kwargs["headers"]["Content-Length"] = str(len(data))
    response = requests.request(method, base + "/api/v1/" + path, timeout=(5, 45), **kwargs)
    if response.status_code == 401 and credentials.get("refresh"):
        refreshed = requests.post(
            base + "/api/v1/auth/token/refresh/",
            json={"refresh": credentials["refresh"]},
            timeout=(5, 20),
            allow_redirects=False,
        )
        if refreshed.ok:
            credentials.update(refreshed.json())
            actor_id = stored["primary_user"] if user_id is None else user_id
            vault.put_user(actor_id, {"server": base, "access": credentials["access"], "refresh": credentials["refresh"]},
                           primary=actor_id == stored["primary_user"])
            kwargs["headers"]["Authorization"] = "Bearer " + credentials["access"]
            response = requests.request(method, base + "/api/v1/" + path, timeout=(5, 45), **kwargs)
    return response
