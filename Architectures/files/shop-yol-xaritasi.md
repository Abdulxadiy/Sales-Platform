# Shop — Boshlang'ich yo'l xaritasi

> Bu — **yangi** hujjat (2026-09). `inventra-yol-xaritasi.md` bilan bir xil formatda: `[x]` bajarilgan, `[ ]` qilinishi kerak, `🔶` qisman.
>
> **Maqsad:** Shop — customer'lar uchun storefront. Mijoz Shop orqali xarid qiladi (`Order`), Inventra esa do'konning **ichki** boshqaruvi (xodimlar, ombor, ichki POS-sotuv). Ikkalasi orasidagi chegara `inventra-yol-xaritasi.md` boshida tasvirlangan.
>
> **Texnologiya:** FastAPI, **o'z Postgres bazasi** (Inventra bazasidan butunlay alohida), bitta `docker-compose.yml` ichida alohida servis, Inventra bilan faqat internal HTTP (`Authorization: Internal <token>`) orqali gaplashadi.

---

## 0. Inventra bilan chegara (qisqacha)

| Narsa | Qayerda |
|---|---|
| Xodim/owner/platform_admin, ularning login/2FA'si | **Inventra** |
| Ombor, mahsulot katalogi (manba) | **Inventra** |
| Do'konda jismoniy sotilgan tovar (POS) — ombordan ayirish | **Inventra** (`sales` app, 9-bosqich) |
| Customer identifikatsiyasi, login | **Shop** |
| Onlayn buyurtma (`Order`) | **Shop** yaratadi, lekin ombor holatini Inventra'ga internal so'rov orqali o'zgartiradi |
| To'lov | Ochiq — qaysi tomonda bo'lishi hali muhokama qilinmagan |

**Muhim farq:** Inventra'dagi "sotuv" — bu shunchaki **hisob-kitob uchun ombordan ayirish** (kim xarid qilgani muhim emas, faqat qancha va qachon). Shop'dagi "Order" esa **customer identifikatsiyasi bilan bog'liq to'liq buyurtma** (kim, nima, qachon, qaysi holatda — kutilmoqda/yetkazilmoqda/yakunlangan). Ikkalasi alohida jadval, alohida oqim; Order yakunlanganda Inventra'ga faqat "shuncha tovar kamaydi" signali boradi.

---

## 1. Asosiy qarorlar

| Mavzu | Qaror |
|---|---|
| Framework | FastAPI |
| Baza | **O'z Postgres bazasi** (Inventra bazasidan mustaqil) |
| Joylashuv | Bitta docker-compose, ichki tarmoq, alohida container |
| Inventra bilan aloqa | HTTP/JSON, `Authorization: Internal <token>` (mavjud `IsInternalService` pattern qayta ishlatiladi) |
| Customer login | Telefon + Telegram OTP — **Inventra'dan ko'chirilgan mantiq**, endi Shop'ning o'z bazasida |
| Telegram bot | **Bitta, umumiy** `telegram_bot_sms` — deep-link (`?start=shop`) orqali shu servisga yo'naltiriladi. Kod allaqachon yangilangan ✅ |
| Customer va tenant | **Customer bitta tenant'ga bog'lanmaydi** — global identifikator (`phone_number`). Bir customer bir nechta do'kondan xarid qilishi mumkin |
| Order va tenant | **Har bir `Order` aniq bitta tenant'ga tegishli** — tenant-bog'liqlik `Customer`da emas, `Order`da |

---

## 2. Ochiq savollar (koddan oldin hal qilinishi kerak)

