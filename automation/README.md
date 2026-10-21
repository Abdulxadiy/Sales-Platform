# GitHub orqali avtomatik deploy

Lokal fayllarni saqlash GitHub’ga hech narsa yubormaydi. Kuzatuvchi xizmat, kunlik chiqarish jadvali va commit soni cheklovlari olib tashlangan. Tayyor o‘zgarishni main’ga odatiy Git buyruqlari yoki IDE Source Control orqali yuboring:

```bash
git status
# Faqat chiqarishga tayyor fayllarni tanlang:
git add README.md
# Zarur bo‘lsa boshqa tayyor fayllarni ham qo‘shing.
git commit -m "fix: o‘zgarish tavsifi"
git push origin main
```

Oqim: **main push → GitHub CI → Windows paketini tekshirish → production deploy**. IDE’da saqlash va commit yaratishning o‘zi serverni yangilamaydi. Internetga yuborish uchun push kerak. Har bir qator alohida jo‘natilmaydi; bitta commitda bir necha fayl bo‘lishi mumkin.

## Avtomatik tekshiruv va server yangilanishi

CI backend/frontend/bot testlari, dependency auditi, production HTTPS/backup chegaralari va Windows paketini tekshiradi. Windows runner paketni yig‘adi, o‘rnatadi, ichki servisni ishga tushirib tekshiradi va o‘chirib ko‘radi.

- Yangi main push avvalgi tugamagan CI’ni bekor qiladi.
- Eskirib qolgan CI natijasi Docker imagelarini yig‘ishdan oldin ham, serverga uzatishdan oldin ham tekshiriladi.
- Serverda deploylar parallel ishlamaydi. Har chiqarishda backup → migratsiya/start → healthcheck bajariladi.
- Test muvaffaqiyatsiz bo‘lsa server oldingi chiqarishda qoladi; tuzatishni yangi commit/push bilan yuboring.
- Installer aynan tekshirilgan commit/SHA256 bilan tekshiriladi. Har build uchun o‘zgarmas alohida URL ishlatiladi; fayl avval to‘liq uzatiladi, download feed ilova sog‘lom ishga tushgandan keyin atomik yangilanadi.
- Serverda oxirgi uch Windows build saqlanadi; mobil yuklamalar saqlanib qoladi. GitHub’dagi eski Windows artifactlari muvaffaqiyatli deploydan keyin tozalanadi; artifactning odatiy muddati 1 kun.

GitHub → **Actions → CI / Deploy production** orqali natijani ko‘ring. Main’ga branch merge qilish yoki kunlik navbatni kutish talab qilinmaydi. Platforma versiyasi alohida boshqariladi; push uni sun’iy oshirmaydi.

## To‘xtatish va qayta tekshirish

Favqulodda avtomatik deployni to‘xtatish: repo variable `DEPLOY_ENABLED=false`. Qayta yoqish: `true`. Shu qiymat yoqilganida faqat muvaffaqiyatli main CI serverni yangilaydi.

```bash
gh run list --workflow ci.yml
gh run list --workflow deploy.yml
python3 -m unittest discover -s tests/automation -v
python3 -m unittest discover -s tests/deployment -p 'test_download_activation.py' -v
```

`.env`, kalitlar, bazalar va yig‘ilgan installer Git’dan chiqarib tashlangan. Maxfiy yoki ishga tayyor bo‘lmagan fayllarni commitga qo‘shmang.
