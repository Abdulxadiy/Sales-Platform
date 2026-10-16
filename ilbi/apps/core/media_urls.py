"""Keep legacy and current Docker hosts out of public media responses."""
from urllib.parse import urlsplit, urlunsplit

INTERNAL_MEDIA_HOSTS = frozenset(("nginx", "ilbi", "inventra"))


def public_media_url(value):
    if not value:
        return value
    try:
        parts = urlsplit(value)
        if parts.scheme in ("http", "https") and parts.hostname in INTERNAL_MEDIA_HOSTS:
            return urlunsplit(("", "", parts.path or "/", parts.query, parts.fragment))
    except ValueError:
        pass
    return value
