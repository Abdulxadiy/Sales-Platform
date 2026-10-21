# Lightsail serverini boshqarish

2026-10-20 holati: Ubuntu 24.04, 4 GB RAM, 2 GB swap. Ilova `/srv/ilbi`da.
Backend, frontend, PostgreSQL, Redis, Celery worker/beat va Telegram bot ishga tushirilgan.
Eski baza va media ko‘chirilmagan. Vaqtinchalik production domeni **`new-dev.site`**;
asosiy `ilbi.uz` keyin ulanadi. Backend va frontend manzili serverdagi `.env.production`ning
`PUBLIC_HOST` qiymatidan olinadi. Ushbu domen almashinuvi uchun application imagelari qayta yig‘ilmadi.

2026-10-20 qayta tekshiruvida `https://new-dev.site/` haqiqiy TLS tekshiruvi bilan HTTP 200 qaytardi.
Frontend ommaviy 80/443 portlarida ishlayapti; backend readiness `ready`.

Boshlang‘ich o‘rnatma `1.0.0` edi. Avtodeploy GHCR’dagi `sha-<commit>` imagelarini ishlatadi;
oxirgi sog‘lom chiqarishning uchta image manzili `/srv/ilbi/.deployed-images`da saqlanadi.
Git tag va GitHub Release server yangilanishida avtomatik yaratilmaydi;
saqlangan manba bevosita main’ga push qilinadi, versiya esa alohida boshqariladi.

## SSH va holat

Arch terminalidan mavjud SSH kalitingiz bilan `ubuntu@3.106.193.2`ga ulaning.
Bir nechta SSH kaliti agentga qo‘shilgan bo‘lsa, `ssh -o IdentitiesOnly=yes -i KALIT_YOLI ubuntu@3.106.193.2` ishlating.
Server ichida:

