# ILBI night mode — ranglar auditi

Tekshiruv sanasi: 2026-10-15. Holat: **Bajarildi**.

Night mode tasdiqlangan light mode’ning teskari ko‘rinishiga moslandi: qora/grafit yuzalar va oqish asosiy aksent. ILBI logosi ko‘k; muvaffaqiyat, ogohlantirish, xato va grafik seriyalari ma’nosiga mos ranglarda.

## Palitra

| Qism | Light | Night |
|---|---|---|
| Asosiy fon | `#F0EFEB` | `#0B0909` |
| Sidebar | `#FFFFFF` | `#141212` |
| Kartalar | `#FFFFFF` | `#171515` |
| Modal | `#FFFFFF` | `#191717` |
| Asosiy aksent | `#0B0909` | `#F0EFEB` |
| Aksent ustidagi yozuv | `#F0EFEB` | `#0B0909` |
| Asosiy matn | `#0B0909` | `#F0EFEB` |
| Ikkilamchi matn | `#4A4646` | `#B8B2B2` |
| Yordamchi matn | `#605A5A` | `#A19A9A` |

Ranglarning yagona manbasi: [index.css](../frontend/ilbi/src/index.css). Shaffof fon, chegara va soyalar `--primary-rgb`, `--success-rgb`, `--warning-rgb`, `--danger-rgb`, `--info-rgb` orqali moslashadi. Rangli tugma matnlari `--on-success`, `--on-warning`, `--on-danger`, `--on-info` bilan juftlangan.

## Bajarilgan ishlar

- [x] **Bajarildi:** umumiy fonlar, sidebar, sarlavha, qidirish, kartalar, jadvallar, tablar va sahifalash yagona palitraga o‘tkazildi.
- [x] **Bajarildi:** asosiy aksent sifatida bevosita yozilgan amber ranglar mavzu tokenlariga almashtirildi.
- [x] **Bajarildi:** login, parolni o‘rnatish/tiklash, shartlarni qabul qilish, profil va xatolik ekranlari moslashtirildi.
- [x] **Bajarildi:** POS, checkout, katalog, import/kirim, ombor tablari, mijoz haqqi filtri va kassa kirim-chiqim tanlovlari moslashtirildi.
- [x] **Bajarildi:** kalendar, tanlash menyusi, xodim ruxsatlari va barcha turdagi tasdiqlash oynalaridagi tanlangan holatlar tekshirildi.
- [x] **Bajarildi:** support oynasi, xabarlar, javob iqtiboslari, ovozli xabar tugmalari, waveform va bildirishnomalar moslashtirildi.
- [x] **Bajarildi:** grafik ranglari night/light yuzalarga moslashtirildi; SVG gradient identifikatorlari rang qiymatidan ajratildi.
- [x] **Bajarildi:** loading va intro night rejimiga moslashtirildi; intro logotipining qora qismlari oqishga almashadi.
- [x] **Bajarildi:** brauzerning native input/select/date rang sxemasi va mavzuning qayta yuklanganda saqlanishi tekshirildi.
- [x] **Bajarildi:** mobil sarlavhadagi soat kesilishi tuzatildi; boshqaruv elementlari sig‘maganda keyingi qatorga o‘tadi.
- [x] **Bajarildi:** elektron chekning ekran boshqaruvlari mavzuga moslashtirildi; qog‘oz/PDF yuzalari oq, matnlari qora tuslarda chop etiladi.

## Haqiqiy brauzer tekshiruvi

Chrome Headless orqali haqiqiy React interfeysi ishlatildi. PostgreSQL/Redis alohida vaqtinchalik muhitda, akkauntlar va savdo ma’lumotlari sun’iy. Desktop: 1440 × 1100; mobile: 390 × 844. Ishchi frontendning `http://127.0.0.1:5174/login` sahifasi ham alohida brauzer profilida tekshirildi.

