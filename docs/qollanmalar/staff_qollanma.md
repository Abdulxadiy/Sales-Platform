# Inventra Platformasi — Xodimlar (Staff / Kassir / Sotuvchi) Qo'llanmasi

Ushbu qo'llanma **Inventra Sales Platform** tizimida faoliyat yurituvchi xodimlar — **Kassirlar**, **Sotuvchi-maslahatchilar**, **Omborchilar** va **Operatorlar** uchun mo'ljallangan. Unda kundalik kassa amaliyotlari, tovarlarni savatga kiritish, to'lovlarni qabul qilish, ombor qoldiqlari va smenani to'g'ri topshirish qoidalari sodda tilda tushuntiriladi.

---

## Mundarija

1. [Xodimning Vazifalari va Mas'uliyati](#1-xodimning-vazifalari-va-masuliyati)
2. [Tizimga Kirish va Shaxsiy Xavfsizlik](#2-tizimga-kirish-va-shaxsiy-xavfsizlik)
   - [2.1. Birinchi marta parolni o'rnatish](#21-birinchi-marta-parolni-ornatish)
   - [2.2. Telegram botga ulanish va 2FA orqali kirish](#22-telegram-botga-ulanish-va-2fa-orqali-kirish)
3. [Tezkor Kassa (POS) bilan Ishlash](#3-tezkor-kassa-pos-bilan-ishlash)
   - [3.1. Shtrix-kod skaneri va tovar qidirish](#31-shtrix-kod-skaneri-va-tovar-qidirish)
   - [3.2. Savatni boshqarish (miqdor va narx)](#32-savatni-boshqarish-miqdor-va-narx)
   - [3.3. 1-narx galochkasi (Ulgurji / Hamkor narxi)](#33-1-narx-galochkasi-ulgurji--hamkor-narxi)
   - [3.4. So'm va Dollar tovarlar savatda aralash bo'lsa](#34-som-va-dollar-tovarlar-savatda-aralash-bolsa)
   - [3.5. To'lovni qabul qilish (Naqd, Karta, Nasiya)](#35-tolovni-qabul-qilish-naqd-karta-nasiya)
4. [Tovarni Qaytarib Olish va Chekni Bekor Qilish (Void)](#4-tovarni-qaytarib-olish-va-chekni-bekor-qilish-void)
5. [Ombor Qoldiqlarini Ko'rish va Nazorat Qilish](#5-ombor-qoldiqlarini-korish-va-nazorat-qilish)
6. [Kassa Smenasi, Kunlik Chiqimlar va Smenani Yopish](#6-kassa-smenasi-kunlik-chiqimlar-va-smenani-yopish)
   - [6.1. Kunlik chiqimlarni (xarajatlarni) kiritish](#61-kunlik-chiqimlarni-xarajatlarni-kiritish)
   - [6.2. Qo'shimcha kassa tushumlarini qayd etish](#62-qoshimcha-kassa-tushumlarini-qayd-etish)
   - [6.3. Smenani yopish va Kassa tafovuti (Z-Hisobot)](#63-smenani-yopish-va-kassa-tafovuti-z-hisobot)
7. [Xodimning Oltin Qoidalari va Xavfsizlik](#7-xodimning-oltin-qoidalari-va-xavfsizlik)

---

## 1. Xodimning Vazifalari va Mas'uliyati

Do'kon xodimi sifatida siz do'konning eng muhim bo'g'inida turasiz:
* Xaridorlarga tez va xatosiz xizmat ko'rsatish;
* Ombordagi tovar qoldiqlarini aniq yuritish;
* Kassadagi naqd va naqd pulsiz mablag'larning to'g'riligiga moddiy javobgar bo'lish;
* Do'konning tijorat sirlari va mijozlar telefon raqamlarini sir saqlash.

---

## 2. Tizimga Kirish va Shaxsiy Xavfsizlik

### 2.1. Birinchi marta parolni o'rnatish
Do'kon rahbari sizning telefon raqamingizni tizimga kiritgach, elektron pochtangizga maxsus havola yuboriladi:
1. Havola orqali `/setup-account` sahifasiga o'ting.
2. O'zingiz uchun login (**Username**) va kuchli **Parol** o'ylab toping va saqlang.

### 2.2. Telegram botga ulanish va 2FA orqali kirish
Inventra tizimida har bir kirish xavfsiz Telegram kodi orqali tasdiqlanadi:
1. Telegramda rasmiy `@inventraa_bot` ga kiring.
2. `/start inventra` buyrug'ini yozing.
3. Bot so'ragan **"Kontaktni ulashish"** (Share Contact) tugmasini bosing.
4. Brauzerda login va parolingizni kiritganingizda, ushbu botga 6 xonali tasdiqlash kodi keladi. Kodni kiritib ishni boshlaysiz.

> [!WARNING]
> Telegram kodingizni yoki parolingizni hech qachon boshqa xodimlarga bermang. Sizning profilingizdan qilingan har bir savdo va bekor qilish cheki shaxsan sizning nomingizda saqlanadi.

---

## 3. Tezkor Kassa (POS) bilan Ishlash

Ish kunining asosiy qismi `/pos` sahifasida kechadi.

```
+-------------------------------------------------------------------------+
| [Shtrix-kod skaneri / Tovarni qidirish: ____________ ] [ ] 1-narx (POS) |
+------------------------------------+------------------------------------+
| SAVAT:                             | TO'LOV OYNASI:                     |
| 1. Erkaklar ko'ylagi (Oq, L)       | Jami summa: 450,000 UZS            |
|    Miqdor: [ 2 ] dona x 180,000    | [ Naqd Pul ]  [ Bank Kartasi ]     |
| 2. Galstuk (Qora)                  | [ Nasiya / Qarz ]                  |
|    Miqdor: [ 1 ] dona x 90,000     | Qabul qilingan: [ 500,000 ]        |
|                                    | Qaytim: 50,000 UZS                 |
|                                    | [ CHEKNI YAKUNLASH (F5) ]          |
+------------------------------------+------------------------------------+
```

### 3.1. Shtrix-kod skaneri va tovar qidirish
* **Skaner bilan:** Shtrix-kod skanerini tovar qutisidagi kodga qarating. Skaner tugmasi bosilganda tovar bir zumda topiladi va avtomatik ravishda savatga qo'shiladi.
* **Qidiruv bilan:** Agar shtrix-kod bo'lmasa, qidiruv maydoniga tovar nomining bir qismini (masalan, *"ko'ylak"*), uning artikulini yoki kodini yozing. Chiqqan ro'yxatdan keraklisini tanlang.

### 3.2. Savatni boshqarish (miqdor va narx)
* Tovarning sonini oshirish uchun `+` yoki kamaytirish uchun `-` tugmalaridan foydalaning, yoxud sonni qo'lda kiriting.
* Agar xaridor mahsulotdan voz kechsa, qator chetidagi qizil axlat qutisi (O'chirish) belgisini bosing.

### 3.3. 1-narx galochkasi (Ulgurji / Hamkor narxi)
* Agar do'konga rahbar bilan kelishgan ulgurji mijoz yoki doimiy hamkor kelsa, ekranning yuqori qismidagi **"1-narx (Partner Price)"** tugmasini yoqing.
* **Muhim:** Galochka yoqilganda barcha tovarlar do'kon egasi belgilagan eng arzon 1-narxga o'tadi.
* **Diqqat:** Agar biror tovarning 1-narxi belgilanmagan bo'lsa, tizim uni sotishga ruxsat bermaydi va to'xtatadi. Bu holatda rahbaringizga xabar bering.

### 3.4. So'm va Dollar tovarlar savatda aralash bo'lsa
Agar xaridor bir vaqtning o'zida ham so'mdagi tovarlarni, ham dollardagi tovarlarni olsa, xavotir olmang! Tizim o'zi avtomatik tarzda **2 ta alohida chek** chiqaradi: bittasi so'mda, ikkinchisi dollarda hisoblanadi.

### 3.5. To'lovni qabul qilish (Naqd, Karta, Nasiya)
1. **Naqd pul:**
   * Xaridor bergan summani kiriting (masalan, savat 175,000 so'm, xaridor 200,000 so'm berdi).
   * Tizim xaridorga qaytarilishi kerak bo'lgan qaytimni (`25,000 so'm`) aniq ko'rsatadi.
2. **Bank kartasi (Terminal):**
   * Terminal orqali to'lov yechib olingach, "Karta" tugmasini bosing.
3. **Nasiya (Qarz):**
   * "Nasiya" tugmasini tanlang va kontragentlar ro'yxatidan qarz oluvchi shaxsni yoki uning telefon raqamini tanlang.
   * To'lov uning shaxsiy qarz hisobiga yoziladi.

---

## 4. Tovarni Qaytarib Olish va Chekni Bekor Qilish (Void)

Mijoz tovarini qaytarib olib kelganda:
1. `/sales` (Savdolar) bo'limiga o'ting.
2. Chek raqami, xaridor yoki sana bo'yicha chekni toping.
3. **"Bekor qilish / Qaytarish" (Void)** tugmasini bosing.
4. **Qisman qaytarish:** Agar mijoz 5 ta tovardan faqat 1 tasini qaytargan bo'lsa, faqat o'sha 1 dona tovarni tanlang.
5. **Bekor qilish sababi:** Qaytarish sababini majburiy yozing (masalan: *"O'lchami to'g'ri kelmadi"*, *"Brak chiqdi"*).
6. Qaytarilgan tovar avtomatik tarzda omborga qo'shiladi va kassa hisobidan mablag' chegiriladi.

> [!IMPORTANT]
> Sotuv amalga oshirilgan kundan boshlab **faqat 7 kun ichida** chekni bekor qilish mumkin. 7 kundan keyin tizim chekni bekor qilishga ruxsat bermaydi!

---

## 5. Ombor Qoldiqlarini Ko'rish va Nazorat Qilish

`/inventory` bo'limida:
* Qaysi tovardan qancha qoldiq borligini tekshirishingiz mumkin.
* Agar tovar tugab borayotgan bo'lsa (masalan, 2-3 dona qolgan bo'lsa), rahbarga yangi kirim buyurtmasi qilishni eslating.
* Omborda yo'q (qoldig'i 0) tovarni kassada sotish mumkin emas (tizim salbiy qoldiqqa tushishni taqiqlaydi).

---

## 6. Kassa Smenasi, Kunlik Chiqimlar va Smenani Yopish

Har bir xodim kun oxirida o'z smenasini topshirishi va kassa jurnali (`/shifts`) bilan ishlashi shart.

### 6.1. Kunlik chiqimlarni (xarajatlarni) kiritish
Kun davomida do'kon kassasidan pul olinib sarflansa, uni o'sha zahoti qayd etish shart:
* **"Chiqim qo'shish"** tugmasini bosing;
* Summani kiriting (masalan: `35,000 so'm`);
* Sababini aniq yozing: *"Ichimlik suvi sotib olindi"* yoki *"Tozalash vositalari"*.

### 6.2. Qo'shimcha kassa tushumlarini qayd etish
Agar kassaga tovardan tashqari pul tushsa (masalan: Paynet xizmati, nusxa ko'chirish yoki xizmat haqi), **"Kirim qo'shish"** tugmasi orqali summani va sababini kiritib qo'ying.

### 6.3. Smenani yopish va Kassa tafovuti (Z-Hisobot)
Ish kuni yakunida:
1. Kassadagi barcha naqd pullarni dona-dona sanab chiqing.
2. `/shifts` sahifasida **"Smenani yopish"** tugmasini bosing.
3. Sanalgan aniq summani **"Haqiqiy naqd pul"** maydoniga kiriting.
4. **Tizim tahlili:**
   * Tizim kunlik kutilgan naqd pulni avtomatik hisoblaydi (`Kunlik savdo + Qo'shimcha kirim - Chiqimlar`).
   * Agar siz sanagan pul tizimdagi kutilgan pul bilan bir xil bo'lsa — smena benuqson yopiladi.
   * **Agar farq chiqsa (ortiqcha yoki kamomad):** Tizim sizdan: *"Kassada [X] so'm farq chiqdi. Sababini bilasizmi?"* deb so'raydi.
   * Agar sababini bilsangiz, tushuntirish yozing. Agar sababini bilmasangiz, bo'sh qoldirsangiz tizim *"Xodim farq sababini bilmaydi"* deb do'kon egasiga yuboradi.

---

## 7. Xodimning Oltin Qoidalari va Xavfsizlik

1. **Parol daxlsizligi:** Hech qachon shaxsiy login, parol yoki Telegramga kelgan tasdiqlash kodini boshqa xodimlarga aytmang.
2. **Kompyuterdan uzoqlashganda:** Kassa stolini tark etayotganingizda profilingizdan chiqish (Logout) qiling yoki ekranni qulflang.
3. **Kassa intizomi:** Har bir sotilgan tovar albatta tizimdan chek orqali o'tkazilishi shart. Tizimdan tashqari savdo qilish qat'iyan man etiladi.
4. **Xushmuomalalik:** Inventra tizimining tezkorligi sizga mijozlarga tabassum bilan, kutdirmasdan xizmat ko'rsatish imkonini beradi.
