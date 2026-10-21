## 1. Ilovani birinchi marta sozlash

ILBI ilovasida kundalik savdo va ombor ekranlari webdagidek ishlaydi. Bu qo‘llanma faqat kompyuterga o‘rnatish, internetsiz ishlash va kassalarni ulashni tushuntiradi.

[Yuklab olish sahifasidan](/download) Windows uchun ILBI’ni oling. Yuklangan `.exe` faylni oching va o‘rnatishni tugating. Ish stolida paydo bo‘lgan **ILBI** belgisini ikki marta bosing.

**Linux’da o‘rnatish:** shu sahifadagi **Linux uchun yuklab olish** tugmasidan `.tar.gz` arxivni oling. Arxivni oching, ichidagi **ILBI** papkasida terminal ochib `bash install.sh` buyrug‘ini bajaring. `sudo` ishlatmang. Keyin ilovalar menyusidan **ILBI**ni oching. VirtualBox, Wine, Docker, alohida Python yoki PostgreSQL kerak emas. Linux x86_64, grafik ish stoli va ochilgan GNOME Keyring yoki KWallet parollar ombori kerak; Arch Linux va Ubuntu 22.04+ uchun paket tayyorlanadi.

Linux’da birinchi ochishda maxfiy ma’lumotlar ombori ruxsat so‘rasa, shu foydalanuvchi uchun ruxsat bering. “Maxfiy ma’lumotlar ombori ochilmadi” chiqsa, GNOME Keyring yoki KWallet o‘rnatilganini va qulfdan ochilganini tekshiring. Bu ombor qurilma kalitlarini himoya qiladi. Windows va Linux’da qolgan sozlash qadamlari bir xil; quyidagi rasmlar ikkala nusxaga ham tegishli.

**Arch Linux uchun qadamlar:**

1. **Linux uchun yuklab olish** tugmasini bosing. Fayl menejerida yuklangan `ILBI-1.2.0-linux-x64.tar.gz` arxivini ochib, bir papkaga chiqaring.
2. Hosil bo‘lgan **ILBI** papkasiga kiring. Bo‘sh joyni o‘ng bosib **Terminalda ochish**ni tanlang.
3. `bash install.sh` yozib, `Enter` bosing. O‘rnatish administrator parolisiz bajariladi. Ilovalar menyusida **ILBI** paydo bo‘ladi. Menyuda darhol ko‘rinmasa, `~/.local/bin/ilbi` buyrug‘i bilan oching.
4. **Ishni boshlash**ni bosing va quyidagi 2-bo‘lim bo‘yicha do‘konni ulang.

Agar ilova kutubxona yetishmayotganini aytib ochilmasa, Arch’ni yangilab, grafik kutubxonalarni o‘rnating: `sudo pacman -Syu --needed gtk3 nss alsa-lib libxss libxtst libsecret gnome-keyring`. GNOME/KDE’da parollar ombori odatda kirishda ochiladi; Hyprland kabi ish stollarida uning ishga tushishini va qulfdan ochilishini alohida sozlash kerak bo‘lishi mumkin. ILBI’ni `sudo` yoki `--no-sandbox` bilan ochmang.

Hozir `yay -S ilbi` va `sudo pacman -S ilbi` orqali tarqatilmaydi: AUR yoki alohida paket repozitoriysida hali e’lon qilinmagan. Rasmiy yuklab olish sahifasidagi arxivdan foydalaning. Shu arxiv boshqa mos x86_64 Linux tizimlarida ham ishlaydi; Ubuntu 22.04+ va Arch uchun tekshiruv bor. ARM kompyuterlar va Alpine kabi musl tizimlari ushbu paketga kirmaydi.

Bitta kompyuterda ishlasangiz, boshqa kassaga ulanish yoki fayl ko‘chirish kerak emas. Ilova ma’lumotlarni shu kompyuterda saqlaydi. Keyinchalik kassalar soni oshsa, boshqa kompyuterlarni shu tayyor kassaga ulashingiz mumkin; qayta sozlash talab qilinmaydi. Boshqa, mustaqil do‘konlar o‘z ilovasini alohida sozlaydi.

![Bitta kompyuterda boshlash: 1 — Ishni boshlash tugmasi. Serverni sozlash talab qilinmaydi.](desktop-guide/01-primary-setup.png)

**Ishni boshlash** tugmasini bosing va kirish oynasi ochilishini kuting. Birinchi tayyorlash odatdagidan uzoqroq davom etishi mumkin.

Server manzili avtomatik tanlanadi va ilova ichida o‘zgartirilmaydi. Login va sinxronlash faqat rasmiy `https://new-dev.site` serveri orqali ishlaydi. Platforma `ilbi.uz`ga ko‘chsa, yangi rasmiy ilovani o‘rnatasiz; manzilni qo‘lda kiritish kerak bo‘lmaydi. “Server manzili rasmiy ILBI manziliga mos emas” xabari chiqsa, rasmiy sahifadan ilovani yangilang yoki yordamga murojaat qiling. Mahalliy baza va `device.vault` faylini o‘chirmang.

## 2. Do‘konni offline ishlashga tayyorlash

