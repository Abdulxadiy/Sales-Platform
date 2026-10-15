# ILBI hujjatlari

Yangilangan: **2026-10-14**. Qo‘llanmalar hozirgi kod va interfeysga moslashtirilgan. Rasmli yo‘riqnomalar faqat sun’iy demo ma’lumotlarni ko‘rsatadi.

## Kerakli hujjatni tanlang

| Kim uchun | Qadamlar va rasmlar | Qoidalar va cheklovlar |
| --- | --- | --- |
| Do‘kon egasi | [Amaliy yo‘riqnoma](qollanmalar/owner_amaliy_qollanma.md) | [Vakolatlar](qollanmalar/owner_qollanma.md) |
| Xodim | [Amaliy yo‘riqnoma](qollanmalar/staff_amaliy_qollanma.md) | [Ish qoidalari](qollanmalar/staff_qollanma.md) |
| Administrator/operator | [Amaliy yo‘riqnoma](qollanmalar/platform_admin_amaliy_qollanma.md) | [Boshqaruv qoidalari](qollanmalar/platform_admin_qollanma.md) |
| Mehmon va yangi mijoz | [O‘zbekcha](qollanmalar/yordam_uz.md), [Русский](qollanmalar/yordam_ru.md), [English](qollanmalar/yordam_en.md) | [Foydalanish qoidalari](hujjatlar/foydalanish_qoidalari.md) |

[Ommaviy oferta](hujjatlar/ommaviy_oferta.md) va [maxfiylik siyosati](hujjatlar/maxfiylik_siyosati.md) alohida hujjatlardir. Tasdiqlanmagan rekvizit, SLA, saqlash muddati yoki fiskal imkoniyatni kafolat deb ko‘rsatmang.

## Platformadagi kirish

- `/docs`: akkaunt roliga mos hujjatlar; matnni administrator tahrirlaydi.
- `/support`: mehmonlar ham kira oladigan operator chatlari, kontaktlar va qo‘llanmalar. Ruxsatli hujjatlar serverda rol bo‘yicha tekshiriladi.
- Login oynasidan yordamga havola mavjud. Login boti **@ilbi_bot**, inson operatori **@abdulxadiy_0**. Telefon: **+998 77 021 21 49**.

## Rasmni yangilash tartibi

1. Faqat ajratilgan demo bazasidan foydalaning; haqiqiy foydalanuvchi ma’lumotlarini suratga olmang.
2. Bitta vazifa uchun tegishli tugma, maydon yoki jadval qismini oling. Butun sahifa rasmini qo‘ymang.
3. Raqam va strelka bilan ko‘rsating; matndagi qadamlar shu raqamlarga mos bo‘lsin. Tugma yozuvi yopilib qolmasin.
4. Yangi rasmlarni `rasmlar/focused/`ga, kelib chiqish va crop ma’lumotlarini `manifest.json`ga yozing.
5. Markdown ichida `../rasmlar/focused/nom.png` havolasini ishlating. Ilova uni `/api/v1/docs/images/nom.png`ga moslaydi; rasm bosilganda kattalashtirish ochiladi.
6. Telefon ekranida ham o‘qilishini tekshiring. Eski rasmlarni hujjatdan uzing; tarixiy fayllarni qayta ishlatishdan oldin interfeysga solishtiring.

## Muhandislik hujjatlari

[README](../README.md) — ishga tushirish; [testlar](../ilbi/README_TESTS.md) — tekshirish; [yordam moduli](SUPPORT.md) — chat API va operator sozlamalari.

Master Plan, arxitektura rejasi, audit va qonunchilik muhokamasi ish yuritish materiallaridir. Ulardagi reja yoki qarorni tayyor funksiya deb foydalanuvchi qo‘llanmasiga ko‘chirmang. Huquqiy masalalar bo‘yicha mavjud qarorlar [walkthrough](OZBEKISTON_QONUNI_WALKTHROUGH.md)da saqlanadi.
