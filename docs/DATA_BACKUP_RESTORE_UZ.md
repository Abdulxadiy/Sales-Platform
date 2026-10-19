# Ma’lumotlarni zaxiralash va qayta tiklash

Yangilangan: **2026-10-19**.

Vosita sun’iy ma’lumotlarda tekshirilgan. 2026-10-19 kuni Lightsail’dagi yangi production bazasi ham nusxalandi, alohida tarmoqsiz PostgreSQL konteyneriga tiklanib tekshirildi va sinov resurslari tozalandi. Dastlabki shifrlangan arxiv hamda tiklash kalitining alohida nusxalari Arch kompyuterida saqlandi. Kunlik jadval va keyingi arxivlarni avtomatik tashqi uzatish hali yoqilmagan. Amaldagi server buyruqlari va CI/CD holati [ops/README.md](../ops/README.md)da.

## Nima saqlanadi?

[`scripts/data_backup.py`](../scripts/data_backup.py) bitta parol bilan shifrlangan `.tar.gpg` fayl tayyorlaydi:

| Tarkib | Saqlanadigan ma’lumot |
| --- | --- |
| Asosiy PostgreSQL 16 bazasi | Savdolar, qarzlar, mahsulotlar, foydalanuvchilar, sozlamalar; DB ichidagi support rasm/ovozlari ham |
| Mahalliy `media` | Mahsulot va profil rasmlari, boshqa yuklangan fayllar |
| Serverdagi `docs` | Administrator o‘zgartirgan qo‘llanmalar va hujjatlar |
| Manifest | UTC vaqti, dastur versiyasi, manba nomi, fayllarning hajmi va SHA-256 tekshiruvi |

Bu vosita **mahalliy media** uchun. `USE_MINIO=True` yoki `storage=minio` aniqlansa, to‘liq nusxa olingandek ko‘rsatmay, xato qaytaradi. MinIO/S3 bucket nusxasi uchun keyingi alohida ish kerak.

Kodning GitHubdagi nusxasi savdo bazasi va rasmlarning o‘rnini bosmaydi. Mavjud `scripts/install_backup_timer.py` kodni saqlashga tegishli; yangi vosita uning ishini o‘zgartirmaydi.

## Serverda tayyorlash

Talablar: Linux, Python 3.11+, Dockerga kirish, `gpg` va `gpgconf`. Tiklash uchun `postgres:16-alpine` image oldindan mavjud bo‘lsin; vosita uni internetdan avtomatik yuklamaydi. Qo‘shimcha Python kutubxonasi kerak emas.

Zaxira va kalit loyiha katalogidan tashqarida, joriy operatorga tegishli bo‘lishi kerak. Quyidagi yo‘llar misol; ularni serverga moslang:

```text
/srv/ilbi-backups/                  # nusxalar: chmod 700
/etc/ilbi-backup/                   # sozlama va kalit: chmod 700
/etc/ilbi-backup/config.json        # ops/data-backup.example.json nusxasi
/etc/ilbi-backup/passphrase         # parol: chmod 600
```

Operatorga tegishli yopiq kataloglar tayyor bo‘lgach, [`ops/data-backup.example.json`](../ops/data-backup.example.json)ni ko‘chiring. Undagi Compose loyiha nomi, PostgreSQL/media konteyner nomlari, baza, DB foydalanuvchisi va haqiqiy `docs` yo‘lini moslang. Masalan, `docs_directory` serverdagi repo `/srv/ilbi` bo‘lsagina `/srv/ilbi/docs` bo‘ladi. Konteynerlarni ko‘rish:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps -a
```

Parolni buyruq argumentiga, `.env`ga yoki Gitga yozmang. Ushbu misol uni ekranga chiqarmay, yangi yopiq faylga yaratadi; avval mavjud kalitni almashtirmaydi:

```bash
python3 - <<'PY'
import os
import secrets

