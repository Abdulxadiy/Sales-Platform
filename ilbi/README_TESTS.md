# ILBI testlarini ishga tushirish

Yangilangan: **2026-10-16**. Testlar PostgreSQL va Redis’ning alohida servislaridan foydalanadi; demo/dev bazasi bilan aralashtirmang.

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

## JWT xavfsizlik versiyasi

```bash
uv run pytest apps/accounts/tests/test_token_version_validation.py apps/accounts/tests/test_token_revocation.py apps/accounts/tests/test_jwt_claims.py -q
```

Testlar sun’iy user va test kaliti bilan haqiqiy imzolangan JWTlarni haqiqiy API endpointlarga yuboradi. Access/refreshda yo‘q, null, boolean, float, string, ro‘yxat, obyekt va mos kelmagan versionlar `401` bo‘lishi kerak. Token payloadi o‘zgartirilgach qayta imzolanadi, shuning uchun faqat imzo xatosi sabab test o‘tib ketmaydi.

Joriy butun sonli version, yangilangan access token bilan APIga kirish, inactive/deleted user rad etilishi va haqiqiy parol almashtirishdan keyingi bekor qilish tekshiriladi. Parol almashtirilgach eski access/refresh va versionsiz tokenlar rad etiladi, yangi chiqarilgan tokenlar ishlaydi. Faqat ajratilgan test DB ishlatiladi; haqiqiy user sessiyalari yoki bazasi o‘zgartirilmaydi.

## Production so‘rov cheklovlari

```bash
uv run pytest apps/core/tests/test_production_settings.py apps/core/tests/test_shared_throttles.py -q
```

Ushbu tekshiruv uchun Docker va oldindan mavjud `redis:7-alpine` image kerak. Sinov yangi vaqtinchalik Redisni tasodifiy `127.0.0.1` portida ochadi, diskka doimiy yozishni o‘chiradi va yakunda konteynerini tozalaydi. Amaldagi Redis yoki ilova bazasi ishlatilmaydi; DBga ulanishga urinish testda rad etiladi.

Chek uchun `60/minute`, do‘kon yaratish uchun `5/day` limiti haqiqiy production sozlamasini yuklagan alohida Python jarayonlarida tekshiriladi. Bir jarayonda limit to‘lsa, yangi jarayonda ham `429` va `Retry-After` olinishi kerak. Boshqa IP/owner mustaqilligi, vaqt oynasi o‘tganidan keyin qayta ruxsat, cheklangan ownerning do‘kon ro‘yxatini ochishi, support/login kalitlarining ajratilishi va Redis yo‘qligida lokal hisobga yashirin qaytmaslik ham tekshiriladi. Vaqt oynasi kutish bilan emas, test soatini siljitish bilan tekshiriladi.

Bu sinovlarda persistence handler va membership tekshiruvi almashtirilgan; haqiqiy view dispatch, DRF throttle, Redis va HTTP javob ishlaydi. Biznes ma’lumotlari va ruxsatlar tegishli sales/tenants/support/login API testlarida alohida tekshiriladi. Mavjud DRF algoritmi atomar emas; juda ko‘p bir vaqtdagi so‘rovlar uchun qat’iy kafolat deb qabul qilinmaydi.

## Production texnik API hujjatlari

```bash
uv run pytest apps/core/tests/test_api_docs_production.py apps/core/tests/test_production_settings.py -q
```

Yangi tekshiruvlar alohida jarayonlarda soxta maxfiy kalit bilan ishlaydi; dotenv o‘qish hamda DB/Redis ulanishlari bloklanadi. Productionda schema/Swagger/Redoc va slashsiz URLlar `404`, development/testda UI `200` qaytarishi tekshiriladi. Production sozlamasida `spectacular` command orqali OpenAPI yaratish va validatsiya ham tekshiriladi. Asosiy API, mahsulot qo‘llanmasi, support va readiness route’lari mavjudligi tekshiriladi.

Mavjud `apps/core/tests/test_docs.py` sxema va UI javoblarini test muhitida tekshiradi. Mahsulot qo‘llanmasining rol/ruxsat testlari `apps/accounts/tests/test_terms_and_docs_views.py`da. Bu fayldagi eski `test_docs_edit_only_platform_admin` vaqtincha repodagi haqiqiy hujjatga yozadi; faqat o‘qish regressiyasida uni `-k 'not test_docs_edit_only_platform_admin'` bilan tashlab ketish kerak. Uning fayl izolatsiyasini tuzatish bu production URL o‘zgarishiga kirmaydi.

## Ilovaning tayyorligi

```bash
uv run pytest apps/core/tests/test_readiness.py apps/core/tests/test_production_settings.py -q
```

Docker va oldindan mavjud `postgres:16-alpine`, `redis:7-alpine` image’lari kerak. Sinov yangi sun’iy DB/Redis konteynerlarini faqat lokal portlarda, vaqtinchalik xotira storage bilan ochadi. Alohida WSGI jarayoni haqiqiy production sozlamasida ishlaydi, lekin faqat shu yangi xizmatlarga ulanadi; haqiqiy DB, env va Redis ishlatilmaydi. Yakunda o‘z jarayoni va konteynerlari tozalanadi.

Baza va Redis navbat bilan to‘xtatilganda HTTP `503`, qayta ishga tushgach `200` va healthcheck muvaffaqiyati tekshiriladi. Sinov DBsida jadval yaratilmagani va Redisga kalit yozilmagani ham tekshiriladi. Tashqi peer/soxta proxy headerlari rad etilishi, faqat GET/HEAD, xato tafsiloti va parolning javob/logga chiqmasligi, cache taqiqlanishi hamda HTTP checker noto‘g‘ri JSON/redirectni tayyor deb qabul qilmasligi tekshiriladi.

Repo ildizidan `python3 -m unittest discover -s tests/deployment -p 'test_https_edge.py' -v` production Compose start shartlarini va haqiqiy ajratilgan Nginxda readiness manzilining tashqaridan yopilganini tekshiradi. Bu test uchun avvalgi HTTPS image/OpenSSL talablari ham bajarilishi kerak.

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
