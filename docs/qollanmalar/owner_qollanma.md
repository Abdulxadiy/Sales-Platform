# Do‘kon egasi: vakolatlar va ish qoidalari

Yangilangan: **2026-10-19**. Tugmalar va rasmli qadamlar uchun **Owner: Amaliy Yo‘riqnoma**ni oching. Bu hujjat kundalik qarorlar va cheklovlarni tushuntiradi.

## 1. Do‘kon va sotuvchi

- Bitta egada bir nechta mustaqil do‘kon bo‘lishi mumkin. Yuqoridagi do‘kon tanlagich katalog, qoldiq, savdo, qarz va xodimlar qaysi do‘konga tegishli ekanini belgilaydi.
- **Mening do‘konlarim**da o‘zingizga tegishli do‘konlar va sotuvchi profillarini boshqarasiz. Profilni yuborish va tasdiqlash — alohida amallar.
- Sotuvchi profili tasdiqlangan va muddati tugamagan bo‘lishi kerak. Do‘kon unga bog‘lanadi. Profilning rad etilish sababi yoki muddati shu bo‘limda ko‘rsatiladi.
- Bir sotuvchiga tegishli do‘konlar o‘rtasidagi ko‘chirish **Ombor → Transferlar** orqali bajariladi. Boshqa sotuvchiga savdo **B2B** hisoblanadi.

## 2. Katalog va ombor

Kategoriyalar ikki darajali: asosiy kategoriya va quyi kategoriya. Quyi kategoriya valyutani asosiy kategoriyadan oladi. Qoldiq yoki harakat tarixi mavjud bo‘lsa, kategoriya valyutasini almashtirish cheklanadi.

Mahsulot varianti uchun sotuv, minimal va hamkor narxlari yuritiladi. Tannarx ombor kirimidan olinadi; sotuv narxi tannarxning o‘rnini bosmaydi. USD katalogi mavjudligi USD’da chakana chek chiqarish mumkinligini anglatmaydi.

**Fayldan yuklash:** Excel/CSV, 1 000 qatorgacha, 8 MB gacha. Majburiy ustunlar: `mahsulot`, `kategoriya`, `sotuv_narxi`. Shtrix-kodni matn, sanani `YYYY-MM-DD` sifatida kiriting. Avval tekshiring, keyin tasdiqlang. Xato qator bo‘lsa import saqlanmaydi. Tekshiruv natijasi bir soat amal qiladi; mavjud variantlar ustiga yozilmaydi.

**Yorliq chop etish:** A4 yoki yorliq printeri; mahsulot nomi va narxini mustaqil yashirish mumkin. Printer masshtabi 100% bo‘lsin.

**Partiyalar:** kirimda partiya va yaroqlilik sanasi ixtiyoriy. Sarflashda muddati oldin tugaydigan partiyalar ustun; sanasizlari keyin keladi. Muddati o‘tgan partiya bo‘yicha ogohlantirishga e’tibor bering — u sotuvni avtomatik taqiqlamaydi. Chek bo‘yicha qaytarish asl partiyani tiklaydi.

## 3. POS va cheklar

Hozirgi chakana POS faqat **UZS** bilan ishlaydi. USD kalkulyatori hisoblash uchun; u valyuta to‘lovi yoki ikkinchi chek yaratmaydi.

**Sozlamalar → Valyuta & Kurs** bo‘limida **CBU kursidan avtomatik foydalanish**ni yoqib, saqlasangiz, shu do‘kon USD hisoblashlarida Markaziy bankning amal qilayotgan kursidan foydalanadi. Qo‘lda kurs kiritish bloklanadi. O‘chirib saqlasangiz, avval saqlagan ichki kursingiz qaytadi va uni tahrirlash mumkin bo‘ladi. Har bir do‘kon bu rejimni alohida tanlaydi.

USD, EUR va RUB rasmiy kurslari yonida amal qilish sanasi va oxirgi muvaffaqiyatli tekshiruv vaqti ko‘rsatiladi; EUR/RUB ma’lumot uchun. CBU bilan aloqa uzilsa, oxirgi olingan kurs qoladi. Hali USD kursi olinmagan bo‘lsa, avtomatik rejim yoqilmaydi. Kurs o‘zgarishi avvalgi operatsiyalarni qayta hisoblamaydi.

Sotuvchi tasdiqlanishi va ochiq smena talab etiladi. **Hozir production savdosi fiskal provayder integratsiyasi tayyor bo‘lmagani sabab server tomonidan yopilgan.** Rasmli qo‘llanmadagi savdolar alohida demo muhitiga tegishli. Ichki chekni fiskal chek sifatida taqdim etmang.

