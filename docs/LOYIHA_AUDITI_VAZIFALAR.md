# ILBI — loyiha auditi, vazifalar va muhokamalar

**Dastlabki audit sanasi:** 2026-10-12. **So‘nggi yangilanish:** 2026-10-16.  
**Holat:** dastlabki audit quyida tarixiy topilmalar sifatida saqlangan. Production tayyorgarligining 1-qadami (AUD-21 qisman) va 2.1-qadami — katalog fiskal rekvizitlari va yangi chekdagi o‘zgarmas mahsulot nusxasi — bajarildi (AUD-01 qisman). Haqiqiy provayder integratsiyasi ochiq.  
**Joriy ko‘rsatma:** har bir tuzatishni alohida tushuntirish va foydalanuvchi tasdig‘idan keyin bajarish; keyingi ishlar uchun umumiy ruxsat berilmagan. Deploy alohida kelishiladi.

## 1. Tahlil chegarasi va mavjud holat

Backendning accounts, tenants, permissions, catalog, inventory, sales, cashbox, analytics, core va Telegram qismlari; frontend sahifalari, kontekstlar, API client va asosiy komponentlar; migratsiyalar, Docker, Nginx, CI, testlar tuzilishi va mavjud rejalar ko‘rib chiqildi. Kod tahlili diskdagi **joriy ishchi holat** bo‘yicha: avvaldan ko‘plab o‘zgartirilgan, o‘chirilgan va yangi fayllar bor.

- 301 ta Python fayli AST orqali o‘qildi: sintaksis xatosi topilmadi. Bu dastur ishlaganda xato bo‘lmasligini anglatmaydi.
- Frontendda 49 ta JS/JSX manba fayli bor. Sahifalardagi ma’lumot yuklash, saqlash, tenant tanlash va muhim amallar tekshirildi.
- Backendda 56 ta test moduli bor. Test manbalarida `ThreadPoolExecutor`, `threading`, `Thread(`, `transaction=True` yoki `TransactionTestCase` bilan parallel bajarish tekshiruvlari topilmadi.
- Ushbu auditda pytest, frontend build/lint, migratsiya yoki server ishga tushirilmadi. Ma’lumotlar bazasiga, xizmatlarga va ilova kodiga o‘zgartirish kiritilmadi.
- Mavjud hujjatlardagi `371/377 passed` kabi yozuvlar oldingi tekshiruvlarga tegishli; ular ushbu auditning natijasi emas.
- `ILBI_MASTER_PLAN.md` va `docs/OZBEKISTON_QONUNI_WALKTHROUGH.md`dagi oldingi qarorlar hisobga olindi. Quyidagi qaydlar ulardagi bajarilmagan ishlarni ham, hozirgi koddagi aniq kamchiliklarni ham ko‘rsatadi; oldingi qarorlar qayta tasdiqlangan deb yozilmadi.

Mavjud yaxshi asoslar: tenant headeri faol membership bilan serverda tekshiriladi; biznes APIlarining asosiy qismi tenant bilan cheklangan; Stock manfiy qoldiqdan DB constraint bilan himoyalangan; B2B qabul javobi alohida serializer ishlatadi; public receipt tasodifiy token va rotatsiyaga ega; B2B rad/expiry darhol stockni tiklamaydi; yangi B2B qaytish va tafovut yozuvlarida idempotency hamda miqdor constraintlari bor. Ushbu mexanizmlarni tuzatishlarda saqlash kerak.

## 2. Tartib va belgilash qoidasi

Ro‘yxat **bajarish qiyinligidan osoniga** tartiblangan. Bu ishga kirishish uchun xavf bo‘yicha navbat emas.

- **5/5:** bir nechta biznes oqimi, ma’lumot modeli yoki tashqi integratsiyani o‘zgartiradi.
- **4/5:** bir nechta modul va holatni muvofiqlashtirish kerak.
- **3/5:** chegaralangan modul, lekin API/DB/frontend kelishuvi yoki regressiya tekshiruvi kerak.
- **2/5:** kichikroq texnik o‘zgarish va aniq tekshiruvlar.
- **1/5:** kichik, sababi va kutiladigan natijasi aniq tuzatish.

**P0** — hisob, vakolat, maxfiylik yoki ishga tushirish uchun eng jiddiy muammo. **P1** — yuqori xavfli xato. **P2** — funksional yoki ishonchlilik kamchiligi. **P3** — texnik xizmat va hujjat yaxshilanishi.

Topilma turi: **kodda aniq** — sabab manbada ko‘rinadi; **shartli xavf** — ko‘rsatilgan vaziyatda yuz beradi, dinamik tasdiq hali yo‘q; **ochiq reja** — avval kelishilgan, hali tugallanmagan ish; **yaxshilash** — kodni yuritish yoki ishlashini yaxshilash taklifi.

| ID | Vazifa | Qiyinlik | Xavf | Holat |
|---|---|---:|---|---|
| AUD-01 | Fiskal savdo va sotuvchi tekshiruvini yakunlash | 5/5 | P0 | Qisman bajarildi; integratsiya ochiq |
| AUD-02 | Smena va kassa hisobini yaxlit qilish | 5/5 | P0 | Muhokama kutilmoqda |
| AUD-03 | Savdo bekori, qaytarish va asl chek summasini ajratish | 5/5 | P1 | Muhokama kutilmoqda |
| AUD-04 | Parallel amallarda yagona lock tartibi | 5/5 | P1 | Muhokama kutilmoqda |
| AUD-05 | POS va qarz to‘lovlarining idempotency himoyasi | 4/5 | P1 | Muhokama kutilmoqda |
| AUD-06 | B2B kontragentni aniq do‘kon va rozilik bilan bog‘lash | 4/5 | P1 | Muhokama kutilmoqda |
| AUD-07 | Ichki transferda tovar, birlik va tannarxni saqlash | 4/5 | P1 | Muhokama kutilmoqda |
| AUD-08 | Frontendda tenant almashtirishni to‘liq ishlatish | 4/5 | P0 | Muhokama kutilmoqda |
| AUD-09 | Login, OTP va urinish cheklovlarini bog‘lash | 4/5 | P1 | Muhokama kutilmoqda |
| AUD-10 | Parol tiklash tokenlarining hayot sikli | 4/5 | P1 | Muhokama kutilmoqda |
| AUD-11 | Profil va parol o‘zgarishlarining atomarligi | 4/5 | P1 | Muhokama kutilmoqda |
| AUD-12 | Filialdan tenantga migratsiya shartlari | 4/5 | P1 | Muhokama kutilmoqda |
| AUD-13 | Amallar va maydonlar bo‘yicha ruxsatlar | 3/5 | P0 | Muhokama kutilmoqda |
| AUD-14 | Tannarxni ko‘rish ruxsatini APIda qo‘llash | 3/5 | P1 | Muhokama kutilmoqda |
| AUD-15 | B2B qaytishlarini analitika va kamchilik hisobiga qo‘shish | 3/5 | P1 | Muhokama kutilmoqda |
| AUD-16 | Katalog tahriri va xato holatida rollback | 3/5 | P1 | Muhokama kutilmoqda |
| AUD-17 | Kategoriya valyutasi va narx chegaralari | 3/5 | P1 | Muhokama kutilmoqda |
| AUD-18 | Pul summalarini bir xil yaxlitlash | 3/5 | P1 | Muhokama kutilmoqda |
| AUD-19 | Paginatsiya, filtrlar va query validatsiyasi | 3/5 | P2 | Muhokama kutilmoqda |
| AUD-20 | Media va MinIO ulanishini yakunlash | 3/5 | P1 | Muhokama kutilmoqda |
| AUD-21 | Production deploy, TLS va ekspluatatsiya | 3/5 | P1 | Qisman bajarildi |
| AUD-22 | Hujjat versiyalari va rozilik dalili | 3/5 | P2 | Muhokama kutilmoqda |
| AUD-23 | Auditning to‘liqligi, tenant va IP aniqligi | 3/5 | P2 | Muhokama kutilmoqda |
| AUD-24 | Xodimni ishga olish va akkauntni faollashtirish | 3/5 | P1 | Muhokama kutilmoqda |
| AUD-25 | Katta frontend sahifalarini qismlarga ajratish | 3/5 | P3 | Muhokama kutilmoqda |
| AUD-26 | CI va regressiya tekshiruvlarini kuchaytirish | 2/5 | P1 | Muhokama kutilmoqda |
| AUD-27 | Avatar yuklashni haqiqiy rasm bilan cheklash | 2/5 | P0 | Muhokama kutilmoqda |
| AUD-28 | Saqlanadigan state hookidagi render sikli | 2/5 | P0 | Muhokama kutilmoqda |
| AUD-29 | Tashqi ta’sirlarni transactiondan keyin bajarish | 2/5 | P1 | Muhokama kutilmoqda |
| AUD-30 | Davriy hisobot va Telegram retry | 2/5 | P2 | Muhokama kutilmoqda |
| AUD-31 | JWT bekor qilish va frontend sessiya tiklanishi | 2/5 | P1 | Muhokama kutilmoqda |
| AUD-32 | Telegram 2FA kontaktini xavfsiz qayta bog‘lash | 2/5 | P1 | Muhokama kutilmoqda |
| AUD-33 | Brauzer xotirasidagi parolni olib tashlash | 1/5 | P0 | Muhokama kutilmoqda |
| AUD-34 | Kassa yopishda aniqlanmagan owner o‘zgaruvchisi | 1/5 | P1 | Muhokama kutilmoqda |
| AUD-35 | Egasi o‘chirilgan do‘konini qayta yoqa olishi | 1/5 | P2 | Muhokama kutilmoqda |
| AUD-36 | HEAD/OPTIONS so‘rovlari uchun ruxsat xaritasi | 1/5 | P2 | Muhokama kutilmoqda |
| AUD-37 | Public chekda qaytarilgan va sof summa | 1/5 | P2 | Muhokama kutilmoqda |
| AUD-38 | README, eski nomlar va holat yozuvlari | 1/5 | P3 | Muhokama kutilmoqda |

## 3. Vazifalar tafsiloti

### AUD-01 — Fiskal savdo va sotuvchi tekshiruvini yakunlash

**5/5 · P0 · Ochiq reja.**

**Dalil:** `ilbi/apps/sales/services/sale_service.py:24,94`; `ilbi/apps/tenants/models.py:11`; `ilbi/apps/tenants/seller_profile_service.py`; mavjud walkthrough’dagi launch talablari.

Sotuvchi profili va muddati tekshiriladi, `DEBUG=False` bo‘lsa savdo ataylab rad etiladi. Fiskal adapter, provayder tasdiqlaydigan natija va xatolar, dalil hujjatlari, identifikatorlarni shifrlash va saqlash muddati hali yakunlanmagan. `tax_identifier` DBda oddiy `CharField`; javobda maskalash saqlashdagi shifrlash o‘rnini bosmaydi. Operator review API mavjud, lekin to‘liq tekshiruv interfeysi va dalil jarayoni yo‘q.

**Taklif:** avval kelishilgan sotuvchi/fiskal jarayonni provayder bilan moslab tugatish. Hozirgi production taqiqini faqat `DEBUG=True` bilan chetlab o‘tishni yechim deb qabul qilmaslik.

**Bajarildi mezoni:** provayder javobi, qayta urinish va takroriy so‘rovlar boshqarilgan; sotuvchi dalili va review jarayoni ishlaydi; production gate uchun haqiqiy integratsiya dalili mavjud. Bog‘liq: T2.8, fiskal launch vazifalari.

**Muhokama/qaror — 2026-10-12:** foydalanuvchi eng qiyin birinchi vazifani muhokama qilishni va joriy holat uchun yechim tavsiyasini so‘radi. Quyidagilar agent taklifi; hali foydalanuvchi tasdiqlagan qaror emas. **Bajarilish:** boshlanmagan.

