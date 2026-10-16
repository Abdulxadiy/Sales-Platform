# ILBI.UZ Motion Studio

To‘rtta alohida, SVG asosidagi logo animatsiyasi va ularni ko‘rish uchun mustaqil galereya. Asosiy frontend/backend bilan import, konfiguratsiya yoki API orqali bog‘lanmagan. Barcha yangi fayllar shu papkada.

## Ishga tushirish

Node.js 22 yoki undan yangi versiya kerak. Paket o‘rnatish talab qilinmaydi.

```bash
cd branding/ilbi-motion-studio
npm start
```

Brauzer: **http://localhost:5189/**. Videolar: **http://localhost:5189/exports/**.

Server faqat shu studiya papkasini va `127.0.0.1` manzilini ochadi. Loyiha katalogi yoki `.env` fayllarini taqdim etmaydi. Boshqa port kerak bo‘lsa: `PORT=5190 npm start`.

## Konseptlar

| ID | Animatsiya | Davomiyligi | Asosiy usul |
| --- | --- | --- | --- |
| 01 | Chiziq bo‘ylab ochilish | 5.2 s | Chiziq → niqob orqali lenta → monogram → harflar |
| 02 | Blokma-blok qurilish | 5.1 s | Mustaqil vektor qismlar → aniq yig‘ilish → harflar |
| 03 | Nuqta va yumshoq sakrash | 5.1 s | Bitta nuqta → sakrash → monogram → yumshoq o‘rnashish |
| 04 | Yorug‘lik va premium yakun | 5.0 s | Xira to‘liq logo → konturga tushuvchi nur → tiniq logo |

Har birida ijro/pauza, qayta ijro, tezlik, vaqt shkalasi, bosqichga o‘tish, 16:9 / 1:1 / 9:16 formatlari va toza ko‘rinish mavjud. `Space`: ijro/pauza; `R`: qayta ijro; `←` / `→`: bir kadr; `1`–`4`: konsept tanlash. Standart ijro bir marta o‘ynab, yakuniy logoda to‘xtaydi.

`prefers-reduced-motion` yoqilganda barcha konseptlar yakuniy statik logoni darhol ko‘rsatadi.

## Manba va logo aniqligi

Manba: `../animation_prompts/ILBI_UZ_Codex_Prompts_and_References/` ichidagi to‘liq qo‘llanma va uning to‘rtta aniq PNG fayli. Ko‘rish uchun nusxalar `assets/references/concept-01.png`–`concept-04.png` ichida. Asl fayllar saqlandi.

Ushbu monogramga mos rasmiy SVG master topilmadi. `src/logo.js` dagi monogram va yozuv birinchi storyboardning 5-panelidan qo‘lda vektor sifatida qayta chizilgan. Bu rasmiy original vektor yoki original bilan piksel darajasida aynan teng nusxa degani emas. To‘rtta konsept bir xil umumiy geometriyadan foydalanadi; ularning yakuniy kadrlari o‘zaro bir xil. Harflar ham SVG konturlar; raster kesma yoki tizim shrifti animatsiya qilinmaydi. Boshqa storyboardlardagi mayda generativ farqlar o‘rniga bitta umumiy logo ishlatilgan.

Galereya shrifti: lokal Adwaita Sans, litsenziya `assets/FONT-LICENSE.txt`. Videodagi logo shriftga bog‘liq emas. Runtime CDN, tashqi API yoki tarmoqdan yuklanadigan resurs yo‘q.

## Tekshirish va build

```bash
npm run build
npm run check
```

`build` barcha JavaScript fayllarining sintaksisini tekshiradi va mustaqil statik saytni `dist/` ichiga yig‘adi. `check` uchun lokal Chrome/Chromium kerak; qo‘shimcha npm kutubxonasi kerak emas. U animatsiya parametrlarini, 20 ta kadrni, oxirgi bir soniyaning qimirlamasligini, orqaga seek, barcha konseptlarning bir xil yakunini, responsive formatlarni, galereya boshqaruvlarini va kamaytirilgan harakat rejimini tekshiradi. Natijalar va rasmlar `qa/` ichida.

## MP4 eksport

Chrome/Chromium va `ffmpeg` kerak. Zarur bo‘lsa `CHROME_PATH=/path/to/chrome` belgilang.

```bash
npm run export
npm run export -- --concept=03
npm run export -- --concept=02 --format=square
npm run export -- --concept=04 --format=portrait
```

Eksport skripti alohida vaqtinchalik lokal server va headless Chrome ochadi. SVG sahnani har kadrda aniq vaqtga o‘tkazib, 60 fps da PNG kadrlarni to‘g‘ridan-to‘g‘ri FFmpeg’ga beradi. Natija: H.264 / yuv420p / CRF 18 / BT.709 / faststart MP4. Ovoz qo‘shilmagan. Vaqtinchalik brauzer profili va server yakunda yopiladi. Eksportda galereya, tugmalar, sarlavhalar yoki storyboardlar ko‘rinmaydi.

16:9 fayllari:

- `exports/ilbi-concept-01-line-draw-reveal.mp4`
- `exports/ilbi-concept-02-modular-assembly.mp4`
- `exports/ilbi-concept-03-dot-pop-up-soft-bounce.mp4`
- `exports/ilbi-concept-04-luminous-sweep-premium-finish.mp4`

Qo‘shimcha formatlar nomiga `-square` yoki `-portrait` qo‘shiladi. Galereyadagi yuklab olish tugmalari 16:9 MP4’lariga yo‘naltirilgan.

## Tuzilishi va qayta ishlatish

- `src/logo.js`: umumiy logo geometriyasi va ranglar.
- `src/motions/`: to‘rtta mustaqil `state(seconds)` timeline moduli va nomlangan bosqichlar.
- `src/renderer.js`: SVG yaratish va vaqtga bog‘liq render.
- `src/player.js`: play / pause / restart / seek / dispose.
- `src/app.js`: faqat galereya boshqaruvlari va eksport API.
- `scripts/`: lokal server, build, brauzer tekshiruvlari, video eksport.

Istalgan kadr faqat `concept + seconds` dan hisoblanadi. CSS animatsiya, tasodifiy qiymat yoki yig‘iluvchi holat yo‘q. Render API:

```js
window.ilbi.select('03');
window.ilbi.seek(2.1);
window.ilbi.play();
window.ilbi.pause();
window.ilbi.restart();
window.ilbi.format('portrait');
window.ilbi.snapshot();
```

Faqat animatsiya: `/?clean=1&concept=03&format=landscape`.
Avtomatik ijrosiz kadr olish: `/?capture=1&concept=03`.

## Eski Antigravity animatsiyalari

Eski `localhost:5188/ilbi_5_animations_suite.html` fayli Antigravity’ning `brain/2c2adf6d-515e-4178-ac01-c07e98144901` katalogida topildi. Uning HTML’i, oldingi splash/demo HTML’lari, logo sinovi, shu animatsiyalarga tegishli skrinshotlar va eskirgan walkthrough olib tashlandi — jami 26 xil fayl. Eski 5188 serverining ish papkasi tekshirilib, server to‘xtatildi. Antigravity shu ish davomida asosiy HTML, beshta rasm, walkthrough va serverni qayta yaratdi; ular qayta tozalandi. Foydalanuvchi yuklagan manba rasmlari va suhbat tarixi saqlandi. Yangi studiya alohida **5189** portdan foydalanadi. Tafsilot: `qa/old-animation-cleanup.json`.