Naqd, karta va nasiya to‘lovlari farqlanadi. Nasiya uchun kontragent kerak. Hamkor narxi rejimida tovarlarning tegishli narxlari to‘ldirilgan bo‘lishi lozim.

**Qaytarish:** savdodan keyin 7 kun ichida, sabab bilan, to‘liq yoki qisman. Qaytarish ombor, qarz va qaytarilgan to‘lov hisobiga ta’sir qiladi. Savdoni yashirish yoki tarixni o‘chirish uchun ishlatilmaydi.

## 4. Qarz va kassa

- Qarzlar UZS va USD kesimida alohida yuritilishi mumkin. Musbat balans — mijozning qarzi; manfiy balans — mijozning oldindan to‘lovi.
- **Haqiqiy qarz to‘lovini egasi yoki `sales.record_debt_payment` ruxsatli xodim** kiritadi. Naqd/karta turi va pulni olgan do‘konni to‘g‘ri tanlang.
- **Qarz to‘lovini tuzatish** egaga tegishli vakolat; sabab yoziladi. Tuzatishni yangi haqiqiy pul tushumi deb kiritmang.
- Smena hisoboti boshlang‘ich qoldiq, naqd savdo, qo‘shimcha kirim, qarz tushumlari, chiqim va qaytarishlarni hisobga oladi. Sanalgan naqd summani kiritib, tafovutni tekshiring.
- Ombor, savdo va qarzlar eksporti joriy filtrlarga mos qatorlarni oladi; bir eksportda 20 000 qatorgacha. Xodimning tannarx vakolati eksportga ham tatbiq etiladi.

## 5. Xodimlar va xabarlar

**Xodimlar**da ishga olish, ma’lumot va ruxsatlarni tahrirlash, taklif havolasini emailga yuborish, bloklash, arxivlash va tiklash amallari mavjud. Tugmalar vakolat va hisob holatiga qarab ko‘rinadi.

Bloklash hisobga kirishni cheklaydi; ishdan bo‘shatish do‘kondagi a’zolikni yakunlaydi; arxivlash yozuvni joriy ro‘yxatdan chiqaradi. Tarix saqlanadi. Bir necha do‘konda a’zoligi bor hisobga umumiy o‘zgartirishlar cheklanishi mumkin. Egani almashtirishni administrator bajaradi.

**Xizmatlar & Sozlamalar**da Telegram hisobotlari manzili, hisobot vaqti va bildirishnoma tanlovlarini tekshiring. Telegramga xabar borishi bot ulanishi, tanlangan manzil va xizmatlar ishlashiga bog‘liq. Guruhga yuboradigan ma’lumotlar tarkibini tekshirib tanlang.

## 6. Tarix

Sidebar’dagi **Tarix** bo‘limi tanlangan do‘kondagi sotuvlar, tovar kirimi va ombor harakatlari, katalog o‘zgarishlari, qarz to‘lovlari, kassa kirim-chiqimlari, smena va audit amallarini bir joyda ko‘rsatadi. Eng yangi yozuv birinchi turadi; qidiruv, amal turi va sana bilan saralash mumkin. Har bir yozuvda bajargan shaxs va Toshkent vaqti ko‘rinadi.

Sotuv yozuvini bossangiz, cheklar bo‘limidagi kabi chek ochiladi: 58/80 mm, chop etish va A4 ko‘rinishi mavjud. Kirimda miqdor, tannarx va izoh; tahrirda esa oldingi va yangi qiymatlar ko‘rsatiladi. Tarixdan ma’lumotni o‘zgartirish yoki o‘chirish bajarilmaydi.

Mavjud sotuv va ombor yozuvlari ham ko‘rinadi. Katalog qo‘shish/tahrirlash/arxivlash/tiklash/o‘chirish qaydlari imkoniyat joriy etilgandan boshlab saqlanadi; oldin qayd etilmagan tahrirlar tiklanmaydi. Egasi faqat tanlangan do‘kon tarixini ko‘radi. Barcha do‘konlarni saralash platforma administratoriga tegishli; umumiy tarix oddiy xodimlarga ochilmaydi.

## 7. Yordam

**Yordam markazi**dagi murojaatlaringiz faqat sizga va platforma operatorlariga ko‘rinadi; bir do‘konda ishlaydigan boshqa xodimlarga avtomatik ochilmaydi. Suhbat do‘kon tanlangan holda ochilsa, operator shu kontekstni ko‘radi. Parol va OTP kodini yubormang.

Telefon: **+998 77 021 21 49**. Telegram: **@abdulxadiy_0**. Operator ish vaqti hozircha e’lon qilinmagan. AI yordamchi hali ulanmagan.