#### AUD-01 uchun taklif etilgan yechim

1. **Fiskal provayder orqali integratsiya.** Amaldagi reyestrdagi virtual kassa yechimidan boshlash. Tanlash mezonlari: hujjatlashtirilgan API va sandbox, chek yaratish va holatini aniqlash, takroriy so‘rovdan himoya, asl chek bo‘yicha qisman/to‘liq refund, tenant/do‘kon kesimidagi ro‘yxat, MXIK/markirovka talablari va uzilishdagi ruxsat etilgan oqim. Bitta provayder adapterini to‘liq ishlatish; boshqa provayder uchun adapter chegarasini saqlash. ILBI+provayder integratsiyasi reyestr/tasdiq talabini qanday qoplashi Soliq/OFD/TXKM bilan yozma aniqlashtiriladi.
2. **Sotuvchi va do‘konning fiskal ulanishi alohida.** Mavjud SellerProfile rasmiy sotuvchi tekshiruvini ifodalaydi. Har tenant uchun alohida fiskal ulanish: tegishli sotuvchi, provayder, ro‘yxatdan o‘tgan kassa identifikatori, test/haqiqiy muhit, credential referensi va ishlash holati. Bir sotuvchining tasdiqlanishi uning har bir do‘kon kassasi avtomatik tayyor degani emas. Production savdo faqat faol membership + amaldagi seller tasdig‘i + tayyor fiskal ulanish + tegishli mahsulot/to‘lov shartlari bo‘lsa ochiladi. DEBUG savdoni yoqish tugmasi bo‘lmaydi.
3. **Minimal dalil bilan seller review.** Tekshiruv uchun zarur rasmiy ma’lumot yoki dalil referensi yig‘iladi; har bir ownerdan bir xil ortiqcha hujjat talab qilinmaydi. Operator kim, qachon, qaysi dalil asosida qaror qilganini saqlaydi. Shaxsiy identifikator/zarur fayllarga cheklangan kirish, shifrlash/kalit boshqaruvi va kelishilgan saqlash muddati qo‘llanadi. Muhim rekvizit o‘zgarsa qayta review holati ochiladi.
4. **Savdo va fiskal operatsiya yozuvlari alohida.** Checkout uchun barqaror operation ID va idempotency kaliti; mahsulot nomi, narx, soliq/MXIK va tender ma’lumotlari snapshotda saqlanadi. DB transaction ichida tekshirish, tovar rezervi va yuborish yozuvi yaratiladi; tarmoq so‘rovi pul/stock locklarini ushlab turmaydi. Fiskal javob keyingi transactionda bir marta qo‘llanadi. Olingan fiskal belgi/raqam/QR alohida saqlanadi; ILBI elektron nusxa tokeni bilan aralashtirilmaydi. Pul qabul qilingan bo‘lsa uning real holati ham saqlanadi, noaniq fiskal natija sabab o‘chirilmaydi.
5. **Uzilish va noaniq natijani boshqarish.** Tavsiya etilgan holatlar: tayyorlandi, yuborilmoqda, tasdiqlandi, aniq rad etildi, natija noma’lum. Timeout aniq rad etildi deb yozilmaydi. Noma’lum holatda operation ID bo‘yicha provayderdan natija olinadi; provayder shartnomasiga mos idempotent retry qilinadi. Stock/pulni yakunlash yoki rezervni bo‘shatish shu aniqlangan natijaga bog‘lanadi. Offline savdo faqat tanlangan yechimning rasmiy qo‘llab-quvvatlangan tartibi bo‘yicha.
6. **Mahsulotlar va qaytarishlar.** Provayder talab qiladigan MXIK, o‘lchov/soliq va markirovka ma’lumoti tayyorlanadi. Rasmiy ro‘yxat bo‘yicha naqd mumkin bo‘lmagan pozitsiyalar bloklanadi; aralash savat uchun avval kelishilgan ajratilgan chek oqimi provayder bilan moslanadi. Refund asl fiskal chek va tenderga bog‘lanadi; B2B va ichki transferlarning tegishli hujjat oqimlari alohida aniqlashtiriladi.

**Taklif etilgan bajarish ketma-ketligi:**

1. Provayderga beriladigan aniq talablar va ILBI integratsiya sxemasini tayyorlash; rasmiy API/sandbox va maqom aniqligi.
2. Lokal biznes asosi: AUD-05 idempotency, AUD-18 yaxlitlash, AUD-03 refund, AUD-02/04 pul/stock va transaction qoidalarini tegishli tasklar bilan muvofiqlashtirish. Seller review va tenant fiskal ulanish modeli.
3. Bitta provayder adapteri, yuborish/reconciliation jarayoni va interfeysda aniq holatlar.
4. Sandboxda muvaffaqiyat, rad etish, timeoutdan keyingi topilgan chek, parallel takroriy so‘rov, qisman refund, expiry va cheklangan MXIK savati uchun tekshiruvlar; so‘ng tashqi tasdiq bilan bitta do‘kon pilot.

**Qayta o‘qilgan rasmiy manbalar:**

