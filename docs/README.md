# Inventra Hujjatlar va Qo'llanmalar Markazi (Documentation Portal)

Ushbu katalog **Inventra Sales Platform** dasturiy ta'minotining barcha ishtirokchilari uchun foydalanish qo'llanmalari, ma'muriy boshqaruv yo'riqnomalari hamda qonuniy yuridik hujjatlar to'plamini o'z ichiga oladi.

---

## 📁 Kataloglar va Fayllar Tuzilishi

```
docs/
├── README.md                              # Bosh yo'riqnoma va hujjatlar mundarijasi (Siz shu yerdasiz)
│
├── qollanmalar/                           # Rollar bo'yicha boshqaruv qo'llanmalari
│   ├── platform_admin_qollanma.md         # 1. Platforma Administratori (Superadmin) qo'llanmasi
│   ├── owner_qollanma.md                  # 2. Do'kon Egasi (Owner / Rahbar) qo'llanmasi
│   └── staff_qollanma.md                  # 3. Do'kon Xodimlari (Staff / Kassir / Sotuvchi) qo'llanmasi
│
└── hujjatlar/                             # Huquqiy va me'yoriy hujjatlar (Legal Docs)
    ├── ommaviy_oferta.md                  # Ommaviy Oferta shartnomasi (Public Offer Agreement)
    ├── maxfiylik_siyosati.md              # Maxfiylik va shaxsiy ma'lumotlar siyosati (Privacy Policy)
    └── foydalanish_qoidalari.md           # Xizmatdan foydalanish qoidalari va xavfsizlik talablari
```

---

## 👥 1. Rollar Bo'yicha Qo'llanmalar

Inventra tizimida 3 xil foydalanuvchi darajasi mavjud. Har bir foydalanuvchi o'z vazifasiga mos hujjat bilan tanishishi lozim:

| Foydalanuvchi Roli | Qo'llanma Hujjati | Qisqacha Tavsif |
| :--- | :--- | :--- |
| **Platform Administrator** (`platform_admin`) | [platform_admin_qollanma.md](qollanmalar/platform_admin_qollanma.md) | Butun tizim superadmini. Yangi do'konlar (tenants) ochish, egasini almashtirish, do'konlarni to'xtatish/yoqish, bloklanganlarni ochish (`unban`), 2FA, Celery fon xizmatlari va global audit nazorati. |
| **Do'kon Egasi** (`owner`) | [owner_qollanma.md](qollanmalar/owner_qollanma.md) | Savdo korxonasi egasi. Dashboard tahlili, 2 darajali tovar katalogi (UZS/USD), MinIO rasmlari, ombor kirim-chiqimi, POS 1-narx galochkasi, 7 kunlik Universal Void, Nasiyalar balansi va chegaraviy ogohlantirishlar, B2B do'konlararo transfer, Z-hisobot va xodimlarni ishga olish/bo'shatish. |
| **Xodimlar** (`staff`) | [staff_qollanma.md](qollanmalar/staff_qollanma.md) | Kassirlar, sotuvchilar, omborchilar. POS kassada skaner bilan ishlash, savat, naqd/karta/nasiya to'lovlari, chekni bekor qilish, kunlik kassa chiqimlarini yozish va kassa smenasini yopish (tafovut tahlili). |

---

## ⚖️ 2. Yuridik va Huquqiy Hujjatlar

Ushbu hujjatlar O'zbekiston Respublikasining Fuqarolik Kodeksi, "Elektron tijorat to'g'risida"gi va "Shaxsga doir ma'lumotlar to'g'risida"gi (O'RQ-547) qonunlari asosida tayyorlangan:

1. **[Ommaviy Oferta Shartnomasi](hujjatlar/ommaviy_oferta.md)**:
   * Do'kon egalari va platforma o'rtasidagi rasmiy litsenziya shartnomasi.
   * Xizmat ko'rsatish tartibi, obuna to'lovlari, ma'lumotlarning daxlsizligi (Tenant Izolatsiyasi kafolati), intellektual mulk va tomonlarning javobgarligi.
2. **[Maxfiylik Siyosati](hujjatlar/maxfiylik_siyosati.md)**:
   * Foydalanuvchilarning telefon raqamlari, ism-familiyalari, IP-manzillari, tovarlari va savdo ma'lumotlari qanday to'planishi, shifrlanishi va himoyalanishi.
   * Ma'lumotlarni hech qachon uchinchi shaxslarga sotmaslik va bermaslik kafolati.
3. **[Foydalanish Qoidalari va Xavfsizlik](hujjatlar/foydalanish_qoidalari.md)**:
   * Tizimda taqiqlangan harakatlar (kiberhujumlar, noqonuniy tovarlar, firibgarlik).
   * Parol gigiyenasi va 3-strike ban tizimi haqida tushuntirish.

---

## 💻 3. Saytda (Frontendda) Ommaviy Oferta Roziligini Joriy Qilish

Foydalanuvchilar ko'plab zamonaviy veb-sayt va dasturlarga kirganda *"Ommaviy oferta shartlariga roziman"* degan tasdiqni ko'rishadi. Bu yuridik jihatdan foydalanuvchi tizim shartlarini qabul qilganini isbotlovchi (aksept) asosiy omildir.

Inventra frontend ilovasida (ro'yxatdan o'tish, birinchi marta akkauntni sozlash `/setup-account` yoki login paytida) bu mexanizmni qanday ulash tavsiya etiladi:

### A. React / Tailwind komponent namunasi:
```jsx
import React, { useState } from 'react';

export default function TermsCheckbox({ onChange, checked }) {
  return (
    <div className="flex items-start gap-2.5 my-3 text-sm text-slate-600 dark:text-slate-300">
      <input
        type="checkbox"
        id="terms_agree"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
        required
      />
      <label htmlFor="terms_agree" className="cursor-pointer select-none">
        Men{' '}
        <a
          href="/legal/oferta"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-indigo-600 hover:text-indigo-500 underline"
        >
          Ommaviy Oferta
        </a>{' '}
        hamda{' '}
        <a
          href="/legal/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-indigo-600 hover:text-indigo-500 underline"
        >
          Maxfiylik Siyosati
        </a>{' '}
        shartlariga to'liq roziman.
      </label>
    </div>
  );
}
```

### B. Backendda tasdiqlashni saqlash (Audit uchun):
Foydalanuvchi ro'yxatdan o'tganda yoki profilini to'ldirganda (`complete_profile`):
* `terms_accepted_at: 2026-10-01T12:00:00Z`
* `terms_accepted_ip: 195.158.xxx.xxx`

Ushbu qayd kelgusida har qanday yuridik yoki da'vo jarayonida foydalanuvchi ofertani ixtiyoriy ravishda akseptlaganining qat'iy isboti bo'lib xizmat qiladi.
