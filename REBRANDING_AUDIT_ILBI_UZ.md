# 🎯 TO‘LIQ PLATFORMA REBRENDING AUDITI: INVENTRA / SALES-PLATFORM -> ILBI.UZ

> **Holati:** Audit 100% yakunlandi. Barcha o‘rinlar qat’iy ro‘yxatga olindi.
> **Jami tahlil qilingan fayllar:** 98 ta kod/konfig/hujjat fayli.
> **Jami topilgan mosliklar soni:** 791 ta aniq o‘rin.
> **Maqsad:** Butun tizimdagi barcha `inventra`, `Inventra`, `INVENTRA` va `Sales-Platform` so‘zlari, logotiplari, xabarnomalari, bazalari, kalitlari va yo‘nalishlarini `ilbi.uz` / `ILBI` ga almashtirish uchun to‘liq yo‘riqnoma.

---

## 📌 MUNDARIJA
1. **1. Logotiplar va Vizual Brending (Logos, Icons, Animation)** — *2 ta fayl, 9 ta o‘rin*
2. **2. Email va Elektron Xabarnomalar (Email Templates & Notifications)** — *1 ta fayl, 15 ta o‘rin*
3. **3. Telegram Bot va 2FA SMS Xabarlari (Telegram Service & Messages)** — *7 ta fayl, 22 ta o‘rin*
4. **4. Frontend Foydalanuvchi Interfeysi (UI Pages, Components, Receipts)** — *23 ta fayl, 98 ta o‘rin*
5. **5. Frontend Xotira va Sozlamalar (localStorage, Session, API Client)** — *6 ta fayl, 44 ta o‘rin*
6. **6. Docker, Nginx va Infratuzilma (Compose, Nginx, Env sozlamalari)** — *8 ta fayl, 76 ta o‘rin*
7. **7. Backend Servislar, Sozlamalar va Baza (Django, Celery, DB, Tests)** — *27 ta fayl, 45 ta o‘rin*
8. **8. Rasmiy Hujjatlar va Yuridik Matnlar (Legal Docs, Oferta, Maxfiylik)** — *3 ta fayl, 21 ta o‘rin*
9. **9. Qo‘llanmalar, Yo‘l Xaritalari va Hujjatlar (Guides, Docs, README)** — *16 ta fayl, 436 ta o‘rin*
10. **10. CI/CD va IDE Konfiguratsiyalari (GitHub Workflows, IDE)** — *5 ta fayl, 25 ta o‘rin*
11. **Papka va Fayllarni Qayta Nomlash Rejasi (Renaming Plan)**
12. **Logotip va Grafik Fayllar Ro‘yxati (Brand Assets)**

---

## 1. Logotiplar va Vizual Brending (Logos, Icons, Animation) (Jami: 2 ta fayl, 9 ta o‘rin)

### 📄 `frontend/inventra/src/components/common/InventraIntroAnimation.jsx` (4 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `4` | `* Inventra Intro Animation` |
| `7` | `* - Stage 3: Shifts left and futuristic "INVENTRA" typography emerges on the right` |
| `10` | `export default function InventraIntroAnimation({ onComplete, isDark = true }) {` |
| `288` | `INVENTRA` |

### 📄 `frontend/inventra/src/components/common/InventraLogo.jsx` (5 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `4` | `* Inventra Concept 2 — Precision Shelving & "I" Monogram Logo` |
| `7` | `export default function InventraLogo({` |
| `27` | `className={`inventra-logo-wrap ${className}`}` |
| `50` | `className="inventra-logo-svg"` |
| `204` | `INVENTRA` |

## 2. Email va Elektron Xabarnomalar (Email Templates & Notifications) (Jami: 1 ta fayl, 15 ta o‘rin)

### 📄 `inventra/apps/accounts/services/password_reset_service.py` (15 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `257` | `"subject": "Inventra — Yangi do‘koningiz yaratildi! Hisobingizni faollashtiring",` |
| `260` | `f"Assalomu alaykum! Siz Inventra savdo platformasiga do‘kon egasi sifatida ro‘yxatdan o‘tkazildingiz{tenant_badge}. "` |
| `264` | `f"Siz Inventra platformasiga do‘kon egasi sifatida ro‘yxatdan o‘tkazildingiz{f' ({tenant_name})' if tenant_name else ''}.\n"` |
| `277` | `"subject": "Inventra — Siz jamoaga taklif qilindingiz",` |
| `278` | `"title": "Inventra jamoasiga xush kelibsiz! 👋",` |
| `280` | `f"Assalomu alaykum! Siz Inventra tizimiga do‘kon xodimi{pos_str} sifatida taklif qilindingiz{tenant_badge}. "` |
| `284` | `f"Siz Inventra tizimiga xodim{pos_str} sifatida taklif qilindingiz.\n"` |
| `296` | `"subject": "Inventra — Do‘kon egaligi sizga topshirildi",` |
| `299` | `f"Assalomu alaykum! Sizga Inventra tizimidagi do‘kon{tenant_badge} egaligi va to‘liq boshqaruv huquqi topshirildi. "` |
| `303` | `f"Sizga Inventra tizimidagi do‘kon{f' ({tenant_name})' if tenant_name else ''} egaligi topshirildi.\n"` |
| `315` | `"subject": "Inventra — Parolingizni qayta tiklash",` |
| `318` | `"Assalomu alaykum! Sizning Inventra hisobingiz uchun parolni qayta tiklash so‘rovi qabul qilindi. "` |
| `322` | `"Sizning Inventra hisobingiz uchun parolni qayta tiklash so‘rovi qabul qilindi.\n"` |
| `398` | `<span style="font-size: 19px; font-weight: 800; letter-spacing: -0.02em; color: #0f172a;">INVENTRA</span>` |
| `452` | `© 2026 Inventra Platform. Barcha huquqlar himoyalangan.` |

## 3. Telegram Bot va 2FA SMS Xabarlari (Telegram Service & Messages) (Jami: 7 ta fayl, 22 ta o‘rin)

### 📄 `inventra/api/v1/accounts/views/misc.py` (1 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `78` | `"🔐 *INVENTRA PRO* \| *Tasdiqlash Kodi*\n\n"` |

### 📄 `telegram_bot_sms/.dockerignore` (1 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `2` | `# Inventra'dagi bilan bir xil mantiq — faqat bot uchun kerakli qismlar.` |

### 📄 `telegram_bot_sms/.env` (1 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `3` | `INVENTRA_INTERNAL_URL=http://inventra:8000/api/v1/internal/telegram/register/` |

### 📄 `telegram_bot_sms/.gitignore` (1 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `219` | `/.idea/inventra.iml` |

### 📄 `telegram_bot_sms/.idea/workspace.xml` (1 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `115` | `&quot;last_opened_file_path&quot;: &quot;/run/media/abdulxadiy/New Volume/Codes/Projects/Backend/Sales-Platform/telegram_bot_sms&quot;,` |

### 📄 `telegram_bot_sms/README.md` (3 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `162` | `INVENTRA_INTERNAL_URL=https://your-internal-service.example/api/...` |
| `171` | `\| `INVENTRA_INTERNAL_URL` \| Internal authentication service endpoint \| ✅ \|` |
| `253` | `POST <INVENTRA_INTERNAL_URL>` |

### 📄 `telegram_bot_sms/main.py` (14 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `13` | `INVENTRA_INTERNAL_URL = os.environ['INVENTRA_INTERNAL_URL']` |
| `47` | `/start handler specifically for Inventra PRO.` |
| `53` | `"🔐 *INVENTRA PRO* platformasining rasmiy 2-bosqichli xavfsizlik (2FA) boti.\n\n"` |
| `63` | `"ℹ️ *INVENTRA PRO Xavfsizlik Boti*\n\n"` |
| `64` | `"Ushbu bot Inventra savdo platformasida xodimlar va do‘kon egalarining hisoblarini "` |
| `69` | `"3. Inventra tizimiga kirishda bir martalik tasdiqlash kodlari ushbu botga keladi.\n\n"` |
| `79` | `"📊 *Bot holati:* Faol va Inventra PRO tizimiga ulangan ✅\n\n"` |
| `130` | `# 4. Register contact directly in Inventra` |
| `133` | `INVENTRA_INTERNAL_URL,` |
| `140` | `logger.info(f"Successfully linked phone {phone_number} to chat_id {chat_id} in Inventra")` |
| `144` | `"🔐 Endi Inventra login sahifasida bemalol davom etishingiz mumkin. "` |
| `150` | `logger.error(f"Failed to register contact in Inventra for chat_id {chat_id}: {e}")` |
| `163` | `"👋 Inventra platformasida tasdiqlash kodlarini olish uchun telefon raqamingizni ulashingiz kerak.\n\n"` |
| `171` | `logger.info("Inventra 2FA Telegram Bot starting...")` |

## 4. Frontend Foydalanuvchi Interfeysi (UI Pages, Components, Receipts) (Jami: 23 ta fayl, 98 ta o‘rin)

### 📄 `frontend/inventra/src/components/common/InvoiceA4Modal.jsx` (6 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `21` | `export function printInvoiceA4(elementId = 'printable-invoice-a4', title = 'Inventra Hisob-Faktura') {` |
| `28` | `const existingIframe = document.getElementById('inventra-invoice-a4-iframe');` |
| `34` | `iframe.id = 'inventra-invoice-a4-iframe';` |
| `421` | `const saved = localStorage.getItem(`inventra_invoice_signatures_${activeTenant?.id \|\| 'pending'}_${sale.id}`);` |
| `440` | `'INVENTRA SAVDO TIZIMI';` |
| `523` | `localStorage.setItem(`inventra_invoice_signatures_${activeTenant?.id \|\| 'pending'}_${sale.id}`, JSON.stringify(finalSigs));` |

### 📄 `frontend/inventra/src/components/common/ReceiptSlip.jsx` (12 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `3` | `import InventraLogo from './InventraLogo';` |
| `75` | `title = 'Inventra Savdo Cheki',` |
| `87` | `(typeof window !== 'undefined' ? localStorage.getItem('inventra_receipt_paper_width') : null) \|\|` |
| `94` | `const existingIframe = document.getElementById('inventra-thermal-print-iframe');` |
| `100` | `iframe.id = 'inventra-thermal-print-iframe';` |
| `301` | `const seedStr = value \|\| 'INVENTRA';` |
| `368` | `(typeof window !== 'undefined' ? localStorage.getItem('inventra_receipt_paper_width') : null) \|\|` |
| `375` | `const store = storeName \|\| user?.tenant_name \|\| user?.tenant?.name \|\| 'INVENTRA SAVDO MARKAZI';` |
| `455` | `<InventraLogo size={26} showBadge={false} textColor="#000000" />` |
| `492` | `*** INVENTRA SAVDO NUSXASI ***` |
| `671` | `: `https://app.inventra.uz/r/${sale?.public_token \|\| ''}`` |
| `680` | `<div style={{ marginTop: 2, fontSize: 8.5, color: '#000000' }}>www.inventra.uz</div>` |

### 📄 `frontend/inventra/src/components/common/ShiftReportSlip.jsx` (6 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `2` | `import InventraLogo from './InventraLogo';` |
| `19` | `(typeof window !== 'undefined' ? localStorage.getItem('inventra_receipt_paper_width') : null) \|\|` |
| `25` | `const store = report?.tenant_name \|\| user?.tenant_name \|\| user?.tenant?.name \|\| 'INVENTRA SAVDO MARKAZI';` |
| `130` | `<InventraLogo size={28} showBadge={false} textColor="#000000" />` |
| `344` | `<div>Inventra POS tizimi • Z-Hisobot</div>` |
| `345` | `<div style={{ marginTop: 2, fontSize: 8.5, color: '#666666' }}>www.inventra.uz</div>` |

### 📄 `frontend/inventra/src/components/common/ZReportModernView.jsx` (3 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `18` | `import InventraLogo from './InventraLogo';` |
| `37` | `const store = report?.tenant_name \|\| user?.tenant_name \|\| user?.tenant?.name \|\| 'Inventra Savdo Markazi';` |
| `134` | `<InventraLogo size={28} showBadge={true} badgeText="POS" />` |

### 📄 `frontend/inventra/src/components/docs/MarkdownViewer.jsx` (1 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `86` | `* Formatted specifically for the Inventra Obsidian & Gold Design System.` |

### 📄 `frontend/inventra/src/components/inventory/RapidStockIntakeModal.jsx` (1 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `47` | ``inventra_stock_intake_full_draft_v1:${activeTenant?.id \|\| 'pending'}`,` |

### 📄 `frontend/inventra/src/components/layout/Layout.jsx` (2 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `31` | `const [sidebarCollapsed, setSidebarCollapsed] = usePersistedState('inventra_sidebar_collapsed', false);` |
| `240` | `return { title: 'Inventra', subtitle: '' };` |

### 📄 `frontend/inventra/src/components/layout/Sidebar.jsx` (6 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `30` | `import InventraLogo from '../common/InventraLogo';` |
| `48` | `message: 'Haqiqatan ham Inventra tizimidan chiqmoqchimisiz?',` |
| `187` | `title="Inventra — Boshqaruv & POS Tizimi"` |
| `190` | `<InventraLogo` |
| `215` | `title="Inventra — Boshqaruv & POS Tizimi"` |
| `218` | `<InventraLogo size={32} showBadge={true} badgeText="PRO" />` |

### 📄 `frontend/inventra/src/components/notifications/NotificationCard.jsx` (3 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `13` | `import InventraLogo from '../common/InventraLogo';` |
| `207` | `{/* Header with INVENTRA logo */}` |
| `217` | `<InventraLogo size={26} showBadge={true} badgeText="POS" />` |

