# Platform Administratori — Amaliy Vizual Foydalanish Qo‘llanmasi

Ushbu amaliy yo‘riqnoma **Inventra** tizimining Platform Administratori (`platform_admin`) uchun tayyorlangan bo‘lib, dasturning barcha ma’muriy imkoniyatlaridan qadamma-qadam va to‘g‘ri foydalanishni real skrinshotlar orqali ko‘rsatib beradi.

---

## Mundarija

1. [Tizimga Kirish va Ikki Faktorli Himoya (2FA)](#1-tizimga-kirish-va-ikki-faktorli-himoya-2fa)
2. [Do'konlar (Tenants) Boshqaruvi va Yangi Do'kon Qo'shish](#2-dokonlar-tenants-boshqaruvi-va-yangi-dokon-qoshish)
   - [2.1. Do'konlar ro'yxati va holatlari monitoringi](#21-dokonlar-royxati-va-holatlari-monitoringi)
   - [2.2. Yangi do'kon va uning rahbarini ro'yxatdan o'tkazish](#22-yangi-dokon-va-uning-rahbarini-royxatdan-otkazish)
   - [2.3. Do'kon egasini almashtirish va faoliyatini boshqarish](#23-dokon-egasini-almashtirish-va-faoliyatini-boshqarish)
3. [Xodimlar Nazorati va Foydalanuvchilarni Blokdan Chiqarish (Unban)](#3-xodimlar-nazorati-va-foydalanuvchilarni-blokdan-chiqarish-unban)
4. [Tizim Audit Jurnali (Audit Logs) Tahlili](#4-tizim-audit-jurnali-audit-logs-tahlili)
5. [Qo'llanmalar va Huquqiy Hujjatlarni Jonli Tahrirlash](#5-qollanmalar-va-huquqiy-hujjatlarni-jonli-tahrirlash)

---

## 1. Tizimga Kirish va Ikki Faktorli Himoya (2FA)

Platform Administrator hisobi platformaning eng yuqori vakolatiga ega bo‘lganligi sababli, unga kirish ikki bosqichli xavfsizlik (2FA) bilan himoyalangan.

![Platformaga kirish oynasi](/docs/images/login_flow.png)

### Bosqichma-bosqich amallar:
1. Brauzerda login sahifasini (`/login`) oching.
2. **Username** (foydalanuvchi nomi) va **Parol**ingizni kiriting.
3. **"Kirish"** tugmasini bosing.
4. Tizim Telegram bot orqali profilingizga ulangan raqamga 6 xonali bir martalik kod (OTP) jo‘natadi.
5. Telegram’dagi kodni tasdiqlash oynasiga kiritib, tizimga kiring.

> [!CAUTION]
> **Xavfsizlik eslatmasi:**
> Ketma-ket 5 marta noto‘g‘ri parol kiritilsa, IP-manzil va hisob 60 soniyaga muzlatiladi. 3 marta muzlatilgandan so‘ng hisob avtomatik tarzda bloklanadi.

---

## 2. Do'konlar (Tenants) Boshqaruvi va Yangi Do'kon Qo'shish

Chap tomondagi boshqaruv menyusidan **Do‘konlar (Tenants)** belgisini bosing (`/tenants`). Bu bo‘limda butun platformadagi do‘konlar, ularning oylik holati va rahbarlari boshqariladi.

### 2.1. Do'konlar ro'yxati va holatlari monitoringi

![Do'konlar (Tenants) ro'yxati](/docs/images/tenants_management.png)

Yuqori panelda 3 ta asosiy indikator mavjud:
* **Jami Do‘konlar:** Tizimda mavjud bo‘lgan barcha savdo nuqtalari soni.
* **Faol Do‘konlar:** Ayni damda savdo qilayotgan va obunasi faol bo‘lgan do‘konlar.
* **Muzlatilgan Do‘konlar:** To‘lov muddati o‘tgan yoki qoidani buzgani sababli to‘xtatilgan do‘konlar.

---

### 2.2. Yangi do'kon va uning rahbarini ro'yxatdan o'tkazish

Yangi mijoz yoki filial qo‘shish uchun yuqori o‘ng burchakdagi **"+ Yangi Do‘kon Qo‘shish"** tugmasini bosing:

![Yangi do'kon yaratish oynasi](/docs/images/tenant_create_modal.png)

**Kiritilishi kerak bo‘lgan maydonlar:**
1. **Do‘kon nomi (`name`):** Masalan, *"Grand Market Toshkent"*.
2. **Do‘kon egasining telefon raqami (`owner_phone_number`):** Masalan, `+998901234567`.
3. **Do‘kon egasining emaili (`owner_email`):** Taklif xati va parol o‘rnatish havolasi uchun.
4. **Tavsif (`description`):** Do‘kon faoliyat turi haqida qisqacha izoh (ixtiyoriy).

**"Yaratish"** tugmasi bosilgach, tizim avtomatik ravishda:
* Do‘kon bazasini ajratadi (Multi-tenant izolatsiya).
* Ko‘rsatilgan raqam egasi uchun `owner` rolini yaratadi.
* Do‘kon egasining emailiga parolni o‘rnatish uchun xavfsiz havola jo‘natadi.

---

### 2.3. Do'kon egasini almashtirish va faoliyatini boshqarish

Har bir do‘kon qatoridagi amallar:
* **Tahrirlash:** Do‘kon nomi yoki egasining aloqa ma’lumotlarini yangilash.
* **Muzlatish (Deactivate):** Do‘kon oylik to‘lovini to‘lamagan bo‘lsa, uni bir zumda muzlatib qo‘yish mumkin. Muzlatilgan do‘kon xodimlari kassaga yoki omborga kira olmaydi.
* **Faollashtirish (Activate):** Bitta tugma orqali do‘kon faoliyatini to‘liq asliga qaytarish.

---

## 3. Xodimlar Nazorati va Foydalanuvchilarni Blokdan Chiqarish (Unban)

Chap menyudagi **Xodimlar** (`/employees`) bo‘limida barcha do‘konlar xodimlari va ularning faollik holati ko‘rinadi.

![Xodimlar va jamoalar nazorati](/docs/images/employees_management.png)

### Bloklangan xodim yoki rahbar hisobini ochish (Unban):
1. Ro‘yxatdan yoki qidiruv qatoridan bloklangan shaxsni toping (holati qizil `Nofaol` bo‘ladi).
2. Qatordagi **"Blokdan chiqarish" (Unban)** tugmasini bosing.
3. Tizim Redis’dagi xato urinishlar hisoblagichini nollaydi va foydalanuvchining `is_active` holatini tiklaydi.
4. Foydalanuvchi o‘sha zahoti tizimga qayta kirishi mumkin bo‘ladi.

---

## 4. Tizim Audit Jurnali (Audit Logs) Tahlili

Platformadagi eng muhim xavfsizlik vositalaridan biri — o‘zgarmas **Audit Jurnali** (`/audit`). Bu yerda har bir harakat soniyalargacha muhrlanadi.

![Tizim audit jurnali](/docs/images/audit_log_screen.png)

**Audit jurnalida kuzatilishi mumkin bo‘lgan hodisalar:**
* Yangi do‘kon yaratilishi va sozlamalar o‘zgarishi;
* Parol o‘zgarishlari, muvaffaqiyatli va muvaffaqiyatsiz kirish urinishlari;
* Kassa smenalarining ochilishi va yopilishi;
* 7 kunlik chek bekor qilish (Void) operatsiyalari va unga yozilgan sabablar;
* Tovar qoldiqlarining hisobdan chiqarilishi (Write-off).

> [!TIP]
> Audit jurnali yozuvlarini hech kim — hatto do‘kon egasi ham o‘chira olmaydi yoki o‘zgartira olmaydi. Bu firibgarlikning oldini oladi.

---

## 5. Qo'llanmalar va Huquqiy Hujjatlarni Jonli Tahrirlash

Platform Administrator sifatida siz tizimning barcha yo‘riqnomalarini, Ommaviy Ofertani va qoidalarni to‘g‘ridan-to‘g‘ri brauzer orqali yangilab borish huquqiga egasiz.

![Hujjatlar va qo'llanmalar boshqaruvi](/docs/images/terms_certificate.png)

1. Chap menyudan **Qo‘llanma & Hujjatlar** bo‘limiga o‘ting (`/docs`).
2. Tahrirlamoqchi bo‘lgan hujjatingiz tabini tanlang.
3. Yuqori o‘ng burchakdagi **"Qo‘llanmani Tahrirlash"** tugmasini bosing.
4. Markdown matniga o‘zgartirish kiritib, **"Saqlash"** tugmasini bosing.
5. Serverdagi fayl o‘sha zahoti yangilanadi va barcha foydalanuvchilarda aks etadi.