```bash
cd /srv/ilbi
./ops/compose.sh ps
./ops/compose.sh exec -T --interactive=false ilbi python -B healthcheck.py
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
Production demo login o‘chiq. 2026-10-20 tekshiruvida administrator mavjudligi tasdiqlandi;
shu serverda uni qayta yaratish kerak emas. Haqiqiy 2FA login DNS/HTTPS yoqilgach operator tomonidan tekshiriladi.
Yo‘l `./ops/compose.sh` — `./ops.compose.sh` emas.

## Xavfsizlik tekshiruvi

2026-10-19 tekshiruvida:

- Tashqaridan faqat SSH porti ochiq topildi; 5432, 6379, 8000 va Docker API portlariga ulanish bo‘lmadi.
  Domen ishga tushguncha 80/443 faqat loopback’da qoladi.
- UFW yoqildi: kiruvchi ulanishlar odatda rad etiladi, 22/80/443ga ruxsat bor; IPv6 qoidalari ham mavjud.
  [Docker e’lon qilgan portlar UFW’ni chetlab o‘tishi mumkin](https://docs.docker.com/engine/network/packet-filtering-firewalls/), shuning uchun Compose’da faqat frontend
  portlari e’lon qilinadi va bu chegara test bilan tekshiriladi.
- SSH’da root, parol, keyboard-interactive, agent forwarding va X11 o‘chirildi.
  Local forwarding saqlangan. Sozlama: `ssh-hardening.conf` → `/etc/ssh/sshd_config.d/00-ilbi-hardening.conf`.
- Maxfiy `.env` va backup kalitlari `600`, kalit/backup kataloglari `700`.
- Barcha faol xizmatlarda `no-new-privileges` bor; backend, Celery va botda barcha Linux capabilities olib tashlangan.
  Backend/Celery UID `1000`, bot UID `10001` bilan ishlaydi. Media/static va docs shu UIDga yozishga moslangan;
  Celery beat jadvali alohida `celery_beat_data` volume’da saqlanadi.
- OS security yangilanishlari o‘rnatildi; avtomatik reboot o‘chirilgan. Kernel yangilanishlari operator rebootini talab qiladi.
  Shu tekshiruvda server kernel `7.0.0-1014-aws` bilan qayta yuklandi: xizmatlar avtomatik qaytdi,
  readiness, HTTPSning yopiq tekshiruvi, SSH va UFW qayta tasdiqlandi. Pending reboot qolmadi.
- Botdagi `multidict` 6.7.1 → 6.9.1 va `urllib3` 2.7.0 → 2.8.0 yangilandi:
  auditda topilgan to‘rtta advisory bartaraf etildi. Backendning 55 va botning 21 runtime paketi,
  frontendning production dependency auditi yakunida ma’lum advisory qolmadi.
- Login/OTP, tenant ruxsatlari, media va ichki servis bo‘yicha 79 ta test o‘tdi.
  HTTPS aktivatsiyasi sertifikatni avval yopiq ulanishda tekshiradi; xatoda ommaviy binding bekor qilinadi.
  Botning kontakt xavfsizligi uchun 13 ta test ham o‘tdi.
- Ko‘rilgan dastlabki real servis loglarida ERROR/CRITICAL topilmadi, konteynerlarning restart soni 0 edi.

Bu natija tekshirilgan konfiguratsiya, testlar va shu kundagi advisory bazasiga tegishli.
Internetdan HTTPS tekshirildi. Haqiqiy administrator/2FA oqimi operator tomonidan tekshiriladi.
Kunlik avtomatik data backup, muntazam tashqi nusxa va xatolik/sertifikat alertlari hali yoqilmagan.

## Domen almashtirish va HTTPS

`new-dev.site` hozir ommaviy HTTPS bilan ishlaydi. Quyidagi tartib yangi domenni ulash uchun qo‘llanadi.
Yangi sertifikat ommaviy bindingdan oldin yopiq HTTPS ulanishida tekshiriladi.

1. Lightsail **Networking**da Static IPv4 biriktirilganini tekshiring. Hozirgi IP `3.106.193.2`.
   Yangi Static IP boshqacha bo‘lsa, `.env.production`dagi `EXPECTED_PUBLIC_IPV4` va GitHub
   production muhitidagi `DEPLOY_HOST`ni ham yangilang.
2. `new-dev.site` DNS panelida (joriy nameserverlar Spaceship’da) quyidagi yozuvni yarating:

| Type | Host/Name | Value | TTL |
| --- | --- | --- | --- |
| A | `@` | `3.106.193.2` | `300` yoki panel defaulti |

   Static IP o‘zgargan bo‘lsa, Value uchun yangi IP ishlatiladi.
   Ishlamaydigan AAAA yozuvi qolmasin; domen NS delegatsiyasi ham ishlashi kerak.
   `www` hozir alohida sozlanmagan.
3. Lightsail firewall’da TCP **80** va **443**ni oching.
4. DNS tarqalishini serverdagi `dig` bilan tekshiring:

```bash
dig +short @1.1.1.1 A new-dev.site
dig +short @1.1.1.1 AAAA new-dev.site
```

A javobi yakuniy Static IPv4 bo‘lsin. IPv6 frontend hali yoqilmagani uchun AAAA javobi bo‘sh bo‘lishi kerak.
5. DNS tayyor bo‘lgach, serverda:

```bash
cd /srv/ilbi
./ops/enable_https.sh
```

Skript DNSni tekshiradi, Let's Encrypt sertifikatini oladi va frontendni ommaviy portlarga chiqaradi.
Sertifikatning ishonch zanjiri va domeni avval private frontend orqali tekshiriladi.
DNS, sertifikat yoki yakuniy HTTPS xatosida dastlabki binding tiklanadi.
Certbot timer va pre/deploy/post hook’lar keyingi yangilanishlarni bajaradi.
Standalone tekshiruv vaqtida frontend qisqa muddat to‘xtaydi; boshqa xizmatlar ishlashda qoladi.
Let's Encrypt sertifikati olingach, avtomatik yangilanishni tekshiring:

```bash
sudo certbot renew --dry-run
systemctl status certbot.timer --no-pager
curl -I https://new-dev.site
```

Keyin `ilbi.uz`ga o‘tishda uning A yozuvi serverga yo‘naltiriladi va serverdagi
`.env.production`da `PUBLIC_HOST=ilbi.uz` belgilanadi. `enable_https.sh` yangi sertifikatni
olib, backend, Celery va frontendning domen sozlamalarini birga yangilaydi.

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

`deploy.yml` muvaffaqiyatli **main CI** natijasidan keyin uchta `linux/amd64` production imagelarini
GitHub’da yig‘ib, GHCR’ga `sha-<commit>` bilan joylaydi. Serverda pull → shifrlangan backup →
migratsiya/start → healthcheck bajariladi. Serverda har safar build qilish talab etilmaydi.
Ilova ichida tahrirlanadigan `docs/` CD orqali ustidan yozilmaydi.

GitHub’da `production` muhiti va maxsus SSH kaliti sozlangan:

- Secrets: `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`.
- Muhit variables: `DEPLOY_HOST`, `DEPLOY_USER`.
- Repo variable: **`DEPLOY_ENABLED=true`** — avtomatik deploy yoqilgan.

Lokal `ilbi-auto-publish.service` saqlangan kodni 8 soniya tinishdan keyin to‘g‘ridan to‘g‘ri main’ga yuboradi. Oddiy main push CI’ni boshlaydi; kunlik chiqarish navbati yo‘q. Boshqarish: [automation/README.md](../automation/README.md).
CI Windows runner’da paketni yig‘adi, o‘rnatib ichki servisni tekshiradi va o‘chirib ko‘radi.
Deploy shu CI artifactidagi installer hajmi/SHA256/native sinovini tekshiradi,
installer va release feed’ni `/srv/ilbi/desktop/downloads/`ga yuboradi.
Backend/frontend imagelari ham aynan shu commitdan yig‘iladi.
PR va muvaffaqiyatsiz CI serverni yangilamaydi. Tag yoki GitHub Release deploy triggeri emas.
Serverga o‘tishdan oldin testdan o‘tgan commit hali ham main ekanligi tekshiriladi;
kech tugagan eski CI yangi chiqarishning ustidan yozmaydi.
Favqulodda to‘xtatish: repo variable `DEPLOY_ENABLED=false`.

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
