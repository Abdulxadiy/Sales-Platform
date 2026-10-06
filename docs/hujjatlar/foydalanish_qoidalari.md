# Inventra Platformasi — Xizmatdan Foydalanish Qoidalari va Xavfsizlik Talablari

*(Acceptable Use Policy & Platform Rules)*

Oxirgi yangilangan sana: 2026-yil 1-oktyabr

---

Ushbu qoidalar to'plami **"Inventra"** savdo platformasining barcha foydalanuvchilari (Platforma Administratorlari, Do'kon Egalari, Xodimlar hamda tizimga tashrif buyuruvchilar) uchun qat'iy majburiy bo'lgan xulq-atvor, xavfsizlik va axloqiy talablarni belgilaydi.

Platformadan foydalanish mazkur qoidalarga so'zsiz rioya qilish majburiyatini yuklaydi.

---

## 1. Akkaunt Xavfsizligi va Parol Gigiyenasi

1.1. **Shaxsiy Mas'uliyat:** Har bir foydalanuvchi o'z login ma'lumotlari (`username`, `parol`) hamda Telegram boti orqali yuboriladigan bir martalik 2FA tasdiqlash kodlarining maxfiyligi va daxlsizligi uchun shaxsan javobgardir.  
1.2. **Parol talablari:** Parol kamida 8 ta belgidan iborat bo'lishi, katta va kichik harflar, raqamlar hamda maxsus belgilarni o'z ichiga olishi tavsiya etiladi. Oson taxmin qilinadigan parollardan (masalan, `12345678`, `admin123`) foydalanish taqiqlanadi.  
1.3. **Akkauntni topshirish taqiqi:** O'z profilingizni, parolingizni yoki sessiya tokeningizni boshqa shaxsga (hatto bir xonada ishlaydigan hamkasbingizga ham) berish qat'iyan man etiladi. Do'konning har bir xodimi o'zining shaxsiy telefoni va akkaunti orqali tizimga kirishi shart.  
1.4. **Sessiyani yakunlash (Logout):** Umumiy foydalanishdagi yoki do'kon kassasidagi kompyuterlardan uzoqlashganda har doim tizimdan chiqish (Logout) tugmasini bosing yoki qurilma ekranini qulflang.

---

## 2. Taqiqlangan Harakatlar (Acceptable Use Policy)

Platformaning normal ishlashini buzish, xavfsizligiga tahdid solish yoki boshqa foydalanuvchilarga zarar yetkazish qat'iyan man etiladi. Xususan:

### 2.1. Texnik va Kiberxavfsizlikka Oid Taqiqlar:
* Tizimga ruxsatsiz kirishga (xakerlik, ekspluatatsiya, zaifliklarni qidirish) urinish;
* Parollarni avtomatik tanlash (brute-force) yoki parollarni lug'at orqali taxmin qilish;
* Tizim infratuzilmasiga haddan tashqari yuklama beruvchi DoS/DDoS hujumlarini uyushtirish;
* Tizimdan avtomatlashtirilgan botlar, skriptlar, veb-skreping (scraping) yoki kraulerdan foydalangan holda ruxsatsiz ma'lumotlarni o'g'irlash;
* API interfeyslariga tasdiqlanmagan yoki soxtalashtirilgan so'rovlarni (masalan, boshqa tenantlarning ID raqamlarini almashtirib ko'rishga urinish) yuborish.

### 2.2. Biznes va Qonunchilikka Oid Taqiqlar:
* O'zbekiston Respublikasi qonunchiligida taqiqlangan yoki aylanmasi cheklangan tovarlar (giyohvandlik vositalari, psixotrop moddalar, noqonuniy qurol-yarog', portlovchi moddalar, qalbaki kontrafakt mahsulotlar) hisobini yuritish va sotish;
* Moliyaviy firibgarlik, qalbaki yoki soxta kassa cheklari orqali xaridorlarni yoki soliq organlarini chalg'itish;
* Tizimdagi xodimlarning savdo ko'rsatkichlarini noqonuniy soxtalashtirish;
* Boshqa korxonalarning tovar belgilari va intellektual mulk huquqlarini buzuvchi fotosuratlar va nomlardan ruxsatsiz foydalanish.

---

## 3. Avtomatik Himoya va Bloklash (Ban Qoidalari)

Inventra platformasi ilg'or avtomatlashtirilgan xavfsizlik filtrlari bilan jihozlangan:

1. **Kirish cheklovi (Rate Limiting):**
   * Qisqa vaqt ichida ketma-ket 5 marta noto'g'ri parol yoki OTP kiritilganda kirish 60 soniyaga muzlatiladi;
   * Xato urinishlar davom etsa, cheklov 1 soatga va keyin 24 soatga oshiriladi (strike);
   * 3 ta strike qayd etilganda — tizim foydalanuvchi akkauntini butunlay bloklaydi (`is_active = False`).
2. **Blokdan chiqarish (Unban):**
   * Bloklangan foydalanuvchi faqat shaxsi to'liq tekshirilgandan so'ng Platform Administratori tomonidan ochilishi mumkin (`POST /api/v1/auth/unban/`).

---

## 4. Audit Jurnali va Qilmishlar Isboti

4.1. Platformada amalga oshirilgan har bir muhim amal (savdo chekini urish, chekni bekor qilish, mahsulot tannarxi yoki narxini o'zgartirish, ombor qoldig'ini tuzatish, do'kon parametrlarini yangilash) o'zgarmas **Audit Jurnali**da qayd etiladi.  
4.2. Audit jurnalida amalni bajargan shaxs, uning IP-manzili, aniq vaqti va kiritilgan o'zgarishlar saqlanadi.  
4.3. Qonunbuzarlik, ichki o'g'irlik yoki firibgarlik holatlari aniqlanganda, Audit jurnali ma'lumotlari do'kon rahbariyati hamda tergov organlariga qonuniy dalil sifatida taqdim etiladi.

---

## 5. Qoidalarni Buzganlik Uchun Javobgarlik

Mazkur Foydalanish qoidalariga rioya qilmaslik quyidagi oqibatlarga olib kelishi mumkin:
* Foydalanuvchiga ogohlantirish berish;
* Foydalanuvchi akkauntini vaqtincha yoki butunlay bloklash;
* Qoidabuzar do'konning (tenantning) xizmatlarini bir tomonlama to'xtatish;
* Yetkazilgan moddiy zararni sud tartibida undirish;
* Qilmishda jinoiy alomatlar mavjud bo'lganda, ma'lumotlarni huquqni muhofaza qiluvchi organlarga topshirish.

---

## 6. Aloqa

Qoidalar yuzasidan savollar yoki aniqlangan zaifliklar (bug bounty) haqida xabar berish uchun:
* **Email:** `security@inventra.uz`
* **Telegram:** `@inventraa_bot`
