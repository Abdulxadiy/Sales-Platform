# Do‘kon Egasi (Owner) — To‘liq Amaliy Vizual Foydalanish Qo‘llanmasi

Ushbu amaliy qo‘llanma **Inventra Sales Platform** tizimida do‘kon egasi (**Owner**) o‘z savdo korxonasining barcha jarayonlarini — tovarlar katalogi, narxlar siyosati, ombor logistikasi, kassa operatsiyalari, xodimlar boshqaruvi va moliyaviy tahlilni to‘liq va mustaqil boshqarishi uchun bosqichma-bosqich yo‘riqnoma sifatida yaratilgan.

---

## Mundarija

1. [Tizimga Kirish va Profilni Sozlash](#1-tizimga-kirish-va-profilni-sozlash)
2. [Dashboard — Savdo Analitikasi va Moliyaviy Holat](#2-dashboard--savdo-analitikasi-va-moliyaviy-holat)
3. [Katalog — Mahsulotlar va 3 Xil Narx Tizimi](#3-katalog--mahsulotlar-va-3-xil-narx-tizimi)
   - [3.1. Yangi tovar va mahsulot variantlarini kiritish](#31-yangi-tovar-va-mahsulot-variantlarini-kiritish)
   - [3.2. Chakana, Minimal va 1-narx (Hamkor narxi) qoidalari](#32-chakana-minimal-va-1-narx-hamkor-narxi-qoidalari)
4. [Ombor (Inventory) va Tovar Kirimi](#4-ombor-inventory-va-tovar-kirimi)
   - [4.1. Tovar kirimi (Intake) va tannarx hisob-kitobi](#41-tovar-kirimi-intake-va-tannarx-hisob-kitobi)
   - [4.2. Qoldiqni to'g'rilash (Adjust) va Spisanie (Write-off)](#42-qoldiqni-togrilash-adjust-va-spisanie-write-off)
5. [Tezkor Kassa (POS) va Savdo Jarayoni](#5-tezkor-kassa-pos-va-savdo-jarayoni)
   - [5.1. Shtrix-kod va tovarlarni savatga qo'shish](#51-shtrix-kod-va-tovarlarni-savatga-qoshish)
   - [5.2. 1-narx (Partner Price) rejimini faollashtirish](#52-1-narx-partner-price-rejimini-faollashtirish)
   - [5.3. Aralash valyutali savat (UZS va USD)](#53-aralash-valyutali-savat-uzs-va-usd)
   - [5.4. To'lov qabul qilish: Naqd, Karta va Nasiya](#54-tolov-qabul-qilish-naqd-karta-va-nasiya)
6. [Savdolar Arxivi, Chekni Bekor Qilish (Void) va Nasiyadorlar](#6-savdolar-arxivi-chekni-bekor-qilish-void-va-nasiyadorlar)
7. [Kassa Smenalari, Chiqimlar va Z-Hisobot](#7-kassa-smenalari-chiqimlar-va-z-hisobot)
8. [Xodimlar (Jamoa) Boshqaruvi va Huquqlar](#8-xodimlar-jamoa-boshqaruvi-va-huquqlar)
9. [B2B Do'konlararo Tovar Almashinuvi](#9-b2b-dokonlararo-tovar-almashinuvi)

---

## 1. Tizimga Kirish va Profilni Sozlash

Platform Administrator sizning do‘koningizni ro‘yxatga olgach, ko‘rsatilgan emailingizga parol o‘rnatish havolasi keladi. Parol o‘rnatgach, `/login` sahifasi orqali tizimga kirasiz:

![Login va tizimga kirish](/docs/images/login_flow.png)

1. Telefon raqamingiz yoki belgilangan **Username** hamda **Parol**ni kiriting.
2. Tizim bir martalik Telegram OTP kodini so‘raydi.
3. Telegram botdagi kodni kiritib tasdiqlang.

> [!TIP]
> Profil bo‘limida do‘koningizning markaziy valyuta kursini (masalan, 1 USD = 12,850 UZS) va har kungi avtomatik Z-hisobot vaqtini (masalan, 23:00) sozlashingiz mumkin.

---

## 2. Dashboard — Savdo Analitikasi va Moliyaviy Holat

Tizimga kirishingiz bilan do‘koningizning asosiy analitika paneli (`/`) ochiladi:

![Do'kon egasi Dashboard ko'rinishi](/docs/images/dashboard_overview.png)

### Asosiy ko‘rsatkichlar kartalari:
* **Jami Tushum:** Tanlangan davr (Bugun, Shu hafta, Shu oy, Shu yil) bo‘yicha tushgan jami mablag‘ (UZS va USD alohida).
* **Sof Foyda:** Sotilgan tovarlarning chakana narxi bilan ularning kirim tannarxi o‘rtasidagi haqiqiy sof foyda.
* **Nasiya / Qarz Balansi:** Mijozlar tomonidan to‘lanmagan, do‘konga qaytishi kerak bo‘lgan qarzlar umumiy summasi.
* **Sotuvlar Soni va O‘rtacha Chek:** Amalga oshirilgan savdolar va o‘rtacha bitta xarid qiymati.

Quyidagi grafiklarda esa:
* **Sotuvlar dinamikasi:** Soatlar va kunlar kesimidagi tushumlar to‘lqini.
* **To‘lov turlari taqsimoti:** Xaridorlar naqd pul, bank kartasi yoki nasiya orqali qancha to‘laganlik ulushi.
* **Top-10 eng ko‘p sotilgan tovarlar:** Qaysi mahsulotlar eng ko‘p daromad keltirayotganligi.

---

## 3. Katalog — Mahsulotlar va 3 Xil Narx Tizimi

Chap menyudan **Katalog** belgisini tanlang (`/catalog`). Bu yerda barcha mahsulotlar toifalarga bo‘lingan holda boshqariladi:

![Mahsulotlar katalogi](/docs/images/catalog_management.png)

### 3.1. Yangi tovar va mahsulot variantlarini kiritish

Yangi mahsulot kiritish uchun yuqoridagi **"+ Yangi Mahsulot"** tugmasini bosing:

![Yangi mahsulot yaratish modali](/docs/images/product_create_modal.png)

1. **Mahsulot nomi:** Masalan, *"iPhone 15 Pro Silicone Case"*.
2. **Kategoriya:** Mos toifani tanlang (masalan, *"Chexollar"*).
3. **Asosiy Rasm:** MinIO bulutli xotirasiga sifatli rasm yuklang.
4. **Variantlar:** Mahsulotning rangi, o‘lchami yoki modeliga qarab variantlarini yarating (masalan, *"Qora - 128GB"*, *"Moviy - 256GB"*).
5. **Shtrix-kod:** Mahsulot qutisidagi kodni skanerlang yoki tizim yaratgan shtrix-kodni qoldiring.

---

### 3.2. Chakana, Minimal va 1-narx (Hamkor narxi) qoidalari

Inventra tizimida har bir tovar varianti uchun **3 xil mustaqil narx** ko‘rsatiladi:
* **Tavsiya etilgan narx (`price_recommended`):** Standart xaridorlar uchun ko‘rinadigan rasmiy chakana narx.
* **Minimal narx (`price_min`):** Chegirma berilganda tovar tushishi mumkin bo‘lgan eng quyi pol narxi. Kassir bu narxdan pastga sota olmaydi.
* **1-narx / Hamkor narxi (`price_partner`):** Doimiy ulgurji oluvchilar, dilerlar va yaqin do‘stlar uchun maxsus eng arzon narx.

> [!IMPORTANT]
> Agar tovarning 1-narxi belgilanmagan bo‘lsa, kassa rejimida 1-narx galochkasi yoqilganda tizim ushbu tovarni sotishni bloklaydi! Shuning uchun barcha tovarlaringizga 1-narxni to‘ldirish tavsiya etiladi.

---

## 4. Ombor (Inventory) va Tovar Kirimi

Chap menyudan **Ombor** (`/inventory`) bo‘limiga o‘ting. Bu yerda tovarlarning aniq qoldiqlari, yetishmovchiliklar va kirim operatsiyalari aks etadi:

![Ombor qoldiqlari jadvali](/docs/images/inventory_stock.png)

### 4.1. Tovar kirimi (Intake) va tannarx hisob-kitobi

Yangi partiya tovar kelganda yuqoridagi **"+ Tovar Kirimi"** tugmasini bosing:

![Tovar kirimi oynasi](/docs/images/inventory_intake.png)

1. Tovar variantini tanlang yoki shtrix-kodini skanerlang.
2. Kelgan miqdorni kiriting (masalan, `50 dona`).
3. **Kirim Tannarxi**ni kiriting (masalan, `120,000 UZS` yoki `$10.50`).
4. **Ta’minotchi (Kontragent)**ni tanlang.
5. Tasdiqlangach, ombor qoldig‘i darhol oshadi va o‘rtacha tannarx tizimda qayd etiladi.

---

### 4.2. Qoldiqni to'g'rilash (Adjust) va Spisanie (Write-off)
* **Qoldiqni to‘g‘rilash:** Inventarizatsiya o‘tkazilganda haqiqiy qoldiq bilan tizimdagi farq aniqlansa, qoldiq to‘g‘rilanadi.
* **Hisobdan chiqarish (Write-off):** Yaroqsiz bo‘lib qolgan, singan yoki yo‘qolgan tovarlar sababi ko‘rsatilgan holda hisobdan chiqariladi va auditga yoziladi.

---

## 5. Tezkor Kassa (POS) va Savdo Jarayoni

Do‘konda mijozlarga xizmat ko‘rsatish **Kassa (POS)** oynasida amalga oshiriladi (`/pos`):

![Kassa savdo ekrani](/docs/images/pos_terminal.png)

### 5.1. Shtrix-kod va tovarlarni savatga qo'shish
* **Skaner bilan:** Shtrix-kod skaner qilinganda tovar bir zumda savatga tushadi.
* **Qidiruv bilan:** Qidiruv maydoniga tovar nomining bir qismini yozib `Enter` bosing.
* **Sensor/Sichqoncha bilan:** Ekranda ko‘rinib turgan tovar kartochkasidagi `+` tugmasini bosing.

---

### 5.2. 1-narx (Partner Price) rejimini faollashtirish
Agar do‘konga ulgurji xaridor yoki hamkor kelsa:
1. Qidiruv qatori yonidagi **"⚡ 1-Narx (Ulgurji)"** tugmasini bosing.
2. Savatdagi barcha tovarlar avtomatik ravishda ulgurji 1-narxga aylanadi.

---

### 5.3. Aralash valyutali savat (UZS va USD)
Agar mijoz bir vaqtning o‘zida ham so‘mdagi, ham dollardagi tovarlarni tanlasa, tizim ikkala valyutani alohida jamlaydi va to‘lov paytida avtomatik tarzda **2 ta alohida mustaqil chek** yaratadi.

---

### 5.4. To'lov qabul qilish: Naqd, Karta va Nasiya

Savat to‘ldirilgach, pastdagi **"To‘lovga O‘tish"** tugmasini bosing:

![To'lov qabul qilish oynasi](/docs/images/pos_payment_modal.png)

* **Naqd pul:** Mijoz bergan summa kiritiladi, tizim qaytimni avtomatik chiqaradi.
* **Bank kartasi:** Terminal orqali to‘lov olingach, "Karta" tanlanadi.
* **Nasiya (Qarz):** Mijozning ismi yoki telefon raqami tanlanadi, qarz uning balansiga yoziladi.

---

## 6. Savdolar Arxivi, Chekni Bekor Qilish (Void) va Nasiyadorlar

Chap menyudan **Savdolar** (`/sales`) bo‘limiga o‘ting:

![Savdolar tarixi va cheklar](/docs/images/sales_void_modal.png)

### 7 kunlik Universal Bekor Qilish (Void):
Xaridor tovarini qaytarib olib kelsa:
1. Cheklar ro‘yxatidan kerakli chekni toping.
2. **"Chekni Bekor Qilish" (Void)** tugmasini bosing.
3. Butun chekni yoki faqat qaytarilgan tovarlarni belgilang (qisman qaytarish).
4. Bekor qilish sababini yozing.
5. Tizim pullarni qaytaradi, tovarlarni omborga qayta kirim qiladi va nasiyador qarzini kamaytiradi.

### Nasiyadorlar Balansi va Qarzni Undirish:
**Nasiyalar** tabida har bir qarzdorning summasi, muddati ko‘rinadi. Qarz to‘langanda **"Qarz to‘lovi qabul qilish"** tugmasi orqali kassa tushumiga kirim qilinadi.

![Nasiyadorlar monitoringi](/docs/images/debts_management.png)

---

## 7. Kassa Smenalari, Chiqimlar va Z-Hisobot

Har bir ish kuni alohida **Kassa Smenasi** bilan boshlanadi va tugaydi (`/shifts`):

![Smenani yopish va Z-hisobot](/docs/images/shift_close_modal.png)

* **Smena ochish:** Kassir ish boshlaganda kassa ochiladi.
* **Chiqim (Xarajat):** Do‘kon xarajatlari (tushlik, yo‘lkira, mayda xaridlar) uchun pul olinganda kassa chiqim orderi yoziladi.
* **Smenani yopish:** Ish kuni yakunida kassadagi haqiqiy naqd pul sanaladi va tizimga kiritiladi. Tizim nazariy summa bilan haqiqiy summani solishtiradi, tafovut bo‘lsa qayd etadi va rasmiy **Z-Hisobot** chiqaradi.

---

## 8. Xodimlar (Jamoa) Boshqaruvi va Huquqlar

Do‘konda ishlaydigan kassirlar, omborchilar va menejerlarni **Xodimlar** (`/employees`) bo‘limida boshqarasiz:

![Xodimlar boshqaruvi](/docs/images/employees_management.png)

* Yangi xodimni ishga qabul qilish uchun telefon raqami va lavozimini kiritasiz.
* Har bir xodimga o‘z vazifasiga mos ruxsatlar (`can_sell`, `can_manage_inventory`, `can_view_analytics` va h.k.) beriladi.
* Xodim ishdan bo‘shatilganda bitta tugma bilan uning tizimga kirishi to‘xtatiladi (`fire`).

---

## 9. B2B Do'konlararo Tovar Almashinuvi

Agar sizda bir nechta do‘kon bo‘lsa yoki hamkor do‘konlar bilan ishlasangiz:
1. Ombor bo‘limida **"B2B O‘tkazish"** tugmasini bosing.
2. Qabul qiluvchi do‘konni va tovarlar ro‘yxatini tanlang.
3. Yuborilgan tovar ikkinchi do‘kon tasdiqlamaguncha tranzit holatida turadi.
4. Ikkinchi do‘kon qabul qilgach, uning omboriga avtomatik kirim bo‘ladi.
