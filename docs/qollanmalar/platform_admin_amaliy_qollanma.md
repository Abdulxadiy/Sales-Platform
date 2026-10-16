# Administrator: boshqaruv va operatorning rasmli yo‘riqnomasi

Yangilangan: **2026-10-14**. Rasmlar amaldagi interfeysdan, faqat sun’iy demo ma’lumotlar bilan olingan. Kattalashtirish uchun rasmni bosing.

## 1. Kirish

![Login — identifikator va parol](../rasmlar/focused/login_fields.png)

1. Shaxsiy username, telefon yoki emailni kiriting.
2. Parol va Telegramdan kelgan OTP’ni kiriting. Admin ham umumiy kirish himoyalariga bo‘ysunadi.

## 2. Do‘kon va sotuvchi

1. **Do‘konlar (Tenants)**dan do‘kon va egani yarating. Emailni tekshiring; taklif havolasi shu manzilga yuboriladi.
2. Mavjud do‘konning egasini almashtirish yoki faolligini o‘zgartirishdan oldin aynan to‘g‘ri do‘konni tanlaganingizni tekshiring.
3. **Sotuvchi Tekshiruvi**dan yuborilgan profillarni ko‘ring. Tasdiqlashda kelajakdagi muddatni, rad etishda aniq sababni kiriting.

Bitta egada bir nechta do‘kon bo‘lishi mumkin. Tasdiqlangan sotuvchi profili fiskal integratsiya o‘rnini bosmaydi. Production chakana POS hozir yopilgan.

## 3. Yordam navbatidan suhbatni olish

**Yordam: Murojaatlar**ni oching. Holat filtri bilan kutilayotgan murojaatlarni tanlang; **Menga biriktirilgan** orqali o‘zingiz olganlarini ko‘ring.

![Operator paneli — suhbatni qabul qilish](../rasmlar/focused/support_operator.png)

1. Mavzu, til va yozishmalarni o‘qib **Suhbatni qabul qilish**ni bosing. Boshqa operator avvalroq olgan bo‘lsa, tizim buni bildiradi.

![Operator javobi — yuborish va skrinshot biriktirish](../rasmlar/focused/support_reply.png)

1. Javobni yozib **Yuborish**ni bosing. Suhbat tili foydalanuvchi tanlovida ko‘rsatiladi.
2. Tushuntirish uchun rasm kerak bo‘lsa **Rasm qo‘shish**ni tanlang. PNG/JPEG/WebP, 2 MB gacha.
3. Masala tugagach **Murojaatni yopish**ni bosing. Qayta ochilgan suhbat yana kutilayotgan navbatga tushadi.

Telegramdagi havola faqat panelga olib keladi; javob shu yerda yoziladi. Operatorga keladigan bildirishnomada suhbat matni va rasmlar bo‘lmaydi. Chat foydalanuvchisidan parol yoki OTP so‘ramang.

## 4. Xodimni boshqarish

![Xodimlar paneli — qo‘shish va taklif havolasi](../rasmlar/focused/employees_actions.png)

1. **Xodim qo‘shish**ni tegishli do‘kon va vakolat doirasida ishlating.
2. Hisob emaili to‘g‘ri bo‘lsa taklif havolasini yuboring. Bloklash, arxivlash, tiklash va bo‘shatish turli amallar; tarixni saqlagan holda keraklisini tanlang.

Bloklangan hisobni ochishdan oldin shaxs va murojaatni tekshiring. Mehmon chatidagi ism tasdiqlangan hisob ma’lumoti emas.

## 5. Qo‘llanmani yangilash

1. **Qo‘llanma & Hujjatlar**dan kerakli rol qo‘llanmasini oching.
2. **Qo‘llanmani Tahrirlash**ni bosing; faqat amaldagi jarayonni yozing.
3. Matnni saqlang va oddiy o‘quvchi ko‘rinishida tekshiring. Rasmga bosilganda kattalashtirish ochilishini tekshiring.

Bitta rasm bitta vazifani tushuntirsin. Kichik tugma uchun butun ekran tasvirini ishlatmang. Raqam va strelkalar matndagi qadamga mos bo‘lsin. Rasmga haqiqiy mijoz, telefon, token yoki maxfiy hisobot tushmasin.
