# Platforma administratori: boshqaruv va yordam xizmati

Yangilangan: **2026-10-14**. Amaliy ekranlar **Admin: Amaliy Yo‘riqnoma**da.

## 1. Rol chegarasi

`platform_admin` do‘konlar, hisoblar, sotuvchi profillari, hujjatlar, audit va yordam murojaatlarini boshqaradi. Bu rol do‘kon kassiri o‘rnida savdo qilish huquqini anglatmaydi: tenantga tegishli operatsion API’larda alohida cheklovlar mavjud.

Administrator oddiy do‘kon xodimi sifatida ishga olinmaydi. Yangi administrator hisobi loyiha xizmat ko‘rsatish tartibi orqali yaratiladi; foydalanuvchini o‘zboshimchalik bilan admin roliga aylantirmang.

## 2. Do‘kon va sotuvchi profili

**Do‘konlar**da do‘kon yaratish, egasini almashtirish, faolligini boshqarish mumkin. Egasi uchun email taklif/parol havolasi ishlatiladi. Bitta egada bir nechta do‘kon bo‘lishi mumkin; ularni eski “filial” modeliga tenglashtirmang.

**Sotuvchi Tekshiruvi**da yuborilgan profilni tekshiring. Tasdiqlashda kelajakdagi amal qilish muddati, rad etishda sabab talab qilinadi. Profil tasdiqlanishi fiskal provayder tasdig‘ining o‘rnini bosmaydi. Hozir production chakana POS fiskal integratsiya sabab yopilgan.

Faollikni o‘zgartirish do‘konga kirish va amallarga ta’sir qiladi. Saqlanib qolgan tarixni o‘chirishga teng emas. Egasini almashtirishdan oldin hisob va yangi egani tekshiring.

## 3. Hisob xavfsizligi

Login, Telegram ulanishi va bir martalik kod talablariga administrator ham bo‘ysunadi. Kirishdagi xato urinishlar bosqichma-bosqich cheklanadi: 5 xatodan so‘ng 60 soniya; keyingi bosqichda 3 xatodan so‘ng 1 soat; keyin 1 xatodan so‘ng 1 kun. Uchta kunlik blok sikli muvaffaqiyatli kirishsiz takrorlansa hisob bloklanadi. Muvaffaqiyatli kirish hisoblagichlarni tozalaydi.

**Xodimlar**da ruxsat etilgan tahrir, blokdan chiqarish, bloklash, taklifni qayta yuborish va arxiv amallari hisob holatiga qarab beriladi. Egasi, a’zolik va hisob blokini alohida tekshiring. Keraksiz to‘liq bazaga kirish o‘rniga mavjud boshqaruv amallaridan foydalaning.

## 4. Operator sifatida ishlash

1. **Yordam: Murojaatlar** yoki `/support`ni oching.
2. **Operator kutilmoqda** holatidagi suhbatni tanlang. Til, mavzu va avvalgi xabarlarni o‘qing.
3. **Suhbatni qabul qilish**ni bosing. Bir suhbatni bir vaqtda bitta operator oladi.
4. Shu oynada javob yozing. Zarur bo‘lsa PNG/JPEG/WebP rasm qo‘shing; kiruvchi fayl 2 MB gacha.
5. Savol hal bo‘lgach murojaatni yoping. Foydalanuvchi uni qayta ochsa, u yana navbatga tushadi.

**Menga biriktirilgan** filtri o‘zingiz olgan suhbatlarni ajratadi. Boshqa operator olgan suhbat ko‘rinadi, ammo uning nomidan javob yozib yoki uni yopib bo‘lmaydi.

Mehmon chatlari ro‘yxatdan o‘tmagan tashrif buyuruvchilarga ham ochiq. Mehmon ismi hisob egasining tasdiqlangan shaxsi hisoblanmaydi; chat so‘rovining o‘zi parol yoki egani almashtirish uchun asos bo‘lmaydi. Foydalanuvchidan parol va OTP so‘ramang.

Telegram bildirishnomasi faqat yangi yordam xabari va admin panelidagi havolani yuboradi. Unda suhbat matni, rasm yoki mehmon kaliti bo‘lmaydi. Havolani ochish uchun admin hisobi bilan kirish zarur. Telegramdan javob berish bu versiyada yo‘q.

## 5. Hujjatlar, audit va xizmatlar

**Qo‘llanma & Hujjatlar**da matnni tahrirlash admin vakolati. Fayllar serverdagi Markdown hujjatlariga yoziladi. Matnni o‘zgartirishdan oldin amaldagi interfeysni tekshiring; hali yo‘q funksiyani mavjud deb yozmang.

Rasmli qo‘llanmalar uchun faqat demo ma’lumotli, kerakli qismga yaqinlashtirilgan tasvirlardan foydalaning. Strelka va raqamlar matndagi qadamga mos kelsin. To‘liq sahifa skrinshotini bitta kichik tugmani tushuntirish uchun qo‘ymang.

**Audit** muhim amallar tarixini beradi. Yordam chatining qabul qilish/yopish/qayta ochish voqealari suhbatning o‘zida saqlanadi.

Telegram xabari uchun backend, Celery worker, Redis va bot ulanishini tekshiring. Telegram xatosi chat xabarini yo‘qotmaydi. Kunlik hisobot va transfer muddatlari uchun Celery Beat ham kerak. O‘rnatish bo‘yicha loyiha README’sidan foydalaning.

## 6. Kontaktlar

Ommaviy telefon: **+998 77 021 21 49**. Telegram operator: **@abdulxadiy_0**. Login boti **@ilbi_bot** — operator akkauntidan alohida.

Ish vaqti va kafolatlangan javob muddati hozircha belgilanmagan. AI hali ulanmagan; chatdagi inson javoblarini AI javobi sifatida ko‘rsatmang.
