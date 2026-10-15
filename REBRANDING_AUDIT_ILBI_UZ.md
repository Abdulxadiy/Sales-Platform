# ILBI.UZ rebrending auditi va o‘tish rejasi

> **Yangilangan:** 2026-10-15, Asia/Tashkent (UTC+05:00).
> **Holat:** kod, aktivlar, xabarlar va mahalliy muhitdagi ILBI rebrendingi **Bajarildi**. DNS/TLS va yangi email domenini provayderda tasdiqlash alohida deploy bandi sifatida ochiq qoldi.
> **Foydalanuvchi qarori:** mavjud ILBI logo va `ilbi.uz` nomi qo‘llanadi; mahsulot brendingida **PRO belgisi ishlatilmaydi**. Kod, xabarlar, aktivlar va hujjatlar quyidagi holat yozuvlari bilan yangilanadi.

**Joriy natija:** UI, loading, logo/favicon, chek/faktura, XLSX, 4 email turi va Telegram xabarlari ILBI / ilbi.uz nomiga o‘tdi. `PRO` mahsulot belgisi olib tashlandi. `@ilbi_bot`ning haqiqiy profili ham yangilandi. Backend `ilbi/`, frontend `frontend/ilbi/`da ishlaydi; eski sessiya/qoralamalar va mavjud DB/media resurslari saqlandi.

**Qayta bajarmaslik qoidasi:** **Bajarildi** yozilgan band qaytadan bajarilmaydi; keyingi ish faqat yangi dalil yoki ochiq deploy bandi uchun qilinadi. Quyidagi dastlabki topilmalar va qator raqamlari auditning tarixiy boshlang‘ich holatidir. Har bandning hozirgi natijasi uning holat ustunida va 19-bo‘limda berilgan.

**Boshlang‘ich inventar (o‘zgartirishlardan oldingi audit holati):**

| O‘lchov | Natija | Nimani anglatadi? |
| --- | ---: | --- |
| Qidiruvdan o‘tgan UTF-8 matn fayllari | 570 | Kod, konfiguratsiya, hujjat va yordamchi matnlar; faqat moslik topilgan fayllar emas |
| Eski nom uchragan fayllar | 108 | Registrga bog‘liq bo‘lmagan `inventra` yoki `sales[-_ ]platform` mosligi bor |
| Moslik bor satrlar | 1 122 | Bir satr bir marta hisoblanadi |
| Alohida matn mosliklari | 1 367 | Bir satrda bir nechta moslik bo‘lishi mumkin |
| Avvalgi 98 faylli ro‘yxatga kirmagan moslikli fayllar | 29 | To‘liq inventarda **Qo‘shimcha** deb belgilangan |
| Matn hisobiga kiritilmagan binar/UTF-8 bo‘lmagan fayllar | 127 | Ularning tasvir, video yoki arxiv ichidagi mazmuni matn qidiruvi bilan tasdiqlanmagan |

