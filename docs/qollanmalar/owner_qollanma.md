# Inventra Platformasi — Do'kon Egasi (Owner) Qo'llanmasi

Ushbu qo'llanma **Inventra Sales Platform** tizimidagi **Do'kon Egasi (Owner)** uchun ishlab chiqilgan bo'lib, do'konning savdo operatsiyalari, ombor logistikasi, tovarlar katalogi, xodimlar, nasiyalar, B2B transferlar va moliyaviy hisobotlarni to'liq boshqarish tartibini batafsil tushuntiradi.

---

## Mundarija

1. [Do'kon Egasining Rol va Vakolatlari](#1-dokon-egasining-rol-va-vakolatlari)
2. [Tizimga Kirish va Akkauntni Sozlash](#2-tizimga-kirish-va-akkauntni-sozlash)
   - [2.1. Birinchi marta kirish va parol o'rnatish](#21-birinchi-marta-kirish-va-parol-ornatish)
   - [2.2. Telegram botga ulanish va 2FA](#22-telegram-botga-ulanish-va-2fa)
   - [2.3. Profil va Do'kon Sozlamalari (Dollar kursi, Z-Hisobot vaqti)](#23-profil-va-dokon-sozlamalari-dollar-kursi-z-hisobot-vaqti)
3. [Dashboard va Savdo Analitikasi](#3-dashboard-va-savdo-analitikasi)
4. [Katalog va Mahsulotlar Boshqaruvi](#4-katalog-va-mahsulotlar-boshqaruvi)
   - [4.1. Kategoriyalar va Valyuta tanlovi (UZS / USD)](#41-kategoriyalar-va-valyuta-tanlovi-uzs--usd)
   - [4.2. Mahsulotlar va Mahsulot Variantlari](#42-mahsulotlar-va-mahsulot-variantlari)
   - [4.3. Uch xil narx tizimi (Tavsiya, Minimal, 1-narx)](#43-uch-xil-narx-tizimi-tavsiya-minimal-1-narx)
5. [Ombor (Inventory) va Qoldiqlar Harakati](#5-ombor-inventory-va-qoldiqlar-harakati)
   - [5.1. Qoldiqlar monitoringi](#51-qoldiqlar-monitoringi)
   - [5.2. Tovar kirimi (Intake) va Tannarx](#52-tovar-kirimi-intake-va-tannarx)
   - [5.3. Qoldiqni to'g'rilash (Adjust) va Spisanie (Write-off)](#53-qoldiqni-togrilash-adjust-va-spisanie-write-off)
   - [5.4. Tovarlarni qaytarishlar](#54-tovarlarni-qaytarishlar)
6. [Tezkor Kassa (POS) va Savdo Jarayoni](#6-tezkor-kassa-pos-va-savdo-jarayoni)
   - [6.1. Shtrix-kod va Savat bilan ishlash](#61-shtrix-kod-va-savat-bilan-ishlash)
   - [6.2. 1-narx galochkasi (Partner Price)](#62-1-narx-galochkasi-partner-price)
   - [6.3. Ko'p valyutali savat (UZS va USD avtomatik ajratilishi)](#63-kop-valyutali-savat-uzs-va-usd-avtomatik-ajratilishi)
   - [6.4. To'lov turlari (Naqd, Karta, Nasiya)](#64-tolov-turlari-naqd-karta-nasiya)
7. [Savdolar Tarixi, Universal Bekor Qilish (Void) va Nasiyalar](#7-savdolar-tarixi-universal-bekor-qilish-void-va-nasiyalar)
   - [7.1. 7 kunlik Universal Bekor Qilish (Void)](#71-7-kunlik-universal-bekor-qilish-void)
   - [7.2. Kontragentlar va Nasiya balansi](#72-kontragentlar-va-nasiya-balansi)
   - [7.3. Nasiya chegarasi va Telegram ogohlantirishlari](#73-nasiya-chegarasi-va-telegram-ogohlantirishlari)
   - [7.4. Qarz to'lovlarini qabul qilish va Tuzatish kiritish](#74-qarz-tolovlarini-qabul-qilish-va-tuzatish-kiritish)
8. [Do'konlararo B2B Tovar O'tkazish](#8-dokonlararo-b2b-tovar-otkazish)
9. [Kassa Smenalari, Chiqimlar va Z-Hisobot](#9-kassa-smenalari-chiqimlar-va-z-hisobot)
10. [Xodimlar (Jamoa) Boshqaruvi](#10-xodimlar-jamoa-boshqaruvi)
11. [Do'kon Xavfsizligi va Audit](#11-dokon-xavfsizligi-va-audit)

---

## 1. Do'kon Egasining Rol va Vakolatlari

Do'kon Egasi (`owner`) — o'z savdo korxonasining mutlaq rahbaridir.

**Asosiy vakolatlari:**
* O'z do'koni doirasida barcha modullarga (Dashboard, POS, Katalog, Ombor, Savdo, Kassa, Xodimlar) to'liq va cheklovsiz kirish;
* Mahsulotlar assortimenti, tannarxlari, chakana va ulgurji narxlarini belgilash;
* Do'konning sof foydasi, tushumlari va qarzlarini nazorat qilish;
* Yangi xodimlarni ishga qabul qilish (`hire`) va ularga ruxsatlar (`permissions`) biriktirish;
* Qarz to'lovlarini qabul qilish va tasdiqlash (bu huquq oddiy xodimlarda bo'lmaydi).

---

## 2. Tizimga Kirish va Akkauntni Sozlash

### 2.1. Birinchi marta kirish va parol o'rnatish
Platform Administratori sizning do'koningizni tizimda ro'yxatdan o'tkazgach, ko'rsatilgan elektron pochta manzilingizga xavfsiz havola keladi.
1. Havola orqali `/setup-account` sahifasiga o'ting.
2. O'zingiz uchun qulay **Username** va ishonchli **Parol** o'rnating.
3. Tasdiqlangandan so'ng tizim sizni login sahifasiga yo'naltiradi.

### 2.2. Telegram botga ulanish va 2FA
Inventra tizimiga har bir kirish Telegram orqali yuboriladigan bir martalik tasdiqlash kodi (OTP) bilan himoyalangan.
1. Telegram qidiruvidan rasmiy `@inventraa_bot` ni oching.
2. Botga `/start inventra` buyrug'ini yuboring.
3. Bot so'ragan **"Kontaktni ulashish"** (Share Contact) tugmasini bosing (telefon raqamingiz tizimda ro'yxatdan o'tgan raqam bilan bir xil bo'lishi shart).
4. Shundan so'ng tizimga kirishda kiritilgan har bir login/paroldan keyin ushbu botga 6 xonali OTP kod keladi.

### 2.3. Profil va Do'kon Sozlamalari (Dollar kursi, Z-Hisobot vaqti)
`/profile` sahifasida shaxsiy ma'lumotlaringizni to'ldirishingiz va biznes sozlamalarini kiritishingiz mumkin:
* **Ichki dollar kursi (`Tenant.usd_rate`):** Masalan: `12 850`. Ushbu kurs tovarlar ro'yxatida yoki kassa oynasida "Dollarda ko'rsatish" funksiyasi yoqilganda so'mdagi tovarlarni dollarga chaqib ko'rsatish uchun ishlatiladi.
* **Kunlik hisobot vaqti (`Tenant.daily_report_time`):** Standart holatda `22:00`. Ushbu vaqtda do'konning kunlik umumiy savdo va kassa hisoboti (Z-hisobot) avtomatik tarzda Telegramingizga yuboriladi.

---

## 3. Dashboard va Savdo Analitikasi

Bosh sahifa (`/`) faqat Do'kon Egasi va Platform Adminga ko'rinadi. Bu yerda real vaqt rejimida biznesning moliyaviy yuragi aks etadi.

### Asosiy KPI Kartochkalari:
* **Jami Savdo Tushumi:** Alohida `UZS` va `USD` ko'rinishida.
* **Sof Foyda (`Net Profit`):** `Sotuv Narxi - Tannarx` formulasi bo'yicha aniq hisoblanadi. Bekor qilingan (void) tovarlar avtomatik chegiriladi.
* **Jami Debitorlik Qarzlar:** Mijozlarning do'kondan qancha qarzi borligi (UZS va USD alohida).
* **Cheklar Soni va O'rtacha Chek Summasi.**

### Analitik Diagrammalar:
1. **Savdo va Foyda Dinamikasi:** Kunlar kesimidagi daromad va foyda grafigi.
2. **Top-10 Xaridorgir Mahsulotlar:** Eng ko'p sotilgan va eng ko'p daromad keltirgan tovarlar.
3. **To'lov Turlari Taqsimoti:** Naqd pul, Karta (terminal) va Nasiya savdolarining foizdagi ulushi.
4. **Kassirlar Reytingi:** Qaysi xodim qancha savdo qilgani.

> [!TIP]
> Yuqoridagi filtr paneli orqali davrni tanlashingiz mumkin: *Bugun*, *Shu hafta*, *Shu oy*, *Shu yil* yoki *Ixtiyoriy sana oralig'i*.

---

## 4. Katalog va Mahsulotlar Boshqaruvi

Katalog bo'limida (`/catalog`) tovarlar, ularning toifalari va narxlari boshqariladi.

```
Kategoriya (Ota) [Valyuta: UZS yoki USD, Kod: 10]
 └── Subkategoriya (Bola) [Valyuta meros olinadi, Kod: 10/1]
      └── Mahsulot: "Erkaklar ko'ylagi"
           ├── Variant 1: Oq / L (SKU: 10001, Shtrix-kod: 478001...)
           └── Variant 2: Qora / XL (SKU: 10002, Shtrix-kod: 478002...)
```

### 4.1. Kategoriyalar va Valyuta tanlovi (UZS / USD)
* Tizimda qat'iy **2 darajali kategoriya** tizimi mavjud: Asosiy Kategoriya va Subkategoriya.
* **Kategoriya Valyutasi:** Asosiy kategoriya ochilayotganda uning valyutasi (`UZS` yoki `USD`) tanlanadi. Subkategoriya va unga tegishli barcha tovarlar ushbu valyutani avtomatik meros oladi va o'zgartirib bo'lmaydi.
* **Kategoriya Kodi (`kod`):** Tizim avtomatik o'suvchi tartib raqam beradi, owner xohlasa o'zgartirishi mumkin.

### 4.2. Mahsulotlar va Mahsulot Variantlari
* Har bir tovar kamida bitta **Mahsulot Varianti**ga ega bo'lishi shart (masalan: o'lchami, rangi, hajmi).
* **SKU:** Tizim tomonidan beriladigan noyob raqam (ichki hisob-kitoblar uchun).
* **Shartli Kod (`code`):** `Kategoriya/Subkategoriya/Minimal_narx` ko'rinishida avtomatik yig'iladi va ko'rgazmali hisoblanadi.
* **Shtrix-kod (`barcode`):** Mahsulot qutisidagi shtrix-kod. POS kassa skaneri ushbu kod orqali tovarni bir zumda topadi.
* **Rasm yuklash:** MinIO S3 object storage tizimiga mahsulotning sifatli rasmlari yuklanadi.

### 4.3. Uch xil narx tizimi (Tavsiya, Minimal, 1-narx)
Inventra katalogida moslashuvchan savdo uchun 3 ta narx ko'zda tutilgan:
1. **`price_recommended` (Tavsiya etilgan sotish narxi):** Do'konda odatiy xaridorlar uchun ko'rinadigan standart chakana narx.
2. **`price_min` (Minimal narx):** Kassir sotishi mumkin bo'lgan eng past chegara bo'yicha maslahat narxi.
3. **`price_partner` (1-narx / Hamkor narxi):** Ulgurji xaridorlar, hamkor do'konlar va yaqin mijozlar uchun belgilangan maxsus arzon narx.

---

## 5. Ombor (Inventory) va Qoldiqlar Harakati

Ombor moduli (`/inventory`) tovarlarning kirim-chiqimini to'liq nazorat qiladi.

### 5.1. Qoldiqlar monitoringi
Har bir tovar varianti bo'yicha qoldiq miqdori va oxirgi tannarxi ko'rsatiladi. Omborda tovar tugab qolsa, qoldiq `0.000` bo'ladi. Tizim qoldiqni manfiy (`minus`)ga tushishiga yo'l qo'ymaydi!

### 5.2. Tovar kirimi (Intake) va Tannarx
Yangi tovar kelganda:
1. **"Kirim qilish" (Intake)** tugmasini bosing.
2. Tovar variantini tanlang, keltirilgan miqdorni va **Kirim Narxini (`cost_price`)** kiriting.
3. Tizim ombordagi qoldiqni oshiradi va tovarning `last_cost_price` maydonini yangilaydi (bu kelgusida sof foydani to'g'ri hisoblash uchun asos bo'ladi).

### 5.3. Qoldiqni to'g'rilash (Adjust) va Spisanie (Write-off)
* **Inventarizatsiya tuzatishi (Adjust):** Qayta sanash o'tkazilganda ortiqcha yoki kam chiqqan tovarlarni sababi bilan balansga kiritish.
* **Isrofgarchilik (Write-off):** Singan, yaroqlilik muddati o'tgan yoki yo'qolgan tovarlarni majburiy izoh bilan ombordan chiqarish.

### 5.4. Tovarlarni qaytarishlar
* **Ta'minotchiga qaytarish (Supplier Return):** Sifatsiz tovar ta'minotchiga qaytarilganda ombor qoldig'ini kamaytirish.
* **Mijozdan qaytarib olish (Customer Return):** Mijoz qaytargan tovarni omborga kirim qilish.

---

## 6. Tezkor Kassa (POS) va Savdo Jarayoni

Kassa oynasi (`/pos`) kundalik savdoni eng tezkor va qulay tarzda amalga oshirish uchun yaratilgan.

### 6.1. Shtrix-kod va Savat bilan ishlash
* Shtrix-kod skaneri orqali tovar skaner qilinganda, u avtomatik tarzda savatga qo'shiladi.
* Agar skaner bo'lmasa, qidiruv maydoniga tovar nomi, kodi yoki SKU kiritiladi.
* Savatda tovar soni va narxini tahrirlash mumkin.

### 6.2. 1-narx galochkasi (Partner Price)
* Do'konga ulgurji xaridor yoki doimiy hamkor kelganda kassir yuqoridagi **"1-narx (Partner Price)"** galochkasini yoqadi.
* **Natija:** Barcha tovarlar avtomatik ravishda `price_partner` narxiga o'tadi.
* **Xavfsizlik qoidasi:** Agar savatdagi biror tovarning 1-narxi belgilanmagan (bo'sh yoki 0) bo'lsa, tizim sotuvga ruxsat bermaydi va narxni to'ldirishni talab qiladi.

### 6.3. Ko'p valyutali savat (UZS va USD avtomatik ajratilishi)
Agar xaridor savatiga ham so'mdagi, ham dollardagi tovarlarni tanlagan bo'lsa, backend avtomatik tarzda **2 ta alohida mustaqil chek** yaratadi: biri so'mda, ikkinchisi dollarda. Hisob-kitoblar va kassa tushumlari chalkashmaydi.

### 6.4. To'lov turlari (Naqd, Karta, Nasiya)
* **Naqd pul:** Qabul qilingan summa kiritiladi, tizim qaytimni hisoblaydi.
* **Bank kartasi (Terminal):** Terminal orqali to'lov qabul qilinadi.
* **Nasiya (Qarz):** Kontragent tanlanadi va summa uning qarz hisobiga yoziladi.

---

## 7. Savdolar Tarixi, Universal Bekor Qilish (Void) va Nasiyalar

`/sales` bo'limida barcha sotuvlar arxivi, nasiyadorlar va bekor qilishlar joylashgan.

### 7.1. 7 kunlik Universal Bekor Qilish (Void)
Xaridor tovarlarni qaytarib olib kelganda yoki xato chek urilganda:
* Chek amalga oshirilgan kundan boshlab **qat'iy 7 kun** ichida uni bekor qilish mumkin.
* **Qisman qaytarish:** Butun chekni bekor qilish shart emas! Masalan, chekdagi 10 dona tovardan 2 tasini qaytarish mumkin.
* **Majburiy izoh:** Bekor qilish sababi (`void_reason`) yozilishi shart.
* **Natija:** Bekor qilingan tovarlar omborga qaytadi, agar nasiya bo'lsa, mijozning qarzi kamayadi, audit jurnaliga yoziladi.

### 7.2. Kontragentlar va Nasiya balansi
* Do'konning barcha nasiyachilari (do'konlar, tanishlar, xodimlar) ro'yxati.
* **Ikki valyutali balans:** `debt_balance_uzs` va `debt_balance_usd` alohida yuritiladi.
* **Ishorali balans:**
  * Musbat (`+`) — mijoz do'kondan qarzdor.
  * Manfiy (`-`) — do'kon mijozdan qarzdor (mijozning oldindan to'lagan haqqi bor).
  * Agar mijozning haqqi bo'lsa va yana tovar olsa, yangi qarzdan mavjud haq avtomatik chegiriladi.

### 7.3. Nasiya chegarasi va Telegram ogohlantirishlari
Mijozning qarzi oshib ketganda xavfni kamaytirish uchun:
* Har **10 million so'm** qarz oshganda (10 mln, 20 mln, 30 mln...);
* Har **1 000 USD** qarz oshganda (1000, 2000, 3000...);
Do'kon egasining Telegramiga ogohlantirish boradi: *"Diqqat: Falonchi mijozning qarzi 20,000,000 UZS ga yetdi!"*.

### 7.4. Qarz to'lovlarini qabul qilish va Tuzatish kiritish
* Qarz to'lovini faqat **Do'kon Egasi** qabul qila oladi (`DebtPayment`).
* To'lov qabul qilingach, yozuvni bazadan o'chirib bo'lmaydi!
* Agar summa xato kiritilgan bo'lsa, **"Tuzatish kiritish"** tugmasi orqali majburiy izoh bilan teskari to'g'rilash kiritiladi (`is_correction=True`).

---

## 8. Do'konlararo B2B Tovar O'tkazish

Agar siz tizimdagi boshqa bir do'konga tovar sotsangiz:
1. POS kassa yoki Savdo bo'limida kontragent sifatida boshqa do'konni tanlaysiz.
2. Tovar jo'natilganda, sizning omboringizdan tovarlar o'sha zahoti chiqib ketadi.
3. Qabul qiluvchi do'kon egasiga Telegram va ilova orqali xabar boradi: *"Sizga Falon Do'kondan tovarlar jo'natildi. Qabul qilasizmi?"*.
4. **Qabul qiluvchi:**
   * Tovarlarni to'liq qabul qilishi (`accept`), qisman qabul qilishi (`partially_accept`) yoki rad etishi (`reject`) mumkin.
   * Qabul qilishda tovarlarni o'zining qaysi kategoriyasiga qo'shishni o'zi tanlaydi.
5. **7 kunlik qoida:** Agar 7 kun ichida qabul qiluvchi javob bermasa, transfer avtomatik rad etiladi (`rejected`).
6. **Rad etilganda ombor xatti-harakati:** Rad etilgan tovarlar avtomatik ravishda omboringizga qaytmaydi. Tovar jismonan qaytib kelgach, o'zingiz uni tekshirib "Void" tugmasini bosasiz va shundagina omboringizga qaytadi.

---

## 9. Kassa Smenalari, Chiqimlar va Z-Hisobot

`/shifts` sahifasi do'kon kassasining kunlik moddiy javobgarligini ta'minlaydi.

### 1. Kunlik chiqimlar (`CashExpense`):
Kun davomida kassadan olingan mayda xarajatlar: suv, xo'jalik mollari, tushlik, xodim avansi va boshqalar.

### 2. Qo'shimcha kirimlar (`CashIncome`):
Tovardan tashqari qo'shimcha tushumlar: Paynet xizmati, nusxa ko'chirish, yetkazib berish haqi va h.k.

### 3. Smenani Yopish (Z-Hisobot):
Kun oxirida kassir smenani yopadi:
* Tizim kunlik kutilgan naqd pulni hisoblaydi (`expected_cash`).
* Kassir kassadagi pullarni sanab, haqiqiy summani kiritadi (`actual_cash`).
* Tizim farqni (kassa tafovutini) chiqaradi: `actual_cash - expected_cash`.
* **Agar tafovut chiqsa:** Xodimdan sababi so'raladi. Xodim sababini yozmasa, tizim *"Xodim tafovut sababini bilmaydi"* deb egasiga hisobot beradi.
* Belgilangan vaqtda (masalan, 22:00 da) barcha kassa hisoboti Telegramingizga keladi.

---

## 10. Xodimlar (Jamoa) Boshqaruvi

`/employees` sahifasida xodimlar shtati shakllantiriladi.

* **Ishga olish (`hire`):** Xodimning telefon raqami, lavozimi (`position`) va beriladigan huquqlar belgilanadi.
* **Ruxsatlar to'plami (`permissions`):**
  * Mahsulotlar katalogini ko'rish yoki tahrirlash;
  * Ombor qoldig'ini ko'rish yoki kirim qilish;
  * Kassada 1-narxni qo'llash ruxsati;
  * Cheklarni bekor qilish (void) ruxsati.
* **Ishdan bo'shatish (`fire`):** Xodim ishdan bo'shatilganda, uning paroli darhol bekor qilinadi va tizimga kirish huquqi o'sha soniyada to'xtatiladi. Tarixiy barcha ma'lumotlar saqlanadi.

---

## 11. Do'kon Xavfsizligi va Audit

`/audit` bo'limida do'koningizda kim qachon qanday amal bajarganini kuzatishingiz mumkin.
Hech bir xodim amalga oshirilgan sotuvni, ombor kirimini yoki chekni yashirincha o'chira olmaydi. Barcha amallar tarixda muhrlanadi.
