# Haqiqiy commit navbati va GitHub zaxirasi

Kunlik yuborish kompyuter o‘chiq bo‘lsa ham GitHub Actions orqali ishlaydi. Jadval: **07:17, Asia/Tashkent**. GitHub navbat yuklamasiga qarab ishni kechroq boshlashi mumkin.

## Branchlar

| Branch | Vazifasi |
|---|---|
| `main` | Tekshirilgan, chiqarilgan o‘zgarishlar |
| `backup/work-in-progress` | Kompyuterdagi saqlangan kodning eng oxirgi muvaffaqiyatli zaxirasi |
| `queue/ready` | Joriy kunlik navbatning o‘zgarmaydigan to‘liq nusxasi va rejasi |
| `queue/progress` | Qaysi commit guruhlari chiqarilgani haqidagi holat |

Zaxira va navbat branchlari repozitoriy bilan bir xil ochiqlikda. `Sales-Platform` hozir ochiq repozitoriy. `.env`, parollar, yopiq kalitlar, ma’lumotlar bazasi, yuklangan media va kesh zaxiraga yuborilmaydi. Ular uchun alohida xavfsiz zaxira kerak. Bu vosita manba kodini saqlaydi.

## Kunlik chiqarish

`automation/queue-plan.json` har bir commitning aniq fayllari va mazmunini belgilaydi. Fayl bitta guruhga kiradi; takror, taqsimlanmagan yoki himoyalangan fayl bo‘lsa navbat tuzilmaydi. Sun’iy log yoki bo‘sh commit yaratilmaydi. Git sanasi o‘zgartirilmaydi: commit chiqarish kuni odatiy `git commit` orqali yaratiladi.

Maqsad — kuniga 20 commit. Oxirgi kun uchun 15 tadan kam guruh qolmasligi uchun so‘nggi kichik qoldiq joriy chiqarishga qo‘shiladi. Masalan, 45 guruh **20 + 25**, 35 guruh **20 + 15** bo‘lib chiqadi. Navbat tugaganda jarayon yangi haqiqiy ish kelguncha commit yaratmaydi. Har kuni cheksiz 15–20 commitni faqat mavjud o‘zgarishlardan kafolatlash mumkin emas.

Har bir kunlik paket pushdan oldin avtomatizatsiya testlari, backend testlari, API sxemasi, frontend testlari va builddan o‘tadi. Test muvaffaqiyatsiz bo‘lsa `main` va navbat holati o‘zgarmaydi. Bir paket ichidagi commitlar yakuniy tekshirilgan holat bilan bitta pushda yuboriladi.

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

Har bir yangi zaxira oldingi zaxiraga ulanadi: eski nusxalar Git tarixida saqlanadi. Yangi kompyuterda `.env` va ishlash muhiti alohida sozlanadi. Tiklangan backup branchni `main`ga merge qilmang — bu kunlik navbatdagi barcha kodni birdan chiqaradi.

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

Faol navbat yangi backup kelgani uchun o‘zgarmaydi. Keyingi tuzatishlar backup branchda xavfsiz saqlanadi, joriy navbat tugagach yangi navbatga qo‘shiladi. 15 ta mazmunli guruh yetmasa, shu minimum bilan navbat yaratish rad etiladi; kod zaxirada qoladi.

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

GitHub → Actions → **Publish verified queued changes** → **Run workflow**. `dry_run` faqat tayyorlanadigan commitlarni ko‘rsatadi; to‘liq test va push qilmaydi. `force_today` shu kuni yana bir haqiqiy paket chiqarishga ruxsat beradi.

Kunlik chiqarishni to‘xtatish:

```bash
gh workflow disable publish-queue.yml --repo Abdulxadiy/Sales-Platform
```

Qayta yoqish:

```bash
gh workflow enable publish-queue.yml --repo Abdulxadiy/Sales-Platform
```

GitHub profilida commitlar hisoblanishi uchun muallif emaili hisobga bog‘langan va commitlar asosiy branchda bo‘lishi kerak. Bu konfiguratsiya hisobning GitHub `noreply` manzilini ishlatadi. [GitHub contribution qoidalari](https://docs.github.com/en/account-and-profile/reference/profile-contributions-reference).
