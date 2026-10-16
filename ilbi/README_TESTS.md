# ILBI testlarini ishga tushirish

Yangilangan: **2026-10-14**. Testlar PostgreSQL va Redis’ning alohida servislaridan foydalanadi; demo/dev bazasi bilan aralashtirmang.

## Muhit

Repo ildizidan:

```bash
docker compose -f ilbi/docker-compose.test.yml up -d
cd ilbi
uv sync --group dev
```

`config.settings_test` test konfiguratsiyasini yuklaydi. Standart PostgreSQL porti **5433**, Redis porti **6380**; kerak bo‘lsa `.env.test.example`dan `.env.test` yarating. Test sozlamalari production maxfiy kalitini va fayl saqlash xizmatlarini almashtiradi; email xotirada saqlanadi. Support tezlik cheklovlari ham test Redis’iga yo‘naltiriladi, ayrim testlar uni alohida xotira cache’i bilan almashtiradi.

## Buyruqlar

```bash
uv run pytest
uv run pytest apps/support/tests apps/accounts/tests/test_terms_and_docs_views.py -q
uv run pytest apps/sales/tests/test_sale_service.py -q
uv run pytest --cov=apps --cov-report=term-missing
```

`pytest.ini`da `--reuse-db` bor. Migratsiya yoki test bazasi eski bo‘lsa `uv run pytest --create-db` bilan yangilang. `@pytest.mark.slow` sinovlarni vaqtincha o‘tkazib yuborish uchun `-m 'not slow'` ishlatiladi. Oldingi hujjatdagi qat’iy “36 ta test” soni amaldagi to‘plamni ifodalamaydi.

`conftest.py` umumiy foydalanuvchi va tenant fixture’larini, `tests/factories.py` esa ma’lumot fabrikalarini beradi. Koddagi rol maydonini o‘zgartirishning o‘zi faol do‘kon a’zoligini yaratmaydi; vakolat testida kerakli `Employee` yozuvini ham yarating.

## Frontend

```bash
cd frontend/ilbi
npm ci
npm test
npm run lint
npm run build
```

Brauzer tekshiruvida akkauntlar va tashrif buyuruvchilar uchun alohida context ishlating. Yordam chati uchun mehmon murojaati, boshqa mehmonning kirishiga rad javobi, operator qabul qilishi, javob, rasm, sahifa yangilanganda tarix, mobil ko‘rinish va tillarni tekshiring.

## Servislarni to‘xtatish

```bash
docker compose -f ilbi/docker-compose.test.yml stop
```

Test servislaridagi ma’lumot vaqtinchalik. Uni haqiqiy mijoz ma’lumotlari yoki yagona zaxira nusxa uchun ishlatmang. Testlar soni va natijasini har bir o‘zgarishda haqiqiy ishga tushirish natijasi bilan qayd eting.
