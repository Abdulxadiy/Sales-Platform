# Saqlangan kodni main va serverga avtomatik chiqarish

Kod saqlangach 8 soniya davomida boshqa o‘zgarish kelmasa, lokal xizmat bitta haqiqiy commit yaratib to‘g‘ridan to‘g‘ri `main`ga push qiladi. Kunlik vaqt, commit soni chegarasi va chiqarish navbati yo‘q. Bir necha faylni ketma-ket saqlash bitta commitga birlashadi. IDE’da hali saqlanmagan matn yuborilmaydi.

Oqim: **Save → main → GitHub CI → Windows paketi va tekshiruvlar → production deploy**. CI/backend/frontend/Windows tekshiruvlari muvaffaqiyatli tugagach GHCR imagelari va tekshirilgan Windows o‘rnatuvchisi serverga avtomatik yetkaziladi. Test xatosida server oldingi chiqarishda qoladi; xatoni lokal tuzatib saqlash yangi urinishni boshlaydi. Yangi push oldingi CI’ni bekor qiladi, serverga o‘tishdan oldin commit hali ham eng yangi main ekanligi tekshiriladi.

## Ushbu kompyuter

`ilbi-auto-publish.service` foydalanuvchi sessiyasida avtomatik ishlaydi. Internet bo‘lmasa o‘zgarishlar diskda qoladi va ulanish qaytgach qayta yuboriladi. Kompyuter o‘chiq bo‘lganda lokal fayllarni yuborish imkoni yo‘q; GitHubga yuborilgan CI/deploy kompyutersiz davom etadi.

```bash
python3 scripts/auto_publish.py status
systemctl --user status ilbi-auto-publish.service
journalctl --user -u ilbi-auto-publish.service -n 30
```

Qo‘lda tez yuborish:

```bash
python3 scripts/auto_publish.py once --align
```

Xizmatni vaqtincha to‘xtatish/qayta yoqish:

```bash
systemctl --user stop ilbi-auto-publish.service
systemctl --user start ilbi-auto-publish.service
```

## Boshqa Linux kompyuterda sozlash

`git`, `gh`, Python 3.12+ va systemd user sessiyasi kerak. `gh auth login` orqali repository/workflow yozish huquqiga ega hisobni ulang. `main`ni clone qiling, keyin:

```bash
python3 scripts/auto_publish.py once --initialize --align
python3 scripts/install_auto_publish.py
```

Birinchi `--initialize` shu kompyuterdagi to‘liq manba holatini chiqaradi: o‘chirilgan manbalar ham main’dan o‘chadi. Keyingi safarlarda faqat lokal o‘zgargan fayllar yuboriladi. Boshqa kompyuter main’dagi aynan shu faylni o‘zgartirgan bo‘lsa, avtomatik bosib yozish o‘rniga jurnalga konflikt yoziladi. Uni solishtirib birlashtiring. Force push ishlatilmaydi. Har pushdan keyin lokal main/index yangilanadi; ishchi fayllar, shu jumladan upload vaqtida saqlangan yangi tahrirlar saqlanadi. Dastlabki lokal HEAD `refs/auto-publish/initial-head` orqali, oldingi HEAD esa `refs/auto-publish/before-alignment` orqali saqlanadi.

`.env`, kalitlar, ma’lumotlar bazasi, media, node_modules va yig‘ilgan installer Git’ga yuborilmaydi. Manbada token aniqlansa push to‘xtaydi. `.auto-publish-local/` — faqat shu kompyuterning xususiy holati va izolyatsiyalangan Git nusxasi. Uni Git’ga qo‘shmang.

Sozlamalar: `automation/auto-publish.json`. Platforma versiyasi alohida boshqariladi; avtomatik push versiyani sun’iy oshirmaydi.

```bash
python3 -m unittest discover -s tests/automation -v
```