| Tekshiruv | Natija | Dalil |
|---|---|---|
| Asosiy sahifa, rol, modal va komponent holatlari | 112 holat; 0 kontrast topilmasi; 0 brauzer/API xatosi | [report.json](../branding/ilbi-motion-studio/qa/night-theme/report.json) |
| Hover/fokus, ombor ichki tablari, mijoz haqqi, kassa kirim/chiqim/yopish oynalari | 24 holat; 0 kontrast topilmasi | [interactions.json](../branding/ilbi-motion-studio/qa/night-theme/interactions.json) |
| Mobil ko‘rinishlar va sarlavha boshqaruvlari | 12 holat; 0 kesilgan boshqaruv; 0 gorizontal overflow | [mobile.json](../branding/ilbi-motion-studio/qa/night-theme/mobile.json) |
| Jami | **148 holat; 8924 matn/ikonka kontrasti o‘lchovi** | Uchala hisobot yig‘indisi |
| Elektron chekni night rejimidan chop etish | PDF matni va tasviri tekshirildi | [PDF](../branding/ilbi-motion-studio/qa/night-theme/public-receipt-night.pdf) |
| Ishchi mahalliy frontend | Night palitrasi va login kontrasti tasdiqlandi | [Skrinshot](../branding/ilbi-motion-studio/qa/night-theme/live-night-login.png) |

Ko‘rinadigan matnlar uchun 4.5:1, yirik matnlar va boshqaruv ikonkalari uchun 3:1 chegarasi ishlatildi. Shaffof fonlar qatlamma-qatlam hisoblandi. Gradientlar, logo, qog‘oz hujjatlar va skrinshotlarning umumiy ko‘rinishi tasviriy tekshirildi. Disabled elementlar alohida xira holat sifatida saqlanadi.

Tekshirilgan yo‘nalishlar: dashboard, POS, katalog, ombor/qoldiq, transfer, kamchilik, harakatlar, partiyalar, sotuvlar, nasiya, B2B, smenalar, do‘konlar, xodimlar, xizmatlar/sozlamalar, audit, profil, hujjatlar, support, sotuvchi profillarini tekshirish, login, parol va shartlarni qabul qilish.

## Qayta ishga tushirish

Frontend katalogidan, alohida sun’iy backend va sessiyalar fayli tayyor bo‘lganda, bir terminalda preview serverini oching:

```bash
VITE_API_TARGET=http://127.0.0.1:8017 npm run dev -- --host 127.0.0.1 --port 5177 --strictPort
```

Boshqa terminalda testlarni bajaring:

```bash
ILBI_THEME_AUTH_FILE=/tmp/ilbi-night-sessions.json npm run test:theme
ILBI_THEME_AUTH_FILE=/tmp/ilbi-night-sessions.json npm run test:theme-interactions
```

`ILBI_THEME_AUTH_FILE` ichida `_meta.synthetic=true`, `_meta.origin`, sinov `owner/admin/staff/terms` profillari va JWT’lari, `_meta.resetPath` va `_meta.receiptPath` bo‘lishi kerak. Origin test serveriga mos bo‘lishi shart. `npm run build:theme-preview` alohida statik QA buildini `/tmp/ilbi-night-dist` ichiga chiqaradi. Fixture HTML faqat maxsus test buildiga kiradi; oddiy production buildga qo‘shilmaydi.

- [x] `npm run build` — **Bajarildi**, muvaffaqiyatli.
- [x] `npm test` — **Bajarildi**, 7 ta test fayli o‘tdi.
- [x] `npm run lint` — **Bajarildi**, 0 xato; mavjud React/lint ogohlantirishlari saqlangan.

## Rasmlar

- [Night POS va savat](../branding/ilbi-motion-studio/qa/night-theme/checkout-cart-dark.png)
- [Mobil POS](../branding/ilbi-motion-studio/qa/night-theme/mobile-dark-pos.png)
- [Support oynasi](../branding/ilbi-motion-studio/qa/night-theme/support-widget-dark.png)
- [Night intro](../branding/ilbi-motion-studio/qa/night-theme/intro-dark.png)
- [Night loading](../branding/ilbi-motion-studio/qa/night-theme/loading-dark.png)
