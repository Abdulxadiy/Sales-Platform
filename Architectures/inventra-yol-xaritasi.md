# Inventra — Yakuniy yo'l xaritasi

> **Shu hujjat yagona manba.** Eski `inventra-arxitektura.md`, `inventra-yol-xaritasi.md`, `inventra-yakuniy-arxitektura.md` va `inventra-yakuniy-arxitektura_1.md` endi qo'llanilmasin — ularning qarorlari, ziddiyat yechimlari va hali ochiq ishlari shu yerga jamlangan.
>
> **Qanday ishlatish:** bitta bandni tugatgach, shu fayldagi keyingi `[ ]` ni oching. Tartib — bosqich raqami. Oldingi bosqichdagi ochiq `[ ]` (masalan, E2E test) keyingi poydevorni to'xtatmasa, uni keyinroq qaytib yopish mumkin.
>
> Holat belgisi: `[x]` bajarilgan · `[ ]` qilinishi kerak · `🔶` asosiy qismi bor, qoldiq ochiq.
>
> **2026-09 yirik arxitektura qarori:** Customer identifikatsiyasi (ro'yxatdan o'tish, OTP login, throttle) Inventra'dan **butunlay chiqarilib**, alohida **`Shop`** mikroservisiga (o'z bazasi bilan) ko'chiriladi. Inventra endi faqat `platform_admin` / `owner` / `staff`ni biladi — bular endi customer bosqichisiz, **telefon raqami orqali to'g'ridan-to'g'ri** yaratiladi. Shop tomoni uchun alohida **`shop-yol-xaritasi.md`** ga qarang. Bu qaror hali kod darajasida to'liq amalga oshirilmagan — pastda har joyda aniq belgilangan.

---

## 0. Hal qilingan ziddiyatlar va keyingi qarorlar

### 0.1. Ikki eski hujjat orasidagi farqlar

| Mavzu | Eski arxitektura | Eski yo'l xaritasi | Yakuniy qaror |
|---|---|---|---|
| Foydalanuvchi identifikatori | `email`, `password_hash` | `phone_number` (`USERNAME_FIELD`) | **`phone_number`** |
| Domen | `subdomain` maydoni | Bitta domen, subdomain yo'q | **Bitta domen (`inventra.uz`), subdomain YO'Q** |
| Tenant FK nomi | `tenant_id` | `tenant` | **`tenant`** (Django: FK `_id`siz yoziladi) |
| API qatlami | `api/v1/<app>/` majburiy | Har bir app o'z ichida | **`api/v1/<app>/` tanlandi** (view/serializer/url); biznes logika `apps/<app>/services/` da. 10-bosqich endi "strukturaga o'tish" emas, format/pagination |
| Ro'yxatdan o'tish/login | — | SMS (Eskiz.uz / Play Mobile) | **SMS bekor.** OTP **Telegram bot** orqali |

### 0.2. Keyin qo'shilgan/o'zgargan qarorlar

