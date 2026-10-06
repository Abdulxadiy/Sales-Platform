# Inventra Platformasi — Maxfiylik va Shaxsiy Ma'lumotlarni Qayta Ishlash Siyosati

*(Privacy Policy)*

Oxirgi yangilangan sana: 2026-yil 1-oktyabr  
Kuchga kirish sanasi: 2026-yil 1-oktyabr

---

Ushbu Maxfiylik va shaxsiy ma'lumotlarni qayta ishlash siyosati (keyingi o'rinlarda — **"Siyosat"**) **"Inventra"** savdo-boshqaruv platformasi (keyingi o'rinlarda — **"Platforma"** yoki **"Biz"**) foydalanuvchilarining (keyingi o'rinlarda — **"Foydalanuvchi"** yoki **"Siz"**) shaxsga doir va tijorat ma'lumotlarini qanday to'planishi, ishlatilishi, saqlanishi va himoya qilinishini belgilaydi.

Mazkur Siyosat O'zbekiston Respublikasining 2019-yil 2-iyuldagi O'RQ-547-sonli **"Shaxsga doir ma'lumotlar to'g'risida"**gi Qonuni hamda tegishli xalqaro axborot xavfsizligi standartlariga to'liq mos holda ishlab chiqilgan.

---

## 1. Umumiy Qoidalar

1.1. Inventra tizimidan ro'yxatdan o'tish, tizimga kirish yoki xizmatlardan amalda foydalanish orqali Foydalanuvchi ushbu Siyosatda ko'rsatilgan shartlarga, jumladan shaxsiy ma'lumotlarini to'plash va qayta ishlashga o'zining to'liq va ixtiyoriy roziligini bildiradi.  
1.2. Agar Foydalanuvchi ushbu Siyosat shartlariga rozi bo'lmasa, u Platformadan foydalanishni darhol to'xtatishi lozim.  
1.3. Ushbu Siyosat faqat Inventra platformasiga taalluqli bo'lib, tashqi havola qilingan uchinchi tomon xizmatlariga tatbiq etilmaydi.

---

## 2. To'planadigan Ma'lumotlar Tarkibi

Inventra platformasi o'z xizmatlarini sifatli, xavfsiz va qonuniy taqdim etish uchun quyidagi toifadagi ma'lumotlarni to'playdi va qayta ishlaydi:

### 2.1. Foydalanuvchining Shaxsiy Ma'lumotlari:
* **Telefon raqami:** Tizimdagi asosiy noyob identifikator (`USERNAME_FIELD`) sifatida foydalaniladi;
* **Foydalanuvchi nomi (`username`):** Tizimga xavfsiz kirish uchun global unikal login;
* **Elektron pochta manzili (`email`):** Parollarni xavfsiz o'rnatish va tiklash (magic-link), tizim xabarnomalarini yuborish uchun;
* **F.I.Sh. (Ism va Familiya):** Tizim ichida va cheklarda xodimni to'g'ri ko'rsatish uchun;
* **Tug'ilgan sana va Profil surati:** Profilni to'liq shakllantirish uchun (ixtiyoriy).

### 2.2. Autentifikatsiya va Xavfsizlik Ma'lumotlari:
* **Telegram `chat_id`:** Telegram boti (`@inventraa_bot`) orqali ikki faktorli (2FA) bir martalik OTP kodlarini yetkazish va avtomatik bildirishnomalarni yuborish uchun;
* **IP-manzillar va Kirish jurnallari:** Xavfsizlik tahlili, ruxsatsiz urinishlarni to'xtatish (brute-force rate limiting) va audit nazorati uchun;
* **Parollar:** Hech qachon ochiq holda saqlanmaydi — faqat zamonaviy kriptografik xesh-funksiyalar orqali shifrlanadi.