### 📄 `frontend/inventra/src/pages/AcceptTerms.jsx` (3 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `18` | `import InventraLogo from '../components/common/InventraLogo';` |
| `167` | `<InventraLogo size={52} variant="vertical" badgeText="HIMOYA" />` |
| `240` | `Inventra SaaS dasturiy platformasidan foydalanish tartibi, savdo va kassa hisobi, xizmat ko‘rsatish qoidalari hamda obuna shartlarini bel...` |

### 📄 `frontend/inventra/src/pages/Catalog.jsx` (2 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `90` | ``inventra_draft_product:${activeTenant?.id \|\| 'pending'}`,` |
| `96` | ``inventra_draft_category:${activeTenant?.id \|\| 'pending'}`,` |

### 📄 `frontend/inventra/src/pages/Dashboard.jsx` (1 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `637` | `placeholder="Masalan: Inventra Flagship Store"` |

### 📄 `frontend/inventra/src/pages/Documentation.jsx` (2 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `229` | `Inventra Documentation Portal` |
| `457` | `Ushbu hujjat foydalanuvchi tomonidan Inventra platformasining Ommaviy Ofertasi, Maxfiylik Siyosati va Foydalanish Qoidalariga berilgan ra...` |

### 📄 `frontend/inventra/src/pages/Inventory.jsx` (5 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `71` | ``inventra_inventory_filters_v2:${activeTenant?.id \|\| 'pending'}`,` |
| `90` | `const [selectedVariantId, setSelectedVariantId] = usePersistedState(`inventra_draft_stock_variant:${activeTenant?.id \|\| 'pending'}`, '');` |
| `91` | `const [formQuantity, setFormQuantity] = usePersistedState(`inventra_draft_stock_qty:${activeTenant?.id \|\| 'pending'}`, '');` |
| `93` | `const [formNote, setFormNote] = usePersistedState(`inventra_draft_stock_note:${activeTenant?.id \|\| 'pending'}`, '');` |
| `446` | `const raw = localStorage.getItem(`inventra_stock_intake_full_draft_v1:${activeTenant?.id \|\| 'pending'}`);` |

### 📄 `frontend/inventra/src/pages/Login.jsx` (23 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `9` | `import InventraLogo from '../components/common/InventraLogo';` |
| `10` | `import InventraIntroAnimation from '../components/common/InventraIntroAnimation';` |
| `30` | `const saved = localStorage.getItem('inventra_remember_me');` |
| `34` | `return localStorage.getItem('inventra_remember_login') \|\| '';` |
| `38` | `const savedPass = localStorage.getItem('inventra_remember_password');` |
| `80` | `localStorage.removeItem('inventra_remember_login');` |
| `81` | `localStorage.removeItem('inventra_remember_password');` |
| `82` | `localStorage.setItem('inventra_remember_me', 'false');` |
| `84` | `localStorage.setItem('inventra_remember_me', 'true');` |
| `85` | `if (username) localStorage.setItem('inventra_remember_login', username.trim());` |
| `88` | `localStorage.setItem('inventra_remember_password', btoa(unescape(encodeURIComponent(password))));` |
| `114` | `localStorage.setItem('inventra_remember_login', username.trim());` |
| `116` | `localStorage.setItem('inventra_remember_password', btoa(unescape(encodeURIComponent(password))));` |
| `120` | `localStorage.setItem('inventra_remember_me', 'true');` |
| `122` | `localStorage.removeItem('inventra_remember_login');` |
| `123` | `localStorage.removeItem('inventra_remember_password');` |
| `124` | `localStorage.setItem('inventra_remember_me', 'false');` |
| `178` | `localStorage.setItem('inventra_remember_login', username.trim());` |
| `179` | `localStorage.setItem('inventra_remember_me', 'true');` |
| `181` | `localStorage.removeItem('inventra_remember_login');` |
| `182` | `localStorage.setItem('inventra_remember_me', 'false');` |
| `293` | `<InventraIntroAnimation` |
| `393` | `<InventraLogo size={58} variant="vertical" badgeText="PRO" />` |

### 📄 `frontend/inventra/src/pages/MyTenants.jsx` (1 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `78` | `const storageKey = `inventra_active_tenant:${user.id}`;` |

### 📄 `frontend/inventra/src/pages/POS.jsx` (4 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `49` | ``inventra_pos_partner_sale:${activeTenant?.id \|\| 'pending'}`,` |
| `55` | ``inventra_pos_cart:${activeTenant?.id \|\| 'pending'}`,` |
| `73` | `const [receiptPaperWidth, setReceiptPaperWidth] = usePersistedState('inventra_receipt_paper_width', '58mm');` |
| `1694` | `onClick={() => printReceiptSlip('printable-pos-receipt', 'Inventra Savdo Cheki', receiptPaperWidth)}` |

### 📄 `frontend/inventra/src/pages/PublicReceiptView.jsx` (3 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `17` | `import InventraLogo from '../components/common/InventraLogo';` |
| `227` | `<InventraLogo size={36} showBadge={false} textColor="#0f172a" />` |
| `230` | `{receipt.store_name \|\| 'INVENTRA SAVDO MARKAZI'}` |

### 📄 `frontend/inventra/src/pages/Sales.jsx` (3 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `64` | ``inventra_sales_filters_v2:${activeTenant?.id \|\| 'pending'}`,` |
| `88` | `const [receiptPaperWidth, setReceiptPaperWidth] = usePersistedState(`inventra_receipt_paper_width:${activeTenant?.id \|\| 'pending'}`, '5...` |
| `2208` | `onClick={() => printReceiptSlip('printable-receipt', 'Inventra Savdo Cheki', receiptPaperWidth)}` |

### 📄 `frontend/inventra/src/pages/Services.jsx` (2 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `1157` | `{tenant?.name \|\| 'INVENTRA SAVDO'}` |
| `1207` | `Inventra Savdo Platformasi orqali chop etildi` |

### 📄 `frontend/inventra/src/pages/SetupAccount.jsx` (2 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `163` | `: 'Inventra jamoasiga qo‘shilish uchun shaxsiy parolingizni belgilang',` |
| `198` | `: 'Inventra platformasiga kirish uchun parolingizni belgilang',` |

### 📄 `frontend/inventra/src/pages/Shifts.jsx` (6 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `23` | `import InventraLogo from '../components/common/InventraLogo';` |
| `29` | `const expenseStorageKey = (tenantId) => `inventra_custom_expense_categories:${tenantId \|\| 'pending'}`;` |
| `30` | `const incomeStorageKey = (tenantId) => `inventra_custom_income_sources:${tenantId \|\| 'pending'}`;` |
| `68` | `const [receiptPaperWidth, setReceiptPaperWidth] = usePersistedState(`inventra_receipt_paper_width:${activeTenant?.id \|\| 'pending'}`, '5...` |
| `1244` | `onPrint={() => printReceiptSlip('printable-z-report', 'Inventra Z-Hisobot', receiptPaperWidth)}` |
| `1308` | `onClick={() => printReceiptSlip('printable-z-report', 'Inventra Z-Hisobot', receiptPaperWidth)}` |

### 📄 `frontend/inventra/src/pages/Tenants.jsx` (1 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `541` | `placeholder="Masalan: Inventra Flagship Store"` |

## 5. Frontend Xotira va Sozlamalar (localStorage, Session, API Client) (Jami: 6 ta fayl, 44 ta o‘rin)

### 📄 `frontend/inventra/index.html` (3 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `7` | `<meta name="description" content="Inventra — Zamonaviy do'kon boshqaruvi, savdo tahlili va yuqori tezlikdagi POS tizimi" />` |
| `11` | `<title>Inventra — Boshqaruv & POS Tizimi</title>` |
| `15` | `var saved = localStorage.getItem('inventra_theme');` |

### 📄 `frontend/inventra/src/api/client.js` (26 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `2` | `* Inventra API Client with JWT Interceptor & Automatic Refresh` |
| `9` | `return localStorage.getItem('inventra_remember_me') !== 'false';` |
| `13` | `localStorage.getItem('inventra_access_token') \|\|` |
| `14` | `sessionStorage.getItem('inventra_access_token');` |
| `17` | `localStorage.getItem('inventra_refresh_token') \|\|` |
| `18` | `sessionStorage.getItem('inventra_refresh_token');` |
| `23` | `: (Boolean(localStorage.getItem('inventra_access_token') \|\| localStorage.getItem('inventra_refresh_token')) \|\| isRememberMeActive());` |
| `26` | `if (access) localStorage.setItem('inventra_access_token', access);` |
| `27` | `if (refresh) localStorage.setItem('inventra_refresh_token', refresh);` |
| `28` | `sessionStorage.removeItem('inventra_access_token');` |
| `29` | `sessionStorage.removeItem('inventra_refresh_token');` |
| `31` | `if (access) sessionStorage.setItem('inventra_access_token', access);` |
| `32` | `if (refresh) sessionStorage.setItem('inventra_refresh_token', refresh);` |
| `33` | `localStorage.removeItem('inventra_access_token');` |
| `34` | `localStorage.removeItem('inventra_refresh_token');` |
| `39` | `localStorage.removeItem('inventra_access_token');` |
| `40` | `localStorage.removeItem('inventra_refresh_token');` |
| `41` | `localStorage.removeItem('inventra_user');` |
| `42` | `sessionStorage.removeItem('inventra_access_token');` |
| `43` | `sessionStorage.removeItem('inventra_refresh_token');` |
| `44` | `sessionStorage.removeItem('inventra_user');` |
| `77` | `url = url.replace(/^https?:\/\/(nginx\|inventra(:\d+)?)/, '');` |
| `114` | `const cachedUser = sessionStorage.getItem('inventra_user')` |
| `115` | `\|\| localStorage.getItem('inventra_user');` |
| `121` | `const tenantStorageKey = userId ? `inventra_active_tenant:${userId}` : null;` |
| `250` | `// Specialized API Endpoints (Complete Inventra v0.9 API Coverage)` |

### 📄 `frontend/inventra/src/context/AuthContext.jsx` (11 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `20` | `const saved = localStorage.getItem('inventra_user') \|\| sessionStorage.getItem('inventra_user');` |
| `59` | `if (localStorage.getItem('inventra_access_token')) {` |
| `60` | `localStorage.setItem('inventra_user', JSON.stringify(merged));` |
| `62` | `sessionStorage.setItem('inventra_user', JSON.stringify(merged));` |
| `94` | `localStorage.setItem('inventra_user', JSON.stringify(userData));` |
| `95` | `sessionStorage.removeItem('inventra_user');` |
| `97` | `sessionStorage.setItem('inventra_user', JSON.stringify(userData));` |
| `98` | `localStorage.removeItem('inventra_user');` |
| `139` | `if (localStorage.getItem('inventra_access_token')) {` |
| `140` | `localStorage.setItem('inventra_user', JSON.stringify(updatedUser));` |
| `142` | `sessionStorage.setItem('inventra_user', JSON.stringify(updatedUser));` |

### 📄 `frontend/inventra/src/context/TenantContext.jsx` (1 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `5` | `const tenantStorageKey = (userId) => `inventra_active_tenant:${userId}`;` |

### 📄 `frontend/inventra/src/context/ThemeContext.jsx` (2 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `7` | `return localStorage.getItem('inventra_theme') \|\| 'light';` |
| `12` | `localStorage.setItem('inventra_theme', theme);` |

### 📄 `frontend/inventra/src/index.css` (1 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `2` | `INVENTRA DESIGN SYSTEM — Warm Obsidian & Amber Gold Cyber-Minimal Theme` |

## 6. Docker, Nginx va Infratuzilma (Compose, Nginx, Env sozlamalari) (Jami: 8 ta fayl, 76 ta o‘rin)

### 📄 `.env` (2 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `1` | `POSTGRES_DB=inventra_db` |
| `2` | `POSTGRES_USER=inventra_admin` |

### 📄 `.env.example` (11 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `2` | `# Inventra Sales Platform Root Environment Configuration (.env.example)` |
| `10` | `POSTGRES_DB=inventra_db` |
| `12` | `POSTGRES_USER=inventra_admin` |
| `20` | `DB_NAME=inventra_db` |
| `22` | `DB_USER=inventra_admin` |
| `29` | `# Generate a secret locally and paste it into inventra/.env; never commit the real value:` |
| `35` | `ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0,inventra,nginx` |
| `45` | `INVENTRA_INTERNAL_URL=http://inventra:8000/api/v1/internal/telegram/register/` |
| `101` | `DEFAULT_FROM_EMAIL="Inventra <noreply@example.com>"` |
| `109` | `MINIO_ROOT_USER=inventra_minio` |
| `113` | `MINIO_BUCKET_NAME=inventra-media` |

