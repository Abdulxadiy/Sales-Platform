"""The packaged app only sends cloud credentials to the official origin.

Keep OFFICIAL_SERVER aligned with desktop/ilbi/runtime.cjs. A domain migration
requires a reviewed application release, never a UI field or environment override.
"""

OFFICIAL_SERVER = "https://new-dev.site"


def server_url(value):
    if value not in (OFFICIAL_SERVER, OFFICIAL_SERVER + "/"):
        raise ValueError(
            "Server manzili rasmiy ILBI manziliga mos emas. Ilovani rasmiy saytdan "
            "yangilang yoki yordam xizmatiga murojaat qiling. Ma’lumotlar papkasini o‘chirmang."
        )
    return OFFICIAL_SERVER