| Mavzu | Qaror |
|---|---|
| `Employee.user` | `ForeignKey` + partial `UniqueConstraint(condition=Q(is_active=True))` — bir vaqtda bitta faol Employee, tarix cheksiz (**Variant A**) |
| JWT authentication | `REST_FRAMEWORK.DEFAULT_AUTHENTICATION_CLASSES` = `JWTAuthentication` |
| `gunicorn.conf.py` | `preload_app = False` (gevent + `True` `DatabaseError` beradi) |
| `DEBUG` | `.env`dan o'qiladi; to'liq `bool`ga aylantirish — **deploy oldidan**, hozir ataylab qoldirilgan |
| `Tenant.slug` | **Olib tashlandi** — subdomain yo'q, tenant JWT orqali |
| `Tenant.owner` | **`OneToOneField(User)`**, Tenant faqat owner bilan yaratiladi |
| `Tenant.description` | `blank=True` |
| `TenantService.change_owner()` | Dastlab yo'q edi, qo'shildi: platform_admin owner ni almashtiradi (fire + hire) |
| Tenant API | Dastlab faqat create/list/deactivate; hozir **CRUD + change-owner + activate/deactivate** |
| `Employee.position` | Erkin matn; ruxsat bilan bog'liq emas. Ruxsatlar faqat `Employee.permissions` |
| Telefon validatsiyasi | **Shop** (fail-fast). Inventra biznes qoidalariga e'tibor |
| `needs_profile_completion` | `user.profile_completed`; `has_usable_password()` customer uchun mos emas (eslatma: bu customer Inventra'da bo'lgan davrga tegishli, Shop'ga ko'chganda qayta ko'riladi) |
| Testlar | To'liq CI/CD hozircha **kerak emas**. Lokal `pytest` (Redis + Postgres test compose) **kerak** va asosiy servislar uchun yozilgan |
| Paket / muhit | `uv`; Windows + PowerShell |
| Admin panel login | **Ikki qadam:** `username` + `password`, so'ng Telegram OTP, keyin JWT. Customer bu yo'ldan kira olmaydi. To'g'ridan-to'g'ri parol → JWT **yo'q** |
| Admin login throttle | Redis: 5 urinish → 60s; 3 → 1 soat; 1 → 1 kun (strike). 3 ketma-ket strike → `User.is_active=False`. `platform_admin` ham cheklanadi. **Unban endpoint qo'shildi** (pastga qarang) |
| Username enumeratsiyasi (admin) | Noto'g'ri parol va mavjud bo'lmagan username — **bir xil** 401 matn |
| Telefon API javobida | To'liq raqam chiqmaydi; `mask_phone_number` (`+998 90 *** ** 67`) |
| Test settings | `.env.test` `settings.py` importidan **oldin** yuklanadi; testda `MD5PasswordHasher` |
| **Unban endpoint** | `POST /api/v1/auth/unban/ {target_user_id}` — `platform_admin` only. `target_user_id` (PK) orqali ishlaydi, `username` orqali emas — shu tufayli customer uchun ham universal. `User.is_active=True` + tegishli throttle modul(lar)ining to'liq reseti |
| **Ruxsat modeli** | Django'ning `contrib.auth.Permission`si (`ContentType`ga bog'liq) **emas** — custom `apps/permissions.Permission` (`category` + `codename` + `name` + `description`, unique_together). Sabab: ko'pchilik ruxsatlar bitta modelga bog'lanmaydi (masalan `"sales.void_transaction"`), va custom admin panelda kategoriya bo'yicha filtrlash/guruhlash uchun haqiqiy ustun kerak |
| **Owner ruxsati** | Owner o'z tenant'i ichida **har doim to'liq huquqli** — `Employee.permissions` orqali tekshirilmaydi (`platform_admin` kabi bypass). Qaysi tenant ekanligini esa `PermissionService` emas, mavjud `IsTenantMember`/`IsTenantOwnerOrPlatformAdmin` klasslari nazorat qiladi |
| **`EmployeeService.hire()` — boshqa tenant'da faol bo'lsa** | Avvalgi qaror ("avtomatik fire+hire, tenant-transfer oqimi") **bekor qilindi**. Endi: agar `target_user`ning boshqa joyda (yoki shu tenant'da boshqa lavozimda) faol `Employee` yozuvi bo'lsa — hire **to'siladi**, xato qaytariladi. *(Eslatma: bu qaror qabul qilindi, lekin kod hali yangilanmagan — quyida 4-bosqichda ochiq band sifatida belgilangan.)* |
| **Owner/staff yaratish** | Endi "avval customer bo'lib ro'yxatdan o't, keyin hire qilinasan" emas. `platform_admin` (owner uchun) yoki `owner` (staff uchun) **faqat telefon raqamini** kiritadi; Inventra kerak bo'lsa yangi `User`ni **o'zi** yaratadi (get-or-create). *(Qaror qabul qilindi, kod hali yozilmagan.)* |
| **Username/parol o'rnatish va tiklash** | 1.6'dagi asl reja ("Telegram OTP orqali") **bekor qilindi**. Yakuniy qaror: **email orqali** — sabab: staff/owner texnik bilimli bo'lishi mumkin, login (Telegram 2FA) va parol-tiklash bitta kanalda bo'lsa, ikki faktorli himoya aslida bittaga aylanadi. Alohida kanal — haqiqiy defense-in-depth. `User.email` maydoni allaqachon bor (`complete_profile`), staff/owner uchun **majburiy** qilinadi. *(Qaror qabul qilindi, endpointlar hali loyihalanmagan.)* |
| **Telegram bot (`telegram_bot_sms`)** | Endi **ikkala xizmatga** (Inventra + Shop) xizmat qiladi — bitta bot, deep-link orqali marshrutlanadi (`https://t.me/<bot>?start=inventra` / `?start=shop`). `pending_target` xotirada saqlanadi (chat_id → maqsad), kontakt kelganda tegishli `INVENTRA_INTERNAL_URL` yoki `SHOP_INTERNAL_URL`ga yuboriladi. **Kod yangilandi va sinovdan o'tkazildi (2026-09).** Cheklov: xotiradagi holat bot qayta ishga tushganda yo'qoladi; bot ko'p nusxada ishlaydigan bo'lsa qayta ko'rib chiqish kerak |
| **Customer / Shop ajratilishi** | Customer Inventra'dan **butunlay chiqariladi**. Shop — alohida FastAPI mikroservis, **o'z bazasi bilan** (eski reja — "Shop faqat proxy, o'z bazasi yo'q" — endi bekor). Batafsil: `shop-yol-xaritasi.md` |

### 0.3. Hozirgi kod holati (2026-09, yangilangan)

Repo: `Sales-Platform/` — `Inventra/` (Django 6 + DRF), `telegram_bot_sms/` (aiogram, endi ikki xizmatli), `Architectures/` (shu fayl + `shop-yol-xaritasi.md`), ildiz `docker-compose.yml`.

**HTTP (`/api/v1/`) — hozirgi holat:**

| Method | Yo'l | Kim |
|---|---|---|
| POST | `auth/register/request-otp/` | AllowAny, telefon *(customer — Shop'ga ko'chirilishi kerak, hali Inventra'da)* |
| POST | `auth/register/verify-otp/` | AllowAny → JWT + `needs_profile_completion` *(yuqoridagi kabi)* |
| POST | `auth/login/request-otp/` | AllowAny, telefon *(customer — Shop'ga ko'chirilishi kerak, hali Inventra'da)* |
| POST | `auth/login/verify-otp/` | AllowAny → JWT *(yuqoridagi kabi, `customer_login_throttle` bilan)* |
| POST | `auth/complete-profile/` | JWT: ism/familiya/email/tug'ilgan kun |
| POST | `auth/admin-login/` | AllowAny: username+password → OTP yuboriladi, `phone_hint` |
| POST | `auth/admin-login/verify-otp/` | AllowAny: username+kod → `access`/`refresh` |
| POST | `auth/unban/` | `platform_admin` only: `target_user_id` → `is_active=True` + throttle reset **✅ yangi** |
| POST | `internal/telegram/register/` | `Authorization: Internal <token>` |
| GET/POST | `tenants/` | faqat `platform_admin` |
| GET/PATCH | `tenants/<pk>/` | rolga qarab serializer; staff PATCH 403 |
| POST | `tenants/<pk>/change-owner/` | `platform_admin` |
| POST | `tenants/<pk>/activate/` · `deactivate/` | owner (o'z) yoki `platform_admin` |
| POST | `tenants/<tenant_id>/employees/hire/` · `fire/` | owner (o'z tenant) yoki `platform_admin`; **hire endi `permission_ids`ni servisga to'g'ri uzatadi ✅** |

**Servislar:** `EmployeeService`, `TenantService`, `PermissionService` **✅ yangi**, `otp_services` (Redis TTL/cooldown/attempts), `login_throttle` (admin login), `customer_login_throttle` **(yangi, lekin Shop'ga ko'chirilishi rejalashtirilgan)**, `phone_utils.mask_phone_number`, `tg_bot.services.send_telegram_message`.

**Ruxsat qatlami:** `apps/permissions.Permission` (custom model, `category`+`codename`) ✅, `Employee.permissions` shu modelga M2M ✅, `PermissionService.has_permission(user, "category.codename")` ✅, `HasEmployeePermission` DRF klassi ✅ — **5-bosqich to'liq bajarildi**, lekin hali hech qanday real view'ga ulanmagan (staff-facing endpoint yo'q, 9-bosqichda kerak bo'ladi).

**JWT:** `issue_tokens` = `RefreshToken.for_user` — token ichida **maxsus `role` / `tenant_id` claim hali yo'q** (6a hamon ochiq — bu keyingi eng muhim ish).

**Hire API teshigi:** ✅ **YOPILDI** — `EmployeeHireView` endi `permission_ids`ni `EmployeeService.hire(..., permissions=)`ga uzatadi.

**Hali yo'q / ochiq:**
- `TenantMiddleware` (8-bosqich, 6a'ga bog'liq)
- catalog/inventory/sales (9-bosqich)
- Shop mikroservisining o'zi (hali loyihalanmoqda, `shop-yol-xaritasi.md`ga qarang)
- Celery, nginx
- Email orqali parol o'rnatish/tiklash oqimi (qaror bor, kod yo'q)
- Owner/staff'ni telefon orqali to'g'ridan-to'g'ri yaratish (qaror bor, kod yo'q)
- `EmployeeService.hire()`ning "to'siq" mantig'i (qaror bor, kod yo'q — hozircha eski "avtomatik transfer" ishlab turibdi)
- **Customer kodini Inventra'dan olib tashlash** (qaror bor, kod hali o'zgartirilmagan)
- Django admin UI (`config/urls.py`da faqat `api/v1/`)

**Testlar:** `EmployeeService`, `TenantService`, OTP Redis, admin-login (`test_admin_login_views.py`), customer login + throttle (`test_login_views.py`, `test_customer_login_throttle.py` — **bular customer Shop'ga ko'chganda olib tashlanadi/Shop'da qayta yoziladi**), unban (`test_unban_view.py`), `PermissionService`/`HasEmployeePermission`/hire-fix (`test_permission_service.py`, `test_has_employee_permission.py`, `test_employee_hire_view.py`). Register/login (customer) HTTP testlari mavjud, lekin yuqoridagi sababga ko'ra vaqtinchalik.

---

## 1. Qabul qilingan asosiy qarorlar (o'zgarmas qoidalar)

| Mavzu | Qaror |
|---|---|
| Umumiy arxitektura | Inventra (Django + DRF, do'konning ichki boshqaruvi) + Shop (FastAPI, **o'z bazasi bilan**, customer-facing storefront) |
| Joylashuv | Bitta server, bitta docker-compose, ichki Docker tarmog'i |
| Aloqa | JSON/REST; `Authorization: Internal <token>` |
| Domen | `inventra.uz`, subdomain yo'q |
| User ID | `phone_number` = `USERNAME_FIELD`; `username` global unique, admin panel login |
| Admin panel login | `username` + `password`, so'ng Telegram OTP (Django admin UI yo'q; `config/urls.py`da `admin/` ulanmagan) |
| **Inventra foydalanuvchilari** | Faqat `platform_admin` / `owner` / `staff`. **Customer Inventra'da yashamaydi** — Shop'ning ishi. Owner/staff **telefon raqami orqali to'g'ridan-to'g'ri** yaratiladi (customer bosqichisiz) |
| Parol o'rnatish/tiklash | **Email orqali** (Telegram emas) — alohida kanal, defense-in-depth |
| OTP saqlash | Redis, TTL; bazada emas |
| Multi-tenancy | Shared DB + `tenant` FK (schema-per-tenant emas) |
| Tenant aniqlash | **Faqat JWT dan**, so'rov parametridan/frontendan emas |
| Ruxsat | `Employee.permissions` → custom `apps/permissions.Permission` (`category`+`codename`). `user.user_permissions` **emas** — tenant transferda eski ruxsat qolmasin |
| `User` vs `BaseModel` | `User` `BaseModel`dan meros olmaydi (`tenant` nullable — `platform_admin`/yangi yaratilgan owner uchun) |
| Media | S3-mos obyekt xotirasi, server diski emas |
| Internal endpoint | Faqat Docker ichki tarmog'ida, tashqariga ochilmaydi |

### 1.1. Rol ierarxiyasi

| Rol | Kim tayinlaydi | Vakolat |
|---|---|---|
| `platform_admin` | Tizim (qo'lda / superuser) | Cheklovsiz. Owner tayinlash **faqat** shu rol |
| `owner` | Faqat `platform_admin` (Tenant yaratish orqali, telefon raqami bilan) | O'z tenantida faqat `staff` hire/fire; barcha ruxsatlarga tenant ichida to'liq ega |
| `staff` | Faqat `owner` (o'z tenantida, telefon raqami bilan) | Userlarni hire/fire qila olmaydi |

~~`customer`~~ — **Inventra'da endi mavjud emas** (Shop'ga ko'chirildi).

Har bir rol faqat o'zidan **bitta past** darajani boshqaradi: `platform_admin` → `owner`, `owner` → `staff`. `hire()` orqali `platform_admin` yoki `owner` berib bo'lmaydi — `owner` faqat Tenant yaratish/almashtirishda.

### 1.2. Employee — owner uchun ham (Variant A)

Owner tayinlanganda ham `hire()`: `Employee` (`position="Owner"`, `is_active=True`).

- Tarixning yagona manbai — `Employee` jadvali
- **Ochiq savol (customer olib tashlanishi bilan bog'liq):** eski qoida "owner almashtirilsa, eski owner `fire()` orqali `customer` bo'ladi" edi. Customer roli Inventra'dan chiqqach, `fire()` qilingan userning `role`i **nima bo'lishi kerak**? Pastga, "5. Ochiq dizayn" jadvaliga qarang (yangi band G)

`Employee.user`: `ForeignKey` + partial unique (`is_active=True`).

### 1.3. `EmployeeService.hire()`

```
hire(target_user, tenant, hired_by, permissions, position="", role="staff")
```

1. `role == "staff"` → `hired_by.role in ("owner", "platform_admin")`. `role == "owner"` → `hired_by.role == "platform_admin"`.
2. ~~Faol Employee bo'lsa — avtomatik `fire()`, keyin yangisi~~ **BEKOR QILINDI.** Yangi qaror: agar `target_user`ning boshqa joyda (yoki shu tenant'da) faol `Employee` yozuvi bo'lsa — **hire to'siladi**, `EmployeeServiceError` qaytariladi. *(Kod hali yangilanmagan — bajarilishi kerak.)*
3. `username`/`password`ga **tegmaydi**.
4. `User.role`, `User.tenant` yangilanadi; `Employee` yaratiladi; `permissions` berilsa M2M ga yoziladi. ✅ (`permission_ids` → `permissions=` uzatilishi tuzatildi)
5. `platform_admin`ni hire qilib bo'lmaydi.

### 1.4. `EmployeeService.fire()`

1. Faol Employee: `is_active=False`, `fired_at=now()`, `fired_by`
2. ~~`User.role = "customer"`, `User.set_unusable_password()`~~ — **customer roli olib tashlangani sababli qayta ko'rib chiqilishi kerak.** Pastga, "5. Ochiq dizayn" jadvaliga qarang (yangi band G)

**Saqlanadi (tozalanmaydi):** `User.username`, `User.tenant` (tarix).

**JWT qoidasi:** `User.tenant` fire'dan keyin ham qoladi. Token / tenant-scoping **faqat** `role in ("staff", "owner")` da `User.tenant`dan foydalanadi. `platform_admin` uchun `tenant_id` claim **har doim `null`**.

### 1.5. Tenant

```
Tenant: name (unique), owner (OneToOneField User, majburiy), description (blank), is_active, created_at
# slug YO'Q
```

`TenantService.create_with_owner(name, owner_phone_number, created_by)` — faqat `created_by.role == "platform_admin"`:

1. Berilgan telefon raqami bo'yicha `User` mavjudmi tekshiriladi; bo'lmasa — yangi `User` yaratiladi (`role="owner"`, `profile_completed=False`) **← qaror bor, kod hali eski (`owner_user: User` obyekti kutadi)**
2. `owner_user` platform_admin bo'lsa — xato
3. Allaqachon boshqa tenant owner bo'lsa — tushunarli xato
4. Tenant yaratiladi
5. `EmployeeService.hire(..., role="owner", position="Owner")`

O'chirish: hard-delete yo'q, `is_active=False`.

`OneToOneField(owner)`: bir vaqtda bitta tenant. Umrida faqat bir marta owner bo'lishi shart emas — almashtirilsa, keyin boshqa tenantga owner bo'lishi mumkin. Tarix `Employee`da.

`TenantService.change_owner(tenant, new_owner, changed_by)`: faqat platform_admin; eski owner `fire()`, yangisi `hire(role="owner")`.

**Owner permission — ✅ YOPILDI:** owner o'z tenant'i ichida har doim to'liq huquqli, `Employee.permissions` orqali tekshirilmaydi.

### 1.6. Username / password — ✅ dizayn qarori qabul qilindi

- Inventra'da endi `customer` yo'q, shuning uchun bu band faqat `staff`/`owner`/`platform_admin`ga tegishli
- **Email orqali** o'rnatiladi/o'zgartiriladi (Telegram OTP orqali **emas** — login 2FA'dan alohida kanal bo'lishi kerak, xavfsizlik uchun)
- `User.email` — staff/owner uchun **majburiy** qilinadi (hozir `complete_profile`da ixtiyoriy)
- Hech kim (owner ham) boshqasining parolini to'g'ridan-to'g'ri qo'ya olmaydi
- **Kirish** (allaqachon kodlangan, 6b): mavjud username+password + Telegram OTP. Bu — "birinchi marta qo'yish" emas, 2FA login
- **Ochiq qoldi:** aniq endpointlar (`request-email-code`, `verify-and-set-password` kabi), email yuborish infratuzilmasi (`django.core.mail`, SMTP sozlamalari `.env`ga) — bular hali loyihalanmagan, keyingi ish

---

## 2. Texnik poydevor (qayerda nima yashaydi)

```
Sales-Platform/
  Inventra/                 # Django + DRF (core backend — do'konning ichki boshqaruvi)
    apps/core|tenants|accounts|tg_bot|permissions
    apps/accounts/services/ # employee_service, tenant_service (tenants appda), permission_service,
                             # otp_services, login_throttle, customer_login_throttle (↑Shop'ga ko'chadi), phone_utils
    api/v1/                 # HTTP qatlam (accounts, tenants, tg_bot)
    api/permissions.py      # IsInternalService, IsPlatformAdmin, IsOwner, IsTenantMember, HasEmployeePermission, ...
    config/settings_test.py # pytest: .env.test → alohida Postgres/Redis
    docker-compose.test.yml # host 5433 / 6380
  Shop/                      # FastAPI, o'z bazasi bilan — hali yaratilmagan, shop-yol-xaritasi.md
  telegram_bot_sms/         # aiogram listener — ENDI IKKI XIZMATLI (Inventra + Shop, deep-link marshrutlash) ✅ yangilandi
  Architectures/            # shu yo'l xaritasi + shop-yol-xaritasi.md
  docker-compose.yml        # postgres, redis, inventra, bot (shop/celery/nginx hali yo'q)
```

- Biznes logika `views.py`da emas, `services/`da
- Test: `docker compose -f Inventra/docker-compose.test.yml up -d` → `uv run pytest` (`config.settings_test`)

---

## 3. Bosqichlar (0 dan tugaguncha)

### 0-bosqich — Boshlang'ich sozlash ✅

- [x] `uv`, Django, DRF, `simplejwt`, `django-environ` / dotenv, `django-filter`, `psycopg`
- [x] Loyiha skeleti (`config`, `manage.py`), `apps/` tuzilmasi, `.env`

### 1-bosqich — `core` va `tenants` ✅

- [x] `BaseModel`: `tenant`, `created_at`, `updated_at`, `abstract=True`
- [x] `Tenant` modeli (yakuniy shakl: `name`, `owner`, `description`, `is_active`, `created_at`; `slug` yo'q)
- [x] PostgreSQL sozlamasi (development/test da compose orqali)

### 2-bosqich — `accounts`: custom User ✅

- [x] `User(AbstractBaseUser, PermissionsMixin)`: `phone_number` (USERNAME_FIELD, unique, normallashtiriladi), `username`, `email`, `first_name`, `last_name`, `date_of_birth`, `tenant` (nullable FK), `role`, `is_active`, `is_staff`, `is_phone_verified`, `profile_completed`, `created_at`
- [x] `UserManager`: `create_user`, `create_superuser`
- [x] `AUTH_USER_MODEL = 'accounts.User'`
- [x] `Employee`: FK `user`, `position`, `hired_at`, `fired_at`, `is_active`, `hired_by`, `fired_by`, `permissions` M2M → `apps.permissions.Permission`, partial unique faol yozuvga
- [ ] **Yangi:** `User.role` tanlovlaridan `"customer"`ni olib tashlash (customer Shop'ga ko'chgach)

### 3-bosqich — Telegram OTP (register / login) — ⚠️ **Shop'ga ko'chiriladi**

Bu butun bosqich **customer**ga tegishli edi. Customer Inventra'dan chiqarilgani sababli, quyidagi bandlar **Shop'da qaytadan yoziladi**, Inventra'dan esa olib tashlanadi:

- [x] ~~Register / login request-otp va verify-otp~~ → Shop'ga
- [x] ~~`customer_login_throttle`~~ → Shop'ga
- [x] **Yangi vazifa:** Inventra'dan `register.py`, customer `login.py` qismi, `customer_login_throttle.py`, tegishli testlarni olib tashlash ✅

**Inventra'da qoladigan qism** (bu — customer emas, staff/owner 2FA'si uchun, alohida band sifatida pastga, 6-bosqichga ko'chirildi):
- [x] `TelegramContact` (`phone_number` unique, `chat_id`)
- [x] Internal endpoint + `IsInternalService`
- [x] `send_telegram_message()`, OTP servis (Redis)
- [x] Bot listener (`telegram_bot_sms`) — **endi ikki xizmatli, deep-link bilan** ✅

### 4-bosqich — `EmployeeService` ✅ **TO'LIQ BAJARILDI**

- [x] `hire()` — 1.3 qoidalari, `select_for_update`
- [x] `fire()` — 1.4 qoidalari (Variant A bo'yicha: `role` saqlanadi, `set_unusable_password()`, faol employment yopiladi) ✅
- [x] Unit testlar: staff hire qila olmasligi, tarix, parol yopilishi
- [x] **Yangi:** "avtomatik transfer" mantig'ini "to'siq" mantig'iga almashtirish (1.3, 2-band) ✅
- [x] **Yangi:** `target_user` bilan birga `phone_number` qabul qilish, ichida get-or-create ✅

### 4.5-bosqich — `TenantService` va Tenant API ✅ **TO'LIQ BAJARILDI**

- [x] Model + migratsiya yakuniy sxema (`slug` yo'q)
- [x] `create_with_owner()`, `change_owner()`
- [x] API: list/create, detail/edit, change-owner, activate, deactivate
- [x] Unit testlar
- [x] Owner hire dagi `permissions` to'plami — ✅ **YOPILDI** (owner har doim to'liq huquqli)
- [x] **Yangi:** `create_with_owner()`ga `owner_phone_number` parametrini qo'shish va get-or-create qilish ✅

### 4.6-bosqich — Employee API ✅ **TO'LIQ BAJARILDI**

- [x] `POST /api/v1/tenants/{tenant_id}/employees/hire/` · `fire/`
- [x] `tenant_id` URL dan; `_resolve_tenant_or_403`
- [x] Ruxsat: autentifikatsiya + rol/tenant tekshiruvi
- [x] Hire view `permission_ids`ni servisga uzatishi — ✅ **YOPILDI**
- [x] `target_user_id` bilan bir qatorda `phone_number` qabul qilish (serializer + view) ✅
- [ ] UI/serializer: owner formida `role` tanlovi umuman ko'rinmasin — frontend/admin panel yozilganda

### 5-bosqich — Ruxsat tizimi ✅ **TO'LIQ BAJARILDI**

- [x] `PermissionService.has_permission(user, "category.codename")` — faqat **faol** `Employee.permissions`
- [x] `platform_admin` — har doim ruxsat
- [x] `owner` — har doim ruxsat (o'z tenant'i doirasida, tenant-scoping alohida klasslar orqali)
- [x] `customer` — bu rol Inventra'da endi yo'q, shunday ham `has_permission` `False` qaytaradi
- [x] `HasEmployeePermission` (DRF `BasePermission`): `required_permission` yoki `permission_map`
- [x] Owner uchun default permission qarori — owner bypass qiladi, alohida to'plam kerak emas
- [x] Hire API orqali staff'ga permission berish — ulandi
- [x] Unit testlar: faol employee, fire qilingan employee ruxsati yo'qolishi, `platform_admin`/`owner`/`customer`/anonim holatlar
- [x] **Ruxsat modeli custom `apps/permissions.Permission`ga ko'chirildi** (Django'ning ContentType-bog'liq `Permission`i o'rniga)
- [ ] Biznes modellardagi ruxsatlar — **9-bosqichda har app ochilganda**, hozircha kod yo'q (staff-facing endpoint yo'q)

### 6-bosqich — JWT claimlar, admin login, identity oqimlari 🔶

- [x] Custom `simplejwt` / `issue_tokens` kengaytmasi: token ichida `role`; `tenant_id` faqat `staff`/`owner`, aks holda `null` (**6a BAJARILDI ✅**)
- [x] Admin panel login: `POST .../auth/admin-login/` + `.../verify-otp/`
- [x] Ikkinchi omil: Telegram OTP
- [x] Progressiv throttle + 3 strike ban
- [x] **Unban:** `platform_admin` `is_active=True` qiladigan endpoint — **✅ YOZILDI** (`POST /api/v1/auth/unban/`)
- [ ] Owner/staff uchun customer qidiruv — **Shop'ga ko'chadi** (customer Inventra'da yo'q)
- [x] **1.6 dizayni** — ✅ qaror qabul qilindi (email orqali), lekin endpointlar hali yozilmagan
- [ ] Email orqali parol o'rnatish/tiklash — **endpointlar loyihalanishi va yozilishi kerak**
- [x] Customer serializerlarida username/password chiqmaydi (tasdiqlandi — customer Inventra'da hali qolgan davrda ham bu tekshirilgan edi)
- [x] API testlar: admin login, mask, OTP → JWT, throttle, ban, unban
- [x] Unit/API testlar: JWT claim qoidalari (`test_jwt_claims.py` va admin-login testlari) ✅

### 7-bosqich — Parolni tiklash / birinchi marta o'rnatish (email magic-link) ✅

Admin panel foydalanuvchilari uchun; Telegram OTP'dan **mustaqil** (\"birinchi marta o'rnatish\" va \"tiklash\" — bitta oqim).

- [x] Email yuborish infratuzilmasi (`django.core.mail`, SMTP `.env`ga; dev/test'da `locmem` backend) ✅
- [x] Bir martalik magic-link reset flow: `PasswordResetService` (Redis `pwd_reset:{token}`, TTL 24h, cooldown 60s) ✅
- [x] Faqat username+password ishlatadigan rollar (staff/owner/platform_admin) himoyalangan ✅
- [x] Rate-limit (cooldown) va token TTL (Redis, `pwd_reset_cooldown:{user_id}`) ✅
- [x] `PasswordResetRequestView` + `PasswordResetConfirmView` — unauthenticated, `/api/v1/auth/password-reset/` ✅
- [x] `PasswordResetRequestSerializer` + `PasswordResetConfirmSerializer` ✅
- [x] `TenantCreateSerializer`: `owner_email` maydoni qo'shildi ✅
- [x] `TenantListCreateView`: `owner_email` servisga uzatiladi ✅
- [x] Unit va API testlar: `test_password_reset.py` (22 test) ✅


### 8-bosqich — Multi-tenancy ni yopish

6a (JWT `tenant_id`) bo'lmasdan yozilmasin.

- [ ] `TenantMiddleware`: JWT dagi `tenant_id`ni `request`ga; parametr/body dagi tenant ishonilmasin
- [ ] Tenant-aware `Manager` / queryset: `BaseModel` merosxohlari avtomatik `request` tenantiga filter
- [ ] `platform_admin`da middleware `tenant_id=null`ni to'g'ri tutishi
- [ ] Nofaol (`is_active=False`) tenant — kirish yopiq
- [ ] (Ixtiyoriy, keyinroq) PostgreSQL Row-Level Security
- [ ] Tenant izolatsiyasi testlari

### 9-bosqich — Biznes app'lari

5 (ruxsat — ✅ tayyor) va 8 (tenant filter) siz **boshlanmasin**.

Tartib:

1. [ ] `catalog` — `Category`, `Product`, `ProductVariant`; ruxsatlar `apps/permissions.Permission` orqali qo'lda kiritiladi (Django `Meta.permissions` emas, chunki custom model ishlatilmoqda); CRUD + `HasEmployeePermission`
2. [ ] `inventory` — `Stock`, `StockMovement` (har o'zgarish alohida audit qatori — do'konda **ichki sotilgan** tovar shu yerdan ayiriladi)
3. [ ] `sales` — Inventra ichidagi POS-sotuv: kunlik sotilgan tovarni ombordan ayirish, hisob-kitob. **`Order` (Shop'dan kelgan buyurtma) bilan aralashtirilmaydi** — ular butunlay boshqa oqim (`shop-yol-xaritasi.md`ga qarang)
4. [ ] `payments` — `Payment` (ichki POS-sotuv uchun)
5. [ ] `analytics` — hisobotlar (ko'p qismi 13-Celery'ga tayanadi)
6. [ ] Top-level `services/` — `StockService`, `PricingService` (bir nechta app'ni bog'laydigan logika view'da bo'lmasin)

~~`customers` app~~ — **kerak emas**, customer Shop'da yashaydi.

Har app: model → service → `api/v1/<app>/` → ruxsat + tenant scope → test.

### 10-bosqich — API pishitish

- [x] `api/v1/<app>/` tuzilmasi
- [ ] Bir xil xato tanasi: `{"error": {"code": "...", "message": "..."}}`
- [ ] Pagination, `django-filter`
- [ ] (Ixtiyoriy) API versiyalash qoidalari

### 11-bosqich — Shop bilan integratsiya (Inventra tarafi)

Shop endi **alohida mikroservis, o'z bazasi bilan** — to'liq reja `shop-yol-xaritasi.md`da. Bu yerda faqat Inventra tomonidan taqdim etiladigan qism:

- [ ] Shop uchun internal endpoint(lar): mahsulot/narx ma'lumotini berish, buyurtma kelganda ombordan kamaytirish/zahiralash
- [ ] Service-to-service token (mavjud `IsInternalService` qayta ishlatiladi)
- [ ] Telegram bot marshrutlash — ✅ tayyor (`?start=shop`)

### 12-bosqich — Docker Compose va deploy

- [x] Redis + Postgres + Inventra + bot (qisman, bot yangilandi)
- [ ] `shop`, `celery-worker`, `nginx`
- [ ] Shop uchun alohida Postgres baza (compose'ga qo'shiladi)
- [ ] Ichki servislar faqat `inventra_net`; tashqariga faqat nginx
- [ ] `.env` bilan sirlarni boshqarish (`SHOP_INTERNAL_URL` qo'shildi, bot'ga)
- [ ] `DEBUG`ni haqiqiy `bool`
- [ ] Gunicorn / production sozlamalarini yakunlash

### 13-bosqich — Celery

- [ ] Celery + Redis broker
- [ ] Worker compose servisi
- [ ] Birinchi vazifalar: analytics/hisobot, stok ogohlantirishi

### 14-bosqich — Frontendlar

- [ ] Admin panel (Inventra API)
- [ ] Storefront (Shop API)

### 14.5-bosqich — Testlar (doimiy, har bosqichga yopishadi)

- [x] Test infratuzilmasi
- [x] `EmployeeService`, `TenantService`, `PermissionService` unit testlari
- [x] Admin-login, unban, hire-permission-fix HTTP testlari
- [ ] Customer register/login testlari — **Shop'ga ko'chganda Shop'da qayta yoziladi**
- [ ] API testlar: create tenant, change-owner (servis bor, view qatlami kam)
- [ ] Har yangi bosqich (6a, 8, 9) o'z testlari bilan yopiladi

### 15-bosqich — Xavfsizlik va sinov

- [ ] Tenant izolatsiyasi: boshqa tenant ma'lumotini URL/id bilan olish mumkin emas
- [ ] Employee transfer: eski tenant ruxsati/tokeni ishlamasligi
- [x] Rate-limiting (admin login): progressiv lock + strike ban
- [ ] Audit log: narx o'zgarishi, sotuv, hire/fire, owner almashtirish
- [ ] Internal token va Telegram secretlar faqat env'da

---

## 4. Har bosqichda amal qilinadigan prinsiplar

1. `tenant`ni frontend yoki query'dan qabul qilmaslik — JWT (va 8-dan keyin middleware).
2. Logika `services/`da; view — HTTP, serializer, status kod.
3. Media — obyekt xotirasi.
4. `internal/` tashqariga ochilmaydi.
5. Muhim amallar — audit.
6. Telefon formati — Shop tekshiradi; Inventra ichki chaqiriqni ishonchli deb qabul qiladi, lekin yomon ma'lumotni ham rad etadi.
7. Login ma'lumotlarini faqat egasi, OTP/email bilan.
8. Rol vakolati: faqat bir pog'ona past.
9. **Inventra customer haqida bilmaydi** — bu Shop'ning ishi.

---

## 5. Ochiq dizayn (koddan oldin yozib kelishiladi)

| # | Mavzu | Holat |
|---|---|---|
| A | ~~Owner `hire`da permission to'plami~~ | ✅ **YOPILDI** — owner har doim to'liq huquqli |
| B | ~~Username/password qo'yish/o'zgartirish oqimi~~ | ✅ **YOPILDI** — email orqali (Telegram emas). Endpointlar hali loyihalanmagan (keyingi ish) |
| C | ~~`platform_admin` `HasEmployeePermission`da har doim `True`mi~~ | ✅ **YOPILDI** — ha |
| D | Customer qidiruv maydonlari va kim ko'radi | **Shop'ga ko'chadi**, Inventra'da endi kerak emas |
| E | Shop `tenant_id` qayerdan (env vs birinchi sozlama) | Ochiq — endi Shop **ko'p tenant** bilan ishlashi mumkinligi sababli (customer bir nechta do'kondan xarid qilishi mumkin), bu savol qayta ko'rib chiqilishi kerak: Shop'da `tenant_id` umuman global emas, **har bir order o'zining tenant'ini biladi** bo'lishi kerak. `shop-yol-xaritasi.md`da |
| F | ~~Ban qilingan admin userni kim/qanday ochadi~~ | ✅ **YOPILDI** — unban endpoint yozildi |
| **G** | ~~`fire()`dan keyin `User.role` nima bo'ladi~~ | ✅ **YOPILDI** — Variant A: role saqlanadi, password yaroqsiz qilinadi, faol employment yopiladi |
| **H** | ~~`EmployeeService.hire()`ning "to'siq" mantig'i~~ | ✅ **YOPILDI** — faol employment bo'lsa EmployeeServiceError chiqariladi (avval bo'shatish shart) |

---

## 6. Keyingi band (shu faylga qarab ishni oching)

**Eng muhim, blokirovka qiluvchi ish: 6a — JWT'ga `role`/`tenant_id` claim qo'shish.** Bu 8-bosqichni (va shu orqali 9-bosqichni) ochadi.

Ketma-ketlik:

`6a (JWT)` → `customer kodini Inventra'dan olib tashlash + hire()/TenantService'ni telefon-asosli qilish (4, 4.5, 4.6 dagi ochiq bandlar)` → `email parol oqimi (1.6/7)` → `8 (TenantMiddleware)` → `9 (catalog)` → qolgan biznes app'lar → `Shop` (alohida, `shop-yol-xaritasi.md`) → compose'ni to'ldirish → Celery → frontend.

G va H bandlari (5-bo'lim) — 4/6-bosqich kodiga o'tilganda hal qilinadi, hozir blokirovka qilmaydi.