| # | Savol | Izoh |
|---|---|---|
| 1 | Mahsulot/narx ma'lumotini Shop qanday oladi — **jonli so'rov** (har safar Inventra'ga murojaat) yoki **davriy sinxronlash** (Shop o'z bazasida katalog nusxasini saqlaydi)? | Jonli so'rov — sodda, lekin Inventra'ga yuklama va tezlik muammosi. Sinxronlash — tez, lekin ma'lumot eskirishi mumkin (narx o'zgarsa) |
| 2 | To'lov qanday amalga oshiriladi — qaysi provayder (Payme/Click/Uzcard kabi), qaysi tomonda (Shop'da) integratsiya qilinadi? | Hali muhokama qilinmagan |
| 3 | Buyurtma berilganda ombor **zahiralanadi** (reserve, keyin tasdiqlansa yakuniy ayiriladi) yoki **darhol ayiriladi**mi? Zahiralash — buyurtma bekor qilinsa qaytarish kerak, murakkabroq, lekin ombor haqiqiyroq aks etadi | Hali muhokama qilinmagan |
| 4 | Customer bazaviy ma'lumotlari (`first_name`, `email` va h.k.) — Inventra'dagi eski `CompleteProfileSerializer`ga o'xshash bo'ladimi, yoki Shop'ga xos boshqacha maydonlar (masalan yetkazib berish manzili) kerakmi? | Ehtimol — manzil qo'shiladi, chunki yetkazib berish uchun kerak bo'ladi |
| 5 | Customer OTP-login/throttle mantig'i — Inventra'da yozilgan `customer_login_throttle.py` **aynan shu holicha ko'chiriladimi**, yoki Shop'ning o'z ehtiyojiga moslab qayta ko'rib chiqiladimi? | Boshlang'ich nuqta sifatida ko'chirish tavsiya etiladi — allaqachon sinovdan o'tgan |

---

## 3. Bosqichlar

### 0-bosqich — Skelet

- [ ] FastAPI loyihasi, `uv` bilan boshqariladi (Inventra bilan bir xil muhit)
- [ ] O'z Postgres bazasi, `docker-compose.yml`ga qo'shiladi
- [ ] Health-check endpoint
- [ ] `.env` — `INVENTRA_INTERNAL_URL`, `INTERNAL_SERVICE_TOKEN`, `BOT_TOKEN` (bot bilan bog'lanish uchun kerak bo'lsa), o'z baza sozlamalari

### 1-bosqich — Customer identity

- [ ] `Customer` modeli: `phone_number` (unique), `first_name`, `last_name`, `email` (ixtiyoriy), `profile_completed` — Inventra'dagi eski `User`(customer) modelidan ilhomlanib, lekin soddalashtirilgan (rol tizimi kerak emas — bu yerda hamma customer)
- [ ] Telegram OTP login (Inventra'dan ko'chiriladi): `request-otp`, `verify-otp`
- [ ] `customer_login_throttle` — Inventra'dagi versiyasi asos qilib olinadi
- [ ] Internal endpoint: bot'dan kelgan `{phone_number, chat_id}`ni qabul qilish (`?start=shop` orqali kelgan)
- [ ] JWT (Shop'ning o'z tokeni — Inventra tokeni bilan aralashtirilmaydi)

### 2-bosqich — Mahsulot katalogi (o'qish)

- [ ] 2-bo'limdagi 1-savolni hal qilish (jonli so'rov vs sinxronlash)
- [ ] Tanlangan yondashuv bo'yicha amalga oshirish

### 3-bosqich — Savat va buyurtma

- [ ] `Order`, `OrderItem` modellari (Shop bazasida, `tenant_id` har bir Order'da)
- [ ] Savat — sessiya asosidami, bazadami (ochiq savol)
- [ ] Buyurtma yaratilganda Inventra'ning internal endpoint'iga murojaat (ombor kamaytirish/zahiralash — 2-bo'lim, 3-savol)

### 4-bosqich — To'lov

- [ ] 2-bo'limdagi 2-savolni hal qilish
- [ ] Tanlangan provayder integratsiyasi

### 5-bosqich — Testlar

- [ ] Inventra'dagi kabi: `pytest`, alohida test-compose, o'z bazasi bilan izolyatsiya
- [ ] Customer login/throttle testlari (Inventra'dagilardan moslashtiriladi)
- [ ] Order/ombor integratsiyasi testlari (Inventra internal API bilan)

---

## 4. Keyingi band

Hozircha **kod yozilmaydi** — Inventra tomonidagi 6a (JWT) va customer-kodini-olib-tashlash ishlari tugagach, va yuqoridagi 2-bo'limning kamida 1 va 3-savollari hal qilingach, 0-bosqichdan boshlanadi.
