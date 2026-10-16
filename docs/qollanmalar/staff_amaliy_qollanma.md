# Xodim: kundalik ishlar bo‘yicha rasmli yo‘riqnoma

Yangilangan: **2026-10-14**. Rasmlar hozirgi interfeysning kerakli qismlaridan, faqat demo ma’lumotlar bilan olingan. Katta ko‘rish uchun rasm ustiga bosing. Ayrim tugmalar egasi bergan ruxsatga bog‘liq.

## 1. Tizimga kirish

![Login maydonlari — foydalanuvchi nomi va parol](../rasmlar/focused/login_fields.png)

1. Username, telefon yoki emailingizni kiriting.
2. Shaxsiy parolingizni kiriting va davom eting. Telegram ulanishi so‘ralsa, ekrandagi bot havolasini ochib kontaktingizni ulashing, keyin kelgan OTP’ni kiriting.

Parol esdan chiqsa login oynasidagi tiklash amalidan foydalaning. Yordam markazi login qilmasdan ham ochiladi.

## 2. Tovarni sotish

1. POS qidiruviga nom yoki shtrix-kod yozing; skaner bilan ham qo‘shish mumkin.
2. Savatdagi variant, miqdor va narxni tekshiring. Hamkor narxi faqat tegishli holatda qo‘llanadi.

![POS — savatni tekshirgandan keyin to‘lovga o‘tish](../rasmlar/focused/pos_cart.png)

1. Savat tayyor bo‘lgach **To‘lovga O‘tish**ni bosing.

![To‘lov oynasi — usul va naqd summa](../rasmlar/focused/pos_payment.png)

1. Naqd, karta yoki nasiya turini tanlang. Nasiya uchun mijozni tanlang.
2. Naqd summani haqiqiy olingan pulga mos kiriting; qaytimni tekshiring va tasdiqlang.

Hozir chakana POS UZS bilan ishlaydi. Production savdosi fiskal integratsiya tayyor bo‘lguncha yopilgan; bu rasmlar demo muhitidan. USD kalkulyatori to‘lov amalga oshirmaydi.

## 3. Tovar qabul qilish

Ombor vakolati bo‘lsa **Ombor → + Tovar Kirimi**ni oching.

![Kirim — tovar qidirish va omborga tasdiqlash](../rasmlar/focused/inventory_intake.png)

1. Tovar nomi yoki shtrix-kod orqali topib Enter bosing. Miqdor va tannarxni kiriting; kerak bo‘lsa partiya va yaroqlilik sanasini belgilang.
2. Barcha qatorlarni faktura bilan tekshirib **Partiyani Tasdiqlash**ni bosing. Qoralama bilan tasdiqlangan kirimni aralashtirmang.

**Partiyalar va yaroqlilik** bo‘limidan muddatlarni tekshiring. Cheksiz qaytarish, chek bo‘yicha qaytarish, tuzatish va hisobdan chiqarish turli amallardir.

## 4. Qarz to‘lovini olish

Faqat egasi tegishli ruxsat bergan bo‘lsa **Qarzlar → Qarz To‘lash**ni ishlating.

![Qarz to‘lovi — haqiqiy summa va tasdiqlash](../rasmlar/focused/debt_payment.png)

1. Summani kiriting, naqd/karta va pul tushgan do‘konni tanlang.
2. Saqlang va to‘lov tarixini tekshiring. Xatoni tuzatish uchun egaga murojaat qiling.

## 5. Kun yakuni

![Smenani yopish — haqiqiy naqdni kiritish](../rasmlar/focused/shift_close.png)

1. Kassadagi pullarni sanang; olingan natijani kiriting. Farq bo‘lsa sababini yozing.
2. Smenani yoping va hisobotni tekshiring. Qayta yopishga urinmang; aloqa uzilsa avval holatini yangilang.

## 6. Operatorga yozish

**Yordam markazi → Yangi murojaat**. Mavzu, muammo kuzatilgan sahifa va qilgan amalingizni yozing. Rasm qo‘shishda faqat tushuntirilayotgan joyni ko‘rsating, maxfiy ma’lumotlarni olib tashlang.

Xabar va javob shu chatda saqlanadi. Telefon: **+998 77 021 21 49**; Telegram: **@abdulxadiy_0**. Parol va OTP’ni hech kimga yubormang.
