# ILBI Windows ilovasini sozlash

To‘liq rasmli qo‘llanma: **https://new-dev.site/desktop-guide**.

Ilovada **ILBI → Ilovani sozlash (rasmli qo‘llanma)** orqali oching. Matn va raqamlangan strelkali rasmlar paketga birga kiradi, internet talab qilinmaydi.

Qo‘llanma birinchi o‘rnatish, asosiy kompyuterni tanlash, offline parol, sinxronlash navbati, ustuvor operatsiya, qo‘shimcha kassa va yangilashni tushuntiradi. Odatdagi web savdo ekranlarini takrorlamaydi.

Yagona matn manbasi: [desktop-guide.uz.md](../../frontend/ilbi/src/content/desktop-guide.uz.md). Rasmlar shu manba yonidagi `desktop-guide/` katalogida. Ular haqiqiy ilova komponentlaridan faqat sun’iy namuna ma’lumotlari bilan olingan; `manifest.json` crop, strelka va hash ma’lumotlarini saqlaydi.

Rasmlarni qayta olish: `node scripts/capture_desktop_guide.mjs`. Belgini qayta yig‘ish: `node scripts/build_desktop_icon.mjs`. Chrome va frontend development dependency’lari kerak.