### 2.3. Biznes va Do'kon Ma'lumotlari:
* Do'kon nomi, rekvizitlari, faoliyat turi;
* Tovar katalogi: tovar nomlari, shtrix-kodlar, rasmlar, o'lchov birliklari;
* Narxlar siyosati: chakana narxlar, tavsiya etilgan narxlar, 1-narx (ulgurji) va kirim tannarxlari;
* Ombor qoldiqlari va tovarlarning kirim-chiqim harakatlari;
* Savdo operatsiyalari: cheklar, to'lov turlari (naqd, karta, nasiya), bekor qilish (void) sabablari;
* Kontragentlar ro'yxati, ularning telefon raqamlari va UZS/USD qarz balanslari;
* Kassa smenalari: kutilgan naqd pul, haqiqiy kassa qoldig'i, kassa tafovutlari va kunlik chiqimlar/kirimlar.

---

## 3. Ma'lumotlarni Qayta Ishlash Maqsadlari

Biz to'plangan ma'lumotlardan faqat quyidagi qat'iy maqsadlarda foydalanamiz:
1. **Xizmatlarni ko'rsatish:** Savdo, ombor, hisob-kitob va analitika amallarining to'g'ri ishlashini ta'minlash;
2. **Xavfsiz autentifikatsiya (2FA):** Foydalanuvchining shaxsini tasdiqlash va akkauntni noqonuniy kirishlardan himoyalash;
3. **Avtomatlashtirilgan xabarnomalar:** B2B tovar o'tkazmalari, qarzdorlik chegarasidan oshishi (har 10 mln so'm / 1000 USD) va kunlik kassa Z-hisobotini Telegram orqali yuborish;
4. **Shartnoma majburiyatlarini bajarish:** Do'kon faolligini, tarif rejalarini va xizmat muddatlarini nazorat qilish;
5. **Nizolarni oldini olish va Audit:** Barcha operatsiyalarning o'zgarmas audit tarixini yuritish orqali xodimlar va korxona o'rtasidagi moliyaviy shaffoflikni kafolatlash;
6. **Texnik takomillashtirish:** Tizim xatolarini aniqlash va barqarorlikni oshirish.

---

## 4. Ma'lumotlarni Saqlash va Axborot Xavfsizligi Kafolatlari

Inventra axborot xavfsizligini ta'minlashda eng ilg'or xalqaro me'yorlarga tayanadi:

* **Tenant Izolatsiyasi (Dasturiy ajratish):** Har bir do'kon ma'lumotlari boshqa do'konlardan dasturiy va ma'lumotlar bazasi darajasida qat'iy ajratilgan. Bir do'kon egasi yoki xodimi hech qachon boshqa do'konning tovarlari, narxlari yoki mijozlari ma'lumotlarini ko'ra olmaydi.
* **Kriptografik Shifrlash:**
  * Tarmoq orqali uzatiladigan barcha ma'lumotlar zamonaviy HTTPS / TLS protokollari bilan shifrlanadi.
  * Tizimga kirish tokenlari (JWT) shifrlangan raqamli imzolar bilan himoyalangan.
  * Parollar mustahkam tuzlangan (salted) kriptografik xeshlar orqali saqlanadi.
* **Vaqtinchalik Ma'lumotlar:** Telegram OTP tasdiqlash kodlari faqat operativ xotirada (Redis) 120 soniyalik qisqa muddat (TTL) bilan saqlanadi va muddat o'tishi bilan butunlay yo'q qilinadi.
* **Obyekt Saqlash Xavfsizligi:** Mahsulot rasmlari MinIO S3 object storage tizimida shaxsiy kirish nazorati bilan saqlanadi.
* **Muntazam Zaxira Nusxalari (Backups):** Kutilmagan texnik avariyalarning oldini olish uchun ma'lumotlar bazasining zaxira nusxalari avtomatik ravishda muntazam olinadi.

---

## 5. Ma'lumotlarni Uchinchi Shaxslarga Bermaslik Kafolati

