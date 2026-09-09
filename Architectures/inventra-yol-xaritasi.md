# Inventra — Yakuniy yo'l xaritasi

> **Shu hujjat yagona manba.** Eski `inventra-arxitektura.md`, `inventra-yol-xaritasi.md`, `inventra-yakuniy-arxitektura.md` va `inventra-yakuniy-arxitektura_1.md` endi qo'llanilmasin — ularning qarorlari, ziddiyat yechimlari va hali ochiq ishlari shu yerga jamlangan.
>
> **Qanday ishlatish:** bitta bandni tugatgach, shu fayldagi keyingi `[ ]` ni oching. Tartib — bosqich raqami. Oldingi bosqichdagi ochiq `[ ]` (masalan, E2E test) keyingi poydevorni to'xtatmasa, uni keyinroq qaytib yopish mumkin; **5-bosqichdan oldin 4–4.6 ni qayta yozmang.**
>
> Holat belgisi: `[x]` bajarilgan · `[ ]` qilinishi kerak · `🔶` asosiy qismi bor, qoldiq ochiq.

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
| `username`/`password` hire paytida | **Bekor.** Xodim o'zi, OTP-himoyalangan oqimda qo'yadi/o'zgartiradi (1.6) |
| `needs_profile_completion` | `user.profile_completed`; `has_usable_password()` customer uchun mos emas |
| Testlar | To'liq CI/CD hozircha **kerak emas**. Lokal `pytest` (Redis + Postgres test compose) **kerak** va asosiy servislar uchun yozilgan |
| Paket / muhit | `uv`; Windows + PowerShell |
| Admin panel login | **Ikki qadam:** `username` + `password`, so'ng Telegram OTP, keyin JWT. Customer bu yo'ldan kira olmaydi. To'g'ridan-to'g'ri parol → JWT **yo'q** |
| Admin login throttle | Redis: 5 urinish → 60s; 3 → 1 soat; 1 → 1 kun (strike). 3 ketma-ket strike → `User.is_active=False`. `platform_admin` ham cheklanadi. Unban endpoint **hali yo'q** |
| Username enumeratsiyasi (admin) | Noto'g'ri parol va mavjud bo'lmagan username — **bir xil** 401 matn |
| Telefon API javobida | To'liq raqam chiqmaydi; `mask_phone_number` (`+998 90 *** ** 67`) |
| Test settings | `.env.test` `settings.py` importidan **oldin** yuklanadi; testda `MD5PasswordHasher` |

### 0.3. Hozirgi kod holati (2026-09)

Repo: `Sales-Platform/` — `../inventra/` (Django 6 + DRF), `telegram_bot_sms/` (aiogram), `Architectures/` (shu fayl), ildiz `docker-compose.yml`, `Files/inventra_tests_scaffold/` (eski scaffold nusxasi; **Inventra oldinda** — masalan admin-login testlari faqat Inventra da).

**HTTP (`/api/v1/`):**