- [Soliq qo‘mitasining 2024-06-21 izohi](https://gov.uz/oz/soliq/news/view/14527): reyestrdagi/integratsiyalangan yechimlar va ikkilamchi fiskal hisob haqidagi tushuntirish. Bu manbadan ILBI uchun avtomatik ruxsat olindi deb xulosa qilinmaydi.
- [2026-04-28 reyestr o‘zgarishi](https://gov.uz/oz/soliq/news/view/159141): provayder/kassa/TXKMning joriy maqomini tanlash vaqtida tekshirish zarurligi. Bog‘langan OFD virtual kassa reyestri sahifasi bu ko‘rib chiqishda timeout berdi; muayyan provayderning joriy reyestr maqomi tasdiqlanmadi va provayder tanlanmadi.
- [2026-04-03 MXIK va to‘lov shakli izohi](https://gov.uz/oz/soliq/news/view/149988): tegishli ro‘yxat uchun naqd cheklovi, aralash savatga ikki chek tavsiyasi.
- LexUZning umumiy 943-son sahifasida kelajakdagi 2026-10-22 tahriri ham ko‘rinadi. 2026-10-12 sanasi bilan alohida ochish muvaffaqiyatli bo‘lmadi; kelajakdagi o‘zgarish hozir amalda deb qabul qilinmadi.

**Ochiq muhokama:** do‘konlarda hozir ishlatilayotgan kassa/provayder bor-yo‘qligi; tanlanadigan yechimning rasmiy API shartnomasi va integratsiya maqomi. Taxminiy API endpoint yoki provayder kafolati yozilmadi.

#### 2026-10-16 — production tayyorgarligining 2-qadami: fiskal ulanish talablari

**Tasdiqlangan doira:** mavjud kod va rasmiy provayder talablarini tekshirish, ulanish yo‘lini tayyorlash. Foydalanuvchi **hali provayder tanlamaganini** bildirdi. Ushbu qism tayyor; fiskal integratsiya bajarildi deb belgilanmaydi. Ilova kodi, DB va haqiqiy konfiguratsiya o‘zgartirilmadi; provayderga chek yoki murojaat yuborilmadi.

**Joriy kod bilan tasdiqlangan bo‘shliqlar:**

| Qism | Hozirgi holat va kerakli o‘zgarish |
|---|---|
| Sotuvchi va do‘kon | `SellerProfile.fiscal_provider` oddiy matn. Har bir do‘konga tegishli kassa/muhit/credential referensi va ulanish tekshiruvi kerak. Seller review va `tenants.manage_settings` mavjudligi fiskal ulanish tayyorligini anglatmaydi. |
| Mahsulot rekvizitlari | `ProductVariant`da MXIK/IKPU va qadoq kodi yo‘q. `sku`, do‘konning mahsulot `code`i va shtrix-kod bu rekvizitlarning o‘rnini bosmaydi. Markirovka talab qilinadigan mahsulotlar uchun har bir sotilayotgan birlik kodlarini yig‘ish oqimi ham alohida kerak. |
| O‘zgarmas chek ma’lumoti | `Sale.receipt_snapshot` do‘kon/sotuvchi/soliq sozlamalarini saqlaydi. `SaleItem`da mahsulot nomi, birlik va fiskal rekvizitlar nusxasi yo‘q; serializer nom va birlikni hozirgi katalogdan oladi. Katalog tahriri o‘tgan savdodagi mahsulot ta’rifini o‘zgartirmasligi kerak. |
| QQS | Do‘kon darajasida soliq sozlamalari va satr summalari bor. Mahsulotga xos stavka/imtiyoz va provayder qabul qiladigan soliq kodlari hali moslanmagan. AOS va foyda solig‘i QQS maydoniga yuborilmaydi. |
| Nasiya | `DebtPayment` kontragentga bog‘langan, asl `Sale`larga taqsimot yo‘q. Keyingi to‘lov, qaytarish va boshqa do‘konda undirilgan qarzni tegishli asl hujjatlarga bog‘lash kerak; eski umumiy qarzga taxminiy chek bog‘lanmaydi. |
| Qaytarish | `SaleRefund` va `SaleVoidLog` mavjud, ammo tashqi fiskal operatsiya va asl provayder cheki bilan aloqa yo‘q. Qaytarilgan satrlar, soliq, real to‘lov turi va takroriy urinish bitta o‘zgarmas refund operatsiyasiga bog‘lanishi kerak. |
| Tashqi so‘rov | Fiskal adapter, yuborish navbati va natijani qayta tekshirish jarayoni yo‘q. `create_sale()` DB transaction ichida stock/qarzni darhol o‘zgartiradi; unga tarmoq chaqiruvini shunchaki qo‘shish mumkin emas. |
| Production cheklovi | `create_sale()` yangi savdoni `DEBUG=False`da rad etadi. `DebtService` va `VoidService` bu gate orqali o‘tmaydi; ularning fiskalga tegishli amallari ham ulanish holatini tekshirishi kerak. Eski savdo nusxalari avtomatik fiskal chek deb belgilanmaydi. |

**Ko‘rib chiqilgan ikki nomzod — yakuniy tanlov emas:**

| Nomzod | Rasmiy manbada ko‘rinadigan imkoniyat | Tanlashdan oldin ochiq masala |
|---|---|---|
| Uzum Fiscalization | Ochiq API, test muhiti, savdo/qaytarish va operation ID orqali chek havolasini olish bor. | Mustaqil ILBI kassalari, turli STIRlar va tashqi terminal to‘lovlari uchun shartlar; takroriy so‘rov kafolati; nasiya va qisman refund tartibi. [Rasmiy hujjat](https://developer.uzumbank.uz/en/fiscalization/). |
| E-POS Communicator | Provayder REST API, chek holati va asl chek bo‘yicha qisman/to‘liq qaytarishni taklif qiladi. | To‘liq API hujjati integrator loginini talab qildi; sandbox, idempotency, autentifikatsiya va ko‘p do‘konli ulanish shartnomasi olinishi kerak. Ochiq marketing misoli asosida adapter yozilmaydi. [Mahsulot tavsifi](https://epos.uz/uz/products/api), [integrator hujjatlari](https://docs.epos.uz/). |

Uzum hujjatida API kaliti, tiyindagi butun summalar, MXIK va qadoq kodi ko‘rsatilgan. Bo‘nak/nasiya rejimlari alohida kelishiladi; HTTP 202 yakuniy fiskal tasdiq deb qabul qilinmaydi. Test va production kalitlari ajratilgan. Bu imkoniyatlar har qanday ILBI sotuvchisi avtomatik ulanadi degani emas. [Uzum rasmiy API hujjati](https://developer.uzumbank.uz/en/fiscalization/).

**Spetsifikatsiyada aniqlashtiriladigan farqlar:** rasmiy [OpenAPI 0.0.2](https://developer.uzumbank.uz/en/redocusaurus/en_fiscalization.yaml) o‘qildi: unda `servers` yo‘q; endpointlarning hostini hujjatdagi test/production yo‘riqnomasidan olish kerak. Schema GET yo‘lini `/v2/receipt/{operation_id}/receipt_url` deb beradi, testing matnida boshqa tartib yozilgan. Matnda markirovka `labels`i talab qilinadi, lekin tekshirilgan `ReceiptDataItem` schemasida bu maydon yo‘q. Qaysi shartnoma amaldaligi provayder bilan tasdiqlanadi. Ayniqsa timeoutdan keyingi 404 qayta POST qilish xavfsizligini o‘zi kafolatlamaydi.

**Reyestr maqomi:** Soliq qo‘mitasining [2026-04-28 xabari](https://gov.uz/oz/soliq/news/view/159141) amaldagi reyestrni tekshirishni tavsiya qiladi. Uning OFD virtual kassa reyestriga havolasi bu tekshiruvda ham ochilmadi. Muayyan yechimning joriy reyestr maqomi yoki ILBI uchun ruxsat tasdiqlandi deb yozilmaydi; tanlangan provayderdan kassa nomi/versiyasi, reyestr dalili va ILBI bilan ishlash tartibi olinadi.

**Provayder bilan aniqlashtirish uchun tayyor savollar:**

1. ILBI orqali ko‘p egali, turli STIRli do‘konlarga ulanish mumkinmi? Har do‘kon/kassa qanday ro‘yxatdan o‘tadi, kimning nomida chek chiqadi va TXKM kim bo‘ladi?
2. Naqd hamda mavjud tashqi Uzcard/Humo terminali to‘lovlari alohida qo‘llanadimi? To‘lov va fiskalizatsiya APIlari qanday ajratilgan?
3. Amaldagi OpenAPI, sandbox va hisob ochish shartlari qanday? Sinovdan productionga o‘tish uchun qaysi tasdiqlar kerak?
4. Bir operation ID bilan takroriy so‘rov, boshqa payload, timeout, 202 va vaqtinchalik 404 qanday boshqariladi? Holatni so‘rash muddati, webhook imzosi va qayta urinish chegaralari qanday?
5. Nasiya savdosi, keyingi qarz to‘lovi va qisman/to‘liq refund asl hujjatga qanday bog‘lanadi? Offline rejim mavjud bo‘lsa rasmiy tartibi qanday?
6. MXIK/qadoq, kasr miqdor, QQS/imtiyoz, markirovka va naqd cheklangan tovarlar uchun tekshirish qoidalari qanday? API cheklovlari, yaxlitlash va chekdagi fiskal rekvizitlar tarkibi qanday?
7. Har kassa/chek uchun tarif, ulash xarajati, xizmat uzilishi va yordam shartlari qanday? ILBI interfeysi orqali ishlashning rasmiy maqomi qanday tasdiqlanadi?

Bu savollar hech kimga yuborilmadi; ular provayderdan olinadigan texnik/tashkiliy javoblar ro‘yxati.

**2.1 uchun dastlabki taklif (bajarilish natijasi quyida):** mahsulot variantiga ixtiyoriy MXIK va qadoq rekvizitlari; katalog API/formasida tahrirlash; yangi savdo satrida mahsulot nomi, birlik va shu rekvizitlarning o‘zgarmas nusxasi. O‘tgan savdolarga hozirgi katalog ma’lumotidan sun’iy tarix yozilmaydi; eski satrlar mavjud ko‘rinishi bilan o‘qiladi. Bu bosqich provayder chaqiruvi yoki production savdosini ochishni o‘z ichiga olmaydi.

- **Tegiladigan qismlar:** `apps/catalog/models/product_variant_model.py`, katalog serializer/service/formalari; `apps/sales/models/sale_item_model.py`, `sale_service.py`, savdo/public chek serializerlari; nullable maydonlar uchun migratsiyalar va tegishli testlar.
- **Qabul mezoni:** rekvizit kiritish/o‘qish va tenant ruxsati ishlaydi; katalog tahrirlanganda yangi savdoning saqlangan tavsifi o‘zgarmaydi; eski cheklar ochiladi; summa/QQS/refund xulqi saqlanadi; production gate testi o‘tadi.
- **So‘nggi alohida qismlar:** do‘kon fiskal ulanishi va ruxsatlar; mahsulot soliq/markirovka qoidalari; provayder shartnomasiga mos operatsiya/rezerv/yuborish/natijani tekshirish; nasiya/refund taqsimoti; adapter va sandbox sinovlari; yozma tashqi tasdiqdan so‘ng bitta do‘kon pilot. Har birining aniq doirasi bajarishdan oldin kelishiladi.

**Tekshiruv natijasi:** tegishli model/service/serializerlar statik o‘qildi, rasmiy sahifalar va ochiq OpenAPI tekshirildi. API kaliti, sandboxga haqiqiy so‘rov yoki yangi dastur kodi bo‘lmagani uchun integratsiya testi bajarilmadi. Ushbu yangilanish faqat audit hujjatiga tegishli.

#### 2026-10-16 — 2.1-qadam bajarildi: katalog rekvizitlari va chek mahsulot nusxasi

**Qaror:** foydalanuvchi 2.1 haqidagi savolga tanlovni agentga topshirdi; taklif etilgan 2.1 bajarildi. Provayder tanlash, haqiqiy fiskal so‘rov va production savdosini ochishga bu qaror tatbiq etilmadi.

- `ProductVariant.mxik` va `package_code` nullable/ixtiyoriy maydonlar. MXIK formati, qadoq kodi uzunligi va boshqaruv belgilari tekshiriladi. Kodlar matn ko‘rinishida saqlanadi; sonli JSON qiymati rad etiladi va boshidagi nollar saqlanadi. Bu format tekshiruvi kodning rasmiy katalogda mavjudligini tasdiqlamaydi.
- Mahsulot yaratish, birinchi/qo‘shimcha variant va mahsulot/variant PATCH APIlari yangi rekvizitlarni qabul qiladi. PATCHda yuborilmagan maydon saqlanadi, bo‘sh/null yuborilsa tozalanadi. Mavjud katalog ruxsatlari va tenant chegarasi qo‘llanadi.
- Katalogning yaratish/tahrirlash formalariga umumiy `FiscalMetadataFields` qo‘shildi; JSON va rasm bilan multipart yuborish ishlaydi. Oldin saqlangan, yangi maydonlari yo‘q qoralamalar ham ochiladi.
- Yangi `SaleItem.product_snapshot` savdo vaqtida mahsulot nomi, variant nomi, birlik, SKU, kod, shtrix-kod va fiskal rekvizitlarni saqlaydi. Savdo tafsiloti, public chek va B2B kirim serializerlari shu nusxadan o‘qiydi. Takroriy checkout oldingi nusxani qaytaradi; qaytarish uni yangilamaydi.
- Legacy satrda snapshot `NULL` qoladi: avvalgi nom/birlik ko‘rinishi saqlanadi, yangi MXIK/qadoq qiymatlari tarixga to‘qib yozilmaydi. Yangi savdoda bo‘sh qolgan rekvizit keyinchalik katalogdan to‘ldirib olinmaydi.
- `ReceiptItemCodes` saqlangan rekvizitlarni 58/80 mm va public chek nusxasida mavjud bo‘lsa ko‘rsatadi. Amaldagi soliq hisoblash, summa va production gate saqlandi.

**Migratsiyalar:** `catalog/0006_productvariant_mxik_productvariant_package_code.py`, `sales/0016_saleitem_product_snapshot.py`. Ajratilgan test bazasi va tekshirilgan lokal development Compose backendida qo‘llandi. Lokal bazadagi oldingi `ProductVariant`, `SaleItem` va `Sale` yozuvlarining yangi maydonlardan tashqari qiymatlari hamda soni oldin/keyin hash bilan bir xil chiqdi. Mavjud mahsulotlarga kod va eski savdo satrlariga snapshot yozilmadi. Production serverga deploy qilinmadi.

**Tekshiruvlar:**

- To‘liq ajratilgan backend pytest: **628 passed**, shu jumladan **17 yangi test**. Avvalgi Django email sozlamalari bo‘yicha deprecation ogohlantirishlari mavjud.
- `npm test`, frontend lint va production build muvaffaqiyatli. Lintdagi avvalgi ogohlantirishlar alohida ochiq; yangi komponentlar va yangi browser test lint tekshiruvi o‘tdi.
- `npm run test:catalog-fiscal`: haqiqiy React formalarida JSON/multipart yaratish/tahrirlash, boshidagi nollar, tozalash, eski qoralama, validatsiya va mobil maydonlar; 58/80 mm hamda public chekda saqlangan/legacy rekvizit ko‘rinishi tekshirildi. Haqiqiy bazaga test mahsuloti yoki savdo yozilmadi.
- `npm run test:receipts`: QQS rejimlari, AOS/foyda solig‘i, qog‘oz eni va chek sozlamalari regressiyasi o‘tdi.
- Django `check`, `makemigrations --check --dry-run`, OpenAPI `spectacular --validate --fail-on-warn` hamda yangi Python fayllari uchun Ruff tekshiruvi o‘tdi.
- Migratsiyadan so‘ng lokal API orqali **7 ta faol do‘kon katalogi** va mavjud legacy public chek GET bilan tekshirildi; barchasi ochildi, test mahsuloti/savdosi yaratilmagan.

**Keyingi taklif — 2.2, hali tasdiqlanmagan:** har do‘kon uchun fiskal ulanishning alohida yozuvi va **Xizmatlar & Sozlamalar**da sozlash oynasi; uni boshqarish uchun `tenants.manage_fiscal_connection` ruxsati. Bu bosqichda sotuvchi/provayder, test yoki production muhiti, ro‘yxatdan o‘tgan kassa rekviziti va tekshiruv holati boshqariladi. Ruxsat sotuvchi profilini rasmiy tasdiqlash yoki production savdosini ochish vakolatini bermaydi. Ulanish rekvizitlari o‘zgarsa tekshiruv yangilanadi; foydalanuvchi `tayyor/tasdiqlangan` holatini qo‘lda yoqa olmaydi. Haqiqiy adapter va tashqi tasdiq keyingi alohida ishda bo‘ladi; API siri public chek yoki oddiy do‘kon sozlamasi javobiga qo‘shilmaydi.

### AUD-02 — Smena va kassa hisobini yaxlit qilish

**5/5 · P0 · Kodda aniq va parallel bajarishda shartli xavf.**

**Dalil:** `ilbi/apps/cashbox/services/cashbox_service.py:78,186`; `ilbi/apps/cashbox/models.py`; `ilbi/apps/sales/models/debt_payment_model.py`.

Smena alohida identifikator bilan yuritilmaydi: oxirgi hisobot va `Sale.created_at`dan hisoblanadi. `close_shift()` transaction ichida, lekin smenani yopishni seriallashtiruvchi lock yo‘q. Ikki yopish so‘rovi bir xil tushum uchun ikki hisobot yaratishi mumkin. Hisoblangandan keyin qo‘shilgan kirim/chiqim keyingi umumiy `update()` bilan oldingi hisobga bog‘lanishi mumkin. Boshlang‘ich naqd, o‘tgan smenadan qolgan pul, real qarz to‘lovining tenderi va boshqa smenada bajarilgan refund alohida hisoblanmaydi.

**Taklif:** smena chegarasi va pul harakati yozuvini aniq belgilash; yopish, savdo va kirim/chiqimni bitta muvofiqlashtirilgan tartibga keltirish. Naqd, karta/bank, qarz kamayishi va mijoz krediti alohida tushuncha bo‘lsin.

**Bajarildi mezoni:** parallel yopishda bitta yakuniy hisobot; hisoblangan yozuvlar bilan bog‘langan yozuvlar bir xil; boshlang‘ich qoldiq, naqd qarz to‘lovi va turli smenadagi refund to‘g‘ri chiqadi. Bog‘liq: T5.2–T5.3, AUD-03/04/05.

**Muhokama/qaror:** hali yo‘q. **Bajarilish:** boshlanmagan.

### AUD-03 — Savdo bekori, qaytarish va asl chek summasini ajratish

**5/5 · P1 · Kodda aniq.**

**Dalil:** `ilbi/apps/sales/services/void_service.py:38,117,173`; `ilbi/apps/sales/models/sale_model.py`; `ilbi/api/v1/inventory/views/movement_views.py`.

`void_sale_item()` asl `total_amount`ni kamaytiradi; `void_sale()` to‘liq bekor qilishda uni saqlaydi. `refunded_amount` retail voidda yangilanmaydi. Bir xil chek uchun ikki xil hisob qoidasi paydo bo‘lgan. Inventar mijoz qaytarishi esa asl sotuv va tender bilan majburiy bog‘lanmagan: omborni oshirib, savdo/qarzni o‘zgartirmasligi mumkin. Voidning 7 kunlik texnik chegarasi iste’molchi qaytarish jarayoniga ham aralashgan.

**Taklif:** avval kelishilganidek xato savdoni tuzatish, mijoz qaytarishi va jismoniy qabulni ajratish; asl summani o‘zgartirmaslik; refund/qarz/kreditni alohida yozuvda saqlash.

**Bajarildi mezoni:** 100 000 so‘mlik chekdan 20 000 qaytarilganda asl summa 100 000, qaytarilgan 20 000, sof 80 000; qisman va to‘liq qaytarish shu qoidaga amal qiladi; tovar va pul ikki marta qaytarilmaydi. Bog‘liq: T4.4–T4.5/T4.10.

**Muhokama/qaror:** hali yo‘q. **Bajarilish:** boshlanmagan.

### AUD-04 — Parallel amallarda yagona lock tartibi

**5/5 · P1 · Shartli xavf, kodda tartib farqi aniq.**

**Dalil:** `ilbi/apps/sales/services/sale_service.py:183,233`; `ilbi/apps/sales/services/b2b_transfer_service.py:481,657`; `ilbi/apps/inventory/services/stock_service.py:141`; `ilbi/apps/catalog/services/product_service.py:22`; `ilbi/apps/catalog/services/category_service.py:18`; `ilbi/apps/tenants/services.py:53`.

Savdo Stockni, keyin Counterpartyni lock qiladi; B2B qaytish Counterpartyni, keyin Stockni lock qiladi. Bir xil qoldiq va kontragentda ular o‘zaro kutishga tushishi mumkin. Batch kirim foydalanuvchi yuborgan tartibda ishlaydi. SKU/kod generatsiyasi mavjud qatorlarni lock qiladi, bo‘sh katalogda esa lock qiladigan qator yo‘q; birinchi parallel yaratishlar bir xil kod olishi mumkin. Tenant maksimumini `count()` bilan tekshirish parallel yaratishga chidamli emas.

**Taklif:** barcha tegishli servislar uchun yagona lock tartibi, bo‘sh to‘plamlar uchun barqaror lock va konfliktlarni boshqarish.

**Bajarildi mezoni:** savdo/qaytish, teskari tartibdagi batch kirim, bo‘sh katalog yaratish va tenant limiti uchun parallel tekshiruvlar o‘tadi; deadlock/unique konflikt foydalanuvchiga 500 bermaydi. Bog‘liq: reja §4.4/4.6, T4.12.

**Muhokama/qaror:** hali yo‘q. **Bajarilish:** boshlanmagan.

### AUD-05 — POS va qarz to‘lovlarining idempotency himoyasi

**4/5 · P1 · Kodda aniq.**

**Dalil:** `ilbi/apps/sales/services/sale_service.py:74`; `ilbi/apps/sales/models/sale_model.py`; `frontend/ilbi/src/pages/POS.jsx:457`; `ilbi/apps/sales/services/debt_service.py:17`.

POS so‘rovi `idempotency_key` yubormaydi. Backendda kalit oddiy index, unique constraint yoki payload hash yo‘q. Mavjud savdoni izlash receipt lockidan oldin: ikki so‘rov bir vaqtda “yo‘q” deb topib, keyin navbat bilan ikkita savdo yaratishi mumkin. Shu kalit bilan boshqa savat yuborilsa ham eski savdo qaytadi. Qarz to‘lovi takroriy so‘rovda qarzni yana kamaytiradi.

**Taklif:** checkout/to‘lov urinishiga kalit berish; noaniq tarmoq xatosidan keyin aynan shu kalitni saqlash; DB himoyasi va payload mosligini tekshirish.

**Bajarildi mezoni:** javobi yo‘qolgan so‘rovni takrorlash yangi savdo/to‘lov yaratmaydi; parallel bir xil so‘rov bir marta hisoblanadi; o‘zgargan payload bir xil kalit bilan rad etiladi. Bog‘liq: T4.9/T4.11.

**Muhokama/qaror:** hali yo‘q. **Bajarilish:** boshlanmagan.

### AUD-06 — B2B kontragentni aniq do‘kon va rozilik bilan bog‘lash

**4/5 · P1 · Kodda aniq.**

**Dalil:** `ilbi/apps/sales/services/counterparty_service.py:16,47`; `ilbi/api/v1/sales/serializers.py:38`.

Telefon raqami bilan User izlanib, uning birinchi faol do‘koni yoki xodimlik do‘koni avtomatik `target_tenant`ga aylanadi. Ko‘p do‘konli egada `.first()` qaysi do‘kon mo‘ljallanganini bilmaydi. Oddiy mijozni saqlash kutilmaganda B2B savdoga aylanishi mumkin. Manba tenantning o‘ziga bog‘lashdan ham shu servisda alohida himoya yo‘q.

**Taklif:** avval kelishilgan public tenant code va aniq tanlov/tasdiq oqimini qo‘llash; telefonni aloqa ma’lumoti sifatida ishlatish.

**Bajarildi mezoni:** oddiy kontragent yaratish B2B bog‘lanishni o‘zidan yaratmaydi; ko‘p tenantli ega, o‘z do‘koniga bog‘lash va boshqa sellerning tasdiqlashi tekshirilgan. Bog‘liq: T4.7/D-19.

**Muhokama/qaror:** hali yo‘q. **Bajarilish:** boshlanmagan.

### AUD-07 — Ichki transferda tovar, birlik va tannarxni saqlash

**4/5 · P1 · Kodda aniq.**

**Dalil:** `ilbi/apps/inventory/services/transfer_service.py:40,86,257`; `ilbi/apps/sales/services/sale_service.py:212`.

Manzil varianti mahsulot/variant nomi bilan avtomatik tanlanadi; birlik va valyuta mosligi majburiy tekshirilmaydi. Masalan, nomi bir xil “kg” va “dona” qoldiqlari qo‘shilib ketishi mumkin. `_apply()` transfer qabulida `last_cost_price`ni olib o‘tmaydi: yangi manzil Stockida tannarx bo‘sh qoladi, keyingi savdoda 0 olinadi va foyda sun’iy oshadi. Qabul bosqichida dispatchdan keyin o‘zgargan seller bog‘lanishi ham qayta tekshirilmaydi.

**Taklif:** tovarni moslash mezonini birlik/valyuta bilan aniqlash; jo‘natilgan tannarxni qator snapshotida saqlash; qabul/qaytishdagi seller vakolatini kelishilgan siyosat bilan tekshirish.

**Bajarildi mezoni:** nomi bir xil, birligi/valyutasi boshqa tovarlar avtomatik qo‘shilmaydi; transferdan keyingi tannarx va foyda to‘g‘ri; keyinchalik seller o‘zgarsa pending transfer uchun aniq qoida bor. Bog‘liq: T1.10.

**Muhokama/qaror:** hali yo‘q. **Bajarilish:** boshlanmagan.

### AUD-08 — Frontendda tenant almashtirishni to‘liq ishlatish

**4/5 · P0 · Kodda aniq.**

**Dalil:** `frontend/ilbi/src/pages/Services.jsx:89,156`; `Sales.jsx:167`; `Dashboard.jsx:82`; `Audit.jsx:14`; `Employees.jsx:44`; `components/layout/Layout.jsx:94`; `src/api/client.js:115`.

Header almashtirilganda API client yangi tenantni yuboradi, lekin Services, Dashboard, Audit, notifications va Sales yuklashlarining ayrim dependencylarida active tenant yo‘q. Servicesda A do‘konining eski formasi ekranda qolib, saqlash B do‘koniga ketishi mumkin. Employees eski `user.tenant_id`ga tayanib, u bo‘lmasa `1`ni tanlaydi. Tez almashtirishda oldingi async javoblar yangi tenant stateini ham bosishi mumkin.

**Taklif:** yuklash va saqlashda aniq tenant kontekstini ishlatish; tenant o‘zgarishida eski ma’lumot/modalni yopish yoki yangilash; eski so‘rov javoblarini bekor qilish/inkor etish.

**Bajarildi mezoni:** A→B almashishda barcha biznes sahifalar yangilanadi; A formasi Bga saqlanmaydi; tenant tanlanmaguncha biznes so‘rovlar ketmaydi; tez almashish va bir nechta tab tekshirilgan. Bog‘liq: T2.6.

**Muhokama/qaror:** hali yo‘q. **Bajarilish:** boshlanmagan.

### AUD-09 — Login, OTP va urinish cheklovlarini bog‘lash

**4/5 · P1 · Kodda aniq.**

**Dalil:** `ilbi/api/v1/accounts/views/admin_login.py`; `ilbi/apps/accounts/services/otp_services.py:49`; `login_throttle.py:75,113`.

OTP tasdiqlashda parol bosqichi o‘tilganini bildiradigan bir martalik ticket yo‘q: username va telefon uchun saqlangan kod tekshiriladi. OTPni o‘qish va o‘chirish alohida Redis buyruqlari, parallel tasdiqlar ikkalasi ham muvaffaqiyatli bo‘lishi mumkin. Throttle username/telefon/email kirish matni bilan alohida yuradi, permanent ban esa faqat `username` bo‘yicha update qiladi. Shu accountning uch identifikatori himoyada bir xil subyekt hisoblanmaydi.

**Taklif:** parol bosqichini qisqa muddatli ticket bilan bog‘lash; OTP/ticketni atomar iste’mol qilish; account va IP cheklovlarini normalizatsiya qilish.

**Bajarildi mezoni:** ticketsiz ikkinchi bosqich rad etiladi; parallel OTPda bitta muvaffaqiyat; uch login shakli bir account uchun bir xil hisoblagichga ega. Bog‘liq: T7.1–T7.3.

**Muhokama/qaror:** hali yo‘q. **Bajarilish:** boshlanmagan.

### AUD-10 — Parol tiklash tokenlarining hayot sikli

**4/5 · P1 · Kodda aniq.**

**Dalil:** `ilbi/apps/accounts/services/password_reset_service.py:390,544,554`; `ilbi/api/v1/accounts/views/password_reset.py:41`; `ilbi/api/v1/accounts/serializers.py`.

Yangi reset so‘rovi avvalgi tokenni bekor qilmaydi. Tasdiqlashda token username validatsiyasidan oldin o‘chadi: band username tanlash havolani yaroqsiz qiladi. Token berilgandan keyin xodim bo‘shatilgan yoki account bloklangan bo‘lsa confirm bosqichida vakolat qayta tekshirilmaydi. Username mavjud accountda ham almashtiriladi, serializer izohi esa faqat birinchi o‘rnatishni va’da qiladi. Request view yuborish xatosi/cooldown natijasini e’tiborsiz qoldirib “yuborildi” deydi; `email_hint/has_email` esa ma’lum va noma’lum accountni farqlaydi.

**Taklif:** accountga tegishli bitta faol reset sikli, tokenni yakuniy muvaffaqiyatga mos iste’mol qilish, joriy membership/faollik tekshiruvi va bir xil tashqi javob siyosati.

**Bajarildi mezoni:** eski token yangi so‘rovdan keyin ishlamaydi; username xatosidan keyin qayta urinish mumkin; fire/ban eski linkni ishlatmaydi; yuborish muvaffaqiyatsiz bo‘lsa soxta muvaffaqiyat ko‘rsatilmaydi. Bog‘liq: T7.4.

**Muhokama/qaror:** hali yo‘q. **Bajarilish:** boshlanmagan.

### AUD-11 — Profil va parol o‘zgarishlarining atomarligi

**4/5 · P1 · Shartli parallel xavf va kodda aniq validatsiya bo‘shlig‘i.**

**Dalil:** `ilbi/api/v1/accounts/views/profile_views.py:24,128`; `complete_profile.py`; `ilbi/apps/accounts/services/password_reset_service.py:524,575`.

Profil tahriri `user.save()` bilan barcha ustunlarni eski instance’dan yozadi. Boshqa so‘rov parol/token_version/is_active ni o‘zgartirgach, kechroq tugagan profil so‘rovi eski qiymatlarni qayta yozishi mumkin. Parol yo‘llarida asosan uzunlik tekshiriladi, settingsdagi `AUTH_PASSWORD_VALIDATORS` qo‘llanmaydi. Emailni o‘zgartirishda qayta tasdiq yo‘q; reset email bo‘yicha `.first()` ishlatadi, email esa DBda unique emas.

**Taklif:** xavfsizlik o‘zgarishlarini transaction/lock bilan, oddiy profilni faqat tegishli `update_fields` bilan yozish; parol validatorlarini qo‘llash; emailga oid avval kelishilgan siyosatni bajarish.

**Bajarildi mezoni:** parallel profil PATCH parol resetini yoki banni qaytarmaydi; zaif parol rad etiladi; email orqali reset qaysi accountga tegishli ekanligi noaniq bo‘lmaydi. Bog‘liq: T7.6.

**Muhokama/qaror:** hali yo‘q. **Bajarilish:** boshlanmagan.

### AUD-12 — Filialdan tenantga migratsiya shartlari

**4/5 · P1 · Shartli xavf.**

**Dalil:** `ilbi/apps/inventory/migrations/0006_remove_branches_one_stock_per_variant.py`; `ilbi/apps/tenants/migrations/0008_remove_branch_model.py`; `0011_delete_branch_after_scope_removal.py`; accounts/sales/cashboxdagi branch removal migratsiyalari.

Migratsiya branch va eski transfer jadvallarini o‘chiradi, Stockni variant uchun `OneToOneField` qiladi. Ikki filialda bir variantning qoldig‘i mavjud bo‘lsa unique o‘zgarish bajarilmaydi. Eski branch, narx va tarixni alohida tenantga ko‘chirish `RunPython` bosqichi yo‘q.

**Audit davomida yangilangan dalil:** tashqi o‘zgarishda Branch o‘chirish `0008`dan yangi `0011`ga ko‘chirildi; accounts/cashbox/sales branch removal dependencylari va jadval mavjudligini tekshirish qo‘shildi. Avval kuzatilgan erta o‘chirish holati hisobotda hozirgi kodga mos yangilandi. Bu populated DBdagi ko‘p Stock qatori va tarixni tenantlarga ko‘chirish masalasini o‘zidan yopmaydi; toza va eski DB oqimlari hali ushbu auditda ishga tushirilmagan.

Mavjud master reja DBni disposable deb belgilagan. Shuning uchun eski ma’lumotni yo‘qotish hozirgi bo‘sh/test DB uchun o‘zidan alohida production zarar deb baholanmadi; muammo populated DB yoki mavjud ma’lumotni saqlash talabida yuz beradi.

**Taklif:** disposable DB bilan boshlash va ma’lumotni saqlab ko‘chirish holatlarini hujjatda aniq belgilash; kerak bo‘lsa oldinga yo‘nalgan ko‘chirish migratsiyasi va to‘g‘ri dependencylar.

**Bajarildi mezoni:** toza DB va ikki filialda qoldig‘i bor eski DB uchun kelishilgan strategiya tekshirilgan; mavjud tarix taqdiri ochiq yozilgan. Bog‘liq: T1.1/T1.6.

**Muhokama/qaror:** hali yo‘q. **Bajarilish:** boshlanmagan.

### AUD-13 — Amallar va maydonlar bo‘yicha ruxsatlar

**3/5 · P0 · Kodda aniq.**

**Dalil:** `ilbi/api/v1/cashbox/views/cashbox_views.py:20,51,96`; `ilbi/config/settings.py:147`; `ilbi/api/v1/catalog/views/product_views.py:73,293`; `ilbi/api/v1/tenants/views.py:326,347`.

Kassa view/base’da action permission yo‘q, REST defaults’da ham permission belgilanmagan. Membership bor xodim, alohida vakolatsiz, chiqim/kirim yozishi va smenani yopishi mumkin. Mahsulot yaratishdagi `initial_quantity` ombor kirimini faqat `catalog.add_product` bilan bajaradi. Variant archive endpointi `archive_product` o‘rniga `change_product` talab qiladi. Telegram test endpointi oddiy autentifikatsiyali staffga maxsus group ID berishga ruxsat beradi. Transfer target view platform admin uchun `self.tenant=None` holatini ishlovsiz qoldiradi.

**Taklif:** mavjud ruxsat katalogini har amal va maydon guruhiga qo‘llash; owner-only amallarni alohida saqlash; defaults’da xavfsiz rad etish.

**Bajarildi mezoni:** nol ruxsatli faol staff kassa yozuvini/smena yopishni bajara olmaydi; initial stock uchun tegishli ombor vakolati kerak; admin target so‘rovi 500 bermaydi. Bog‘liq: T3.1–T3.3.

**Muhokama/qaror:** hali yo‘q. **Bajarilish:** boshlanmagan.

### AUD-14 — Tannarxni ko‘rish ruxsatini APIda qo‘llash

**3/5 · P1 · Kodda aniq.**

**Dalil:** `ilbi/api/v1/sales/serializers.py:77`; `ilbi/api/v1/inventory/serializers.py:9,30`; sale/stock viewlarining serializer chaqiruvlari.

`sales.view_sale` bor xodimga `cost_price`, `inventory.view_stock` bor xodimga `last_cost_price` va movement `cost_price` qaytadi. `catalog.view_cost_price` alohida tekshirilmaydi; serializerlarda foydalanuvchi konteksti ham bu maqsadda berilmagan. Frontend ustunni yashirishi API javobidagi tannarxni himoya qilmaydi.

**Taklif:** tannarx maydonlarini serializer darajasida vakolatga qarab chiqarish; barcha javob yo‘llarini tekshirish.

**Bajarildi mezoni:** tannarx ruxsatisiz list/detail/create/void javoblarida cost maydoni yo‘q; ruxsatli staff va ownerda bor. B2B va public chekdagi mavjud whitelist saqlanadi. Bog‘liq: T3.5/D-08.

**Muhokama/qaror:** hali yo‘q. **Bajarilish:** boshlanmagan.

### AUD-15 — B2B qaytishlarini analitika va kamchilik hisobiga qo‘shish

**3/5 · P1 · Kodda aniq.**

**Dalil:** `ilbi/apps/analytics/services/analytics_service.py:104,279`; `ilbi/apps/inventory/services/deficit_service.py:39`.

Analitika faol miqdorni faqat `quantity - voided_quantity` bilan hisoblaydi. B2Bning jismonan qaytgan va tafovuti yopilgan miqdorlari ayirilmaydi. Qisman qabul qilingan savdoning qolgan qismi return-pending bo‘lganda sale statusi butunlay hisobotdan chiqib ketadi; qabul qilingan qism ham yo‘qoladi. Deficit filtri yangi `b2b_partially_accepted` item statusini qamramaydi. Sana chegaralari UTC bo‘yicha, frontend esa brauzer mahalliy sanasidan foydalanadi.

**Taklif:** yangi miqdor bucketlari va kelishilgan hisobot semantikasini yagona hisobga keltirish; Tashkent kun chegaralarini ishlatish.

**Bajarildi mezoni:** qisman qabul + pending return + physical return + discrepancy closure ketma-ketligida tushum/foyda/deficit izchil; mahalliy yarim tunda bir xil sana ko‘rinadi. Bog‘liq: T5.1/T6.1.

**Muhokama/qaror:** hali yo‘q. **Bajarilish:** boshlanmagan.

### AUD-16 — Katalog tahriri va xato holatida rollback

**3/5 · P1 · Kodda aniq.**

**Dalil:** `ilbi/api/v1/catalog/views/product_views.py:73,105,141,179,242`.

Mahsulot + boshlang‘ich kirim yaratishda barcha exceptionlar transaction ichida ushlanib Response qaytariladi: mahsulot yaratilgach kirimda biznes xatosi bo‘lsa, tashqi transaction muvaffaqiyatli tugab, foydalanuvchi 400 ko‘rsa ham mahsulot qolishi mumkin. Product PATCH avval mahsulotni saqlaydi, keyin variantni; variant xatosi birinchi o‘zgarishni qaytarmaydi. Noto‘g‘ri `variant_id` bo‘lsa rad etish o‘rniga birinchi variant tahrirlanadi. Variant PATCHdagi save va narx auditi ham bitta transactionda emas.

**Taklif:** bog‘liq yaratish/tahrirni to‘liq atomar qilish; faqat kutilgan biznes xatolarini xavfsiz javobga aylantirish; aniq tanlangan variantni tekshirish.

**Bajarildi mezoni:** kirim/variant/audit xatosida yarim mahsulot yoki yarim tahrir qolmaydi; noto‘g‘ri variant ID bilan boshqa variant o‘zgarmaydi. Bog‘liq: servis qatlamiga oid reja qoidalari.

**Muhokama/qaror:** hali yo‘q. **Bajarilish:** boshlanmagan.

### AUD-17 — Kategoriya valyutasi va narx chegaralari

**3/5 · P1 · Kodda aniq.**

**Dalil:** `ilbi/apps/catalog/services/category_service.py:122`; `ilbi/api/v1/catalog/views/product_views.py:147`; `ilbi/api/v1/catalog/serializers.py`.

Variant valyutasi kategoriyadan olinadi. Qoldig‘i va tarixi bor kategoriya UZS→USDga o‘zgartirilishi yoki mahsulot boshqa valyutadagi kategoriyaga ko‘chirilishi mumkin: narx va qoldiq qiymati konvertatsiyasiz boshqa birlikda talqin qilinadi. Oddiy katalog narx serializerlarida `min_value` yo‘q, manfiy narxlar saqlanishi mumkin.

**Taklif:** tarix/qoldiq bor tovarning valyutasini tasodifan o‘zgartirishdan himoya; manfiy narxni rad etish. B2Bdan yaratilgan variantdagi kelishilgan 0 narx holatini hisobga olish; advisory `price_min`ni savdoga taqiq qilib yubormaslik.

**Bajarildi mezoni:** tarixli kategoriya va product move valyutani yashirin o‘zgartirmaydi; manfiy narx rad etiladi. Bog‘liq: T9.7/D-21.

**Muhokama/qaror:** hali yo‘q. **Bajarilish:** boshlanmagan.

### AUD-18 — Pul summalarini bir xil yaxlitlash

**3/5 · P1 · Kodda aniq.**

**Dalil:** `ilbi/apps/sales/services/sale_service.py:183,227`; `b2b_transfer_service.py:485,661`; reja §4.2.

`qty * unit_price` ikki xonaga yaxlitlanmasdan line va sale summasiga qo‘shiladi; DB saqlashda har ustun alohida yaxlitlanadi. Ikki qatorning har biri `0.333 × 0.05 = 0.01665` bo‘lsa, qatorlar 0.02+0.02=0.04, savdo jami esa 0.03 bo‘lishi mumkin. B2B qaytishda `quantize(0.01)` ishlatiladi, lekin rejalashtirilgan `ROUND_HALF_UP` aniq berilmagan; qismlarga bo‘lib qaytarishda ham yaxlitlash qoldig‘i boshqarilmaydi.

**Taklif:** yagona money helper, yaxlitlangan qatorlar yig‘indisi va qaytarishning kumulyativ summa qoidasi.

**Bajarildi mezoni:** fractional quantityda sale jami qatorlar yig‘indisiga teng; to‘liq qaytarishning yig‘ilgan qiymati asl qiymatga teng va undan oshmaydi. Bog‘liq: T4.9/reja §4.2.

**Muhokama/qaror:** hali yo‘q. **Bajarilish:** boshlanmagan.

### AUD-19 — Paginatsiya, filtrlar va query validatsiyasi

**3/5 · P2 · Kodda aniq.**

**Dalil:** `ilbi/api/v1/sales/views/sale_views.py:36`; inventory movement va cashbox list viewlari; `frontend/ilbi/src/pages/Sales.jsx:167,655`; `src/api/client.js`dagi list metodlari.

Ko‘p listlar `page` bo‘lmasa barcha qatorlarni qaytaradi; movement/cashbox/payment listlarining ayrimlari `page`ni umuman qo‘llamaydi. POS/katalog barcha variantni yuklab, frontendda filtrlab sahifalaydi. Sales esa serverdan 20 qator oladi, sana/to‘lov/status filtrlarini faqat shu sahifaga qo‘llaydi: boshqa sahifadagi mos sotuv “topilmadi” bo‘lishi mumkin. Raw sana va ID querylari serializer bilan validatsiya qilinmaydi; noto‘g‘ri format ayrim ORM yo‘llarida 500ga olib keladi. Bazi narx filtrlari noto‘g‘ri qiymatni jim tashlab ketadi.

**Taklif:** barcha ro‘yxatlarda bir xil paginatsiya shartnomasi; filtrlashni serverda paginatsiyadan oldin bajarish; query serializer va barqaror ordering.

**Bajarildi mezoni:** filtr butun natijani qamraydi, count/page mos; katta katalog to‘liq yuklanmaydi; noto‘g‘ri sana/ID 400 beradi. Bog‘liq: T3.7.

**Muhokama/qaror:** hali yo‘q. **Bajarilish:** boshlanmagan.

### AUD-20 — Media va MinIO ulanishini yakunlash

**3/5 · P1 · Konfiguratsiyaga bog‘liq xavf.**

**Dalil:** `ilbi/config/settings.py:229,242`; `docker-compose.yml:60`; `nginx/nginx.conf:43`; `frontend/ilbi/src/api/client.js:72`.

MinIO yoqilganda endpointning defaulti Docker ichidagi `http://minio:9000`. Shu host bilan chiqarilgan media URL tashqi brauzerda ochilmaydi; frontend faqat nginx/ilbi hostlarini moslaydi. Compose’da bucket yaratish va kerakli access policy bosqichi yo‘q. Nginx `/media/`ni doim lokal katalogdan beradi. Storage credentiallari xavfsiz bo‘lmagan defaultlarga ega; media/backup uchun to‘liq ekspluatatsiya oqimi ko‘rsatilmagan.

**Taklif:** tashqi URL, ichki endpoint, bucket yaratish, cheklangan credential va fayl hayot siklini bitta konfiguratsiyaga keltirish. Haqiqiy sirlarni hisobotga yozmaslik.

**Bajarildi mezoni:** lokal va MinIO rejimida upload→brauzerda ko‘rish ishlaydi; qayta deployda fayl saqlanadi; kerakli bucket/policy va backup/restore dalili bor. Bog‘liq: T9/production storage ishlari.

**Muhokama/qaror:** hali yo‘q. **Bajarilish:** boshlanmagan.

### AUD-21 — Production deploy, TLS va ekspluatatsiya

**3/5 · P1 · Ochiq reja va konfiguratsiyada aniq.**

**Dalil:** `docker-compose.yml`; `frontend/ilbi/Dockerfile`; `nginx/nginx.conf`; `ilbi/gunicorn.conf.py`; `ilbi/config/settings.py:39`; backend Dockerfile/entrypoint.

README production uchun ham development Compose’ni tavsiya qiladi. Frontend Vite dev server, 5173 port ochiq, Nginxda TLS/SPA build yo‘li yo‘q; host whitelistda `*` bor. Gunicorn reload default yoqilgan. Gevent bilan oddiy psycopg2 ishlatiladi, rejalashtirilgan psycogreen patch yo‘q. Buildlar `latest` va backendda frozen syncdan fallback syncga tayanadi. Worker/beat app startga tayanadi, migration tayyorligiga aniq signal yo‘q. Backup/restore, monitoring va readiness oqimi ham yakunlanmagan.

**Taklif:** production konfiguratsiyasi, frontend static build, TLS, aniq hostlar, takrorlanuvchi build va xizmatlarning tayyorlik signalini yakunlash.

**Bajarildi mezoni:** build artefakti Nginx orqali beriladi; HTTPS/host/secret talablari bajarilgan; DB kutishi workerning hamma so‘rovini to‘smasligi tekshirilgan; deployment va restore jarayoni yozilgan. Bog‘liq: T9.1–T9.5.

**Yangilanish — 2026-10-16, production tayyorgarligining 1-qadami:** foydalanuvchi faqat production konfiguratsiyasi, HTTPS/proxy, xavfsiz cookie va Gunicorn reload tuzatishini tasdiqladi. **AUD-21 qisman bajarildi; serverga deploy qilinmadi.**

- `config.settings_production` mahalliy `.env`ni o‘qimaydi; production uchun uchta `.env.production.example` tayyorlandi, haqiqiy `.env.production` fayllari Git’dan chiqarildi. Debug/demo, wildcard host va HTTP frontend origin bilan production ishga tushmaydi.
- Production Nginx 80→443 yo‘naltiradi, noma’lum Host/SNI’ni rad etadi, TLS sertifikatlarini read-only mount qiladi va mijoz yuborgan proxy headerlarini qayta yozadi. Regex location ichki API blokini chetlab o‘tmasligi uchun `^~ /api/v1/internal/` ishlatiladi.
- Django’da HTTPS proxy ishonchi, secure session/CSRF cookie’lari va canonical HTTPS redirect qo‘shildi. Ichki tokenli Docker HTTP ulanishi saqlandi. Production’da Gunicorn reload yoqilmaydi.
- HSTS canonical domen uchun dastlab 3600 soniya. Barcha subdomenlar tekshirilmaguncha `includeSubDomains` va browser preload yoqilmadi; `check --deploy`dagi shu ikki maslahat ogohlantirishi yashirilmagan.
- To‘liq backend tekshiruvi: **611 passed**; Compose va vaqtinchalik haqiqiy Nginx TLS/proxy tekshiruvlari: **9 passed**. Regressiya tekshiruvlari `tests/deployment/`da. Haqiqiy domen sertifikati, DNS va sertifikat yangilashni serverda tekshirish deploy bosqichida qoladi.
- Qolgan AUD-21 ishlari (deterministik image, startup/migratsiya ajratilishi, readiness, backup/restore va monitoring) bu tasdiqqa kirmaydi; keyingi alohida qarorlarni kutadi.

### AUD-22 — Hujjat versiyalari va rozilik dalili

**3/5 · P2 · Kodda aniq va ochiq reja.**

**Dalil:** `ilbi/api/v1/accounts/views/docs_views.py:164,193`; `terms_views.py:24`; `ilbi/apps/accounts/models/user_model.py`.

Admin PUT amaldagi Markdownni ustidan yozadi; eski versiya saqlanmaydi. Userda bitta `terms_accepted` flag va vaqt/IP bor: qaysi hujjat, matn hash/versiya, til yoki rozilik turi qabul qilingani qayd etilmaydi. Matn o‘zgarganda qayta qabul mexanizmi yo‘q. Frontend acceptance gate bor, biznes APIlarda shu rozilik siyosati markaziy tekshirilmaydi.

**Taklif:** avval kelishilgan hujjat/rozilik versiyalarini va acceptance qaydini joriy qilish; fayl yozishni atomar va auditli qilish.

**Bajarildi mezoni:** eski hujjat va uning qabul dalili o‘qiladi; yangi majburiy versiya tegishli qayta qabulni ishga tushiradi; xizmat sharti va ixtiyoriy rozilik ajratilgan. Bog‘liq: T8.5/UZ-21.

**Muhokama/qaror:** hali yo‘q. **Bajarilish:** boshlanmagan.

### AUD-23 — Auditning to‘liqligi, tenant va IP aniqligi

**3/5 · P2 · Kodda aniq.**

**Dalil:** `ilbi/apps/core/services/audit_service.py:12,50,58`; `ilbi/api/v1/accounts/views/terms_views.py:12`; `ilbi/api/v1/catalog/views/product_views.py:141,242`; `ilbi/apps/sales/services/debt_service.py`.

Auditda kontekst bo‘lmasa egasining birinchi membershipi tanlanadi: ko‘p do‘konli egada hodisa noto‘g‘ri tenantga yozilishi mumkin. `X-Forwarded-For`ning chapdagi birinchi qiymati ishonchli proxy/format tekshiruvisiz olinadi; Nginx mavjud headerni qo‘shib yuboradi. Ayrim profil xatolari auditda jim yutiladi. Product PATCH orqali narx o‘zgartirish variant PATCHdagi price auditini chetlab o‘tadi; qarz to‘lovi uchun alohida action audit yo‘q.

**Taklif:** aniq tenant/global audit konteksti, ishonchli proxy qoidasi, IP validatsiyasi va bir amal uchun barcha API yo‘llarida bir xil audit.

**Bajarildi mezoni:** narx/to‘lov/auth o‘zgarishlari auditda to‘liq; soxta yoki noto‘g‘ri IP auditni 500ga olib kelmaydi; ko‘p tenantli egada hodisa to‘g‘ri joyga yoziladi. Bog‘liq: T7.7 va audit talablari.

**Muhokama/qaror:** hali yo‘q. **Bajarilish:** boshlanmagan.

### AUD-24 — Xodimni ishga olish va akkauntni faollashtirish

**3/5 · P1 · Kodda aniq.**

**Dalil:** `ilbi/api/v1/accounts/views/employee_views.py:27,40`; `ilbi/api/v1/accounts/serializers.py:118`; `frontend/ilbi/src/pages/Employees.jsx:24,70`.

Hire serializer emailni qabul qiladi, view uni `EmployeeService.hire()`ga uzatmaydi. Frontend email/permission tanlashni yubormaydi, yuborilgan first_name/last_name backend hire serializerida yo‘q. Yangi xodim uchun parol o‘rnatish xati va ishlash vakolatlari oqimi to‘liq emas. UI xodimlar ro‘yxatini ham maxsus endpointdan yuklamaydi; tenant list/current state bilan cheklangan. AUD-08dagi `tenant_id || 1` bunga qo‘shimcha xato.

**Taklif:** email, foydalaniladigan profil maydonlari, ruxsatlar, xodimlar ro‘yxati va birinchi parol o‘rnatishni bitta ishga olish jarayoni sifatida ulash.

**Bajarildi mezoni:** UI orqali yangi xodimni yaratish→email/taklif→parol→OTP→ruxsatli biznes amali ketma-ketligi ishlaydi; owner/admin o‘z vakolatida qoladi. Bog‘liq: T2.4/T3.2/T7.4.

**Muhokama/qaror:** hali yo‘q. **Bajarilish:** boshlanmagan.

### AUD-25 — Katta frontend sahifalarini qismlarga ajratish

**3/5 · P3 · Yaxshilash.**

**Dalil:** `frontend/ilbi/src/pages/Sales.jsx` — 3406 qator; Catalog — 2188; POS — 1770; Inventory — 1762; Services — 1584; Dashboard — 1505; `src/App.jsx:10`.

Sahifalar ma’lumot yuklash, biznes hisoblari, modal, hujjat chop etish va katta inline stillarni bir faylda ushlab turadi. App barcha sahifalarni boshlanishida import qiladi. Bu tenant/ruxsat o‘zgarishlarini izchil qo‘llash va xatoni ajratishni qiyinlashtiradi; barcha sahifa kodi birinchi yuklashga kiradi.

**Taklif:** muhokamadan keyin foydalanish holatlari bo‘yicha kichik komponent/hooklarga ajratish, umumiy formatter va route uchun lazy import. Dizaynni alohida topshiriqsiz o‘zgartirmaslik.

**Bajarildi mezoni:** tegishli funksional oqimlar saqlanadi; sahifalar mustaqil yuklanadi; murakkab state/tenant oqimlari alohida tekshiriladigan bo‘ladi. Bog‘liq: frontend texnik qarzi.

**Muhokama/qaror:** hali yo‘q. **Bajarilish:** boshlanmagan.

### AUD-26 — CI va regressiya tekshiruvlarini kuchaytirish

**2/5 · P1 · Kodda aniq.**

**Dalil:** `.github/workflows/ci.yml:24,25`; `ilbi/config/settings_test.py:37,39`; `ilbi/config/settings.py:33`; `ilbi/.gitignore`; test modullari va frontend package.json.

CI pytest envda `DJANGO_SECRET_KEY` yo‘q. Test settings asosiy settingsni import qilgandan keyin test secretni belgilaydi; asosiy settings esa avval secret yo‘qligidan exception ko‘taradi. `.env.test` repoda yo‘q/ignore qilingan; toza CI clone shu tartibda boshlanmaydi. Ruff `--exit-zero` bilan haqiqiy lint gate emas. Parallel stock/sale/shift/OTP tekshiruvlari manbalarda topilmadi, frontendda test scripti yo‘q. Oldingi testlar ayrim eski void xatti-harakatlarini hali tasdiqlaydi.

**Taklif:** test konfiguratsiyasini lokal .envga bog‘lamaslik; avval kelishilgan touched-file lint qoidasi yoki bosqichli gate; pul/vakolat/tenant bo‘yicha mazmunli regressiya va parallel testlar.

**Bajarildi mezoni:** lokal secretsiz toza clone CI ishlaydi; xavfli oqimlarga mos testlar bor; auditdagi eski xatti-harakatlar yangi talabga qarshi tekshiriladi. Testlarni ushbu auditda ishga tushirishga urinish bo‘lmadi. Bog‘liq: T0.2/T4.12.

**Muhokama/qaror:** hali yo‘q. **Bajarilish:** boshlanmagan.

### AUD-27 — Avatar yuklashni haqiqiy rasm bilan cheklash

**2/5 · P0 · Validatsiya bo‘shlig‘i kodda aniq; brauzer ta’siri deployga bog‘liq.**

**Dalil:** `ilbi/api/v1/accounts/views/profile_views.py:68`; `ilbi/config/urls.py`dagi media serve; `nginx/nginx.conf`dagi `/media/`.

Upload to‘g‘ridan-to‘g‘ri `request.FILES['avatar']`ni modelga yozadi; serializer ImageField, fayl formati yoki hajm tekshiruvi yo‘q. Modelning ImageField nomi `save()` vaqtida fayl haqiqiy rasm ekanini tekshirmaydi. HTML/SVG kabi faol kontent media yo‘lida saqlanishi mumkin; u ilova originida ochilsa brauzerda script ishlash va storagega kirish xavfi bor. Eski avatar yangi fayl muvaffaqiyatli saqlanishidan oldin o‘chiriladi.

**Taklif:** tekshirilgan raster format, hajm/dimension limiti va xavfsiz qayta kodlash; yangi fayl saqlangach eskisini o‘chirish; media xizmatini faol kontentdan himoyalash.

**Bajarildi mezoni:** HTML/SVG/rasm bo‘lmagan va katta fayl rad etiladi; muvaffaqiyatsiz uploadda eski avatar saqlanadi. Bog‘liq: T9.7/image hardening.

**Muhokama/qaror:** hali yo‘q. **Bajarilish:** boshlanmagan.

### AUD-28 — Saqlanadigan state hookidagi render sikli

**2/5 · P0 · Koddan kelib chiqadigan xato.**

**Dalil:** `frontend/ilbi/src/hooks/usePersistedState.js:10,27,47`; `frontend/ilbi/src/pages/POS.jsx:54`.

Hook o‘qish effectida `defaultValue`ga bog‘langan; POS unga har renderda yangi `[]` beradi. Effect har safar yana ishlaydi va yangi array/JSON natijasini statega yozadi, keyingi renderni chaqiradi. Bu takroriy render va storage o‘qish/yozish sikliga olib keladi, savat tahririni ham qayta o‘qilgan qiymat bosishi mumkin. Tenant almashishida yangi kalitga eski state yozilishi uchun effect tartibi ham tekshirilishi kerak.

**Taklif:** default qiymatni barqaror saqlash; storage o‘qishini faqat kalit almashishiga bog‘lash; yangi kalit holati to‘liq yuklangach yozish.

**Bajarildi mezoni:** POS ochilganda render sikli yo‘q; savat qo‘shish/o‘chirish saqlanadi; route/refresh/tenant almashish boshqa tenant qoralamasini bosmaydi. Bog‘liq: T2.6.

**Muhokama/qaror:** hali yo‘q. **Bajarilish:** boshlanmagan.

### AUD-29 — Tashqi ta’sirlarni transactiondan keyin bajarish

**2/5 · P1 · Kodda aniq.**

**Dalil:** `ilbi/apps/cashbox/services/cashbox_service.py:291`; `ilbi/apps/sales/services/debt_service.py:108`; `ilbi/apps/tenants/services.py:172`.

Telegram, Celery `.delay()` va SMTP dispatch DB transactioni tugamasdan chaqiriladi. Keyingi xatoda DB rollback bo‘lsa ham xabar/xat allaqachon ketgan bo‘lishi mumkin. Telegram kutish payti pul/stock locklari ushlab turiladi. Celeryga berilgan vazifa commitdan oldingi ma’lumotni o‘qishi mumkin.

**Taklif:** `transaction.on_commit()` yoki muhim yetkazishlar uchun kelishilgan outbox; tasklarga ID berish.

**Bajarildi mezoni:** rollback holatida tashqi xabar ketmaydi; commitdan keyin yuboriladi; tarmoq sekinligi pul locklarini ushlab turmaydi. Bog‘liq: reja §4.3.

**Muhokama/qaror:** hali yo‘q. **Bajarilish:** boshlanmagan.

### AUD-30 — Davriy hisobot va Telegram retry

**2/5 · P2 · Kodda aniq.**

**Dalil:** `ilbi/apps/cashbox/tasks.py:129`; `ilbi/apps/inventory/tasks.py`; `ilbi/apps/sales/tasks.py:22,30`; `ilbi/config/settings.py:140`.

Daily report 5 daqiqada tekshiriladi, `abs(minute-report_minute)<=5` bir hisobotni bir necha marta yuboradi; daily uchun yuborilgan-sana himoyasi yo‘q. Soat chegarasi va downtime uchun catch-up yo‘q. TIME_ZONE UTC bo‘lgani uchun interfeysdagi mahalliy vaqt bilan farq qiladi. Telegram sender xatoni `False`ga aylantiradi; taskdagi `autoretry_for=(Exception,)` ishga tushmaydi. Low-stockdagi sana checki taskni enqueue qilish bilan atomar emas.

**Taklif:** mahalliy reja va bir davrga bitta dispatch; atomar belgilash; retry qilinadigan xatoni task darajasida aniq ajratish.

**Bajarildi mezoni:** bitta rejalashtirilgan hisobot bir marta yuboriladi; vaqt chegarasi/downtime kelishilgancha ishlaydi; vaqtinchalik Telegram xatosi haqiqatan qayta urinadi. Bog‘liq: T5.1/T5.4.

**Muhokama/qaror:** hali yo‘q. **Bajarilish:** boshlanmagan.

### AUD-31 — JWT bekor qilish va frontend sessiya tiklanishi

**2/5 · P1 · Kodda aniq.**

**Dalil:** `ilbi/apps/accounts/authentication.py:17`; `ilbi/config/settings.py`dagi SIMPLE_JWT; `ilbi/api/v1/accounts/urls.py:20`; `frontend/ilbi/src/context/AuthContext.jsx:8,35`; `src/api/client.js`dagi refresh.

`token_version` claimi yo‘q token revocation tekshiruvidan o‘tib ketadi; mos kelmasligi faqat claim mavjud bo‘lsa tekshiriladi. Refresh standart view orqali, rotation/blacklist sozlamalari yo‘q. Frontend sahifa qayta ochilganda access muddati tugagan bo‘lsa, hali valid refresh token borligiga qaramay barcha tokenni o‘chiradi. Revoked access uchun refresh yangi, lekin eski versionli access chiqarsa, qayta so‘rov 401 bo‘lishi va auth state to‘liq yangilanmasligi mumkin.

**Taklif:** majburiy version claim, refresh/revocation siyosati va startupda sessiyani tiklashni muvofiqlashtirish.

**Bajarildi mezoni:** versionsiz/revoked token rad etiladi; valid refresh bilan page reload sessiyani tiklaydi; revoked sessiya foydalanuvchiga aniq chiqishni beradi. Bog‘liq: T7.5/T7.9.

**Muhokama/qaror:** hali yo‘q. **Bajarilish:** boshlanmagan.

### AUD-32 — Telegram 2FA kontaktini xavfsiz qayta bog‘lash

**2/5 · P1 · Kodda aniq va shartli xavf.**

**Dalil:** `telegram_bot_sms/main.py`dagi contact handler; `ilbi/api/v1/tg_bot/serializers.py:9`; `ilbi/apps/tg_bot/models.py`.

Kontakt egasi senderga mosligi tekshiriladi — bu foydali himoya. Biroq handler faqat private chat bilan cheklanmagan: o‘z kontaktini guruhda yuborish group chat IDni bog‘lashi va keyingi OTPni guruhga chiqarishi mumkin. Telefon update_or_create bilan almashtiriladi, chat_id esa unique; o‘sha Telegram account yangi telefon bilan qayta ulanganda IntegrityError ehtimoli bor. Qayta bog‘lash uchun eski chatga bildirish va audit yo‘q. Async handler ichida `requests.post()` ishlatilib bot event loopi bloklanadi.

**Taklif:** 2FA ulashni shaxsiy chatga cheklash; telefon/chatni atomar qayta bog‘lash, audit/bildirish; backend so‘rovini asinxron bajarish.

**Bajarildi mezoni:** guruh orqali OTP yo‘nalishi o‘zgarmaydi; telefon almashtirish 500 bermaydi; boshqa bot foydalanuvchilari backend javobini kutib qolmaydi. Bog‘liq: T7.8.

**Muhokama/qaror:** hali yo‘q. **Bajarilish:** boshlanmagan.

### AUD-33 — Brauzer xotirasidagi parolni olib tashlash

**1/5 · P0 · Kodda aniq.**

**Dalil:** `frontend/ilbi/src/pages/Login.jsx:37,86,114`; `src/api/client.js:38`.

Remember me parolni Base64ga aylantirib `localStorage`ga yozadi. Base64 qayta ochiladigan kodlash; shifrlash emas. Logout `ilbi_remember_password`ni tozalamaydi. Brauzer storageiga kira oladigan script yoki shu qurilmadan foydalanuvchi parolni qayta o‘qiy oladi.

**Taklif:** parolni storagega yozmaslik; mavjud saqlangan parol kalitini tozalash; login nomi va remember/session siyosatini alohida yuritish.

**Bajarildi mezoni:** hech bir login/logout oqimi parolni local/session storagega yozmaydi; eski kalit tozalanadi. Bog‘liq: T7.9.

**Muhokama/qaror:** hali yo‘q. **Bajarilish:** boshlanmagan.

### AUD-34 — Kassa yopishda aniqlanmagan owner o‘zgaruvchisi

**1/5 · P1 · Kodda aniq.**

**Dalil:** `ilbi/apps/cashbox/services/cashbox_service.py:268,283`.

`owner` faqat `notify_web_reports=True` blokida aniqlanadi. Web notification o‘chirilgan, Telegram `personal/both` yoqilgan bo‘lsa, `owner.phone_number`ga kirishda `UnboundLocalError` yuz beradi va smena transactioni qaytadi.

**Taklif:** ownerni bildirishnoma sozlamalaridan mustaqil aniqlash.

**Bajarildi mezoni:** web notification o‘chiq + personal/both Telegram kombinatsiyalarida smena yopiladi.

**Muhokama/qaror:** hali yo‘q. **Bajarilish:** boshlanmagan.

### AUD-35 — Egasi o‘chirilgan do‘konini qayta yoqa olishi

**1/5 · P2 · Kodda aniq.**

**Dalil:** `ilbi/apps/accounts/services/tenant_context_service.py`; `ilbi/api/permissions.py:100`; `ilbi/api/v1/tenants/views.py:275`.

Activate view own ownerga ruxsat berishini aytadi, lekin kontekst faqat `tenant__is_active=True` membershipdan olinadi. O‘chirilgan do‘kon headeri rad etiladi yoki tenant None bo‘ladi; object permission ham shu faol kontekstga tayanadi. Egasi o‘zi deaktivatsiya qilgan do‘konini qayta yoqa olmaydi, admin kerak bo‘ladi.

**Taklif:** aktivatsiya uchun tenant egaligi va faol owner membershipni do‘kon is_active holatidan alohida tekshirish; boshqa biznes amallarining active gateini saqlash.

**Bajarildi mezoni:** egasi o‘z do‘konini qayta yoqadi; boshqa egaga ruxsat yo‘q; deaktiv do‘konda savdo ochilmaydi.

**Muhokama/qaror:** hali yo‘q. **Bajarilish:** boshlanmagan.

### AUD-36 — HEAD/OPTIONS so‘rovlari uchun ruxsat xaritasi

**1/5 · P2 · Koddan kelib chiqadigan xato.**

**Dalil:** `ilbi/api/permissions.py:160,163`; GET/POST/PATCH map ishlatadigan catalog/sales viewlari.

`permission_map`da request method yo‘q bo‘lsa `ImproperlyConfigured` ko‘tariladi. Maplarda odatda HEAD/OPTIONS yo‘q. DRF permission tekshiruvi handlerdan oldin bo‘lgani uchun oddiy metadata/HEAD yoki qo‘llanmaydigan method kutilgan javob o‘rniga 500ga aylanishi mumkin.

**Taklif:** HEAD uchun tegishli GET vakolati; OPTIONS va qo‘llanmaydigan metodlar uchun aniq, xavfsiz 200/403/405 siyosati.

**Bajarildi mezoni:** HEAD/OPTIONS/qo‘llanmaydigan metod permissionni chetlab o‘tmaydi va 500 bermaydi.

**Muhokama/qaror:** hali yo‘q. **Bajarilish:** boshlanmagan.

### AUD-37 — Public chekda qaytarilgan va sof summa

**1/5 · P2 · Kodda aniq.**

**Dalil:** `ilbi/api/v1/sales/serializers.py:265,284`; `frontend/ilbi/src/pages/PublicReceiptView.jsx:333`; `components/common/ReceiptSlip.jsx:440`.

Public serializer `refunded_amount/net_amount`ni va item qaytarish holatini chiqarmaydi; frontend faqat total ko‘rsatadi. B2B qaytishlarda asl jami saqlanib refund alohida yozilgani uchun public nusxa amaldagi sof qiymatni bermaydi. Public item javobida ichki item ID ham bor, avval kelishilgan whitelistda bunga ehtiyoj yo‘q.

**Taklif:** mijozga ko‘rinadigan total/refund/net va qator ma’lumotlarini kelishilgan whitelist bilan bir xil qilish; receipt chop etish ko‘rinishini ham moslash.

**Bajarildi mezoni:** qaytarilgan chekda uch summa to‘g‘ri; kassir/kontragent/tannarx maxfiyligi saqlanadi. Bog‘liq: T4.10/T4.13/AUD-03.

**Muhokama/qaror:** hali yo‘q. **Bajarilish:** boshlanmagan.

### AUD-38 — README, eski nomlar va holat yozuvlari

**1/5 · P3 · Kod/hujjatda aniq.**

**Dalil:** `README.md:49,50,51`; `ilbi/config/urls.py`; `docker-compose.yml`; `frontend/ilbi/src/api/client.js`dagi branchId argumentlar; `components/layout/Layout.jsx`; master plan checkpoint va walkthrough logi.

README backendni localhost:8000 deydi, Compose backendga host port bermaydi; Swagger/Redoc yo‘llari haqiqiy `/api/docs/` va `/api/redoc/`ga mos emas. Audit davomida ikkala `.env.example`dagi eski insecure secret placeholderi tashqi o‘zgarishda bo‘sh qiymatga almashtirildi; startup baribir haqiqiy secretni talab qiladi, README quick startda uni yaratish/to‘ldirishning aniq qadami kerak. Qolgan branchId argumentlari ishlatilmaydi; ayrim matnlar eski filial/Z-hisobot nomlarini saqlagan. Reja checkpointidagi ochiq/yopiq ishlar keyingi walkthrough yozuvlari bilan bir xil emas, bir nechta qayd takrorlangan.

**Taklif:** ishga tushirish yo‘llari va env qadamlarini amaldagi konfiguratsiyaga moslash; eski argument/nomlarni tegishli task doirasida tozalash; tasdiqlangan eng so‘nggi natijani bitta joyda yuritish.

**Bajarildi mezoni:** yangi foydalanuvchi README bo‘yicha xizmatlarga kira oladi; ishlatilmaydigan branch API izlari qolmaydi; statuslar o‘zaro zid emas. Bog‘liq: T1.8/T1.9 va hujjat texnik qarzi.

**Muhokama/qaror:** hali yo‘q. **Bajarilish:** boshlanmagan.

## 4. Muhokama va bajarilish jurnali

| Sana | Tegishli vazifa | Muhokama yoki qaror | Natija |
|---|---|---|---|
| 2026-10-12 | Barcha AUD vazifalari | Foydalanuvchi butun loyihani tahlil qilish, kamchiliklarni qiyinidan osoniga tartiblash va qulay faylda saqlashni so‘radi. Hozir kodni o‘zgartirmaslikni aniq aytdi. Keyingi muhokamalar tegishli vazifalarga qo‘shiladi; ishlar keyinchalik birma-bir bajarilgach belgilab boriladi. | Audit va ushbu fayl tayyorlandi. Implementatsiya uchun joriy ko‘rsatma: kutish. |
| 2026-10-12 | AUD-12, AUD-38 | Auditning oxirida fayl hashlarini solishtirish tashqi o‘zgarishlarni ko‘rsatdi: tenants `0008` migratsiyasi, yangi `0011` migratsiyasi va ikkala `.env.example`. Ular ushbu audit tomonidan o‘zgartirilmadi; qayta o‘qilib tegishli topilmalar yangilandi. | Oldingi topilma tuzatilgan jihatlar qayd etildi. Migratsiya runtime tekshiruvi va qolgan README/data vazifalari ochiq. |
| 2026-10-12 | AUD-01 | Foydalanuvchi birinchi, eng qiyin vazifa uchun hozirgi holatga mos yechim tavsiyasini so‘radi. Provayder integratsiyasi, seller review, tenant fiskal ulanishi, idempotent operatsiya/rezerv, noaniq javobni aniqlash va refund bo‘yicha taklif tegishli bo‘limga qo‘shildi. Rasmiy Soliq manbalari qayta o‘qildi. | MUHOKAMADA. Taklif hali foydalanuvchi qarori emas; ilova kodi o‘zgartirilmadi. |
| 2026-10-16 | AUD-21 | Production tayyorgarligining 1-qadami alohida tasdiqlandi: HTTPS/proxy, secure cookie, Gunicorn reload va production env ajratilishi. Tafsilot va tekshiruvlar AUD-21da. | QISMAN BAJARILDI. 611 backend va 9 deployment testi o‘tdi; serverga deploy qilinmadi. |
| 2026-10-16 | AUD-01 | Production tayyorgarligining 2-qadami sifatida provayder/API talablarini aniqlash va ulanish yo‘lini tayyorlash tasdiqlandi. Foydalanuvchi hali provayder tanlamagan. Kod bo‘shliqlari, ikki nomzod, ochiq savollar va 2.1 taklifi yozildi. | Tayyorgarlik tayyor; integratsiya ochiq. Ushbu qadamda faqat hujjat yangilandi. 2.1 implementatsiyasi hali tasdiqlanmagan. |
| 2026-10-16 | AUD-01 | 2.1 bo‘yicha foydalanuvchi tanlovni agentga topshirdi. Katalog MXIK/qadoq rekvizitlari va yangi savdo satrida o‘zgarmas mahsulot nusxasi bajarildi; lokal nullable migratsiyalar qo‘llandi. | 2.1 BAJARILDI, AUD-01 QISMAN BAJARILDI. 628 backend testi, frontend unit/build/lint, ikki browser tekshiruvi va OpenAPI tekshiruvi o‘tdi. 2.2 taklifi alohida tasdiqni kutadi. |

### Keyingi suhbatlarda yuritish tartibi

1. Muhokama tegishli `AUD-xx` bo‘limining **Muhokama/qaror** qismiga sana bilan yoziladi. Global jurnalga qisqa qaror va task ID qo‘shiladi.
2. Oldingi kelishilgan master plan/walkthrough qarori mavjud bo‘lsa unga havola beriladi; taxmin yangi tasdiq deb yozilmaydi. Ziddiyat muhokamada ochiq qayd etiladi.
3. Muhokama yakunida aniq yechim, tegiladigan fayllar, dependency va bajarildi mezoni yoziladi. Kod faqat o‘sha ish foydalanuvchi tomonidan alohida tasdiqlangach o‘zgartiriladi.
4. Bajarish so‘ralgach vazifa **BAJARILMOQDA** qilinadi; faqat ish va kelishilgan tekshiruvlar yakunlangach **BAJARILDI** bo‘ladi. Kod tayyor, tashqi provayder tasdig‘i qolgan vazifa **QISMAN BAJARILDI** bo‘ladi.
5. Bajarilgan task ostiga o‘zgargan fayllar, bajarilgan tekshiruv va natija, commit bo‘lsa uning identifikatori, qolgan cheklovlar yoziladi. Hali tekshirilmagan ish “bajarildi” qilinmaydi.

### Bajarilgan vazifa uchun yozuv namunasi

```text
Vazifa: AUD-xx
Muhokama/qaror: sana — kelishilgan aniq yechim
Holat: BAJARILDI / QISMAN BAJARILDI
O‘zgargan fayllar:
Tekshiruv: buyruq yoki amaliy ssenariy — haqiqiy natija
Commit: mavjud bo‘lsa
Qolgan ish/tashqi tasdiq: mavjud bo‘lsa
Yakunlangan sana:
```

**Joriy natija — 2026-10-16:** dastlabki audit saqlangan; production tayyorgarligining 1-qadami (AUD-21 qisman), fiskal ulanish rejasi va 2.1-qadami (AUD-01 qisman) bajarilgan. Haqiqiy fiskal integratsiya va production savdosi ochiq vazifa bo‘lib qoladi. Qolgan vazifalar jadvalidagi tarixiy holat ularning keyingi bajarilishini tasdiqlamaydi; har biri boshlanishida amaldagi kod bilan qayta solishtiriladi.
