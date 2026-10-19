# Lightsail serverini boshqarish

2026-10-19 holati: Ubuntu 24.04, 4 GB RAM, 2 GB swap. Ilova `/srv/ilbi`da.
Backend, frontend, PostgreSQL, Redis, Celery worker/beat va Telegram bot ishga tushirilgan.
Eski baza va media ko‘chirilmagan. Domen uchun production konfiguratsiyasi `ilbi.uz`.

## SSH va holat

Arch terminalidan mavjud SSH kalitingiz bilan `ubuntu@3.106.193.2`ga ulaning.
Server ichida:

```bash
cd /srv/ilbi
./ops/compose.sh ps
./ops/compose.sh exec -T ilbi python -B healthcheck.py
./ops/compose.sh logs --tail 100 ilbi
```

Maxfiy fayllar: `.env.production`, `ilbi/.env.production`, `telegram_bot_sms/.env.production`.
Ularning mazmunini Git, issue yoki chatga yubormang. Parollar yangi yaratilgan;
mavjud Telegram bot va SMTP ulanishi saqlangan.

## Birinchi administrator

Serverdagi interaktiv SSH terminalida:

```bash
cd /srv/ilbi
./ops/compose.sh exec ilbi python manage.py createsuperuser
```

O‘zingizning shaxsiy Telegram chat ID, telefon raqami, username va kuchli parolni kiriting.
`@ilbi_bot`ga `/start` yuboring. Parolni chat yoki buyruq qatori argumentiga yozmang.
Production demo login o‘chiq. Administrator yaratish va haqiqiy 2FA login hali operator tomonidan bajariladi.

## DNS va HTTPSni keyin yoqish

Hozir frontend faqat `127.0.0.1:80` va `127.0.0.1:443`da tinglaydi.
Ichki tekshiruv vaqtinchalik self-signed sertifikat bilan o‘tkazilgan; ommaviy HTTPS hali yoqilmagan.

1. Lightsail **Networking**da Static IPv4 biriktirilganini tekshiring. Hozirgi IP `3.106.193.2`.
   Yangi Static IP boshqacha bo‘lsa, `.env.production`dagi `EXPECTED_PUBLIC_IPV4` va GitHub
   production muhitidagi `DEPLOY_HOST`ni ham yangilang.
2. Ahost orqali domenning `@` A yozuvini yakuniy IPv4ga yo‘naltiring.
   Ishlamaydigan AAAA yozuvi qolmasin; domen NS delegatsiyasi ham ishlashi kerak.
   `www` hozir alohida sozlanmagan.
3. Lightsail firewall’da TCP **80** va **443**ni oching.
4. DNS tarqalgach, serverda:

```bash
cd /srv/ilbi
./ops/enable_https.sh
```

Skript DNSni tekshiradi, Let's Encrypt sertifikatini oladi va frontendni ommaviy portlarga chiqaradi.
DNS yoki sertifikat olish xatosida dastlabki yopiq holat saqlanadi.
Certbot timer va pre/deploy/post hook’lar keyingi yangilanishlarni bajaradi.
Standalone tekshiruv vaqtida frontend qisqa muddat to‘xtaydi; boshqa xizmatlar ishlashda qoladi.
Let's Encrypt sertifikati olingach, avtomatik yangilanishni tekshiring:

```bash
sudo certbot renew --dry-run
```

## Zaxira va tiklash

Qo‘lda yoki CD yangilanishidan oldin:

```bash
cd /srv/ilbi
./ops/backup.sh
```

Bu yozuvchi xizmatlarni qisqa muddat to‘xtatib, DB, mahalliy media va hujjatlarni shifrlaydi;
oldin ishlagan xizmatlar xatoda ham qayta yoqiladi. PostgreSQL va Redis to‘xtatilmaydi.
Backup/deploy parallel ishlashiga `.operations.lock` yo‘l qo‘ymaydi.

