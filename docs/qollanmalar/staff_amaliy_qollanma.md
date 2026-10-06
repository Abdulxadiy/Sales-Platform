# Xodimlar (Staff: Kassir & Omborchi) — Amaliy Vizual Foydalanish Qo‘llanmasi

Ushbu amaliy yo‘riqnoma **Inventra** tizimidagi do‘kon xodimlari — **Kassirlar** va **Omborchilar** uchun kundalik ish jarayonlarini (sotuv, kassa, tovar kirimi va smena topshirish) eng qulay va to‘g‘ri bajarishlari uchun rasmlar va bosqichma-bosqich ko‘rsatmalar bilan tayyorlangan.

---

## Mundarija

1. [Tizimga Kirish va Smenani Ochish](#1-tizimga-kirish-va-smenani-ochish)
2. [Kassirning Kundalik Savdo Ishi (POS)](#2-kassirning-kundalik-savdo-ishi-pos)
   - [2.1. Shtrix-kod skaneri va tovar qidirish](#21-shtrix-kod-skaneri-va-tovar-qidirish)
   - [2.2. Savatni boshqarish va tovarlar soni](#22-savatni-boshqarish-va-tovarlar-soni)
   - [2.3. "1-narx" (Hamkor narxi) tugmasidan foydalanish](#23-1-narx-hamkor-narxi-tugmasidan-foydalanish)
   - [2.4. To'lovni qabul qilish: Naqd, Karta va Nasiya](#24-tolovni-qabul-qilish-naqd-karta-va-nasiya)
3. [Kassadan Chiqim Qilish (Xarajatlar)](#3-kassadan-chiqim-qilish-xarajatlar)
4. [Ish Kunini Yakunlash va Kassa Smenasini Yopish](#4-ish-kunini-yakunlash-va-kassa-smenasini-yopish)
5. [Omborchi Uchun Tovar Qabuli va Qoldiqlar](#5-omborchi-uchun-tovar-qabuli-va-qoldiqlar)

---

## 1. Tizimga Kirish va Smenani Ochish

Ish kunining boshida brauzer orqali `/login` sahifasini oching:

![Xodim login oynasi](/docs/images/login_flow.png)

1. Rahbaringiz tomonidan berilgan **Username** va **Parol**ni kiriting.
2. Agar hisobingizga 2FA ulangan bo‘lsa, Telegram’dagi tasdiqlash kodini kiriting.
3. Tizimga kirgach, yuqoridagi sarlavhada **"Smena Yopiq"** qizil indikatori turadi.
4. Savdoni boshlash uchun yuqori o‘ng burchakdagi **"Smena Ochish"** tugmasini bosing.
5. Smena ochilgach, indikator yashil rangga o‘tadi va kassa faollashadi.

---

## 2. Kassirning Kundalik Savdo Ishi (POS)

Chap menyudan aravacha belgisi — **Kassa (POS)** bo‘limiga o‘ting (`/pos`):

![Kassa savdo oynasi](/docs/images/pos_terminal.png)

### 2.1. Shtrix-kod skaneri va tovar qidirish
* **Skaner bilan:** Shtrix-kod skaneri yordamida tovar qutisidagi kodni skanerlang. Mahsulot bir zumda o‘ng tarafdagi savatga tushadi.
* **Qidiruv bilan:** Agar tovar ustida shtrix-kod bo‘lmasa, yuqoridagi qidiruv maydoniga tovar nomini yozing va ro‘yxatdan tanlang.
* **Kategoriya bo‘yicha:** Yuqoridagi toifalar (masalan: *"Chexollar"*, *"Aksessuarlar"*) tugmasini bosib, kerakli tovar ustiga bosing.

---

### 2.2. Savatni boshqarish va tovarlar soni
* Savatdagi tovar sonini oshirish yoki kamaytirish uchun `+` va `-` tugmalaridan foydalaning.
* Agar xaridor fikridan qaytsa, qator chetidagi qizil axlat qutisi belgisini bosib, tovarni savatdan olib tashlang.

---

### 2.3. "1-narx" (Hamkor narxi) tugmasidan foydalanish
Agar do‘konga rahbar bilan kelishgan ulgurji mijoz yoki yaqin hamkor kelsa:
* Qidiruv maydoni yonidagi **"⚡ 1-Narx (Ulgurji)"** tugmasini yoqing.
* Savatdagi tovarlar darhol ulgurji 1-narxga aylanadi.

> [!CAUTION]
> Agar savatdagi tovarlardan birortasining 1-narxi belgilanmagan bo‘lsa, tizim sotuvni to‘xtatadi. Bunday holatda rahbaringizga xabar bering.

---

### 2.4. To'lovni qabul qilish: Naqd, Karta va Nasiya

Xaridor tanlagan barcha tovarlar savatga yig‘ilgach, pastdagi **"To‘lovga O‘tish"** tugmasini bosing:

![To'lovni rasmiylashtirish modali](/docs/images/pos_payment_modal.png)

1. **Naqd pul:**
   * Xaridor bergan summani kiriting (masalan, chek `140,000 UZS`, xaridor `200,000 UZS` berdi).
   * Tizim xaridorga qaytarilishi kerak bo‘lgan qaytimni (`60,000 UZS`) avtomatik ravishda yashil rangda ko‘rsatadi.
2. **Bank kartasi (Terminal):**
   * Terminal orqali to‘lov o‘tgach, "Karta" variantini tanlang va tasdiqlang.
3. **Nasiya (Qarzga berish):**
   * Rahbar ruxsati bilan nasiyaga berilayotgan bo‘lsa, mijozlar ro‘yxatidan xaridorni tanlang.
   * Chek summasi uning qarz balansiga yoziladi.

To‘lov tugagach, kassa cheki avtomatik chiqariladi va savat yangi mijoz uchun bo‘shatiladi.

---

## 3. Kassadan Chiqim Qilish (Xarajatlar)

Kun davomida do‘kon ehtiyojlari uchun (tushlik, idora xarajatlari, yo‘lkira) kassadan pul olinishi kerak bo‘lsa:
1. Yuqori paneldagi **"Chiqim / Xarajat"** tugmasini bosing.
2. Olinayotgan summani kiriting (masalan, `35,000 UZS`).
3. Sababini yozing (masalan, *"Ofis uchun qog‘oz xaridi"*).
4. Tasdiqlang — ushbu summa kassa balansidan ayirilib, Z-hisobotda xarajat sifatida aks etadi.

---

## 4. Ish Kunini Yakunlash va Kassa Smenasini Yopish

Ish kuni tugaganda kassir smenani yopishi va hisobot topshirishi shart:

![Kassa smenasini yopish modali](/docs/images/shift_close_modal.png)

### Smenani yopish tartibi:
1. Kassa g‘aladonidagi barcha naqd pullarni sanang.
2. Yuqori paneldagi **"Smenani Yopish"** tugmasini bosing (`/shifts`).
3. Sanalgan haqiqiy naqd pul summasini **"Haqiqiy Naqd Pul"** maydoniga kiriting.
4. Tizim avtomatik tarzda:
   * Kunlik barcha savdolar summasini hisoblaydi;
   * Xarajatlarni ayiradi;
   * Kutilayotgan summa bilan sanalgan summa o‘rtasida farq (kamomad yoki ortiqchalik) bor-yo‘qligini ko‘rsatadi.
5. Agar tafovut bo‘lsa, **"Tafovut sababi"** maydoniga izoh yozing.
6. **"Smenani Yopish va Z-Hisobot"** tugmasini bosing.
7. Chiqqan rasmiy Z-hisobotni saqlang yoki chop etib do‘kon rahbariga topshiring.

---

## 5. Omborchi Uchun Tovar Qabuli va Qoldiqlar

Agar siz omborda tovar qabul qilish va nazorat qilishga mas’ul bo‘lsangiz:

![Tovar kirimi oynasi](/docs/images/inventory_intake.png)

1. Chap menyudan **Ombor** (`/inventory`) bo‘limiga o‘ting.
2. Yetkazib beruvchi olib kelgan tovarlar partiyasini tekshiring.
3. **"+ Tovar Kirimi"** tugmasini bosib, qabul qilingan tovarlarni, ularning sonini va hisob-faktura bo‘yicha tannarxini kiritib tasdiqlang.
4. Tovar omborga joylashtirilgach, kassa xodimlari uni darhol sotishni boshlashlari mumkin bo‘ladi.
