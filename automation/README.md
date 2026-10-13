# Haqiqiy ishlarni chiqarish va GitHub zaxirasi

Chiqarish GitHub Actions orqali qo‘lda ishga tushiriladi va tugallangan, tekshirilgan o‘zgarishlarni yuboradi. Kunlik commit soni, minimum va grafikni to‘ldirish jadvali yo‘q. Avtomatik manba zaxirasi kompyuter yoqilganda har 15 daqiqada ishlaydi.

## Branchlar

| Branch | Vazifasi |
|---|---|
| `main` | Tekshirilgan, chiqarilgan o‘zgarishlar |
| `backup/work-in-progress` | Kompyuterdagi saqlangan kodning eng oxirgi muvaffaqiyatli zaxirasi |
| `queue/ready` | Ko‘rib chiqilgan chiqarish navbatining o‘zgarmaydigan to‘liq nusxasi va rejasi |
| `queue/progress` | Qaysi commit guruhlari chiqarilgani haqidagi holat |

Zaxira va navbat branchlari repozitoriy bilan bir xil ochiqlikda. `Sales-Platform` hozir ochiq repozitoriy. `.env`, parollar, yopiq kalitlar, ma’lumotlar bazasi, yuklangan media va kesh zaxiraga yuborilmaydi. Ular uchun alohida xavfsiz zaxira kerak. Bu vosita manba kodini saqlaydi.

## Tugallangan ishlarni chiqarish

`automation/queue-plan.json` har bir commitning aniq fayllari va mazmunini belgilaydi. Fayl bitta guruhga kiradi; takror, taqsimlanmagan yoki himoyalangan fayl bo‘lsa navbat tuzilmaydi. Sun’iy log yoki bo‘sh commit yaratilmaydi. Git sanasi o‘zgartirilmaydi: commit chiqarish kuni odatiy `git commit` orqali yaratiladi.

Bitta mazmunli guruh ham yetarli. Chiqarish ishga tushirilganda barcha qolgan ko‘rib chiqilgan guruhlar bir paketda tekshiriladi va yuboriladi. Navbat tugaganda jarayon commit yaratmaydi. Commit soni ish hajmiga bog‘liq; kunlar bo‘yicha sun’iy taqsimlanmaydi.

Har bir chiqarish paketi pushdan oldin avtomatizatsiya testlari, backend testlari, API sxemasi, frontend testlari va builddan o‘tadi. Test muvaffaqiyatsiz bo‘lsa `main` va navbat holati o‘zgarmaydi. Bir paket ichidagi commitlar yakuniy tekshirilgan holat bilan bitta pushda yuboriladi.

`main` va `queue/progress` birgalikda atomik push qilinadi. Internet uzilishi, push rad etilishi yoki takror ishga tushirish o‘zgarishlarni yo‘qotmaydi. `main` boshqa tomondan o‘zgarsa, navbat avtomatik bosib yozmaydi: yangi asos bilan reja qayta ko‘rib chiqiladi. Force push ishlatilmaydi. Asl kompyuterdagi Git indeksi va ishchi fayllar saqlanadi.

## Boshqa kompyuterda tiklash

Eng oxirgi saqlangan kod:

```bash
git clone --branch backup/work-in-progress --single-branch https://github.com/Abdulxadiy/Sales-Platform.git Sales-Platform-recovered
```

Faqat hozirgi chiqarish navbatining nusxasi:

```bash
git clone --branch queue/ready --single-branch https://github.com/Abdulxadiy/Sales-Platform.git Sales-Platform-queued
```

Har bir yangi zaxira oldingi zaxira va GitHubdagi asosiy branchga ulanadi: eski nusxalar Git tarixida saqlanadi. Mahalliy eski Git tarixiga ulanmaydi, shunda tozalangan tarixga sun’iy commitlar qaytib kirmaydi. Yangi kompyuterda `.env` va ishlash muhiti alohida sozlanadi. Tiklangan backup branchni `main`ga merge qilmang — bu chiqarish tekshiruvlarini chetlab o‘tishi mumkin.

## Yangi ishni zaxiralash va navbatga qo‘shish

```bash
python3 scripts/commit_queue.py backup
python3 scripts/commit_queue.py status
```

Hozirgi navbat tugagach yangi ish uchun `automation/queue-plan.json`ni mazmunli guruhlarga moslang:

```bash
python3 scripts/commit_queue.py backup
python3 scripts/commit_queue.py enqueue
```

Faol navbat yangi backup kelgani uchun o‘zgarmaydi. Keyingi tuzatishlar backup branchda xavfsiz saqlanadi, joriy navbat tugagach yangi navbatga qo‘shiladi. Yangi navbat uchun kamida bitta haqiqiy o‘zgarish kerak.

## Kompyuterdagi avtomatik zaxira

Linuxda quyidagi buyruq foydalanuvchi systemd timerini o‘rnatadi:

```bash
python3 scripts/install_backup_timer.py
```

Kompyuter yoqilgan va foydalanuvchi seansi ishlayotgan paytda har 15 daqiqada saqlangan fayllar tekshiriladi. Kod o‘zgarmasa yangi backup commit yaratilmaydi. GitHubga kirilgan hisob va internet kerak. Kompyuter o‘chirilganda yangi mahalliy fayllar yuborilmaydi; GitHubdagi oxirgi muvaffaqiyatli zaxira qoladi. Saqlanmagan IDE buferlari zaxiraga kirmaydi.

```bash
systemctl --user list-timers inventra-source-backup.timer
journalctl --user -u inventra-source-backup.service -n 30
systemctl --user disable --now inventra-source-backup.timer
```

## Qo‘lda boshqarish

GitHub → Actions → **Publish reviewed changes** → **Run workflow**. `dry_run` faqat tayyorlanadigan commitlarni ko‘rsatadi; to‘liq test va push qilmaydi. Haqiqiy chiqarish testlar va builddan keyin amalga oshadi.

Qo‘lda chiqarish workflowini o‘chirish:

```bash
gh workflow disable publish-queue.yml --repo Abdulxadiy/Sales-Platform
```

Qayta yoqish:

```bash
gh workflow enable publish-queue.yml --repo Abdulxadiy/Sales-Platform
```

GitHub profilida commitlar hisoblanishi uchun muallif emaili hisobga bog‘langan va commitlar asosiy branchda bo‘lishi kerak. Bu konfiguratsiya hisobning GitHub `noreply` manzilini ishlatadi. [GitHub contribution qoidalari](https://docs.github.com/en/account-and-profile/reference/profile-contributions-reference).