- Serverdagi arxivlar: `/srv/ilbi-backups/`, faqat egasiga ochiq.
- Serverdagi sozlama va kalit: `/etc/ilbi-backup/`, faqat egasiga ochiq.
- Arch’dagi nusxalar: `~/.local/share/ilbi-production/backups/`.
- Arch’dagi kalit: `~/.local/share/ilbi-production/keys/data-backup.passphrase`.
- Arch’dagi maxfiy sozlamalar nusxasi: `~/.local/share/ilbi-production/secrets/`.

Birinchi arxiv serverdan Arch’ga ko‘chirildi. Keyingi nusxalar uchun tashqi uzatish va kunlik jadval
hali yoqilmagan; CD har yangilanishdan oldin serverda nusxa oladi. Eski arxivlar avtomatik o‘chirilmaydi.
Server diski yo‘qolishidan himoya qilish uchun yangi arxivlarni ham boshqa qurilmaga ko‘chiring.
Kalitni arxiv bilan birga ommaviy joyga yuklamang.

To‘liq tiklash yo‘riqnomasi: [DATA_BACKUP_RESTORE_UZ.md](../docs/DATA_BACKUP_RESTORE_UZ.md).
2026-10-19 dagi dastlabki arxiv tekshirildi va alohida, tarmoqsiz PostgreSQL konteyneriga tiklandi;
sxema va bo‘sh foydalanuvchilar bazasi tasdiqlandi, sinov resurslari tozalandi.

## CI/CD holati

CI backend va frontend testlariga qo‘shimcha ravishda HTTPS chegarasi, aktivatsiya xatolari
va backupdan keyingi qayta ishga tushirishni tekshiradi.

`deploy.yml` muvaffaqiyatli **main push CI** natijasidan keyin uchta `linux/amd64` production imagelarini
GitHub’da yig‘ib, GHCR’ga `sha-<commit>` bilan joylaydi. Serverda pull → shifrlangan backup →
migratsiya/start → healthcheck bajariladi. Serverda har safar build qilish talab etilmaydi.
Ilova ichida tahrirlanadigan `docs/` CD orqali ustidan yozilmaydi.

GitHub’da `production` muhiti va maxsus SSH kaliti sozlangan:

- Secrets: `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`.
- Muhit variables: `DEPLOY_HOST`, `DEPLOY_USER`.
- Repo variable: **`DEPLOY_ENABLED=false`** — hozir avtomatik deploy o‘chiq.

Joriy ishchi daraxtda ko‘plab oldingi o‘zgarishlar bor. Ular bu deployment davomida commit/push qilinmadi.
CDni yoqishdan oldin joriy ILBI manbalari, Dockerfile, production Compose, `ops/`, backup skripti,
testlar va workflow’lar mavjud review/publish tartibi orqali `main`ga chiqarilishi kerak.
So‘ng repo variable `DEPLOY_ENABLED=true` qilinadi. Keyingi muvaffaqiyatli main push CI deploy qiladi.
CD GitHub’da hali biror marta bajarilmagan.

Image yuklashda ishlatiladigan GHCR token serverga stdin orqali uzatiladi;
vaqtinchalik Docker credential katalogi SSH sessiyasi tugaganda o‘chiriladi.
Deploy SSH kaliti shaxsiy EC2 kalitidan alohida; serverdagi yozuvga `restrict` qo‘yilgan.

Yangilanish xatoda qolsa, `.env.production.previous` va backup saqlanadi.
Avtomatik schema rollback bajarilmaydi: migratsiya mosligini tekshirib, avvalgi image yoki ajratilgan
tiklash nusxasi orqali operator qaror qiladi. `down -v` va umumiy `docker system prune --volumes` ishlatmang.

## Tekshirilgan imkoniyat chegarasi

Yuklamasiz xizmatlar taxminan 700 MB RAM ishlatdi. Bu ko‘p foydalanuvchidagi tezlik kafolati emas.
Haqiqiy admin/2FA, email yetkazilishi va biznes oqimlari alohida sinovdan o‘tkaziladi.
Koddagi mavjud retail POS production cheklovi saqlangan: fiskal integratsiya tayyor bo‘lmaguncha
haqiqiy retail savdo bloklanadi. Serverni joylash bu cheklovni olib tashlamaydi.