Birinchi sozlashda internet kerak. **Do‘kon egasi** o‘zining odatiy hisobi bilan internet orqali kirsin. Ishlaydigan do‘konni tanlang; bitta do‘kon bo‘lsa, u avtomatik tanlanadi.

![Do‘konni tayyorlash: 1 — ochilgan Sinxronlash markazi, 2 — offline parol, 3 — tayyorlashni boshlash.](desktop-guide/02-prepare.png)

1. Ekranning yuqorisidagi **Offline tayyorlash** yozuvini bosing. Rasmda 1 bilan ko‘rsatilgan **Sinxronlash markazi** ochiladi.
2. Kamida **8 belgili offline parol** yarating. Bu parolni keyinchalik internetsiz kirishda ishlatasiz. Oddiy web parolingiz avtomatik ravishda offline parolga aylanmaydi.
3. **Offline ishlashni tayyorlash** tugmasini bosing. Do‘kon ma’lumotlari shu kompyuterga tushishini kuting; dastur sahifani yangilaydi.

Har bir kassir ham o‘z hisobi bilan internet orqali bir marta kirsin. **Hisobni kassaga ulash** tugmasini ochib, o‘z offline parolini yaratsin. Do‘kon tayyorlangan bo‘lsa, uni qayta asosiy kassa qilib sozlash kerak emas. Boshqa kassirning login/parolidan foydalanmang.

> [!TIP]
> Tayyorlashni internet bor paytda tugating. Internet uzilgandan keyin yangi do‘konni yuklab olish yoki ilgari ulanmagan hisobni tayyorlash imkoni bo‘lmaydi.

## 3. Internet bo‘lmaganda kirish

![Internetsiz kirish: 1 — shaxsiy login, 2 — oldindan yaratilgan offline parol, 3 — Kassaga kirish.](desktop-guide/03-offline-login.png)

1. ILBI’ni oching va kirish oynasidagi **Offline kassaga kirish** qismini toping.
2. O‘z **login**ingizni va 2-qadamda yaratgan **offline parol**ingizni kiriting.
3. **Kassaga kirish** tugmasini bosing. Ilgari yuklangan do‘kon ma’lumotlari bilan ishlashda davom etasiz.

Klassik va Tezkor ish stoli shu ilovaning ichida ham bor. Tashqi ko‘rinishni almashtirish qayta sozlashni talab qilmaydi. Odatdagi savdo ekranlarini o‘rganish uchun web qo‘llanmasidan foydalanishingiz mumkin.

Internet yo‘q paytda bajarilgan ishlar avval shu do‘kon kompyuterida saqlanadi. Webdagi boshqa qurilmalar ularni **serverga yuborilgandan keyin** ko‘radi. Faqat yuklangan ma’lumotlar va rasmlar ochiladi; Telegram, to‘lov xizmatlari va do‘konlararo tasdiqlar uchun internet kerak.

Offline ruxsat oxirgi muvaffaqiyatli yangilanishdan keyin **7 kun** amal qiladi. Internet borida u avtomatik yangilanib turadi. Muddati tugasa, do‘kon egasi internet orqali qayta kirib hisobni kassaga ulashi kerak. Yuborilmagan ishlar o‘chirilmaydi.

## 4. Ishlar serverga qanday yuboriladi?

Internet qaytganda dastur ishlarni avtomatik yuboradi. Har safar alohida tugma bosish shart emas. Tafsilotni ko‘rish uchun yuqoridagi **Offline**, **Sinxronlanmoqda** yoki **Sinxronlangan** yozuvini bosing.

![Sinxronlash navbati: 1 — hozir yuborilayotgan ish va foiz, 2 — oldinga olish tugmasi.](desktop-guide/04-queue.png)

1. **Yuborilmoqda…** qatoridagi foiz hozirgi yuborish holatini ko‘rsatadi. **Server tasdig‘i kutilmoqda…** chiqsa, javob kelishini kuting; hali yakunlandi degani emas.
2. **Kutilmoqda…** qatorlari navbat bilan yuboriladi. Aynan bir ish tezroq kerak bo‘lsa, uning **Darhol sinxronlash** tugmasini bosing.

![Darhol tanlangan ish: 1 — davom etayotgan yuborish, 2 — undan keyin bajariladigan ustuvor ish.](desktop-guide/05-priority.png)

Davom etayotgan ish to‘xtatilmaydi. Tanlangan qator silliq siljib, uning tagiga joylashadi va **Keyingi bajariladi** deb ko‘rinadi. Aylanuvchi strelkalar bilan ajratiladi. Unga zarur bog‘liq ishlar bo‘lsa, dastur avval ularni yuboradi.

**Barcha operatsiyalar yuborilgan** yozuvi va bo‘sh navbat — mahalliy ishlar serverga yetganini bildiradi. Kun oxirida yoki ilovani yangilashdan oldin shu holatni tekshirib oling.

![Xatoni tekshirish: 1 — sabab yozilgan qator, 2 — tuzatgandan keyingi Qayta urinish.](desktop-guide/06-retry.png)