fd = os.open('/etc/ilbi-backup/passphrase', os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(fd, 'w') as stream:
    stream.write(secrets.token_urlsafe(32) + '\n')
PY
```

Parolning qo‘shimcha nusxasini ishonchli parol menejeri yoki alohida himoyalangan joyda saqlang. Uning yagona nusxasi serverda qolmasin: parolsiz arxivni tiklab bo‘lmaydi. Kalit o‘zgartirilsa, eski nusxalar uchun eski kalit ham kerak.

Shifrlash AES-256 bilan GnuPG orqali bajariladi. Parol GnuPGga fayl deskriptori orqali uzatiladi; buyruq qatoriga chiqarilmaydi. [GnuPG: passphrase-fd va loopback](https://www.gnupg.org/documentation/manuals/gnupg/GPG-Esoteric-Options.html).

## Nusxa olish

PostgreSQL dump baza ichida mos nusxa beradi, ammo rasmlar va tashqi fayllarni o‘zi muvofiqlashtirmaydi. Shu sababli ushbu dastlabki usulda **yozuvchi xizmatlar vaqtincha to‘xtatiladi**. [PostgreSQL 16: pg_dump](https://www.postgresql.org/docs/16/app-pgdump.html).

Bu qisqa xizmat tanaffusini talab qiladi. Operator oldin qaysi xizmatlar ishlayotganini qayd qiladi, tashqi yozuvlar va hujjat tahririni ham to‘xtatadi. Keyin kelishilgan xizmat oynasida:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml stop ilbi celery_worker celery_beat bot
python3 scripts/data_backup.py create \
  --config /etc/ilbi-backup/config.json \
  --output-dir /srv/ilbi-backups \
  --passphrase-file /etc/ilbi-backup/passphrase \
  --writers-stopped
```

PostgreSQL ishlashda qoladi. Vosita xizmatlarni o‘zi to‘xtatmaydi yoki qayta yoqmaydi; loyiha ichidagi yozuvchi xizmat ishlayotgan bo‘lsa nusxa olishni rad etadi. `--writers-stopped` tashqi yozuvchilar ham to‘xtatilganining operator tasdig‘i. Nusxa olish tugagach yoki xato bilan to‘xtasa, **avval faol bo‘lgan xizmatlarni** qayta yoqing; avval o‘chirilgan xizmatni tasodifan ishga tushirmang. Barchasi oldin faol bo‘lgan holat uchun:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml start ilbi celery_worker celery_beat bot
```

Media to‘xtatilgan konteynerdan olinadi; Docker buni qo‘llaydi. Symlink, hardlink va maxsus faylli arxivlar xavfsizlik sabab rad etiladi. [Docker: container cp](https://docs.docker.com/reference/cli/docker/container/cp/).

Muvaffaqiyatda JSON javob `archive`, `sha256`, `files`, `created_at`ni beradi. Yangi nusxa shifrdan qayta ochilib tekshirilgandan keyingina yakuniy nom bilan chiqariladi. Xatoda qisman fayl tayyor nusxa deb ko‘rsatilmaydi; shu katalogga parallel nusxa olish bloklanadi. Oldingi nusxalar ustidan yozilmaydi va avtomatik o‘chirilmaydi.

## Nusxani tekshirish

`--archive`ga yaratish javobidagi haqiqiy fayl yo‘lini yozing:

```bash
python3 scripts/data_backup.py verify \
  --archive /srv/ilbi-backups/ilbi-data-VAQT-ID.tar.gpg \
  --passphrase-file /etc/ilbi-backup/passphrase
```

Bu parolni, GnuPG yaxlitlik tekshiruvini, xavfsiz arxiv tarkibini va fayl checksumlarini tekshiradi. Baza va ilovaning to‘liq ishlashini tekshirish uchun quyidagi **tiklash sinovi ham** bajariladi.

## Alohida joyga tiklash

Vosita mavjud production bazasini nishon sifatida qabul qilmaydi. Har safar yangi PostgreSQL konteyneri va yangi volume ochadi; hostga port chiqarmaydi va tarmoqqa ulamaydi. Tiklangan fayllar uchun ham yangi, hali mavjud bo‘lmagan katalog talab qilinadi:

```bash
python3 scripts/data_backup.py restore \
  --archive /srv/ilbi-backups/ilbi-data-VAQT-ID.tar.gpg \
  --passphrase-file /etc/ilbi-backup/passphrase \
  --destination /srv/ilbi-recovery/SINOV-001
```

Noto‘g‘ri parol, buzilgan arxiv yoki checksum xatosida yangi baza yaratilmaydi. Tiklash jarayoni xatoda shu urinishga tegishli belgilangan resurslarni tozalaydi. Muvaffaqiyatdan keyin alohida baza operator tekshirishi uchun qoladi:

- `media/`, `docs/`: tiklangan fayllar;
- `restore.json`: yangi konteyner va volume nomi, manba vaqti, versiya;
- yangi DB va foydalanuvchi: `ilbi_restore`.

`restore.json`dagi aniq konteyner nomi bilan yozuvlar soni, oxirgi savdo va qarzlar tekshiriladi. Ishlatilgan buyruqlar natijasini ochiq chat yoki logga chiqarmang. Tiklangan rasmlarni ham ochib tekshiring. Bu tekshiruv amaldagi ilovani tiklangan bazaga avtomatik o‘tkazmaydi.

`pg_restore` SQL buyruqlarini bajaradi; faqat o‘zingizga tegishli ishonchli nusxalarni ishlating. Vosita shu sabab tiklashni ajratilgan konteynerda bajaradi. DB obyektlari yangi egaga o‘tkaziladi, eski serverning role/grantlari tiklanmaydi. [PostgreSQL 16: pg_restore](https://www.postgresql.org/docs/16/app-pgrestore.html).

Sinov tugagach, **faqat shu sinovning `restore.json`ida ko‘rsatilgan** konteyner va volume o‘chiriladi. Avval konteyner, keyin volume; umumiy `docker system prune` yoki production volume o‘chirish buyruqlarini ishlatmang. Tiklangan fayllar ham tekshiruv tugagach operator tomonidan tozalanadi. Haqiqiy avariyada bazani ilovaga ulash, media ruxsatlarini moslash va trafikni qaytarish alohida tiklash ishlari hisoblanadi.

## Joy, maxfiy fayllar va qolgan ishlar

Yakuniy arxiv `600`, backup katalogi `700` ruxsatida saqlanadi. Ish paytida repo tashqarisidagi yopiq vaqtinchalik kataloglarda shifrlanmagan dump va fayllar ham bo‘ladi; oddiy tugash yoki xatoda tozalanadi. Diskda bir nechta nusxa sig‘adigan joy kerak. Mos `TMPDIR` uchun yopiq va imkon bo‘lsa shifrlangan disk tanlang. Elektr uzilishi kabi majburiy to‘xtashdan keyin vaqtinchalik katalog qolishi mumkin; odatiy o‘chirish diskdan xavfsiz yo‘q qilish kafolati emas.

Arxivni ochish limiti odatda **100 GiB va 100 000 yozuv**. `verify`/`restore` uchun hajm limiti `--max-unpacked-gib` bilan beriladi. Bu GnuPG vaqtinchalik tarni yozishidan oldingi disk kvotasi emas; disk joyini oldindan ta’minlash kerak.

Quyidagilarni serverni ishga tushirishda alohida hal qilish zarur:

1. **Boshqa serverdagi nusxa.** Shu serverdagi yagona arxiv server diski yo‘qolsa yordam bermaydi. Dastlabki nusxa Arch kompyuteriga ko‘chirilib, yana tekshirildi. Keyingi arxivlarni ham alohida qurilmaga uzatish, saqlash muddati va muntazam tiklash sinovi kerak; bu uzatish hali avtomatik emas.
2. **Jadval va saqlash muddati.** Qachon nusxa olinishi, qancha kun saqlanishi, disk to‘lishi va xatoni kim kuzatishi belgilanadi. Hozir timer ham, eski nusxalarni o‘chirish ham yoqilmagan. Uzluksiz WAL/PITR tiklash bu vositada yo‘q; oxirgi nusxadan keyingi yozuvlar unda bo‘lmaydi.
3. **Maxfiy server sozlamalari.** Haqiqiy `.env.production`lar, TLS xususiy kaliti, tashqi xizmat kalitlari va parol menejeri arxivga avtomatik qo‘shilmaydi. Ularning alohida himoyalangan tiklash nusxasi kerak. Nusxa vaqtida ishlagan aniq kod commit/release va image versiyalarini ham saqlang; manifestdagi dastur versiyasi buning to‘liq o‘rnini bosmaydi.
4. **Qo‘shimcha bazalar va storage.** Vosita sozlangan bitta DBni oladi, serverning barcha bazalarini yoki global rollarini emas. Real ishlatiladigan qo‘shimcha baza bo‘lsa alohida nusxalanadi. `init-db.sql`dagi legacy `shop_db` o‘chirilmaydi. MinIO/S3 ishlatilsa bucket zaxirasi qo‘shilmaguncha bu usul yetarli emas.
5. **Qayta ishga tushirish.** Redis/OTP/cache va Celery navbati nusxalanmaydi; statik fayllar builddan qayta olinadi. Avariyadan keyin tugallanmagan vazifalar va tashqi to‘lov/fiskal operatsiyalar holati solishtiriladi. Aniq ilova versiyasi bilan migratsiya, kirish, savdo/qarz va rasm sinovi o‘tkazilgach trafik qaytariladi.

## Avtomatik tekshiruv

[`tests/deployment/test_data_backup.py`](../tests/deployment/test_data_backup.py) haqiqiy PostgreSQL 16 va GnuPG bilan **faqat sun’iy** savdo/qarz, binary fayl, rasm va hujjatlarni nusxalaydi va tiklaydi. Foreign key, sequence va asl manbaning o‘zgarmagani ham tekshiriladi. Xato parol, buzilgan nusxa, checksum, xavfli arxiv yo‘llari, parallel ishga tushish, ishlayotgan yozuvchi va MinIO holatlari sinovdan o‘tadi.

```bash
python3 -m unittest discover -s tests/deployment -p 'test_data_backup.py' -v
```

Sinovlar yangi, tarmoqsiz konteynerlardan foydalanadi; amaldagi ilova bazasini o‘qimaydi va o‘zgartirmaydi. O‘z sinov konteynerlari va volumelarini yakunda tozalaydi. Ushbu lokal dalil haqiqiy serverdagi zaxira jadvali yoki tashqi nusxa ishlayotganini anglatmaydi.