| Method | Yo'l | Kim |
|---|---|---|
| POST | `auth/register/request-otp/` | AllowAny, telefon |
| POST | `auth/register/verify-otp/` | AllowAny → JWT + `needs_profile_completion` |
| POST | `auth/login/request-otp/` | AllowAny, telefon |
| POST | `auth/login/verify-otp/` | AllowAny → JWT |
| POST | `auth/complete-profile/` | JWT: ism/familiya/email/tug'ilgan kun |
| POST | `auth/admin-login/` | AllowAny: username+password → OTP yuboriladi, `phone_hint` |
| POST | `auth/admin-login/verify-otp/` | AllowAny: username+kod → `access`/`refresh` |
| POST | `internal/telegram/register/` | `Authorization: Internal <token>` |
| GET/POST | `tenants/` | faqat `platform_admin` |
| GET/PATCH | `tenants/<pk>/` | rolga qarab serializer; staff PATCH 403 |
| POST | `tenants/<pk>/change-owner/` | `platform_admin` |
| POST | `tenants/<pk>/activate/` · `deactivate/` | owner (o'z) yoki `platform_admin` |
| POST | `tenants/<tenant_id>/employees/hire/` · `fire/` | owner (o'z tenant) yoki `platform_admin` |

**Servislar:** `EmployeeService`, `TenantService`, `otp_services` (Redis TTL/cooldown/attempts), `login_throttle` (admin login), `phone_utils.mask_phone_number`, `tg_bot.services.send_telegram_message`.

**JWT:** `issue_tokens` = `RefreshToken.for_user` — token ichida **maxsus `role` / `tenant_id` claim hali yo'q** (6a ochiq).

**Hire API teshik:** `EmployeeHireSerializer` da `permission_ids` bor, lekin `EmployeeHireView` `EmployeeService.hire(..., permissions=)` ga **uzatmaydi**.

**Hali yo'q:** `PermissionService` / `HasEmployeePermission`, `TenantMiddleware`, catalog/inventory/sales, Shop, Celery, nginx, email reset, username/password o'rnatish oqimi (1.6), unban, Django admin UI (`config/urls.py` da faqat `api/v1/`).

**Testlar:** `EmployeeService`, `TenantService`, OTP Redis; **yangi** `apps/accounts/tests/test_admin_login_views.py` — birinchi API/view testlar (`APIClient` + mock `send_telegram_message` + throttle state machine). Register/login HTTP, hire/fire/tenant view testlari yo'q.

---

## 1. Qabul qilingan asosiy qarorlar (o'zgarmas qoidalar)

| Mavzu | Qaror |
|---|---|
| Umumiy arxitektura | Inventra (Django + DRF, core) + Shop (FastAPI, bitta tenant storefront) |
| Joylashuv | Bitta server, bitta docker-compose, ichki Docker tarmog'i |
| Aloqa | JSON/REST; `Authorization: Internal <token>` |
| Domen | `inventra.uz`, subdomain yo'q |
| User ID | `phone_number` = `USERNAME_FIELD`; `username` global unique, admin panel login |
| Admin panel login | `username` + `password`, so'ng Telegram OTP (Django admin UI yo'q; `config/urls.py` da `admin/` ulanmagan) |
| Customer kirish | Telefon + Telegram OTP. Complete profile: `first_name`, `last_name`, `email`, `date_of_birth` — username/password so'ralmaydi |
| OTP saqlash | Redis, TTL; bazada emas |
| Multi-tenancy | Shared DB + `tenant` FK (schema-per-tenant emas) |
| Tenant aniqlash | **Faqat JWT dan**, so'rov parametridan/frontendan emas |
| Ruxsat | `Employee.permissions` (Django `Permission`). `user.user_permissions` **emas** — tenant transferda eski ruxsat qolmasin |
| `User` vs `BaseModel` | `User` `BaseModel`dan meros olmaydi (`tenant` nullable) |
| Media | S3-mos obyekt xotirasi, server diski emas |
| Internal endpoint | Faqat Docker ichki tarmog'ida, tashqariga ochilmaydi |

### 1.1. Rol ierarxiyasi

| Rol | Kim tayinlaydi | Vakolat |
|---|---|---|
| `platform_admin` | Tizim (qo'lda / superuser) | Cheklovsiz. Owner tayinlash **faqat** shu rol |
| `owner` | Faqat `platform_admin` (Tenant yaratish / change-owner) | O'z tenantida faqat `staff` hire/fire |
| `staff` | Faqat `owner` (o'z tenantida) | Userlarni hire/fire qila olmaydi |
| `customer` | OTP orqali o'zi | — |

Har bir rol faqat o'zidan **bitta past** darajani boshqaradi: `platform_admin` → `owner`, `owner` → `staff`. `hire()` orqali `platform_admin` yoki `owner` berib bo'lmaydi — `owner` faqat Tenant yaratish/almashtirishda.

### 1.2. Employee — owner uchun ham (Variant A)

Owner tayinlanganda ham `hire()`: `Employee` (`position="Owner"`, `is_active=True`). Agar userning boshqa faol Employee si bo'lsa — avval `fire()`, keyin yangi `hire()`.

- Tarixning yagona manbai — `Employee` jadvali
- Owner almashtirilsa, eski owner avtomatik `staff`ga qaytmaydi: `fire()` uni `customer` qiladi. Yana staff kerak bo'lsa, alohida `hire()`

`Employee.user`: `ForeignKey` + partial unique (`is_active=True`).

### 1.3. `EmployeeService.hire()`

```
hire(target_user, tenant, hired_by, permissions, position="", role="staff")
```

1. `role == "staff"` → `hired_by.role in ("owner", "platform_admin")`. `role == "owner"` → `hired_by.role == "platform_admin"`.
2. Faol Employee bo'lsa — avtomatik `fire()`, keyin yangisi. Bu xato emas, kutilgan oqim.
3. `username`/`password` ga **tegmaydi**.
4. `User.role`, `User.tenant` yangilanadi; `Employee` yaratiladi; `permissions` berilsa M2M ga yoziladi.
5. `platform_admin` ni hire qilib bo'lmaydi.

### 1.4. `EmployeeService.fire()`

1. Faol Employee: `is_active=False`, `fired_at=now()`, `fired_by`
2. `User.role = "customer"`, `User.set_unusable_password()`

**Saqlanadi (tozalanmaydi):** `User.username`, `User.tenant` (tarix).

**JWT qoidasi:** `User.tenant` fire'dan keyin ham qoladi. Token / tenant-scoping **faqat** `role in ("staff", "owner")` da `User.tenant` dan foydalanadi. `customer` va `platform_admin` uchun `tenant_id` claim **har doim `null`**.

### 1.5. Tenant

```
Tenant: name (unique), owner (OneToOneField User, majburiy), description (blank), is_active, created_at
# slug YO'Q
```

`TenantService.create_with_owner(name, owner_user, created_by)` — faqat `created_by.role == "platform_admin"`:

1. `owner_user` platform_admin bo'lsa — xato
2. Allaqachon boshqa tenant owner bo'lsa — tushunarli xato (`IntegrityError` oldidan)
3. Tenant yaratiladi
4. `EmployeeService.hire(..., role="owner", position="Owner")`

O'chirish: hard-delete yo'q, `is_active=False`.

`OneToOneField(owner)`: bir vaqtda bitta tenant. Umrida faqat bir marta owner bo'lishi shart emas — almashtirilsa, keyin boshqa tenantga owner bo'lishi mumkin. Tarix `Employee` da.

`TenantService.change_owner(tenant, new_owner, changed_by)`: faqat platform_admin; eski owner `fire()`, yangisi `hire(role="owner")`.

**Ochiq kelishuv (5-bosqich bilan bog'liq):** owner hire da `permissions` — hammasi yoki bo'sh? Hali qat'iy kelishilmagan; kod hozir bo'sh qoldirsa M2M bo'sh qoladi.

### 1.6. Username / password (dizayn hali to'liq emas)

- `customer`: bu maydonlar ko'rinmaydi/so'ralmaydi
- `staff` / `owner` / `platform_admin`: o'zlari to'ldiradi, hire bermaydi
- O'rnatish/o'zgartirish — Telegram OTP bilan alohida oqim (complete-profile emas) — **endpointlar hali yo'q**
- Hech kim (owner ham) boshqasining parolini to'g'ridan-to'g'ri qo'ya olmaydi
- **Kirish** (allaqachon kodlangan, 6b): mavjud username+password + Telegram OTP. Bu 1.6 dagi "birinchi marta qo'yish" emas — 2FA login

Aniq set/change endpointlar/payload — 6-bosqichda yoziladi, **oldindan kengaytirilmaydi**.

---

## 2. Texnik poydevor (qayerda nima yashaydi)

```
Sales-Platform/
  Inventra/                 # Django + DRF (core backend)
    apps/core|tenants|accounts|tg_bot
    apps/accounts/services/ # employee_service, otp_services, login_throttle, phone_utils
    api/v1/                 # HTTP qatlam (accounts, tenants, tg_bot)
    api/permissions.py      # IsInternalService, IsPlatformAdmin, IsOwner, IsTenantMember, ...
    config/settings_test.py # pytest: .env.test → alohida Postgres/Redis
    docker-compose.test.yml # host 5433 / 6380
  telegram_bot_sms/         # aiogram listener (contact → Inventra internal)
  Architectures/            # shu yo'l xaritasi
  Files/inventra_tests_scaffold/  # scaffold nusxasi; manba haqiqati — Inventra
  docker-compose.yml        # postgres, redis, inventra, bot (shop/celery/nginx hali yo'q)
```

- Biznes logika `views.py` da emas, `services/` da
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

- [x] `User(AbstractBaseUser, PermissionsMixin)`: `phone_number` (USERNAME_FIELD, unique, normallashtiriladi), `username`, `email`, `first_name`, `last_name`, `date_of_birth`, `tenant` (nullable FK), `role` (`customer` / `staff` / `owner` / `platform_admin`), `is_active`, `is_staff`, `is_phone_verified`, `profile_completed`, `created_at`
- [x] `UserManager`: `create_user`, `create_superuser`
- [x] `AUTH_USER_MODEL = 'accounts.User'`
- [x] `Employee`: FK `user`, `position`, `hired_at`, `fired_at`, `is_active`, `hired_by`, `fired_by`, `permissions` M2M → `Permission`, partial unique faol yozuvga

### 3-bosqich — Telegram OTP (register / login) 🔶

- [x] `TelegramContact` (`phone_number` unique, `chat_id`)
- [x] Internal endpoint + `IsInternalService` (`Authorization: Internal <token>`)
- [x] `send_telegram_message()` — Bot API HTTP
- [x] OTP servis (Redis): `generate_code` (`secrets`), `store_code`, `verify_code`, attempt limit, TTL
- [x] Resend cooldown (bir raqamga qayta so'rov ~60s) — Redis
- [x] Register / login request-otp va verify-otp (`api/v1/accounts/`)
- [x] Verify muvaffaqiyatida JWT (`simplejwt`); `needs_profile_completion` = `not profile_completed`
- [x] `CompleteProfileView` — faqat ism/familiya/email/tug'ilgan kun; `profile_completed=True`
- [x] Bot listener (`telegram_bot_sms`): `/start`, contact
- [x] JWTAuthentication REST_FRAMEWORK da yoqilgan
- [ ] **End-to-end:** botda contact ulash → OTP so'rash → Telegram kod → verify → JWT (qo'lda yoki keyinroq avtomatik). 4–6 ni to'xtatmaydi
- [ ] Customer register/login HTTP testlari (servis testlari bor). Admin-login HTTP + mock Telegram — **yozilgan** (14.5)

### 4-bosqich — `EmployeeService` ✅

- [x] `hire()` — 1.3 qoidalari, `select_for_update`, avtomatik fire+hire
- [x] `fire()` — 1.4 qoidalari
- [x] Unit testlar: staff hire qila olmasligi, avtomatik transfer, tarix, parol yopilishi

### 4.5-bosqich — `TenantService` va Tenant API ✅

- [x] Model + migratsiya yakuniy sxema (`slug` yo'q)
- [x] `create_with_owner()`
- [x] `change_owner()`
- [x] API: list/create, detail/edit, change-owner, activate, deactivate
- [x] Unit testlar: faqat platform_admin, ikki marta owner emas, change-owner fire+hire
- [ ] Owner hire dagi `permissions` to'plami — **kelishuv** (1.5 oxiri); kod o'zgarishi 5-bosqichga bog'liq

### 4.6-bosqich — Employee API ✅

- [x] `POST /api/v1/tenants/{tenant_id}/employees/hire/`
- [x] `POST /api/v1/tenants/{tenant_id}/employees/fire/`
- [x] `tenant_id` URL dan; `_resolve_tenant_or_403`
- [x] Hire da `role` read_only, default `staff`
- [x] Ruxsat: autentifikatsiya + rol/tenant tekshiruvi (`IsOwner` / `IsPlatformAdmin` oilasi)
- [ ] Hire view `permission_ids` ni servisga uzatishi (serializer maydoni bor, view e'tiborsiz)
- [ ] UI/serializer: owner formida `role` tanlovi umuman ko'rinmasin — frontend/admin panel yozilganda

### 5-bosqich — Ruxsat tizimi  ← **HOZIRGI ISH**

Maqsad: `Employee.permissions` ni haqiqatan tekshirish. Rol klasslari (`IsOwner` …) qoladi; nozik amallar (mahsulot qo'shish, narx o'zgartirish) shu qatlamda.

- [ ] `PermissionService.has_permission(user, codename)` — faqat **faol** `Employee.permissions`; `user.user_permissions` / `Group` emas
- [ ] `platform_admin` — har doim ruxsat (yoki alohida qoida: tenant-scopingdan tashqari cheklovsiz)
- [ ] `customer` — Employee yo'q → `False`
- [ ] `HasEmployeePermission` (DRF `BasePermission`): view da `required_permission = "<app>.<codename>"`
- [ ] Owner uchun default permission to'plami qarori (1.5 ochiq kelishuvni yopish)
- [ ] Hire API orqali staff ga permission berish (`permission_ids` serializerda bor; view `hire(permissions=)` ga **hali ulanmagan**)
- [ ] Unit testlar: faol employee, fire qilingan employee ruxsati yo'qolishi, transferda eski tenant ruxsati qolmasligi
- [ ] Biznes modellardagi `Meta.permissions` — **9-bosqichda har app ochilganda**; 5 da faqat servis + DRF klass. Hozircha Django default model permissionlari yetarli bo'lishi mumkin

### 6-bosqich — JWT claimlar, admin login, identity oqimlari 🔶

5 dan keyin rejalashtirilgan edi; **6b (admin login) oldinroq yozildi** va ishlaydi. Hire/fire endpointlari 4.6 da — shu yerda takrorlanmaydi.

- [ ] Custom `simplejwt` (yoki `issue_tokens` kengaytmasi): token ichida `role`; `tenant_id` faqat `staff`/`owner`, aks holda `null` (1.4). Hozir `RefreshToken.for_user` — standart user id claimlar
- [x] Admin panel login: `POST .../auth/admin-login/` + `.../verify-otp/`. Faqat `staff` / `owner` / `platform_admin`. Customer — generic 401. Nofaol user — 429
- [x] Ikkinchi omil: Telegram OTP (`otp_services`, telefon maskasi). Telegram ulanmagan / yuborilmasa — 502, "telegram not linked" ochilmaydi
- [x] Progressiv throttle + 3 strike ban (`login_throttle.py`); muvaffaqiyatli login hammasini tozalaydi
- [ ] Unban: `platform_admin` `is_active=True` qiladigan endpoint (throttle izohida rejalashtirilgan)
- [ ] Owner/staff uchun customer qidiruv: faqat `request.user.tenant` (yoki JWT `tenant_id`) bo'yicha, query-parametrdan tenant qabul qilinmaydi
- [ ] **1.6 dizaynini yozish, keyin kod:** username/password birinchi marta qo'yish va keyin o'zgartirish — Telegram OTP. Endpointlar, qaysi OTP "purpose", customer bloklanishi
- [ ] Customer serializerlarida username/password chiqmasligi
- [x] API testlar: admin login 401 bir xilligi, mask, OTP → JWT, throttle bosqichlari, ban
- [ ] Unit/API testlar: JWT claim qoidalari; customer ning admin-login yo'li (hozir role check bor, alohida test yo'q)

### 7-bosqich — Parolni tiklash (email)

Admin panel foydalanuvchilari uchun; Telegram OTP dan **mustaqil**.

- [ ] Email OTP / reset flow (Brevo yoki tanlangan provayder)
- [ ] Faqat username+password ishlatadigan rollar
- [ ] Rate-limit va kod TTL (Redis, OTP dagi kabi g'oya)

### 8-bosqich — Multi-tenancy ni yopish

6a (JWT `tenant_id`) bo'lmasdan yozilmasin.

- [ ] `TenantMiddleware`: JWT dagi `tenant_id` ni `request` ga; parametr/body dagi tenant ishonilmasin
- [ ] Tenant-aware `Manager` / queryset: `BaseModel` merosxohlari avtomatik `request` tenantiga filter
- [ ] `customer` / `platform_admin` da middleware `tenant_id=null` ni to'g'ri tutishi (1.4)
- [ ] Nofaol (`is_active=False`) tenant — kirish yopiq
- [ ] (Ixtiyoriy, keyinroq) PostgreSQL Row-Level Security
- [ ] Tenant izolatsiyasi testlari (15 bilan kesishadi — shu yerda asosiy holatlar)

### 9-bosqich — Biznes app'lari

5 (ruxsat) va 8 (tenant filter) siz **boshlanmasin** — aks holda har modelga keyin qayta o'raladi.

Tartib:

1. [ ] `catalog` — `Category`, `Product`, `ProductVariant`; `Meta.permissions`; CRUD + `HasEmployeePermission`
2. [ ] `inventory` — `Stock`, `StockMovement` (har o'zgarish alohida audit qatori)
3. [ ] `sales` — `Order`, `OrderItem`, `source`: `admin_panel` | `shop`
4. [ ] `payments` — `Payment`
5. [ ] `customers` — agar B2C profil Inventra da alohida kerak bo'lsa (aks holda `User` yetadi)
6. [ ] `analytics` — hisobotlar (ko'p qismi 13-Celery ga tayanadi)
7. [ ] Top-level `services/` — `OrderService`, `StockService`, `PricingService` (bir nechta app ni bog'laydigan logika view da bo'lmasin)

Har app: model → service → `api/v1/<app>/` → ruxsat + tenant scope → test.

### 10-bosqich — API pishitish

`api/v1/` allaqachon bor. Qolgani sifat.

- [x] `api/v1/<app>/` tuzilmasi
- [ ] Bir xil xato tanasi: `{"error": {"code": "...", "message": "..."}}` (hozir ba'zi joylarda tekis `{"error": "user_not_found"}`)
- [ ] Pagination, `django-filter`
- [ ] (Ixtiyoriy) API versiyalash qoidalari, agar Shop/admin ajralib ketsa

### 11-bosqich — Shop (FastAPI)

Inventra ichki API + 8-bosqich bo'lmasdan storefront yozilmasin.

- [ ] Alohida FastAPI loyiha, **bitta** `tenant_id` (config/env, so'rovdan emas)
- [ ] Fail-fast validatsiya (telefon formati shu yerda)
- [ ] Biznes logika yo'q — `httpx` bilan Inventra `internal/` ga
- [ ] Service-to-service token
- [ ] Catalog o'qish, savat/buyurtma yaratish (Inventra `sales` orqali)

### 12-bosqich — Docker Compose va deploy

Hozir: ildiz `docker-compose.yml` da postgres, redis, inventra, bot. Shop/celery/nginx yo'q. Test compose alohida.

- [x] Redis + Postgres + Inventra + bot (qisman)
- [ ] `shop`, `celery-worker`, `nginx`
- [ ] Ichki servislar faqat `inventra_net`; tashqariga faqat nginx
- [ ] `.env` bilan sirlarni boshqarish
- [ ] `DEBUG` ni haqiqiy `bool` (masalan `DJANGO_DEBUG` in `1/true/True`)
- [ ] Gunicorn / production sozlamalarini yakunlash

### 13-bosqich — Celery

OTP yuborish **sinxron** qoladi (javob tezkor bo'lishi kerak). Celery — hisobot, ogohlantirish, og'ir job.

- [ ] Celery + Redis broker
- [ ] Worker compose servisi
- [ ] Birinchi vazifalar: analytics/hisobot, stok ogohlantirishi (9/11 dan keyin aniqroq)

### 14-bosqich — Frontendlar

API barqaror (kamida 5, 6, 8, 9-catalog) bo'lgach.

- [ ] Admin panel (Inventra API): login username/password + Telegram OTP, tenant doirasi, hire/fire, catalog/inventory/sales
- [ ] Storefront (Shop API)

### 14.5-bosqich — Testlar (doimiy, har bosqichga yopishadi)

CI/CD (GitHub Actions, avtomatik deploy) — **hozir rejalashtirilmagan**; jamoa/production da qayta ko'riladi.

- [x] Test infratuzilmasi: pytest-django, factories, `settings_test` (`.env.test` oldin yuklanadi, MD5 hasher), `docker-compose.test.yml`
- [x] `EmployeeService`, `TenantService`, OTP Redis unit testlari
- [x] `send_telegram_message` mock + **admin-login** HTTP testlari (`test_admin_login_views.py`)
- [ ] Customer register/verify va login HTTP testlari (xuddi shu mock usuli)
- [ ] API testlar: hire, fire, create tenant, change-owner (servis bor, view qatlami yo'q/kam)
- [ ] Har yangi bosqich (5, 6a, 8, 9) o'z testlari bilan yopiladi

### 15-bosqich — Xavfsizlik va sinov

- [ ] Tenant izolatsiyasi: boshqa tenant ma'lumotini URL/id bilan olish mumkin emas
- [ ] Employee transfer: eski tenant ruxsati/tokeni ishlamasligi
- [x] Rate-limiting (admin login): progressiv lock + strike ban — `login_throttle`
- [ ] Rate-limiting: customer OTP so'rov (cooldown bor); email reset (7); customer telefon enumeratsiyasi (`user_not_found` 404 — admin logindagi kabi yopilmagan)
- [ ] Audit log: narx o'zgarishi, buyurtma bekor, hire/fire, owner almashtirish
- [ ] Internal token va Telegram secret lar faqat env da

---

## 4. Har bosqichda amal qilinadigan prinsiplar

1. `tenant` ni frontend yoki query dan qabul qilmaslik — JWT (va 8 dan keyin middleware).
2. Logika `services/` da; view — HTTP, serializer, status kod.
3. Media — obyekt xotirasi.
4. `internal/` tashqariga ochilmaydi.
5. Muhim amallar — audit (15, lekin 9 da `StockMovement` allaqachon audit qatori).
6. Telefon formati — Shop; Inventra ishonchli ichki chaqiriq deb qabul qilishi mumkin, lekin yomon ma'lumotni ham rad etishi mumkin (himoya chuqurligi).
7. Login ma'lumotlarini faqat egasi, OTP bilan.
8. Rol vakolati: faqat bir pog'ona past.

---

## 5. Ochiq dizayn (koddan oldin yozib kelishiladi)

Quyidagilar yo'l xaritasida bor, lekin **qaror qog'ozda yopilmasdan** keng kod yozilmasin:

| # | Mavzu | Qachon |
|---|---|---|
| A | Owner `hire` da permission to'plami: bo'sh / barcha catalog huquqlari / maxsus set | 5-bosqich boshi |
| B | Username/password **qo'yish/o'zgartirish** OTP oqimi: endpointlar, purpose (login 2FA allaqachon bor) | 6-bosqich, 6a dan keyin |
| C | `platform_admin` `HasEmployeePermission` da: har doim `True` mi? | 5-bosqich |
| D | Customer qidiruv maydonlari va kim ko'radi | 6-bosqich |
| E | Shop `tenant_id` qayerdan (env vs birinchi sozlama) | 11-bosqich |
| F | Ban qilingan admin user ni kim/qanday ochadi (`is_active=True`); self-unban yo'q | 6-bosqich qoldig'i |

---

## 6. Keyingi band (shu faylga qarab ishni oching)

**5-bosqich:** `PermissionService.has_permission` va `HasEmployeePermission`.

6b (admin login + throttle + testlar) **bajarilgan**; 9-bosqich (catalog) baribir 5 va 8 siz boshlanmasin.

Ketma-ketlik:

`5` → `6a` (JWT `role` / `tenant_id`) → `1.6` dizayn (jadval B) + unban (F) → `7` yoki `8` (8 uchun 6a shart) → `9 catalog` → qolgan biznes app'lar → Shop → compose ni to'ldirish → Celery → frontend.

3-bosqich E2E, customer OTP HTTP testlari va 10-bosqich xato formati parallel, 5 ni bloklamaydi.