**Tekshirish kerak** chiqsa, shu yozuvni ochib xato sababini o‘qing. Internet yoki kirish ruxsati muammosini hal qilgach, ruxsat berilgan qatorda **Qayta urinish**ni bosing. **Serverga qayta kirish** havolasi chiqsa, qurilmani ulagan do‘kon egasi hisobidan kiring. Bog‘liq operatsiya bloklangan bo‘lsa, avval uning sababini hal qiling; ma’lumotni qaytadan kiritish yoki bazani o‘chirish shart emas.

## 5. Shu do‘konga ikkinchi yoki uchinchi kassani ulash

Barcha kassalar bitta mahalliy tarmoqqa — bir routerdagi Wi-Fi yoki kabelga ulangan bo‘lsin. Internet bo‘lmasa ham shu tarmoq ishlashi kerak.

1. Tayyorlangan asosiy kompyuterda ILBI’ni ochiq qoldiring. Yuqoridagi **ILBI → Boshqa kassani ulash** menyusini tanlang. Tarmoq tanlash so‘ralsa, boshqa kassalar ulangan Wi-Fi yoki kabel tarmog‘ini tanlang.
2. `ILBI-kassa-ulanish.ilbi` faylini saqlang va shu do‘konning qo‘shimcha kompyuteriga, masalan, fleshka orqali olib o‘ting.
3. Qo‘shimcha kompyuterga ham ILBI’ni o‘rnating. Birinchi oynadagi **Boshqa kassaga ulanish** bo‘limini oching. Birinchi, yolg‘iz kassangizda bu bo‘lim kerak emas.

![Qo‘shimcha kassa: 1 — tayyor kassaga ulanish bo‘limi, 2 — .ilbi faylini ochish.](desktop-guide/07-extra-register.png)

4. **Ulanish faylini ochish**ni bosing va olib kelgan `.ilbi` faylini tanlang. Qo‘shimcha kassada **Ishni boshlash** orqali alohida baza tayyorlash kerak emas.
5. Kassir o‘z hisobi bilan kirsin. Uning offline hisobi hali tayyor bo‘lmasa, internet bor paytda 2-bo‘limdagi **Hisobni kassaga ulash** qadamini bajaring.

> [!IMPORTANT]
> Qo‘shimcha kassalar ishlashi uchun asosiy kompyuter ham, undagi ILBI ham ochiq turishi kerak. Oynani kichraytirish mumkin. Asosiy kompyuter uxlab qolsa, o‘chsa yoki ILBI yopilsa, qo‘shimcha kassalar umumiy bazaga ulana olmaydi.

Ulanmasa, bir xil mahalliy tarmoq va Windows’dagi ILBI uchun xususiy tarmoq ruxsatini tekshiring. Asosiy kompyuterning tarmoq manzili o‘zgarsa, yangi ulanish faylini oling; qo‘shimcha kassada **ILBI → Ulanish faylini yangilash** orqali tanlang. Routerda asosiy kompyuterga doimiy mahalliy manzil ajratish buni kamaytiradi. Ulanish faylini boshqa do‘kon yoki begona kishiga bermang.

## 6. Ilovani yangilash va yordam

Yangi versiyani [yuklab olish sahifasidan](/download) oling. Avval yuborilmagan navbatni tekshiring, do‘kondagi ILBI oynalarini yoping va yangi o‘rnatuvchini ishga tushiring. Bu versiyada yangilanish avtomatik o‘rnatilmaydi.

O‘rnatuvchi mahalliy baza, sozlamalar va yuborilmagan ishlarni saqlab qoladi. Ular Windows’da `%APPDATA%\ILBI`, Linux’da esa odatda `~/.config/ILBI` papkasida turadi (`XDG_CONFIG_HOME` belgilangan bo‘lsa, o‘sha joydagi `ILBI` papkasida). Linux’da yangilash uchun yangi arxivni ochib, uning `install.sh` faylini yana ishga tushiring. Zaxira olishda barcha kassalarni to‘xtatib, asosiy ILBI’ni yoping va ma’lumotlar papkasining nusxasini oling. Papka yoki `device.vault` faylini muammoni tuzatish uchun o‘chirmang. Kalitlar tizim hisobingiz va parollar omboriga bog‘liq; boshqa hisob yoki yangi kompyuterga o‘tishni yordam bilan rejalashtiring.

Qo‘llanma **ILBI → Ilovani sozlash (rasmli qo‘llanma)** menyusidan ham ochiladi. Uning matni va rasmlari ilova ichida saqlanadi, shuning uchun internet kerak emas. Rasm ustiga bossangiz kattalashadi; `Esc` bilan yoping.

Muammo qolsa, [Yordam markaziga](/support) murojaat qiling. Qaysi kompyuter asosiyligi, ekrandagi xato va sinxronlash navbatida yuborilmagan ish bor-yo‘qligini yozing.

> [!NOTE]
> Joriy yuklama sinov nusxasidir. Haqiqiy POS savdosi mavjud fiskal ulanish chekloviga bo‘ysunadi; ilovani o‘rnatish bu cheklovni olib tashlamaydi. Rasmlardagi do‘kon va operatsiyalar tushuntirish uchun yaratilgan namunalardir.