### 📄 `docker-compose.yml` (35 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `1` | `# Sales-Platform/docker-compose.yml` |
| `4` | `inventra_net:` |
| `12` | `inventra_venv:` |
| `34` | `- inventra_net` |
| `51` | `- inventra_net` |
| `66` | `MINIO_ROOT_USER: ${MINIO_ROOT_USER:-inventra_minio}` |
| `74` | `- inventra_net` |
| `77` | `# INVENTRA — Django/DRF asosiy backend` |
| `79` | `inventra:` |
| `81` | `context: ./inventra` |
| `85` | `- ./inventra/.env` |
| `91` | `ALLOWED_HOSTS: "localhost,127.0.0.1,0.0.0.0,inventra,nginx,*"` |
| `98` | `- ./inventra:/app` |
| `101` | `- inventra_venv:/app/.venv` |
| `106` | `- inventra_net` |
| `113` | `context: ./inventra` |
| `118` | `- ./inventra/.env` |
| `130` | `inventra:` |
| `133` | `- ./inventra:/app` |
| `134` | `- inventra_venv:/app/.venv` |
| `136` | `- inventra_net` |
| `143` | `context: ./inventra` |
| `148` | `- ./inventra/.env` |
| `160` | `inventra:` |
| `163` | `- ./inventra:/app` |
| `164` | `- inventra_venv:/app/.venv` |
| `166` | `- inventra_net` |
| `179` | `- inventra` |
| `184` | `- inventra_net` |
| `197` | `- ./inventra/media:/var/www/media:ro` |
| `199` | `- inventra` |
| `201` | `- inventra_net` |
| `208` | `context: ./frontend/inventra` |
| `216` | `- ./frontend/inventra:/app` |
| `221` | `- inventra_net` |

### 📄 `inventra/.env` (7 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `3` | `DB_NAME=inventra_db` |
| `4` | `DB_USER=inventra_admin` |
| `8` | `POSTGRES_DB=inventra_db` |
| `9` | `POSTGRES_USER=inventra_admin` |
| `29` | `ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0,inventra,nginx,*` |
| `45` | `DEFAULT_FROM_EMAIL="Inventra <noreply@new-dev.site>"` |
| `47` | `INVENTRA_DEMO_PASSWORD='Demo-WrA7kqSae7s3TaT4'` |

### 📄 `inventra/.env.example` (10 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `2` | `# Inventra Backend Environment Configuration (.env.example)` |
| `16` | `INVENTRA_DEMO_PASSWORD=` |
| `19` | `ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0,inventra,nginx` |
| `22` | `DB_NAME=inventra_db` |
| `23` | `DB_USER=inventra_admin` |
| `27` | `POSTGRES_DB=inventra_db` |
| `28` | `POSTGRES_USER=inventra_admin` |
| `63` | `DEFAULT_FROM_EMAIL="Inventra <noreply@example.com>"` |
| `67` | `MINIO_ROOT_USER=inventra_minio` |
| `69` | `MINIO_BUCKET_NAME=inventra-media` |

### 📄 `inventra/.env.test` (3 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `5` | `TEST_DB_NAME=inventra_test` |
| `6` | `TEST_DB_USER=inventra_test` |
| `7` | `TEST_DB_PASSWORD=inventra_test` |

### 📄 `inventra/docker-compose.test.yml` (4 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `20` | `POSTGRES_DB: inventra_test` |
| `21` | `POSTGRES_USER: inventra_test` |
| `22` | `POSTGRES_PASSWORD: inventra_test` |
| `36` | `test: ["CMD-SHELL", "pg_isready -U inventra_test"]` |

### 📄 `nginx/nginx.conf` (4 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `57` | `set $inventra_backend http://inventra:8000;` |
| `58` | `proxy_pass $inventra_backend;` |
| `68` | `set $inventra_backend http://inventra:8000;` |
| `69` | `proxy_pass $inventra_backend;` |

## 7. Backend Servislar, Sozlamalar va Baza (Django, Celery, DB, Tests) (Jami: 27 ta fayl, 45 ta o‘rin)

### 📄 `inventra/.gitignore` (1 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `220` | `/.idea/inventra.iml` |

### 📄 `inventra/.idea/inventra.iml` (1 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `7` | `<orderEntry type="jdk" jdkName="~/D/Codes/Projects/Backend/Sales-Platform/inventra/.venv" jdkType="Python SDK" />` |

### 📄 `inventra/.idea/misc.xml` (1 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `4` | `<option name="sdkName" value="uv (Inventra)" />` |

### 📄 `inventra/.idea/modules.xml` (1 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `5` | `<module fileurl="file://$PROJECT_DIR$/.idea/inventra.iml" filepath="$PROJECT_DIR$/.idea/inventra.iml" />` |

### 📄 `inventra/.idea/workspace.xml` (8 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `62` | `<entry key="_D:/Codes/Projects/Backend/Sales-Platform/Inventra" value="3HM6BLYIANmhHn0t7ivtKZrkD0T" />` |
| `93` | `&quot;url&quot;: &quot;https://github.com/Abdulxadiy/Sales-Platform.git&quot;,` |
| `206` | `&quot;last_opened_file_path&quot;: &quot;/home/abdulxadiy/D/Codes/Projects/Backend/Sales-Platform&quot;,` |
| `220` | `<recent name="D:\Codes\Projects\Backend\Sales-Platform\Inventra" />` |
| `221` | `<recent name="D:\Codes\Projects\Backend\Sales-Platform\Inventra\apps\tenants" />` |
| `222` | `<recent name="D:\Codes\Projects\Backend\Sales-Platform\Inventra\apps\accounts" />` |
| `223` | `<recent name="D:\Codes\Projects\Backend\Sales-Platform\Inventra\config" />` |
| `224` | `<recent name="D:\Codes\Projects\Backend\Sales-Platform\Inventra\tests" />` |

### 📄 `inventra/README_TESTS.md` (1 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `8` | `Inventra/` |

### 📄 `inventra/api/v1/accounts/serializers.py` (1 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `61` | `if url.startswith("http://nginx/") or url.startswith("http://inventra/"):` |

### 📄 `inventra/api/v1/accounts/views/docs_views.py` (1 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `74` | `# 1. Host repo root: base_dir.parent / "docs" (e.g. Sales-Platform/docs when running outside container)` |

### 📄 `inventra/api/v1/catalog/serializers.py` (1 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `47` | `if res.startswith("http://nginx/") or res.startswith("http://inventra/"):` |

### 📄 `inventra/api/v1/internal/shop/serializers.py` (1 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `45` | `if res.startswith("http://nginx/") or res.startswith("http://inventra/"):` |

### 📄 `inventra/api/v1/tenants/views.py` (1 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `497` | `"🔔 *Inventra Test Bildirishnomasi*\n\n"` |

### 📄 `inventra/apps/accounts/management/commands/seed_demo_platform.py` (2 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `44` | `password = os.environ.get("INVENTRA_DEMO_PASSWORD", "")` |
| `46` | `raise CommandError("INVENTRA_DEMO_PASSWORD muhit o‘zgaruvchisiga kamida 12 belgili parol yozing.")` |

### 📄 `inventra/apps/accounts/services/demo_access_service.py` (1 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `9` | `GROUP_NAME = "inventra_local_demo"` |

### 📄 `inventra/apps/accounts/tests/test_demo_mode.py` (4 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `127` | `monkeypatch.setenv("INVENTRA_DEMO_PASSWORD", PASSWORD)` |
| `156` | `monkeypatch.setenv("INVENTRA_DEMO_PASSWORD", PASSWORD)` |
| `165` | `monkeypatch.setenv("INVENTRA_DEMO_PASSWORD", PASSWORD)` |
| `172` | `monkeypatch.setenv("INVENTRA_DEMO_PASSWORD", PASSWORD)` |

### 📄 `inventra/apps/catalog/migrations/0002_seed_permissions.py` (1 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `12` | `# Architectures/inventra-yol-xaritasi.md, 9-bosqich.` |

### 📄 `inventra/apps/catalog/models/category_model.py` (1 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `14` | `unbounded tree. See Architectures/inventra-yol-xaritasi.md,` |

### 📄 `inventra/apps/catalog/models/product_variant_model.py` (1 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `3` | `Architectures/inventra-yol-xaritasi.md, 9-bosqich, for the full` |

### 📄 `inventra/apps/catalog/services/category_service.py` (1 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `3` | `(not on the model) -- see Architectures/inventra-yol-xaritasi.md,` |

### 📄 `inventra/apps/catalog/services/product_service.py` (1 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `4` | `Architectures/inventra-yol-xaritasi.md, 9-bosqich, for the full` |

### 📄 `inventra/apps/core/services/audit_service.py` (1 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `2` | `Service layer for recording immutable audit logs across Inventra.` |

### 📄 `inventra/config/celery.py` (1 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `7` | `app = Celery('inventra')` |

### 📄 `inventra/config/settings.py` (6 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `171` | `APP_VERSION = importlib.metadata.version("inventra")` |
| `180` | `'TITLE': 'Inventra Sales Platform API',` |
| `182` | `"Inventra savdo platformasi, omborxona, kassa va B2B tizimi uchun rasmiy OpenAPI/Swagger hujjatlari."` |
| `216` | `DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "noreply@inventra.uz")` |
| `244` | `AWS_ACCESS_KEY_ID = os.environ.get('MINIO_ROOT_USER', 'inventra_minio')` |
| `246` | `AWS_STORAGE_BUCKET_NAME = os.environ.get('MINIO_BUCKET_NAME', 'inventra-media')` |

### 📄 `inventra/config/settings_test.py` (3 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `47` | `"NAME": os.environ.get("TEST_DB_NAME", "inventra_test"),` |
| `48` | `"USER": os.environ.get("TEST_DB_USER", "inventra_test"),` |
| `49` | `"PASSWORD": os.environ.get("TEST_DB_PASSWORD", "inventra_test"),` |

### 📄 `inventra/gunicorn.conf.py` (1 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `38` | `proc_name = "inventra_gunicorn"` |

### 📄 `inventra/pyproject.toml` (1 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `2` | `name = "inventra"` |

### 📄 `inventra/tests/factories.py` (1 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `27` | ``customer` no longer exists as an Inventra role (it moved entirely` |

### 📄 `inventra/uv.lock` (1 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `723` | `name = "inventra"` |

## 8. Rasmiy Hujjatlar va Yuridik Matnlar (Legal Docs, Oferta, Maxfiylik) (Jami: 3 ta fayl, 21 ta o‘rin)

### 📄 `docs/hujjatlar/foydalanish_qoidalari.md` (4 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `1` | `# Inventra Platformasi — Xizmatdan Foydalanish Qoidalari va Xavfsizlik Talablari` |
| `9` | `Ushbu qoidalar to'plami **"Inventra"** savdo platformasining barcha foydalanuvchilari (Platforma Administratorlari, Do'kon Egalari, Xodim...` |
| `45` | `Inventra platformasi ilg'or avtomatlashtirilgan xavfsizlik filtrlari bilan jihozlangan:` |
| `78` | `* **Email:** `security@inventra.uz`` |

### 📄 `docs/hujjatlar/maxfiylik_siyosati.md` (9 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `1` | `# Inventra Platformasi — Maxfiylik va Shaxsiy Ma'lumotlarni Qayta Ishlash Siyosati` |
| `10` | `Ushbu Maxfiylik va shaxsiy ma'lumotlarni qayta ishlash siyosati (keyingi o'rinlarda — **"Siyosat"**) **"Inventra"** savdo-boshqaruv platf...` |
| `18` | `1.1. Inventra tizimidan ro'yxatdan o'tish, tizimga kirish yoki xizmatlardan amalda foydalanish orqali Foydalanuvchi ushbu Siyosatda ko'rs...` |
| `20` | `1.3. Ushbu Siyosat faqat Inventra platformasiga taalluqli bo'lib, tashqi havola qilingan uchinchi tomon xizmatlariga tatbiq etilmaydi.` |
| `26` | `Inventra platformasi o'z xizmatlarini sifatli, xavfsiz va qonuniy taqdim etish uchun quyidagi toifadagi ma'lumotlarni to'playdi va qayta ...` |
| `65` | `Inventra axborot xavfsizligini ta'minlashda eng ilg'or xalqaro me'yorlarga tayanadi:` |
| `117` | `* **Mas'ul xizmat:** Inventra Axborot Xavfsizligi Bo'limi` |
| `118` | `* **Elektron pochta:** `privacy@inventra.uz` / `support@inventra.uz`` |
| `120` | `* **Veb-sayt:** `https://inventra.uz`` |

### 📄 `docs/hujjatlar/ommaviy_oferta.md` (8 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `1` | `# Inventra Dasturiy Majmuasidan Foydalanish Bo'yicha Ommaviy Oferta Shartnomasi` |
| `10` | `Ushbu hujjat O'zbekiston Respublikasi Fuqarolik Kodeksining 367–370-moddalari, "Elektron tijorat to'g'risida"gi hamda "Axborotlashtirish ...` |
| `18` | `1.1. **Platforma (Inventra)** — tovarlar hisobi, POS tezkor kassa, ombor logistikasi, sotuvlar, nasiyalar monitoringi, B2B savdo va moliy...` |
| `30` | `2.1. Ijrochi Buyurtmachiga Inventra platformasidan o'z savdo faoliyatini avtomatlashtirish, hisob-kitoblarni yuritish va biznesni boshqar...` |
| `103` | `7.1. Inventra dasturiy ta'minoti, uning manba kodi, vizual dizayni, bazaviy sxemalari, logotiplari va matnlari Ijrochining mutlaq intelle...` |
| `141` | `**"Inventra" Axborot Texnologiyalari Platformasi**` |
| `142` | `* Rasmiy veb-sayt: `https://inventra.uz`` |
| `144` | `* Elektron pochta: `support@inventra.uz` / `admin@inventra.uz`` |

## 9. Qo‘llanmalar, Yo‘l Xaritalari va Hujjatlar (Guides, Docs, README) (Jami: 16 ta fayl, 436 ta o‘rin)

