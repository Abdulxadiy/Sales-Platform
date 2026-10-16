# Avtomatik tekshirilgan chiqarish va GitHub zaxirasi

Saqlangan kod kompyuter yoqilganda har 15 daqiqada `backup/work-in-progress` branchiga zaxiralanadi. Zaxira muvaffaqiyatli bo‘lgach chiqarish navbati avtomatik yangilanadi. GitHub Actions kuniga bir marta tekshirilgan haqiqiy ishlarni `main`ga yuboradi; kompyuter o‘chiq bo‘lsa ham GitHubga yetib borgan navbat chiqarilishi mumkin.

## Kunlik tartib

- Vaqt zonasi: `Asia/Tashkent`. Kunlik soat sana va repozitoriydan tanlanadi; ketma-ket kunlarning soati farq qiladi. Jadval odatdagi GitHub cron tekshiruvini soatning 17-daqiqasida bajaradi. Kechikkan tekshiruv kunlik ishni keyingi soatda yana sinaydi.
- Odatdagi paket 20 atrofida, minimum 15, maksimum 25 ta haqiqiy commitdan iborat. Versiya commitiga ham shu maksimum ichida joy ajratiladi.
- O‘zaro bog‘liq ilova, papka nomi, backend va frontend o‘zgarishlari bitta atomik paketda tekshiriladi. Kunlik sonni olish uchun ishlamaydigan yarim holat yuborilmaydi.
- Navbatda 15 ta mazmunli guruh bo‘lmasa, yangi haqiqiy ish kelguncha chiqarish kutiladi. Bo‘sh commit, sun’iy fayl yoki soxta Git sanasi yaratilmaydi. Ish bo‘lmagan kunlarda 15 ta haqiqiy commitni kafolatlash mumkin emas.
- Shu kun uchun paket chiqarilgan bo‘lsa, takror ishga tushirish yana commit yubormaydi. Yangi backup bu kunlik hisobni o‘chirmaydi.

GitHub cron aynan belgilangan daqiqada boshlanishi kafolatlanmaydi. Tizim kechikkan ishga tushirishni ushlaydi. [GitHub schedule hujjati](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

## Versiyalar

Ilova versiyasi backend `pyproject.toml` orqali yuritiladi. Ilovaga tegishli `fix`/`perf`/`refactor` paketi patch, `feat` paketi minor, `!` bilan belgilangan moslikni buzuvchi paket major versiyani oshiradi. Hujjat, test, dizayn manbasi yoki chiqarish avtomatizatsiyasi o‘zgarishining o‘zi ilova versiyasini oshirmaydi.

Versiya bir paketda bir marta o‘zgaradi. Faqat backend loyiha versiyasi, `uv.lock`dagi shu loyihaning yozuvi, frontend `package.json` va `package-lock.json`dagi loyiha yozuvlari yangilanadi. Dependency versiyalari va hujjatlardagi matnlar ommaviy almashtirilmaydi. Mos `vX.Y.Z` tagi `main` va navbat holati bilan bir atomik pushda yuboriladi. Keyingi eski lokal nusxa chiqarilgan versiyani pasaytirmaydi.

## Branchlar

| Branch | Vazifa |
|---|---|
| `main` | Tekshirilgan chiqarishlar |
| `backup/work-in-progress` | Eng oxirgi muvaffaqiyatli manba zaxirasi |
| `queue/ready` | Kelgusi chiqarishlarning muzlatilgan manbasi va rejasi |
| `queue/progress` | Tugallangan guruhlar, kunlik hisob va oxirgi versiya |

Faol navbat yangilanganda hali chiqarilmagan farqlar yangi asosda qayta hisoblanadi. Oldingi navbat va holat Git tarixida saqlanadi; main o‘zgartirilmaydi. `main` tashqaridan o‘zgargan bo‘lsa jarayon to‘xtaydi va yangi asosni ko‘rib chiqish kerak bo‘ladi. Force push ishlatilmaydi. Ishchi kompyuterdagi HEAD, indeks va fayllar boshqa clone orqali chiqarishdan ta’sirlanmaydi.

Zaxira branchi repozitoriy bilan bir xil ochiqlikda. `.env`, maxfiy kalit, ma’lumotlar bazasi, media va kesh manba zaxirasiga kirmaydi. IDE’da saqlanmagan buferlar ham yuborilmaydi.

## Tekshiruvlar va boshqarish

Har paket avtomatizatsiya integratsion testlari, backend testlari, API sxemasi, frontend testlari, lint va builddan o‘tadi. Birortasi muvaffaqiyatsiz bo‘lsa `main`, tag va navbat holati oldinga siljimaydi.

```bash
python3 scripts/commit_queue.py backup
python3 scripts/commit_queue.py status
python3 scripts/commit_queue.py gate
python3 scripts/commit_queue.py enqueue --refresh
python3 -m unittest discover -s tests/automation -v
```

GitHub → Actions → **Publish reviewed changes** → **Run workflow** vaqtni kutmasdan chiqarishni tekshiradi; kunlik chegaralar va tekshiruvlar saqlanadi. `dry_run` push qilmaydi. Sozlamalar `automation/commit-queue.json`da, mazmunli guruhlar va atomik bog‘liqliklar `automation/queue-plan.json`da.

Linux zaxira taymeri:

```bash
python3 scripts/install_backup_timer.py
systemctl --user list-timers ilbi-source-backup.timer
journalctl --user -u ilbi-source-backup.service -n 30
```

Yangi kompyuterda eng oxirgi manbani tiklash:

```bash
git clone --branch backup/work-in-progress --single-branch https://github.com/Abdulxadiy/Sales-Platform.git Sales-Platform-recovered
```