5.1. **Biz Foydalanuvchilarning shaxsiy yoki tijorat ma'lumotlarini hech qachon hech qanday uchinchi shaxslarga, reklama agentliklariga yoki tashqi kompaniyalarga sotmaymiz, ijaraga bermaymiz va bepul tarqatmaymiz.**  
5.2. Ma'lumotlar faqat quyidagi istisno hollarda uchinchi tomonlarga berilishi mumkin:
* **Foydalanuvchining to'g'ridan-to'g'ri roziligi bo'lganda** (masalan, foydalanuvchi tizimni o'zining banki yoki soliq servislari bilan integratsiya qilishni so'raganda);
* **Qonun talabi bilan:** O'zbekiston Respublikasi qonunlariga muvofiq, vakolatli sudlar yoki huquqni muhofaza qiluvchi organlarning qonuniy, asoslantirilgan rasmiy qarorlari va talabnomalari asosida.

---

## 6. Foydalanuvchining Huquqlari

O'zbekiston Respublikasining "Shaxsga doir ma'lumotlar to'g'risida"gi Qonuniga muvofiq, Siz quyidagi huquqlarga egasiz:
1. **Ma'lumotlar bilan tanishish:** O'z shaxsiy profilingizda (`/profile`) qanday ma'lumotlar saqlanayotganini to'liq ko'rish;
2. **Tahrirlash va yangilash:** O'zgarib qolgan ism, familiya, rasm yoki boshqa ma'lumotlarni erkin to'g'rilash;
3. **Eksport qilish:** O'z do'koningizga tegishli tovarlar, savdolar va mijozlar tarixini yuklab olish;
4. **Rozilikni bekor qilish va Akkauntni o'chirish:** Xizmatdan foydalanishni to'xtatish va shaxsiy hisobni arxivlashni talab qilish. Bunda qonunchilik talablariga muvofiq moliyaviy va soliq hisoboti uchun zarur bo'lgan audit yozuvlari belgilangan muddatda arxivda saqlanadi.

---

## 7. Cookie Fayllari va Mahalliy Xotira (Local Storage)

Platformaning to'g'ri ishlashi uchun brauzeringizning mahalliy xotirasidan (Local Storage) quyidagi minimal texnik maqsadda foydalaniladi:
* **Autentifikatsiya tokeni (`access_token` va `refresh_token`):** Har bir sahifa yangilanganda qayta login qilmaslik va sessiya xavfsizligini ta'minlash uchun;
* **Interfeys mavzusi (`theme`):** Qulaylik uchun qorong'i (Dark) yoki yorug' (Light) rejim tanlovini eslab qolish uchun.

---

## 8. Siyosatga O'zgartirishlar Kiritish Tartibi

8.1. Mazkur Maxfiylik Siyosati texnologiyalar rivojlanishi, yangi funksiyalar qo'shilishi yoki qonunchilik talablari o'zgarishi munosabati bilan vaqti-vaqti bilan yangilanishi mumkin.  
8.2. Siyosatning yangi tahriri ushbu sahifada e'lon qilingan paytdan boshlab darhol kuchga kiradi. Muhim o'zgarishlar haqida Foydalanuvchilarga tizim bildirishnomalari orqali xabar beriladi.  
8.3. Siyosat yangilangandan so'ng Platformadan foydalanishni davom ettirish yangi tahrirga to'liq rozilik deb hisoblanadi.

---

## 9. Aloqa va Savollar

Maxfiylik siyosati yoki shaxsiy ma'lumotlaringizning himoyasi yuzasidan har qanday savol, taklif yoki da'volar bo'yicha biz bilan bog'lanishingiz mumkin:

* **Mas'ul xizmat:** Inventra Axborot Xavfsizligi Bo'limi  
* **Elektron pochta:** `privacy@inventra.uz` / `support@inventra.uz`  
* **Telegram orqali aloqa:** `@inventraa_bot`  
* **Veb-sayt:** `https://inventra.uz`