### 📄 `Architectures/inventra-yol-xaritasi.md` (50 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `1` | `# Inventra — Yakuniy yo'l xaritasi` |
| `3` | `> **Shu hujjat yagona manba.** Eski `inventra-arxitektura.md`, `inventra-yol-xaritasi.md`, `inventra-yakuniy-arxitektura.md` va `inventra...` |
| `9` | `> **2026-09 yirik arxitektura qarori:** Customer identifikatsiyasi (ro'yxatdan o'tish, OTP login, throttle) Inventra'dan **butunlay chiqa...` |
| `20` | `\|Domen\|`subdomain` maydoni\|Bitta domen, subdomain yo'q\|**Bitta domen (`inventra.uz`), subdomain YO'Q**\|` |
| `39` | `\|Telefon validatsiyasi\|**Shop** (fail-fast). Inventra biznes qoidalariga e'tibor\|` |
| `40` | `\|`needs_profile_completion`\|`user.profile_completed`; `has_usable_password()` customer uchun mos emas (eslatma: bu customer Inventra'da...` |
| `52` | `\|**Owner/staff yaratish**\|Endi "avval customer bo'lib ro'yxatdan o't, keyin hire qilinasan" emas. `platform_admin` (owner uchun) yoki `...` |
| `54` | `\|**Telegram bot (`telegram_bot_sms`)**\|Endi **ikkala xizmatga** (Inventra + Shop) xizmat qiladi — bitta bot, deep-link orqali marshrutl...` |
| `55` | `\|**Customer / Shop ajratilishi**\|Customer Inventra'dan **butunlay chiqariladi**. Shop — alohida FastAPI mikroservis, **o'z bazasi bilan...` |
| `81` | `\|**Kirim Qoralamalarining Saqlanib Qolishi (Offline / Draft Persistence) (v0.12.4)**\|`inventra_stock_intake_full_draft_v1` kaliti bilan...` |
| `85` | `\|**Frontend Web Client (React 18 + Vite + Tailwind + Glassmorphism SPA) (v0.12.0+)**\|To'liq zamonaviy SPA frontend (`frontend/inventra/...` |
| `90` | `Repo: `Sales-Platform/` — `inventra/` (Django 6 + DRF), `frontend/inventra/` (React 18 + Vite SPA), `telegram_bot_sms/` (aiogram bot), `A...` |
| `93` | `- `sales-platform-postgres-1` (PostgreSQL 16)` |
| `94` | `- `sales-platform-redis-1` (Redis 7)` |
| `95` | `- `sales-platform-minio-1` (MinIO Object Storage S3)` |
| `96` | `- `sales-platform-inventra-1` (Django Gunicorn backend)` |
| `97` | `- `sales-platform-celery_worker-1` (Celery background worker)` |
| `98` | `- `sales-platform-celery_beat-1` (Celery Beat periodic scheduler)` |
| `99` | `- `sales-platform-bot-1` (Telegram SMS/OTP & Notification bot)` |
| `100` | `- `sales-platform-frontend-1` (Vite dev/client server, port 5173)` |
| `101` | `- `sales-platform-nginx-1` (Nginx reverse proxy, port 80)` |
| `152` | `\|Umumiy arxitektura\|Inventra (Django + DRF, do'konning ichki boshqaruvi) + Shop (FastAPI, **o'z bazasi bilan**, customer-facing storefr...` |
| `155` | `\|Domen\|`inventra.uz`, subdomain yo'q\|` |
| `158` | `\|**Inventra foydalanuvchilari**\|Faqat `platform_admin` / `owner` / `staff`. **Customer Inventra'da yashamaydi** — Shop'ning ishi. Owner...` |
| `176` | `~~`customer`~~ — **Inventra'da endi mavjud emas** (Shop'ga ko'chirildi).` |
| `235` | `- Inventra'da endi `customer` yo'q, shuning uchun bu band faqat `staff`/`owner`/`platform_admin`ga tegishli` |
| `371` | `- `inventra_stock_intake_full_draft_v1` kaliti orqali LocalStorage da to'liq partiya qoralamasi saqlanadi.` |
| `410` | `Sales-Platform/` |
| `411` | `inventra/                 # Django + DRF (core backend — do'konning ichki boshqaruvi)` |
| `424` | `frontend/inventra/        # React 18 + Vite SPA (zamonaviy dark/glassmorphism UI)` |
| `432` | `Architectures/            # inventra-yol-xaritasi.md + shop-yol-xaritasi.md` |
| `433` | `docker-compose.yml        # postgres, redis, minio, inventra, celery_worker, celery_beat, bot, frontend, nginx` |
| `465` | `Bu butun bosqich **customer**ga tegishli edi. Customer Inventra'dan chiqarilgani sababli, quyidagi bandlar **Shop'da qaytadan yoziladi**,...` |
| `469` | `- [x] **Yangi vazifa:** Inventra'dan `register.py`, customer `login.py` qismi, `customer_login_throttle.py`, tegishli testlarni olib tash...` |
| `471` | `**Inventra'da qoladigan qism** (bu — customer emas, staff/owner 2FA'si uchun, alohida band sifatida pastga, 6-bosqichga ko'chirildi):` |
| `509` | `- [x] `customer` — bu rol Inventra'da endi yo'q, shunday ham `has_permission` `False` qaytaradi` |
| `524` | `- [ ] Owner/staff uchun customer qidiruv — **Shop'ga ko'chadi** (customer Inventra'da yo'q)` |
| `527` | `- [x] Customer serializerlarida username/password chiqmaydi (tasdiqlandi — customer Inventra'da hali qolgan davrda ham bu tekshirilgan edi)` |
| `699` | `### 11-bosqich — Shop bilan integratsiya (Inventra tarafi) — ✅ TO'LIQ BAJARILDI (v0.9.3)` |
| `701` | `Shop endi **alohida mikroservis, o'z bazasi bilan** — to'liq reja `shop-yol-xaritasi.md`da. Bu yerda faqat Inventra tomonidan taqdim etil...` |
| `709` | `- [x] Redis + Postgres + Inventra + bot (aiogram)` |
| `713` | `- [x] Ichki servislar faqat `inventra_net`; tashqariga faqat nginx (port 80:80)` |
| `726` | `- [x] **Inventra Web Client (React 18 + Vite SPA, Tailwind, Glassmorphism UI) — ✅ TO'LIQ BAJARILDI (v0.12.0+)**` |
| `731` | `- **`RapidStockIntakeModal.jsx`:** Kassa-skaner uslubidagi ommaviy partiya kirimi ish maydoni, jadvalda narxlar va miqdorlar tahriri, Loc...` |
| `768` | `6. Telefon formati — Shop tekshiradi; Inventra ichki chaqiriqni ishonchli deb qabul qiladi, lekin yomon ma'lumotni ham rad etadi.` |
| `771` | `9. **Inventra customer haqida bilmaydi** — bu Shop'ning ishi.` |
| `785` | `\|D\|Customer qidiruv maydonlari va kim ko'radi\|**Shop'ga ko'chadi**, Inventra'da endi kerak emas\|` |
| `810` | `\|**AC**\|~~Ommaviy partiya kirimi (Rapid Barcode Intake) & LocalStorage qoralamalari~~\|✅ **YOPILDI** — Kassa-skaner uslubidagi partiya ...` |
| `817` | `**Inventra Backend va Frontend SPA (v0.12.4) barcha asosiy biznes modullari (Katalog, Ko'p filialli ombor, Rapid partiya kirimi, Filial i...` |
| `820` | `1. **Shop mikroservisi (Storefront):** FastAPI orqali customer-facing storefront'ni qurish, Shop o'z bazasi bilan ishlashi va Inventra in...` |

### 📄 `Architectures/shop-yol-xaritasi.md` (26 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `3` | `> Bu — **yangi** hujjat (2026-09). `inventra-yol-xaritasi.md` bilan bir xil formatda: `[x]` bajarilgan, `[ ]` qilinishi kerak, `🔶` qisman.` |
| `5` | `> **Maqsad:** Shop — customer'lar uchun storefront. Mijoz Shop orqali xarid qiladi (`Order`), Inventra esa do'konning **ichki** boshqaruv...` |
| `7` | `> **Texnologiya:** FastAPI, **o'z Postgres bazasi** (Inventra bazasidan butunlay alohida), bitta `docker-compose.yml` ichida alohida serv...` |
| `11` | `## 0. Inventra bilan chegara (qisqacha)` |
| `15` | `\| Xodim/owner/platform_admin, ularning login/2FA'si \| **Inventra** \|` |
| `16` | `\| Ombor, mahsulot katalogi (manba) \| **Inventra** \|` |
| `17` | `\| Do'konda jismoniy sotilgan tovar (POS) — ombordan ayirish \| **Inventra** (`sales` app, 9-bosqich) \|` |
| `19` | `\| Onlayn buyurtma (`Order`) \| **Shop** yaratadi, lekin ombor holatini Inventra'ga internal so'rov orqali o'zgartiradi \|` |
| `22` | `**Muhim farq:** Inventra'dagi "sotuv" — bu shunchaki **hisob-kitob uchun ombordan ayirish** (kim xarid qilgani muhim emas, faqat qancha v...` |
| `31` | `\| Baza \| **O'z Postgres bazasi** (Inventra bazasidan mustaqil) \|` |
| `33` | `\| Inventra bilan aloqa \| HTTP/JSON, `Authorization: Internal <token>` (mavjud `IsInternalService` pattern qayta ishlatiladi) \|` |
| `34` | `\| Customer login \| Telefon + Telegram OTP — **Inventra'dan ko'chirilgan mantiq**, endi Shop'ning o'z bazasida \|` |
| `45` | `\| 1 \| Mahsulot/narx ma'lumotini Shop qanday oladi — **jonli so'rov** (har safar Inventra'ga murojaat) yoki **davriy sinxronlash** (Shop...` |
| `48` | `\| 4 \| Customer bazaviy ma'lumotlari (`first_name`, `email` va h.k.) — Inventra'dagi eski `CompleteProfileSerializer`ga o'xshash bo'ladi...` |
| `49` | `\| 5 \| Customer OTP-login/throttle mantig'i — Inventra'da yozilgan `customer_login_throttle.py` **aynan shu holicha ko'chiriladimi**, yo...` |
| `57` | `- [ ] FastAPI loyihasi, `uv` bilan boshqariladi (Inventra bilan bir xil muhit)` |
| `60` | `- [ ] `.env` — `INVENTRA_INTERNAL_URL`, `INTERNAL_SERVICE_TOKEN`, `BOT_TOKEN` (bot bilan bog'lanish uchun kerak bo'lsa), o'z baza sozlama...` |
| `64` | `- [ ] `Customer` modeli: `phone_number` (unique), `first_name`, `last_name`, `email` (ixtiyoriy), `profile_completed` — Inventra'dagi esk...` |
| `65` | `- [ ] Telegram OTP login (Inventra'dan ko'chiriladi): `request-otp`, `verify-otp`` |
| `66` | `- [ ] `customer_login_throttle` — Inventra'dagi versiyasi asos qilib olinadi` |
| `68` | `- [ ] JWT (Shop'ning o'z tokeni — Inventra tokeni bilan aralashtirilmaydi)` |
| `79` | `- [ ] Buyurtma yaratilganda Inventra'ning internal endpoint'iga murojaat (ombor kamaytirish/zahiralash — 2-bo'lim, 3-savol)` |
| `88` | `- [ ] Inventra'dagi kabi: `pytest`, alohida test-compose, o'z bazasi bilan izolyatsiya` |
| `89` | `- [ ] Customer login/throttle testlari (Inventra'dagilardan moslashtiriladi)` |
| `90` | `- [ ] Order/ombor integratsiyasi testlari (Inventra internal API bilan)` |
| `96` | `Hozircha **kod yozilmaydi** — Inventra tomonidagi 6a (JWT) va customer-kodini-olib-tashlash ishlari tugagach, va yuqoridagi 2-bo'limning ...` |

### 📄 `INVENTRA_MASTER_PLAN.md` (108 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `1` | `# INVENTRA — MASTER IMPLEMENTATION PLAN` |
| `5` | `> Repo: `github.com/Abdulxadiy/Sales-Platform` (Django/DRF backend in `inventra/`, React/Vite frontend in `frontend/inventra/`, Telegram ...` |
| `82` | `11. Do not touch these areas outside their own task: `Architectures/` (documents; the only allowed edit is the sentence in T8.4), `brandi...` |
| `125` | `- **D-01 (supersedes branch-transfer removal):** Branch (`filial`) records are removed; every former branch becomes its own tenant. Keep/...` |
| `161` | `- Retail POS launch stays disabled until the owner has written clarification on Inventra's registry/attestation obligations and has selec...` |
| `192` | `inventra/config/            settings.py, settings_test.py, celery.py, urls.py` |
| `193` | `inventra/apps/<app>/        models, services/, tasks.py, tests/` |
| `194` | `inventra/api/v1/<app>/      serializers.py, views/, urls.py` |
| `195` | `inventra/api/               mixins.py, permissions.py, exceptions.py, pagination.py` |
| `196` | `frontend/inventra/src/      api/client.js, context/, pages/, components/` |
| `259` | `cd inventra` |
| `299` | `env: { POSTGRES_DB: inventra_test, POSTGRES_USER: inventra_test, POSTGRES_PASSWORD: inventra_test }` |
| `302` | `--health-cmd "pg_isready -U inventra_test" --health-interval 2s --health-timeout 3s --health-retries 15` |
| `306` | `defaults: { run: { working-directory: inventra } }` |
| `316` | `# READ inventra/config/settings_test.py and map the exact env var names it reads` |
| `321` | `defaults: { run: { working-directory: frontend/inventra } }` |
| `325` | `with: { node-version: 22, cache: npm, cache-dependency-path: frontend/inventra/package-lock.json }` |
| `330` | `Also add to `inventra/pyproject.toml` dev group: `ruff`. Add `[tool.ruff]` with `line-length = 120`, `select = ["E","F","I","B","S"]`, ig...` |
| `334` | `**(a) Password-reset URL.** In `inventra/apps/accounts/services/password_reset_service.py` find the email-sending helper that does `logge...` |
| `338` | `**(b) Telegram bot token.** In `inventra/apps/tg_bot/services.py`, `requests` exceptions embed the full URL (`.../bot<TOKEN>/sendMessage`...` |
| `360` | `**Acceptance:** `grep -rn "reset_url" inventra/apps \| grep -i log` is empty; test above passes.` |
| `363` | `1. `cd inventra && uv lock --upgrade-package pyjwt --upgrade-package urllib3 && uv sync`. Targets: `pyjwt >= 2.15` (audit flagged 2.13.0)...` |
| `364` | `2. `cd frontend/inventra && npm audit fix` (not `--force`); re-run `npm run build`.` |
| `365` | `3. Remove unused dependency `django-environ` if `grep -rn "environ" inventra --include=*.py` shows it is not imported. Move `djangorestfr...` |
| `370` | `1. `git rm -r --cached` and delete: `Architectures/.idea`, `Architectures/.obsidian` (if present), every `.directory` file, `frontend/inv...` |
| `371` | `2. Replace the hundreds of `/staticfiles/...` lines in `inventra/.gitignore` with the single rule `staticfiles/`.` |
| `372` | `3. Create root `README.md` (project purpose, stack, how to run dev/test/prod, link to `docs/`), `LICENSE` (put `All rights reserved.` unl...` |
| `373` | `4. Version: single source of truth is `inventra/pyproject.toml`. In `settings.py` set `SPECTACULAR_SETTINGS["VERSION"]` from `importlib.m...` |
| `378` | `File `inventra/apps/catalog/management/commands/seed_stress_products.py`:` |
| `391` | `"inventra/apps/*/tests/*", "inventra/apps/*/migrations/*", "inventra/tests/*", "inventra/conftest.py",` |
| `392` | `"inventra/api/*/tests/*"` |
| `395` | `".github/*", "scripts/*", ".gitignore", "inventra/.gitignore", "README.md", "LICENSE", ".env.example",` |
| `396` | `"inventra/.env.example", "inventra/pyproject.toml", "inventra/uv.lock", "inventra/ruff.toml",` |
| `397` | `"frontend/inventra/package.json", "frontend/inventra/package-lock.json",` |
| `398` | `"inventra/config/settings.py", "inventra/config/settings_test.py",` |
| `399` | `"inventra/apps/accounts/services/password_reset_service.py", "inventra/apps/accounts/services/email_utils.py",` |
| `400` | `"inventra/apps/tg_bot/services.py",` |
| `401` | `"inventra/apps/catalog/management/commands/seed_stress_products.py",` |
| `403` | `"frontend/inventra/dist_docker/*"` |
| `406` | `"inventra/apps/inventory/*", "inventra/apps/catalog/*", "inventra/apps/sales/*", "inventra/apps/cashbox/*",` |
| `407` | `"inventra/apps/tenants/*", "inventra/apps/accounts/*", "inventra/apps/analytics/*",` |
| `408` | `"inventra/api/v1/inventory/*", "inventra/api/v1/catalog/*", "inventra/api/v1/sales/*", "inventra/api/v1/cashbox/*",` |
| `409` | `"inventra/api/v1/tenants/*", "inventra/api/v1/accounts/*", "inventra/api/v1/internal/*", "inventra/api/v1/analytics/*",` |
| `410` | `"frontend/inventra/src/*"` |
| `413` | `"inventra/apps/accounts/*", "inventra/apps/tenants/*", "inventra/apps/core/*",` |
| `414` | `"inventra/api/mixins.py", "inventra/api/permissions.py",` |
| `415` | `"inventra/api/v1/accounts/*", "inventra/api/v1/tenants/*", "inventra/api/v1/analytics/*",` |
| `416` | `"inventra/apps/sales/services/b2b_transfer_service.py", "inventra/api/v1/sales/views/b2b_views.py",` |
| `417` | `"inventra/config/settings.py", "inventra/api/v1/urls.py", "frontend/inventra/src/*"` |
| `420` | `"inventra/api/*", "inventra/apps/permissions/*", "inventra/apps/accounts/*", "inventra/apps/core/*",` |
| `421` | `"inventra/config/settings.py", "inventra/config/urls.py", "frontend/inventra/src/*"` |
| `424` | `"inventra/apps/sales/*", "inventra/apps/inventory/services/stock_service.py",` |
| `425` | `"inventra/apps/inventory/models/stock_movement_model.py", "inventra/apps/inventory/models/__init__.py",` |
| `426` | `"inventra/apps/core/*", "inventra/apps/tg_bot/services.py", "inventra/api/*",` |
| `427` | `"inventra/config/settings.py", "inventra/config/settings_test.py", "inventra/config/urls.py",` |
| `428` | `"frontend/inventra/src/*"` |
| `431` | `"inventra/apps/cashbox/*", "inventra/apps/inventory/tasks.py", "inventra/apps/tenants/models.py",` |
| `432` | `"inventra/apps/analytics/services/analytics_service.py", "inventra/api/v1/cashbox/*",` |
| `433` | `"inventra/config/settings.py", "inventra/config/settings_test.py", "inventra/config/celery.py",` |
| `434` | `"inventra/pyproject.toml", "inventra/uv.lock", "frontend/inventra/src/*"` |
| `437` | `"inventra/apps/analytics/*", "inventra/api/v1/analytics/*", "inventra/api/v1/urls.py", "frontend/inventra/src/*"` |
| `440` | `"inventra/apps/accounts/*", "inventra/apps/tg_bot/*", "inventra/apps/core/*", "inventra/api/v1/accounts/*",` |
| `441` | `"inventra/api/v1/tg_bot/*", "inventra/api/v1/urls.py", "inventra/config/settings.py", "inventra/config/settings_test.py",` |
| `442` | `"telegram_bot_sms/*", "docker-compose.yml", "inventra/pyproject.toml", "inventra/uv.lock", "frontend/inventra/src/*"` |
| `445` | `"inventra/apps/documents/*", "inventra/api/v1/documents/*", "inventra/apps/accounts/models/*",` |
| `446` | `"inventra/api/v1/accounts/*", "inventra/config/settings.py", "inventra/config/urls.py", "inventra/api/v1/urls.py",` |
| `447` | `"Architectures/inventra-yol-xaritasi.md", "frontend/inventra/src/*"` |
| `450` | `"inventra/config/*", "inventra/Dockerfile", "inventra/entrypoint.sh", "inventra/gunicorn.conf.py", "inventra/.dockerignore",` |
| `451` | `"inventra/pyproject.toml", "inventra/uv.lock", "docker-compose*.yml", "inventra/docker-compose*.yml", "nginx/*",` |
| `452` | `"scripts/*", "docs/*", ".github/*", "frontend/inventra/Dockerfile", "frontend/inventra/vite.config.js",` |
| `453` | `"frontend/inventra/src/*", "inventra/apps/*", "inventra/api/*"` |
| `549` | `2. Rename `_apply_movement` → `apply_movement` (public; it is called from other services) and update every caller (`grep -rn "_apply_move...` |
| `589` | `7. The internal shop API may read a tenant's catalog/stock only. Remove its order-deduct route: Inventra is SaaS and must not accept onli...` |
| `600` | `**Acceptance:** `grep -rniE "branch\|filial" inventra --include=*.py \| grep -v "/migrations/"` prints nothing except possibly test-comme...` |
| `610` | `Files (all under `frontend/inventra/src/`): delete `context/BranchContext.jsx`, `pages/Branches.jsx`; edit `api/client.js`, `pages/Invent...` |
| `623` | `2. Staff flow: confirmation modal is informational; confirming atomically deducts dispatched quantity from source and creates `pending`. ...` |
| `683` | `**Acceptance:** `makemigrations --check` clean; `grep -rn "user.tenant\b\\|\.tenant_id" inventra --include=*.py \| grep -v "/migrations/\...` |
| `798` | `**JWT:** in `issue_tokens` (`api/v1/accounts/views/misc.py`) stop adding `tenant_id` and `terms_accepted` claims; keep `role` and `token_...` |
| `944` | `1. `TenantContext`: loads `/auth/me/`; keeps `tenants`, `activeTenantId` (persisted in `localStorage` under `inventra_active_tenant:<user...` |
| `946` | `3. `Header.jsx`: dropdown "Do'konni almashtirish" showing the current tenant name prominently (also in the page title). On switch: clear ...` |
| `947` | `4. **All localStorage/sessionStorage keys that hold drafts or filters must include the tenant id** (e.g. `inventra_stock_intake_full_draf...` |
| `950` | `7. On logout: remove **all** keys starting with `inventra_` (see T7.9 for the full logout flow).` |
| `1365` | `Make sure `apply_movement` updates `last_cost_price` **only** for `TYPE_KIRIM`. Update frontend label maps for movement types (`grep -rn ...` |
| `1757` | `Files under `frontend/inventra/src/`: `pages/Sales*.jsx` / sale detail (show refunded + net; item pending/accepted columns), B2B inbox pa...` |
| `1772` | `grep -rnE "timezone\.now\(\)\.date\(\)\|datetime\.now\(\|date\.today\(\|timezone\.now\(\)\.time\(\)\|default=timezone\.now" inventra --in...` |
| `1775` | `3. Frontend: UTC date bug pattern `new Date().toISOString().slice(0,10)` → `new Date().toLocaleDateString("en-CA")` (gives local `YYYY-MM...` |
| `1975` | `- `frontend/inventra/src/pages/Shifts.jsx`: show the new line (refunds); automatic debt-payment incomes appear in the incomes list with a...` |
| `2188` | `RESERVED = {"admin", "root", "support", "inventra", "platform", "owner", "staff", "system", "null", "none"}` |
| `2384` | ``src/pages/Login.jsx`, `src/pages/SetupAccount.jsx` and `api`: after password/setup confirmation, store `login_ticket` in memory and show...` |
| `2470` | `Remove every use of `localStorage` for signatures (`inventra_invoice_signatures_*`). `InvoiceA4Modal.jsx` and the shift close dialog send...` |
| `2512` | `**`inventra/Dockerfile`** — multi-stage, non-root, pinned:` |
| `2565` | `- Serve the built SPA (`frontend/inventra/dist`) with history fallback (`try_files $uri /index.html`) — route `/r/<token>` must work.` |
| `2570` | ``frontend/inventra/Dockerfile`: multi-stage — `node:22-alpine` builds (`npm ci && npm run build`), final stage `nginx:alpine` (or copy `d...` |
| `2590` | `4. **Internal Shop API** (`api/v1/internal/shop`): keep only tenant-scoped catalog and stock reads for an explicitly configured store int...` |
| `2819` | `**Files and folders you must not edit outside their task** — `Architectures/` (except the one sentence in T8.4), `branding/`, `docs/` (on...` |
| `2827` | `### H.1 `frontend/inventra/src/api/tenantStorage.js` (new file)` |
| `2829` | `// Active-tenant + per-tenant storage helpers. Every persisted key starts with "inventra_".` |
| `2830` | `const ACTIVE_KEY = 'inventra_active_tenant';` |
| `2831` | `const KEEP_ON_LOGOUT = ['inventra_remember_me', 'inventra_theme']; // verify the real theme key in ThemeContext.jsx` |
| `2835` | `const raw = localStorage.getItem('inventra_user') \|\| sessionStorage.getItem('inventra_user');` |
| `2858` | `/** Per-tenant storage key, e.g. tenantKey('inventra_stock_intake_full_draft_v1'). */` |
| `2861` | `export const clearAllInventraKeys = () => {` |
| `2864` | `.filter((k) => k.startsWith('inventra_') && !KEEP_ON_LOGOUT.includes(k))` |
| `2870` | `### H.2 `frontend/inventra/src/api/client.js` — the ONLY edits allowed` |
| `2871` | `1. Add at the top: `import { getActiveTenantId, clearAllInventraKeys } from './tenantStorage';`` |
| `2882` | `3. Replace the body of `clearTokens` by `clearAllInventraKeys();` (it already removes the token keys because they start with `inventra_`;...` |
| `2885` | `### H.3 `frontend/inventra/src/context/TenantContext.jsx` (new; replaces the deleted `BranchContext.jsx`)` |
| `2941` | `### H.4 `frontend/inventra/src/api/paginated.js` (new)` |

### 📄 `LICENSE` (1 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `1` | `Copyright (c) 2026 INVENTRA. All rights reserved.` |

### 📄 `README.md` (13 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `1` | `# INVENTRA Sales Platform` |
| `3` | `INVENTRA is an enterprise-grade multi-tenant retail and wholesale sales platform designed for inventory tracking, point-of-sale (POS) ope...` |
| `31` | `cp inventra/.env.example inventra/.env` |
| `34` | `Review and adjust variables in `.env` and `inventra/.env` as needed.` |
| `57` | `cd inventra` |
| `65` | `cd frontend/inventra` |
| `78` | `docker compose -f inventra/docker-compose.test.yml up -d` |
| `81` | `cd inventra` |
| `88` | `cd frontend/inventra` |
| `96` | `1. Ensure all secret keys and database passwords in `.env` and `inventra/.env` are securely randomized.` |
| `104` | `docker compose exec inventra python manage.py migrate` |
| `105` | `docker compose exec inventra python manage.py collectstatic --noinput` |
| `125` | `Copyright (c) 2026 INVENTRA. All rights reserved. See [LICENSE](LICENSE) for details.` |

### 📄 `docs/LOYIHA_AUDITI_VAZIFALAR.md` (46 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `1` | `# Inventra — loyiha auditi, vazifalar va muhokamalar` |
| `16` | `- `INVENTRA_MASTER_PLAN.md` va `docs/OZBEKISTON_QONUNI_WALKTHROUGH.md`dagi oldingi qarorlar hisobga olindi. Quyidagi qaydlar ulardagi baj...` |
| `81` | `**Dalil:** `inventra/apps/sales/services/sale_service.py:24,94`; `inventra/apps/tenants/models.py:11`; `inventra/apps/tenants/seller_prof...` |
| `93` | `1. **Fiskal provayder orqali integratsiya.** Amaldagi reyestrdagi virtual kassa yechimidan boshlash. Tanlash mezonlari: hujjatlashtirilga...` |
| `96` | `4. **Savdo va fiskal operatsiya yozuvlari alohida.** Checkout uchun barqaror operation ID va idempotency kaliti; mahsulot nomi, narx, sol...` |
| `102` | `1. Provayderga beriladigan aniq talablar va Inventra integratsiya sxemasini tayyorlash; rasmiy API/sandbox va maqom aniqligi.` |
| `109` | `- [Soliq qo‘mitasining 2024-06-21 izohi](https://gov.uz/oz/soliq/news/view/14527): reyestrdagi/integratsiyalangan yechimlar va ikkilamchi...` |
| `120` | `**Dalil:** `inventra/apps/cashbox/services/cashbox_service.py:78,186`; `inventra/apps/cashbox/models.py`; `inventra/apps/sales/models/deb...` |
| `134` | `**Dalil:** `inventra/apps/sales/services/void_service.py:38,117,173`; `inventra/apps/sales/models/sale_model.py`; `inventra/api/v1/invent...` |
| `148` | `**Dalil:** `inventra/apps/sales/services/sale_service.py:183,233`; `inventra/apps/sales/services/b2b_transfer_service.py:481,657`; `inven...` |
| `162` | `**Dalil:** `inventra/apps/sales/services/sale_service.py:74`; `inventra/apps/sales/models/sale_model.py`; `frontend/inventra/src/pages/PO...` |
| `176` | `**Dalil:** `inventra/apps/sales/services/counterparty_service.py:16,47`; `inventra/api/v1/sales/serializers.py:38`.` |
| `190` | `**Dalil:** `inventra/apps/inventory/services/transfer_service.py:40,86,257`; `inventra/apps/sales/services/sale_service.py:212`.` |
| `204` | `**Dalil:** `frontend/inventra/src/pages/Services.jsx:89,156`; `Sales.jsx:167`; `Dashboard.jsx:82`; `Audit.jsx:14`; `Employees.jsx:44`; `c...` |
| `218` | `**Dalil:** `inventra/api/v1/accounts/views/admin_login.py`; `inventra/apps/accounts/services/otp_services.py:49`; `login_throttle.py:75,1...` |
| `232` | `**Dalil:** `inventra/apps/accounts/services/password_reset_service.py:390,544,554`; `inventra/api/v1/accounts/views/password_reset.py:41`...` |
| `246` | `**Dalil:** `inventra/api/v1/accounts/views/profile_views.py:24,128`; `complete_profile.py`; `inventra/apps/accounts/services/password_res...` |
| `260` | `**Dalil:** `inventra/apps/inventory/migrations/0006_remove_branches_one_stock_per_variant.py`; `inventra/apps/tenants/migrations/0008_rem...` |
| `278` | `**Dalil:** `inventra/api/v1/cashbox/views/cashbox_views.py:20,51,96`; `inventra/config/settings.py:147`; `inventra/api/v1/catalog/views/p...` |
| `292` | `**Dalil:** `inventra/api/v1/sales/serializers.py:77`; `inventra/api/v1/inventory/serializers.py:9,30`; sale/stock viewlarining serializer...` |
| `306` | `**Dalil:** `inventra/apps/analytics/services/analytics_service.py:104,279`; `inventra/apps/inventory/services/deficit_service.py:39`.` |
| `320` | `**Dalil:** `inventra/api/v1/catalog/views/product_views.py:73,105,141,179,242`.` |
| `334` | `**Dalil:** `inventra/apps/catalog/services/category_service.py:122`; `inventra/api/v1/catalog/views/product_views.py:147`; `inventra/api/...` |
| `348` | `**Dalil:** `inventra/apps/sales/services/sale_service.py:183,227`; `b2b_transfer_service.py:485,661`; reja §4.2.` |
| `362` | `**Dalil:** `inventra/api/v1/sales/views/sale_views.py:36`; inventory movement va cashbox list viewlari; `frontend/inventra/src/pages/Sale...` |
| `376` | `**Dalil:** `inventra/config/settings.py:229,242`; `docker-compose.yml:60`; `nginx/nginx.conf:43`; `frontend/inventra/src/api/client.js:72`.` |
| `378` | `MinIO yoqilganda endpointning defaulti Docker ichidagi `http://minio:9000`. Shu host bilan chiqarilgan media URL tashqi brauzerda ochilma...` |
| `390` | `**Dalil:** `docker-compose.yml`; `frontend/inventra/Dockerfile`; `nginx/nginx.conf`; `inventra/gunicorn.conf.py`; `inventra/config/settin...` |
| `404` | `**Dalil:** `inventra/api/v1/accounts/views/docs_views.py:164,193`; `terms_views.py:24`; `inventra/apps/accounts/models/user_model.py`.` |
| `418` | `**Dalil:** `inventra/apps/core/services/audit_service.py:12,50,58`; `inventra/api/v1/accounts/views/terms_views.py:12`; `inventra/api/v1/...` |
| `432` | `**Dalil:** `inventra/api/v1/accounts/views/employee_views.py:27,40`; `inventra/api/v1/accounts/serializers.py:118`; `frontend/inventra/sr...` |
| `446` | `**Dalil:** `frontend/inventra/src/pages/Sales.jsx` — 3406 qator; Catalog — 2188; POS — 1770; Inventory — 1762; Services — 1584; Dashboard...` |
| `460` | `**Dalil:** `.github/workflows/ci.yml:24,25`; `inventra/config/settings_test.py:37,39`; `inventra/config/settings.py:33`; `inventra/.gitig...` |
| `474` | `**Dalil:** `inventra/api/v1/accounts/views/profile_views.py:68`; `inventra/config/urls.py`dagi media serve; `nginx/nginx.conf`dagi `/medi...` |
| `488` | `**Dalil:** `frontend/inventra/src/hooks/usePersistedState.js:10,27,47`; `frontend/inventra/src/pages/POS.jsx:54`.` |
| `502` | `**Dalil:** `inventra/apps/cashbox/services/cashbox_service.py:291`; `inventra/apps/sales/services/debt_service.py:108`; `inventra/apps/te...` |
| `516` | `**Dalil:** `inventra/apps/cashbox/tasks.py:129`; `inventra/apps/inventory/tasks.py`; `inventra/apps/sales/tasks.py:22,30`; `inventra/conf...` |
| `530` | `**Dalil:** `inventra/apps/accounts/authentication.py:17`; `inventra/config/settings.py`dagi SIMPLE_JWT; `inventra/api/v1/accounts/urls.py...` |
| `544` | `**Dalil:** `telegram_bot_sms/main.py`dagi contact handler; `inventra/api/v1/tg_bot/serializers.py:9`; `inventra/apps/tg_bot/models.py`.` |
| `558` | `**Dalil:** `frontend/inventra/src/pages/Login.jsx:37,86,114`; `src/api/client.js:38`.` |
| `560` | `Remember me parolni Base64ga aylantirib `localStorage`ga yozadi. Base64 qayta ochiladigan kodlash; shifrlash emas. Logout `inventra_remem...` |
| `572` | `**Dalil:** `inventra/apps/cashbox/services/cashbox_service.py:268,283`.` |
| `586` | `**Dalil:** `inventra/apps/accounts/services/tenant_context_service.py`; `inventra/api/permissions.py:100`; `inventra/api/v1/tenants/views...` |
| `600` | `**Dalil:** `inventra/api/permissions.py:160,163`; GET/POST/PATCH map ishlatadigan catalog/sales viewlari.` |
| `614` | `**Dalil:** `inventra/api/v1/sales/serializers.py:265,284`; `frontend/inventra/src/pages/PublicReceiptView.jsx:333`; `components/common/Re...` |
| `628` | `**Dalil:** `README.md:49,50,51`; `inventra/config/urls.py`; `docker-compose.yml`; `frontend/inventra/src/api/client.js`dagi branchId argu...` |

### 📄 `docs/OZBEKISTON_QONUNI_WALKTHROUGH.md` (41 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `1` | `# Inventra — O‘zbekiston qonunlariga moslik walkthrough’i` |
| `20` | `Loyiha Django/React asosidagi ko‘p ijarachili savdo, POS, ombor, kassa, qarz va B2B platforma. `INVENTRA_MASTER_PLAN.md` katta texnik baj...` |
| `30` | `\| UZ-00 \| **Biznes modeli va javobgar tomonlarni aniqlash.** Egasi tasdiqladi: Inventra do‘konlarga SaaS; xaridor buyurtmani to‘g‘ridan...` |
| `31` | `\| UZ-01 \| **Fiskal chek va Inventra dasturining ruxsatli maqomi.** Egasi kelajakdagi do‘kon savdolarida rasmiy chek kerakligini tasdiql...` |
| `32` | `\| UZ-02 \| **Tenantning yuridik maqomi, savdo ruxsati va soliq profili.** Egasi tenantlar turli shaklda, jumladan YTT/MChJ bo‘lmagan hol...` |
| `34` | `\| UZ-03 \| **Valyuta, sotuv narxi va USD naqdni qabul qilish.** O‘RQ-573 9-moddasiga ko‘ra ichki savdo narxlari va to‘lovlar UZS’da bo‘l...` |
| `35` | `\| UZ-04 \| **Shaxsga doir ma’lumotlar — real ishlov berish xaritasi va xorijiy servislar.** Kodda foydalanuvchi telefon/aloqa telefoni, ...` |
| `36` | `\| UZ-05 \| **Maxfiylik/rozilik matni va isbotlanmagan va’dalar.** Qabul oynasi telefon, chek va kassa amaliyotlari “kriptografik xeshlar...` |
| `37` | `\| UZ-06 \| **Ommaviy chek URL va chiqadigan ma’lumotlar.** Ommaviy endpoint autentifikatsiyasiz, faqat tenant bo‘yicha emas, kunlik ketm...` |
| `38` | `\| UZ-17 \| **Tenant/filial izolyatsiyasi, kassir ruxsatlari va shaxsiy audit.** Umumiy mexanizm tenantni foydalanuvchidan oladi va `HasE...` |
| `39` | `\| UZ-22 \| **Shaxsiy ma’lumotlar bazasi reyestri va mas’ul shaxs.** Inventra YTT operatori, har bir do‘kon va uchinchi tomon servislarin...` |
| `40` | `\| UZ-23 \| **Git tarixidagi credential’lar va prod favqulodda choralar.** Egasi production secret commit qilingan-qilinmaganini bilmasli...` |
| `46` | `\| UZ-07 \| **Qaytarish/almashtirish va `void` alohida operatsiyalar bo‘lsin.** Qonun maqbul sifatli nooziq-ovqat tovarida, istisnolar va...` |
| `47` | `\| UZ-08 \| **Naqd/karta/QR/aralash to‘lov, qarz va refund hisobi.** `Sale` bitta `payment_type` saqlaydi, shuning uchun bitta savdoda na...` |
| `48` | `\| UZ-09 \| **Ichki ko‘chirish, B2B sotuv va ERI hujjatlari.** Egasi ikki holatni alohida oqimda xohladi: bitta YTT/MChJning filial/ombor...` |
| `49` | `\| UZ-10 \| **Ekranda chizilgan imzo va ERI.** Alohida muhokama UZ-09 bilan birlashtirildi. Qaror: canvas rasmi faqat ichki qabul/tasdiql...` |
| `50` | `\| UZ-11 \| **Ommaviy oferta va xizmat chegarasi.** Hujjat hozir “Rasmiy Hisob-Faktura”, ko‘p valyutali USD cheklari, 7 kunlik universal ...` |
| `51` | `\| UZ-12 \| **Boshqaruv ko‘rsatkichi va rasmiy soliq/fiskal hisobotni ajratish.** Analytics’dagi `net_profit`/“sof foyda” sotuv narxi min...` |
| `52` | `\| UZ-13 \| **Ma’lumot subyekti so‘rovi, eksport va hisob yopilishi.** Egasi ma’qulladi: foydalanuvchi profilini ko‘rish/tuzatish va muro...` |
| `58` | `\| UZ-14 \| **Tovar toifasiga xos ruxsat, markirovka va chek ma’lumoti.** Egasi inventarni har qanday do‘kon/toifa uchun ochiq, POS’ni es...` |
| `59` | `\| UZ-15 \| **Obuna to‘lovi va to‘lov provayderi.** Egasi hozir Inventra mijozlardan obuna puli olmayotganini va karta raqami/CVV saqlash...` |
| `60` | `\| UZ-16 \| **Foydalanuvchi/xodim/kontragent roziliklari va xabarnoma.** Kod qarz chegarasi oshganda egasining Telegram shaxsiy chatiga k...` |
| `61` | `\| UZ-18 \| **Audit yozuvi va tuzatish izlari.** AuditLog modeli ORM orqali mavjud yozuvni o‘zgartirish/o‘chirishni to‘sadi, lekin DB dar...` |
| `62` | `\| UZ-19 \| **Vaqt, pul yaxlitlash va fiskal yakunlar.** Hozir `TIME_ZONE=UTC`, Celery ham shu zonada; ayrim smena/kassa sanalari `timezo...` |
| `63` | `\| UZ-20 \| **AWS/production tayyorgarligi va data security.** Egasi tasdiqladi: hozir lokal, production yo‘q; AWS hududi keyin, faqat qo...` |
| `64` | `\| UZ-21 \| **Hujjat versiyasi va foydalanuvchi roziligi dalili.** Hozir backend faqat `terms_accepted`, vaqt va IP’ni saqlaydi; hujjat n...` |
| `68` | ``INVENTRA_MASTER_PLAN.md` 1–2901-qatorlar, asosiy qoidalar, barcha T0–T9 vazifalari va A–H ilovalari bilan boshidan oxirigacha ko‘rib chi...` |
| `72` | `\| D-01, T1.1–T1.9 — filiallarni tenant qilish va transferlar \| Egasi tanladi: jismoniy filiallarning har biri Master Plan kabi alohida ...` |
| `73` | `\| UZ-01/F-02 — fiskal provider ishlamasa savdo \| Egasi tasdiqladi: providerning rasmiy offline rejimi yozma tasdiqlanmaguncha POS savdo...` |
| `91` | `\| T7.9/H.1/H.5 — logout va browser storage \| T7.9 barcha `inventra_*` local/session storage kalitlarini tozalashni aytadi; H.1 esa `inv...` |
| `97` | `1. Soliq/OFD’dan Inventra POS reyestri/attestatsiyasi va rasmiy fiskal provayder oqimiga yozma aniqlik; MXIK/markirovka/offline/refund ta...` |
| `134` | `\| F-10 \| Hozir product variant’da barcode maydoni bor; POS va tezkor ombor qabulida USB skaner klaviatura kabi kiritgan kodni Enter orq...` |
| `139` | `1. Inventra qaysi yuridik shaxs yoki YTT tomonidan yuritiladi? Rasmiy nomi, STIRi va ro‘yxat/yuridik manzili qanday?` |
| `140` | `2. Inventra faqat do‘konlarga SaaS dasturmi, yoki xaridorga to‘lov qabul qilish, chek berish, marketpleys, yetkazish yoki vositachilik ha...` |
| `152` | `2026-10-11 javoblaridan qayd etilgan: Inventra YTT nomidan ro‘yxatdan o‘tgan; hozircha production yo‘q, lokal muhitda ishlab chiqilmoqda ...` |
| `160` | `\| 2026-10-11 \| UZ-00…UZ-24, F-01…F-10 \| Egadan 12 savolga javob olindi. UZ-00: faqat SaaS, buyurtma do‘konga bevosita keladi, yetkazis...` |
| `167` | `\| 2026-10-11 \| UZ-06 \| Egasi mijoz qog‘oz chek bilan bir xil raqamli nusxani QR orqali ochib, yuklab/saxlab olishini xohlashini tasdiq...` |
| `197` | `\| D-01 / T1.1–T1.7 (qisman), internal-shop boundary \| Har jismoniy do‘kon alohida tenant; har variant uchun tenant-local yagona stock. ...` |
| `213` | `\| 2026-10-11 \| INVENTRA_MASTER_PLAN.md \| 2901 qatorlik reja T0–T9 va A–H ilovalari bilan to‘liq o‘qildi. UZ-03/07/08/09/12/13/16/20 bi...` |
| `240` | `\| 2026-10-12 \| UZ-02 / F-01 / F-08 — sotuvchi profilini tekshirish \| Egasi ma’qulladi: tenant sotuvchi yuridik ma’lumotlari va tegishl...` |
| `241` | `\| 2026-10-12 \| UZ-01/F-02 — fiskal outage defaulti \| Egasi tasdiqladi: faqat rasmiy provider offline tartibi tasdiqlanganda shu rejimd...` |

### 📄 `docs/PLAN_NOTES.md` (9 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `1` | `# INVENTRA Plan Notes & Decisions Log` |
| `3` | `This document records ambiguities, justified scope extensions, human checklist actions, and owner-confirmed decisions during the executio...` |
| `16` | `- **INVENTRA_MASTER_PLAN.md**: Added to `always` in `docs/plan_scope.json` because it is the root master plan document driving this imple...` |
| `17` | `- **frontend/inventra/src/components/docs/MarkdownViewer.jsx**: Added to `phase0` in `docs/plan_scope.json` because an unhandled conditio...` |
| `45` | `- The owner separately approved password-only login for synthetic demo accounts in local DEBUG mode. `LOCAL_DEMO_LOGIN_ENABLED` defaults ...` |
| `48` | `- Demo credentials are stored only in the ignored `inventra/.env` (`INVENTRA_DEMO_PASSWORD`); no passwords/tokens are printed by the seed...` |
| `54` | `- Login at `http://localhost:5173`: `demo_owner` owns Markaz and Chilonzor; `demo_partner` owns Hamkor; `demo_owner4` owns Sergeli; `demo...` |
| `56` | `- Rebuild an **empty** approved local DB with `docker compose exec -T inventra python manage.py seed_demo_platform --products-per-tenant ...` |
| `74` | `- The owner supplied the replacement bot `@ilbi_bot` and its credential. The credential was written only to the ignored local `inventra/....` |

### 📄 `docs/README.md` (4 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `1` | `# Inventra Hujjatlar va Qo'llanmalar Markazi (Documentation Portal)` |
| `3` | `Ushbu katalog **Inventra Sales Platform** dasturiy ta'minotining barcha ishtirokchilari uchun foydalanish qo'llanmalari, ma'muriy boshqar...` |
| `28` | `Inventra tizimida 3 xil foydalanuvchi darajasi mavjud. Har bir foydalanuvchi o'z vazifasiga mos hujjat bilan tanishishi lozim:` |
| `58` | `Inventra frontend ilovasida (ro'yxatdan o'tish, birinchi marta akkauntni sozlash `/setup-account` yoki login paytida) bu mexanizmni qanda...` |

### 📄 `docs/plan_scope.json` (116 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `3` | `"INVENTRA_MASTER_PLAN.md",` |
| `8` | `"inventra/apps/*/tests/*",` |
| `9` | `"inventra/apps/*/migrations/*",` |
| `10` | `"inventra/tests/*",` |
| `11` | `"inventra/conftest.py",` |
| `12` | `"inventra/api/*/tests/*"` |
| `18` | `"inventra/.gitignore",` |
| `22` | `"inventra/.env.example",` |
| `23` | `"inventra/pyproject.toml",` |
| `24` | `"inventra/uv.lock",` |
| `25` | `"inventra/ruff.toml",` |
| `26` | `"frontend/inventra/package.json",` |
| `27` | `"frontend/inventra/package-lock.json",` |
| `28` | `"inventra/config/settings.py",` |
| `29` | `"inventra/config/settings_test.py",` |
| `30` | `"inventra/apps/accounts/services/password_reset_service.py",` |
| `31` | `"inventra/apps/accounts/services/email_utils.py",` |
| `32` | `"inventra/apps/tg_bot/services.py",` |
| `33` | `"inventra/apps/catalog/management/commands/seed_stress_products.py",` |
| `38` | `"frontend/inventra/dist_docker/*",` |
| `39` | `"frontend/inventra/src/components/docs/MarkdownViewer.jsx"` |
| `42` | `"inventra/apps/inventory/*",` |
| `43` | `"inventra/apps/catalog/*",` |
| `44` | `"inventra/apps/sales/*",` |
| `45` | `"inventra/apps/cashbox/*",` |
| `46` | `"inventra/apps/tenants/*",` |
| `47` | `"inventra/apps/accounts/*",` |
| `48` | `"inventra/apps/analytics/*",` |
| `49` | `"inventra/api/v1/inventory/*",` |
| `50` | `"inventra/api/v1/catalog/*",` |
| `51` | `"inventra/api/v1/sales/*",` |
| `52` | `"inventra/api/v1/cashbox/*",` |
| `53` | `"inventra/api/v1/tenants/*",` |
| `54` | `"inventra/api/v1/accounts/*",` |
| `55` | `"inventra/api/v1/internal/*",` |
| `56` | `"inventra/api/v1/analytics/*",` |
| `57` | `"frontend/inventra/src/*"` |
| `60` | `"inventra/apps/accounts/*",` |
| `61` | `"inventra/apps/tenants/*",` |
| `62` | `"inventra/apps/core/*",` |
| `63` | `"inventra/api/mixins.py",` |
| `64` | `"inventra/api/permissions.py",` |
| `65` | `"inventra/api/v1/accounts/*",` |
| `66` | `"inventra/api/v1/tenants/*",` |
| `67` | `"inventra/api/v1/analytics/*",` |
| `68` | `"inventra/apps/sales/services/b2b_transfer_service.py",` |
| `69` | `"inventra/api/v1/sales/views/b2b_views.py",` |
| `70` | `"inventra/config/settings.py",` |
| `71` | `"inventra/api/v1/urls.py",` |
| `72` | `"frontend/inventra/src/*"` |
| `75` | `"inventra/api/*",` |
| `76` | `"inventra/apps/permissions/*",` |
| `77` | `"inventra/apps/accounts/*",` |
| `78` | `"inventra/apps/core/*",` |
| `79` | `"inventra/config/settings.py",` |
| `80` | `"inventra/config/urls.py",` |
| `81` | `"frontend/inventra/src/*"` |
| `84` | `"inventra/apps/sales/*",` |
| `85` | `"inventra/apps/inventory/services/stock_service.py",` |
| `86` | `"inventra/apps/inventory/models/stock_movement_model.py",` |
| `87` | `"inventra/apps/inventory/models/__init__.py",` |
| `88` | `"inventra/apps/core/*",` |
| `89` | `"inventra/apps/tg_bot/services.py",` |
| `90` | `"inventra/api/*",` |
| `91` | `"inventra/config/settings.py",` |
| `92` | `"inventra/config/settings_test.py",` |
| `93` | `"inventra/config/urls.py",` |
| `94` | `"frontend/inventra/src/*"` |
| `97` | `"inventra/apps/cashbox/*",` |
| `98` | `"inventra/apps/inventory/tasks.py",` |
| `99` | `"inventra/apps/tenants/models.py",` |
| `100` | `"inventra/apps/analytics/services/analytics_service.py",` |
| `101` | `"inventra/api/v1/cashbox/*",` |
| `102` | `"inventra/config/settings.py",` |
| `103` | `"inventra/config/settings_test.py",` |
| `104` | `"inventra/config/celery.py",` |
| `105` | `"inventra/pyproject.toml",` |
| `106` | `"inventra/uv.lock",` |
| `107` | `"frontend/inventra/src/*"` |
| `110` | `"inventra/apps/analytics/*",` |
| `111` | `"inventra/api/v1/analytics/*",` |
| `112` | `"inventra/api/v1/urls.py",` |
| `113` | `"frontend/inventra/src/*"` |
| `116` | `"inventra/apps/accounts/*",` |
| `117` | `"inventra/apps/tg_bot/*",` |
| `118` | `"inventra/apps/core/*",` |
| `119` | `"inventra/api/v1/accounts/*",` |
| `120` | `"inventra/api/v1/tg_bot/*",` |
| `121` | `"inventra/api/v1/urls.py",` |
| `122` | `"inventra/config/settings.py",` |
| `123` | `"inventra/config/settings_test.py",` |
| `126` | `"inventra/pyproject.toml",` |
| `127` | `"inventra/uv.lock",` |
| `128` | `"frontend/inventra/src/*"` |
| `131` | `"inventra/apps/documents/*",` |
| `132` | `"inventra/api/v1/documents/*",` |
| `133` | `"inventra/apps/accounts/models/*",` |
| `134` | `"inventra/api/v1/accounts/*",` |
| `135` | `"inventra/config/settings.py",` |
| `136` | `"inventra/config/urls.py",` |
| `137` | `"inventra/api/v1/urls.py",` |
| `138` | `"Architectures/inventra-yol-xaritasi.md",` |
| `139` | `"frontend/inventra/src/*"` |
| `142` | `"inventra/config/*",` |
| `143` | `"inventra/Dockerfile",` |
| `144` | `"inventra/entrypoint.sh",` |
| `145` | `"inventra/gunicorn.conf.py",` |
| `146` | `"inventra/.dockerignore",` |
| `147` | `"inventra/pyproject.toml",` |
| `148` | `"inventra/uv.lock",` |
| `150` | `"inventra/docker-compose*.yml",` |
| `155` | `"frontend/inventra/Dockerfile",` |
| `156` | `"frontend/inventra/vite.config.js",` |
| `157` | `"frontend/inventra/src/*",` |
| `158` | `"inventra/apps/*",` |
| `159` | `"inventra/api/*"` |

### 📄 `docs/qollanmalar/owner_amaliy_qollanma.md` (2 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `3` | `Ushbu amaliy qo‘llanma **Inventra Sales Platform** tizimida do‘kon egasi (**Owner**) o‘z savdo korxonasining barcha jarayonlarini — tovar...` |
| `85` | `Inventra tizimida har bir tovar varianti uchun **3 xil mustaqil narx** ko‘rsatiladi:` |

### 📄 `docs/qollanmalar/owner_qollanma.md` (5 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `1` | `# Inventra Platformasi — Do'kon Egasi (Owner) Qo'llanmasi` |
| `3` | `Ushbu qo'llanma **Inventra Sales Platform** tizimidagi **Do'kon Egasi (Owner)** uchun ishlab chiqilgan bo'lib, do'konning savdo operatsiy...` |
| `63` | `Inventra tizimiga har bir kirish Telegram orqali yuboriladigan bir martalik tasdiqlash kodi (OTP) bilan himoyalangan.` |
| `65` | `2. Botga `/start inventra` buyrug'ini yuboring.` |
| `122` | `Inventra katalogida moslashuvchan savdo uchun 3 ta narx ko'zda tutilgan:` |

### 📄 `docs/qollanmalar/platform_admin_amaliy_qollanma.md` (1 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `3` | `Ushbu amaliy yo‘riqnoma **Inventra** tizimining Platform Administratori (`platform_admin`) uchun tayyorlangan bo‘lib, dasturning barcha m...` |

### 📄 `docs/qollanmalar/platform_admin_qollanma.md` (8 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `1` | `# Inventra Platformasi — Platform Administratori (Superadmin) Qo'llanmasi` |
| `3` | `Ushbu qo'llanma **Inventra Sales Platform** tizimining bosh ma'muri — **Platform Administrator** (`platform_admin`) uchun mo'ljallangan b...` |
| `26` | `Platform Administratori — bu Inventra tizimining global boshqaruvchisidir.` |
| `39` | `Inventra tizimida xavfsizlik eng yuqori darajada ta'minlangan. Platform admin akkauntiga to'g'ridan-to'g'ri login/parol orqali kirib bo'l...` |
| `45` | `participant UI as Inventra Web UI` |
| `46` | `participant API as Inventra API` |
| `157` | `Inventra platformasida doimiy ravishda quyidagi fon xizmatlari avtomatik ishlaydi:` |
| `170` | `Inventra platformasi ko'p ijarachili (Multi-Tenant) arxitekturaga ega bo'lib, har bir do'konning biznes va moliyaviy ma'lumotlari qat'iy ...` |

### 📄 `docs/qollanmalar/staff_amaliy_qollanma.md` (1 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `3` | `Ushbu amaliy yo‘riqnoma **Inventra** tizimidagi do‘kon xodimlari — **Kassirlar** va **Omborchilar** uchun kundalik ish jarayonlarini (sot...` |

### 📄 `docs/qollanmalar/staff_qollanma.md` (5 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `1` | `# Inventra Platformasi — Xodimlar (Staff / Kassir / Sotuvchi) Qo'llanmasi` |
| `3` | `Ushbu qo'llanma **Inventra Sales Platform** tizimida faoliyat yurituvchi xodimlar — **Kassirlar**, **Sotuvchi-maslahatchilar**, **Omborch...` |
| `47` | `Inventra tizimida har bir kirish xavfsiz Telegram kodi orqali tasdiqlanadi:` |
| `49` | `2. `/start inventra` buyrug'ini yozing.` |
| `159` | `4. **Xushmuomalalik:** Inventra tizimining tezkorligi sizga mijozlarga tabassum bilan, kutdirmasdan xizmat ko'rsatish imkonini beradi.` |

## 10. CI/CD va IDE Konfiguratsiyalari (GitHub Workflows, IDE) (Jami: 5 ta fayl, 25 ta o‘rin)

### 📄 `.github/workflows/ci.yml` (8 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `11` | `env: { POSTGRES_DB: inventra_test, POSTGRES_USER: inventra_test, POSTGRES_PASSWORD: inventra_test }` |
| `14` | `--health-cmd "pg_isready -U inventra_test" --health-interval 2s --health-timeout 3s --health-retries 15` |
| `18` | `defaults: { run: { working-directory: inventra } }` |
| `29` | `TEST_DB_NAME: inventra_test` |
| `30` | `TEST_DB_USER: inventra_test` |
| `31` | `TEST_DB_PASSWORD: inventra_test` |
| `37` | `defaults: { run: { working-directory: frontend/inventra } }` |
| `41` | `with: { node-version: 22, cache: npm, cache-dependency-path: frontend/inventra/package-lock.json }` |

### 📄 `.gitignore` (1 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `219` | `/.idea/inventra.iml` |

### 📄 `.idea/inventra.iml` (4 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `4` | `<content url="file://$MODULE_DIR$/inventra">` |
| `5` | `<excludeFolder url="file://$MODULE_DIR$/inventra/.idea/JsonAssistant" />` |
| `6` | `<excludeFolder url="file://$MODULE_DIR$/inventra/.idea/inspectionProfiles" />` |
| `7` | `<excludeFolder url="file://$MODULE_DIR$/inventra/.venv" />` |

### 📄 `.idea/modules.xml` (2 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `5` | `<module fileurl="file://$PROJECT_DIR$/.idea/Sales-Platform.iml" filepath="$PROJECT_DIR$/.idea/Sales-Platform.iml" />` |
| `6` | `<module fileurl="file://$PROJECT_DIR$/.idea/inventra.iml" filepath="$PROJECT_DIR$/.idea/inventra.iml" />` |

### 📄 `.idea/workspace.xml` (10 ta o‘rin)
| Qator | Mavjud Kod / Matn |
|---|---|
| `11` | `<change beforePath="$PROJECT_DIR$/frontend/inventra/src/components/common/CustomDatePicker.jsx" beforeDir="false" afterPath="$PROJECT_DIR...` |
| `12` | `<change beforePath="$PROJECT_DIR$/frontend/inventra/src/components/common/CustomSelect.jsx" beforeDir="false" afterPath="$PROJECT_DIR$/fr...` |
| `13` | `<change beforePath="$PROJECT_DIR$/frontend/inventra/src/components/layout/Layout.jsx" beforeDir="false" afterPath="$PROJECT_DIR$/frontend...` |
| `14` | `<change beforePath="$PROJECT_DIR$/frontend/inventra/src/index.css" beforeDir="false" afterPath="$PROJECT_DIR$/frontend/inventra/src/index...` |
| `23` | `<entry key="_D:/Codes/Projects/Backend/Sales-Platform" value="3I9DCcL17YYdEUEeRC3uY3t84UI" />` |
| `40` | `&quot;url&quot;: &quot;https://github.com/Abdulxadiy/Inventra.git&quot;,` |
| `45` | `<setting file="file://$PROJECT_DIR$/Inventra/apps/accounts/managers.py" root0="FORCE_HIGHLIGHTING" />` |
| `150` | `&quot;last_opened_file_path&quot;: &quot;/home/abdulxadiy/D/Codes/Projects/Backend/Sales-Platform&quot;,` |
| `164` | `<recent name="D:\Codes\Projects\Backend\Sales-Platform\telegram_bot_sms" />` |
| `165` | `<recent name="D:\Codes\Projects\Backend\Sales-Platform\Architectures" />` |

## 11. Papka va Fayllarni Qayta Nomlash Rejasi

| Joriy Nomi / Yo‘li | Yangi Nomi / Yo‘li | Maqsadi / Eslatma |
|---|---|---|
| `/home/abdulxadiy/D/Codes/Projects/Backend/Sales-Platform` | `.../ilbi-platform` yoki `.../ilbi.uz` | Asosiy repo ildiz papkasi |
| `inventra/` | `ilbi/` | Backend Django loyihasi papkasi |
| `frontend/inventra/` | `frontend/ilbi/` | Frontend Vite/React ilovasi papkasi |
| `INVENTRA_MASTER_PLAN.md` | `ILBI_MASTER_PLAN.md` | Bosh me’moriy reja hujjati |
| `Architectures/inventra-yol-xaritasi.md` | `Architectures/ilbi-yol-xaritasi.md` | Platforma yo‘l xaritasi |
| `frontend/inventra/src/components/common/InventraLogo.jsx` | `.../IlbiLogo.jsx` | Asosiy brend logotipi komponenti |
| `frontend/inventra/src/components/common/InventraIntroAnimation.jsx` | `.../IlbiIntroAnimation.jsx` | Kirish splash/intro animatsiyasi |
| `.idea/inventra.iml` | `.idea/ilbi.iml` | IDE loyiha moduli |
| `inventra/.idea/inventra.iml` | `ilbi/.idea/ilbi.iml` | Backend IDE moduli |

## 12. Logotip va Grafik Fayllar Ro‘yxati

| Fayl Yo‘li | Turi | Tavsif |
|---|---|---|
| `branding/logos/ChatGPT Image Oct 12, 2026, 04_49_55 PM-1.png` | PNG | Yangi tayyorlangan ilbi.uz logotip varianti 1 |
| `branding/logos/ChatGPT Image Oct 12, 2026, 04_49_57 PM-2.png` | PNG | Yangi tayyorlangan ilbi.uz logotip varianti 2 |
| `branding/logos/ChatGPT Image Oct 12, 2026, 04_49_59 PM-3.png` | PNG | Yangi tayyorlangan ilbi.uz logotip varianti 3 |
| `branding/logos/ChatGPT Image Oct 12, 2026, 04_50_00 PM-4.png` | PNG | Yangi tayyorlangan ilbi.uz logotip varianti 4 |
| `branding/logos/ChatGPT Image Oct 12, 2026, 04_50_01 PM-5.png` | PNG | Yangi tayyorlangan ilbi.uz logotip varianti 5 |
| `branding/logos/ChatGPT Image Oct 12, 2026, 04_50_03 PM-6.png` | PNG | Yangi tayyorlangan ilbi.uz logotip varianti 6 |
| `frontend/inventra/public/favicon.svg` | SVG | Brauzer tab favicon belgisi (hozir Inventra shelving + I monogram) |
| `frontend/inventra/src/components/common/InventraLogo.jsx` | React Inline SVG | Frontenddagi hamma joyda ishlatiladigan asosiy SVG logotip va wordmark |
| `frontend/inventra/src/components/common/InventraIntroAnimation.jsx` | React SVG & CSS | Login sahifasidagi 3 bosqichli brend intro animatsiyasi |
| `inventra/apps/accounts/services/password_reset_service.py` | Inline HTML/SVG | Emaillarga boruvchi xatlardagi brand header va footer |

---

## 🌐 13. DOMENLAR VA ELEKTRON POCHTALAR (ilbi.uz Bog‘lanish Nuqtalari)

Siz sotib olgan **`ilbi.uz`** domeni tizimning quyidagi barcha nuqtalariga to‘g‘ridan-to‘g‘ri biriktiriladi:

| Fayl Yo‘li | Qator | Joriy Eski Domen / Pochta | Yangi Domen (`ilbi.uz`) | Maqsadi / Vazifasi |
|---|---|---|---|---|
| `frontend/inventra/src/components/common/ReceiptSlip.jsx` | `671` | `https://app.inventra.uz/r/...` | `https://ilbi.uz/r/...` (yoki `https://app.ilbi.uz/r/...`) | QR-kod orqali xaridor chekni onlayn ko‘rish havolasi |
| `frontend/inventra/src/components/common/ReceiptSlip.jsx` | `680` | `www.inventra.uz` | `www.ilbi.uz` | Termal kassa chekining eng pastki foteri |
| `frontend/inventra/src/components/common/ShiftReportSlip.jsx` | `345` | `www.inventra.uz` | `www.ilbi.uz` | Kassa smenasini yopish (Z-Hisobot) cheki foteri |
| `inventra/config/settings.py` | `216` | `noreply@inventra.uz` | `noreply@ilbi.uz` | Tizimdan chiquvchi emaillar default yuboruvchisi |
| `inventra/.env` & `.env.example` | — | `noreply@new-dev.site` | `noreply@ilbi.uz` | SMTP Resend / Mail jo‘natuvchi manzili |
| `docs/hujjatlar/maxfiylik_siyosati.md` | `118` | `privacy@inventra.uz`, `support@inventra.uz` | `privacy@ilbi.uz`, `support@ilbi.uz` | Maxfiylik bo‘yicha murojaat pochtalari |
| `docs/hujjatlar/maxfiylik_siyosati.md` | `120` | `https://inventra.uz` | `https://ilbi.uz` | Rasmiy sayt domeni |
| `docs/hujjatlar/ommaviy_oferta.md` | `142` | `https://inventra.uz` | `https://ilbi.uz` | Rasmiy sayt domeni |
| `docs/hujjatlar/ommaviy_oferta.md` | `144` | `support@inventra.uz`, `admin@inventra.uz` | `support@ilbi.uz`, `admin@ilbi.uz` | Shartnoma bo‘yicha ijrochi pochtalari |
| `docs/hujjatlar/foydalanish_qoidalari.md` | `78` | `security@inventra.uz` | `security@ilbi.uz` | Xavfsizlik xizmati pochtasi |
| `nginx/nginx.conf` | `23` | `server_name localhost;` | `server_name ilbi.uz www.ilbi.uz app.ilbi.uz localhost;` | Nginx web server domeni |
| `inventra/config/settings.py` / `.env` | `ALLOWED_HOSTS` | `ALLOWED_HOSTS=...` | `...ilbi.uz,www.ilbi.uz,app.ilbi.uz` | Django ruxsat berilgan domenlar ro‘yxati |
| `inventra/config/settings.py` / `.env` | `FRONTEND_URL` | `http://localhost:5173` | `https://ilbi.uz` (prod uchun) | Emaildagi havola bosilganda saytga yo‘naltirish |
| `Architectures/inventra-yol-xaritasi.md` | `20, 155` | `inventra.uz` | `ilbi.uz` | Arxitektura spetsifikatsiyasidagi asosiy domen |

