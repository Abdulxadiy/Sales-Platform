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

Oqim: **main push → GitHub CI → Windows/Linux paketlarini tekshirish → production deploy → yangi versiya bo‘lsa GitHub Release**. IDE’da saqlash va commit yaratishning o‘zi serverni yangilamaydi. Internetga yuborish uchun push kerak. Har bir qator alohida jo‘natilmaydi; bitta commitda bir necha fayl bo‘lishi mumkin.

## Avtomatik tekshiruv va server yangilanishi

CI backend/frontend/bot testlari, dependency auditi, production HTTPS/backup chegaralari va Windows paketini tekshiradi. Windows runner paketni yig‘adi, o‘rnatadi, ichki servisni ishga tushirib tekshiradi va o‘chirib ko‘radi.

- Yangi main push avvalgi tugamagan CI’ni bekor qiladi.
- Eskirib qolgan CI natijasi Docker imagelarini yig‘ishdan oldin ham, serverga uzatishdan oldin ham tekshiriladi.
- Serverda deploylar parallel ishlamaydi. Har chiqarishda backup → migratsiya/start → healthcheck bajariladi.
- Test muvaffaqiyatsiz bo‘lsa server oldingi chiqarishda qoladi; tuzatishni yangi commit/push bilan yuboring.
- Installer aynan tekshirilgan commit/SHA256 bilan tekshiriladi. Har build uchun o‘zgarmas alohida URL ishlatiladi; fayl avval to‘liq uzatiladi, download feed ilova sog‘lom ishga tushgandan keyin atomik yangilanadi.
- Serverda oxirgi uch Windows build saqlanadi; mobil yuklamalar saqlanib qoladi. GitHub’dagi eski Windows artifactlari muvaffaqiyatli deploydan keyin tozalanadi; artifactning odatiy muddati 1 kun.

GitHub → **Actions → CI / Deploy production** orqali natijani ko‘ring. Main’ga branch merge qilish yoki kunlik navbatni kutish talab qilinmaydi. Platforma versiyasi alohida boshqariladi; push uni sun’iy oshirmaydi.

## Versiya va GitHub Release

Har commit uchun yangi release chiqarilmaydi. Versiyani o‘zgartirmagan web tuzatishlari odatdagidek deploy bo‘ladi; mavjud GitHub Release, uning tagi va fayllari saqlanadi. Foydalanuvchiga tarqatiladigan yangi desktop versiyasida raqamni oshiring:

```bash
python3 desktop/release_version.py 1.3.1
# docs/releases/v1.3.1.md fayliga «# ILBI v1.3.1» sarlavhasi bilan yangiliklarni yozing.
python3 desktop/release_version.py
```

Buyruq desktop/frontend paketlari va lock fayllari, backend versiyasi, desktop bridge va README’dagi joriy release havolasini moslaydi; kutubxonalar versiyalarini o‘zgartirmaydi. CI versiyalar bir xil ekanini va yangi versiya uchun chiqarish tavsifi borligini tekshiradi. Kichik tuzatish — patch (`1.3.1`), yangi imkoniyat — minor (`1.4.0`), oldingi versiya bilan moslik buzilishi — major (`2.0.0`).

Tayyor o‘zgarishlar `main`’ga push qilingach, barcha CI tekshiruvlari va production deploy muvaffaqiyatli tugasa, yangi `vX.Y.Z` tagi va GitHub Release avtomatik yaratiladi. Unga aynan shu CI tekshirgan Windows `.exe`, Linux `.tar.gz`, `SHA256SUMS.txt` va `release-manifest.json` qo‘shiladi. Paketlar native qabul tekshiruvidan o‘tmagan yoki commit/versiya/checksum aralashgan bo‘lsa chiqarilmaydi. Fayllar to‘liq yuklanib, GitHub’dagi SHA-256 qiymatlari solishtirilmaguncha release draft holatida turadi.

Desktop paketlari `preview` kanalida bo‘lsa GitHub’da **Pre-release** belgisi qo‘yiladi; bu fiskal integratsiya cheklovini olib tashlamaydi. `stable` kanalidagi ikkala paket tayyor bo‘lganda release odatiy **Latest** bo‘lib chiqadi. Tag va Release deployni alohida qayta ishga tushirmaydi.

Yuklash uzilsa, o‘sha **Deploy production** run’ini qayta ishga tushirish mumkin: tugallanmagan draft aynan o‘sha commit uchun davom ettiriladi, yuklangan fayllar tekshiriladi. Nashr qilingan versiya qayta yozilmaydi; boshqa build uchun yangi versiya tanlang. Release nashri muvaffaqiyatsiz tugasa ham, sog‘lom server va ochilgan download feed saqlanadi; Actions run xatoni ko‘rsatadi. Ushbu qadamga `contents: write` huquqi faqat deploy job’da berilgan.

## To‘xtatish va qayta tekshirish

Favqulodda avtomatik deployni to‘xtatish: repo variable `DEPLOY_ENABLED=false`. Qayta yoqish: `true`. Shu qiymat yoqilganida faqat muvaffaqiyatli main CI serverni yangilaydi.

```bash
gh run list --workflow ci.yml
gh run list --workflow deploy.yml
python3 -m unittest discover -s tests/automation -v
python3 -m unittest discover -s tests/deployment -p 'test_download_activation.py' -v
```

`.env`, kalitlar, bazalar va yig‘ilgan installer Git’dan chiqarib tashlangan. Maxfiy yoki ishga tayyor bo‘lmagan fayllarni commitga qo‘shmang.