Bu tarixiy sonlar **qolgan ishlar soni yoki bajarilish foizi emas**: tarixiy qayd, yo‘l, test qiymati va foydalanuvchiga ko‘rinadigan nom turli vazifalardir. Fayl yo‘lining o‘zidagi `inventra/` qismi uning ichidagi moslikka qo‘shilmagan. Hisobni qayta olish tartibi [18-bo‘limda](#s18).

## Mundarija

1. [Audit chegarasi va dalil darajasi](#s1)
2. [Avvalgi auditdagi tuzatilgan xulosalar](#s2)
3. [Nomlash va domen bo‘yicha ishchi qarorlar](#s3)
4. [Bajarilgan va qisman bajarilgan ishlar](#s4)
5. [Ustuvor topilmalar va vazifalar](#s5)
6. [Logotip, UI, bosma hujjatlar va eksportlar](#s6)
7. [Brauzer xotirasi va moslik migratsiyasi](#s7)
8. [Docker, baza, fayl saqlash va ichki manzillar](#s8)
9. [Domen, email va Telegram o‘tishi](#s9)
10. [Backend identifikatorlari va API hujjatlari](#s10)
11. [Qo‘llanmalar, rasmiy matnlar va rasmlar](#s11)
12. [Papka, fayl va repo nomini o‘zgartirish](#s12)
13. [Bajarish ketma-ketligi](#s13)
14. [Tekshirish rejasi](#s14)
15. [Ortga qaytish rejasi](#s15)
16. [Yakunlash mezonlari](#s16)
17. [108 faylning yangilangan inventari](#s17)
18. [Qidiruvni takrorlash va ochiq qarorlar](#s18)
19. [Bajarilgan ishlar va yakuniy tekshiruv](#s19)

<a id="s1"></a>
## 1. Audit chegarasi va dalil darajasi

Audit `HEAD` commitigagina emas, saqlangan joriy fayllarga asoslangan. Git kuzatuvidagi o‘zgarishlar hamda ignore qilinmagan yangi fayllar hisobga olindi. `REBRANDING_AUDIT_ILBI_UZ.md` auditning o‘zini sanab yubormaslik uchun qidiruvdan chiqarildi.

`rg --files --hidden` odatdagi ignore qoidalari bilan ishlatildi. `.git`, `.agents`, `.codex`, `.aws`, `.commit-queue-local`, dependency/cache/build kataloglari, `media` va `staticfiles` chiqarildi. `.env.example` andozalari tekshirildi; haqiqiy `.env*` qiymatlari umumiy inventarga ko‘chirilmaydi. Aniq globlar 18-bo‘limdagi skriptda berilgan.

Mahalliy `.env`, `inventra/.env`, `inventra/.env.test`, `telegram_bot_sms/.env` fayllari uchun eski nomga bog‘liq **kalit nomlari** alohida tekshirildi; qiymatlar bu hujjatda berilmaydi. `.idea` va boshqa shaxsiy IDE holatlari deploy inventaridan ajratildi. Ularni qayta yaratish lokal texnik tozalash vazifasidir.

| Dalil turi | Ushbu auditdagi holat |
| --- | --- |
| Kod/konfiguratsiyadagi nom va bog‘liqlik | Fayl mazmuni bilan tekshirildi; quyida manba va satrlar keltirilgan |
| SVG va intro manbalari | Kod shaklida ko‘rildi; asosiy logotip va faviconning eski geometriyasi aniqlandi |
| PNG/JPG/MP4/ZIP mazmuni | Fayllar mavjudligi ro‘yxatlandi; barcha kadrlar va rasmlar vizual tekshirilgani da’vo qilinmaydi |
| Oldingi QA hisobotlari | Mavjudligi qayd etildi; bu tahrirda testlar qayta bajarilganining dalili emas |
| DNS, TLS, SMTP, pochta qutilari, BotFather, GitHub sozlamalari | Tashqi muhit tekshirilmagan; release oldidan tasdiqlanadi |
| Baza/volume/bucket ichidagi haqiqiy ma’lumotlar | Migratsiya yoki jonli tekshiruv bajarilmadi |

<a id="s2"></a>
## 2. Avvalgi auditdagi tuzatilgan xulosalar

| Avvalgi holat | Tekshirilgan tuzatish |
| --- | --- |
| “Audit 100% yakunlandi”, 98 fayl / 791 o‘rin | Qamrov va hisoblash birligi yozilmagan edi. Endi 570 fayl, 108 moslikli fayl, 1 122 satr va 1 367 moslik alohida ko‘rsatiladi |
| `InventraIntroAnimation.jsx` hali almashtirilishi kerak | Fayl hozir yo‘q. `IlbiIntroAnimation.jsx`, uning CSS va `ilbi/` yordamchi modullari mavjud; `Login.jsx` ulardan foydalanadi |
| Login parolni Base64 qilib yozmoqda | Joriy `Login.jsx:37,77,110` eski `inventra_remember_password` kalitini **o‘chiradi**. Eski saqlash amali hozirgi kod sifatida qayta keltirilmadi |
| Mahalliy `.env`dagi demo paroli auditga ochiq yozilgan | Maxfiy qiymat ushbu tahrirdan chiqarildi. Faqat `INVENTRA_DEMO_PASSWORD` kalit nomi qoldirildi; nusxa ulashilgan bo‘lsa, tegishli credentialni yangilash masalasi tekshiriladi |
| Eski yuridik matnlardagi `privacy@inventra.uz`, `admin@inventra.uz` va boshqa manzillar amalda bor | 2026-10-14 tahriridagi uchta matnda bu manzillar yo‘q. Joriy aloqa: telefon, Telegram operator va `@ilbi_bot` |
| Infra faqat `docker-compose.yml` va `nginx/nginx.conf` bilan cheklangan | `docker-compose.prod.yml` va `frontend/inventra/nginx.prod.conf` ham mavjud. Production kirish nuqtasi frontend Nginx servisidir |
| Eksport, yordam chati, avtomatlashtirish yo‘qligi | XLSX nomlari, `inventra_support_guest`, cache prefiksi, schema klasslari, commit queue va systemd backup nomlari qo‘shildi |
| Eski qo‘llanmalarning har birida Inventra matnlari bor | Oltita owner/admin/staff qo‘llanmasida qidiruv namunasi bo‘yicha eski nom qolmagan. Rasmlari alohida ko‘rilishi kerak |
| Faqat 12-oktabrdagi 6 logo varianti bor | `branding/logos/`da 12 ta PNG, jumladan 15-oktabrdagi 6 variant ham bor; intro va motion studio manbalari qo‘shildi |
| Domen sotib olingani, barcha yangi pochta qutilari ishlashi va repo uchun eski mutlaq yo‘l | Bular koddan tasdiqlanmaydi. Domen/pochta rejasi taklif sifatida berildi, lokal ko‘chirish nisbiy yo‘llar bilan yozildi |

<a id="s3"></a>
## 3. Nomlash va domen bo‘yicha ishchi qarorlar

Nomlash bo‘yicha ILBI / ilbi.uz va mavjud intro geometriyasi foydalanuvchi topshirig‘i asosida qo‘llandi — **Bajarildi**. Quyidagi jadvaldagi public domen va senderga tegishli deploy tasdiqlari 19.4-bo‘limda alohida ochiq.

| Joy | Tavsiya | Izoh |
| --- | --- | --- |
| UI va oddiy matn | `ILBI` | Masalan, `ILBI — Savdo va boshqaruv tizimi` |
| Wordmark va rasmiy sayt yozuvi | `ilbi.uz` | Yangi introdagi yozuvga mos |
| Texnik prefiks / distributiv | `ilbi`, `ilbi_`, `ilbi-` | Foydalaniladigan tizimga qarab separator saqlanadi; domen ko‘rinishi universal texnik nom emas |
| Asosiy public origin | `https://ilbi.uz` | Yo‘l xaritasidagi bitta domen yondashuviga mos taklif; DNS/TLS tasdiqlanmagan |
| `www.ilbi.uz` | Tanlangan asosiy originga yo‘naltirish | Alohida mustaqil sessiya muhiti qilib qo‘ymaslik |
| `app.ilbi.uz` | Faqat arxitektura qarori bilan | Avvalgi auditdagi muqobil variant; mavjud deb taxmin qilinmaydi |
| Login boti | `@ilbi_bot` | Koddagi mavjud havolalar; bot profilining tashqi holati tekshirilmagan |
| Support operatori | Amaldagi tasdiqlangan aloqa | Operator username/telefonini brend nomiga qarab o‘zboshimcha almashtirmaslik |
| Yuridik ijrochi / huquq egasi | Tasdiqlangan haqiqiy rekvizit | `ILBI` mahsulot nomini avtomatik ravishda shaxs/tashkilot nomi deb yozmaslik |

Public brendingni chiqarish uchun DB, bucket, repo yoki barcha lokal kataloglarni birdan qayta nomlash shart emas. Saqlanadigan eski texnik nomlar sababi bilan istisnolar ro‘yxatida yuritiladi.

<a id="s4"></a>
## 4. Bajarilgan va qisman bajarilgan ishlar

| Qism | Holat | Dalil / natija |
| --- | --- | --- |
| Intro va statik logo | **Bajarildi** | Bir xil `ilbi/logo.js` geometriyasi, `IlbiLogo.jsx`; gorizontal/vertikal/icon-only/monochrome va noyob SVG ID’lari |
| Login va loading | **Bajarildi** | PRO yo‘q; light/dark, mobil va reduced-motion browserda tekshirildi |
| Email | **Bajarildi** | 4 turdagi subject, HTML/plain text, CID PNG logo; test outbox bilan tekshirildi |
| Telegram | **Bajarildi** | OTP, `/start`, `/help`, `/status`, support/test matnlari; haqiqiy `@ilbi_bot` profili va UZ/RU/EN menyulari yangilandi |
| Bot identity va admin yaratish | **Bajarildi** | Yangi admin kontaktida `bot_id` yoziladi; konfiguratsiyasiz user yaratilmaydi; test o‘tdi |
| Brauzer xotirasi | **Bajarildi** | Eski/yangi namespace mosligi, partial-quota rollback, logout marker, guest va checkout kalitlari uchun testlar |
| Hujjat va rasmlar | **Bajarildi** | Nomlar yangilandi; 16 focused PNG qayta olindi; foydalanilmaydigan 32 eski screenshot nusxasi olib tashlandi |
| Lokal servislar | **Bajarildi** | Native Vite 5173, Docker frontend 5174; backend `ilbi`; avvalgi DB/volume/network mapping saqlandi |
| Backup taymeri | **Bajarildi** | `ilbi-source-backup.timer`, 15 daqiqalik tartib; eski unitlar zaxiralandi va faol eski timer qoldirilmadi |
| Public domen va sender domeni | **Tashqi deploy bandi** | Kod/andozalar tayyor; `ilbi.uz` DNS/TLS va `noreply@ilbi.uz` provayder tasdig‘i bu lokal relizda bajarilmadi |

<a id="s5"></a>
## 5. Ustuvor topilmalar va vazifalar

**P0** — o‘tishda ma’lumot yoki kirish uzilishiga olib keladigan masala; **P1** — brend relizi uchun asosiy ish; **P2** — keyingi texnik/ichki tozalash. `Ochiq` kelajak vazifasini bildiradi; ushbu audit uni bajarilgan deb belgilamaydi.

| ID | Daraja | Topilma va aniq vazifa | Holat |
| --- | --- | --- | --- |
| R-01 | P0 | Auditga ko‘chirilgan maxfiy demo qiymatini chiqarish; ulashilgan nusxalar/credential holatini tekshirish | **Bajarildi** — hujjatdagi maxfiy qiymat chiqarilgan; bu relizda secretlar nashr qilinmadi, lokal zaxiralar yopiq saqlandi |
| R-02 | P1 | `InventraLogo.jsx:204`, `AppLoadingScreen.jsx:76`, favicon: yangi intro bilan eski asosiy logo aralashgan. Bitta tasdiqlangan statik ILBI komponentini joriy qilish | **Bajarildi** — `IlbiLogo.jsx`, SVG/PNG/favicon, badge’siz loading; light/dark/mobil browser tekshiruvi o‘tdi |
| R-03 | P1 | `index.html:7,11`, layout/sidebar, AcceptTerms, Documentation, SetupAccount va savdo ekranlaridagi ko‘rinadigan nomlarni yangilash | **Bajarildi** — UI/title/dialog/placeholder/print nomlari ILBIga o‘tdi; mahsulot PRO belgisi olib tashlandi |
| R-04 | P1 | `password_reset_service.py`dagi 4 turdagi xat: subject, HTML/text, header/footer va yuboruvchi nomini yangilash | **Bajarildi** — 4 email turi ILBI matni va CID bilan biriktirilgan PNG logo bilan testdan o‘tdi; mavjud SMTP credential saqlandi |
| R-05 | P1 | Bot `/start`, `/help`, `/status`, fallback, OTP va support/test bildirishnomalarini ILBIga moslash | **Bajarildi** — barcha xabar matnlari va haqiqiy `@ilbi_bot` nomi, avatari, UZ/RU/EN tavsif/buyruqlari; qayta o‘qib tasdiqlandi |
| R-06 | P0 | Token, tenant, qoralama, checkout va mehmon chat kalitlari uchun bir xil, oldindan ishlaydigan moslik migratsiyasi kerak | **Bajarildi** — `brandStorage.js`; eski/yangi storage mosligi, parolni o‘chirish, logout, checkout va guest kalitlari uchun testlar o‘tdi |
| R-07 | P0 | Origin o‘zgarsa eski brauzer xotirasiga yangi domen kira olmaydi; qayta login va qoralama/chat uzluksizligi bo‘yicha alohida reja kerak | **Bajarildi (lokal)** — avvalgi 5173 origin saqlandi; namespace o‘tishi tekshirildi. Kelajak public domen o‘tishi R-11da ochiq |
| R-08 | P1 | Import shabloni, inventory/debt/sales XLSX yuklamalari va workbookning standart sarlavhasida Inventra qolgan | **Bajarildi** — frontend/backend XLSX nomlari va workbook sarlavhasi ILBI |
| R-09 | P0 | Compose loyiha nomi, volume, PostgreSQL va MinIO nomlarini ko‘r-ko‘rona almashtirish mavjud ma’lumotni uzib qo‘yishi mumkin | **Bajarildi** — DB/media zaxirasi olindi, eski resurslar aniq mapping bilan qayta ulandi; oldin/keyingi hisob va yig‘indilar mos |
| R-10 | P0 | Servis nomi o‘zgarsa Nginx upstream, bot endpoint, `depends_on`, host ro‘yxati va media URL normalizatorlarini birga yangilash | **Bajarildi** — yangi `ilbi` servis/upstream/endpoint, legacy DNS alias va media normalizatsiyasi; ikkala frontend orqali API ishlaydi |
| R-11 | P1 | Canonical origin, eski QR/email yo‘llari, DNS/TLS va haqiqiy sender domenini tanlash/tekshirish | **Qisman bajarildi — tashqi deploy ochiq**: canonical/fallback/host/metadata/sender andozalari tayyor; DNS/TLS va yangi sender domeni tasdiqlanmagan |
| R-12 | P1 | `api/schema.py` klasslari, `DEFAULT_SCHEMA_CLASS` import yo‘li va OpenAPI title/description birga o‘zgartiriladi | **Bajarildi** — schema klass/import/title/version yangilandi; support API tavsiflari to‘ldirildi; OpenAPI validate xato/ogohlantirishsiz o‘tdi |
| R-13 | P2 | Python distributiv nomi, metadata lookup, `uv.lock`, Celery/Gunicorn, demo guruhi va support cache prefiksini nazoratli almashtirish | **Bajarildi** — distributiv/lock/metadata, Celery/Gunicorn, demo env/guruhi va migratsiya; lokal cache namespace moslik uchun saqlandi |
| R-14 | P1/P2 | CI, publish queue, 318 satrli queue-plan yo‘llari, plan_scope, backup timer va screenshot skriptlarini rename rejasiga kiritish | **Bajarildi** — CI/cwd/path, queue rename-deletion juftlari, safe source policy va 13 automation testi; o‘rnatilgan ILBI backup taymeri ishlaydi |
| R-15 | P1 | Rasmiy matnlar, yordamning UZ/RU/EN sarlavhalari, README va `LICENSE`dagi nom; haqiqiy rekvizit/huquq egasini saqlash | **Bajarildi (matn)** — README, huquqiy/yordam UZ/RU/EN nomlari va LICENSE yangilandi; yuridik mazmun almashtirilmadi |
| R-16 | P1 | Qo‘llanma rasmlari, screenshot nusxalari, print/PDF ko‘rinishlari va bot profil rasmlarini vizual tekshirish | **Bajarildi** — 16 yangi guide, loading/login light/dark/mobil va chek/PDF ko‘rinishi; 32 ishlatilmaydigan eski nusxa olib tashlandi; bot avatari yangilandi |
| R-17 | P2 | Eski hujjat nomlari, tarixiy qaydlar, `.idea` va lokal kataloglar uchun asosli istisno/tozalash rejasini belgilash | **Bajarildi** — backend/frontend/master-plan/roadmap/IDE nomlari yangilandi; root/GitHub va persisted resurs istisnolari 19-bo‘limda qayd etildi |
| R-18 | P2 | Public sahifalar uchun OG preview va touch icon kerakligini belgilash; PWA/SEO fayllarini faqat tegishli talab bo‘lsa qo‘shish | **Bajarildi** — OG/site-name, touch icon va robots/noindex; operatsion ilova uchun PWA/sitemap qo‘shilmadi |
| R-19 | P0 | `createsuperuser.py:60` yangi Telegram kontaktida faqat `chat_id`ni yozadi; `bot_id` bo‘sh qolishi va login kontakti topilmasligi mumkin. Provisioning va qayta contact ulashish oqimini tekshirish | **Bajarildi** — yangi admin kontakti `bot_id` bilan saqlanadi; sozlanmagan botda user yaratilmaydi; testlar o‘tdi |

<a id="s6"></a>
## 6. Logotip, UI, bosma hujjatlar va eksportlar

### 6.1. Yagona logo manbasi

`InventraLogo.jsx` hozirgi oltin rangli shelving/`I` belgisini ham, `INVENTRA` wordmarkini ham chizadi. Faqat komponent/fayl nomini o‘zgartirish rebrendingni tugatmaydi. `favicon.svg`da eski nom matni yo‘q, lekin eski belgi geometriyasi saqlangan — bu oddiy matn qidiruvi topmaydigan joy.

`frontend/inventra/src/components/common/ilbi/logo.js` yangi animatsiya geometriyasini saqlaydi, ammo undagi izoh bu PNG asosida qo‘lda tiklangan vektor ekanini bildiradi. Uni tasdiqlangan rasmiy master deb e’lon qilishdan oldin qaysi variant yakuniy ekanini belgilash kerak.

| Aktiv / joy | Joriy holat | Qolgan ish |
| --- | --- | --- |
| `InventraLogo.jsx` va uning barcha importlari | Eski belgi/wordmark | `IlbiLogo.jsx` orqali yangi statik belgi; gorizontal, vertikal, icon-only, badge holatlarini saqlash |
| `AppLoadingScreen.jsx` | Eski komponent va alohida `INVENTRA` matni | Login/session/lazy loading holatlarini ham yangi brendda ko‘rsatish |
| `public/favicon.svg` | Eski SVG belgisi | Tasdiqlangan ILBI belgisi va brauzer cache yangilanishini tekshirish |
| `IlbiIntroAnimation.jsx`, `.css`, `ilbi/` | Yangi intro | Yakuniy statik logoga mosligi, light/dark, mobile va reduced-motionni tekshirish |
| `branding/logos/` | 12 ta PNG variant | Yakuniy variantni tanlash; master, kichik ikonka va monochrome manbasini aniq nomlash |
| `branding/animation_in_pic/` | 4 ta PNG reference | Introga bog‘liqligini qayd etish; manba reference sifatida saqlash |
| `branding/animation_5_concepts/`, `branding/ilbi-motion-studio/` | Namuna, source va eksportlar | Qaysi biri ilovaga ulanayotganini READMEda yozish; `dist` nusxalarini source’dan qayta generatsiya qilish |
| `branding/animation_prompts/` | Markdown, reference va ZIP | Versiya/manba maqsadini saqlash; arxiv ichidagi mazmun alohida tekshiriladi |
| Email header/footer va bot profil aktivlari | Emailda eski; bot profili tashqarida | HTML va plain-textni yangilash; BotFather profil rasm/tavsifini alohida tekshirish |

Ko‘p joyda bir vaqtda chiziladigan SVG uchun gradient/maska ID’lari to‘qnashmasligi, logoning accessible nomi, kichik o‘lchamdagi o‘qilishi va oq-qora printerdagi ko‘rinishi tekshiriladi. Rang palitrasini butun dizayn tizimi bo‘ylab almashtirish alohida qaror; mavjud intro rangi qolgan UI avtomatik tasdiqlanganini bildirmaydi.

### 6.2. UI va print tekshirish nuqtalari

`Layout`, `Sidebar`, `NotificationCard`, `Login`, `AcceptTerms`, `Documentation`, `SetupAccount`, `PublicReceiptView`, `Services`, `Dashboard`, `Tenants` va loading ekranlari qamrab olinadi. Placeholder, logout dialogi, yordam matni, sahifa sarlavhasi va standart do‘kon nomi ham tekshiriladi. Haqiqiy tenant/sotuvchi nomlari mahsulot brendi sifatida almashtirilmaydi.

`ReceiptSlip`, `ShiftReportSlip`, `ZReportModernView`, `InvoiceA4Modal` uchun title, footer, fallback nom, logo, QR va chop etish iframe identifikatorlari alohida tekshiriladi. `ReceiptSlip.jsx:301`dagi standart seed, iframe ID va CSS klasslari ko‘rinadigan matndan ajratib baholanadi. Termal chek 58/80 mm va A4/PDF ko‘rinishida tekshiriladi; sotuvchi ma’lumotlari va fiskal holat haqidagi mavjud mazmun saqlanadi.

### 6.3. Yuklab olinadigan fayllar

| Manba | Eski ko‘rinish | Taklif |
| --- | --- | --- |
| `CatalogImportModal.jsx:117` | `inventra-import-shablon.xlsx` | `ilbi-import-shablon.xlsx` |
| `Inventory.jsx:576` | `inventra-ombor.xlsx` | `ilbi-ombor.xlsx` |
| `Debts.jsx:502` | `inventra-qarzlar.xlsx` | `ilbi-qarzlar.xlsx` |
| `Sales.jsx:394` | `inventra-savdolar.xlsx` | `ilbi-savdolar.xlsx` |
| `api/v1/catalog/views/import_views.py:36` | `inventra-import-template.xlsx` | `ilbi-import-template.xlsx` |
| `api/v1/exports.py:65,79,120` | `inventra-stock/debts/sales.xlsx` | Mos `ilbi-…` nomlari |
| `apps/core/spreadsheets.py:25` | Workbook uchun standart `Inventra` | `ILBI` |

Frontendning download nomi backend `Content-Disposition` nomidan alohida bo‘lishi mumkin; ikkala qatlam ham tekshiriladi. Fayl nomini yangilash jadval ustunlari, formulalar yoki import formatini o‘zgartirishni talab qilmaydi.

### 6.4. Sahifa va sessiya yuklanish ekrani

Foydalanuvchi yuborgan rasmdagi markaziy karta — `AppLoadingScreen.jsx`. U yangi ILBI intro animatsiyasidan keyingi yuklanishlarda ham chiqishi mumkin. Ushbu ekran **R-02** vazifasiga kiradi; uning elementlari alohida tekshiriladi:

| Element | Aniq manba | Rebrending vazifasi |
| --- | --- | --- |
| Aylana ichidagi eski oltin logo | `AppLoadingScreen.jsx:2,68` | `InventraLogo` importi va belgini tasdiqlangan ILBI logotipiga almashtirish |
| Katta `INVENTRA` yozuvi | `AppLoadingScreen.jsx:76` | Alohida yozilgan matnni ham `ILBI` yoki tanlangan `ilbi.uz` wordmarkiga moslash; faqat logo komponentini almashtirish yetmaydi |
| Oltin `PRO` belgisi | Boshlang‘ich `AppLoadingScreen.jsx:84,89` | **Bajarildi** — foydalanuvchi qarori bilan badge butunlay olib tashlandi; yangi logo komponenti uni chizmaydi |
| Aylanuvchi halqa, fon shu’lasi va nuqta | `AppLoadingScreen.jsx:29,62,63,110,111` | Qat’iy yozilgan oltin ranglar va theme ranglarini yakuniy brendga moslash |
| Pastdagi harakatlanuvchi chiziq | `AppLoadingScreen.jsx:132,134,136` | Gradient va animatsiya ko‘rinishini moslash; `width: '45%'` haqiqiy yuklanish foizi emas, noaniq davomiylik indikatori |
| Holat matni | `AppLoadingScreen.jsx:4,115`, `App.jsx:36,48,63,84` | `Sahifa yuklanmoqda...` va `Xavfsiz sessiya tekshirilmoqda...` holatlarini ikkala oqimda tekshirish |

`App.jsx:84` bu komponentni `Suspense` fallback sifatida, `:36,48,63` esa himoyalangan sahifa, rol tekshiruvi va yordam sahifasidagi sessiya yuklanishida ishlatadi. Qabul tekshiruvida sekin tarmoqda sahifaga ilk kirish, to‘g‘ridan-to‘g‘ri havolani ochish, refresh va sessiya tekshiruvi paytida ham yangi brend chiqishi kerak. Oq/qora mavzu, mobil karta va animatsiya kamaytirilgan rejim ham ko‘riladi.

<a id="s7"></a>
## 7. Brauzer xotirasi va moslik migratsiyasi

### 7.1. Topilgan kalitlar

Quyidagi **25 ta kalit/prefiks oilasi** manbada mavjud. Bu real brauzerdagi barcha dinamik kalitlarning soni emas. Maqsad prefiks `inventra` → `ilbi`; mavjud suffix, tenant/user ID, versiya va saqlash formati alohida saqlanadi.

| Kalit/prefiks | Joy / suffix | O‘tish talabi |
| --- | --- | --- |
| `inventra_access_token`, `inventra_refresh_token`, `inventra_user` | `api/client.js`, `AuthContext`; local va session storage | Remember-me joylashuvini saqlash; logout barcha eski/yangi auth nusxalarini tozalashi kerak |
| `inventra_remember_me`, `inventra_remember_login` | `Login.jsx`, `client.js` | Boolean satri va login satrini saqlash; parolni saqlash bilan aralashtirmaslik |
| `inventra_remember_password` | `Login.jsx:37,77,110` | **Ko‘chirilmaydi**; mavjud eski qiymat o‘chiriladi. Eski nomni tozalash kodi sababli vaqtincha saqlash asosli |
| `inventra_active_tenant` | `:${userId}`; `TenantContext`, `MyTenants`, `client.js` | Har ikkala storage; server qaytargan a’zolik bilan tekshirish; `X-Tenant-ID` o‘zgarmasligi |
| `inventra_theme` | `index.html`, `ThemeContext` | React ishga tushishidan oldingi theme o‘qishi ham yangilanadi |
| `inventra_sidebar_collapsed` | `Layout.jsx` | JSON booleanni saqlash |
| `inventra_pos_partner_sale`, `inventra_pos_cart` | `:${tenantId yoki pending}` | Har tenant savati va savdo turini ajratib saqlash |
| `inventra_checkout` | `:${userId}:${tenantId}`; `POS.jsx:44`, `utils/requestKey.js` | Saqlangan request `key` va `fingerprint`ni aynan saqlash; noaniq natijali so‘rov uchun yangi kalit yaratib yubormaslik |
| `inventra_draft_product`, `inventra_draft_category` | `Catalog.jsx`, tenant suffix | To‘liq qoralamani va tenant chegarasini saqlash |
| `inventra_inventory_filters_v2`, `inventra_sales_filters_v2` | Inventory/Sales, tenant suffix | Versiya va qiymat turini saqlash |
| `inventra_draft_stock_variant`, `inventra_draft_stock_qty`, `inventra_draft_stock_note` | Inventory, tenant suffix | Bir-biriga bog‘liq qoralama maydonlarini birga ko‘chirish |
| `inventra_stock_intake_full_draft_v1` | `RapidStockIntakeModal`, `Inventory`; tenant suffix | Partiya/qabul qoralamasini yo‘qotmaslik; har ikki consumer mos bo‘lishi |
| `inventra_receipt_paper_width` | Global va `:${tenantId yoki pending}` variantlari | POS/receipt global, Sales/Shifts tenantli variant o‘qiydi; bularni tasodifan birlashtirmaslik |
| `inventra_invoice_signatures_` | `${tenantId yoki pending}_${saleId}` | Ikki underscore bilan ajralgan dinamik qismlarni saqlash; `:` prefiksi deb taxmin qilmaslik |
| `inventra_custom_expense_categories`, `inventra_custom_income_sources` | Shifts, tenant suffix | Foydalanuvchi tuzgan ro‘yxatlarni saqlash |
| `inventra_support_guest` | `api/support.js`; 64 belgili hex | Bu suhbatga kirish kaliti; aynan saqlash. Yangi qiymat eski mehmon suhbatiga kirishni yo‘qotishi mumkin |

`scripts/capture_guides.cjs`, `frontend/inventra/tests/client.test.js` va boshqa storage testlari ham yangi nomlar bilan moslanadi. `usePersistedState` faqat nom emas, qiymat turiga ham bog‘liq: undagi qiymatlar JSON, auth/theme kabi boshqa joylarda esa oddiy satr bo‘lishi mumkin.

### 7.2. Bir origin ichidagi o‘tish algoritmi

1. Barcha kalitlar uchun markaziy ro‘yxat va versiyalangan migratsiya yaratiladi. U theme inline script, `guestSupportKey()`, `AuthProvider`, `TenantProvider` va persist hooklarning birinchi o‘qishidan oldin ishlashi kerak.
2. `localStorage` va `sessionStorage` **alohida** ko‘chiriladi; sessiya tokenini avtomatik doimiy storagega aylantirmaslik. Dinamik suffixlar o‘zgartirilmaydi.
3. Yangi kalitdagi mavjud qiymat ustiga eskisi yozilmaydi. Yangi va eski qiymat to‘qnashsa, tanlash qoidasi kalit turiga ko‘ra belgilanadi; token va user turli sessiyalardan yig‘ilmaydi.
4. Qiymat qayta serializatsiya qilinmasdan, mavjud xom ko‘rinishda ko‘chiriladi; kerakli shakl consumer yoki validator orqali tekshiriladi. Xato JSON, storage bloklanishi va quota xatosi ilovani yiqitmasligi kerak.
5. `inventra_remember_password` nusxalanmaydi. Faqat nomi kerak bo‘lgani uchun uni yangi brend ostida qayta saqlash mumkin emas.
6. Migratsiya qayta bajarilganda natija buzilmaydi. Versiya belgisi faqat zarur yozuvlar muvaffaqiyatli ko‘chgach qo‘yiladi; qisman xatoda qayta urinish mumkin bo‘ladi.
7. Eski tab, yangi tab va ortga qaytgan versiya uchun bitta moslik davri belgilanadi. Zarur joyda vaqtincha eski/yangi yozish yoki versiyali o‘tish qo‘llanadi; stale auth fallback logoutdan keyin sessiyani tiklamasligi kerak.
8. Eski kalitlar compatibility release va rollback muddati tugagach olib tashlanadi. Moliyaviy pending requestlar aniqlashtirilmasdan checkout kaliti tashlanmaydi.

### 7.3. Domen o‘zgargandagi alohida holat

`http`/`https`, host yoki port o‘zgarishi originni o‘zgartiradi. Yangi origin eski originning local/session storage’ini o‘qiy olmaydi; yuqoridagi algoritm buning o‘rnini bosa olmaydi. HTTP redirect ham storage ko‘chirmaydi.

Deploydan oldin oldingi origin ishlatilganmi va unda real savat/qoralama/chat bormi aniqlanadi. Qayta login, qolgan checkoutni yakunlash va zarur qoralamalarni oldindan saqlash/eksport qilish tartibi belgilanadi. Mehmon chatini davom ettirish kerak bo‘lsa alohida xavfsiz handoff ishlab chiqiladi; auth yoki guest tokenlarni URL/query orqali ko‘chirish rejalashtirilmaydi. Tokenlarni saqlash siyosatini tubdan o‘zgartirish alohida vazifa hisoblanadi.

<a id="s8"></a>
## 8. Docker, baza, fayl saqlash va ichki manzillar

### 8.1. Bog‘langan nomlar

| Identifikator | Dalil | Reja |
| --- | --- | --- |
| Backend katalogi `inventra/` | Compose build/mount/env_file, CI cwd, queue validation, docs | Papka rename’i barcha iste’molchilari bilan bir patchda |
| Servis DNS nomi `inventra` | Ikkala Compose, ikkala Nginx, bot endpointi | Qayta nomlansa `ilbi`; o‘tishda kerak bo‘lsa eski DNS aliasni saqlash |
| `inventra_net` | Dev Compose | Tarmoqni almashtirish servislarni qayta ulashni talab qiladi; zaruratini alohida baholash |
| `inventra_venv` | Dev Compose volume | Qayta yaratilishi mumkin bo‘lgan dependency volume; Postgres/media hajmlari bilan tenglashtirilmaydi |
| Compose project nomi | Katalog nomidan kelib chiqishi mumkin | Oldingi project nomini aniqlash va o‘tishda aniq pin qilish; ildiz papkani almashtirish yangi volume nomlarini keltirib chiqarmasligi |
| `POSTGRES_DB/USER`, `DB_NAME/USER` | Root/backend `.env.example` va mahalliy kalitlar | Haqiqiy baza bor bo‘lsa faqat `.env`ni o‘zgartirish yetarli emas |
| `TEST_DB_*` va test DB nomlari | `settings_test.py`, test Compose, ikkala CI workflow | Izolyatsiyalangan test muhitini birga yangilash; dev/prodga ulanmasligi |
| `MINIO_ROOT_USER`, `MINIO_BUCKET_NAME` | Env andozalari, settings, dev Compose | Login nomi va bucket ma’lumotini alohida boshqarish; mavjud obyektlar yangi nom bilan o‘zidan-o‘zi paydo bo‘lmaydi |
| `inventra-source-backup.service/.timer` | `scripts/install_backup_timer.py` | O‘rnatilgan user unitlar alohida migratsiya qilinadi; skript nomini almashtirish ularni yangilamaydi |

Repo yoki Compose project qayta nomlansa, `postgres_data`, `redis_data`, `media_data`, `static_data`, `minio_data` kabi kalitlar o‘zgarmasa ham haqiqiy Docker resurs nomining prefiksi o‘zgarishi mumkin. Avvalgi resurslar bilan mapping yozilmaguncha buni “yangi bo‘sh muhit” deb qabul qilib yubormaslik kerak. Devda `./inventra/media` bind mounti ham bor.

### 8.2. Media manzillari va ikki xil Nginx

`client.js:82`dagi regex va accounts/catalog/internal-shop serializerlari `http://inventra/` kabi ichki manzillarni nisbiy URLga aylantiradi. Servis `ilbi`ga ko‘chsa, eski va yangi ichki manzillarni to‘g‘ri normalizatsiya qilish tekshiriladi. Public javobga Docker hostname chiqib ketmasligi kerak; tashqi haqiqiy URLlar buzilmasligi lozim.

Dev uchun `nginx/nginx.conf`, production uchun `frontend/inventra/nginx.prod.conf` tekshiriladi. Ikkalasida ham upstream `http://inventra:8000`; internal API bloklanishi, `/media/`, `/static/`, API va SPA yo‘llari yangi sozlamada ishlashi kerak. Productionda faqat root `nginx/nginx.conf`ni tahrirlash haqiqiy frontend proxyga ta’sir qilmaydi.

### 8.3. Ma’lumotni saqlaydigan o‘tish

1. Ishlayotgan loyiha nomi, volume/mountlar, DB/role va bucketning hozirgi mappingini maxfiy qiymatlarsiz qayd etish.
2. DB hamda media/object storage uchun tiklash mumkinligi tekshirilgan zaxira olish; `backup/work-in-progress` **kod zaxirasi**, DB/media zaxirasi emas.
3. Public brend relizida DB, bucket va volume nomlarini saqlab turish imkonini avval baholash. Faqat texnik nomni yangilash uchun ma’lumot ko‘chirish majburiy emas.
4. Zarur rename/copy bo‘lsa write/worker/beat jarayonlari uchun kelishilgan to‘xtash oynasi, bog‘lanish sozlamalari va qaytish mappingini tayyorlash.
5. Qatorlar/obyektlar soni, muhim savdo/qoldiq summalari, rasm/fayllarga kirish va servis health holatini oldin/keyin solishtirish.

`docker compose down -v`, DBni o‘chirish, bucketni bo‘shatish yoki eski hajmni olib tashlash rebrendingning standart qadami emas. `.env`dagi yangi `POSTGRES_DB/USER` mavjud PostgreSQL data volume ichidagi DB/roleni avtomatik qayta nomlamaydi.

<a id="s9"></a>
## 9. Domen, email va Telegram o‘tishi

### 9.1. Domen va public havolalar

| Nuqta | Joriy dalil | Release oldidan talab |
| --- | --- | --- |
| Chek QR | `ReceiptSlip.jsx:675` brauzerda `window.location.origin`, `:676` fallback `https://app.inventra.uz/r/…` | Canonical originga mos ishlab chiqarish; eski linklar bo‘lsa token/pathni saqlagan yo‘naltirish |
| Chek va Z-hisobot footer | `www.inventra.uz` | Tanlangan yagona sayt yozuvi bilan almashtirish |
| Setup/reset email | `password_reset_service.py:348` → `FRONTEND_URL/setup-account?token=…` | `FRONTEND_URL` va `/setup-account`, `/reset-password` yo‘llarini tekshirish; token query loglarga chiqmasin |
| Public receipt route | `App.jsx`: `/r/:token`, `/receipt/:token` | SPA refresh va eski havola yo‘llarini saqlash; brand uchun `public_token`ni aylantirmaslik |
| Backend host tekshiruvi | `ALLOWED_HOSTS` | Haqiqiy hostlar va zarur ichki hostlar; domenni sxema/path bilan yozmaslik |
| Reverse proxy | Production Nginx `server_name _`, TLS deploy vaqtida | DNS, sertifikat, canonical redirect va forward qilingan proto/host ishlashini real kirish nuqtasida tekshirish |
| Cookie/session/CSRF | Hozirgi JWT oqimi va Django middleware | Haqiqiy deployga mos domain/secure/proxy/CSRF sozlamalarini tekshirish; alohida origin tanlansa CORS ehtiyojini baholash |

Kodni ko‘rish domen egaligi yoki DNS mavjudligini tasdiqlamaydi. Eski domen yoki printed QR amalda tarqatilgan bo‘lsa, qaysi hostlar xizmat qilishi va yo‘naltirish qancha davom etishi release yozuvida belgilanadi. Qayta yo‘naltirish brauzerdagi auth/qoralamalarni ko‘chirmaydi.

### 9.2. Email

`password_reset_service.py`dagi **owner yaratish**, **xodim taklifi**, **egalikni topshirish**, **parol tiklash** oqimlari alohida tekshiriladi: subject, sarlavha, HTML body, plain text, qadamlar, logo va copyright. Backend andozalari, haqiqiy muhit va `settings.py:229`dagi fallback sender bir xil maqsadga moslanadi.

Taklif sender: `ILBI <noreply@ilbi.uz>`. Bu manzilning mavjudligi yoki yetkazib berishi tasdiqlanmagan. DNSdagi sender tekshiruvlari (SPF/DKIM/DMARC), provayder sozlamasi va haqiqiy test yetkazilishi release oldidan tekshiriladi. Mavjud SMTP login/parolini faqat display-name o‘zgargani uchun almashtirish shart emas.

`support@ilbi.uz`, `privacy@ilbi.uz`, `security@ilbi.uz`, `admin@ilbi.uz` — faqat ehtimoliy kelajak aloqa/alias variantlari. Pochta qutisi, mas’ul operator va yetib borish tekshirilmaguncha ularni rasmiy matnga ishlayotgan manzil sifatida qo‘shmaslik. Joriy telefon/Telegram kontaktlari saqlanadi.

### 9.3. Telegram

| Qism | Qolgan ish |
| --- | --- |
| `telegram_bot_sms/main.py` | `/start`, `/help`, `/status`, contact muvaffaqiyati, fallback va log matnlari |
| `api/v1/accounts/views/misc.py:78` | OTP sarlavhasidagi `INVENTRA PRO` |
| `api/v1/tenants/views.py` | Test bildirishnomasidagi Inventra |
| `apps/support/tasks.py:31` | Operatorga ketadigan `Inventra: yangi yordam xabari` |
| `INVENTRA_INTERNAL_URL` | Zarur bo‘lsa `ILBI_INTERNAL_URL`ga o‘tish: eski env uchun vaqtincha fallback; source, `.env.example`, real bot env va README birga |
| BotFather profili | Display name, about/description, rasm va command menyusi; tashqi muhitda tekshiriladi |
| Bot tokeni / identity | Nomni yangilash tokenni almashtirishni talab qilmaydi. Boshqa bot ishlatilsa backend va bot tokenlari bir identityga tegishli bo‘lishi kerak |
| Kontaktlar va guruhlar | `TelegramContact.bot_id`ga mos kontakt, qayta `/start`/contact ulashish, test xabar va guruh/kanal huquqlari tekshiriladi |
| Administrator yaratish | `createsuperuser.py:60`dagi `update_or_create` defaults’ida `bot_id` yo‘q. Yangi kontaktni amaldagi bot identitysi bilan bog‘lash yoki `/start` orqali qayta ulashishni tekshirish |

`current_bot_id()` tokenning bot ID qismini oladi; bot o‘zgarganda eski bot kontaktlari avtomatik yangi botga tegishli bo‘lib qolmaydi. Kontaktni `api/v1/tg_bot/serializers.py` bot ID bilan saqlaydi; login uchun `api/v1/accounts/views/misc.py:34` va operator bildirishnomasi uchun `apps/support/tasks.py:24` amaldagi bot ID bilan tanlaydi. Umumiy `apps/tg_bot/services.py` esa xabar yuboradi; kontakt tanlash shu faylda emas. Administratorni yaratish yo‘lidagi identity bo‘shlig‘i ham shu sabab o‘tish sinoviga kiradi. Qo‘llanmalardagi buyruq real handlerga mos bo‘lsin: hozirgi handler uchun `/start` yetarli; nomi o‘zgardi deb yangi deep-link protokolini o‘ylab topish kerak emas.

<a id="s10"></a>
## 10. Backend identifikatorlari va API hujjatlari

| Nuqta | Bog‘liqlik va bajarish sharti |
| --- | --- |
| `api/schema.py` | `InventraJWTScheme` va `InventraAutoSchema` klasslari; settingsdagi `api.schema.InventraAutoSchema` import satri birga yangilanadi; auth schema mantiqi saqlanadi |
| `SPECTACULAR_SETTINGS` | Title/description ILBIga o‘tadi; `/api/schema/`, `/api/docs/`, `/api/redoc/` real javoblari tekshiriladi |
| `pyproject.toml` → `uv.lock` → metadata | Distributiv nomi o‘zgarsa `importlib.metadata.version("inventra")` ham yangilanadi. Lockfile vosita bilan yangilanadi, versiya jim fallbackga tushib qolmasligi tekshiriladi |
| `config/celery.py`, `gunicorn.conf.py` | `Celery('inventra')`, `inventra_gunicorn` ichki jarayon nomlari. Worker/beat konfiguratsiyasi va monitoringdagi nomlar birga ko‘riladi |
| `CACHES['support']['KEY_PREFIX']` | `inventra_support` o‘zgarsa oldingi throttle/cache holati boshqa namespace’da qoladi; Redisni to‘liq tozalash o‘rniga TTL/o‘tish tartibini belgilash |
| `DemoAccessService.GROUP_NAME` | `inventra_local_demo` DBda guruh nomi sifatida yashaydi. Zarur bo‘lsa yangi data migration yoki vaqtincha ikki nom bilan tekshirish; eski demo a’zoliklarini yo‘qotmaslik |
| `INVENTRA_DEMO_PASSWORD` | Seed komandasi, `.env.example`, lokal kalit va testlar birga yangilanadi; parol qiymati hujjat/logga chiqmaydi |
| Test DB va test secret matni | Faqat izolyatsiyalangan test identifikatori sifatida baholanadi; production credential bilan aralashtirilmaydi |
| Migration va audit tarixi | Eski qo‘llanma yo‘li yozilgan izohni release uchun tarixni qayta yozish bahonasiga aylantirmaslik. Ma’lumot o‘zgarishi kerak bo‘lsa yangi migratsiya qo‘shiladi |

API yo‘llari, user/tenant ID, role/permission kodlari, audit action, tovar kodi/barcode, chek tokeni va moliyaviy idempotency kaliti mahsulot nomi sifatida ommaviy almashtirilmaydi. Ulardagi haqiqiy moslik alohida dalil bilan ko‘riladi.

<a id="s11"></a>
## 11. Qo‘llanmalar, rasmiy matnlar va rasmlar

### 11.1. Amaldagi matnlar

Uchta `docs/hujjatlar/` faylida jami **4 ta moslikli satr** qolgan: foydalanish/maxfiylik sarlavhalari va oferta sarlavhasi hamda asosiy ta’rif. `LICENSE:1`da yana bitta moslik bor. Nomni yangilashda mavjud nashr holati, haqiqiy ijrochi rekvizitlari va hujjat mazmuni saqlanadi; yangi brendni boshqa huquq egasi deb ko‘rsatish avtomatik qilinmaydi.

`User` modeli va `AcceptTermsView` hozir `terms_accepted`, vaqt va IP’ni saqlaydi; har bir qabul qilingan hujjat versiyasi/xeshi saqlanmaydi. Yangilangan oferta/maxfiylikni nashr qilishdan oldin tahrir/arxiv va qayta rozilik kerakligi bo‘yicha qaror qayd etiladi. Brend uchun barcha roziliklarni bazada to‘g‘ridan-to‘g‘ri o‘chirib yuborish rejalashtirilmaydi. Bu bo‘lim kod va repo matnlari auditi; yangi yuridik xulosa yoki tashqi muvofiqlik tasdig‘i emas.

`README.md`, `docs/README.md`, `INVENTRA_MASTER_PLAN.md`, ikkala arxitektura yo‘l xaritasi, `README_TESTS.md`, `docs/SUPPORT.md` va `yordam_uz/ru/en.md` ko‘rib chiqiladi. `docs/PLAN_NOTES.md`, loyiha auditi va qonun bo‘yicha walkthroughdagi tarixiy tasdiqlar o‘z ma’nosini saqlaydi: tarixiy mahsulot nomini qayta yozish zarurati alohida baholanadi.

`docs/plan_scope.json`da **116**, `automation/queue-plan.json`da **318** moslikli satr bor. Ular ko‘pincha fayl yo‘llari; papka rename’isiz yo‘llarni yangilash avtomatlashtirishni buzadi. `.gitignore`dagi eski IDE nomi ham tegishli lokal rename bilan baholanadi.

### 11.2. Matn qidiruvi yetarli bo‘lmagan joylar

| Aktivlar | Inventar | Tekshirish |
| --- | ---: | --- |
| `docs/rasmlar/` | 33 fayl | Fokuslangan yo‘riqnoma ekranlarida logo/title va matnlar |
| `frontend/inventra/public/docs/images/` | 16 fayl | Ommaviy static nusxalardagi eski ekranlar va qaysi sahifadan yuklanishi |
| `branding/logos/` | 12 PNG | Yakuniy/tarixiy/reference variantlar ajratilishi |
| Motion studio eksportlari va QA tasvirlari | Mavjud PNG/MP4/JSON | Ilovada ishlatiladigan aktivni reference va tarixiy QA’dan ajratish |

Bu sonlar butun binar inventarning o‘rnini bosmaydi. Qo‘llanma screenshotlari faqat sun’iy demo ma’lumotlar bilan qayta olinadi; `capture_guides.cjs`dagi `INVENTRA_DOCS_BASE_URL`, `INVENTRA_DOCS_AUTH_FILE` va storage kalitlari ham moslanadi. Publish uchun build nusxalari source’dan qayta yaratiladi, qo‘lda `dist` ichidagi matnni almashtirish bilan cheklanilmaydi.

`index.html`da hozir description/title bor, ammo Open Graph/Twitter preview metadata ko‘rsatilmagan. `public/`da `manifest.webmanifest`, `apple-touch-icon.png`, `robots.txt`, `sitemap.xml` yo‘q. Bular eski brend qoldig‘i emas: public marketing/PWA talabi bo‘lsa alohida qo‘shiladi. Login, setup token va receipt kabi xususiy/public-token sahifalari uchun indekslash siyosati ham shu qarorda belgilanadi.

<a id="s12"></a>
## 12. Papka, fayl va repo nomini o‘zgartirish

Quyidagi jadval dastlabki rename rejasidir. Backend/frontend/master-plan/roadmap/komponent va backup unit rename’lari **Bajarildi**; root katalog/GitHub uchun qayd etilgan istisnolar amal qiladi. Bu ketma-ketlik bajarildi; aniq natijalar 19-bo‘limda.

| Joriy | Taklif | Birga yangilanadigan bog‘liqliklar |
| --- | --- | --- |
| `inventra/` | `ilbi/` | Dev/prod/test Compose, CI, automation cwd/path, docs, skript, bind mount, lokal IDE |
| `frontend/inventra/` | `frontend/ilbi/` | Build context, CI/npm cache path, queue-plan, docs/plan_scope va qo‘llanma buyruqlari |
| `INVENTRA_MASTER_PLAN.md` | `ILBI_MASTER_PLAN.md` | README/yo‘l xaritalari/plan_scope/queue-plan ichidagi link va aniq yo‘llar |
| `Architectures/inventra-yol-xaritasi.md` | `Architectures/ilbi-yol-xaritasi.md` | Hujjat linklari, model/service izohlari va testlarda zarur referencelar |
| `InventraLogo.jsx` | `IlbiLogo.jsx` | Logo geometriyasi, export/importlar, CSS/SVG ID va UI snapshotlar |
| `InventraIntroAnimation.jsx` | Rename talab qilinmaydi | Eski fayl yo‘q; mavjud yangi fayl `IlbiIntroAnimation.jsx` |
| `inventra-source-backup.service/.timer` | `ilbi-source-backup.service/.timer` | Installer, o‘rnatilgan unitlar, timerning `Unit=` qiymati va working directory |
| Lokal root `Sales-Platform/` | Masalan, `ilbi-platform/` | Ixtiyoriy; Compose project/volumelar, systemd absolute path va IDEga ta’siri oldindan tekshiriladi |
| GitHub `Abdulxadiy/Sales-Platform` | Tanlangan yangi repo nomi | Ixtiyoriy tashqi amal; remote, queue repository/remote, workflow va havolalar moslanadi |
| `.idea/*.iml` va SDK yo‘llari | Zarur bo‘lsa qayta yaratish | Lokal muhit; tarixiy workspace yo‘llarini ommaviy kod o‘zgarishiga kiritmaslik |

Frontend `package.json` nomi hozir `frontend`; unda `inventra` mosligi yo‘q. Uni `ilbi-frontend`ga o‘zgartirish ixtiyoriy, ammo tanlansa `package-lock.json` ham vosita orqali moslanadi. Backend Django modulining nomi `config`, app label’lar `accounts`, `sales`, `tenants` va boshqalar; backend katalogi o‘zgargani uchun ularni qayta nomlash kerak emas.

### Avtomatlashtirish uchun qo‘shimcha shartlar

- `.github/workflows/publish-queue.yml`dagi `sales-platform-commit-queue` concurrency guruhi, test DB va publish validation pathlari tekshiriladi.
- `automation/commit-queue.json` repo/remote bilan birga backend/frontend `cwd`larini ham saqlaydi; `queue-plan.json`dagi yo‘llar haqiqiy fayllarga mos bo‘lishi kerak.
- `scripts/commit_queue.py`dagi vaqtincha katalog prefikslari, `tests/automation/test_commit_queue.py`dagi yo‘l tekshiruvlari va `automation/README.md` yangilanadi.
- `scripts/install_backup_timer.py` yangi kod bo‘lsa ham eski o‘rnatilgan timerni o‘zi olib tashlamaydi. Avvalgi timer saqlagan cadence va kerakli backup branchlar saqlanadi; ikkita parallel timer qolmasligi tekshiriladi.
- Repo rename’i davom etayotgan queue/state branchlari va lokal remote bilan moslashadi. Nom o‘zgargani uchun queue holatini yoki nashr tarixini avtomatik tozalamaslik kerak.

<a id="s13"></a>
## 13. Bajarish ketma-ketligi

| Bosqich | Ish | Chiqish sharti | Mas’ul rol |
| --- | --- | --- | --- |
| B0 — qaror va boshlang‘ich holat — **Bajarildi** | Canonical origin, yakuniy logo, nomlash, real deployment/data mavjudligi, saqlanadigan texnik nomlarni aniqlash | Qarorlar yozilgan; DB/media va eski link/storage xavfi ma’lum | Mahsulot egasi + deploy mas’uli |
| B1 — moslik — **Bajarildi** | Storage/guest/checkout o‘tishi, env fallback, zarur eski host/pathlar bilan moslik; zaxira va rollback | Eski/yangi mijoz va logout/retry tekshiruvi o‘tgan | Frontend + backend |
| B2 — ko‘rinadigan brend — **Bajarildi** | Logo/favicon, UI/loading, email/Telegram, print va XLSX, joriy hujjatlar | Qolgan Inventra foydalanuvchiga ko‘rinmaydi; barcha muhim ekranlar ko‘rilgan | Frontend + backend + kontent |
| B3 — domen va yetkazish — **Qisman, R-11 ochiq** | DNS/TLS, proxy/host, sender testi, bot profil/kontakt/guruhlar, kerakli eski link redirectlari | Stagingda login, email link, chek va support oqimlari ishlaydi | Deploy + egasi |
| B4 — texnik rename — **Bajarildi** | Tasdiqlangan katalog/servis/distributiv/CI/queue/timer nomlari; DB/bucket faqat zarur bo‘lsa | Ma’lumot saqlangan; build/test/schema va backup mapping ishlaydi | Backend + deploy |
| B5 — yakuniy tozalash — **Bajarildi** | Screenshot/guide, istisnolar ro‘yxati, moslik muddati tugagan eski nomlarni olib tashlash | 16-bo‘lim mezonlari va release dalillari to‘ldirilgan | Jamoa |

B4dagi har bir rename B2 uchun majburiy shart emas. DB/bucketni o‘zgartirmasdan ILBI brendini chiqarish qarori ham asosli bo‘lishi mumkin. Bosqichlar aniq deploymentga qarab birlashtirilsa ham B1dagi ma’lumot/kirish mosligi avval hal qilinadi.

<a id="s14"></a>
## 14. Tekshirish rejasi

Quyidagi rebrending tekshiruvlari bajarildi; yakuniy natijalar 19-bo‘limda. Email outbox va Telegram OTP matni mock bilan sinovdan o‘tdi. Bot profili real API orqali yangilandi; chatlarga test xabari jo‘natilmadi.

| Qism | Mazmunli tekshiruv va kutilgan natija |
| --- | --- |
| Statik inventar | 18-bo‘lim qidiruvi qayta bajariladi; har qolgan moslik faol vazifa yoki sababli istisno bo‘ladi |
| Frontend | `frontend/inventra/` ichida `npm run lint`, `npm test`, `npm run build`; rename qilingan bo‘lsa yangi cwd |
| Backend | `inventra/` ichida `uv sync --frozen`, CI’dagi Ruff check, izolyatsiyalangan pytest va OpenAPI validate |
| OpenAPI | `uv run python manage.py spectacular --settings=config.settings_test --validate --fail-on-warn --file /tmp/ilbi-schema.yaml`; title, version va JWT schema ishlaydi |
| Automation | Rootda `python3 -m unittest discover -s tests/automation -v`; queue/plan yo‘llari mavjud fayllarga mos; publish bajarishdan oldin mavjud dry-run imkoniyati bilan ko‘riladi |
| Compose | Dev/prod/test konfiguratsiyalari tegishli env bilan `config --quiet` orqali tekshiriladi; to‘liq resolved config yoki secretlar logga chiqarilmaydi |
| Storage | Toza storage, faqat eski, faqat yangi, ikkala nom to‘qnashuvi, xato JSON, quota/blocked holati va takroriy migratsiya |
| Auth/tenant | Remember-me yoqilgan/o‘chiq, refresh, logout, ikkita tab, user almashishi, bir nechta tenant; o‘chirilgan eski token orqali sessiya tiklanmaydi |
| Moliyaviy qayta so‘rov | Pending checkoutda xuddi shu payload eski request key bilan davom etadi; yangi nom sabab takroriy savdo yaratilmaydi |
| Qoralamalar | POS savati, partner mode, catalog/stock intake, filter, signature va printer eni tenantlar orasida aralashmaydi |
| Mehmon support | Eski guest kaliti bilan avvalgi suhbat, yangi guest, login qilingan support, image/voice yuklash/ochish va operatorga javob |
| Ko‘rinish | Login/intro/skip/reduced-motion, loading, sidebar, dark/light, mobil, terms, documentation va notification |
| Yuklanish kartasi | Sekin tarmoq, ilk ochilish, deep-link va refreshda `Suspense` hamda sessiya loading holatlari; logo, wordmark, mustaqil PRO badge, halqa/gradient va holat matni tekshiriladi |
| Print/export | 58/80 mm chek, Z-hisobot, A4/PDF, browser print title, QR, footer va XLSX frontend/backend nomlari |
| Domen | HTTPS, canonical redirect, SPA deep-link refresh, `/r/…`, `/receipt/…`, setup/reset query, `/api` va `/media` to‘g‘ri ishlaydi |
| Telegram/email | Tasdiqlangan test kontaktiga OTP, yangi administrator yaratish va bot identitysi, bot buyruqlari, contact ulashish, report/test/support xabarlari va 4 email turi |
| Ma’lumot | Oldin/keyingi DB/media mapping, muhim qator/summa/obyektlar, permission/role va receipt tokenlar saqlangan |
| Backup/rollback | O‘rnatilgan timer bitta; source backup yangi yo‘ldan ishlashi hamda DB/media restore rejasi alohida tasdiqlangan |

Sinov ma’lumotlari sun’iy va muhit izolyatsiyalangan bo‘ladi. Mavjud production savdo cheklovlarini test o‘tkazish uchun o‘chirib qo‘yish rejalashtirilmaydi. Ushbu fayl tahriri uchun esa manba havolalari, hisoblar, format va maxfiy qiymat ko‘chirilmaganligi tekshiriladi.

<a id="s15"></a>
## 15. Ortga qaytish rejasi

Release oldidan oldingi ishlaydigan kod/image, env **kalitlari** va xavfsiz saqlangan konfiguratsiya nusxasi, Compose project/resource mapping, DB/media tiklash nuqtasi hamda DNS/proxy holati qayd etiladi. Maxfiy qiymatlar audit fayliga yozilmaydi.

| Muammo | Qaytish talabi |
| --- | --- |
| Logo/UI/asset muammosi | Oldingi build qaytariladi; yangi favicon/static cache holati ham tekshiriladi |
| Storage yoki auth muammosi | Compatibility versiya eski va yangi kalitlarni tushunishi kerak; yangi yozuvlarni yo‘qotadigan eski versiyani ko‘r-ko‘rona qaytarmaslik |
| Domain/link muammosi | Oldingi proxy/DNSga qaytish va yangi/eski havolalarni xizmatda saqlash; storage qaytishi alohida baholanadi |
| Service/path rename muammosi | Oldingi upstream/alias, compose project, mount va env mappingga qaytish; boshqa bo‘sh volumeni ulab yubormaslik |
| DB/bucket ko‘chirish muammosi | Oldingi resurs saqlangan bo‘ladi; relizdan keyingi yozuvlarni yarashtirish yoki tiklash nuqtasini tanlash kerak. Kod rollback’i ma’lumotni avtomatik qaytarmaydi |
| Bot identity o‘zgargan | Ishlaydigan backend/bot jufti va kontakt bog‘lanishi birga qaytariladi; token qiymati log/hujjatda yuritilmaydi |

Qaytish triggerlari, kuzatish muddati va mas’ul release yozuvida belgilanadi. Eski kalit, volume, bucket yoki DNS yo‘li kuzatish va qaytish muddati tugamasdan olib tashlanmaydi.

<a id="s16"></a>
## 16. Yakunlash mezonlari

- [x] Barcha foydalanuvchiga ko‘rinadigan faol nomlar, logo/favicon, email/Telegram, print va download fayllari tanlangan ILBI yozilishiga mos.
- [x] Theme/auth/tenant/cart/draft/checkout/signature/guest support o‘tishi tekshirilgan; ma’lumot va pending request identifikatorlari saqlangan.
- [ ] Canonical origin, TLS, real sender va bot identity tasdiqlangan; mavjud eski QR/setup/receipt linklari bo‘yicha reja bajarilgan.
- [x] Rename qilingan path/service nomlari dev, prod, test, CI, queue, docs va o‘rnatilgan backupda bir-biriga mos.
- [x] DB/volume/bucket o‘zgargan bo‘lsa dalilli backup, oldin/keyingi tekshiruv va qaytish rejasi mavjud.
- [x] Qo‘llanma va static nusxa rasmlari ko‘rilgan; UZ/RU/EN yordam sarlavhalari, rasmiy matn va `LICENSE` tekshirilgan.
- [x] Qabul qilingan hujjat tahriri va qayta rozilik qarori qayd etilgan; haqiqiy ijrochi/huquq egasi taxminan almashtirilmagan.
- [x] Build, test, schema, muhim foydalanuvchi oqimlari va ma’lumot tekshiruvlari natijalari release yozuvida mavjud.
- [x] Qolgan eski nomlar yo‘l/sabab bo‘yicha 19.3-bo‘limda ajratilgan; moslikni olib tashlash mezoni va mas’ul rol quyida qayd etilgan.
- [x] Auditga `.env` paroli, bot tokeni, SMTP credentiali yoki guest/auth token ko‘chirilmagan.

**Qabul mezoni:** izohsiz faol eski brend qoldiqlari qolmaydi, o‘tish ishlaydigan ma’lumot va foydalanuvchi oqimlarini saqlaydi. Repo bo‘ylab `inventra` matnining mutlaq nol bo‘lishi o‘z-o‘zicha yakun mezoni emas.

<a id="s17"></a>
## 17. 108 faylning yangilangan inventari

Har fayl boshlang‘ich auditda bir guruhda bir marta hisoblangan. Havolalar yangi yo‘llarga ko‘chirildi; **Bajarildi** belgisi joriy natijani bildiradi. **Satr** ustuni moslikli satrlar soni; **Boshlang‘ich qatorlar** birinchi uchta moslikni ko‘rsatadi, barcha o‘rinlar shular bilan cheklanmaydi. To‘liq qatorlar 18-bo‘lim skriptida chiqadi. **Qo‘shimcha** — avvalgi auditdagi `### 📄` fayl ro‘yxatiga kirmagan, bu safar topilgan fayl.

### 17.1. Frontend: UI, storage, print va yordamchi kod — 34 fayl, 150 satr

| Fayl | Satr | Boshlang‘ich qatorlar | Amal / e’tibor |
| --- | ---: | --- | --- |
| [frontend/ilbi/src/api/client.js](frontend/ilbi/src/api/client.js) | 26 | 2, 9, 13; … | **Bajarildi** — Auth/tenant storage va ichki media hostname regexi |
| [frontend/ilbi/src/api/support.js](frontend/ilbi/src/api/support.js) | 2 | 4, 7 | **Bajarildi** — **Qo‘shimcha.** Mehmon suhbatiga kirish kaliti saqlanishi shart |
| [frontend/ilbi/src/components/common/AppLoadingScreen.jsx](frontend/ilbi/src/components/common/AppLoadingScreen.jsx) | 3 | 2, 68, 76 | **Bajarildi** — **Qo‘shimcha.** Eski logo importi va alohida INVENTRA loading matni |
| [frontend/ilbi/src/components/common/CatalogImportModal.jsx](frontend/ilbi/src/components/common/CatalogImportModal.jsx) | 1 | 117 | **Bajarildi** — **Qo‘shimcha.** Import shablonining frontend download nomi |
| [frontend/ilbi/src/components/common/IlbiLogo.jsx](frontend/ilbi/src/components/common/IlbiLogo.jsx) | 5 | 4, 7, 27; … | **Bajarildi** — Eski SVG belgi, komponent/klass va wordmark |
| [frontend/ilbi/src/components/common/InvoiceA4Modal.jsx](frontend/ilbi/src/components/common/InvoiceA4Modal.jsx) | 6 | 21, 28, 34; … | **Bajarildi** — Print title/iframe va imzolar storage prefiksi |
| [frontend/ilbi/src/components/common/ReceiptSlip.jsx](frontend/ilbi/src/components/common/ReceiptSlip.jsx) | 12 | 3, 75, 87; … | **Bajarildi** — Logo, footer, QR fallback, printer eni va seed |
| [frontend/ilbi/src/components/common/ShiftReportSlip.jsx](frontend/ilbi/src/components/common/ShiftReportSlip.jsx) | 6 | 2, 19, 25; … | **Bajarildi** — Logo, Z-hisobot footer va printer eni |
| [frontend/ilbi/src/components/common/ZReportModernView.jsx](frontend/ilbi/src/components/common/ZReportModernView.jsx) | 3 | 18, 37, 134 | **Bajarildi** — Logo importi va fallback do‘kon nomi |
| [frontend/ilbi/src/components/docs/MarkdownViewer.jsx](frontend/ilbi/src/components/docs/MarkdownViewer.jsx) | 1 | 87 | **Bajarildi** — Dizayn tizimi haqidagi izoh |
| [frontend/ilbi/src/components/inventory/RapidStockIntakeModal.jsx](frontend/ilbi/src/components/inventory/RapidStockIntakeModal.jsx) | 1 | 104 | **Bajarildi** — Tenantga bog‘liq to‘liq kirim qoralamasi |
| [frontend/ilbi/src/components/layout/Layout.jsx](frontend/ilbi/src/components/layout/Layout.jsx) | 2 | 32, 278 | **Bajarildi** — Sidebar storage va fallback sahifa sarlavhasi |
| [frontend/ilbi/src/components/layout/Sidebar.jsx](frontend/ilbi/src/components/layout/Sidebar.jsx) | 6 | 33, 57, 220; … | **Bajarildi** — UI/print nomi va storage/import bog‘liqliklarini ajratish |
| [frontend/ilbi/src/components/notifications/NotificationCard.jsx](frontend/ilbi/src/components/notifications/NotificationCard.jsx) | 3 | 13, 32, 42 | **Bajarildi** — UI/print nomi va storage/import bog‘liqliklarini ajratish |
| [frontend/ilbi/src/context/AuthContext.jsx](frontend/ilbi/src/context/AuthContext.jsx) | 11 | 19, 63, 64; … | **Bajarildi** — User/token local-session storage mosligi |
| [frontend/ilbi/src/context/TenantContext.jsx](frontend/ilbi/src/context/TenantContext.jsx) | 1 | 5 | **Bajarildi** — Userga bog‘liq tenant kaliti, ikkala storage |
| [frontend/ilbi/src/context/ThemeContext.jsx](frontend/ilbi/src/context/ThemeContext.jsx) | 2 | 7, 12 | **Bajarildi** — Theme kaliti; index.html bilan birga |
| [frontend/ilbi/src/index.css](frontend/ilbi/src/index.css) | 1 | 2 | **Bajarildi** — Eski dizayn tizimi sarlavha izohi |
| [frontend/ilbi/src/pages/AcceptTerms.jsx](frontend/ilbi/src/pages/AcceptTerms.jsx) | 3 | 18, 167, 240 | **Bajarildi** — UI/print nomi va storage/import bog‘liqliklarini ajratish |
| [frontend/ilbi/src/pages/Catalog.jsx](frontend/ilbi/src/pages/Catalog.jsx) | 2 | 105, 111 | **Bajarildi** — Product/category qoralama kalitlari |
| [frontend/ilbi/src/pages/Dashboard.jsx](frontend/ilbi/src/pages/Dashboard.jsx) | 1 | 644 | **Bajarildi** — UI/print nomi va storage/import bog‘liqliklarini ajratish |
| [frontend/ilbi/src/pages/Debts.jsx](frontend/ilbi/src/pages/Debts.jsx) | 1 | 502 | **Bajarildi** — **Qo‘shimcha.** Qarzlar XLSX download nomi |
| [frontend/ilbi/src/pages/Documentation.jsx](frontend/ilbi/src/pages/Documentation.jsx) | 2 | 240, 468 | **Bajarildi** — UI/print nomi va storage/import bog‘liqliklarini ajratish |
| [frontend/ilbi/src/pages/Inventory.jsx](frontend/ilbi/src/pages/Inventory.jsx) | 6 | 63, 82, 83; … | **Bajarildi** — Filter/qoralama va ombor XLSX download nomi |
| [frontend/ilbi/src/pages/Login.jsx](frontend/ilbi/src/pages/Login.jsx) | 20 | 9, 30, 34; … | **Bajarildi** — Logo, remember-me/login va eski parol kalitini o‘chirish |
| [frontend/ilbi/src/pages/MyTenants.jsx](frontend/ilbi/src/pages/MyTenants.jsx) | 1 | 142 | **Bajarildi** — Active tenant storage kaliti |
| [frontend/ilbi/src/pages/POS.jsx](frontend/ilbi/src/pages/POS.jsx) | 5 | 44, 62, 68; … | **Bajarildi** — Checkout idempotency, cart/partner, printer va print title |
| [frontend/ilbi/src/pages/PublicReceiptView.jsx](frontend/ilbi/src/pages/PublicReceiptView.jsx) | 3 | 14, 224, 227 | **Bajarildi** — UI/print nomi va storage/import bog‘liqliklarini ajratish |
| [frontend/ilbi/src/pages/Sales.jsx](frontend/ilbi/src/pages/Sales.jsx) | 3 | 51, 87, 394 | **Bajarildi** — Filter, tenant printer eni, XLSX va print title |
| [frontend/ilbi/src/pages/Services.jsx](frontend/ilbi/src/pages/Services.jsx) | 2 | 1154, 1204 | **Bajarildi** — UI/print nomi va storage/import bog‘liqliklarini ajratish |
| [frontend/ilbi/src/pages/SetupAccount.jsx](frontend/ilbi/src/pages/SetupAccount.jsx) | 2 | 163, 198 | **Bajarildi** — UI/print nomi va storage/import bog‘liqliklarini ajratish |
| [frontend/ilbi/src/pages/Shifts.jsx](frontend/ilbi/src/pages/Shifts.jsx) | 5 | 26, 27, 73; … | **Bajarildi** — Custom ro‘yxatlar, printer eni, Z-hisobot title |
| [frontend/ilbi/src/pages/Tenants.jsx](frontend/ilbi/src/pages/Tenants.jsx) | 1 | 543 | **Bajarildi** — UI/print nomi va storage/import bog‘liqliklarini ajratish |
| [frontend/ilbi/src/utils/numberFormat.js](frontend/ilbi/src/utils/numberFormat.js) | 1 | 2 | **Bajarildi** — **Qo‘shimcha.** Format utilidagi eski brend izohi |

### 17.2. Frontend: build, HTML, Nginx va testlar — 6 fayl, 13 satr

| Fayl | Satr | Boshlang‘ich qatorlar | Amal / e’tibor |
| --- | ---: | --- | --- |
| [frontend/ilbi/Dockerfile](frontend/ilbi/Dockerfile) | 1 | 9 | **Bajarildi** — **Qo‘shimcha.** Dependency hash markerining eski nomi |
| [frontend/ilbi/README.md](frontend/ilbi/README.md) | 3 | 1, 3, 46 | **Bajarildi** — **Qo‘shimcha.** Build/config va dokumentatsiya yo‘llarini rename bilan moslash |
| [frontend/ilbi/dev-entrypoint.sh](frontend/ilbi/dev-entrypoint.sh) | 2 | 4, 7 | **Bajarildi** — **Qo‘shimcha.** Dockerfile bilan bir xil dependency hash marker |
| [frontend/ilbi/index.html](frontend/ilbi/index.html) | 3 | 7, 11, 15 | **Bajarildi** — Title/description va Reactdan oldingi theme o‘qish |
| [frontend/ilbi/nginx.prod.conf](frontend/ilbi/nginx.prod.conf) | 2 | 14, 15 | **Bajarildi** — **Qo‘shimcha.** Production upstream nomi |
| [frontend/ilbi/tests/client.test.js](frontend/ilbi/tests/client.test.js) | 2 | 103, 138 | **Bajarildi** — **Qo‘shimcha.** Storage test fixture kalitlari |

### 17.3. Email shablonlari — 1 fayl, 15 satr

| Fayl | Satr | Boshlang‘ich qatorlar | Amal / e’tibor |
| --- | ---: | --- | --- |
| [ilbi/apps/accounts/services/password_reset_service.py](ilbi/apps/accounts/services/password_reset_service.py) | 15 | 259, 262, 266; … | **Bajarildi** — 4 email oqimida subject, HTML/text, header/footer |

### 17.4. Telegram va xabarnomalar — 8 fayl, 24 satr

| Fayl | Satr | Boshlang‘ich qatorlar | Amal / e’tibor |
| --- | ---: | --- | --- |
| [ilbi/api/v1/accounts/views/misc.py](ilbi/api/v1/accounts/views/misc.py) | 1 | 78 | **Bajarildi** — OTP xabar sarlavhasi |
| [ilbi/api/v1/tenants/views.py](ilbi/api/v1/tenants/views.py) | 1 | 526 | **Bajarildi** — Test bildirishnoma sarlavhasi |
| [ilbi/apps/support/tasks.py](ilbi/apps/support/tasks.py) | 1 | 31 | **Bajarildi** — **Qo‘shimcha.** Operator Telegram bildirishnomasi sarlavhasi |
| [telegram_bot_sms/.dockerignore](telegram_bot_sms/.dockerignore) | 1 | 2 | **Bajarildi** — Eski backend nomi yozilgan izoh |
| [telegram_bot_sms/.env.example](telegram_bot_sms/.env.example) | 2 | 1, 4 | **Bajarildi** — **Qo‘shimcha.** Bot internal endpoint andozasi |
| [telegram_bot_sms/.gitignore](telegram_bot_sms/.gitignore) | 1 | 219 | **Bajarildi** — Mahalliy IDE modulining eski nomi |
| [telegram_bot_sms/README.md](telegram_bot_sms/README.md) | 3 | 162, 171, 253 | **Bajarildi** — Ko‘rinadigan xabar va env/aloqa mosligi |
| [telegram_bot_sms/main.py](telegram_bot_sms/main.py) | 14 | 13, 47, 53; … | **Bajarildi** — Bot javoblari va internal URL env kaliti |

### 17.5. Backend: schema, servis, test va metadata — 24 fayl, 41 satr

| Fayl | Satr | Boshlang‘ich qatorlar | Amal / e’tibor |
| --- | ---: | --- | --- |
| [ilbi/api/schema.py](ilbi/api/schema.py) | 2 | 7, 11 | **Bajarildi** — **Qo‘shimcha.** Ikki schema klassi; settings importi bilan birga |
| [ilbi/api/v1/accounts/serializers.py](ilbi/api/v1/accounts/serializers.py) | 1 | 62 | **Bajarildi** — Avatar URL ichki hostname tekshiruvi |
| [ilbi/api/v1/accounts/views/docs_views.py](ilbi/api/v1/accounts/views/docs_views.py) | 1 | 83 | **Bajarildi** — Texnik nom, import yoki tarixiy reference; alohida baholash |
| [ilbi/api/v1/catalog/serializers.py](ilbi/api/v1/catalog/serializers.py) | 1 | 47 | **Bajarildi** — Catalog media URL ichki hostname tekshiruvi |
| [ilbi/api/v1/catalog/views/import_views.py](ilbi/api/v1/catalog/views/import_views.py) | 1 | 36 | **Bajarildi** — **Qo‘shimcha.** Backend import shabloni XLSX nomi |
| [ilbi/api/v1/exports.py](ilbi/api/v1/exports.py) | 3 | 65, 79, 120 | **Bajarildi** — **Qo‘shimcha.** Stock/debts/sales XLSX nomlari |
| [ilbi/api/v1/internal/shop/serializers.py](ilbi/api/v1/internal/shop/serializers.py) | 1 | 45 | **Bajarildi** — Shop media URL ichki hostname tekshiruvi |
| [ilbi/apps/accounts/management/commands/seed_demo_platform.py](ilbi/apps/accounts/management/commands/seed_demo_platform.py) | 2 | 44, 46 | **Bajarildi** — Demo parol env kaliti; qiymati chiqarilmaydi |
| [ilbi/apps/accounts/services/demo_access_service.py](ilbi/apps/accounts/services/demo_access_service.py) | 1 | 9 | **Bajarildi** — Bazadagi demo guruhi nomi |
| [ilbi/apps/accounts/tests/test_demo_mode.py](ilbi/apps/accounts/tests/test_demo_mode.py) | 4 | 127, 156, 165; … | **Bajarildi** — Demo env kaliti testlari |
| [ilbi/apps/catalog/migrations/0002_seed_permissions.py](ilbi/apps/catalog/migrations/0002_seed_permissions.py) | 1 | 12 | **Bajarildi** — Texnik nom, import yoki tarixiy reference; alohida baholash |
| [ilbi/apps/catalog/models/category_model.py](ilbi/apps/catalog/models/category_model.py) | 1 | 14 | **Bajarildi** — Texnik nom, import yoki tarixiy reference; alohida baholash |
| [ilbi/apps/catalog/models/product_variant_model.py](ilbi/apps/catalog/models/product_variant_model.py) | 1 | 3 | **Bajarildi** — Texnik nom, import yoki tarixiy reference; alohida baholash |
| [ilbi/apps/catalog/services/category_service.py](ilbi/apps/catalog/services/category_service.py) | 1 | 3 | **Bajarildi** — Texnik nom, import yoki tarixiy reference; alohida baholash |
| [ilbi/apps/catalog/services/product_service.py](ilbi/apps/catalog/services/product_service.py) | 1 | 4 | **Bajarildi** — Texnik nom, import yoki tarixiy reference; alohida baholash |
| [ilbi/apps/core/services/audit_service.py](ilbi/apps/core/services/audit_service.py) | 1 | 2 | **Bajarildi** — Texnik nom, import yoki tarixiy reference; alohida baholash |
| [ilbi/apps/core/spreadsheets.py](ilbi/apps/core/spreadsheets.py) | 1 | 25 | **Bajarildi** — **Qo‘shimcha.** Workbook standart sarlavhasi |
| [ilbi/config/celery.py](ilbi/config/celery.py) | 1 | 7 | **Bajarildi** — Celery ilovasi ichki nomi |
| [ilbi/config/settings.py](ilbi/config/settings.py) | 8 | 167, 174, 183; … | **Bajarildi** — Schema, distributiv, API title, sender, MinIO va cache |
| [ilbi/config/settings_test.py](ilbi/config/settings_test.py) | 4 | 34, 54, 55; … | **Bajarildi** — Izolyatsiyalangan test secret va DB identifikatorlari |
| [ilbi/gunicorn.conf.py](ilbi/gunicorn.conf.py) | 1 | 38 | **Bajarildi** — Gunicorn jarayon nomi |
| [ilbi/pyproject.toml](ilbi/pyproject.toml) | 1 | 2 | **Bajarildi** — Python distributiv nomi |
| [ilbi/tests/factories.py](ilbi/tests/factories.py) | 1 | 27 | **Bajarildi** — Texnik nom, import yoki tarixiy reference; alohida baholash |
| [ilbi/uv.lock](ilbi/uv.lock) | 1 | 741 | **Bajarildi** — Distributiv metadata; vosita bilan yangilash |

### 17.6. Umumiy konfiguratsiya va infratuzilma — 8 fayl, 80 satr

| Fayl | Satr | Boshlang‘ich qatorlar | Amal / e’tibor |
| --- | ---: | --- | --- |
| [.env.example](.env.example) | 11 | 2, 10, 12; … | **Bajarildi** — Nom/path/host/resurs andozalari; haqiqiy secret emas |
| [.gitignore](.gitignore) | 1 | 219 | **Bajarildi** — Mahalliy IDE modulining eski nomi |
| [docker-compose.prod.yml](docker-compose.prod.yml) | 12 | 24, 25, 27; … | **Bajarildi** — **Qo‘shimcha.** Servis/path/resurs nomi; ma’lumotni saqlab o‘tish |
| [docker-compose.yml](docker-compose.yml) | 35 | 1, 4, 12; … | **Bajarildi** — Servis/path/resurs nomi; ma’lumotni saqlab o‘tish |
| [ilbi/.env.example](ilbi/.env.example) | 10 | 2, 16, 19; … | **Bajarildi** — Backend/demo/DB/MinIO/sender andozalari |
| [ilbi/.gitignore](ilbi/.gitignore) | 1 | 220 | **Bajarildi** — Mahalliy IDE modulining eski nomi |
| [ilbi/docker-compose.test.yml](ilbi/docker-compose.test.yml) | 4 | 20, 21, 22; … | **Bajarildi** — Servis/path/resurs nomi; ma’lumotni saqlab o‘tish |
| [nginx/nginx.conf](nginx/nginx.conf) | 6 | 42, 43, 57; … | **Bajarildi** — Servis/path/resurs nomi; ma’lumotni saqlab o‘tish |

### 17.7. Rasmiy matnlar va litsenziya — 4 fayl, 5 satr

| Fayl | Satr | Boshlang‘ich qatorlar | Amal / e’tibor |
| --- | ---: | --- | --- |
| [LICENSE](LICENSE) | 1 | 1 | **Bajarildi** — Copyright qatoridagi nom; haqiqiy huquq egasini aniqlash |
| [docs/hujjatlar/foydalanish_qoidalari.md](docs/hujjatlar/foydalanish_qoidalari.md) | 1 | 1 | **Bajarildi** — Mahsulot nomi va haqiqiy rekvizit/huquq egasini ajratish |
| [docs/hujjatlar/maxfiylik_siyosati.md](docs/hujjatlar/maxfiylik_siyosati.md) | 1 | 1 | **Bajarildi** — Mahsulot nomi va haqiqiy rekvizit/huquq egasini ajratish |
| [docs/hujjatlar/ommaviy_oferta.md](docs/hujjatlar/ommaviy_oferta.md) | 2 | 1, 9 | **Bajarildi** — Mahsulot nomi va haqiqiy rekvizit/huquq egasini ajratish |

### 17.8. Qo‘llanma, reja va arxitektura — 14 fayl, 426 satr

| Fayl | Satr | Boshlang‘ich qatorlar | Amal / e’tibor |
| --- | ---: | --- | --- |
| [Architectures/ilbi-yol-xaritasi.md](Architectures/ilbi-yol-xaritasi.md) | 50 | 1, 3, 9; … | **Bajarildi** — Faol matn, yo‘l va tarixiy qaydlarni ajratish |
| [Architectures/shop-yol-xaritasi.md](Architectures/shop-yol-xaritasi.md) | 26 | 3, 5, 7; … | **Bajarildi** — Faol matn, yo‘l va tarixiy qaydlarni ajratish |
| [ILBI_MASTER_PLAN.md](ILBI_MASTER_PLAN.md) | 108 | 1, 5, 86; … | **Bajarildi** — Faol matn, yo‘l va tarixiy qaydlarni ajratish |
| [README.md](README.md) | 11 | 1, 3, 9; … | **Bajarildi** — Faol matn, yo‘l va tarixiy qaydlarni ajratish |
| [docs/LOYIHA_AUDITI_VAZIFALAR.md](docs/LOYIHA_AUDITI_VAZIFALAR.md) | 46 | 1, 16, 81; … | **Bajarildi** — Tarix, faol topshiriqlar va hujjat/path havolalari |
| [docs/OZBEKISTON_QONUNI_WALKTHROUGH.md](docs/OZBEKISTON_QONUNI_WALKTHROUGH.md) | 41 | 1, 20, 30; … | **Bajarildi** — Tarixiy dalil va reja yo‘llari; yuridik xulosa berilmaydi |
| [docs/PLAN_NOTES.md](docs/PLAN_NOTES.md) | 9 | 1, 3, 18; … | **Bajarildi** — Tarixiy qarorlar: ma’nosini saqlab tahrirlash |
| [docs/README.md](docs/README.md) | 2 | 1, 33 | **Bajarildi** — Faol matn, yo‘l va tarixiy qaydlarni ajratish |
| [docs/SUPPORT.md](docs/SUPPORT.md) | 9 | 10, 17, 18; … | **Bajarildi** — **Qo‘shimcha.** Faol matn, yo‘l va tarixiy qaydlarni ajratish |
| [docs/plan_scope.json](docs/plan_scope.json) | 116 | 3, 8, 9; … | **Bajarildi** — 116 moslikli satr: rename bilan bog‘langan pathlar |
| [docs/qollanmalar/yordam_en.md](docs/qollanmalar/yordam_en.md) | 1 | 1 | **Bajarildi** — **Qo‘shimcha.** Faol matn, yo‘l va tarixiy qaydlarni ajratish |
| [docs/qollanmalar/yordam_ru.md](docs/qollanmalar/yordam_ru.md) | 1 | 1 | **Bajarildi** — **Qo‘shimcha.** Faol matn, yo‘l va tarixiy qaydlarni ajratish |
| [docs/qollanmalar/yordam_uz.md](docs/qollanmalar/yordam_uz.md) | 1 | 1 | **Bajarildi** — **Qo‘shimcha.** Faol matn, yo‘l va tarixiy qaydlarni ajratish |
| [ilbi/README_TESTS.md](ilbi/README_TESTS.md) | 5 | 1, 10, 11; … | **Bajarildi** — Faol matn, yo‘l va tarixiy qaydlarni ajratish |

### 17.9. CI, commit queue va avtomatlashtirish — 7 fayl, 357 satr

| Fayl | Satr | Boshlang‘ich qatorlar | Amal / e’tibor |
| --- | ---: | --- | --- |
| [.github/workflows/ci.yml](.github/workflows/ci.yml) | 8 | 11, 14, 18; … | **Bajarildi** — Backend/frontend cwd, npm cache va test DB |
| [.github/workflows/publish-queue.yml](.github/workflows/publish-queue.yml) | 8 | 15, 27, 28; … | **Bajarildi** — **Qo‘shimcha.** Concurrency, test DB va publish muhiti |
| [automation/README.md](automation/README.md) | 8 | 14, 31, 37; … | **Bajarildi** — **Qo‘shimcha.** Repo, cwd, fayl yo‘li va test konfiguratsiyasi |
| [automation/commit-queue.json](automation/commit-queue.json) | 10 | 2, 3, 14; … | **Bajarildi** — **Qo‘shimcha.** Repo/remote va validation cwd yo‘llari |
| [automation/queue-plan.json](automation/queue-plan.json) | 318 | 10, 11, 12; … | **Bajarildi** — **Qo‘shimcha.** 318 moslikli satr: queue fayl yo‘llari |
| [scripts/commit_queue.py](scripts/commit_queue.py) | 2 | 220, 300 | **Bajarildi** — **Qo‘shimcha.** Vaqtinchalik backup/publish katalog prefiksi |
| [tests/automation/test_commit_queue.py](tests/automation/test_commit_queue.py) | 3 | 163, 175, 177 | **Bajarildi** — **Qo‘shimcha.** Repo, cwd, fayl yo‘li va test konfiguratsiyasi |

### 17.10. Screenshot va systemd backup skriptlari — 2 fayl, 11 satr

| Fayl | Satr | Boshlang‘ich qatorlar | Amal / e’tibor |
| --- | ---: | --- | --- |
| [scripts/capture_guides.cjs](scripts/capture_guides.cjs) | 4 | 5, 6, 7; … | **Bajarildi** — **Qo‘shimcha.** Screenshot env va sun’iy auth/storage kalitlari |
| [scripts/install_backup_timer.py](scripts/install_backup_timer.py) | 7 | 18, 35, 41; … | **Bajarildi** — **Qo‘shimcha.** O‘rnatiladigan unit nomlari va eski tavsiflar |


### 17.11. Hisobdan tashqari, alohida kuzatiladigan joylar

| Joy | Nega asosiy 108 faylga qo‘shilmagan? | Vazifa |
| --- | --- | --- |
| `.env`, `inventra/.env` | Shaxsiy secret konfiguratsiya; qiymatlar tarqatilmaydi | DB/role, host, sender, demo env nomi; faqat kalitlar bilan checklist |
| `inventra/.env.test` | Lokal test muhiti | `TEST_DB_NAME`, `TEST_DB_USER`, `TEST_DB_PASSWORD` mosligi |
| `telegram_bot_sms/.env` | Bot secret konfiguratsiyasi | `INVENTRA_INTERNAL_URL` va haqiqiy bot identity mosligi |
| `.idea/`, backend/bot `.idea/` | Lokal IDE holati, ignore qilingan | SDK/modul/root yo‘llarini kerak bo‘lsa qayta yaratish |
| `frontend/inventra/public/favicon.svg` | Eski nomga matn mosligi yo‘q, eski belgi bor | SVG geometriyasini yangilash |
| Yangi intro va `ilbi/` modullari | Qidirilayotgan eski nom yo‘q | Bajarilgan ish sifatida saqlash; yagona logo bilan moslash |
| 6 ta owner/admin/staff qo‘llanmasi | Joriy matnida eski nom topilmadi | Rasm va oqimlarni ko‘rish; ularni eski holat deb qayta yozmaslik |
| `package.json`, `package-lock.json` | Frontend package nomi `frontend`; eski nom mosligi yo‘q | Rename tanlansa lockfile bilan birga |
| `vite.config.js` | Nom mosligi yo‘q, `VITE_API_TARGET`/proxy bog‘liqligi bor | Yangi domen/dev proxy bilan ishlashini tekshirish |
| `apps/tg_bot/identity.py`, contact serializer/model va `createsuperuser.py` | Eski brend matni bo‘lmasa ham bot identity bog‘liqligi bor | R-19: yangi admin kontakti, amaldagi bot va qayta ulashish |
| Tarqatilgan chek/PDF/email, bot profili, DNS/provider | Repo tashqarisidagi aktivlar | Alohida tashqi release checklisti; hozirgi hisobga qo‘shilmaydi |

<a id="s18"></a>
## 18. Qidiruvni takrorlash va ochiq qarorlar

### 18.1. Reproduktiv matn inventari

Quyidagi skript repo ildizida bajariladi. `rg` va Python 3 talab qiladi; faylga yozmaydi, maxfiy qiymat yoki mos satrning matnini chiqarmaydi. U ignore qilinmagan fayllarni oladi, binar/UTF-8 bo‘lmaganlarni sanab ajratadi va har mos faylning **barcha qator raqamlarini** chiqaradi. Qidiruv sanasidan keyingi kod/ignore o‘zgarishlari natijani o‘zgartirishi mumkin.

```bash
python3 - <<'PY'
from pathlib import Path
import re
import subprocess

excluded = [
    '.git/**', '.agents/**', '.codex/**', '.aws/**',
    '.commit-queue-local/**', '**/node_modules/**', '**/.venv/**',
    '**/venv/**', '**/__pycache__/**', '**/.pytest_cache/**',
    '**/.ruff_cache/**', '**/dist/**', '**/dist_docker/**',
    '**/build/**', '**/coverage/**', '**/htmlcov/**', '**/media/**',
    '**/staticfiles/**', '**/site-packages/**',
    'REBRANDING_AUDIT_ILBI_UZ.md',
]
cmd = ['rg', '--files', '--hidden']
for glob in excluded:
    cmd += ['-g', '!' + glob]
paths = sorted(subprocess.check_output(cmd, text=True).splitlines())
pattern = re.compile(r'inventra|sales[-_ ]platform', re.I)
text_files = binary_files = matched_files = matched_lines = occurrences = 0
for name in paths:
    path = Path(name)
    if path.name.startswith('.env') and path.name != '.env.example':
        continue
    data = path.read_bytes()
    if b'\0' in data:
        binary_files += 1
        continue
    try:
        source = data.decode('utf-8')
    except UnicodeDecodeError:
        binary_files += 1
        continue
    text_files += 1
    hits = []
    for number, line in enumerate(source.splitlines(), 1):
        found = len(pattern.findall(line))
        if found:
            hits.append(number)
            occurrences += found
    if hits:
        matched_files += 1
        matched_lines += len(hits)
        print(f'{name}: {len(hits)} satr; qatorlar=' + ','.join(map(str, hits)))
print(dict(text_files=text_files, matched_files=matched_files,
           matched_lines=matched_lines, occurrences=occurrences,
           binary_or_non_utf8=binary_files))
PY
```

Rebrendingdan oldingi tarixiy boshlang‘ich natija: `text_files=570`, `matched_files=108`, `matched_lines=1122`, `occurrences=1367`, `binary_or_non_utf8=127`. Bu xavfsiz inventar skripti `.env` qiymati, `.git` tarixi yoki binar ichidagi eski yozuvni qidirish vositasi emas.

### 18.2. Qarorlarning yakuniy holati

| Qaror | Yakuniy holat |
| --- | --- |
| Yakuniy statik logo | **Bajarildi** — mavjud ILBI introdagi ko‘k belgi va `ilbi.uz` wordmarki yagona manba sifatida tanlandi |
| Public origin | **Bajarildi (kod)** — `https://ilbi.uz` uchun host/fallback/metadata; real DNS/TLS deploy R-11da ochiq |
| Eski muhitdagi ma’lumotlar | **Bajarildi** — mavjud lokal baza/media zaxiralandi, asosiy hisob va yig‘indilar o‘tishdan keyin mos chiqdi |
| DB/bucket/volume/repo rename | **Bajarildi** — source/service nomlari ILBI; persisted resurs va haqiqiy repo nomlari tasdiqlangan texnik istisno sifatida saqlandi |
| Sender va email aliaslari | **Qisman** — ILBI display-name va yangi domen andozasi tayyor; provayder/DNS/yetkazish tasdig‘i R-11da ochiq |
| Bot identity/profil | **Bajarildi** — backend/bot bitta identity, `@ilbi_bot` profili real API bilan yangilandi va qayta o‘qildi |
| Compatibility/rollback | **Bajarildi** — ikki namespace, logout marker va yangi migratsiya; eski moslikni olib tashlash mezonlari 19.5-bo‘limda |
| Hujjat nashri/rozilik | **Bajarildi** — 2026-10-15 brend tahriri; yangi tijoriy shart kiritilmadi, avvalgi rozilik flaglari saqlandi |

### 18.3. Ushbu tahrirning o‘zgarish qaydi

2026-10-15: eskirgan 98 fayl / 791 o‘rinli ro‘yxat joriy ishchi nusxa bilan qayta solishtirildi; 29 qo‘shimcha fayl va matn qidiruvisiz qoladigan aktivlar kiritildi. Maxfiy qiymat chiqarildi, bajarilgan intro/bot-havola ishlari ajratildi, storage/guest/checkout, domain va ma’lumot migratsiyasi, CI/queue/timer, tekshiruv, rollback va qabul mezonlari qo‘shildi. Kod yoki tashqi infratuzilma o‘zgartirilgani va testlar o‘tgani haqida xulosa berilmadi.

<a id="s19"></a>
## 19. Bajarilgan ishlar va yakuniy tekshiruv

### 19.1. Yakunlangan reliz

**Bajarildi — 2026-10-15.** Foydalanuvchi tanlagan ILBI intro geometriyasi statik logo, loading, favicon, email va bot avatariga bir xil manba sifatida qo‘llandi. Mahsulot nomiga PRO qo‘shilmaydi; avvalgi PRO badge va xabar sarlavhalari olib tashlandi. Savdo katalogidagi haqiqiy mahsulot nomlari rebrending uchun tahrirlanmadi.

| Ish | Natija / dalil |
| --- | --- |
| Backend va frontend | **Bajarildi** — `ilbi/`, `frontend/ilbi/`; `IlbiLogo.jsx`, `ILBI_MASTER_PLAN.md`, `Architectures/ilbi-yol-xaritasi.md` |
| Aktivlar | **Bajarildi** — `scripts/build_brand_assets.mjs --png`; bir xil vektordan SVG, monochrome, email PNG, touch icon va bot JPEG |
| Xabarlar | **Bajarildi** — 4 email turi, OTP, bot buyruqlari va support/test bildirishnomalari; sender display-name ILBI |
| Bot profili | **Bajarildi** — `branding/ilbi-bot-profile.json` qo‘llandi; qayta o‘qishda barcha profil matnlari mos, takroriy yozishlar ro‘yxati bo‘sh |
| Storage | **Bajarildi** — 25 eski kalit oilasi; tenant/user/sale suffixlari saqlandi. `ilbi_auth_namespace_v1` stale tab sabab logoutdan keyin sessiya tiklanishini to‘sadi; qisman quota xatosida eski auth bundle buzilmaydi |
| Baza va media | **Bajarildi** — PostgreSQL dump va media zaxirasi lokal yopiq fayllarda; konteynerlar eski hajmlarga ulandi; oldin/keyingi asosiy hisoblar va summalar mos |
| Qo‘llanma va vizual QA | **Bajarildi** — 16 focused PNG; 32 foydalanilmaydigan eski screenshot nusxasi chiqarildi; `qa/rebranding/verification.json` va PNG/PDF dalillari |
| Mahalliy manzillar | **Bajarildi** — `http://localhost:5173` native Vite va Docker frontend `http://localhost:5174`; ikkalasida login HTML, brand rasmi va ILBI API sxemasi tekshirildi |
| Backup | **Bajarildi** — `ilbi-source-backup.timer`, 15 daqiqalik tartib; faqat bitta faol rejalashtirilgan source backup |
| Audit holati | **Bajarildi** — boshlang‘ich 108 inventar faylining har biriga natija yozildi; tashqi deploy R-11 alohida ochiq |

### 19.2. Tekshiruv natijalari

| Tekshiruv | Natija |
| --- | --- |
| Backend pytest | **Bajarildi — 535 passed**; izolyatsiyalangan PostgreSQL/Redis. Django email sozlamalariga tegishli deprecation ogohlantirishlari bor |
| Frontend test | **Bajarildi — 5 test fayli o‘tdi**, jumladan storage migratsiyasi, partial quota va logout/reload holatlari |
| Frontend build | **Bajarildi** — production bundle qayta generatsiya qilindi; eski public screenshotlar builddan ham chiqarildi |
| Frontend lint | **Bajarildi** — xato yo‘q; avvaldan mavjud React/hook/uslub ogohlantirishlari qolgan |
| Backend CI Ruff | **Bajarildi — All checks passed** (`E9,F821,F822,F823`) |
| OpenAPI | **Bajarildi** — `--validate --fail-on-warn`; xato va ogohlantirish yo‘q |
| Migration drift | **Bajarildi — No changes detected**; `0011_ilbi_demo_group` alohida, orqaga qaytariladigan data migration |
| Automation | **Bajarildi — 13 test o‘tdi**; source path/secret policy va queue assignment takrorlanmasligi tekshirildi |
| Browser | **Bajarildi** — login/mobil/loading light-dark/reduced-motion, 16 focused guide va sun’iy chek/PDF; kutilmagan browser xatosi qayd etilmadi |
| Docker | **Bajarildi** — image’lar tayyorlandi, mahalliy servislar yangi yo‘llardan ishga tushdi; DB qoldiq/savdo yig‘indilari saqlandi |
| Bot profili | **Bajarildi** — `@ilbi_bot` identity tekshirildi, profil qo‘llandi va qayta o‘qildi; chat xabarlari soni 0 |

### 19.3. Saqlangan texnik istisnolar

Bular qolib ketgan faol Inventra UI emas; ular o‘tish/rollback yoki haqiqiy resursga bog‘lanish uchun saqlangan:

- Root checkout `Sales-Platform` va haqiqiy GitHub repo/remote o‘zgartirilmadi. Ularning nomini almashtirish ilova brendi uchun talab qilinmaydi; backup havolalari ishlaydigan repoga qaraydi.
- Lokal Compose project/network/venv va mavjud DB/role/bucket identifikatorlari `.env` mappingi orqali saqlandi. Yangi o‘rnatish andozalari ILBI nomlaridan foydalanadi.
- `inventra_` storage prefiksi, eski internal env nomi, eski demo guruhi va media hostname faqat moslik/tozalash/migratsiya kodida yoki shu holatlarni tekshiruvchi testlarda qoladi.
- `automation/queue-plan.json`dagi eski yo‘llar tracked o‘chirishlarni yangi yo‘llar bilan birga nashr qilish uchun kiritilgan. Ularni faqat eski nom borligi uchun olib tashlash rename’ni yarim nashr qiladi.
- Bot tokeni va SMTP credentiallari almashtirilmadi. Lokal mavjud sender manzili ILBI display-name bilan saqlandi; yangi `noreply@ilbi.uz` manzilini ishlayotgan provayder manzili deb taxmin qilinmadi.
- `PRO` mahsulot badge’i yo‘q. Masalan, boshqa brend tovarining model nomidagi Pro so‘zi platforma brendingi emas.

### 19.4. Ochiq qolgan tashqi deploy bandi

**R-11 — hali bajarilmagan:** production uchun `ilbi.uz` DNS va TLS, `www` yo‘naltirishi, zarur eski public linklar marshruti, `noreply@ilbi.uz` sender domenining provayder/DNS tasdig‘i hamda haqiqiy email yetkazilishini tekshirish. Bu ish uchun hosting/DNS/mail provayderining deploy konfiguratsiyasi kerak. Lokal `FRONTEND_URL` ataylab 5173 manzilida saqlandi; production manzilini lokal konfiguratsiyaga ko‘r-ko‘rona yozish qilinmadi.

Botning tashqi profili esa bu ro‘yxatda ochiq emas: u real API orqali **Bajarildi** va qayta tekshirildi. Texnik manba: [Telegram Bot API — profil rasmini o‘zgartirish](https://core.telegram.org/bots/api#setmyprofilephoto).

### 19.5. Moslikni olib tashlash shartlari

| Istisno | Mas’ul rol | Qayta ko‘rish mezoni |
| --- | --- | --- |
| Eski storage namespace va auth marker | Frontend mas’uli | Eski builddagi tablar va rollback davri tugagach; guest/pending checkout migratsiyasi yo‘qotishsiz tasdiqlanmaguncha olib tashlanmaydi |
| Internal env/DNS/media va demo guruhi fallbacklari | Backend/deploy mas’uli | Barcha ishlayotgan servis/seed konfiguratsiyalari yangi nomga o‘tgach va rollback ehtiyoji qolmagach |
| Lokal Docker/DB/bucket nomlari | Deploy mas’uli | Keyingi tasdiqlangan resurs migratsiyasida; nom uchun bo‘sh yangi resursga ulanish yoki data o‘chirish qilinmaydi |
| Queue eski deletion pathlari | Repo mas’uli | Rename snapshoti va shu navbat to‘liq nashr etilgach; undan oldin juftliklar saqlanadi |
| Root/GitHub repo nomi | Loyiha egasi | Alohida repo/hosting rename topshirig‘i bo‘lsa; hozirgi rebrending tugagan deb qayta ochilmaydi |

Huquqiy matnlarda ushbu reliz faqat mahsulot nomi va taqdimotni yangiladi; foydalanuvchilarning avvalgi rozilik flaglari o‘zgartirilmadi. Yangi tijoriy shart yoki yangi ijrochi rekviziti kiritilmadi. Mazmunli shart o‘zgarishi bo‘lsa nashr/rozilik alohida ko‘rib chiqiladi.

Backend papkasi ko‘chirilgani uchun lokal virtualenv activation fayllari va console-script shebanglari yangi `ilbi/.venv` yo‘liga moslandi — **Bajarildi**; `uv run`/pytest kirish nuqtasi tekshirildi.

Vite katalogi ko‘chirilganda paydo bo‘lgan eski `.vite` optimizer keshi chiqarildi va global ignore qoidasiga kiritildi — **Bajarildi**. Navbat rejasi joriy o‘zgarishlarning barcha ruxsat etilgan yo‘llarini qamrab olishi tekshirildi; publisherning himoyalangan konfiguratsiyasini bootstrap qilish bo‘yicha mavjud siyosat saqlandi. Ushbu ish davomida main’ga commit/push yoki queue publish bajarilmadi.
