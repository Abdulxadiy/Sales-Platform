# ILBI — maxfiylik siyosati

Tahrir: **2026-10-14**. Ushbu matn platformaning hozirgi ma’lumot oqimlarini tushuntiradi. Ma’lumot operatorining rasmiy nomi, manzili, saqlash muddatlari va joylashtirish rekvizitlari yakuniy nashrda tasdiqlanishi kerak; bu hujjat ularning o‘rniga taxminiy ma’lumot bermaydi.

## 1. Qanday ma’lumot ishlatiladi?

- **Hisob:** telefon, username, email, ism va familiya; kiritilgan bo‘lsa profil rasmi, tug‘ilgan sana va aloqa telefoni.
- **Kirish:** parol xeshi, Telegram botga bog‘langan telefon va chat identifikatori, tokenlar, kirish urinishlari. OTP Redis’da 180 soniya amal qiladi.
- **Do‘kon:** sotuvchi profili, do‘kon va xodimlar, katalog, narxlar, qoldiq/partiyalar, savdo, qarz, kassa va tegishli tarix.
- **Yordam:** ism, tanlangan til, mavzu, xabarlar, yuborilgan rasmlar, suhbat holati, operator va o‘qilganlik ko‘rsatkichlari. Tizimga kirgan odamning murojaati uning hisobiga, tanlangan bo‘lsa do‘koniga bog‘lanadi.
- **Texnik yozuvlar:** sozlangan server jurnallari va audit orqali IP, brauzer hamda vaqt ma’lumotlari qayd etilishi mumkin.

## 2. Nima maqsadda?

Ma’lumot hisobga kirish, foydalanuvchi ruxsatlarini tekshirish, do‘kon operatsiyalarini yuritish, xatolarni tekshirish, hisobot yetkazish va yordam savoliga javob berish uchun ishlatiladi. Har bir do‘konning operatsion so‘rovlari uning a’zoligi va vakolatlari bilan tekshiriladi.

Yordam chatini boshlashda foydalanuvchi yozishmalar va rasmlar saqlanib, operatorlarga ko‘rinishi haqidagi alohida tanlovni belgilaydi. Umumiy sahifani ochishning o‘zi bu tanlov o‘rnini bosmaydi.

## 3. Yordam yozishmalariga kim kiradi?

Yozishmalar murojaat muallifi va `platform_admin` operatorlariga ochiq. Bir do‘kondagi boshqa xodimga avtomatik ochilmaydi.

Mehmon brauzerida tasodifiy maxfiy kalit saqlanadi, serverda uning xeshi yuritiladi. Kalit yo‘qolsa, shu suhbatga mehmon sifatida kirish ham yo‘qoladi. Kalitni boshqa odamga berish suhbatga kirishni berishi mumkin. Mehmon ismi shaxs tasdiqlovi hisoblanmaydi.

Rasmlar ochiq media katalogiga qo‘yilmaydi; suhbatga kirish tekshirilgandan so‘ng olinadi. Yuklangan PNG/JPEG/WebP fayllari hajm va o‘lcham bo‘yicha tekshiriladi, kichraytirilib JPEG’ga aylantiriladi. Qo‘llanma rasmlari bundan alohida: ular sun’iy demo ma’lumotlar bilan ommaviy ko‘rsatiladi.

## 4. Telegram va boshqa xizmatlar

Login kodi Telegram bot orqali yetkaziladi. Do‘kon hisobotlari sozlangan qabul qiluvchi va tarkibga bog‘liq; do‘kon egasi yuborishdan oldin tanlovlarini tekshirishi kerak.

**Yordam bildirishnomasi** faqat murojaat tili va operator paneliga havolani yuboradi. Ism, savol matni, ilova rasmi va mehmon kaliti Telegramga yuborilmaydi. Bildirishnoma oluvchi telefon raqami sozlamada bo‘lishi va amaldagi botga tasdiqlangan shaxsiy chat bilan ulangan bo‘lishi kerak.

Email va fayl saqlash xizmatlari server sozlamalariga qarab ishlatiladi. Qaysi provayder, hudud va huquqiy asos qo‘llanishi operatorning joylashtirish ma’lumotlarida aniqlashtiriladi. “Ma’lumot hech qachon tashqi xizmatga uzatilmaydi” degan va’da berilmaydi.

**AI hozir ulanmagan:** yordam xabarlarini AI modeliga yuborish oqimi bu versiyada yo‘q. Keyinchalik ulanadigan xizmat va uning ma’lumot siyosati alohida tushuntirilishi kerak.

## 5. Saqlash va himoya

Parollar ochiq matn sifatida saqlanmaydi. JWT imzolangan token; u ma’lumotni yashiradigan shifrlash emas. HTTPS, zaxira nusxalari, saqlash hududi va server xavfsizligi joylashtirish konfiguratsiyasiga bog‘liq.

Chatlar hozir bazada saqlanadi; avtomatik o‘chirish muddati bu versiyada sozlanmagan. Hisob va moliyaviy/audit yozuvlarini saqlash tartibi bilan yordam yozishmalarini saqlash tartibi alohida belgilanadi. Tasdiqlanmagan kun/yil muddatlari kafolat sifatida ko‘rsatilmaydi.

## 6. Brauzer xotirasi

Platforma tokenlar, tanlangan do‘kon, interfeys sozlamalari va ayrim ish qoralamalarini mahalliy yoki sessiya xotirasida saqlaydi. Yordam markazi til tanlovi va mehmon maxfiy kalitini mahalliy xotirada saqlaydi. Umumiy qurilmada ushbu xotira boshqa foydalanadigan shaxsga ham ta’sir qilishi mumkin.

## 7. So‘rov va aloqa

Ma’lumotga kirish, tuzatish, qayta ishlash yoki o‘chirish yuzasidan so‘rovni operatorga yuboring. Hisobga tegishli so‘rovda shaxs va vakolat tekshiriladi; chatdagi ismning o‘zi yetarli emas. Operatsion eksportlar tegishli rol va ruxsatlar bilan olinadi.

**Telefon:** +998 77 021 21 49. **Telegram operator:** @abdulxadiy_0. **Login boti:** @ilbi_bot. Ish vaqti hozircha e’lon qilinmagan.

## 8. Huquqiy manba va tahrir

Shaxsga doir ma’lumotlar bo‘yicha asosiy rasmiy manba: [“Shaxsga doir ma’lumotlar to‘g‘risida”gi O‘RQ-547](https://lex.uz/uz/docs/-4396419). Amaliy ishlov, provayder va operator majburiyatlarini amaldagi tahrir hamda haqiqiy joylashtirish bo‘yicha tekshirish kerak. Ushbu matn to‘liq muvofiqlik sertifikati emas.

Hujjat yangilanganda yangi tahrir shu yerda beriladi. Hozirgi umumiy rozilik yozuvi foydalanuvchi, vaqt va IP’ni saqlaydi; har bir o‘qilgan hujjatning nusxasi yoki xeshini alohida saqlamaydi.
