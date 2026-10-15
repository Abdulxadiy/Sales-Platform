# ILBI — MASTER IMPLEMENTATION PLAN

> Audience: an AI coding agent that will implement this plan step by step.
> Author's intent: remove every ambiguity. If something is not written here, do NOT invent it — stop and record a question in `docs/PLAN_NOTES.md` (see §1).
> Repo: `github.com/Abdulxadiy/Sales-Platform` (Django/DRF backend in `ilbi/`, React/Vite frontend in `frontend/ilbi/`, Telegram bot in `telegram_bot_sms/`, nginx in `nginx/`).
> Snapshot this plan was written against: commit `a9d2cc0` (tag `v0.13.1`), 2026-10-10.

---

## 0. QISQACHA MAZMUN (egasi uchun, o'zbekcha)

Bu hujjat loyihaning to'liq auditi va egasi bilan kelishilgan qarorlarning jamlanmasi. Asosiy o'zgarishlar:

1. **Filial ma’lumotlari alohida tenantlarda yuradi.** Har bir jismoniy filial — alohida tenant; egasi tenantlar orasida almashadi. Ichki transfer bu qaror bilan yo‘qolmaydi: bir xil tasdiqlangan sotuvchi profiliga bog‘langan tenantlar o‘rtasida sotuvsiz/qarzsiz transfer bo‘ladi; qabul qiluvchida katalog mahsuloti yo‘q bo‘lsa, u mahalliy kategoriyani tanlaydi va alohida nusxa yaratiladi. Turli sotuvchilar orasida B2B realizatsiya alohida qoladi va ayni mahalliy kategoriya tanlash qoidasidan foydalanadi.
2. **Yangi tenantni** begona egalar uchun faqat `platform_admin` ochadi; ega o'z "filial"ini alohida endpoint bilan ochadi (telefon/email so'ralmaydi, boshqa odamni ega qilib qo'ya olmaydi).
3. **B2B va ichki transfer alohida.** B2B — alohida sotuv/qarz va tegishli rasmiy hujjat oqimi. Ichki transferda xodim jo‘natishni tasdiq oynasi bilan boshlaydi, qabul qiluvchi qabul qilgach yakunlanadi; owner o‘z tenantlari o‘rtasida bir amalda yakunlaydi. Rad/qaytishda manba qoldig‘i tovar jismonan qaytib qabul qilinmaguncha tiklanmaydi. Qisman qabul va tafovut alohida auditlanadi.
4. **Chek:** `total_amount` o'zgarmaydi; tagida "qaytarildi" va "sof summa" alohida yoziladi.
5. **Xavfsizlik:** sukut bo'yicha rad etish (deny-by-default), kassa ruxsatlari, tannarx ruxsati, ommaviy chek uchun tasodifiy token, B2B uchun alohida serializer, login throttle qayta yozilishi, parol tiklash tuzatishlari, loglardagi sirlar.
6. **Hujjat imzolari:** local chizma ERI emas; joriy A4 ichki qabul-topshirish hujjati deb belgilanadi. Rasmiy EHF/yuk hujjati vakolatli provider va ERI integratsiyasi tekshirilgach qo‘shiladi.
7. **Vaqt zonasi** `Asia/Tashkent`, DB timestamp UTC. Faqat real naqd qarz to‘lovi naqd kassaga qo‘shiladi; boshqaruv smena hisoboti rasmiy Z-hisobot deb nomlanmaydi.
8. **Production tayyorligi:** TLS, Docker, CI, zaif bog'liqliklar, soxta commit workflow'ini o'chirish.
9. **O‘zbekiston launch gate:** retail POS faqat tekshirilgan sotuvchi va rasmiy fiskal yechim bilan; yozma Soliq/OFD/provider aniqligi bo‘lmaguncha production savdosi yo‘q. AWS/data-flow, seller/tax profile va mahsulot toifalari ham alohida tekshiriladi.

### 2026-10-13 employee action follow-up

The owner's latest request adds per-row email-link resend, edit, block/unblock, archive and restore to the employee directory, including owner-account edit/block/resend for platform admins. Delete archives the membership, revokes its access and retains User/sale/audit references; the tenant's currently assigned owner must be transferred before archive (C-18). Tenant owners cannot edit/block a former employee now active in another tenant. Email edits and block/unblock invalidate existing links, JWT versions and login tickets; block is global to the selected account, while archive remains tenant-scoped. Staff permissions can be edited but owner-only operations are not assignable; `sales.record_debt_payment` remains assignable per updated D-17. Validation: **476 backend tests passed**, frontend build and employee-page lint passed, no migration drift, and the local directory API reports the requested owner actions as available. Both directory migrations were applied locally; live verification sent no real messages and did not edit any account. See `docs/PLAN_NOTES.md` §11.

### 2026-10-12 implementation checkpoint

**Platform admin, employee directory, and activation follow-up (latest):** The owner confirmed that platform administration covers tenants, employees, security, seller-profile review, and audit; tenant sales, debts, cost prices, cash, and other commercial reports stay owner-only. The previous Employees UI rendered one hard-coded account regardless of the selected tenant. It now reads the paginated tenant-scoped employee API with search/status filters, real account status, hire/fire, and admin tenant deep links. The platform admin dashboard now uses all tenant pages, the seller-review queue, and real audit counts instead of fabricated infrastructure/privacy percentages; the audit UI has working action/tenant/page filters, and tenant hard deletion is disabled. Seller-profile review has a dedicated admin queue and API. Tenant-setting edits now create value-free audit records; Telegram test/report-send endpoints are restricted to owner/platform admin. Invitation links remain usable for resuming Telegram binding/OTP until successful login or their original 24-hour expiry; password setup cannot be repeated from the same invitation. Password-reset links remain single-use. The owner-approved security boundary is recorded in `docs/PLAN_NOTES.md` §10.

**Validation:** 429 backend tests passed, frontend production build passed (existing large-bundle warning), migration drift check passed, and local `core.0009_tenant_update_action` was applied by restarting the Django container. Read-only live admin API checks returned 200: 5 tenants, 101 employees for demo tenant #1, 0 pending seller profiles, and 8 audit records. ARA-mobile currently has 1 active employee membership (2 total), so missing employees there require data import/creation; the former UI hid even the 101-per-demo-tenant records. Fake health indicators were removed because no live service-monitoring endpoint exists. No real invitation or Telegram message was sent during verification. Detailed implementation and remaining items are in `docs/PLAN_NOTES.md` §10.

**Telegram binding gate before 2FA:** after password verification or email-link account activation, a separate screen now guides the user through `/start` and sharing their own contact with `@ilbi_bot`. The backend verifies the current bot's contact binding before accepting an explicit OTP-send request; code entry and its timer appear only after successful delivery. Password/setup proof is carried by a hashed-key, one-use login ticket; old bot contacts do not pass the gate. The local contact migration was applied. Latest full backend suite: **411 passed**; frontend build passed. See T7.3/T7.9 and `docs/PLAN_NOTES.md` §9. No real Telegram OTP was sent during validation.

**Telegram bot replacement:** the owner selected `@ilbi_bot`. Both ignored local runtime env files now use the same `TELEGRAM_BOT_TOKEN` key; the bot code, UI links/messages, backend error text and documentation use the new handle. Django, Celery worker/beat and bot containers were recreated, and the bot is polling. Telegram `getMe` verified the new handle. Latest backend suite: **399 passed**. Existing users and groups must connect to the new bot; see `docs/PLAN_NOTES.md` §8. The credential itself remains out of tracked files.

**Tenant owner invitation fix:** tenant creation and owner change now return the actual invitation dispatch status, and platform admins can retry a failed invitation from the Tenants page without creating another tenant. A transient SMTP DNS failure caused the reported missing email; a later connection check succeeded. Full backend suite: **397 passed**; no real email was sent during validation. See `docs/PLAN_NOTES.md` §7 for the retry flow and remaining localhost-link limitation.

**Local demo reset (latest owner instruction):** the owner explicitly discarded the backup-recovery requirement and authorized deleting all old local application data and uploads. The local database was recreated and all migrations applied successfully. `seed_demo_platform` populated 4 tenants, 20,000 products/variants/stocks, 400 staff (404 accounts including owners/admin), 402 synthetic counterparties and 400 sample sales. The owner approved opt-in, DEBUG-only password login for explicitly tagged synthetic accounts; production startup refuses this setting. Latest backend validation: **392 passed**; frontend build, Django checks and migration drift checks passed. Login and tenant-scoped catalog/stock/sales/dashboard requests through `localhost:5173` succeed; foreign-tenant access is denied. This completes the local startup/data-reset task only. T3.7 pagination remains open: the current list endpoints still return full arrays for 5,000-item tenants. Details and demo account names are recorded in `docs/PLAN_NOTES.md` §5.

The owner has authorized implementation of the approved decisions recorded in `docs/OZBEKISTON_QONUNI_WALKTHROUGH.md`. Latest verification: **399 backend tests passed**, `makemigrations --check --dry-run` reports no changes, Django system checks report no issues, and the frontend production build succeeds (with the existing >500 kB main-bundle warning). These results do not close external/legal launch gates. Tenant isolation, seller-profile scaffolding, internal inter-tenant transfer, public receipt token hardening, local-only POS guard/UZS boundary, B2B receiver-side category/barcode mapping, and the B2B physical-return receipt flow have implementation in the worktree. They remain partial until the acceptance checks below each task pass; in particular, fiscal provider integration, seller evidence/encryption/retention, owner resolution of lost/damaged B2B return discrepancies, concurrency QA, and production/data-location review remain open. The walkthrough is the detailed, authoritative per-task implementation log.

Bajaruvchi AI uchun qolgan hujjat inglizcha yozilgan (aniqlik uchun). Foydalanuvchiga ko'rinadigan matnlar (xato xabarlari) o'zbekcha bo'lib qoladi.

---

## 1. RULES FOR THE EXECUTING AI (READ FIRST, OBEY ALWAYS)

1. **Work phase by phase, task by task, in the order given.** Do not start a task before its dependencies (listed in each task) are done and committed.
2. **Before changing a file, open and read it completely.** Code snippets in this plan show the *target logic*. Existing code may differ slightly from what is assumed; adapt names/imports to what really exists, but never change the *behavior* described.
3. **One task = one git commit** (or a small series). Commit message format: `type(scope): short description [T<phase>.<n>]`. Never use `[skip ci]`.
4. **After each task:** run the test suite (commands in §4.8). All tests must pass. Add the tests listed in the task. A task is not done until its "Acceptance" list is fully true.
5. **Do not touch unrelated code.** Do not reformat files, do not rename things not mentioned.
6. **Project code standards (mandatory):**
   - All code comments and docstrings are in **English**. User-facing strings (error messages, notifications, labels) stay in **Uzbek (Latin)** like the existing code.
   - Service layer: `apps/<app>/services/<name>_service.py`, one service class per file.
   - `api/v1/<app>/` holds serializers, views, urls. Models and business logic live in `apps/`. **No business logic in views.**
   - **Every endpoint declares explicit `permission_classes`.** No implicit defaults (this plan also adds a test that enforces it).
   - Fail loud: no silent fallbacks that hide errors.
7. **Never log secrets**: tokens, passwords, OTP codes, reset URLs, bot token, full request bodies.
8. **If a requirement conflicts with reality or is ambiguous:** STOP that task, append a note to `docs/PLAN_NOTES.md` (task id, what is unclear, what you propose), and continue with the next independent task. Do not guess on money, security or data-integrity logic. For Uzbekistan legal/product decisions, `docs/OZBEKISTON_QONUNI_WALKTHROUGH.md` and its owner-approved decisions supersede older conflicting text here; revise the affected task before implementation. External legal/provider facts remain launch gates, not assumed approvals.
9. **Database is disposable.** There is no production data. When a migration is awkward, it is acceptable to run `docker compose down -v` and regenerate. Still, create new forward migrations instead of editing old ones, unless the task says otherwise.
10. **Money/stock correctness beats speed.** Every function that changes stock, debt or cash must: run inside `transaction.atomic`, take the row locks in the order of §4.4, and be covered by tests that include concurrency or invariant checks where the task says so.

---

## 1A. SCOPE GUARD — WHAT YOU MUST NOT TOUCH (READ TWICE)

The owner of this project has seen executing AIs "improve" things nobody asked for. **Every unrequested change is a defect**, even if it looks better to you. Follow this section literally.

### 1A.1 Principle
Change **only** what the current task asks, in **only** the files the task names (plus call sites found by the grep commands the task itself prescribes). If you see a bug, smell or improvement opportunity outside the task: do **not** fix it — write one line in `docs/PLAN_NOTES.md` (`file:line — what — why`) and move on.

### 1A.2 Hard prohibitions (never, in any task, unless that task's text explicitly says so)
1. Do not rename or move files, classes, functions, methods, variables, URL paths, URL names, DB tables/columns, enum values, permission codenames, Celery task names or JSON field names that already exist.
2. Do not change the **shape** of any existing API response or request (keys, nesting, types, status codes) except the exact fields a task lists. Pagination (T3.7) is the single approved global exception.
3. Do not edit a migration file that is already committed. Only add new migrations (the sole exception: none).
4. Do not delete tests, mark tests `skip`/`xfail`, loosen assertions, or lower coverage to get green. Replace obsolete branch-local transfer tests with tenant-to-tenant internal-transfer tests; delete only tests for behavior actually removed, plus the removed change-with-old endpoint tests in T7.4.
5. Do not reformat, reorder imports or "clean up" code you are not otherwise changing. No mass `ruff --fix`, no black, no prettier over untouched files.
6. Do not add, remove or upgrade dependencies except where a task names them (T0.4, T5.1 `freezegun`, T7.8 `httpx`/`cachetools`, T9.2 `psycogreen`, T9.5 `sentry-sdk`).
7. Do not add features, endpoints, fields, settings, env vars or UI that the plan does not list.
8. Do not weaken security: no relaxing permissions, validators, throttles, constraints, CSP/CORS/`ALLOWED_HOSTS`, token lifetimes beyond the plan, or error-message strictness.
9. Do not change user-facing Uzbek texts that exist today, except those a task rewrites. New texts: Uzbek (Latin), polite, short.
10. Do not change any decision in §2 or Appendix G unless a later owner-approved walkthrough decision explicitly supersedes it. If code or a task contradicts the current decisions, update the plan task and record the resolution before implementation.
11. Do not touch these areas outside their own task: `Architectures/` (documents; the only allowed edit is the sentence in T8.4), `branding/`, `docs/*` user guides (only new files named in the plan), `init-db.sql`, `frontend/ilbi/public/*`, old migrations.
12. Do not change infrastructure files (`Dockerfile`, `docker-compose*.yml`, `nginx/*`, `gunicorn.conf.py`, `entrypoint.sh`, `.github/*`) outside the tasks of Phase 0 and Phase 9 (plus the single env-var rename in T7.8).
13. Do not change `telegram_bot_sms/*` outside T7.8.
14. Do not introduce new abstractions (base classes, generic helpers, decorators, mixins) beyond those the plan names. Duplicated code that the plan does not mention stays duplicated.
15. Do not "fix" failing tests that are unrelated to your task: report them (PLAN_NOTES) and stop that task if they block you.
16. Do not fix lint/type warnings in files you are not already editing.
17. Do not commit secrets, `.env` files, local DB dumps, build outputs or IDE folders.
18. Do not merge two tasks into one commit and do not start a later phase before the earlier one is finished and green.
19. Do not touch frontend styling/layout/design except what a task needs for its functionality.
20. When a task says "read the file first and keep X", you must keep X **byte-for-byte** (logic, names, messages).

### 1A.3 Allowed-files discipline (mechanical check)
- Create the scope guard of T0.7 first (Phase 0). Before **every** commit run:
```bash
python scripts/plan_scope_check.py phase<N>        # e.g. phase4
```
  It fails if any changed/new/deleted file is outside the globs of `docs/plan_scope.json` for that phase (+ the "always" list). The phase globs are **ceilings**: the task's own `Files:` list is the real allowance.
- If a legitimately needed file is outside the ceiling: add its glob to `docs/plan_scope.json` **in the same commit** and explain why in `docs/PLAN_NOTES.md`. Never silence the script any other way.
- Run `git diff --stat` and read the whole diff before committing. Revert every hunk that is not required by the task.

### 1A.4 Priority when instructions conflict
1. The explicit text of the current task. 2. Appendix G (frozen registry) and §2 decisions. 3. §1/§1A rules. 4. Existing code behavior. If two statements in this plan contradict each other, **stop** and write the contradiction to `docs/PLAN_NOTES.md`; do not choose silently.

### 1A.5 Task completion report (mandatory, paste it into the commit body or PR description)
```
TASK: T<phase>.<n> <title>
FILES CHANGED: <list, one per line>
FILES DELIBERATELY NOT CHANGED THOUGH RELATED: <list or "none">
TESTS ADDED/CHANGED: <list>
TEST RUN: <command> -> <N passed, 0 failed>
SCOPE CHECK: plan_scope_check.py phase<N> -> OK
DEVIATIONS FROM THE PLAN: <"none" or each deviation + reason>
NOTES WRITTEN TO docs/PLAN_NOTES.md: <yes/no + short list>
```
A task without this report is not done.

---

## 2. LOCKED PRODUCT DECISIONS (do not re-open)

IDs are referenced from tasks.

**Tenancy & access**
- **D-01 (supersedes branch-transfer removal):** Branch (`filial`) records are removed; every former branch becomes its own tenant. Keep/build a separate internal stock-transfer aggregate between tenants owned by the same verified seller profile. Staff transfer: confirmation modal executes source dispatch and leaves destination `kutilmoqda`; recipient records actual per-line quantity and accepts, producing `bajarildi` or `tafovut bor`. Owner transfer between own tenants is atomic after confirmation and ends `yetkazildi` without recipient acceptance. A rejected/returned shipment does not restore source stock until physical return is received through a separate return transfer. Different sellers use B2B sale/debt, never the internal-transfer route. Transfer UI/statuses are ILBI records, not ETTYX substitutes.
- **D-02** One `owner` user may own many tenants. Every non-owner user (`staff`, and `platform_admin` which is outside tenants) is bound to exactly one tenant. This is enforced as a **policy in the service layer**, not by schema (so it can be relaxed later).
- **D-03** The UI presents "switch tenant" like "switch branch". The active tenant is sent by the client in header `X-Tenant-ID` and **verified against the DB on every request**.
- **D-04** `platform_admin` opens tenants for *new/other* owners. An owner opens extra tenants for himself through a **separate endpoint** that asks for no phone/email (owner = request.user). An owner can never assign another person as owner (only `platform_admin` can: `change_owner`).
- **D-05** Access is gated on `Employee.is_active` (kept decision). `User.role` is not demoted on fire (kept decision). Owners are tracked via `Employee` rows (`is_owner=True`).
- **D-06** Permission denied responses must say *which permission is missing* in Uzbek (no internals).
- **D-07** Approved permission list: Appendix A. Owner-only operations are enforced in code and are **not assignable** to staff.
- **D-08** Staff can see cost price (`tannarx`) only with permission `catalog.view_cost_price`.
- **D-09** Owner gets both per-tenant reports and an aggregated report across all owned tenants.

**B2B / sales**
- **D-10 (legal/physical-return guard):** B2B is a sale, distinct from internal transfer. Rejection/expiry creates a pending return/reconciliation obligation; do not increase A's stock or reduce receivable until goods/credit are actually reconciled through an audited return transaction. If goods never physically return or are damaged/lost, the source owner may close the logistics discrepancy with a reason and audit; this does not restore stock, and the sale-price value is reversed from `Sale.refunded_amount` and partner receivable (any excess/paid amount becomes partner credit), never cash. The 7-day window is an operational contract rule only and must be confirmed in the seller terms; it is not presented as a statutory consumer-return period.
- **D-11** B2B partial accept: B may accept part now and the rest later, until the 7-day expiry. Per item, `voided + accepted + physically_returned + return_pending + pending = quantity`; pending and return-pending are separate. Rejection/expiry only moves pending to return-pending; sender stock and receivable change only on a separately audited physical receipt/reconciliation.
- **D-12** A can never touch what B already accepted. Ordinary `void` is refused for B2B sales; sender stock/debt are reconciled only through the separate B2B return workflow. Accepted quantities remain accepted and are never included in a return.
- **D-13** `Sale.total_amount` never changes after creation. A returned amount is stored separately (`refunded_amount`); `net_amount = total_amount − refunded_amount`. Receipts show: total, "Qaytarildi: X", "Sof summa: Y".
- **D-14** B sees only **one price per item** (the price A sold at = what B pays). B never sees A's cost price, A's employee identities, or void reasons.
- **D-15** Every sale correction, customer return, internal-transfer discrepancy/return, and B2B return creates a separately typed audit record and appropriate notification; the counterparty debt history exposes only authorized fields.
- **D-16 (superseded):** cashier `void` is distinct from consumer return/exchange and defect claim. `void` corrects an erroneous sale with reason/audit and provider flow; consumer return follows category-specific applicable rules and disclosed longer shop policy. Do not impose a single 7-day technical window on statutory consumer rights. Refund links to original sale/tenders and accepted return quantity.
- **D-17 (supersedes owner-only entry):** owner or staff explicitly granted `sales.record_debt_payment` may enter an actual debt payment, attributed to cashier and shift; corrections/cancellation are owner-only. Only cash tender affects drawer; card/bank is ledger-only. Refund first offsets open debt; any excess becomes customer credit.
- **D-18** Counterparty is mandatory only for `debt` and B2B sales (kept).
- **D-19** B2B counterparty linking is explicit (own tenants: pick from list; foreign tenants: by public tenant code + approval). Phone-based auto-discovery is removed.
- **D-20** Idempotency key is request-scoped, not content-scoped (kept): same goods/price may be sold again later.
- **D-21** `price_min` stays advisory (frontend warning only) (kept).

**Cash / time**
- **D-22** Time zone is `Asia/Tashkent` everywhere. All "today"/date logic uses local dates.
- **D-23 (supersedes automatic all-tender cash):** Shift is per tenant. Expected cash includes actual cash sales, cash debt receipts, cash refunds, opening float, documented cash movements and withdrawals. Only cash debt tender creates `CashIncome`; card/bank/customer-credit tender never increases physical drawer. Internal reports are “boshqaruv hisoboti/smena yakuni”; “Z-hisobot” is reserved for official provider output.

**Auth**
- **D-24** Login throttle is per (account, IP) with temporary escalating locks; **no permanent ban triggered by anonymous users**. Owner is notified in Telegram on suspicious lockouts.
- **D-25 (supersedes legal-evidence claim):** A drawn canvas signature is not ERI and by itself is not legal electronic signature evidence. Store a server-side internal acknowledgement with actor/time/version/audit and label the A4 “Ichki qabul-topshirish hujjati — ERI/EHF emas.” Official EHF/waybill/ERI requires a separately verified authorized provider integration and remains launch-gated.
- **D-26** Public receipt links use an unguessable random `public_token`, expose a whitelist of fields only, and are rate-limited.
- **D-27 (updated):** Owner-only operations include hire/fire, permission management and debt payment correction/cancellation. Debt payment entry is assignable to staff through the explicit permission in Appendix A.
- **D-28 (supersedes all-positive-payment rule):** Only an actual positive cash debt payment writes exactly one `CashIncome` in the same DB transaction. Non-cash payments remain in the debt ledger with tender, cashier and shift but never affect physical cash. Corrections are compensating audit entries and never duplicate cash income.

**Uzbekistan compliance and owner-approved decisions (2026-10-12; supersede conflicting legacy tasks/Appendix G)**
- Retail POS launch stays disabled until the owner has written clarification on ILBI's registry/attestation obligations and has selected an active registered fiscal provider; provider outage blocks finalization unless its officially confirmed offline flow is implemented.
- Catalog/inventory can be used without seller approval; real POS requires an operator-verified seller profile (legal form, official name, necessary identifiers, permitted activity, tax regime, product scope and fiscal provider). Unknown product compliance data warns by default; only a confirmed mandatory legal/provider requirement blocks the relevant tender/sale.
- Product/variant compliance metadata includes MXIK, unit, seller-dependent tax/VAT applicability, marking requirement and conditional serial/marking/lot/expiry fields. Applicable lots use FEFO recommendation; expired stock warns, and blocks only when a confirmed rule/provider requires it.
- POS is UZS-only. The internal USD calculator is informational and must not write to the sale, receipt, debt or drawer. Cash change is based only on UZS cash received. Cashless-only MXIK lines split into separate valid provider-confirmed sale/receipt flows.
- Tender portions are recorded internally (cash/card/bank/customer credit); no external acquiring is implied. Cash debt receipt alone increases drawer. Return/refund maps back to actual original tender; debt reduces first and excess becomes a controlled customer-credit balance.
- Internal receipt copy uses an opaque revocable token and only paper-visible data; fiscal provider QR remains separate. Receipt/counterparty records are retained by category-specific legal duration, not one universal hard-coded period.
- Terms acceptance, privacy-notice acknowledgement and legally required consent are distinct, versioned evidence; optional processing defaults off. Tenant-owner export is private/audited and uses an expiring one-time link. Data-subject requests are tracked; legally required fiscal/accounting records are restricted, not immediately deleted.
- Group Telegram reports contain aggregate data only by default; sensitive details may go only to a tenant owner's verified private chat when explicitly enabled. Exact providers, transfer locations and legal bases remain external checks.
- All important sale/debt/cash/return/stock/employee/document changes have an application-level append-only audit trail with actor, tenant, time, reason and relevant change; secrets and unnecessary PII are excluded. Do not claim database-level WORM without proof.
- Internal transfer flows support partial receipt and discrepancy audit. A return does not restore stock until physical receipt at source. ETTYX applicability is a separate external check; internal transfer records are not official waybills.
- Inventory browser-camera scanning is ordinary barcode only (POS, catalog form, stock search/intake); HTTPS/user permission and USB/manual fallbacks are required. It does not claim Data Matrix/mandatory marking validation.
- Production deploy requires verified personal-data flow/region basis, explicit hosts, no fallback credentials, TLS/secure cookies, private storage/minimal IAM, encrypted backup plus restore test, protected admin/API docs, monitoring and incident plan.

---

## 3. TARGET ARCHITECTURE (BEFORE → AFTER)

| Area | Before | After |
|---|---|---|
| Tenancy | `Tenant.owner` OneToOne; `User.tenant` FK; branches inside tenant | `Tenant.owner` FK (many per owner); no `User.tenant`; no branches |
| Active tenant | `request.user.tenant` | `X-Tenant-ID` header verified per request (owner), single active employment (staff) |
| Stock | `Stock` per (branch, variant) | `Stock` one-to-one per variant (per tenant) |
| Inter-shop transfer | `StockTransfer` between branches | Internal transfer between same-seller tenants; separate B2B sale between different sellers |
| B2B returns | partial/buggy | single code path `SaleReturnService.apply_return` |
| Permissions | default AllowAny, cashbox open | default `IsAuthenticated`, every view explicit, new codenames |
| Public receipt | by guessable receipt number | by random `public_token` |
| Shift | time window, UTC | time window per tenant, UTC storage/Asia-Tashkent business time, actual cash refunds/debt receipts included, race-safe; management report only |
| Signatures | browser localStorage | Internal acknowledgement record; official ERI/EHF via verified provider, never implied by canvas signature |

Repository map (relevant paths):
```
ilbi/config/            settings.py, settings_test.py, celery.py, urls.py
ilbi/apps/<app>/        models, services/, tasks.py, tests/
ilbi/api/v1/<app>/      serializers.py, views/, urls.py
ilbi/api/               mixins.py, permissions.py, exceptions.py, pagination.py
frontend/ilbi/src/      api/client.js, context/, pages/, components/
telegram_bot_sms/main.py    aiogram bot
nginx/nginx.conf, docker-compose.yml, scripts/, docs/
```
Apps: `accounts, tenants, permissions, core, catalog, inventory, sales, cashbox, analytics, tg_bot`.

---

## 4. GLOBAL CONVENTIONS (used by many tasks)

### 4.1 Error format
Services raise `<Name>ServiceError(Exception)` with an Uzbek message; views convert to DRF `ValidationError`/`PermissionDenied` via the existing exception handler. Never return `str(exc)` of unknown exceptions to the client.

### 4.2 Decimal & money rounding
```python
from decimal import Decimal, ROUND_HALF_UP
CENT = Decimal("0.01")
def money(value: Decimal) -> Decimal:
    """Round to 2 places, half-up. Use for every stored money amount."""
    return Decimal(value).quantize(CENT, rounding=ROUND_HALF_UP)
```
Put it in `apps/core/utils/money.py` (create `apps/core/utils/__init__.py` if missing). Line total = `money(qty * unit_price)`. Sale total = sum of already-rounded line totals.

### 4.3 Side effects after commit
Telegram/SMTP/Celery `.delay()` must never run inside the DB transaction:
```python
from django.db import transaction
transaction.on_commit(lambda: send_something_task.delay(obj_id))
```
Pass ids, not model instances.

### 4.4 GLOBAL LOCK ORDER (prevents deadlocks)
Whenever several rows are locked in one transaction, lock in exactly this order:
1. `Sale` row (`select_for_update()`)
2. its `SaleItem` rows ordered by `id`
3. `Counterparty` row
4. `Stock` rows ordered by `product_variant_id` ascending
5. Notification/Log inserts (no locks needed)

Batch operations on stock (`batch_intake`, sale creation) must sort variants by id before locking.

### 4.5 Tenant-scoped querying
Every queryset on a tenant-owned model must filter `tenant=self.tenant`. Never trust ids from the client without re-checking tenant ownership (counterparty, variant, category, sale, ...).

### 4.6 Locking helper for per-tenant critical sections
Use PostgreSQL advisory locks for "no row to lock" cases:
```python
# apps/core/utils/locks.py
import zlib
from django.db import connection

def advisory_xact_lock(namespace: int, key: str) -> None:
    """Take a transaction-scoped advisory lock. Must be called inside transaction.atomic."""
    with connection.cursor() as cur:
        cur.execute("SELECT pg_advisory_xact_lock(%s, %s)", [namespace, zlib.crc32(key.encode())])
```
Namespaces: `1001` idempotency, `1002` shift close, `1003` receipt sequence (not needed if using sequence table).

### 4.7 Audit logging
Use the existing audit helper (`apps/core/services/audit_service.py`). Add new `AuditAction` values listed in tasks. **Never put phone numbers or other PII in `description`**; use ids.

### 4.8 Running tests
```bash
cd ilbi
docker compose -f docker-compose.test.yml up -d
uv run pytest -x -q                 # all tests
uv run pytest apps/sales -x -q      # one app
docker compose -f docker-compose.test.yml down -v
```
Tests use `config/settings_test.py` (MD5 hasher, separate Postgres/Redis). Use `factory_boy` factories already in the repo; add new factories next to existing ones.

### 4.9 Migrations
`uv run python manage.py makemigrations <app>` then `migrate`. Check generated files; remove accidental changes. Name migrations descriptively (`--name`).


---
---
# PHASE 0 — SAFETY NET, SECRETS, HYGIENE

Goal: make the repo trustworthy and safe before touching business logic. Tasks in this phase are independent of each other unless noted.

## T0.1 Remove the fake-activity automation
**Why:** `.github/workflows/daily-activity.yml` + `scripts/trigger_activity.sh` create ~12 commits/day that only touch `.github/activity.log` while their messages claim real work (e.g. "verify security signatures", "refactor connection pooling"). This makes the git history misleading.
**Do:**
1. Delete `.github/workflows/daily-activity.yml`, `scripts/trigger_activity.sh`, `.github/activity.log`.
2. In the root `.gitignore`, remove any line that un-ignores `.github/activity.log` (search for `activity`).
3. `grep -rn "activity" .github scripts .gitignore` must return nothing.
4. **Do NOT rewrite git history or force-push.** (HUMAN decision, see Appendix C-1.)
**Acceptance:** no workflow other than the CI of T0.2 remains; `git ls-files | grep -i activity` is empty.

## T0.2 Add a real CI workflow
Create `.github/workflows/ci.yml`:
```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:
jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env: { POSTGRES_DB: ilbi_test, POSTGRES_USER: ilbi_test, POSTGRES_PASSWORD: ilbi_test }
        ports: ["5433:5432"]
        options: >-
          --health-cmd "pg_isready -U ilbi_test" --health-interval 2s --health-timeout 3s --health-retries 15
      redis:
        image: redis:7-alpine
        ports: ["6380:6379"]
    defaults: { run: { working-directory: ilbi } }
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v5
        with: { version: "0.5.x" }          # pin the version used locally
      - run: uv sync --frozen
      - run: uv run ruff check .
      - name: Tests
        run: uv run pytest -q
        env:
          # READ ilbi/config/settings_test.py and map the exact env var names it reads
          # (TEST_DB_* and the Redis URL variables). Set them here to the service ports above.
          DJANGO_SETTINGS_MODULE: config.settings_test
  frontend:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: frontend/ilbi } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm, cache-dependency-path: frontend/ilbi/package-lock.json }
      - run: npm ci
      - run: npm run lint --if-present
      - run: npm run build
```
Also add to `ilbi/pyproject.toml` dev group: `ruff`. Add `[tool.ruff]` with `line-length = 120`, `select = ["E","F","I","B","S"]`, ignore `S101` in tests. Fix only trivial lint errors (unused imports); do not mass-reformat.
**Acceptance:** workflow is green on a PR (if you cannot run GitHub Actions locally, validate YAML syntax and run the same commands locally).

## T0.3 Stop leaking secrets into logs
**(a) Password-reset URL.** In `ilbi/apps/accounts/services/password_reset_service.py` find the email-sending helper that does `logger.warning("EMAIL JO'NATISH ...", ..., reset_url)` and remove the URL (and the email address) from every log call. Replace with:
```python
logger.info("Password reset email queued: user_id=%s purpose=%s", user.id, purpose)
```
**(b) Telegram bot token.** In `ilbi/apps/tg_bot/services.py`, `requests` exceptions embed the full URL (`.../bot<TOKEN>/sendMessage`). Never log `str(e)` or the URL. Target code for the HTTP part of `send_telegram_message`:
```python
def _bot_url(method: str) -> str:
    token = settings.TELEGRAM_BOT_TOKEN
    if not token:
        raise TelegramConfigError("TELEGRAM_BOT_TOKEN is not configured")
    return f"https://api.telegram.org/bot{token}/{method}"   # build lazily, never at import time

try:
    resp = requests.post(_bot_url("sendMessage"), json=payload, timeout=5)
    resp.raise_for_status()
except requests.HTTPError as exc:
    logger.error("Telegram sendMessage failed: chat_id=%s status=%s", chat_id, exc.response.status_code if exc.response is not None else None)
    return False
except requests.RequestException as exc:
    logger.error("Telegram sendMessage network error: chat_id=%s type=%s", chat_id, type(exc).__name__)
    return False
```
Remove the module-level `TELEGRAM_API_URL = f"...{settings.TELEGRAM_BOT_TOKEN}..."` constant.
**(c) SECRET_KEY.** In `config/settings.py`: read `SECRET_KEY` from env; raise `ImproperlyConfigured` if it is missing or starts with `django-insecure`. Add to `settings_test.py` an explicit test key.
**(d) HUMAN ACTIONS (write them into `docs/PLAN_NOTES.md` as a checklist, do not attempt):** rotate `SECRET_KEY` (old `django-insecure-...` key exists in git history), rotate Telegram bot token, rotate MinIO credentials, invalidate all JWTs after rotating the key.
**Tests:** add a test that calls `send_telegram_message` with `requests.post` mocked to raise `HTTPError` whose message contains `"bot123:SECRET"`, then asserts the token string is absent from `caplog.text`.
**Acceptance:** `grep -rn "reset_url" ilbi/apps | grep -i log` is empty; test above passes.

## T0.4 Upgrade vulnerable dependencies
1. `cd ilbi && uv lock --upgrade-package pyjwt --upgrade-package urllib3 && uv sync`. Targets: `pyjwt >= 2.15` (audit flagged 2.13.0), `urllib3 >= 2.8`. Then run `uv run pip-audit` (install with `uv pip install pip-audit` if needed) and fix any remaining *runtime* vulnerabilities by upgrading.
2. `cd frontend/ilbi && npm audit fix` (not `--force`); re-run `npm run build`.
3. Remove unused dependency `django-environ` if `grep -rn "environ" ilbi --include=*.py` shows it is not imported. Move `djangorestframework-stubs` to the dev group.
4. Run the full test suite.
**Acceptance:** `pip-audit` and `npm audit --omit=dev` show no high/critical findings.

## T0.5 Repository hygiene
1. `git rm -r --cached` and delete: `Architectures/.idea`, `Architectures/.obsidian` (if present), every `.directory` file, `frontend/ilbi/dist_docker`. Add them to `.gitignore`.
2. Replace the hundreds of `/staticfiles/...` lines in `ilbi/.gitignore` with the single rule `staticfiles/`.
3. Create root `README.md` (project purpose, stack, how to run dev/test/prod, link to `docs/`), `LICENSE` (put `All rights reserved.` unless the owner says otherwise — Appendix C-2), `ilbi/.env.example` and root `.env.example` listing **every** env var read by `config/settings.py`, `docker-compose*.yml`, `telegram_bot_sms/main.py` with safe dummy values and one-line comments. (`.dockerignore` already references `.env.example`.)
4. Version: single source of truth is `ilbi/pyproject.toml`. In `settings.py` set `SPECTACULAR_SETTINGS["VERSION"]` from `importlib.metadata.version("ilbi")` (use the project name in pyproject). Bump pyproject to match the latest tag `v0.13.1` -> `0.13.1`.
5. In `apps/accounts/services/email_utils.py` (function `mask_email`) replace the real e-mail in the docstring with `john.doe@example.com`.
**Acceptance:** `git status` clean after a fresh clone + `docker compose config` works with `.env.example` copied to `.env`.

## T0.6 Make the stress seeder safe
File `ilbi/apps/catalog/management/commands/seed_stress_products.py`:
- `--tenant-id` becomes **required** (remove default `4`).
- Refuse to run when `settings.DEBUG` is false unless `--i-know-this-is-not-production` is passed.
- Use the tenant's owner as `created_by`; never `User.objects.first()`.
**Acceptance:** running without `--tenant-id` exits with a clear error.

## T0.7 Scope-guard tooling (create BEFORE any other change after Phase 0 starts)
Create `docs/plan_scope.json` and `scripts/plan_scope_check.py` exactly as below, commit them first (`chore(plan): scope guard [T0.7]`).
`docs/plan_scope.json` (globs are matched with Python `fnmatch`; `*` also matches `/`):
```json
{
  "always": [
    "docs/PLAN_NOTES.md", "docs/plan_scope.json", "scripts/plan_scope_check.py",
    "ilbi/apps/*/tests/*", "ilbi/apps/*/migrations/*", "ilbi/tests/*", "ilbi/conftest.py",
    "ilbi/api/*/tests/*"
  ],
  "phase0": [
    ".github/*", "scripts/*", ".gitignore", "ilbi/.gitignore", "README.md", "LICENSE", ".env.example",
    "ilbi/.env.example", "ilbi/pyproject.toml", "ilbi/uv.lock", "ilbi/ruff.toml",
    "frontend/ilbi/package.json", "frontend/ilbi/package-lock.json",
    "ilbi/config/settings.py", "ilbi/config/settings_test.py",
    "ilbi/apps/accounts/services/password_reset_service.py", "ilbi/apps/accounts/services/email_utils.py",
    "ilbi/apps/tg_bot/services.py",
    "ilbi/apps/catalog/management/commands/seed_stress_products.py",
    "Architectures/.idea/*", "Architectures/.obsidian/*", ".directory", "*/.directory",
    "frontend/ilbi/dist_docker/*"
  ],
  "phase1": [
    "ilbi/apps/inventory/*", "ilbi/apps/catalog/*", "ilbi/apps/sales/*", "ilbi/apps/cashbox/*",
    "ilbi/apps/tenants/*", "ilbi/apps/accounts/*", "ilbi/apps/analytics/*",
    "ilbi/api/v1/inventory/*", "ilbi/api/v1/catalog/*", "ilbi/api/v1/sales/*", "ilbi/api/v1/cashbox/*",
    "ilbi/api/v1/tenants/*", "ilbi/api/v1/accounts/*", "ilbi/api/v1/internal/*", "ilbi/api/v1/analytics/*",
    "frontend/ilbi/src/*"
  ],
  "phase2": [
    "ilbi/apps/accounts/*", "ilbi/apps/tenants/*", "ilbi/apps/core/*",
    "ilbi/api/mixins.py", "ilbi/api/permissions.py",
    "ilbi/api/v1/accounts/*", "ilbi/api/v1/tenants/*", "ilbi/api/v1/analytics/*",
    "ilbi/apps/sales/services/b2b_transfer_service.py", "ilbi/api/v1/sales/views/b2b_views.py",
    "ilbi/config/settings.py", "ilbi/api/v1/urls.py", "frontend/ilbi/src/*"
  ],
  "phase3": [
    "ilbi/api/*", "ilbi/apps/permissions/*", "ilbi/apps/accounts/*", "ilbi/apps/core/*",
    "ilbi/config/settings.py", "ilbi/config/urls.py", "frontend/ilbi/src/*"
  ],
  "phase4": [
    "ilbi/apps/sales/*", "ilbi/apps/inventory/services/stock_service.py",
    "ilbi/apps/inventory/models/stock_movement_model.py", "ilbi/apps/inventory/models/__init__.py",
    "ilbi/apps/core/*", "ilbi/apps/tg_bot/services.py", "ilbi/api/*",
    "ilbi/config/settings.py", "ilbi/config/settings_test.py", "ilbi/config/urls.py",
    "frontend/ilbi/src/*"
  ],
  "phase5": [
    "ilbi/apps/cashbox/*", "ilbi/apps/inventory/tasks.py", "ilbi/apps/tenants/models.py",
    "ilbi/apps/analytics/services/analytics_service.py", "ilbi/api/v1/cashbox/*",
    "ilbi/config/settings.py", "ilbi/config/settings_test.py", "ilbi/config/celery.py",
    "ilbi/pyproject.toml", "ilbi/uv.lock", "frontend/ilbi/src/*"
  ],
  "phase6": [
    "ilbi/apps/analytics/*", "ilbi/api/v1/analytics/*", "ilbi/api/v1/urls.py", "frontend/ilbi/src/*"
  ],
  "phase7": [
    "ilbi/apps/accounts/*", "ilbi/apps/tg_bot/*", "ilbi/apps/core/*", "ilbi/api/v1/accounts/*",
    "ilbi/api/v1/tg_bot/*", "ilbi/api/v1/urls.py", "ilbi/config/settings.py", "ilbi/config/settings_test.py",
    "telegram_bot_sms/*", "docker-compose.yml", "ilbi/pyproject.toml", "ilbi/uv.lock", "frontend/ilbi/src/*"
  ],
  "phase8": [
    "ilbi/apps/documents/*", "ilbi/api/v1/documents/*", "ilbi/apps/accounts/models/*",
    "ilbi/api/v1/accounts/*", "ilbi/config/settings.py", "ilbi/config/urls.py", "ilbi/api/v1/urls.py",
    "Architectures/ilbi-yol-xaritasi.md", "frontend/ilbi/src/*"
  ],
  "phase9": [
    "ilbi/config/*", "ilbi/Dockerfile", "ilbi/entrypoint.sh", "ilbi/gunicorn.conf.py", "ilbi/.dockerignore",
    "ilbi/pyproject.toml", "ilbi/uv.lock", "docker-compose*.yml", "ilbi/docker-compose*.yml", "nginx/*",
    "scripts/*", "docs/*", ".github/*", "frontend/ilbi/Dockerfile", "frontend/ilbi/vite.config.js",
    "frontend/ilbi/src/*", "ilbi/apps/*", "ilbi/api/*"
  ]
}
```
`scripts/plan_scope_check.py`:
```python
#!/usr/bin/env python3
"""Scope guard: fail when changed files fall outside docs/plan_scope.json for the given phase.
Usage: python scripts/plan_scope_check.py phase4 [--base origin/main]"""
import fnmatch
import json
import subprocess
import sys
from pathlib import Path


def changed_files(base: str) -> list[str]:
    cmds = [
        ["git", "diff", "--name-only", f"{base}...HEAD"],
        ["git", "diff", "--name-only"],
        ["git", "diff", "--name-only", "--cached"],
        ["git", "ls-files", "--others", "--exclude-standard"],
    ]
    out: set[str] = set()
    for cmd in cmds:
        res = subprocess.run(cmd, capture_output=True, text=True)
        out.update(line.strip() for line in res.stdout.splitlines() if line.strip())
    return sorted(out)


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    phase = sys.argv[1]
    base = sys.argv[sys.argv.index("--base") + 1] if "--base" in sys.argv else "origin/main"
    scope = json.loads(Path("docs/plan_scope.json").read_text(encoding="utf-8"))
    if phase not in scope:
        print(f"Unknown phase key: {phase}")
        return 2
    allowed = scope["always"] + scope[phase]
    bad = [f for f in changed_files(base) if not any(fnmatch.fnmatch(f, g) for g in allowed)]
    if bad:
        print("OUT-OF-SCOPE CHANGES (revert them or justify in docs/PLAN_NOTES.md and extend docs/plan_scope.json):")
        for f in bad:
            print("  -", f)
        return 1
    print(f"scope OK for {phase}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```
**Acceptance:** running the script on a clean branch prints `scope OK`; touching `nginx/nginx.conf` while on `phase4` makes it exit 1.

---
---
# PHASE 1 — REMOVE BRANCH RECORDS (one physical shop = one tenant)

Goal: delete the `Branch` record and branch-scoped inventory. Each physical shop is its own tenant with **one stock row per variant per tenant**. Do not remove all transfer capability: branch-local transfers are replaced by a separate same-seller inter-tenant transfer flow in T1.10. B2B sale remains a distinct flow. (D-01)
Dependencies: Phase 0 not required but recommended first. **Do tasks T1.1 → T1.9 in order.** The frontend is temporarily single-tenant until Phase 2 adds the tenant switcher.

Data: no data migration. Run `docker compose down -v` for dev DB and regenerate migrations as needed.

## T1.1 Inventory models
Files: `apps/inventory/models/stock_model.py`, `stock_movement_model.py`, `transfer_model.py`, `models/__init__.py`.
1. **Stock** — target:
```python
class Stock(BaseModel):
    product_variant = models.OneToOneField(
        "catalog.ProductVariant", on_delete=models.CASCADE, related_name="stock"
    )
    quantity = models.DecimalField(max_digits=14, decimal_places=3, default=Decimal("0"))
    last_cost_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    class Meta:
        constraints = [
            models.CheckConstraint(condition=models.Q(quantity__gte=0), name="stock_quantity_never_negative"),
        ]
```
   - Remove `branch`, `custom_price_recommended`, `custom_price_min`, `custom_price_partner`, the three `effective_price_*` properties and the old `unique_stock_per_branch_variant` constraint.
   - Fix `__str__` to `f"{self.product_variant} -- {self.quantity}"`.
2. **StockMovement** — remove fields `branch` and `transfer`. Remove types `TYPE_TRANSFER_OUT`, `TYPE_TRANSFER_IN` and their choices. Add:
```python
TYPE_SALE_RESTORE = "sotuv_qaytarildi"   # goods put back exactly as before (void / B2B reject / B2B expire)
# in TYPE_CHOICES:
(TYPE_SALE_RESTORE, "Sotuv bekor qilindi (qaytarildi)"),
```
3. Remove the old branch-linked `StockTransfer` implementation. Do not discard transfer history without recording its disposition. T1.10 defines the replacement tenant-to-tenant internal transfer aggregate; its model must reference source/destination tenants, not branches, and must not create a Sale or debt.
4. `uv run python manage.py makemigrations inventory --name remove_branches_one_stock_per_variant`. If Django cannot convert FK→OneToOne on existing rows, reset the dev DB.
**Acceptance:** `makemigrations --check` is clean; `grep -n "branch" apps/inventory/models/*.py` is empty.

## T1.2 StockService (no branch)
File `apps/inventory/services/stock_service.py`. Read the whole file first.
1. Remove the `branch=None` parameter from: `_get_or_create_locked_stock`, `_apply_movement`, `intake`, `batch_intake`, `customer_return`, `supplier_return`, `write_off`, `adjust`.
2. Rename `_apply_movement` → `apply_movement` (public; it is called from other services) and update every caller (`grep -rn "_apply_movement" ilbi`).
3. Target for the lock helper:
```python
@staticmethod
def _get_or_create_locked_stock(tenant, product_variant):
    """Return the variant's Stock row locked FOR UPDATE, creating a zero row if missing."""
    Stock.objects.get_or_create(
        tenant=tenant, product_variant=product_variant, defaults={"quantity": Decimal("0")}
    )
    return Stock.objects.select_for_update().get(tenant=tenant, product_variant=product_variant)
```
4. In `batch_intake`, **sort the lines by `product_variant_id` before looping** (deadlock prevention, §4.4).
5. Delete `apps/inventory/services/transfer_service.py`.
**Tests (update + add):** intake creates stock; out-movement below zero raises `StockServiceError`; two threads doing `intake` on the same variant end with the correct sum (use `transaction=True` test + `ThreadPoolExecutor`).
**Acceptance:** no `branch` in `apps/inventory/services`.

## T1.3 Inventory API (views, serializers, urls)
Files: `api/v1/inventory/views/{stock_views,movement_views,transfer_views}.py`, `serializers.py`, `urls.py`.
1. Remove old branch-local `transfer_views.py` behavior and routes. T1.10 adds/replaces these with tenant-to-tenant internal transfer endpoints; do not leave the Inventory UI with no transfer path.
2. In stock/movement views and serializers remove every `branch`/`branch_id` query param, field and filter (stock list becomes: all stock rows of `self.tenant`).
3. Stock list/detail output fields: `id, product_variant, quantity, last_cost_price (only with catalog.view_cost_price, see T3.6), updated_at`. Remove `custom_price_*`.
4. The old "set branch price" endpoint (custom prices) is removed. Price changes go through the product/variant update endpoints (permission `catalog.change_prices`, added in Phase 3).
**Acceptance:** `grep -rn "branch" api/v1/inventory` is empty; OpenAPI schema generation works (`uv run python manage.py spectacular --file /tmp/schema.yml`).

## T1.4 Catalog (variant stock access, views, seeds)
Files: `apps/catalog/models/product_variant_model.py`, `api/v1/catalog/views/product_views.py`, `api/v1/catalog/serializers.py`, `apps/catalog/management/commands/seed_*.py`.
1. In `ProductVariant` **delete the `stock` property** (the reverse `OneToOne` accessor `variant.stock` now exists natively; when no row exists it raises `RelatedObjectDoesNotExist`, a subclass of `AttributeError`, so use `getattr(variant, "stock", None)`).
2. In `product_views.py` (≈30 branch references): remove branch parsing, the "strict branch isolation" logic, `Stock.objects.all()` prefetch, `request.user.employments...` lookups. Querysets use `.select_related("stock")`. The `in_stock` filter is `stock__quantity__gt=0` (no join duplication, so no `.distinct()` needed).
3. In `serializers.py`: delete `_get_branch_stock`, `_cached_branch_stock`; `stock_quantity` = `obj.stock.quantity if getattr(obj, "stock", None) else Decimal("0")` (the view must `select_related("stock")` to avoid N+1).
4. Seeds: remove branch usage; stock rows are created through `StockService.intake`.
**Acceptance:** product list for a tenant with 1000 variants executes a constant (small) number of SQL queries (assert with `django_assert_max_num_queries`).

## T1.5 Sales (models, services, views, serializers)
Files: `apps/sales/models/sale_model.py`, `services/sale_service.py`, `services/void_service.py`, `services/b2b_transfer_service.py`, `api/v1/sales/views/sale_views.py`, `api/v1/sales/serializers.py`, `api/v1/internal/shop/*`.
1. `Sale`: remove field `branch`.
2. `SaleService.create_sale`: remove `branch` argument and the employee-branch resolution. Load variants once: `ProductVariant.objects.select_related("stock", "product__category").filter(tenant=tenant, id__in=ids)`. Use `variant.price_*` (the per-branch `effective_price_*` no longer exist). Stock is `variant.stock` (locked via `StockService`, §4.4).
3. Views: delete every `branch_id` param/branch default logic in `SaleListCreateView` and others. List filters keep: `status, payment_type, counterparty_id, date_from, date_to, search` (validation is added in T3.9).
4. Serializers: remove `branch`, `branch_name`, `branch_address`, `branch_phone`. Receipt header data now comes from the tenant: `tenant.name`, `tenant.address` (added in T1.6), `tenant.receipt_phone`.
5. Internal shop API (`api/v1/internal/shop`): `stock_quantity` must be `variant.stock.quantity` (single stock row); remove branch references; the products endpoint no longer needs `.distinct()`.
6. Update `void_service.py` / `b2b_transfer_service.py` only to remove `branch` arguments passed to `StockService`. (Their logic is rewritten in Phase 4.)
7. The internal shop API may read a tenant's catalog/stock only. Remove its order-deduct route: ILBI is SaaS and must not accept online orders, create ordinary customer profiles or turn an external checkout into a sale. Any future delivery-status link is a separate feature that needs an explicit owner decision and privacy review.
**Acceptance:** `grep -rn "branch" apps/sales api/v1/sales api/v1/internal` is empty; sale-creation tests pass.

## T1.6 Accounts & Tenants (Branch model removal)
Files: `apps/tenants/{models.py,signals.py,services.py,apps.py}`, `api/v1/tenants/{views.py,serializers.py,urls.py}`, `apps/accounts/models/employee_model.py`, `apps/accounts/services/employee_service.py`, `api/v1/accounts/{serializers.py,views/employee_views.py}`.
1. Delete the `Branch` model and `Tenant.get_main_branch()`.
2. Add to `Tenant`: `address = models.CharField(max_length=255, blank=True, default="")`.
3. Delete the post-save signal that creates a default branch (`tenants/signals.py`); if the file becomes empty delete it and remove the import from `apps.py`.
4. Remove all Branch CRUD views/serializers/URLs from `api/v1/tenants`.
5. `Employee`: remove field `branch`. `EmployeeHireSerializer`: remove `branch_id`. `EmployeeService.hire(...)`: remove `branch` argument and its lookup (this also removes the bug "unknown branch_id silently becomes 'all branches'").
6. `makemigrations tenants accounts`.
**Acceptance:** `grep -rniE "branch|filial" ilbi --include=*.py | grep -v "/migrations/"` prints nothing except possibly test-comments that you must also clean.

## T1.7 Cashbox (minimal branch removal; full rewrite in Phase 5)
Files: `apps/cashbox/models.py`, `services/cashbox_service.py`, `api/v1/cashbox/{views/cashbox_views.py,serializers.py}`.
1. Remove `branch` from `DailyCashReport`, `CashExpense`, `CashIncome`.
2. `CashboxService.get_current_shift_status(tenant)` and `close_shift(...)`: remove `branch` parameter and every `branch=` filter.
3. In views delete `get_branch(...)` helper and all branch params.
**Acceptance:** cashbox tests pass; no `branch` left in `apps/cashbox` and `api/v1/cashbox`.

## T1.8 Frontend branch removal
Files (all under `frontend/ilbi/src/`): delete `context/BranchContext.jsx`, `pages/Branches.jsx`; edit `api/client.js`, `pages/Inventory.jsx`, `components/layout/{Header,Layout,Sidebar}.jsx`, `App.jsx`, `pages/Shifts.jsx`, `components/inventory/StockPriceModal.jsx` (delete it and its trigger; price editing is done in the product/variant form), `components/common/ReceiptSlip.jsx`, `pages/POS.jsx`, `pages/PublicReceiptView.jsx`, `pages/Tenants.jsx`, `pages/Dashboard.jsx`.
Steps: remove `BranchProvider`/`useBranch` and branch query params/`X-Branch`; remove the "Branches" route/menu item; in the receipt use tenant name/address/phone. Keep a tenant switcher. Do not remove cross-tenant internal-transfer functionality; T1.10 defines its new UX and API. “Filial” may remain in user copy where it means physical shop, but stock and permissions are tenant-scoped.
**Acceptance:** `npm run build` succeeds; no frontend data/query path relies on a Branch ID; inter-tenant transfer entry point routes only through T1.10 permissions.

## T1.9 Tests, seeds, final sweep
1. Update tests that reference branch-scoped stock and employee branches; replace branch-local transfer tests with T1.10 same-seller tenant-transfer tests. Do not delete transfer invariants.
2. Search branch references and remove only obsolete Branch-model code. Tenant-to-tenant `StockTransfer` references are expected; review each result rather than mass-delete.
3. Full test run + `uv run python manage.py check` + `makemigrations --check`.
**Acceptance:** no runtime `Branch` model/scope remains; new tenant-transfer model/service/API/UI and tests pass.

## T1.10 Internal stock transfers between tenantized branches
Dependencies: T1.1–T1.9 and T2.1–T2.7 (tenant ownership/context); run after tenant context is available.
1. Add a distinct internal-transfer model with source/destination tenant, status, creator/owner path, per-line sent/received quantity, discrepancy/reason, timestamps and append-only audit links. Both tenants must belong to the same owner and exact same active, non-expired, operator-approved seller profile; different profiles use B2B sale.
2. Staff flow: confirmation modal is informational; confirming atomically deducts dispatched quantity from source and creates `pending`. Receiver enters actual received quantities. If destination lacks a matching product/variant, receiver chooses its local category and ILBI creates a tenant-local catalog copy; it never shares the source catalog row. Full match becomes `delivered`, mismatch becomes `discrepancy`. Do not restore source stock automatically.
3. Owner flow between own tenants: one confirmation, atomic source deduction plus destination receipt, final `delivered_owner`; never require second-side acceptance. Prevent a user from claiming owner flow without owner authority for both tenants.
4. A physical return is a separate linked return-transfer; source stock is restored only when physically received. The source owner closes loss/damage/quantity discrepancies with a reason and audited resolution; never edit or erase movement history.
5. Take locks in deterministic `(tenant_id, product_variant_id)` order, use idempotency keys, validate tenant/product ownership and permission on every endpoint; this transfer creates neither Sale nor debt and is not an official ETTYX document.
6. Add concurrency/invariant tests for source deduction, partial accept, discrepancy, category mapping, return, duplicate requests, owner shortcut and cross-profile rejection. Review official ETTYX requirements with accountant/provider before real transport launch.
**Acceptance:** source/destination quantities conserve exactly for accepted/returned items; unresolved discrepancy remains visible and never silently reappears as source stock.


---
---
# PHASE 2 — OWNER WITH MANY TENANTS, TENANT CONTEXT

Goal (D-02..D-05): one owner can own many tenants; staff belong to exactly one; the active tenant of a request is resolved by one central function and verified against the DB every time.
Dependencies: Phase 1 complete.

## T2.1 Data model
**Files:** `apps/tenants/models.py`, `apps/accounts/models/employee_model.py`, `apps/accounts/models/user_model.py`.
1. `Tenant.owner` → `ForeignKey(User, on_delete=models.PROTECT, related_name="owned_tenants")` (was OneToOne/CASCADE; PROTECT prevents deleting a user from wiping a whole tenant).
2. `Tenant.name`: replace `unique=True` with a case-insensitive unique constraint:
```python
from django.db.models.functions import Lower
class Meta:
    constraints = [models.UniqueConstraint(Lower("name"), name="unique_tenant_name_ci")]
```
3. `Tenant.public_code` — short code used for B2B linking (T4.5):
```python
import secrets
public_code = models.CharField(max_length=12, unique=True, editable=False)

def save(self, *args, **kwargs):
    if not self.public_code:
        for _ in range(10):
            code = secrets.token_hex(4).upper()          # 8 hex chars, e.g. "9F3A1C7B"
            if not Tenant.objects.filter(public_code=code).exists():
                self.public_code = code
                break
        else:
            raise RuntimeError("Could not generate a unique tenant code")
    super().save(*args, **kwargs)
```
4. `Employee`: add `is_owner = models.BooleanField(default=False)` and replace the constraints:
```python
class Meta:
    constraints = [
        # A non-owner user has at most ONE active employment in the whole system.
        models.UniqueConstraint(
            fields=["user"],
            condition=models.Q(is_active=True, is_owner=False),
            name="unique_active_staff_employment_per_user",
        ),
        # An owner has at most one active owner-row per tenant.
        models.UniqueConstraint(
            fields=["user", "tenant"],
            condition=models.Q(is_active=True),
            name="unique_active_employment_per_user_tenant",
        ),
    ]
```
5. **Delete `User.tenant`** (field, its index `['tenant','role']`, serializers fields that expose it). Everything that needs the tenant of a user uses T2.2.
6. Generate migrations (`tenants`, `accounts`). `Tenant.public_code` has no default for existing rows: since the DB is disposable, reset the dev DB.
**Acceptance:** `makemigrations --check` clean; `grep -rn "user.tenant\b\|\.tenant_id" ilbi --include=*.py | grep -v "/migrations/\|/tests/"` — review every remaining hit; those that refer to a *User's* tenant must be gone after T2.2/T2.4.

## T2.2 Tenant context resolution (central)
**Create** `apps/accounts/services/tenant_context_service.py`:
```python
from dataclasses import dataclass
from rest_framework.exceptions import PermissionDenied, ValidationError
from apps.accounts.models import Employee
from apps.tenants.models import Tenant

TENANT_HEADER = "HTTP_X_TENANT_ID"          # request.META key for "X-Tenant-ID"

@dataclass(frozen=True)
class ActiveContext:
    tenant: Tenant | None
    employee: Employee | None               # the ACTIVE employment row in `tenant`


def _parse_header(raw):
    if raw in (None, ""):
        return None
    try:
        value = int(raw)
    except (TypeError, ValueError):
        raise ValidationError({"detail": "X-Tenant-ID noto'g'ri formatda."})
    if value <= 0:
        raise ValidationError({"detail": "X-Tenant-ID noto'g'ri formatda."})
    return value


def resolve_active_context(user, raw_header) -> ActiveContext:
    """Resolve (tenant, employee) for a request. Always hits the DB; never trusts JWT claims.

    - anonymous / platform_admin -> (None, None). platform_admin is scoped via URL tenant_id only.
    - owner  -> needs a tenant: header X-Tenant-ID, or the only owned tenant if exactly one.
                The header must name a tenant the user OWNS and holds an active owner-employment in.
    - staff  -> the tenant of their single active employment. A mismatching header is rejected.
    """
    if user is None or not getattr(user, "is_authenticated", False):
        return ActiveContext(None, None)
    if user.role == "platform_admin":
        return ActiveContext(None, None)

    header_id = _parse_header(raw_header)

    if user.role == "owner":
        qs = Employee.objects.select_related("tenant").filter(
            user=user, is_active=True, is_owner=True, tenant__owner=user,
        )
        if header_id is not None:
            emp = qs.filter(tenant_id=header_id).first()
            if emp is None:
                # Same message for "no such tenant" and "not yours": do not reveal existence.
                raise PermissionDenied("Bu do'konga kirish huquqingiz yo'q.")
        else:
            rows = list(qs[:2])
            if len(rows) == 0:
                return ActiveContext(None, None)
            if len(rows) > 1:
                raise ValidationError({"detail": "Do'konni tanlang (X-Tenant-ID sarlavhasi majburiy)."})
            emp = rows[0]
    elif user.role == "staff":
        emp = Employee.objects.select_related("tenant").filter(
            user=user, is_active=True, is_owner=False
        ).first()
        if emp is None:
            return ActiveContext(None, None)
        if header_id is not None and header_id != emp.tenant_id:
            raise PermissionDenied("Bu do'konga kirish huquqingiz yo'q.")
    else:
        return ActiveContext(None, None)

    if not emp.tenant.is_active:
        raise PermissionDenied("Bu do'kon faol emas.")
    return ActiveContext(emp.tenant, emp)
```
**Edit `api/mixins.py` → `TenantContextMixin`:** resolve the context **before permission classes run**, because permissions now depend on the tenant:
```python
class TenantContextMixin:
    tenant_url_kwarg = "tenant_id"
    tenant = None
    employee = None

    def check_permissions(self, request):
        # DRF calls perform_authentication() before check_permissions(), so request.user is set.
        ctx = resolve_active_context(request.user, request.META.get(TENANT_HEADER))
        self.tenant, self.employee = ctx.tenant, ctx.employee
        request.tenant, request.employee = ctx.tenant, ctx.employee
        super().check_permissions(request)

    def resolve_tenant_from_url(self, request, tenant_id=None):
        ...  # keep, but the owner branch must be: tenant.owner_id == user.id (unchanged logic)
```
Remove the old `initial()` override and `_resolve_tenant_from_user` (they used `user.tenant`). Keep `_ensure_tenant_active`. `OwnerStaffOnlyAPIView.initial` keeps its "tenant is None → 403" check (it runs after permissions; with default `IsAuthenticated` an anonymous caller now gets 401 first).
**Edit `PermissionService.has_permission(user, codename, tenant=None, employee=None)`:**
```python
if user.role == "platform_admin":
    return True
if user.role not in ("owner", "staff"):
    return False
if employee is None:
    if tenant is None:
        return False
    employee = Employee.objects.filter(user=user, tenant=tenant, is_active=True).first()
if employee is None or not employee.is_active:
    return False
if employee.is_owner:
    return True
# staff: permission must be assigned on THIS active employment
return employee.permissions.filter(category=category, codename=short_codename).exists()
```
(keep the existing codename-format validation at the top, unconditional).
**Edit `HasEmployeePermission.has_permission`:** pass `tenant=getattr(request, "tenant", None), employee=getattr(request, "employee", None)`.
**Edit `IsTenantMember`/`IsTenantOwnerOrPlatformAdmin`:** object-level checks compare the object's `tenant_id` with `request.tenant.id` (not with `user.tenant_id`).
**Fix all former `user.tenant` call sites** found by grep: `api/v1/analytics/views/dashboard_views.py` (use `self.tenant`), `apps/sales/services/b2b_transfer_service.py` (`accepting_user.tenant` → the view passes the acting `tenant` into the service; the service compares `sale.b2b_target_tenant_id == tenant.id`), `apps/accounts/services/password_reset_service.py` (derive the tenant name from the user's active `Employee`), `apps/accounts/services/employee_service.py`.
**JWT:** in `issue_tokens` (`api/v1/accounts/views/misc.py`) stop adding `tenant_id` and `terms_accepted` claims; keep `role` and `token_version`. Check the frontend for code decoding these claims (`grep -rn "tenant_id\|jwt" frontend/ilbi/src`) and switch it to the `/auth/me/` response (T2.5).
**Tests (new, `apps/accounts/tests/test_tenant_context.py`):**
- owner with 2 tenants, no header → 400; header of tenant he owns → ok; header of someone else's tenant → 403 (same message as non-existent id).
- owner with 1 tenant, no header → that tenant.
- staff with header of another tenant → 403; staff without header → own tenant.
- fired staff (inactive employment) → context `(None, None)`; any tenant-scoped view → 403.
- replaced owner (Employee deactivated, `Tenant.owner` changed) cannot access the tenant even with the header.
- deactivated tenant → 403 for everybody except platform_admin.
**Acceptance:** all tests pass; no `user.tenant` left.

## T2.3 Membership policy (D-02 as code)
**Create** `apps/accounts/services/membership_policy.py`:
```python
from apps.accounts.models import Employee

class MembershipPolicyError(Exception):
    pass

def assert_can_be_hired_as_staff(user):
    """Only non-owner users may be staff, and only if they have no active employment elsewhere."""
    if user.role == "owner":
        raise MembershipPolicyError("Do'kon egasi boshqa do'konga xodim bo'la olmaydi.")
    if user.role == "platform_admin":
        raise MembershipPolicyError("Bu foydalanuvchini xodim qilib bo'lmaydi.")
    if Employee.objects.filter(user=user, is_active=True).exists():
        raise MembershipPolicyError("Bu foydalanuvchi boshqa joyda faol ishlayapti.")

def assert_can_own_tenants(user):
    """Only role=owner users can own tenants. A staff member can never become an owner."""
    if user.role != "owner":
        raise MembershipPolicyError("Faqat 'owner' rolidagi foydalanuvchi do'kon egasi bo'la oladi.")
```
Note: the error text for blocked hire must not mention `platform_admin` (kept decision) — keep the generic wording above, and do not reveal in which tenant the user works.
**Tests:** every branch above.

## T2.4 Services: hire / fire / create_with_owner / change_owner / owner-creates-tenant
**Files:** `apps/accounts/services/employee_service.py`, `apps/tenants/services.py`.

**(a) `EmployeeService.hire`** — replace `User.objects.get_or_create(...)` with:
```python
from apps.accounts.services.phone_utils import normalize_phone_number

phone = normalize_phone_number(phone_number)          # raise EmployeeServiceError("Telefon raqam noto'g'ri") if invalid
user = User.objects.filter(phone_number=phone).first()
if user is None:
    # create_user() normalizes the phone and sets an UNUSABLE password
    user = User.objects.create_user(phone_number=phone, role="staff", password=None)
    created = True
else:
    created = False
assert_can_be_hired_as_staff(user)                    # translate MembershipPolicyError -> EmployeeServiceError
# FROZEN: the CURRENT code lets `platform_admin` override the 'already active elsewhere' block. Read hire() first and keep that
# override branch exactly as it is (only add the owner-role guard of assert_can_be_hired_as_staff to the NON-override path).
```
- Wrap the `Employee.objects.create(...)` in `try/except IntegrityError` → `EmployeeServiceError("Bu foydalanuvchi boshqa joyda faol ishlayapti.")` (parallel hires hit the partial unique constraint; the old `select_for_update` on a non-existing row did not lock anything).
- Accept `email` from the serializer (add optional `email` to `EmployeeHireSerializer`, lowercase it). If the user has no email set, store it (uniqueness is enforced by T7.5).
- After commit, if the user has no usable password and has an email: `transaction.on_commit(lambda: PasswordResetService.request_password_reset_for_user(user.id, purpose="new_employee"))`. (**Bug being fixed:** previously users were created with `password=''`, for which Django's `has_usable_password()` returns **True**, and the view never passed the e-mail, so invitations were never sent.) Add `request_password_reset_for_user(user_id, purpose)` to `password_reset_service.py`: it loads the user by id (no e-mail lookup ambiguity) and reuses the existing token/e-mail code.
- Never mention a different tenant/other employment details in error text.
- Audit: `AuditAction.EMPLOYEE_HIRE`, `target_id=employee.id`, **no phone number in description**.

**(b) `EmployeeService.fire`** — keeps: Employee deactivated, `fired_at`, `fired_by`, `User.set_unusable_password()`. Changes:
- Increment `token_version` atomically: `User.objects.filter(pk=user.pk).update(token_version=F("token_version") + 1, password=<unusable>)` (do not `save()` a stale instance).
- Refuse to fire a user who is `is_owner=True` in any tenant (owners are replaced via `change_owner`).
- No more `user.tenant` handling.

**(c) `TenantService.create_with_owner`** (platform_admin creates a tenant for a NEW or EXISTING owner):
```python
phone = normalize_phone_number(owner_phone_number)
owner = User.objects.filter(phone_number=phone).first()
if owner is None:
    owner = User.objects.create_user(phone_number=phone, role="owner", password=None)
else:
    assert_can_own_tenants(owner)                      # existing staff can't become owner
tenant = Tenant.objects.create(name=name, owner=owner, ...)
Employee.objects.create(user=owner, tenant=tenant, is_owner=True, position="Owner", hired_by=created_by)
AuditLog (action=OWNER_TRANSFER or new TENANT_CREATE), no PII
transaction.on_commit(lambda: send invitation e-mail if owner has e-mail and no usable password)
```
Add `AuditAction.TENANT_CREATE = "tenant_create"` and `TENANT_UPDATE`, `TENANT_DEACTIVATE` in `apps/core/models.py` (+ migration for the choices) and write audit rows in tenant create/update/deactivate.
- Owner without e-mail AND without password has no way to set a password → make `owner_email` **required** in the platform_admin tenant-creation serializer when the owner is newly created.

**(d) `TenantService.change_owner`** (platform_admin only) — must NOT destroy the old owner's account globally any more:
```python
@staticmethod
@transaction.atomic
def change_owner(*, tenant, new_owner_phone, new_owner_email=None, changed_by):
    tenant = Tenant.objects.select_for_update().get(pk=tenant.pk)
    old_owner = tenant.owner
    phone = normalize_phone_number(new_owner_phone)
    new_owner = User.objects.filter(phone_number=phone).first()
    if new_owner is None:
        new_owner = User.objects.create_user(phone_number=phone, role="owner", password=None)
    else:
        assert_can_own_tenants(new_owner)
    if new_owner.pk == old_owner.pk:
        raise TenantServiceError("Yangi ega eski ega bilan bir xil.")
    now = timezone.now()
    Employee.objects.filter(user=old_owner, tenant=tenant, is_active=True, is_owner=True).update(
        is_active=False, fired_at=now, fired_by=changed_by)
    tenant.owner = new_owner
    tenant.save(update_fields=["owner"])
    Employee.objects.create(user=new_owner, tenant=tenant, is_owner=True, position="Owner", hired_by=changed_by)
    # Only if the old owner has NO other tenant left: revoke his credentials.
    if not Tenant.objects.filter(owner=old_owner).exists():
        User.objects.filter(pk=old_owner.pk).update(token_version=F("token_version") + 1)
        old_owner.set_unusable_password(); old_owner.save(update_fields=["password"])
    AuditLog OWNER_TRANSFER (ids only)
    on_commit: invite e-mail to new owner if needed
```
**(e) NEW `TenantService.create_for_existing_owner(owner, name, description="", address="", copy_settings_from=None)`** (D-04):
```python
MAX = getattr(settings, "MAX_TENANTS_PER_OWNER", 10)

@staticmethod
@transaction.atomic
def create_for_existing_owner(*, owner, name, description="", address="", copy_settings_from=None):
    assert_can_own_tenants(owner)
    if not Employee.objects.filter(user=owner, is_owner=True, is_active=True, tenant__owner=owner).exists():
        raise TenantServiceError("Sizda faol do'kon yo'q.")        # a fired/replaced owner cannot self-create tenants
    if Tenant.objects.filter(owner=owner).count() >= MAX:
        raise TenantServiceError("Do'konlar soni chegarasiga yetdingiz.")
    if Tenant.objects.filter(name__iexact=name.strip()).exists():
        raise TenantServiceError("Bunday nomli do'kon allaqachon mavjud.")
    tenant = Tenant(name=name.strip(), owner=owner, description=description, address=address)
    if copy_settings_from is not None:                      # must be a tenant owned by the SAME owner
        src = Tenant.objects.get(pk=copy_settings_from, owner=owner)
        for f in COPYABLE_SETTINGS:                         # usd_rate, report/notification/receipt settings; NOT name/owner/address
            setattr(tenant, f, getattr(src, f))
    tenant.save()
    Employee.objects.create(user=owner, tenant=tenant, is_owner=True, position="Owner", hired_by=owner)
    AuditLog(TENANT_CREATE, actor=owner, tenant=tenant)
    return tenant
```
`COPYABLE_SETTINGS` = `usd_rate, daily_report_time, daily_report_target, shift_report_target, telegram_group_id, notify_web_reports, notify_on_sale, notify_on_debt, low_stock_report_target, low_stock_report_time, low_stock_frequency, low_stock_weekday, low_stock_day_of_month, notify_web_low_stock, receipt_header, receipt_footer, receipt_phone`.
**Tests:** hire creates unusable-password user and schedules the invite; staff can't be owner; two parallel hires → one `EmployeeServiceError`, no 500; `change_owner` keeps the old owner's other tenants usable; `create_for_existing_owner` respects MAX and rejects `copy_settings_from` of another owner's tenant.

## T2.5 Endpoints
**Files:** `api/v1/tenants/{views.py,serializers.py,urls.py}`, `api/v1/accounts/views/profile_views.py`.
1. `GET /api/v1/tenants/my/` — permission: class `IsActiveOwner` = authenticated, `role == "owner"` **and** at least one ACTIVE owner-`Employee` row (`Employee.objects.filter(user=user, is_owner=True, is_active=True, tenant__owner=user).exists()`). A replaced/fired owner whose role string is still `owner` must NOT pass (single source of truth = active employment). This endpoint is before a tenant is chosen, so it cannot use the tenant-based classes. Returns the owner's active tenants: `[{id, name, public_code, address, is_active}]`.
2. `POST /api/v1/tenants/my/` — same permission + **throttle** `5/day` per user (`ScopedRateThrottle`, scope `tenant_create`, add to `DEFAULT_THROTTLE_RATES`). Body: `{name, description?, address?, copy_settings_from?}`. **No phone, no e-mail, no owner field** (serializer must not declare them). Calls `TenantService.create_for_existing_owner(owner=request.user, ...)`. Returns the new tenant.
3. `GET /api/v1/auth/me/` (existing profile endpoint): add `tenants` (same list as above; for staff exactly one item) and `permissions` (list of `"category.codename"` strings of the active employment, or `["*"]` for owner/platform_admin) so the frontend can hide UI. For owners with several tenants, permissions are tenant-independent (`["*"]`).
4. OpenAPI: add `@extend_schema` descriptions.
**Tests:** non-owner gets 403 on POST; owner can't pass `owner` in the body (field ignored/400); throttle returns 429 after 5 calls.

## T2.6 Frontend: tenant switcher (replaces branches)
**Files:** `src/context/TenantContext.jsx` (new), `src/api/client.js`, `src/components/layout/Header.jsx`, `Layout.jsx`, `Sidebar.jsx`, `App.jsx`, `src/pages/MyTenants.jsx` (new, replaces the deleted `Branches.jsx`).
1. `TenantContext`: loads `/auth/me/`; keeps `tenants`, `activeTenantId` (persisted in `localStorage` under `ilbi_active_tenant:<userId>`); `switchTenant(id)`.
2. `client.js`: add `X-Tenant-ID: <activeTenantId>` to every request (skip for `/auth/*` and `/tenants/my/`). **Two browser tabs must be able to work on two tenants:** read the active tenant from `sessionStorage` first (per tab), falling back to `localStorage` for new tabs.
3. `Header.jsx`: dropdown "Do'konni almashtirish" showing the current tenant name prominently (also in the page title). On switch: clear the POS cart, clear every draft/filter stored under `ilbi_*` keys, reload server data.
4. **All localStorage/sessionStorage keys that hold drafts or filters must include the tenant id** (e.g. `ilbi_stock_intake_full_draft_v1:<tenantId>`). `grep -rn "localStorage\|sessionStorage" frontend/ilbi/src` and fix every key except tokens.
5. `MyTenants.jsx`: list of owned tenants + "Yangi do'kon qo'shish" form (name, optional address, optional "sozlamalarni nusxalash" select). Calls `POST /tenants/my/`. Visible only for role `owner`.
6. Staff: no switcher is shown (single tenant).
7. On logout: remove **all** keys starting with `ilbi_` (see T7.9 for the full logout flow).
**Acceptance:** an owner with 2 tenants can open both in two tabs and make a sale in each without cross-contamination (manual test + a Playwright/RTL test if the repo has a frontend test setup; otherwise document manual steps in `docs/`).

## T2.7 Phase 2 test sweep
Run all suites; update factories (`UserFactory` no `tenant`, `EmployeeFactory(is_owner=...)`, `TenantFactory(owner=...)`). Add the policy tests of T2.3 and context tests of T2.2.

## T2.8 Seller profiles and tenant binding
1. One owner can create multiple legal-seller profiles (`YTT`, `MChJ`, or other); each tenant is bound to at most one profile. Profile ownership must match tenant ownership. Profile identifiers are write-only in the API and masked in owner output.
2. Profile lifecycle is `pending → approved/rejected/expired`, reviewed by a platform operator with actor/time/reason/expiry audit. Editing material legal data returns an approved profile to `pending`. Approval requires an expiry date; rejection requires a reason.
3. Inventory/catalog remain usable without an approved profile. Retail POS stays blocked until the separate T4 seller/fiscal gate is implemented and externally approved. Internal transfer is limited to tenants linked to the same approved, non-expired profile.
4. Store only legally necessary identifiers and evidence. Before production, decide field/document encryption, private storage, role scopes, retention/deletion, and verify the legal basis with counsel; current seller-profile CRUD does not itself prove a seller is legally authorized.
5. Add APIs/UI for profile submission, owner profile listing, tenant binding, operator review, and tests for multiple profiles, cross-owner access, masking, review audit/expiry and tenant binding.
**Acceptance:** a single owner may maintain distinct seller profiles; no tenant can bind another owner’s profile; no internal transfer crosses profiles; pending/rejected/expired profile never opens the eventual POS gate.


---
---
# PHASE 3 — AUTHORIZATION: DENY BY DEFAULT, PERMISSIONS, COST VISIBILITY

Goal (D-06, D-07, D-08): no endpoint can be reachable by accident; cashbox/analytics/audit/settings get real permissions; staff see cost price only with `catalog.view_cost_price`.
Dependencies: Phase 2 (`request.tenant`, `request.employee`, tenant-aware `PermissionService`).

## T3.1 Deny-by-default + a test that keeps it that way
1. `config/settings.py` → `REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"] = ["rest_framework.permissions.IsAuthenticated"]`.
2. Every **public** view must declare `permission_classes = [AllowAny]` explicitly (and `authentication_classes = []` where no JWT is wanted): token refresh (wrap SimpleJWT's view in your own subclass under `api/v1/accounts/views/`), admin-login (both steps), password-reset (request/verify/confirm), `DocumentationView` GET, public receipt (T4.7), the health endpoint (T9.1), internal endpoints (`IsInternalService`). Swagger/Redoc/schema views: wrap them and use `permission_classes = [IsAdminUser]` (or `AllowAny` only when `settings.DEBUG`).
3. `OwnerStaffOnlyAPIView` (in `api/mixins.py`) gets `permission_classes = [IsAuthenticated]` explicitly; each concrete view then sets its own list (T3.3).
4. Add the enforcement test `apps/core/tests/test_permissions_declared.py`:
```python
from django.urls import get_resolver, URLPattern, URLResolver
from rest_framework.views import APIView


def _iter_patterns(patterns):
    for p in patterns:
        if isinstance(p, URLResolver):
            yield from _iter_patterns(p.url_patterns)
        elif isinstance(p, URLPattern):
            yield p


def _declares_permissions(cls) -> bool:
    for klass in cls.__mro__:
        if klass is object or klass is APIView or klass.__module__.startswith("rest_framework."):
            continue
        if "permission_classes" in vars(klass):
            return True
    return False


def test_every_project_api_view_declares_permission_classes():
    missing = []
    for p in _iter_patterns(get_resolver().url_patterns):
        cls = getattr(p.callback, "cls", None)
        if cls is None or not issubclass(cls, APIView):
            continue
        if not cls.__module__.startswith(("api.", "apps.")):
            missing.append(f"THIRD-PARTY VIEW EXPOSED: {cls.__module__}.{cls.__name__}")
            continue
        if not _declares_permissions(cls):
            missing.append(f"{cls.__module__}.{cls.__name__}")
    assert not missing, "Views without explicit permission_classes:\n" + "\n".join(missing)
```
**Acceptance:** the test passes; an anonymous request to any non-public endpoint returns **401** (not 403).

## T3.2 Permission catalogue (Appendix A) + owner-only rule
1. Create `apps/permissions/constants.py`:
```python
# Operations only the tenant OWNER may perform. They are enforced in code and must NEVER be
# assignable to staff, even if a Permission row exists.
OWNER_ONLY_PERMISSIONS = frozenset({
    "employees.hire_employee",
    "employees.fire_employee",
    "employees.change_employee_permissions",
    "sales.record_debt_payment",
    "sales.correct_debt_payment",
})
```
2. Create a data migration `apps/permissions/migrations/<next>_seed_extended_permissions.py` that does `Permission.objects.get_or_create(category=..., codename=..., defaults={"name": ..., "description": ...})` for **every** row of Appendix A (existing rows are left untouched; new rows are added). Put the list inside the migration (migrations must not import mutable app code). Names are Uzbek (shown in the UI and in denial messages).
3. Assignment validation. Wherever staff permissions are assigned (`EmployeeHireSerializer.permission_ids`, and any endpoint that edits an employee's permissions — search `permissions.set(`/`permissions.add(`):
```python
from apps.permissions.constants import OWNER_ONLY_PERMISSIONS

def validate_assignable(permissions_qs):
    bad = [p.full_code for p in permissions_qs if p.full_code in OWNER_ONLY_PERMISSIONS]
    if bad:
        raise serializers.ValidationError("Bu ruxsatlarni xodimga berib bo'lmaydi: " + ", ".join(bad))
```
4. The "list permissions for the UI" endpoint (search `api/v1/` for an existing one; if none, add `GET /api/v1/permissions/assignable/` guarded by owner-only class) returns grouped permissions **excluding** `OWNER_ONLY_PERMISSIONS`.
5. Owner-only operations use a dedicated class in `api/permissions.py`:
```python
class IsTenantOwner(BasePermission):
    message = "Bu amalni faqat do'kon egasi bajara oladi."
    def has_permission(self, request, view):
        emp = getattr(request, "employee", None)
        return bool(emp and emp.is_active and emp.is_owner)
```
   Apply to: debt payment create/correction views, employee change-permissions view. Hire/fire views keep their URL-tenant logic (`resolve_tenant_from_url`: platform_admin or the tenant's owner).
**Acceptance:** staff with every assignable permission still gets 403 on owner-only endpoints; the migration is idempotent (run twice).

## T3.3 Put permissions on every business view
For each view below set `permission_classes = [HasEmployeePermission]` and `required_permission` / `permission_map` as shown (owner passes automatically, platform_admin is blocked from tenant business data by `OwnerStaffOnlyAPIView` as today). Read every view file and cross-check — if you find a view not listed, choose the closest permission from Appendix A and note it in `docs/PLAN_NOTES.md`.

| View (file) | Method → permission |
|---|---|
| Cashbox: shift status | GET → `cashbox.view_cashbox` |
| Cashbox: expenses list/create | GET → `cashbox.view_cashbox`; POST → `cashbox.add_expense` |
| Cashbox: incomes list/create | GET → `cashbox.view_cashbox`; POST → `cashbox.add_income` |
| Cashbox: close shift | POST → `cashbox.close_shift` |
| Cashbox: Z-reports list/detail | GET → `cashbox.view_z_reports` |
| Analytics dashboard | GET → `analytics.view_dashboard` (profit/cost fields additionally need `analytics.view_profit_report`; strip them otherwise) |
| Audit log list | GET → `audit.view_audit_log` |
| Tenant settings read | GET → `tenants.view_settings` |
| Tenant settings update | per field group, see below |
| Employees list | GET → `employees.view_employees` |
| Counterparties list/detail | GET → `sales.view_counterparty`; POST/PATCH → `sales.manage_counterparty`; DELETE (archive) → `sales.archive_counterparty` |
| Debt payments list / counterparty debts | GET → `sales.view_debts` |
| Debt payment create / correction | `IsTenantOwner` (owner-only) |
| Sale create | POST → `sales.add_sale` (plus `sales.send_b2b` when the sale targets a B2B counterparty; plus `sales.sell_partner_price` when `is_partner_sale=true`) |
| Sale item void | POST → `sales.void_sale_item`; full void → `sales.void_sale` |
| B2B inbox/accept/reject | `sales.manage_b2b` |
| Invoice signing (T8) | `sales.sign_invoice` |
| Product update | PATCH → `catalog.change_product`; if the payload contains any price field → also `catalog.change_prices`; image endpoints → `catalog.manage_images`; restore from archive → `catalog.restore_product` (add endpoint `POST /catalog/products/<id>/restore/` if missing) |
| Stock write-off | `inventory.write_off_stock`; supplier return → `inventory.supplier_return`; movements list → `inventory.view_stock_movements`; deficit endpoints → `inventory.view_deficits` |

**Tenant settings update by field group** (find the view: `grep -n "usd_rate\|receipt_header\|notify_on_sale" api/v1/tenants/*.py`). Reject unknown fields; for each submitted field require the mapped permission (owner passes all):
```python
SETTINGS_FIELD_PERMISSIONS = {
    "tenants.change_usd_rate": {"usd_rate"},
    "tenants.change_receipt_settings": {"receipt_header", "receipt_footer", "receipt_phone", "address", "description"},
    "tenants.change_notification_settings": {
        "daily_report_time", "daily_report_target", "shift_report_target", "notify_web_reports",
        "notify_on_sale", "notify_on_debt", "low_stock_report_target", "low_stock_report_time",
        "low_stock_frequency", "low_stock_weekday", "low_stock_day_of_month", "notify_web_low_stock",
    },
    "tenants.manage_telegram": {"telegram_group_id"},
}
```
**Replace role-only classes:** remove `IsOwner` and `IsOwnerOrPlatformAdmin` from `DashboardView` and `AuditLogListView` (they ignore `Employee.is_active`). Keep `IsPlatformAdmin` only for platform-level endpoints. Delete the classes if nothing uses them.
**Fix while here:** `DashboardView` contains duplicated dead checks (two identical `if` blocks) — remove the duplicate.
**Tests:** for each row of the table, one test that a staff user *without* the permission gets 403 with the Uzbek message of T3.4, and *with* it gets 2xx. Parametrize to keep it short.

## T3.4 Denial messages
In `api/permissions.py`:
```python
class HasEmployeePermission(BasePermission):
    def has_permission(self, request, view):
        codename = self._required_permission(request, view)
        allowed = PermissionService.has_permission(
            request.user, codename,
            tenant=getattr(request, "tenant", None), employee=getattr(request, "employee", None),
        )
        if not allowed and request.user and request.user.is_authenticated:
            self.message = _denial_message(codename)      # instance attribute; DRF builds a new instance per request
        return allowed


def _denial_message(codename: str) -> str:
    from apps.permissions.models import Permission
    category, _, short = codename.partition(".")
    name = Permission.objects.filter(category=category, codename=short).values_list("name", flat=True).first()
    return f"Sizda «{name or codename}» ruxsati yo'q. Do'kon egasiga murojaat qiling."
```
Do not include internal codenames in messages when a human-readable name exists. Messages never mention other tenants, roles other than "do'kon egasi", or system internals.
**Acceptance:** a staff request to close a shift without permission returns `{"detail": "Sizda «Smenani yopish» ruxsati yo'q. ..."}` (adapt to the final Uzbek names in Appendix A).

## T3.5 Cost visibility (D-08)
1. Create `api/serializers_mixins.py`:
```python
class CostVisibilityMixin:
    """Drop cost-related fields from output unless context['can_view_cost'] is truthy."""
    cost_fields: tuple = ()

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not self.context.get("can_view_cost", False):
            for name in self.cost_fields:
                data.pop(name, None)
        return data
```
2. In `TenantContextMixin` add:
```python
from django.utils.functional import cached_property

@cached_property
def can_view_cost(self) -> bool:
    return PermissionService.has_permission(
        self.request.user, "catalog.view_cost_price", tenant=self.tenant, employee=self.employee
    )
```
   and make every view that serializes cost-bearing data pass `context={"request": request, "can_view_cost": self.can_view_cost}` (for `GenericAPIView`s override `get_serializer_context`).
3. Find every cost-bearing serializer: `grep -rn "cost_price\|last_cost_price\|original_partner_price" api/`. Apply the mixin with `cost_fields = (...)` to at least: `SaleItemOutputSerializer` (`cost_price`, `original_partner_price`), stock output (`last_cost_price`), stock movement output (`cost_price`), any product/variant output exposing a cost, analytics serializers exposing profit/margin (`analytics.view_profit_report` instead of cost permission — use a second flag `can_view_profit`).
4. Input serializers are unaffected (intake still requires `cost_price` from permitted users: `inventory.add_stock_intake`).
**Tests:** staff without `view_cost_price` never sees any key named `cost_price|last_cost_price|original_partner_price` in sale detail, stock list, movements; with the permission they do; owner always does.

## T3.6 Employment checks at login and password reset
1. In the admin-login flow (`api/v1/accounts/views/admin_login.py`), after the password is verified and again in the OTP-verify step: if `user.role in ("staff","owner")` require an **active `Employee`** row (for owners: `is_owner=True` and `tenant__owner=user`, `tenant__is_active=True`). If missing, respond with the same generic failure as a wrong password (no information leak).
2. In `password_reset_service.confirm_password_reset(...)` re-check employment **at confirmation time** (a link issued before firing must not revive a fired user). platform_admin is exempt.
3. When denying, do not reveal whether the account exists or is fired.
**Tests:** a fired staff cannot log in even with the correct password + OTP; an outstanding reset link for a fired user fails.

## T3.7 Query-parameter validation and mandatory pagination
**(a) Validation helpers** — create `api/utils/params.py`:
```python
from datetime import date
from django.utils.dateparse import parse_date
from rest_framework.exceptions import ValidationError

def int_param(request, name, *, required=False, minimum=1):
    raw = request.query_params.get(name)
    if raw in (None, ""):
        if required:
            raise ValidationError({name: "Majburiy parametr."})
        return None
    try:
        value = int(raw)
    except ValueError:
        raise ValidationError({name: "Butun son bo'lishi kerak."})
    if value < minimum:
        raise ValidationError({name: f"Kamida {minimum} bo'lishi kerak."})
    return value

def date_param(request, name):
    raw = request.query_params.get(name)
    if not raw:
        return None
    d = parse_date(raw)
    if d is None:
        raise ValidationError({name: "Sana YYYY-MM-DD formatida bo'lishi kerak."})
    return d

def choice_param(request, name, choices):
    raw = request.query_params.get(name)
    if not raw:
        return None
    if raw not in choices:
        raise ValidationError({name: "Noto'g'ri qiymat."})
    return raw
```
Replace every raw `request.query_params.get(...)` that feeds `.filter(...)` (sales list: `date_from, date_to, counterparty_id, status, payment_type`; cashbox lists; audit list: `actor_id, tenant_id, date_*`; catalog/inventory filters). `grep -rn "query_params.get" api/` and convert **all** of them. Date range filters should convert local dates to aware datetimes with `timezone.make_aware(datetime.combine(d, time.min))` using the project time zone (T5.1).
**(b) Pagination always on.** Find the opt-in helper used by catalog/sales views (`grep -rn "page" api/v1/*/views/*.py | grep -i "query_params"`). Replace it with one function in `api/pagination.py`:
```python
def paginate(request, queryset, serializer_class, *, context=None, view=None):
    paginator = StandardResultsSetPagination()     # page_size=50, max_page_size=100 (already defined)
    page = paginator.paginate_queryset(queryset, request, view=view)
    data = serializer_class(page, many=True, context=context or {"request": request}).data
    return paginator.get_paginated_response(data)
```
   Every list endpoint must use it and must have a **deterministic `order_by`** (add `order_by("-id")` where the queryset is unordered). Lists to convert: categories, products, variants, stock, stock movements, counterparties, sales, debt payments, notifications (GET), cashbox expenses/incomes/reports, B2B inbox, return logs (T4.8), employees.
   Response shape becomes `{count, next, previous, results}`. **Frontend:** update every API wrapper under `src/api/` and every page that consumes a list to read `.results`; add `src/api/paginated.js` helper (`usePaginated`). For dropdown pickers that need many rows (categories, counterparties, variants) add lightweight `GET .../options/?q=<text>` endpoints returning at most 50 `{id, name}` items instead of loading everything.
**Tests:** `date_from=abc` → 400 (never 500); `branch_id`-style garbage ids → 400; page 2 returns different rows; page_size > 100 is capped.


---
---
# PHASE 4 — SALES, VOID & B2B CORE (money and stock correctness)

Goal (D-10 … D-20): one consistent quantity model, one code path for every return of goods, exact "undo" of stock, correct debt, explicit B2B linking, no data leaks.
Dependencies: Phase 1–3. **This phase is the most delicate: follow §4.4 lock order and write the invariant tests of T4.12.**

## T4.0 Quantity model (read this before coding)
For every `SaleItem`, at any moment:
```
quantity  =  voided_quantity + b2b_accepted_quantity + b2b_rejected_quantity + b2b_return_pending_quantity + b2b_discrepancy_closed_quantity + pending
```
- `voided_quantity` — returned to the sender because the SENDER (A) voided it. (For non-B2B sales this is the only returned bucket.)
- `b2b_accepted_quantity` — B accepted it. **Final**; never returned; A can never touch it (D-12).
- `b2b_rejected_quantity` — physically returned to and received by A. It is not incremented just because B rejects the shipment or the 7-day period expires.
- `b2b_return_pending_quantity` — B rejected or did not accept the quantity before expiry; actual physical return to A is still outstanding. A sender-side receipt moves only physically received quantities from this bucket to `b2b_rejected_quantity` and restores that stock.
- `b2b_discrepancy_closed_quantity` — quantity confirmed by A's owner as lost/damaged/not physically returned. It closes the logistics obligation but is not a physical receipt and never restores stock.
- `pending` — derived: `quantity − voided − accepted − rejected − return_pending − discrepancy_closed`. Only pending quantity can still be accepted by B, rejected by B, or expire. B2B cannot be closed through ordinary A-side `void`; non-B2B sales use the existing void flow and have all B2B buckets at zero.

Money for a physical B2B return or owner-closed lost/damaged quantity `q`: `amount = money(q × unit_price)`. It increases `Sale.refunded_amount`, reduces any positive counterparty receivable first, and records any excess as counterparty credit (negative balance); it is never an automatic cash refund. For the physical-return path only actually received goods restore stock. A `DebtPayment` correction and linked return receipt or discrepancy-closure/audit record the adjustment. `Sale.total_amount` is **never** modified (D-13). `net_amount = total_amount − refunded_amount`.

## T4.1 Models & migrations
**Files:** `apps/sales/models/{sale_model,sale_item_model,sale_void_log_model,counterparty_model,debt_payment_model,notification_model,sale_payment_model}.py`, new `receipt_sequence_model.py`, `b2b_link_request_model.py`; `models/__init__.py`.
1. **Sale** — add:
```python
refunded_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
fiscal_status = models.CharField(max_length=20, choices=[
    ("not_sent", "Yuborilmagan"), ("pending", "Provayderda"), ("accepted", "Fiskal tasdiqlandi"),
    ("rejected", "Rad etildi"), ("unknown", "Holati tekshirilmoqda"), ("returned", "Qaytarildi"),
], default="not_sent")
b2b_resolved_at = models.DateTimeField(null=True, blank=True)          # set when no pending quantity is left
idempotency_hash = models.CharField(max_length=64, blank=True, default="")   # sha256 of the canonical request payload
public_token = models.CharField(max_length=32, unique=True, editable=False, default=generate_public_token)

@property
def net_amount(self):
    return self.total_amount - self.refunded_amount
```
with `def generate_public_token(): return secrets.token_urlsafe(16)` at module level (needed by migrations). Constraints/indexes:
```python
constraints = [
    models.UniqueConstraint(fields=["tenant", "receipt_number"], name="unique_sale_receipt_number_per_tenant"),   # keep
    # One POS sale per tenant/request; POS currency is UZS only.
    models.UniqueConstraint(fields=["tenant", "idempotency_key"],
        condition=models.Q(idempotency_key__isnull=False) & ~models.Q(idempotency_key=""),
        name="unique_sale_idempotency_per_tenant"),
    models.CheckConstraint(condition=models.Q(refunded_amount__gte=0) & models.Q(refunded_amount__lte=models.F("total_amount")),
        name="sale_refunded_within_total"),
]
indexes = [
    models.Index(fields=["tenant", "-created_at"], name="sale_tenant_created_idx"),
    models.Index(fields=["tenant", "status"], name="sale_tenant_status_idx"),
    models.Index(fields=["tenant", "counterparty"], name="sale_tenant_cp_idx"),
    models.Index(fields=["b2b_target_tenant", "status"], name="sale_b2b_target_status_idx"),
]
```
Retail POS `Sale` is UZS-only; remove USD currency choices/branches from sale, debt, tender and cashbox paths. The USD informational calculator is a separate pure calculation and must not call sale/cashbox services.
2a. **SalePayment (new)** — each tender portion for a sale is a separate immutable row with `sale`, `tenant`, method (`cash`, `card`, `bank_transfer`, `customer_credit`), UZS applied `amount`, `cash_received` for cash portions, derived `change_amount`, actor, shift, time, provider reference only when applicable, and idempotency/audit linkage. Applied tender portions reconcile exactly to the sale due; cash received/change are separate and do not inflate sale revenue. No card number/CVV is stored.
2b. **Seller/fiscal gate** — sale creation validates active operator-approved seller profile and category/tender constraints. Provider calls use an idempotent adapter; accepted provider response stores official receipt ID/QR before POS finalization. Timeout enters `unknown` and requires same-operation status reconciliation, never a second sale. If no selected registered provider or provider-supported offline mode is configured, POS cannot finalize. Never render the internal receipt as a fiscal receipt.
2. **SaleItem** — add choice `STATUS_B2B_PARTIALLY_ACCEPTED = "b2b_partially_accepted"` ("B2B Qisman qabul qilingan") and a field remembering where B's goods went:
```python
b2b_target_variant = models.ForeignKey("catalog.ProductVariant", null=True, blank=True,
    on_delete=models.SET_NULL, related_name="b2b_received_items")
```
   Constraints:
```python
models.CheckConstraint(condition=models.Q(quantity__gt=0), name="sale_item_quantity_positive"),   # keep
models.CheckConstraint(
    condition=models.Q(voided_quantity__gte=0, b2b_accepted_quantity__gte=0, b2b_rejected_quantity__gte=0),
    name="sale_item_buckets_non_negative"),
models.CheckConstraint(
    condition=models.Q(quantity__gte=models.F("voided_quantity") + models.F("b2b_accepted_quantity") + models.F("b2b_rejected_quantity")),
    name="sale_item_buckets_within_quantity"),
models.CheckConstraint(condition=models.Q(unit_price__gt=0), name="sale_item_unit_price_positive"),
```
3. **SaleVoidLog** (becomes the general *return log*; keep the class/table name to limit churn) — add:
```python
KIND_VOID = "void"; KIND_B2B_REJECT = "b2b_reject"; KIND_B2B_EXPIRE = "b2b_expire"
KIND_CHOICES = [(KIND_VOID, "Bekor qilindi"), (KIND_B2B_REJECT, "B2B rad etildi"), (KIND_B2B_EXPIRE, "B2B muddati tugadi")]
kind = models.CharField(max_length=16, choices=KIND_CHOICES, default=KIND_VOID)
amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))     # money(quantity * unit_price)
counterparty = models.ForeignKey("sales.Counterparty", null=True, blank=True, on_delete=models.PROTECT, related_name="return_logs")
```
   and make `voided_by` nullable (`null=True, blank=True`; `None` = system, e.g. expiry). Add `models.Index(fields=["tenant", "counterparty", "-voided_at"])` and `CheckConstraint(quantity__gt=0)`.
4. **Counterparty** — see T4.7 (phone optional, `link_status`).
5. **DebtPayment** — UZS amount plus tender method, recorder, shift, idempotency key (`CharField(max_length=64, null=True, blank=True)`), and correction linkage. Keep `UniqueConstraint(fields=["tenant","idempotency_key"], condition=~Q(idempotency_key__isnull=True), name="unique_debt_payment_idempotency")`; enforce positive real payments and model corrections as linked compensating entries, never destructive edits.
6. **Notification** — add type `TYPE_SALE_RETURNED = "sale_returned"` ("Tovar qaytarildi") and `data = models.JSONField(default=dict, blank=True)` (structured payload, used by the frontend instead of parsing `message`). Add `models.Index(fields=["recipient", "is_read", "-created_at"])`.
7. **ReceiptSequence** (new):
```python
class ReceiptSequence(models.Model):
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="receipt_sequences")
    date = models.DateField()
    last_number = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["tenant", "date"], name="unique_receipt_sequence_per_day")]
```
8. Migrations: `makemigrations sales --name sales_core_rewrite`; reset the dev DB if needed.
**Acceptance:** `makemigrations --check` clean; model constraints exist in Postgres (`\d sales_saleitem`).

## T4.2 Quantity helpers
**Create** `apps/sales/services/quantities.py`:
```python
from decimal import Decimal
from apps.sales.models import Sale, SaleItem


def pending_quantity(item) -> Decimal:
    """Quantity that is still undecided (can be accepted/rejected/expired/voided)."""
    return item.quantity - item.voided_quantity - item.b2b_accepted_quantity - item.b2b_rejected_quantity


def derive_item_status(item) -> str:
    pending = pending_quantity(item)
    if item.voided_quantity == item.quantity:
        return SaleItem.STATUS_VOIDED
    if item.b2b_accepted_quantity > 0:
        if pending == 0 and item.b2b_rejected_quantity == 0 and item.voided_quantity == 0:
            return SaleItem.STATUS_B2B_ACCEPTED
        return SaleItem.STATUS_B2B_PARTIALLY_ACCEPTED
    if item.b2b_rejected_quantity > 0 and pending == 0:
        return SaleItem.STATUS_B2B_REJECTED
    if item.voided_quantity > 0:
        return SaleItem.STATUS_PARTIALLY_VOIDED
    return SaleItem.STATUS_ACTIVE


def derive_sale_status(sale, items) -> str:
    total = sum((i.quantity for i in items), Decimal("0"))
    voided = sum((i.voided_quantity for i in items), Decimal("0"))
    accepted = sum((i.b2b_accepted_quantity for i in items), Decimal("0"))
    rejected = sum((i.b2b_rejected_quantity for i in items), Decimal("0"))
    pending = total - voided - accepted - rejected
    if voided == total:
        return Sale.STATUS_VOIDED
    if sale.b2b_target_tenant_id is None:
        return Sale.STATUS_PARTIALLY_VOIDED if voided > 0 else Sale.STATUS_COMPLETED
    if accepted == 0:
        return Sale.STATUS_B2B_PENDING if pending > 0 else Sale.STATUS_B2B_REJECTED
    if pending == 0 and rejected == 0 and voided == 0:
        return Sale.STATUS_B2B_ACCEPTED
    return Sale.STATUS_B2B_PARTIALLY_ACCEPTED


def total_pending(items) -> Decimal:
    return sum((pending_quantity(i) for i in items), Decimal("0"))
```
**Tests:** table-driven tests of both `derive_*` functions covering every combination named in T4.0.

## T4.3 StockService: exact restore
Add to `apps/inventory/services/stock_service.py` (read `customer_return` and mirror its keyword arguments exactly — they are shown here by intent):
```python
@classmethod
def restore_sold_stock(cls, *, tenant, product_variant, quantity, created_by, sale, note=""):
    """Put sold goods back exactly as they were ("izingga qayt").
    Adds `quantity` to the SAME Stock row, does NOT change last_cost_price, writes a
    StockMovement of type TYPE_SALE_RESTORE linked to the sale."""
    return cls.apply_movement(
        tenant=tenant, product_variant=product_variant, quantity=quantity,
        movement_type=StockMovement.TYPE_SALE_RESTORE, direction=StockMovement.DIRECTION_IN,
        cost_price=None, created_by=created_by, note=note, sale=sale,
    )
```
Make sure `apply_movement` updates `last_cost_price` **only** for `TYPE_KIRIM`. Update frontend label maps for movement types (`grep -rn "mijoz_qaytardi" frontend/ilbi/src`) to include `sotuv_qaytarildi`.
**Test:** sell 10, restore 4 → quantity and `last_cost_price` equal the values before the sale (+4), movement row exists.

## T4.4 Return service for physically received goods (replaces the old void-as-return shortcut)
**Create** `apps/sales/services/sale_return_service.py` (+ locking helper `apps/sales/services/sale_locking.py`).
```python
# sale_locking.py
from apps.sales.models import Sale, SaleItem, Counterparty

def lock_sale_graph(sale_id):
    """Lock Sale -> its items (by id) -> counterparty (only for debt sales). Order = §4.4."""
    sale = Sale.objects.select_for_update().select_related("tenant", "b2b_target_tenant").get(pk=sale_id)
    items = list(
        SaleItem.objects.select_for_update().select_related("product_variant__product").filter(sale=sale).order_by("id")
    )
    cp = None
    if sale.counterparty_id and sale.payment_type == Sale.PAYMENT_DEBT:
        cp = Counterparty.objects.select_for_update().get(pk=sale.counterparty_id)
    return sale, items, cp
```
```python
# sale_return_service.py
class SaleReturnError(Exception):
    pass

class SaleReturnService:
    @staticmethod
    def apply_return(*, sale, item, quantity, kind, actor, reason, counterparty):
        """Record a physically received customer/B2B return of `quantity` units.
        Caller MUST hold the locks from lock_sale_graph() inside transaction.atomic and
        MUST process items ordered by product_variant_id (stock lock order, §4.4).
        Effects: stock is restored only after the receiving seller physically accepts it; item bucket
        updated; return row written. For debt sales, reduce outstanding debt first and write any
        excess to controlled customer credit. Refund portions link to original tender. This service
        does not replace the fiscal provider's official return/correction operation."""
        quantity = Decimal(quantity)
        pending = pending_quantity(item)
        if quantity <= 0 or quantity > pending:
            raise SaleReturnError(f"Qaytariladigan miqdor noto'g'ri (0 dan {pending} gacha bo'lishi kerak).")
        amount = money(quantity * item.unit_price)

        StockService.restore_sold_stock(
            tenant=sale.tenant, product_variant=item.product_variant, quantity=quantity,
            created_by=actor or sale.tenant.owner,             # system actions are attributed to the tenant owner
            sale=sale, note=f"{sale.receipt_number}: {kind}" + ("" if actor else " (avtomatik)"),
        )
        if kind == SaleVoidLog.KIND_VOID:
            item.voided_quantity += quantity
        else:
            item.b2b_rejected_quantity += quantity
        item.status = derive_item_status(item)
        item.save(update_fields=["voided_quantity", "b2b_rejected_quantity", "status", "updated_at"])

        sale.refunded_amount += amount

        if sale.payment_type == Sale.PAYMENT_DEBT and counterparty is not None:
            field = "debt_balance_usd" if sale.currency == Sale.CURRENCY_USD else "debt_balance_uzs"
            setattr(counterparty, field, getattr(counterparty, field) - amount)
            counterparty.save(update_fields=[field, "updated_at"])

        return SaleVoidLog.objects.create(
            tenant=sale.tenant, sale_item=item, quantity=quantity, amount=amount, kind=kind,
            reason=reason, voided_by=actor, counterparty=sale.counterparty,
        )

    @staticmethod
    def finalize(sale, items, *, now):
        """Recompute sale status after one or more returns/accepts; stamp resolution time. Saves sale."""
        sale.status = derive_sale_status(sale, items)
        if sale.b2b_target_tenant_id and total_pending(items) == 0 and sale.b2b_resolved_at is None:
            sale.b2b_resolved_at = now
        sale.save(update_fields=["status", "refunded_amount", "b2b_resolved_at", "updated_at"])
```
After the debt change call `DebtService.check_threshold_and_notify(counterparty)` **once by the caller** (T4.11 makes it use `on_commit`).
**Tests:** a return of more than pending raises; stock, bucket, refunded_amount and debt change by exactly the same value; debt sale vs cash sale (debt unchanged for cash).

## T4.5 Sale correction vs customer return (rewrite `apps/sales/services/void_service.py`)
Rules: reason mandatory (strip, ≥ 3 chars), actor/tenant authority and idempotency required. A sale draft or fiscally rejected/unfinalized request may be cancelled. Once a fiscal provider confirms a receipt, do not silently `void` it or use the generic 7-day rule: customer returns/defect claims use T4.4 and the provider's official return/correction API. B2B acceptance/rejection/expiry is a separate contractual reconciliation flow; goods and debt are not restored until physical return/credit is confirmed. The customer-law deadline/policy is category-specific and externally reviewed; never block a defect claim using the technical void window.
The legacy code sketch below must be adapted to these rules: remove `VOID_WINDOW`; add explicit fiscal state (`draft`, `pending`, `accepted`, `rejected`, `return_pending`, `returned`); never call stock-restore/debt-reduction merely because a void request arrived. Provider-accepted receipts can only use the provider's return/correction operation. Failed/unknown provider responses are reconciled idempotently, not retried as a new sale.
```python
class VoidService:
    VOID_WINDOW = timedelta(days=7)

    @staticmethod
    def _validate(sale, items, reason):
        if not reason or len(reason.strip()) < 3:
            raise VoidServiceError("Bekor qilish sababi majburiy.")
        if sale.status == Sale.STATUS_VOIDED:
            raise VoidServiceError("Bu chek allaqachon bekor qilingan.")
        if timezone.now() - sale.created_at > VoidService.VOID_WINDOW:
            raise VoidServiceError("Bekor qilish muddati (7 kun) tugagan.")
        if total_pending(items) == 0:
            if sale.b2b_target_tenant_id:
                raise VoidServiceError("Bu transferning hammasi qabul qilingan yoki qaytarilgan — bekor qilib bo'lmaydi.")
            raise VoidServiceError("Qaytariladigan tovar qolmagan.")

    @classmethod
    @transaction.atomic
    def void_sale(cls, *, sale, user, reason) -> Sale:
        sale, items, cp = lock_sale_graph(sale.pk)
        cls._validate(sale, items, reason)
        for item in sorted(items, key=lambda i: i.product_variant_id):          # stock lock order
            pend = pending_quantity(item)
            if pend > 0:
                SaleReturnService.apply_return(sale=sale, item=item, quantity=pend,
                    kind=SaleVoidLog.KIND_VOID, actor=user, reason=reason.strip(), counterparty=cp)
        old = sale.status
        SaleReturnService.finalize(sale, items, now=timezone.now())
        if sale.status == Sale.STATUS_VOIDED:
            sale.voided_at, sale.voided_by, sale.void_reason = timezone.now(), user, reason.strip()
            sale.save(update_fields=["voided_at", "voided_by", "void_reason"])
        cls._after(sale, old, user, reason, cp, whole=True)
        return sale

    @classmethod
    @transaction.atomic
    def void_sale_item(cls, *, sale_item, user, quantity, reason) -> SaleItem:
        sale, items, cp = lock_sale_graph(sale_item.sale_id)
        item = next(i for i in items if i.pk == sale_item.pk)
        cls._validate(sale, items, reason)
        SaleReturnService.apply_return(sale=sale, item=item, quantity=quantity,
            kind=SaleVoidLog.KIND_VOID, actor=user, reason=reason.strip(), counterparty=cp)
        old = sale.status
        SaleReturnService.finalize(sale, items, now=timezone.now())
        cls._after(sale, old, user, reason, cp, whole=False)
        return item
```
`_after(...)` (one call per operation): (1) `AuditLog` action `VOID_SALE` with `changes={"status": {"old": old, "new": sale.status}, "refunded_amount": str(sale.refunded_amount)}` and the `reason` **(use the audit helper exactly like the old code did)**; (2) `Notification` `TYPE_SALE_RETURNED` to `sale.tenant.owner` (title "Tovar qaytarildi", `data={"sale_id":…, "receipt_number":…, "amount":…}`) — skip if the actor is the owner himself; (3) for B2B sales: `Notification` `TYPE_B2B_CANCELLED` to `sale.b2b_target_tenant.owner` ("{A} transferni bekor qildi", **no reason**, link to the inbox); (4) `DebtService.check_threshold_and_notify(cp)` if `cp`.
**Behavior to verify in tests:**
- full void of an untouched cash sale: stock exactly as before, `refunded_amount == total`, status `voided`.
- 100 000 debt sale, item void of 40 000 → `refunded_amount=40000`, `net=60000`, debt −40 000; then `void_sale` → debt −60 000 more (total −100 000, **not** −140 000) → the old double-subtraction bug is gone.
- B2B: B accepted 3 of 10 → ordinary `void_sale` is refused. Only the remaining 7 may enter a B2B return-pending flow, and only physically received quantities restore source stock.
- 8 days old sale → refused.

## T4.6 B2BTransferService (rewrite accept / reject / expire)
**File:** `apps/sales/services/b2b_transfer_service.py`. Signatures change: the **view passes the acting tenant** (no more `user.tenant`).

**Owner-approved Uzbekistan decision (2026-10-12; supersedes any conflicting immediate-return behavior below):** B's reject or automatic expiry creates a pending physical-return/reconciliation obligation only. Do **not** restore A's stock, reduce its receivable, increase `refunded_amount`, or claim the goods were returned merely because B rejected them or the timer expired. The sender records only the actual returned quantity through a distinct, audited, idempotent return-receipt operation; that operation restores stock and adjusts the counterparty balance. It first offsets a positive receivable; any amount beyond the unpaid balance or from an already-paid B2B sale is recorded as counterparty credit (negative balance), never as an automatic cash refund. The correction also appears in the debt ledger. If goods are lost/damaged or do not return, only A's owner may close the logistics discrepancy with a required reason; the sale-price amount is recorded as a refund/correction against the partner receivable or as partner credit if already paid, but source stock is untouched and no cash leaves the drawer. This owner-only closure is idempotent and append-only audited. The legacy `SaleReturnService.apply_return(...)` snippets in this section are **not** to be invoked by reject/expiry until they are refactored to enforce this rule.

**accept_transfer(sale, accepting_user, tenant, items_payload)** — payload items: `{sale_item_id, accepted_quantity, target_category_id?, target_variant_id?}`.
Rules: B may call it repeatedly until the sale is resolved or expired. `accepted_quantity == 0` means "leave pending" (explicit rejection is the separate `reject_transfer`). `accepted_quantity` must be ≤ `pending_quantity(item)` (**this removes the old bug where voided quantity could still be accepted**).
```python
@classmethod
@transaction.atomic
def accept_transfer(cls, *, sale, accepting_user, tenant, items_payload):
    sale, items, cp = lock_sale_graph(sale.pk)
    if sale.b2b_target_tenant_id != tenant.id:
        raise B2BTransferServiceError("Faqat qabul qiluvchi do'kon qabul qila oladi.")
    if sale.status not in (Sale.STATUS_B2B_PENDING, Sale.STATUS_B2B_PARTIALLY_ACCEPTED):
        raise B2BTransferServiceError("Bu transfer allaqachon yakunlangan.")
    now = timezone.now()
    if sale.b2b_expires_at and now > sale.b2b_expires_at:
        raise B2BTransferServiceError("Ushbu transfer muddati tugagan (7 kun o'tgan).")
    by_id = {i.id: i for i in items}

    # Phase A: validate + resolve B-side variants (create products only when needed). No stock change yet.
    resolved = []                                          # [(item, qty, target_variant)]
    for p in items_payload:
        item = by_id.get(p["sale_item_id"])
        if item is None:
            raise B2BTransferServiceError(f"SaleItem {p['sale_item_id']} ushbu chekka tegishli emas.")
        qty = Decimal(str(p["accepted_quantity"]))
        pend = pending_quantity(item)
        if qty < 0 or qty > pend:
            raise B2BTransferServiceError(f"{item.product_variant.name}: qabul miqdori 0 dan {pend} gacha bo'lishi kerak.")
        if qty == 0:
            continue
        # A remembered mapping wins: later accepts of the same item go to the SAME B-side variant.
        target = item.b2b_target_variant if item.b2b_target_variant_id else cls._resolve_target_variant(
            sale=sale, item=item, payload=p, b_tenant=tenant)       # <- KEEP the existing variant/category/product-creation block here
        resolved.append((item, qty, target))

    # Phase B: stock-in on B, ordered by target variant id (lock order, §4.4).
    for item, qty, target in sorted(resolved, key=lambda r: r[2].id):
        StockService.intake(tenant=tenant, product_variant=target, quantity=qty,
            cost_price=item.unit_price, created_by=accepting_user,
            note=f"B2B qabul qilindi: {sale.receipt_number} ({sale.tenant.name} dan)")
        item.b2b_accepted_quantity += qty
        item.b2b_target_variant = target
        item.status = derive_item_status(item)
        item.save(update_fields=["b2b_accepted_quantity", "b2b_target_variant", "status", "updated_at"])

    SaleReturnService.finalize(sale, items, now=now)
    cls._notify_sender(sale, accepted=True)
    return sale
```
`_resolve_target_variant` = move the **existing** code (the `if target_variant_id … elif target_category_id … else raise` block, including currency checks and `Product.objects.create` + `ProductService.add_variant` with zero prices) into this helper unchanged. Do not copy A's prices or A's cost into B's variant. The old code that marked the remainder "rejected" and called `customer_return` inside accept is **deleted**.

**reject_transfer(sale, rejecting_user, tenant, reason, items_payload=None)** — reason mandatory. `items_payload=None` rejects **all pending** quantities; otherwise `[{sale_item_id, quantity}]` rejects those pending amounts (B may accept some lines and reject others).
```python
sale, items, cp = lock_sale_graph(sale.pk)
# same tenant / status / expiry checks as accept
targets = [...]                                    # [(item, qty)] from payload or all pending
for item, qty in sorted(targets, key=lambda t: t[0].product_variant_id):
    SaleReturnService.apply_return(sale=sale, item=item, quantity=qty,
        kind=SaleVoidLog.KIND_B2B_REJECT, actor=rejecting_user, reason=reason.strip(), counterparty=cp)
sale.b2b_reject_reason = reason.strip()
SaleReturnService.finalize(sale, items, now=timezone.now())
```
Notification to A's owner `TYPE_B2B_REJECTED` (with reason) + `TYPE_SALE_RETURNED` data; `DebtService.check_threshold_and_notify(cp)`.

**Expiry** (D-10): every sale with pending quantity whose `b2b_expires_at <= now` is processed **in its own transaction**:
```python
@classmethod
def expire_due_transfers(cls, now=None) -> int:
    now = now or timezone.now()
    ids = list(Sale.objects.filter(
        b2b_target_tenant__isnull=False, b2b_resolved_at__isnull=True,
        b2b_expires_at__lte=now,
        status__in=[Sale.STATUS_B2B_PENDING, Sale.STATUS_B2B_PARTIALLY_ACCEPTED],
    ).values_list("id", flat=True))
    done = 0
    for sale_id in ids:
        try:
            done += 1 if cls._expire_one(sale_id, now) else 0
        except Exception:
            logger.exception("B2B expire failed: sale_id=%s", sale_id)     # one bad sale must not block the rest
    return done

@classmethod
@transaction.atomic
def _expire_one(cls, sale_id, now) -> bool:
    if not Sale.objects.select_for_update(skip_locked=True).filter(pk=sale_id, b2b_resolved_at__isnull=True).exists():
        return False                                       # locked by someone else or already resolved
    sale, items, cp = lock_sale_graph(sale_id)
    if sale.b2b_resolved_at is not None:
        return False
    for item in sorted(items, key=lambda i: i.product_variant_id):
        pend = pending_quantity(item)
        if pend > 0:
            SaleReturnService.apply_return(sale=sale, item=item, quantity=pend,
                kind=SaleVoidLog.KIND_B2B_EXPIRE, actor=None, reason="7 kunlik muddat tugadi", counterparty=cp)
    SaleReturnService.finalize(sale, items, now=now)
    # notify BOTH owners (A: goods + debt returned; B: transfer expired)
    return True
```
Update the Celery task `auto_expire_transfers_task` (`apps/sales/tasks.py`) to call `expire_due_transfers()`; keep the hourly beat entry. The old `auto_expire_transfers(tenant=None)` method is deleted.
**Notifications helper** `_notify_sender(sale, accepted)`: `TYPE_B2B_ACCEPTED` when the sale became fully accepted, else `TYPE_B2B_PARTIALLY_ACCEPTED`; recipients = owner of `sale.tenant`; `data` contains ids and quantities, no cost data.
**Views** (`api/v1/sales/views/b2b_views.py`): pass `tenant=self.tenant`; permission `sales.manage_b2b`; scope querysets by `b2b_target_tenant=self.tenant`.
**Tests (must all exist):**
1. reject all → A stock == initial, debt −total, `refunded == total`, status `b2b_rejected`, logs kind `b2b_reject`; a later `void_sale` fails ("qolmagan").
2. send 10; accept 3; accept 2 more; expire → A gets back **5** (not 12), B has 5, debt = 5×price, status `b2b_partially_accepted`, resolved_at set.
3. A `void_sale_item` 3 of 10 pending; B accepts 7 ✓; B accepts 8 → error.
4. B accepts everything → `void_sale` → error; status `b2b_accepted`.
5. `_expire_one` twice → second returns False, no double return.
6. Conservation invariant (helper `assert_conserved`): for any sequence of operations `A_stock_now + B_accepted_total == A_stock_initial` and `Σ buckets == quantity` for every item.
7. Concurrency (`transaction=True` tests with threads): accept vs void on the same sale never violates item constraints and conserves stock.

## T4.7 Counterparty linking redesign (D-19)
**Problem being fixed:** `Counterparty.target_tenant` was derived once from a phone number → stale/wrong tenant and anyone could push B2B transfers (and notifications) to any tenant by guessing a phone.
**Models** (`counterparty_model.py`, new `b2b_link_request_model.py`):
```python
# Counterparty
LINK_NONE, LINK_PENDING, LINK_LINKED = "none", "pending", "linked"
phone_number = models.CharField(max_length=20, blank=True, default="", db_index=True)   # optional now
link_status = models.CharField(max_length=10, default=LINK_NONE,
    choices=[(LINK_NONE, "Ulanmagan"), (LINK_PENDING, "Kutilmoqda"), (LINK_LINKED, "Ulangan")])
# target_tenant stays (FK, SET_NULL) but is set ONLY by the link flow below
constraints = [
    models.UniqueConstraint(fields=["tenant", "phone_number"], condition=~models.Q(phone_number=""),
                            name="unique_counterparty_phone_per_tenant"),
    models.UniqueConstraint(fields=["tenant", "target_tenant"], condition=models.Q(target_tenant__isnull=False),
                            name="unique_counterparty_target_per_tenant"),
]

# B2BLinkRequest
class B2BLinkRequest(BaseModel):                       # BaseModel.tenant = the REQUESTING tenant (A)
    counterparty = models.ForeignKey("sales.Counterparty", on_delete=models.CASCADE, related_name="link_requests")
    target_tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="incoming_link_requests")
    requested_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT, related_name="+")
    status = models.CharField(max_length=10, default="pending", choices=[("pending","Kutilmoqda"),("approved","Tasdiqlandi"),("rejected","Rad etildi")])
    decided_by = models.ForeignKey("accounts.User", null=True, blank=True, on_delete=models.PROTECT, related_name="+")
    decided_at = models.DateTimeField(null=True, blank=True)
    constraints = [UniqueConstraint(fields=["counterparty","target_tenant"], condition=Q(status="pending"), name="unique_pending_link_request")]
```
**Service** `apps/sales/services/counterparty_service.py` (extend; delete `_find_target_tenant`):
- `create(...)`: `phone_number` normalized with `normalize_phone_number` when given. Optional `own_tenant_id`: must satisfy `Tenant.objects.get(pk=own_tenant_id, owner=<acting owner>)`, `!= tenant`, active → set `target_tenant`, `link_status=linked`, name defaults to that tenant's name (**auto-link between the owner's own tenants**). Only the **owner** may use `own_tenant_id` (`request.employee.is_owner`).
- `update(...)`: use `save(update_fields=[...])` of editable fields only (**never a full `save()`** — it can overwrite a concurrently changed debt balance).
- `request_link(counterparty, tenant_code, requested_by)`: finds `Tenant` by `public_code` (case-insensitive); reject own tenant; reject if already linked; limits: ≤ 20 pending requests per tenant, ≤ 3 requests to the same target per 24 h; creates `B2BLinkRequest`, sets `link_status=pending`, notifies the target owner (type `b2b_link_request`, add to `Notification.TYPE_CHOICES`).
- `approve_link(request_id, approved_by, tenant)`: only the target tenant (`sales.manage_b2b`); sets `counterparty.target_tenant=<target>`, `link_status=linked`; creates (get_or_create) the reciprocal counterparty at the target (`tenant=target, target_tenant=A, name=A.name, link_status=linked`); notifies A. `reject_link(...)` sets status rejected, counterparty back to `none`.
- Counterparty serializers expose `target_tenant_name` **only when `link_status == "linked"`**; they never accept `target_tenant` or `link_status` as input.
**Endpoints:** `POST /api/v1/sales/counterparties/<id>/link-request/` (`sales.manage_counterparty`), `GET /api/v1/sales/b2b/link-requests/` (incoming, `sales.manage_b2b`), `POST /api/v1/sales/b2b/link-requests/<id>/approve/` and `/reject/`.
**Sale creation rule:** a B2B sale (`counterparty.target_tenant` set) requires `link_status == linked` and an **active** target tenant; otherwise a normal sale.
**Tests:** own-tenant auto-link; a non-owner can't use `own_tenant_id`; foreign tenant flow end-to-end; rate limits; phone no longer reveals tenants; archived counterparties cannot be used in new sales (`is_active` check in `create_sale`).

## T4.8 Returned-goods records (nasiyalar bo'limi)
- Endpoint `GET /api/v1/sales/counterparties/<id>/returns/` (permission `sales.view_debts`, paginated): rows from `SaleVoidLog` filtered by `counterparty` and `tenant=self.tenant`, newest first. Fields: `id, voided_at, kind, quantity, amount, reason, receipt_number (sale), product_name, variant_name, unit, voided_by_name (null for system)`.
- Notifications created in T4.5/T4.6 carry `data` (ids/amounts) so the UI can deep-link.
- **Frontend:** in the counterparty/debt screen add a "Qaytarilgan tovarlar" tab using this endpoint.

## T4.9 SaleService.create_sale fixes
**File:** `apps/sales/services/sale_service.py` (read fully first). Keep the overall flow; change exactly these things.
1. **Receipt number** — delete the "last row" logic; use the sequence table (row-lock only the sequence row, local date, no 4-digit overflow problem):
```python
@staticmethod
def _next_receipt_number(tenant) -> str:
    today = timezone.localdate()
    seq, _ = ReceiptSequence.objects.select_for_update().get_or_create(tenant=tenant, date=today)
    seq.last_number += 1
    seq.save(update_fields=["last_number"])
    return f"POS-{today:%Y%m%d}-{seq.last_number:04d}"
```
   (Must be called inside the transaction; `get_or_create` on a locked queryset is race-safe thanks to the unique constraint.)
2. **Idempotency** (D-20, request-scoped) at the very start:
```python
payload_hash = hashlib.sha256(json.dumps(canonical_payload, sort_keys=True, default=str).encode()).hexdigest()
if idempotency_key:
    advisory_xact_lock(1001, f"{tenant.id}:{idempotency_key}")           # serialize identical keys
    existing = list(Sale.objects.filter(tenant=tenant, idempotency_key=idempotency_key).order_by("id"))
    if existing:
        if existing[0].idempotency_hash != payload_hash:
            raise SaleServiceError("Bu idempotency kaliti boshqa so'rov uchun ishlatilgan.")
        return existing                                                   # exact replay -> same result
```
   `canonical_payload` = counterparty id, tender portions, partner flag and the list of `(variant_id, quantity, unit_price)` sorted by variant id. Store `idempotency_hash=payload_hash` on the sale. The POS rejects any currency other than UZS; USD calculator never enters this service. (The unique constraint of T4.1 is the backstop.)
3. **Validation of related objects:** `counterparty.tenant_id == tenant.id`, `counterparty.is_active`, B2B → linked + target tenant active (T4.7). Reject otherwise with Uzbek messages.
4. **N+1:** load all variants once with `select_related("stock", "product__category")`; no per-item queries; sort cart lines by `product_variant_id` before locking stock.
5. **Rounding:** `line_total = money(qty * unit_price)`; `Sale.total_amount = sum(line totals)`; `SaleItem.total_price = line_total`.
6. **Cost price:** `cost = stock.last_cost_price if stock and stock.last_cost_price is not None else None`; if `None` use `Decimal("0.00")` **and log a warning** (`logger.warning("Missing cost price: variant_id=%s", ...)`) — profit reports will flag these (Appendix C-5 asks the owner for a decision).
7. B2B: require two verified seller profiles and a valid provider/fiscal workflow; set target and pending status, notify after commit. Operational acceptance window is contract policy, not consumer-law deadline. Do not reverse goods/debt on reject/expiry until physical return and credit reconciliation are recorded.
8. Remove the **cross-service call to the private** `_apply_movement` (use the public `apply_movement`).
9. After the debt update call `DebtService.check_threshold_and_notify(cp)` (on_commit inside, T4.11).
**Tests:** two parallel requests with same key → exactly one sale/payment set; same key with different payload → error; 50 parallel sales in one tenant → 50 distinct receipt numbers, no `IntegrityError`; UZS-only validation rejects USD tender/catalog sale; mixed-tender sale portions reconcile exactly; mixed cashless-only MXIK basket splits into eligible provider sales; rounding example `1.333 × 10.55`.

## T4.10 Serializers (D-13, D-14)
**Files:** `api/v1/sales/serializers.py`, `views/b2b_views.py`.
1. `SaleOutputSerializer`: add `refunded_amount`, `net_amount` (`DecimalField(source="net_amount", read_only=True, max_digits=14, decimal_places=2)`), `public_token` **only for the owner/permitted staff** (it builds the public link), item field `pending_quantity`. Apply `CostVisibilityMixin` to the item serializer (T3.5). Remove `sold_by` raw id exposure if the UI doesn't use it (keep `sold_by_name`).
2. **New** `B2BIncomingSaleSerializer` + `B2BIncomingItemSerializer` — a strict whitelist; used by inbox list, accept and reject responses:
```python
class B2BIncomingItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product_variant.product.name")
    variant_name = serializers.CharField(source="product_variant.name")
    unit = serializers.CharField(source="product_variant.unit")
    pending_quantity = serializers.SerializerMethodField()

    class Meta:
        model = SaleItem
        fields = ["id", "product_name", "variant_name", "unit", "quantity", "unit_price",
                  "b2b_accepted_quantity", "b2b_rejected_quantity", "voided_quantity", "pending_quantity"]

    def get_pending_quantity(self, obj):
        return pending_quantity(obj)


class B2BIncomingSaleSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="tenant.name")
    net_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    items = B2BIncomingItemSerializer(many=True, read_only=True)

    class Meta:
        model = Sale
        fields = ["id", "receipt_number", "sender_name", "status", "currency", "total_amount",
                  "refunded_amount", "net_amount", "created_at", "b2b_expires_at", "items"]
```
   It must **not** contain: `cost_price`, `original_partner_price`, `sold_by*`, `voided_by*`, `void_reason`, branch/tenant addresses, counterparty data, `public_token`.
3. **Test:** a response to tenant B never contains any of the forbidden keys (walk the JSON recursively).

## T4.11 DebtService and debt payments
**File:** `apps/sales/services/debt_service.py`, `api/v1/sales/views/counterparty_views.py` (debt payment views).
1. `record_payment(*, counterparty, amount, currency, recorded_by, note="", idempotency_key=None, is_correction=False)`:
   - lock the counterparty (`select_for_update`); verify `counterparty.tenant_id` equals the acting tenant (the view passes it).
   - authority (updated D-17): allow tenant owner or active staff with explicit `sales.record_debt_payment`; always attribute actor, active tenant and current shift. Owner only may correct/cancel, using an audited compensating entry. Keep any existing platform_admin service guard without adding a new platform_admin route.
   - tender: store actual UZS method per payment (`cash`, `card`, `bank_transfer`, `customer_credit`); cash debt payment alone creates linked `CashIncome`. Card/bank/credit never increase drawer. One tender per payment row; split real collection into separate rows if needed.
   - validate `amount` (non-zero; ≤ 2 decimals; `max_digits=14`); corrections only with a non-empty `note`.
   - idempotency: if `idempotency_key` exists for the tenant return the stored payment; the unique constraint backs it up.
   - update balance with `save(update_fields=[...])`; write `DebtPayment`; `AuditLog` with new actions `DEBT_PAYMENT` / `DEBT_CORRECTION` (add to `AuditAction`) — ids and amounts only.
   - **Cash-only income hook (D-23, D-28).** Emit `debt_payment_recorded` only for positive cash tender, never for card/bank/customer-credit or correction. A receiver creates exactly one linked `CashIncome` in the same transaction; idempotency prevents duplicates. `apps/sales` must never import `apps/cashbox`.
2. Views: real payment entry → owner or explicit `sales.record_debt_payment`; correction/cancellation → `IsTenantOwner`; list → `sales.view_debts`. Serializer gains optional `idempotency_key` and tender method. Cashier payment links to their active shift.
3. `check_threshold_and_notify`: wrap Telegram dispatch in `transaction.on_commit(...)`; use one UZS threshold `DEBT_WARN_STEP_UZS`. Group messages exclude personal debt details; private details only go to owner-verified chat when tenant opt-in is enabled.
4. Fix `send_async_telegram_message_task`: its `autoretry_for=(Exception,)` never fires because `send_telegram_message` swallows errors. Make `send_telegram_message` **raise** `TelegramSendError` on failure (the sync fallback path catches it) and let the task use `autoretry_for=(TelegramSendError,)`, `retry_backoff=True`, `max_retries=5`.
**Tests:** staff without permission cannot record; authorized cashier can record actual tender and shift; only cash writes linked income; card/bank/customer-credit leave drawer unchanged; only owner corrects; overpayment/refund credit follows D-17/G-24; duplicate `idempotency_key` → one row; concurrent payments sum correctly.

## T4.12 Invariant & concurrency test suite (mandatory)
Create `apps/sales/tests/test_invariants.py` with a helper:
```python
def assert_conserved(sale_graph):
    """For every item: voided+accepted+rejected+pending == quantity, no bucket negative.
    For the whole system: A_stock_now + sum(b2b_accepted) == A_stock_initial (goods are never created/destroyed)."""
```
plus a randomized scenario runner: apply a random sequence of {accept(partial), reject(partial), void_item, void_sale, expire} to a B2B sale (seeded RNG, 200 iterations, each op may legitimately fail with a service error) and call `assert_conserved` after each step. Also run 2–4 threads doing conflicting operations (`transaction=True`) and assert the same invariant at the end.
**Acceptance for Phase 4:** all tests green; running the randomized runner with 5 different seeds never breaks the invariant; `grep -rn "total_amount" apps/sales/services | grep -v "refunded\|net"` shows no code that *mutates* `total_amount` after creation.

## T4.13 Public receipt (D-26)
1. New view `PublicReceiptView` at `GET /api/v1/public/receipts/<token>/` (`permission_classes=[AllowAny]`, `authentication_classes=[]`), lookup **only** by `public_token`. Delete the old receipt-number lookup view and its URL.
2. `PublicReceiptSerializer` whitelist: `receipt_number, created_at, currency, total_amount, refunded_amount, net_amount, payment_type, status, shop{name,address,phone,header,footer}, items[{name, unit, quantity, unit_price, total_price}]`. **No** counterparty, cashier, branch, ids, cost.
3. Throttle: class `PublicReceiptThrottle(AnonRateThrottle)` with `scope = "public_receipt"`, rate `30/min`. In settings: `NUM_PROXIES = 1`, `DEFAULT_THROTTLE_RATES["public_receipt"] = "30/min"`, and a Redis-backed `CACHES["default"]` (`django.core.cache.backends.redis.RedisCache`, `LOCATION=REDIS_URL`; in `settings_test.py` use `LocMemCache`). nginx must overwrite the header: `proxy_set_header X-Forwarded-For $remote_addr;` (T9.3).
4. Unknown token → 404 with a generic body (no hints).
5. **Frontend:** route `/r/:token` (`PublicReceiptView.jsx`); the QR code on `ReceiptSlip.jsx` encodes `${PUBLIC_BASE_URL}/r/${sale.public_token}`; add `PUBLIC_BASE_URL` to settings/env/`.env.example`.
6. Receipt layout (slip and A4): show **Jami** (`total_amount`), and if `refunded_amount > 0` two extra lines: `Qaytarildi: -<refunded>` and `Sof summa: <net>`.
**Tests:** valid token returns the receipt; changing one character → 404; response contains no forbidden keys; 31st request within a minute → 429.

## T4.14 Frontend work for Phase 4
Files under `frontend/ilbi/src/`: `pages/Sales*.jsx` / sale detail (show refunded + net; item pending/accepted columns), B2B inbox page (single price per item; per item: pending, accepted; **accept now / later** with a quantity input per item; reject with reason, optionally per item; expiry countdown), counterparties page (own-tenant select; "B2B ulash" by tenant code; incoming link requests tab), debt page (returned-goods tab, owner-only payment form with `idempotency_key` generated via `crypto.randomUUID()` per submit attempt; under the form show the hint "Bu summa kassada avtomatik «qo'shimcha kirim» sifatida yoziladi"), `ReceiptSlip.jsx`/`InvoiceA4Modal.jsx` (refund lines), notifications (use `notification.data` for links; keep `message` as fallback), movement-type label `sotuv_qaytarildi`. Hide cost/profit columns unless `/auth/me/` permissions include `catalog.view_cost_price` or `*`.
**Acceptance:** manual script in `docs/` that walks: send B2B → partial accept → later accept → expire → check stock on both tenants and debt screen.


---
---
# PHASE 5 — CASHBOX, TIME ZONE, SCHEDULED REPORTS

Goal (D-22, D-23): correct shift (smena) arithmetic, race-free closing, no UTC/Tashkent drift, no duplicate or crashing reports.
Dependencies: Phase 1 (no branches), Phase 4 (`refunded_amount`, `SaleVoidLog.kind/amount`).

## T5.1 Time zone = Asia/Tashkent
1. `config/settings.py`: `TIME_ZONE = "Asia/Tashkent"`, `USE_TZ = True`; `CELERY_TIMEZONE = TIME_ZONE`, `CELERY_ENABLE_UTC = True`. In `settings_test.py` keep the same zone.
2. Replace UTC-based "today" logic everywhere. Search and fix every hit:
```
grep -rnE "timezone\.now\(\)\.date\(\)|datetime\.now\(|date\.today\(|timezone\.now\(\)\.time\(\)|default=timezone\.now" ilbi --include=*.py | grep -v "/migrations/\|/tests/"
```
   Rules: a *calendar date* → `timezone.localdate()`; a *local time of day* → `timezone.localtime().time()`; start of a local day → `timezone.make_aware(datetime.combine(d, time.min))` (uses the project zone); `DateField(default=timezone.now)` → `DateField(default=timezone.localdate)` (callable, no parentheses). Places known to need it: `cashbox_service.py`, `cashbox/models.py` (`date` fields), `cashbox/tasks.py`, `inventory/tasks.py`, `analytics_service.resolve_date_range`, receipt number (done in T4.9).
3. Frontend: UTC date bug pattern `new Date().toISOString().slice(0,10)` → `new Date().toLocaleDateString("en-CA")` (gives local `YYYY-MM-DD`). `grep -rn "toISOString().slice\|toISOString().split" frontend/ilbi/src`.
4. Migrations for changed field defaults (`makemigrations`).
**Tests:** with `freezegun` (add to dev deps) at `2026-10-10 20:30 UTC` (= 01:30 on 10-11 in Tashkent): shift date, expense default date and receipt number all use `2026-10-11`; "today" dashboard range starts at local midnight.
**Acceptance:** no remaining hit of the grep above that represents a calendar date/time-of-day decision.

## T5.2 Shift arithmetic (rewrite of `CashboxService`)
**Model changes** (`apps/cashbox/models.py`; branch already removed in T1.7):
```python
class DailyCashReport(BaseModel):
    date = models.DateField(default=timezone.localdate)
    shift_start = models.DateTimeField(null=True, blank=True)            # window start, for traceability
    closed_at = models.DateTimeField(default=timezone.now)               # was auto_now_add: we now set it explicitly
    # New UZS columns for actual cash refund and count reconciliation; no retail USD drawer.
    total_refunds_cash_uzs = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    # keep all existing total_*/expected_*/actual_*/discrepancy_* fields
```
`CashExpense.date` and `CashIncome.date` use `default=timezone.localdate`.

**CashIncome — two new fields** (existing fields: `amount, source, note, recorded_by, shift_report, date`; UZS only) so the system can create and recognise actual cash debt receipts (D-28):
```python
debt_payment = models.OneToOneField(
    "sales.DebtPayment", null=True, blank=True, on_delete=models.PROTECT, related_name="cash_income"
)                                       # at most ONE income per payment (idempotency + traceability)
is_system = models.BooleanField(default=False)   # True = created automatically, users cannot create/edit such rows
```
Expose `is_system` (read-only) in the CashIncome output serializer. There are no edit/delete endpoints for incomes and none may be added.

**CashDrawerMovement (new, UZS-only):** record the opening float (`opening_float`), documented additions (`cash_add`), removal (`cash_remove`) and inkassatsiya (`inkassatsiya`) with tenant, shift, positive amount, required reason, actor and timestamp. Opening float is entered once when opening a shift; removals/additions never masquerade as sales/refunds. Closing requires a physical count; show expected vs counted and require a reason for discrepancy. Protect mutations with explicit cashbox permissions and append-only audit.

**Cash income for cash debt payments only (D-23, D-28).**
```python
# apps/cashbox/services/cashbox_service.py
@classmethod
def record_income_from_debt_payment(cls, *, payment, user) -> CashIncome:
    """Create the cash income that mirrors a debt payment. Called only by the signal receiver below,
    inside the DebtService transaction. Field names of DebtPayment: read the model first and adapt."""
    if payment.is_correction or payment.method != "cash" or payment.amount <= Decimal("0.00"):
        raise CashboxServiceError("Faqat haqiqiy naqd qarz to'lovi kassaga kirim bo'ladi.")
    extra = f". {payment.note}" if payment.note else ""
    return CashIncome.objects.create(
        tenant=payment.tenant,
        recorded_by=user,
        amount=payment.amount,
        source="Qarz to'lovi",                                        # max_length of `source` is 100
        note=f"{payment.counterparty.name} — qarz to'lovi (#{payment.id}){extra}",
        date=timezone.localdate(),
        debt_payment=payment,
        is_system=True,
    )
```
```python
# apps/cashbox/signals.py   (new file)
from django.dispatch import receiver
from apps.sales.signals import debt_payment_recorded
from apps.cashbox.services.cashbox_service import CashboxService


@receiver(debt_payment_recorded)
def create_cash_income_for_debt_payment(sender, payment, user, **kwargs):
    if payment.is_correction or payment.method != "cash" or payment.amount <= 0:
        return                                  # corrections never touch the cashbox (Appendix C-22)
    CashboxService.record_income_from_debt_payment(payment=payment, user=user)
```
```python
# apps/cashbox/apps.py
class CashboxConfig(AppConfig):
    def ready(self):
        from apps.cashbox import signals  # noqa: F401  (connects the receiver)
```
(Keep the existing `AppConfig` attributes; only add `ready`. Make sure `INSTALLED_APPS` uses the config class.) Cash income is created only for a cash tender at payment time. Non-cash payments never affect expected drawer cash.

**Formula (the heart of D-23).** The shift window is `(start, end]` where `start` = prior closing (or local midnight if none) and `end` = computation time. Retail drawer accounting is UZS only:
```
cash_gross      = Σ actual cash portions of sales created in window
cash_refunds    = Σ actual cash refund portions paid in window, linked to original tender
cash_debt       = Σ positive cash DebtPayment rows in window (count linked CashIncome only once)
opening_float   = opening cash recorded for the shift
drawer_adds     = Σ documented cash additions to drawer
drawer_removals = Σ documented cash removal/inkassatsiya
other_income    = Σ CashIncome not already counted as cash_debt
expenses        = Σ CashExpense actually paid from drawer
expected_cash   = opening_float + drawer_adds + cash_gross − cash_refunds + cash_debt + other_income − drawer_removals − expenses
```
Why: sale totals remain stable; refunds affect the drawer when cash physically leaves. Each cash debt receipt is represented exactly once. This is a management shift report, not an official Z-report; official provider output is shown separately.

**Target code** (keep the public method names and the **returned dict keys** of the existing `get_current_shift_status`; add the new keys `total_refunds_cash_*`, `total_refunds_card_*`, `incomes`, `expenses` lists stay):
```python
class CashboxService:
    @staticmethod
    def _sum(qs, field="amount") -> Decimal:
        return qs.aggregate(s=Sum(field))["s"] or Decimal("0.00")

    @classmethod
    def _window(cls, tenant, end):
        last = DailyCashReport.objects.filter(tenant=tenant).order_by("-closed_at").first()
        if last:
            return last.closed_at
        today = timezone.localdate(end)
        return timezone.make_aware(datetime.combine(today, time.min))

    @classmethod
    def compute_totals(cls, tenant, start, end) -> dict:
        out = {}
        sales = Sale.objects.filter(tenant=tenant, created_at__gt=start, created_at__lte=end)
        payments = SalePayment.objects.filter(tenant=tenant, created_at__gt=start, created_at__lte=end)
        cash_sales = cls._sum(payments.filter(method="cash"), "amount")
        cash_refunds = cls._sum(RefundPayment.objects.filter(
            tenant=tenant, method="cash", paid_at__gt=start, paid_at__lte=end), "amount")
        cash_debt = cls._sum(DebtPayment.objects.filter(
            tenant=tenant, method="cash", is_correction=False, created_at__gt=start, created_at__lte=end), "amount")
        drawer = CashDrawerMovement.objects.filter(tenant=tenant, created_at__gt=start, created_at__lte=end)
        other_income = cls._sum(CashIncome.objects.filter(
            tenant=tenant, debt_payment__isnull=True, created_at__gt=start, created_at__lte=end))
        expenses = cls._sum(CashExpense.objects.filter(tenant=tenant, created_at__gt=start, created_at__lte=end))
        out["total_sale_cash_uzs"] = cash_sales
        out["total_refunds_cash_uzs"] = cash_refunds
        out["total_sale_debt_uzs"] = cls._sum(sales.filter(payment_type=Sale.PAYMENT_DEBT), "total_amount")
        out["total_sale_card_uzs"] = cls._sum(payments.filter(method__in=["card", "bank_transfer"]), "amount")
        out["total_extra_income_uzs"] = other_income + cash_debt
        out["total_expenses_uzs"] = expenses
        out["expected_cash_uzs"] = (
            cls._sum(drawer.filter(kind="opening_float"), "amount")
            + cls._sum(drawer.filter(kind="cash_add"), "amount")
            + cash_sales - cash_refunds + cash_debt + other_income
            - cls._sum(drawer.filter(kind__in=["cash_remove", "inkassatsiya"]), "amount")
            - expenses
        )
        return out

    @classmethod
    def get_current_shift_status(cls, tenant) -> dict:
        end = timezone.now()
        start = cls._window(tenant, end)
        totals = cls.compute_totals(tenant, start, end)
        incomes = CashIncome.objects.filter(tenant=tenant, created_at__gt=start, created_at__lte=end)
        expenses = CashExpense.objects.filter(tenant=tenant, created_at__gt=start, created_at__lte=end)
        has_activity = (Sale.objects.filter(tenant=tenant, created_at__gt=start, created_at__lte=end).exists()
                        or incomes.exists() or expenses.exists()
                        or SaleVoidLog.objects.filter(tenant=tenant, voided_at__gt=start, voided_at__lte=end).exists())
        return {"is_open": has_activity, "status": "OPEN" if has_activity else "CLOSED",
                "shift_start": timezone.localtime(start).strftime("%Y-%m-%d %H:%M:%S"),
                **totals,
                "incomes": [...], "expenses": [...]}      # keep the same item dicts as today
```
**`close_shift` target:**
```python
@classmethod
def close_shift(cls, *, tenant, user, actual_cash_uzs, actual_cash_usd, discrepancy_reason="", staff_notes=""):
    if actual_cash_uzs < 0 or actual_cash_usd < 0:
        raise CashboxServiceError("Amaldagi naqd pul manfiy bo'lishi mumkin emas.")
    with transaction.atomic():
        advisory_xact_lock(1002, str(tenant.id))                  # one close at a time per tenant
        end = timezone.now()                                      # taken AFTER the lock
        start = cls._window(tenant, end)
        status = cls.get_current_shift_status_at(tenant, start, end)   # same as above but with explicit window
        if not status["is_open"]:
            raise CashboxServiceError("Yopiladigan smena harakati yo'q.")
        ... discrepancy logic as today (keep reason handling) ...
        report = DailyCashReport.objects.create(
            tenant=tenant, closed_by=user, date=timezone.localdate(end), shift_start=start, closed_at=end,
            **{k: status[k] for k in TOTAL_KEYS}, expected_cash_uzs=..., actual_cash_uzs=..., discrepancy_uzs=..., ...)
        # link by TIME window (same window as the sales), not by "shift_report IS NULL"
        CashIncome.objects.filter(tenant=tenant, created_at__gt=start, created_at__lte=end).update(shift_report=report)
        CashExpense.objects.filter(tenant=tenant, created_at__gt=start, created_at__lte=end).update(shift_report=report)
        if has_discrepancy: AuditService.log(... CASH_DISCREPANCY ... as today ...)
        if tenant.notify_web_reports:
            Notification.objects.create(tenant=tenant, recipient=tenant.owner, type=Notification.TYPE_DAILY_Z_REPORT,
                title=f"Smena hisoboti (#{report.id})", message=ReportFormatter.text(report), data={"report_id": report.id})
        transaction.on_commit(lambda: cls._dispatch_shift_report(report.id))
    return report
```
(`TOTAL_KEYS` = all `total_*` and `expected_cash_*` keys.) Because `closed_at = end` and the next window starts at `end` with `created_at__gt`, **no sale can fall between two shifts** and none is counted twice.

**`_dispatch_shift_report(report_id)`** (classmethod, runs after commit, **loads everything itself** — this removes the old `UnboundLocalError` where `owner` was defined only inside `if notify_web_reports`):
```python
report = DailyCashReport.objects.select_related("tenant__owner").get(pk=report_id)
tenant, owner = report.tenant, report.tenant.owner
if tenant.shift_report_target == Tenant.TARGET_NONE:
    return
text = ReportFormatter.text(report)
if tenant.shift_report_target in (Tenant.TARGET_PERSONAL, Tenant.TARGET_BOTH):
    contact = TelegramContact.objects.filter(phone_number=owner.phone_number).first()
    if contact:
        send_async_telegram_message_task.delay(contact.chat_id, text)
if tenant.shift_report_target in (Tenant.TARGET_GROUP, Tenant.TARGET_BOTH) and tenant.telegram_group_id:
    send_async_telegram_message_task.delay(tenant.telegram_group_id, text)
```
**Deduplicate formatting:** create `apps/cashbox/services/report_formatter.py` with one `ReportFormatter.text(report)`; delete `format_daily_report_message`, `format_daily_telegram_report` and the third copy inside `cashbox/tasks.py`. The text now includes the line **Qaytarilgan naqd** (cash refunds). Escape user-supplied text (category, notes) for Telegram Markdown with a helper `escape_md(text)` (escape `_ * [ ] ( ) ~ \` > # + - = | { } . !` as required by the mode you use).
**Tests (`apps/cashbox/tests/`):**
1. cash sale 100 000 in shift 1 (closed) → void in shift 2 → shift 2 `expected_cash` is −100 000 relative to its own flows; shift 1 report unchanged.
2. cash sale 100 000 and partial void 40 000 in the *same* shift → expected cash +60 000.
3. recording a cash debt payment of 50 000 creates exactly one linked `CashIncome` and increases expected cash once; card/bank/customer-credit payments create no cash income; correction creates none; duplicate idempotency remains one record. This appears in a management shift report, never labeled official Z-report without provider output.
4. two threads calling `close_shift` → exactly one succeeds, the second raises (empty window); no row falls in a gap: create sales at `end − 1ms`, `end`, `end + 1ms` and check each is counted in exactly one window.
5. `notify_web_reports=False` + `shift_report_target="both"` → closing works, Telegram tasks enqueued, no exception.
6. all retail drawer totals are UZS only and reconcile against opening float, actual tender portions, refunds, cash movements, expenses and counted cash.
**Acceptance:** all tests pass; manual: closing from two browser tabs gives one report.

## T5.3 Views / serializers / frontend of the cashbox
- `api/v1/cashbox/serializers.py`: add the new report fields; permissions from T3.3; list endpoints paginated (T3.7).
- Expense/income creation: reject `date` more than 31 days in the past or in the future (`ValidationError`), reject amounts with > 2 decimals.
- `frontend/ilbi/src/pages/Shifts.jsx`: show the new line (refunds); automatic debt-payment incomes appear in the incomes list with a read-only badge "Avtomatik" (`is_system`) and no edit controls; hide "Smenani yopish" without `cashbox.close_shift`, display times in local zone, remove branch UI (done T1.8). The signature step is rebuilt in T8.4.

## T5.4 Scheduled reports (fix duplicates, local time, catch-up)
**Models:** `Tenant.last_daily_report_sent_on = models.DateField(null=True, blank=True)`.
**`apps/cashbox/tasks.py`:**
```python
@shared_task(name="apps.cashbox.tasks.check_and_send_daily_reports_task")
def check_and_send_daily_reports_task():
    now = timezone.localtime()
    today = now.date()
    due = (Tenant.objects.filter(is_active=True, daily_report_time__lte=now.time())
           .exclude(daily_report_target=Tenant.TARGET_NONE)
           .exclude(last_daily_report_sent_on=today))
    for tenant_id in due.values_list("id", flat=True):
        # atomic claim: only the worker that flips the date sends
        claimed = (Tenant.objects.filter(pk=tenant_id).exclude(last_daily_report_sent_on=today)
                   .update(last_daily_report_sent_on=today))
        if claimed:
            send_daily_report_for_tenant_task.delay(tenant_id)
```
(If the worker was down at 22:00 and comes back at 22:40 the report still goes out once; it never fires twice.)
`send_daily_report_for_tenant_task`: use `ReportFormatter` and `CashboxService.get_current_shift_status(tenant)` (no branch), date in local zone.
**Low-stock report** (`apps/inventory/tasks.py`): same pattern — compare in local time with `timezone.localtime()`, claim atomically with a conditional `UPDATE` on `last_low_stock_report_sent_at` (period start computed in local time per `low_stock_frequency`), remove the hour/minute-window comparison.
**Tests:** beat tick twice within the window → one send; tick after the due time → one send; next day → another send; DST irrelevant (no DST in Uzbekistan) but test with frozen local times.

---
---
# PHASE 6 — ANALYTICS: REFUND-AWARE AND OWNER-WIDE (D-09)

Dependencies: Phases 2, 4, 5.

## T6.1 Make analytics refund-aware and timezone-correct
**File:** `apps/analytics/services/analytics_service.py` (read fully). Because `Sale.total_amount` no longer changes:
- Revenue of a sale = `net_amount` = `total_amount − refunded_amount` (use `F("total_amount") - F("refunded_amount")` in aggregates). Exclude `status == voided` rows from counts of "sales".
- Item-level quantities sold = `quantity − voided_quantity − b2b_rejected_quantity` (pending and accepted B2B quantities count as sold); profit = Σ (`unit_price − cost_price`) × that quantity.
- B2B: revenue recognised for quantities that are not returned (same formula).
- Replace `timezone.now().date()` by `timezone.localdate()` in `resolve_date_range`; convert range ends with `make_aware(datetime.combine(d, time.min / time.max))`.
- Remove any branch parameter.
- Profit/cost fields only returned when `can_view_profit` (T3.3/T3.5).
**Tests:** a 100 000 sale with 40 000 returned counts 60 000 revenue; "today" includes a sale made at 01:30 local.

## T6.2 Owner overview endpoint
`GET /api/v1/analytics/owner-overview/?date_from=&date_to=` — `permission_classes = [IsActiveOwner]` (defined in T2.5; no tenant header needed; the endpoint spans **all active tenants owned by the user**).
**Service** `apps/analytics/services/owner_overview_service.py`:
```python
class OwnerOverviewService:
    @staticmethod
    def build(owner, date_from, date_to) -> dict:
        tenants = list(Tenant.objects.filter(owner=owner, is_active=True).order_by("name"))
        rows, totals = [], {"UZS": defaultdict(Decimal), "USD": defaultdict(Decimal)}
        for t in tenants:
            summary = AnalyticsService.get_dashboard_summary(tenant=t, date_from=date_from, date_to=date_to)
            rows.append({"tenant_id": t.id, "name": t.name, "summary": summary})
            # Read get_dashboard_summary's real return shape and add every NUMERIC per-currency figure
            # (revenue, refunds, profit, debt, cash expected, ...) into totals[<currency>][<key>].
            # NEVER add UZS and USD together.
        return {"period": {"from": date_from, "to": date_to},
                "tenants": rows,
                "totals_by_currency": {c: dict(v) for c, v in totals.items()}}
```
Also include per tenant: total counterparty debt (`Counterparty` balances), low-stock count, last closed shift time. Cap at `MAX_TENANTS_PER_OWNER` tenants (N queries are acceptable at ≤ 10; add `django_assert_max_num_queries`).
**Frontend:** `pages/OwnerOverview.jsx` (route `/overview`, visible for role `owner`): table of tenants + totals per currency; clicking a row switches the active tenant and opens its dashboard. Single-tenant dashboard stays as is (`/dashboard`).
**Tests:** owner of 2 tenants sees both; another owner's tenants never leak; staff gets 403; totals per currency equal the sum of the rows.


---
---
# PHASE 7 — AUTHENTICATION HARDENING

Goal (D-24): throttle that cannot be bypassed or abused, safe password reset, no information leaks, race-free user updates, revocable sessions.
Dependencies: Phase 3 (employment checks), Phase 2 (token claims). Shared Redis helper first.

## T7.0 One shared Redis client
Several modules create their own module-level `redis.Redis.from_url(...)` without timeouts (login_throttle, otp_services, password_reset_service). Create `apps/core/redis_client.py`:
```python
import redis
from django.conf import settings

_client = None

def get_redis() -> redis.Redis:
    """Process-wide Redis client with sane timeouts. Created lazily (never at import time)."""
    global _client
    if _client is None:
        _client = redis.Redis.from_url(
            settings.REDIS_URL, decode_responses=True,
            socket_timeout=2, socket_connect_timeout=2, health_check_interval=30,
        )
    return _client
```
Replace the three module-level clients with `get_redis()`. Auth flows **fail closed** if Redis is down (return 503 with a generic message), never "allow".

## T7.1 Login throttle rewrite (`apps/accounts/services/login_throttle.py`)
**Problems being fixed:** keyed by raw identifier (3 counters per account; permanent ban only worked for the `username` form), non-atomic check/register (parallel guessing), `stage` key without TTL, anonymous users could permanently ban any account.
**Design:**
- Identifier is **resolved first** (T7.2) to a normalized key: phone (normalized), lower-cased e-mail or lower-cased username. Throttle keys use that key + client IP: `login:fail:{ip}:{key}`.
- Attempts are counted **atomically before** the password is verified (so parallel requests cannot exceed the limit), and the counter is deleted on success.
- 5 failures within 15 min ⇒ lock for 15 min; repeated locks escalate 1 h, 6 h, 24 h (cap). **No permanent ban.**
- Additionally an **account-level** counter across all IPs (`login:acct:{user_id}`): > 30 failures in 1 h ⇒ the account is locked for 1 h and the owner gets one Telegram alert (rate-limited with `SET NX EX 3600`).
```python
import hashlib
from django.conf import settings
from apps.core.redis_client import get_redis

LUA_INCR_EXPIRE = """
local c = redis.call('INCR', KEYS[1])
if c == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return c
"""
FAIL_LIMIT, FAIL_WINDOW = 5, 15 * 60
LOCK_STEPS = (15 * 60, 60 * 60, 6 * 3600, 24 * 3600)
ACCOUNT_LIMIT, ACCOUNT_WINDOW = 30, 3600


class LoginThrottle:
    @staticmethod
    def _k(kind, ip, key):
        return f"login:{kind}:{ip}:{key}"

    @classmethod
    def begin_attempt(cls, *, ip: str, key: str, user_id: int | None) -> int | None:
        """Call BEFORE verifying credentials. Returns seconds to wait if locked, else None.
        Counts this attempt atomically."""
        r = get_redis()
        lock_key = cls._k("lock", ip, key)
        ttl = r.ttl(lock_key)
        if ttl and ttl > 0:
            return ttl
        if user_id:
            acct_lock = f"login:acctlock:{user_id}"
            ttl = r.ttl(acct_lock)
            if ttl and ttl > 0:
                return ttl
        n = int(r.eval(LUA_INCR_EXPIRE, 1, cls._k("fail", ip, key), FAIL_WINDOW))
        if n > FAIL_LIMIT:
            stage_key = cls._k("stage", ip, key)
            stage = int(r.incr(stage_key))
            r.expire(stage_key, 7 * 86400)                     # stage ALWAYS has a TTL
            duration = LOCK_STEPS[min(stage - 1, len(LOCK_STEPS) - 1)]
            r.set(lock_key, 1, ex=duration)
            r.delete(cls._k("fail", ip, key))
            return duration
        if user_id:
            m = int(r.eval(LUA_INCR_EXPIRE, 1, f"login:acct:{user_id}", ACCOUNT_WINDOW))
            if m > ACCOUNT_LIMIT:
                r.set(f"login:acctlock:{user_id}", 1, ex=3600)
                if r.set(f"login:acctalert:{user_id}", 1, nx=True, ex=3600):
                    cls._alert_owner(user_id)                  # Telegram message, see below
                return 3600
        return None

    @classmethod
    def register_success(cls, *, ip: str, key: str, user_id: int | None):
        r = get_redis()
        r.delete(cls._k("fail", ip, key), cls._k("stage", ip, key))
        if user_id:
            r.delete(f"login:acct:{user_id}")

    @classmethod
    def clear_all_for_user(cls, user):
        """Used by the platform_admin 'unlock' endpoint: delete every lock/counter of this account."""
        r = get_redis()
        for key in {user.phone_number, (user.username or "").lower(), (user.email or "").lower()} - {""}:
            for pattern in (f"login:*:*:{key}",):
                for k in r.scan_iter(match=pattern, count=200):
                    r.delete(k)
        r.delete(f"login:acct:{user.id}", f"login:acctlock:{user.id}", f"login:acctalert:{user.id}")
```
`_alert_owner(user_id)` sends (via `send_async_telegram_message_task.delay`) "Hisobingizga ko'p marta kirishga urinildi. Bu siz bo'lmasangiz, parolni almashtiring." to the account owner's Telegram contact (for staff: to the tenant owner). Never include the IP list or the attempted identifier.
**Login view changes** (`api/v1/accounts/views/admin_login.py`):
```python
ip = get_client_ip(request) or "unknown"
user, key = resolve_user(identifier)                 # T7.2
wait = LoginThrottle.begin_attempt(ip=ip, key=key, user_id=user.id if user else None)
if wait:
    resp = Response({"detail": "Juda ko'p urinish. Keyinroq urinib ko'ring."}, status=429)
    resp["Retry-After"] = str(wait)
    return resp
ok = check_password(password, user.password if user else DUMMY_HASH)     # constant-time-ish: always hash once
if not (user and ok and user.is_active and is_active_member(user)):      # same generic 401 for every failure
    AuditService.log(action=AuditAction.LOGIN_ATTEMPT, actor=user, ... description="failed", ip) if user else None
    return Response({"detail": "Login yoki parol noto'g'ri."}, status=401)
```
`DUMMY_HASH = make_password("x" * 12)` computed once at import. **Do not** return a different status/message for banned/inactive accounts (that was a password oracle). Remove the "from this device" wording.
**Unlock endpoint** (`unban.py`): platform_admin only; calls `LoginThrottle.clear_all_for_user(user)`; does **not** touch `is_active`; writes an `AuditLog` (new action `LOGIN_UNLOCK`).
**Audit:** log with `AuditAction.LOGIN_ATTEMPT` (success and failure for *existing* users only, ids and IP, no passwords/identifiers) and new `LOGIN_LOCKOUT` when a lock is created.
**Tests (`test_login_throttle.py`):** 6th wrong attempt → 429 + `Retry-After`; **same account via username, e-mail and phone share one counter** (all three forms resolve to the same key); 50 parallel wrong attempts produce at most `FAIL_LIMIT` password checks (patch `check_password` to count); success resets counters; Redis keys always have a TTL (`assert r.ttl(k) > 0`); unknown username and wrong password produce byte-identical responses; unlock clears all keys.

## T7.2 Identifier resolution and username rules
**Create** `apps/accounts/services/identifier.py`:
```python
import re
from apps.accounts.models import User
from apps.accounts.services.phone_utils import normalize_phone_number

PHONE_RE = re.compile(r"^\+?\d[\d\s\-()]{7,}$")

def resolve_user(raw: str):
    """Return (user_or_None, normalized_key). The three namespaces are disjoint:
    contains '@' -> e-mail; looks like a phone number -> phone; otherwise -> username."""
    raw = (raw or "").strip()
    if not raw:
        return None, ""
    if "@" in raw:
        return User.objects.filter(email__iexact=raw).first(), raw.lower()
    if PHONE_RE.match(raw):
        phone = normalize_phone_number(raw)
        return User.objects.filter(phone_number=phone).first(), phone
    return User.objects.filter(username__iexact=raw).first(), raw.lower()
```
**Username validation** (`apps/accounts/services/username_rules.py`) — used by reset-confirm and any place a username is set:
```python
USERNAME_RE = re.compile(r"^[a-z][a-z0-9_.]{2,29}$")           # starts with a letter => never looks like a phone; no '@'
RESERVED = {"admin", "root", "support", "ilbi", "platform", "owner", "staff", "system", "null", "none"}

def validate_username(value: str, *, exclude_user=None) -> str:
    v = (value or "").strip().lower()
    if not USERNAME_RE.match(v) or v in RESERVED:
        raise ValueError("Username noto'g'ri (3-30 belgi, lotin harfi bilan boshlanishi, faqat a-z 0-9 _ .).")
    qs = User.objects.filter(username__iexact=v)
    if exclude_user is not None:
        qs = qs.exclude(pk=exclude_user.pk)
    if qs.exists():
        raise ValueError("Bu username band.")
    return v
```
**DB:** `UniqueConstraint(Lower("username"), name="unique_username_ci", condition=Q(username__isnull=False))` on `User`; store usernames lower-cased (normalize in `save()`/manager).
**Tests:** `Alice` and `alice` collide; `+998901234567`, `a@b.c`, `admin`, `12345` rejected as usernames; all three login forms of one account resolve to the same user.

## T7.3 OTP & two-step login binding
**OTP** (`apps/accounts/services/otp_services.py`; keep existing public function names and return strings, read the file first):
```python
import hmac

def verify_code(phone_number, code):
    r = get_redis()
    attempts_key, code_key = f"otp:attempts:{phone_number}", f"otp:code:{phone_number}"
    n = r.incr(attempts_key)
    if n == 1:
        r.expire(attempts_key, OTP_TTL)
    if n > MAX_ATTEMPTS:
        return TOO_MANY_ATTEMPTS
    stored = r.get(code_key)
    if stored is None:
        return EXPIRED
    if not hmac.compare_digest(stored, str(code)):           # constant-time compare
        return WRONG
    if r.execute_command("GETDEL", code_key) is None:        # atomic consume: only one request wins
        return EXPIRED
    r.delete(attempts_key)
    return OK
```
(Use the module's real constant names. Requires Redis ≥ 6.2 — already `redis:7` in compose.)
- Daily cap per phone: before sending a new OTP, `n = eval(LUA_INCR_EXPIRE, key=f"otp:daily:{phone}", 86400)`; if `n > 10` → respond 429 (prevents Telegram spam to a victim).
- The OTP message text must use `OTP_TTL // 60` minutes instead of a hard-coded "3".
**Binding step 1 → Telegram gate → OTP.** Owner's later requirement for account activation and normal login supersedes immediate OTP delivery after password verification. Step 1 (password or one-time setup link OK) creates a **login ticket** without sending any code:
```python
def create_ticket(user, login_identifier=None) -> str:
    ticket = secrets.token_urlsafe(32)
    h = hashlib.sha256(ticket.encode()).hexdigest()
    proof = {"user_id": user.id, "phone_number": user.phone_number,
             "token_version": user.token_version, "login_identifier": login_identifier}
    get_redis().set(f"admin_login:ticket:{h}", json.dumps(proof), ex=1800)
    return ticket

def consume_ticket(ticket: str) -> bool:
    h = hashlib.sha256(ticket.encode()).hexdigest()
    return get_redis().getdel(f"admin_login:ticket:{h}") is not None
```
Step 1 returns `{"login_ticket": ticket, ...}`. The dedicated Telegram gate checks `{login_ticket}` against the current bot's contact binding; old bot rows are stale. The code is sent only by an explicit `{login_ticket}` request after the contact is linked. The pre-OTP ticket may remain valid for up to 30 minutes while the user opens the bot; successful OTP sending shortens its remaining lifetime to at most 300 seconds. Step 3 (`verify-otp`) takes `{login_ticket, verification_code}` — **no identifier any more**. It peeks the ticket (GET), verifies the OTP for that user's phone, and only on success consumes the ticket (GETDEL) and issues tokens. After 5 wrong codes delete the ticket. This guarantees an OTP obtained any other way cannot replace the password step. On refresh or ticket expiry after setup-link consumption, the user returns to normal login with the newly set password.
**Tests:** step 2 without a ticket fails; ticket is single-use; expired ticket fails; OTP parallel verification → exactly one success.

## T7.4 Password reset rewrite (`password_reset_service.py`, views, templates)
**Fixes:** token (and URL) were logged; tokens stored in clear as Redis keys; old tokens stayed valid; username overridden/unvalidated; token consumed before validation; anonymous enumeration (masked e-mail hint); HTML injection; `user.employees` wrong related name; e-mail lookup ambiguity.
1. **Request endpoint is uniform and asynchronous.** View always returns `200 {"detail": "Agar bunday hisob mavjud bo'lsa, ko'rsatmalar yuborildi."}` — same body/time for unknown, unusable, cooldown, no-email cases. It only enqueues `request_password_reset_task.delay(identifier_key)`. (The old `request_password_reset_with_hint` and the `has_email/email_hint` response fields are removed; frontend must stop reading them.)
2. **Task does the work** (raw token never travels through the broker):
```python
@shared_task(name="apps.accounts.tasks.request_password_reset_task")
def request_password_reset_task(identifier_key: str):
    user, _ = resolve_user(identifier_key)
    if not user or not user.email or not user.is_active:
        return
    if user.role != "platform_admin" and not is_active_member(user):       # active Employee required
        return
    if not _cooldown_ok(user.id) or not _daily_cap_ok(user.id, cap=5):     # 60 s cooldown, 5/day
        return
    token = store_reset_token(user.id, purpose="reset_password")
    send_reset_email(user, token, purpose="reset_password")
```
3. **Token storage — hashed, single active token per user:**
```python
def store_reset_token(user_id: int, purpose: str) -> str:
    r = get_redis()
    token = secrets.token_urlsafe(32)
    h = hashlib.sha256(token.encode()).hexdigest()
    old = r.get(f"pwd_reset_user:{user_id}")
    pipe = r.pipeline()
    if old:
        pipe.delete(f"pwd_reset:{old}")                                  # previous link dies
    pipe.setex(f"pwd_reset:{h}", RESET_TTL, json.dumps({"user_id": user_id, "purpose": purpose}))
    pipe.setex(f"pwd_reset_user:{user_id}", RESET_TTL, h)
    pipe.execute()
    return token
```
   Also delete `pwd_reset_user:{id}` and the token key after a successful reset (all other tokens are therefore invalid).
4. **Confirm flow order:** `peek` (no consume) → load user → `is_active_member` re-check (T3.6) → `django.contrib.auth.password_validation.validate_password(new_password, user)` → username rules (only when the purpose is `new_owner`/`new_employee` **and the user has no username yet**; otherwise ignore the field, as the old docstring promised) → **consume with `GETDEL`** (None ⇒ invalid/expired) → DB update in `transaction.atomic`:
```python
User.objects.filter(pk=user.pk).update(
    password=make_password(new_password), token_version=F("token_version") + 1,
    **({"username": uname} if uname else {}), profile_completed=...)
```
   If the DB update raises (e.g. `IntegrityError` on a username race) **restore the token** (`setex` with the remaining TTL) and return a friendly error — the link must not be burnt by a validation failure.
5. **E-mails:** render with Django templates (`apps/accounts/templates/accounts/emails/{password_reset,invite}.html` + `.txt`, autoescape on) and `EmailMultiAlternatives`. Delete the 370 lines of inline HTML in Python. Context variables: `display_name, tenant_name, position, url, ttl_hours`. **Never** build HTML with f-strings from user data. Add a test with `position = "<a href='x'>click</a>"` asserting the output contains `&lt;a`.
6. `peek_reset_token`: remove the dead `user.employees` branch (the related name is `employments`).
7. `request_password_reset_for_user(user_id, purpose)` (used by hire/create_with_owner, T2.4) = steps 2–3 for a known user id without the cooldown.
8. **No more `change-password-with-old` unauthenticated endpoint** (it bypassed 2FA and was a second password oracle). Delete view, serializer, URL, service function and the frontend screen. Authenticated password change is T7.6.
**Tests:** log capture contains no token/URL; second request invalidates the first token; token works exactly once; fired user's old token fails; username validation error does **not** consume the token; unknown vs known identifier → identical response; e-mail HTML is escaped.

## T7.5 JWT and sessions
1. `config/settings.py`:
```python
INSTALLED_APPS += ["rest_framework_simplejwt.token_blacklist"]
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": False,
    "SIGNING_KEY": env("JWT_SIGNING_KEY"),       # separate from Django SECRET_KEY; required in production
    # keep the existing AUTH_HEADER_TYPES etc.
}
```
   Run `migrate` for the blacklist tables.
2. `apps/accounts/authentication.py` becomes **fail-closed**:
```python
def get_user(self, validated_token):
    user = super().get_user(validated_token)
    version = validated_token.get("token_version")
    if version is None or version != user.token_version:
        raise AuthenticationFailed("Token has been revoked or expired.", code="token_revoked")
    return user
```
3. Endpoints (`api/v1/accounts/urls.py`): `POST /auth/logout/` body `{refresh}` → blacklist that refresh token (permission `IsAuthenticated`; invalid token → 200 anyway); `POST /auth/logout-all/` → `User.objects.filter(pk=...).update(token_version=F("token_version")+1)` (all sessions die).
4. `issue_tokens` no longer adds `tenant_id`/`terms_accepted` (T2.2). The refresh view must be your own subclass with explicit `permission_classes=[AllowAny]` (T3.1).
**Tests:** token without `token_version` claim → 401; refresh token reuse after rotation → 401; `logout-all` kills other sessions.

## T7.6 Atomic user updates, profile, e-mail, password change
1. **Never call full `user.save()` on `request.user`.** In `CompleteProfileView`, `ProfileView.patch`, avatar upload, accept-terms, password change: modify only the touched fields with `user.save(update_fields=[...])` (or `User.objects.filter(pk=).update(...)`). A full save can overwrite a concurrent `fire()` (password/token_version) with stale values.
2. `CompleteProfileSerializer`: `first_name`/`last_name` `max_length=50` (the model limit; 100 caused a DB error → 500). `profile_completed` becomes true only when both names are non-empty after the update. Empty e-mail is stored as `NULL`, never `''`.
3. **E-mail uniqueness + verified change.** Constraint: `UniqueConstraint(Lower("email"), condition=Q(email__isnull=False) & ~Q(email=""), name="unique_user_email_ci")`; normalize to lower-case. The profile PATCH **no longer accepts `email`**. New flow:
   - `POST /api/v1/auth/email/change-request/` `{current_password, new_email}` (authenticated, throttle `5/hour`) → checks password, uniqueness, stores a hashed token `email_change:{hash} → {user_id, new_email}` (TTL 1 h), e-mails the link to the **new** address.
   - `POST /api/v1/auth/email/change-confirm/` `{token}` (public, uses the hashed token) → `GETDEL`, set the e-mail with `update_fields`, `AuditLog(EMAIL_CHANGE)`.
4. **Password change (authenticated):** `POST /api/v1/auth/change-password/` with a real serializer `{old_password, new_password}`: `check_password(old)`, `validate_password(new, user)`, then
```python
User.objects.filter(pk=user.pk).update(password=make_password(new), token_version=F("token_version") + 1)
user.refresh_from_db(); return Response(issue_tokens(user))     # the current session continues with fresh tokens
```
   Throttle `ScopedRateThrottle` scope `password_change` `5/hour` (user). Error body follows the project's standard error format (not `{'error': str}`). `AuditLog(PASSWORD_CHANGE)` without PII (add the action). Do not wrap the audit call in `try/except: pass`.
5. **`validate_password`** (Django's validators from `AUTH_PASSWORD_VALIDATORS`) must be used in: reset confirm, password change, any admin-created password path. Also make sure `AUTH_PASSWORD_VALIDATORS` includes `MinimumLengthValidator(8)`, `CommonPasswordValidator`, `NumericPasswordValidator`, `UserAttributeSimilarityValidator`.
**Tests:** weak password rejected; changing e-mail requires the current password; duplicate e-mail (case-insensitive) rejected; concurrent `fire()` + profile PATCH cannot restore the old password hash (simulate with two instances).

## T7.7 Client IP, audit IP, terms acceptance
1. Create `apps/core/utils/request.py`:
```python
import ipaddress
from django.conf import settings

def get_client_ip(request):
    """Trust only the proxy chain we control (settings.NUM_PROXIES, default 1: nginx)."""
    n = getattr(settings, "NUM_PROXIES", 1)
    parts = [p.strip() for p in request.META.get("HTTP_X_FORWARDED_FOR", "").split(",") if p.strip()]
    candidate = parts[-n] if n and len(parts) >= n else request.META.get("REMOTE_ADDR")
    try:
        return str(ipaddress.ip_address(candidate))
    except (ValueError, TypeError):
        return None

def get_user_agent(request, max_len=500):
    return (request.META.get("HTTP_USER_AGENT") or "")[:max_len]
```
   Replace **both** existing copies (`audit_service.get_client_ip` and the one in the accept-terms view). `AuditLog.ip_address` receives `None` for invalid values (a forged header can no longer cause a DB error → 500). `User.terms_accepted_ip` stores the validated IP or `None`.
2. nginx must set `X-Forwarded-For $remote_addr` (T9.3) so the *last* entry is the real client.
3. Stop exposing `terms_accepted_ip` in the profile API (internal evidence only).
**Tests:** spoofed `X-Forwarded-For: abc` → no 500, ip stored as `None`; leftmost forged entries are ignored.

## T7.8 Telegram contact binding and bot
**Django (`api/v1/tg_bot/views.py`, `apps/tg_bot/*`):**
```python
with transaction.atomic():
    # the same Telegram account re-registering with a DIFFERENT phone: drop its old binding
    TelegramContact.objects.filter(chat_id=chat_id).exclude(phone_number=phone).delete()
    existing = TelegramContact.objects.select_for_update().filter(phone_number=phone).first()
    old_chat_id = existing.chat_id if existing and existing.chat_id != chat_id else None
    TelegramContact.objects.update_or_create(phone_number=phone, defaults={"chat_id": chat_id, "first_name": first_name})
if old_chat_id:
    transaction.on_commit(lambda: send_async_telegram_message_task.delay(
        old_chat_id, "Hisobingiz boshqa Telegram'ga ulandi. Bu siz bo'lmasangiz, darhol do'kon egasiga xabar bering."))
    AuditService.log(action=AuditAction.TG_REBIND, ...)      # add action; ids only
```
(The old code crashed with a 500 when a chat_id was already bound to another phone because of `unique=True`.)
**Bot (`telegram_bot_sms/main.py`):**
- The Django call must not block the event loop: replace `requests.post` with `httpx.AsyncClient(timeout=5)` (add `httpx` to the bot's dependencies) or `await asyncio.to_thread(...)`.
- Replace the unbounded rate-limit dict with `cachetools.TTLCache(maxsize=10_000, ttl=60)`.
- One env var name for the bot token everywhere: `TELEGRAM_BOT_TOKEN` (compose passes the same value to Django and the bot; delete `BOT_TOKEN`).
- Remove duplicated phone normalization: send the raw contact phone to Django and let Django normalize it (single implementation).
- Never log the token or full URLs.
**Tests:** re-binding sends a notice to the old chat and writes an audit row; re-registering one Telegram account under a new phone no longer 500s.

## T7.9 Frontend auth changes
`src/pages/Login.jsx`, `src/pages/SetupAccount.jsx` and `api`: after password/setup confirmation, store `login_ticket` in memory and show a separate Telegram connection screen. Poll the ticket-bound binding status; explain `/start` and sharing the account owner's contact with `@ilbi_bot`. Show code entry and start its three-minute timer only after `send-otp` succeeds. Resend using the same ticket, not the password/setup token. Verify with `{login_ticket, verification_code}`; handle 429 with `retry_after_seconds` text. The old unlinked warning box belongs on the gate, not the OTP screen. Forgot-password screen: always shows the generic success text; stop reading `email_hint`. Logout: call `/auth/logout/`, then remove **every** key starting with `ilbi_` from `localStorage` and `sessionStorage` (drafts, signatures, cart, active tenant). Restore a change-password dialog in `Profile.jsx` using the new endpoint (it was removed from the page in the last commit — verify with `git log -p -- frontend/ilbi/src/pages/Profile.jsx` and re-add it if that was unintentional, otherwise place it in a "Xavfsizlik" section). Add the e-mail change flow UI (T7.6).

---
---
# PHASE 8 — LEGAL E-SIGNATURES AND LEGAL DOCUMENTS (D-25)

Goal: signatures on invoices (hisob-faktura) and shift reports are stored on the server as **immutable evidence**; legal texts are versioned.
Dependencies: Phase 4 (sale model), Phase 5 (shift report), Phase 3 (permission `sales.sign_invoice`).

## T8.1 Model
`apps/core/models.py` (or a new app `apps/documents/` — preferred: create `apps/documents/` with `models.py`, `services/signature_service.py`, `tests/`; register it in `INSTALLED_APPS`).
```python
class DocumentSignature(models.Model):
    TYPE_INVOICE = "invoice"; TYPE_SHIFT_REPORT = "shift_report"
    ROLE_SELLER = "seller"; ROLE_BUYER = "buyer"; ROLE_CASHIER = "cashier"
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.PROTECT, related_name="signatures")
    document_type = models.CharField(max_length=20, choices=[(TYPE_INVOICE, "Hisob-faktura"), (TYPE_SHIFT_REPORT, "Smena hisoboti")])
    document_id = models.PositiveBigIntegerField()                       # Sale.id or DailyCashReport.id
    signer_role = models.CharField(max_length=10, choices=[(ROLE_SELLER, "Sotuvchi"), (ROLE_BUYER, "Xaridor"), (ROLE_CASHIER, "Kassir")])
    signer_name = models.CharField(max_length=150)
    signed_by_user = models.ForeignKey("accounts.User", null=True, blank=True, on_delete=models.PROTECT, related_name="+")
    image_png = models.BinaryField()                                      # validated PNG, <= 150 KB
    image_sha256 = models.CharField(max_length=64)
    document_snapshot = models.JSONField()                                # canonical content at signing time
    document_sha256 = models.CharField(max_length=64)                     # sha256 of canonical JSON of the snapshot
    signed_at = models.DateTimeField(default=timezone.now, editable=False)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True, default="")

    class Meta:
        constraints = [models.UniqueConstraint(fields=["tenant", "document_type", "document_id", "signer_role"], name="unique_signature_per_role")]
        indexes = [models.Index(fields=["tenant", "document_type", "document_id"])]

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValidationError("Imzo yozuvini o'zgartirib bo'lmaydi.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Imzo yozuvini o'chirib bo'lmaydi.")
```
Also block bulk edits like `AuditLog` does: use a custom manager/queryset whose `update`, `delete`, `bulk_update` raise. **Database-level protection** (migration `RunSQL`):
```sql
CREATE FUNCTION documents_signature_immutable() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'document_signature rows are immutable'; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER documents_signature_no_update BEFORE UPDATE OR DELETE ON documents_documentsignature
FOR EACH ROW EXECUTE FUNCTION documents_signature_immutable();
```
(Adapt the table name; reverse SQL drops trigger and function.)

## T8.2 Service
`apps/documents/services/signature_service.py`:
```python
class SignatureService:
    MAX_PNG_BYTES = 150 * 1024

    @staticmethod
    def snapshot_for_sale(sale) -> dict:
        """Canonical, stable representation of an invoice. Keys sorted when hashed."""
        return {
            "receipt_number": sale.receipt_number, "tenant": sale.tenant.name, "created_at": sale.created_at.isoformat(),
            "currency": sale.currency, "total_amount": str(sale.total_amount),
            "counterparty": sale.counterparty.name if sale.counterparty_id else None,
            "items": [{"name": i.product_variant.name, "quantity": str(i.quantity), "unit_price": str(i.unit_price),
                       "total_price": str(i.total_price)} for i in sale.items.order_by("id")],
        }

    @staticmethod
    def sign(*, tenant, document_type, document_id, signer_role, signer_name, png_bytes, user, ip, user_agent):
        # 1. validate PNG (magic bytes b"\x89PNG\r\n\x1a\n", size, Pillow open() + verify(), max 1000x500 px)
        # 2. load the document (tenant-scoped!) and build the snapshot; json.dumps(sort_keys=True, separators=(",", ":"))
        # 3. document_sha256 = sha256(canonical_json); image_sha256 = sha256(png_bytes)
        # 4. create the row (unique constraint => 409 if that role already signed)
        # 5. AuditLog(action=DOCUMENT_SIGNED, ids only)
```
Add `SignatureService.verify(document_type, document_id)` → recomputes the snapshot hash and returns per signature `{signer_role, signed_at, document_unchanged: bool}` so the UI can show "document changed after signing" (e.g. a later void).
Rules: buyer/seller signatures for an invoice need `sales.sign_invoice`; shift-report signature (`cashier`) is created inside the `close_shift` flow only (optional `signature_png` in the close request) — otherwise the shift closes unsigned.

## T8.3 API
- `POST /api/v1/documents/signatures/` body `{document_type, document_id, signer_role, signer_name, image}` where `image` is a `data:image/png;base64,...` string (decode on the server; reject others) → 201 with `{id, signed_at, document_sha256}`; 409 if already signed by that role.
- `GET /api/v1/documents/signatures/?document_type=&document_id=` → list metadata + `document_unchanged` (no image bytes), paginated.
- `GET /api/v1/documents/signatures/<id>/image/` → `image/png` bytes (permission: same tenant + `sales.view_sale`).
All views: `HasEmployeePermission`, tenant-scoped, throttle `30/min` per user.
**Tests:** valid PNG accepted; oversized/non-PNG rejected; second signature for the same role → 409; UPDATE/DELETE via ORM and via raw SQL fail; verify detects a changed snapshot (void after signing); another tenant cannot read/sign.

## T8.4 Frontend
Remove every use of `localStorage` for signatures (`ilbi_invoice_signatures_*`). `InvoiceA4Modal.jsx` and the shift close dialog send the canvas `toDataURL("image/png")` to the new endpoint, then render the server state (who signed, when, "hujjat o'zgargan" warning). Print layout shows the stored signature image fetched from the image endpoint. The roadmap statement about "immutable audit-proof signatures" becomes true only after this task — update `Architectures/ilbi-yol-xaritasi.md` accordingly.

## T8.5 Versioned legal documents (recommended, small)
Problem: `DocumentationView` PUT writes legal texts to the container disk (lost on redeploy, no history); `terms_accepted` is a bare boolean.
1. `LegalDocument(slug, version:int, title, content_md, published_at, published_by)`, unique `(slug, version)`, immutable like signatures. Latest version = highest `version`.
2. `DocumentationView`: `GET` serves the latest version from the DB (public, cached); `PUT` (platform_admin only) **creates a new version** (never edits) and writes an `AuditLog`. Remove file writing and the `str(e)` error leak; seed initial versions from the existing markdown files in a data migration.
3. `User.terms_accepted_version` (int, null) replaces trusting the boolean alone; accepting stores the current terms version; when a newer version is published users must re-accept (the frontend checks `GET /auth/me/` field `terms_outdated`).
**Tests:** PUT creates version N+1; old version still readable by number; non-admin PUT → 403.

---
---
# PHASE 9 — PRODUCTION READINESS

Dependencies: all previous phases merged. These tasks are mostly configuration; verify each with the stated checks.

## T9.1 Django settings hardening (`config/settings.py`)
```python
DEBUG = env_bool("DJANGO_DEBUG", False)
ALLOWED_HOSTS = [h for h in env("DJANGO_ALLOWED_HOSTS").split(",") if h]       # required; NO "*" default
if not DEBUG:
    assert ALLOWED_HOSTS and "*" not in ALLOWED_HOSTS
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = False                  # TLS is terminated at nginx, which redirects 80 -> 443
SESSION_COOKIE_SECURE = CSRF_COOKIE_SECURE = not DEBUG
SECURE_HSTS_SECONDS = 31536000 if not DEBUG else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
CSRF_TRUSTED_ORIGINS = [f"https://{h}" for h in ALLOWED_HOSTS if h]
NUM_PROXIES = 1
DATABASES["default"]["CONN_MAX_AGE"] = int(env("DB_CONN_MAX_AGE", 60))
DATABASES["default"]["ENGINE"] = "django.db.backends.postgresql"            # not the deprecated psycopg2 alias
CACHES = {"default": {"BACKEND": "django.core.cache.backends.redis.RedisCache", "LOCATION": REDIS_URL}}
REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = ["rest_framework.throttling.ScopedRateThrottle"]
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {"public_receipt": "30/min", "tenant_create": "5/day", "password_change": "5/hour", ...}
```
**Logging** (currently none): `LOGGING` dict with a console handler, JSON-ish format with level, logger, message; `django.request` at WARNING; app loggers at INFO; a filter that drops records containing `Authorization` headers. **Health endpoint:** `GET /api/v1/health/` (`AllowAny`, no auth) returns `{"status":"ok"}` after a `SELECT 1` and a Redis `PING`; returns 503 otherwise.
**Media:** remove the `django.views.static.serve` route for `/media/` entirely (nginx serves it). **MinIO:** decide with the owner (Appendix C-6); until decided delete the hard-coded fallback credentials (`minio_secret_2026`) — if `USE_MINIO` is true and the env vars are missing, fail at startup; stop publishing ports 9000/9001 to the host in `docker-compose.yml`.
**API docs:** schema/Swagger/Redoc only for admins or when `DEBUG` (T3.1).
**Checks:** `uv run python manage.py check --deploy` shows no warnings except those intentionally accepted.

## T9.2 Containers
**`ilbi/Dockerfile`** — multi-stage, non-root, pinned:
```dockerfile
# syntax=docker/dockerfile:1
FROM ghcr.io/astral-sh/uv:0.5.14 AS uv                    # pin the exact uv version used locally
FROM python:3.12.8-slim AS build                           # pin the patch version
COPY --from=uv /uv /usr/local/bin/uv
RUN apt-get update && apt-get install -y --no-install-recommends build-essential libpq-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project         # NO "|| uv sync" fallback: the lockfile must be respected
FROM python:3.12.8-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends libpq5 && rm -rf /var/lib/apt/lists/* \
 && useradd --create-home --uid 10001 app
WORKDIR /app
COPY --from=build /app/.venv /app/.venv
COPY --chown=app:app . .
ENV PATH="/app/.venv/bin:$PATH" PYTHONUNBUFFERED=1
USER app
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD python -c "import urllib.request;urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health/',timeout=3)"
CMD ["gunicorn", "config.wsgi:application", "-c", "gunicorn.conf.py"]
```
Adjust paths to the real WSGI module and keep the existing static/media directory creation (owned by `app`). Dev tooling stays in a separate `docker-compose.override.yml` (dev) — production compose has **no bind mounts of source**, no `GUNICORN_RELOAD`, no Vite dev server.
**`entrypoint.sh`:** remove `uv sync` at start-up and the automatic `migrate`. Migrations run as a **one-shot service** `migrate` (`command: python manage.py migrate --noinput`) that the app/celery services `depends_on` with `condition: service_completed_successfully`. Remove `C_FORCE_ROOT` (the worker runs as `app`).
**`gunicorn.conf.py`:** `reload = False` always in production; workers from env (`WEB_CONCURRENCY`, default `2`); with gevent you **must** make psycopg2 cooperative:
```python
# gunicorn.conf.py
import os
worker_class = "gevent"
workers = int(os.getenv("WEB_CONCURRENCY", "2"))
worker_connections = 200
preload_app = False                       # kept decision
timeout = 30
max_requests = 1000
max_requests_jitter = 100

def post_fork(server, worker):
    from psycogreen.gevent import patch_psycopg
    patch_psycopg()
```
Add `psycogreen` to dependencies. (Without it a DB query blocks the whole worker and gevent gives no concurrency.) Alternative accepted by the owner later: `gthread` workers — do not change without asking.
**Compose (prod):** `postgres` and `redis` with healthchecks; Redis `command: redis-server --requirepass ${REDIS_PASSWORD}` and the URL includes the password; app/celery/beat/bot use `restart: unless-stopped`; one `beat` replica only; named volumes for DB/Redis/media; secrets via env files not committed.
**Celery config:** `task_acks_late=True`, `task_reject_on_worker_lost=True`, `result_expires=3600`, `task_soft_time_limit=120`, `task_time_limit=300`, `broker_connection_retry_on_startup=True`, and `visibility_timeout` ≥ the longest task.

## T9.3 nginx (`nginx/nginx.conf`)
- TLS: server on 443 with certificates (Let's Encrypt via certbot sidecar or the host's certbot); port 80 only redirects to https (and serves ACME challenges). Modern TLS 1.2/1.3 ciphers.
- Headers: `add_header ... always;` for HSTS, `X-Content-Type-Options nosniff`, `Referrer-Policy strict-origin-when-cross-origin`, `Content-Security-Policy` (start with `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none'`). **Repeat the security headers inside every `location` that defines its own `add_header`** (nginx drops inherited headers there) — use an `include snippets/security-headers.conf;` file in each.
- Real client IP: `proxy_set_header X-Forwarded-For $remote_addr;` (overwrite, not append), `X-Forwarded-Proto $scheme`, `Host $host`.
- Rate limiting: replace the stale regex with the real auth routes:
```nginx
location ~ ^/api/v1/auth/(admin-login|password-reset|token|logout|email|change-password) { limit_req zone=auth burst=15 nodelay; proxy_pass http://backend; ... }
```
  (verify against `api/v1/accounts/urls.py`; remove `request-otp`/`verify-otp` entries that do not exist).
- Keep `/api/v1/internal/` blocked (`return 403`), `client_max_body_size 20M`, `gzip on` for json/js/css, proxy timeouts (`proxy_read_timeout 60s`).
- Serve the built SPA (`frontend/ilbi/dist`) with history fallback (`try_files $uri /index.html`) — route `/r/<token>` must work.
- Media: `location /media/ { alias /app/media/; }` without `try_files ... $uri/`, `add_header X-Content-Type-Options nosniff; add_header Content-Disposition attachment` for non-image types.
**Check:** `nginx -t`; `curl -I http://host` redirects; SSL Labs/`testssl.sh` grade A (document the result).

## T9.4 Frontend production build
`frontend/ilbi/Dockerfile`: multi-stage — `node:22-alpine` builds (`npm ci && npm run build`), final stage `nginx:alpine` (or copy `dist` into the main nginx image). No Vite dev server in production. Add code-splitting for the giant pages: `pages/Sales.jsx` (~3000 lines) and `pages/Catalog.jsx` (~2100) into sub-components under `components/sales/…`, `components/catalog/…` and `React.lazy` routes (do this as a pure refactor commit with no behavior change; tests/manual smoke before and after).

## T9.5 Backups, monitoring, ops
1. `scripts/backup_postgres.sh`: `pg_dump -Fc` daily, keep 14 days locally, upload to object storage (owner chooses provider; Appendix C-7); a monthly **restore test** documented in `docs/ops.md`.
2. Sentry (or equivalent): `sentry-sdk[django,celery]`, DSN from env, `send_default_pii=False`, scrub `Authorization`/cookies; enabled only when the env var exists.
3. Uptime check on `/api/v1/health/`; alert on Celery queue length and on failed beat ticks (document in `docs/ops.md`).
4. Log rotation (`docker` `json-file` driver with `max-size`/`max-file`).
5. `docs/ops.md`: deploy steps (build → migrate service → rolling restart), rollback, secret rotation list from T0.3(d), how to unlock a user (T7.1), how to run the stress seeder safely.

## T9.6 Final regression pass
1. Full backend tests + frontend build in CI (T0.2) green.
2. Run `pip-audit`, `npm audit --omit=dev`, `bandit -r apps api config -ll`, `ruff check` — no high/critical findings.
3. Manual end-to-end script in `docs/e2e-checklist.md` covering: owner with 2 tenants (switcher), staff permission denial messages, sale → partial void → receipt (total/refunded/net), B2B send → partial accept → later accept → reject remainder → expire, debt payment (owner only), shift close with refund + debt payment, signature on invoice, public receipt token, password reset, lockout + owner alert, logout-all.
4. Tag a release (e.g. `v1.0.0-rc1`).


## T9.7 Remaining medium-priority hardening (do last; each is small and independent)
1. **Category currency guard.** `ProductVariant.currency` is derived from `Category.currency`. In `CategoryService.update` and `ProductService.move/update`, **refuse** to change a category's currency (or move a product to a category with a different currency) when any variant under it has stock, sales or movements; otherwise stock/prices silently change unit (UZS<->USD). Add tests.
2. **Search performance.** Enable `pg_trgm` (`TrigramExtension` migration) and add GIN trigram indexes on `Product.name`, `ProductVariant.name`, `ProductVariant.code`, `ProductVariant.barcode`, `Counterparty.name`, `Counterparty.phone_number`; POS/catalog search uses `icontains` — verify with `EXPLAIN` that the indexes are used on a 10k-row seed.
3. **Audit log immutability at DB level.** Same trigger approach as T8.1 for `core_auditlog` (no UPDATE/DELETE). Its `tenant` FK is `SET_NULL`, which orphans evidence — change it to `PROTECT` (tenants are never deleted, C-18).
4. **Internal Shop API** (`api/v1/internal/shop`): keep only tenant-scoped catalog and stock reads for an explicitly configured store integration. ILBI does not collect online orders, create customer profiles from them, or turn them into sales. The store records the sale in its own POS; ordinary customer data is not retained by ILBI. `stock_quantity` comes from the tenant's single stock row (T1.4). A future order/delivery-status link requires a separate owner-approved scope and privacy review.
5. **Dollar rate history.** `Tenant.usd_rate` is a single mutable number. Add `UsdRateHistory(tenant, rate, changed_at, changed_by)` written on every change (service method `TenantService.set_usd_rate`), so past reports can be explained. (Display only; do not recompute historic sales.)
6. **Notifications:** stop hard-coding frontend routes in `Notification.link` — store `data` (T4.1) and let the frontend build links by `type`; keep `link` filled for one release, then drop it.
7. **`AuditAction` coverage:** confirm audit rows exist for tenant create/update/deactivate, hire, fire, owner change, void, B2B accept/reject/expire (system), debt payment/correction, price change (`PRICE_CHANGE` must really be written by product/variant updates), stock adjust/write-off/supplier-return/intake, login attempts/lockouts, password/e-mail change, signature, Telegram rebind. Grep each action constant and add the missing calls.


---
---
# APPENDIX A — PERMISSION CATALOGUE (D-07, approved by the owner)

Format: `category.codename` — Uzbek display name. "Exists" = already seeded by old migrations (do not duplicate). "Assignable" = may be given to staff. Owners always have everything. Seed every row in T3.2.

| Codename | Uzbek name (shown in UI and denial messages) | Exists | Assignable |
|---|---|---|---|
| `catalog.view_category` | Kategoriyalarni ko'rish | yes | yes |
| `catalog.add_category` | Kategoriya qo'shish | yes | yes |
| `catalog.change_category` | Kategoriyani o'zgartirish | yes | yes |
| `catalog.archive_category` | Kategoriyani arxivlash | yes | yes |
| `catalog.view_product` | Mahsulotlarni ko'rish | yes | yes |
| `catalog.add_product` | Mahsulot qo'shish | yes | yes |
| `catalog.change_product` | Mahsulotni o'zgartirish | yes | yes |
| `catalog.archive_product` | Mahsulotni arxivlash | yes | yes |
| `catalog.restore_product` | Mahsulotni arxivdan qaytarish | new | yes |
| `catalog.change_prices` | Narxlarni o'zgartirish | new | yes |
| `catalog.manage_images` | Mahsulot rasmlarini boshqarish | new | yes |
| `catalog.view_cost_price` | Tannarxni ko'rish | new | yes |
| `inventory.view_stock` | Ombor qoldig'ini ko'rish | yes | yes |
| `inventory.add_stock_intake` | Omborga kirim qilish | yes | yes |
| `inventory.adjust_stock` | Ombor qoldig'ini tuzatish | yes | yes |
| `inventory.write_off_stock` | Tovarni hisobdan chiqarish | new | yes |
| `inventory.supplier_return` | Yetkazib beruvchiga qaytarish | new | yes |
| `inventory.view_stock_movements` | Ombor harakatlari tarixini ko'rish | new | yes |
| `inventory.view_deficits` | Kamomadlarni ko'rish | new | yes |
| `sales.view_sale` | Sotuvlarni ko'rish | yes | yes |
| `sales.add_sale` | Sotuv qilish | yes | yes |
| `sales.void_sale` | Chekni bekor qilish | yes | yes |
| `sales.void_sale_item` | Chekdagi tovarni qisman bekor qilish | new | yes |
| `sales.manage_counterparty` | Kontragentlarni boshqarish | yes | yes |
| `sales.view_counterparty` | Kontragentlarni ko'rish | new | yes |
| `sales.archive_counterparty` | Kontragentni arxivlash | new | yes |
| `sales.view_debts` | Qarzlarni ko'rish | new | yes |
| `sales.manage_b2b` | B2B transferlarni qabul qilish/rad etish | yes | yes |
| `sales.send_b2b` | B2B transfer yuborish | new | yes |
| `sales.sell_partner_price` | Hamkor narxida sotish | new | yes |
| `sales.sign_invoice` | Hisob-fakturani imzolash | new | yes |
| `sales.record_debt_payment` | Qarz to'lovini kiritish | yes | **no (owner only)** |
| `sales.correct_debt_payment` | Qarz to'lovini tuzatish | new | **no (owner only)** |
| `cashbox.view_cashbox` | Kassa holatini ko'rish | new | yes |
| `cashbox.add_expense` | Kassadan xarajat yozish | new | yes |
| `cashbox.add_income` | Kassaga kirim yozish | new | yes |
| `cashbox.close_shift` | Smenani yopish | new | yes |
| `cashbox.view_z_reports` | Z-hisobotlarni ko'rish | new | yes |
| `analytics.view_dashboard` | Boshqaruv panelini ko'rish | new | yes |
| `analytics.view_profit_report` | Foyda hisobotini ko'rish | new | yes |
| `analytics.export_reports` | Hisobotlarni yuklab olish (eksport) | new (feature not built yet — seed only) | yes |
| `employees.view_employees` | Xodimlar ro'yxatini ko'rish | new | yes |
| `employees.hire_employee` | Xodim qo'shish | new | **no (owner only)** |
| `employees.fire_employee` | Xodimni ishdan bo'shatish | new | **no (owner only)** |
| `employees.change_employee_permissions` | Xodim ruxsatlarini o'zgartirish | new | **no (owner only)** |
| `tenants.view_settings` | Do'kon sozlamalarini ko'rish | new | yes |
| `tenants.change_receipt_settings` | Chek sozlamalarini o'zgartirish | new | yes |
| `tenants.change_notification_settings` | Bildirishnoma sozlamalarini o'zgartirish | new | yes |
| `tenants.change_usd_rate` | Dollar kursini o'zgartirish | new | yes |
| `tenants.manage_telegram` | Telegram sozlamalarini boshqarish | new | yes |
| `audit.view_audit_log` | Audit jurnalini ko'rish | new | yes |

If an existing view enforces a permission through a different codename than listed here, keep behavior and record the mapping in `docs/PLAN_NOTES.md`.

---

# APPENDIX B — FINDINGS → TASKS (traceability)

| Audit finding | Fixed in |
|---|---|
| Fake daily-activity commits | T0.1 |
| No CI, no linter, no tests in CI | T0.2 |
| Reset URL / bot token written to logs; old SECRET_KEY in git history | T0.3 |
| Vulnerable deps (pyjwt, urllib3, source-map-js) | T0.4 |
| Missing README/LICENSE/.env.example, junk files, version mismatch | T0.5 |
| Dangerous stress seeder default tenant | T0.6 |
| Branch isolation is advisory only (`branch_id` override); `Employee.branch SET_NULL` widens access; invalid `branch_id` ⇒ all branches | Phase 1 (branches removed) |
| `User.tenant` stale after fire; any-role access via stale tenant; `Tenant.owner` OneToOne CASCADE | T2.1, T2.2 |
| `change_owner` destroyed the old owner's whole account | T2.4(d) |
| Hire: unnormalized phone, silent branch None, race 500, invite e-mail never sent (`password=''` is "usable"), cross-tenant leak in errors | T2.4(a) |
| No `DEFAULT_PERMISSION_CLASSES`; cashbox open to any staff | T3.1, T3.3 |
| Role-only classes ignore `Employee.is_active` | T3.3 |
| Denial reasons not explained | T3.4 |
| Cost price visible to every staff and to B2B partner | T3.5, T4.10 |
| Fired user can log in / old reset link revives access | T3.6 |
| Query-param 500s; unpaginated lists | T3.7 |
| Double debt subtraction on void; lost updates on counterparty | T4.4, T4.5, T4.11 |
| Void of partly-accepted B2B duplicates stock; accept ignores voided qty; void overwrites `b2b_pending` | T4.0, T4.5, T4.6 |
| Expiry == void window ⇒ goods lost; reject/expire/partial-accept double returns (regression of commit `0fddbcb`) | T4.4, T4.6 |
| `total_amount` semantics | D-13, T4.1, T4.10 |
| Receipt number race/overflow/UTC; idempotency without unique constraint | T4.9 |
| Public receipt enumeration/IDOR | T4.13 |
| Counterparty `target_tenant` stale / phone discovery / spam | T4.7 |
| Debt payments: staff permission no-op, no audit, no idempotency | T4.11 |
| Deadlocks (unsorted lock order) | §4.4, T1.2, T4.6 |
| `close_shift` UnboundLocalError; gap/double-close; void & debt payments absent from cash; UTC dates | T5.1, T5.2 |
| Daily report sent 2–3×, wrong time zone | T5.4 |
| Analytics ignore refunds; no owner-wide report | T6.1, T6.2 |
| Login throttle design flaws; password oracle; timing leak | T7.1, T7.2 |
| OTP races / no daily cap / 2FA not bound to step 1 | T7.3 |
| Password reset flaws (hint leak, token reuse, username, HTML injection, `employees` attr) | T7.4 |
| JWT fail-open, no logout/rotation | T7.5 |
| Full `user.save()` races; email unique/verified change; weak password rules | T7.6 |
| Spoofable client IP; forged XFF causing 500 | T7.7 |
| Telegram rebind 500 / no notice; blocking bot | T7.8 |
| Signatures only in browser | Phase 8 |
| Prod config (ALLOWED_HOSTS `*`, no TLS, reload=True, root user, uv:latest, no healthchecks, MinIO creds, swagger public) | Phase 9 |

---

# APPENDIX C — OPEN DECISIONS & ASSUMPTIONS (ask the owner; do not decide silently)

The tasks above already contain a default for each item so work is never blocked. Record the owner's answer in `docs/PLAN_NOTES.md` and adjust if needed.

| # | Question / assumption | Default used in this plan |
|---|---|---|
| C-1 | Rewrite git history to drop the fake commits? | **No — CONFIRMED by the owner** (only stop creating new ones; history untouched) |
| C-2 | License | "All rights reserved" |
| C-3 | Owner-only operation set (hire/fire, change permissions, record/correct debt payment) | As in Appendix A — **CONFIRMED by the owner** |
| C-4 | Remove the unauthenticated `change-password-with-old` endpoint | Removed (T7.4 step 8) — **CONFIRMED by the owner: remove it** |
| C-5 | Cost method: last cost (`last_cost_price`) vs weighted average; behavior when cost is missing | Keep last cost; missing ⇒ 0 + warning log |
| C-6 | MinIO: use it or remove it | Remove fallback creds; startup fails if enabled without env |
| C-7 | Backup destination | Local 14 days; remote provider TBD |
| C-8 | JWT: access 30 min, refresh 7 days, rotation + blacklist | As written in T7.5 — **CONFIRMED by the owner** |
| C-9 | Debt payments and the cashbox | **SUPERSEDED:** only actual cash debt payment creates one linked CashIncome; card/bank/credit is ledger-only and internal shift report is not Z-hisobot |
| C-10 | Opening float / cash drops (inkassatsiya) | **OWNER DECIDED:** record opening cash, added/removed cash and inkassatsiya separately with reason/actor and audit |
| C-11 | May a signed invoice still be voided? | Canvas signature is only an internal acknowledgement, not ERI. Correct an internal document through an audited new version/compensating record; official signed EHF follows provider/ERI correction flow |
| C-12 | `MAX_TENANTS_PER_OWNER` | 10 — **CONFIRMED by the owner** |
| C-13 | Shift per tenant (one window), not per cashier | Yes |
| C-14 | Public receipt link lifetime | Opaque, revocable token; expiry follows legally required record-retention period after accountant/lawyer confirmation |
| C-15 | B2B link between own tenants auto-approved; foreign tenants need approval | Yes |
| C-16 | Was the change-password dialog removed from `Profile.jsx` on purpose? | No → restore (T7.9) |
| C-17 | Telegram parse mode (Markdown v1 vs MarkdownV2/HTML) | Keep current mode + `escape_md` helper |
| C-18 | Deleting a tenant/user | Forbidden (`PROTECT`); deactivate instead |
| C-19 | Weighted-cost profit reports and Excel export (`analytics.export_reports`) | Not built; permission seeded only |
| C-20 | A cash refund reduces drawer at the time cash is physically returned | **OWNER DECIDED:** yes; refund maps to original tender. Card refunds follow provider; cash leaves the refund shift |
| C-21 | `platform_admin` may record debt payments at service level but gets no new route | Keep service guard only; no new route. Owner or explicitly permitted staff may record; owner corrects/cancels |
| C-22 | Which debt payments create the automatic cash income | **SUPERSEDED:** cash tender only; card/bank/customer-credit do not increase drawer. Corrections never duplicate or auto-create cash income |

---

# APPENDIX D — EXECUTION ORDER AND PR SLICING

Recommended order (each line = at least one PR; do not mix phases in one PR):
1. **T0.7 first** (scope guard), then T0.1 → T0.6 (hygiene/safety)
2. T1.1 → T1.9 (branch removal)
3. T2.1 → T2.7 (multi-tenant ownership)
4. T3.1 → T3.7 (authorization)
5. T4.0 → T4.14 (sales core) — split into: models (T4.1–4.3), return/void (T4.4–4.5), B2B (T4.6–4.8), sale creation/public receipt (T4.9–4.13), frontend (T4.14)
6. T5.1 → T5.4 (cashbox/time)
7. T6.1 → T6.2 (analytics)
8. T7.0 → T7.9 (auth hardening)
9. T8.1 → T8.5 (signatures, legal docs)
10. T9.1 → T9.6 (production)

# APPENDIX E — GLOBAL DEFINITION OF DONE

A task is done only when ALL are true:
- [ ] Code follows §1.6 standards (English comments, services layer, explicit permissions, no secrets in logs).
- [ ] New/changed behavior is covered by tests listed in the task; the whole suite is green (`uv run pytest -q`).
- [ ] `uv run python manage.py check` and `makemigrations --check` are clean; migrations are committed.
- [ ] `ruff check` clean for touched files.
- [ ] Money/stock logic: locks follow §4.4; side effects use `on_commit` (§4.3); no float arithmetic on money.
- [ ] Frontend: `npm run build` passes; no console errors in the affected flows.
- [ ] No leftover `branch`/`filial`, `user.tenant`, `TODO` without an owner note.
- [ ] Commit message follows `type(scope): description [T<phase>.<n>]`.
- [ ] Anything unclear was written to `docs/PLAN_NOTES.md` instead of being guessed.

# APPENDIX F — QUICK GLOSSARY

- **Tenant** — one shop (former "filial" = tenant). **Owner** — user with role `owner`, may own many tenants. **Staff** — user with role `staff`, belongs to exactly one tenant.
- **A / B** — sender / receiver tenant in a B2B transfer. **Pending** — quantity not yet decided (§T4.0).
- **Return log** — `SaleVoidLog` rows (kind `void`, `b2b_reject`, `b2b_expire`).
- **Net amount** — `total_amount − refunded_amount`.
- **Izingga qayt** — return goods exactly as they were: same stock row, no cost change.
- **Smena / Z-hisobot** — cash shift / its closing report.


---

# APPENDIX G — FROZEN REGISTRY (DO NOT CHANGE, EVEN IF IT LOOKS WRONG OR OLD)

These rules were decided by the owner earlier. Some look unusual on purpose. **Never "fix" them.** Where a task of this plan modifies one of them, the task says so explicitly; otherwise keep the current behavior.

**Security / access**
- **G-01** `PermissionService.has_permission()` validates the codename format unconditionally at the top (before any role shortcut).
- **G-02** `Employee.is_active=True` is required even for the `owner` role — a replaced owner loses permissions.
- **G-03** `User.role` is intentionally NOT demoted on `fire()`. The role stays for audit; access is gated on `Employee.is_active` only (single source of truth).
- **G-04** `EmployeeService.hire()` blocks (never auto-transfers) when the user is already active elsewhere; `platform_admin` can override this. Keep the override branch exactly as is.
- **G-05** Hire-blocking error messages never mention `platform_admin` and never reveal another tenant's details.
- **G-06** Password reset requires active employment; `platform_admin` is exempt (it is never tracked via `Employee`).
- **G-07** The `customer` role does not exist; `User.role` has **no default** (mandatory at creation — fail loud). Every user-creation site passes `role` explicitly.
- **G-08** "Security through omission": error messages never reveal internals (e.g. a blocked login never says whether the username exists).
- **G-09** `TenantContextMixin` stays in the DRF view layer (not Django middleware) and always reads the tenant fresh from the DB (T2.2 moves the work into `check_permissions`, which DRF calls inside `initial()` — still the view layer).
- **G-10** `/api/v1/internal/*` stays blocked by nginx (403) and protected by the `IsInternalService` token.

**Catalog / inventory**
- **G-11** `ProductVariant` is mandatory: ≥ 1 per product; price and stock always live on the variant.
- **G-12** `Category`: 2-level tree via `parent = FK('self', null=True)`; max depth enforced in the service layer; `Category.kod` is entered manually and is tenant-unique.
- **G-13** Pricing fields: `price_partner`, `price_min`, `price_recommended`. `price_min` is **advisory only** — the backend never enforces it; the frontend shows a soft warning that **never mentions cost price**.
- **G-14** `ProductVariant.code` format `{category_kod}/{subcategory_kod}/{price_min // 1000}`: human-readable, frozen at creation, manually editable, NOT unique.
- **G-15** `sku` = auto-incrementing, tenant-scoped, internal only. `barcode` optional, unique within a tenant when provided.
- **G-16** `ProductVariant.name` is free text (structured attributes are deferred).
- **G-17 (superseded for POS):** Retail catalog sale prices, Sale, tender, receivable/debt and cashbox are UZS only. USD may appear only in a separate informational calculator using the shop's manually entered internal rate; its amount never writes to sale, receipt, debt, cashbox or tax records. Product cost may keep an explicitly labeled informational currency only if accounting/provider validates it; no POS USD tender.

**Sales / debt**
- **G-18 (superseded mixed currency):** One `Sale` holds many `SaleItem`s (bulk sale, regular and B2B), maximum **100 lines** per sale; every POS sale is UZS. A basket subject to different legal tender requirements (e.g. cashless-only MXIK) is split into separate provider-confirmed fiscal sales/receipts by tender eligibility, not by currency.
- **G-19** A counterparty is mandatory only for `debt` and B2B sales; optional for cash/card.
- **G-20 (updated):** Record internal tenders (cash/card/bank transfer/customer credit and mixed portions) with their actual amounts; this is not an external bank/payment gateway integration. Cash change is calculated from cash received only. Cashless-only MXIK rules block only the prohibited tender, and mixed baskets split into valid fiscal transactions after provider confirmation. No discount feature unless separately approved; below-cost behavior remains a warning.
- **G-21** Idempotency key is request-scoped, never content-scoped (selling the same goods/price at 10:00 and 14:00 must work).
- **G-22** The product B creates when accepting a transfer has default sale price 0. B never learns A's prices beyond the single transfer price.
- **G-23** Debt has no due date. A counterparty with debt or history is archived, never deleted.
- **G-24 (updated):** Refund value first reduces outstanding debt. Excess is a distinct counterparty credit, not an automatic cash refund; future use is a separate tender with authorization/audit; cash-out requires owner approval, identity check and audit; no automatic expiry.
- **G-25 (superseded):** cashier `void` is a correction of erroneous sale, separate from customer return/exchange and defect claims. A single 7-day technical limit must not curtail consumer rights. Return requires original sale/tender linkage, accepted quantity, reason, stock movement and provider-confirmed fiscal correction; shop policy may grant longer return periods and must disclose applicable product conditions.
- **G-26** When A voids, B receives a "cancelled" notification **without the reason**; B's accept/reject on the voided quantity is closed.
- **G-27** Multi-row stock deduction locks rows ordered by `product_variant_id` ascending and is all-or-nothing.
- **G-28 (updated):** Debt-payment history is visible to permitted staff. Owner or staff with `sales.record_debt_payment` may record real payment, attributed to actor/shift/tender; owner only corrects/cancels. Only cash tender affects cash drawer.

**Engineering**
- **G-29** `gunicorn`: `preload_app = False` (with gevent, preload causes thread-identity `DatabaseError`).
- **G-30** Dev compose keeps the named volume for `.venv` (never replace it by a bind mount).
- **G-31** Test infrastructure stays: separate containers on different ports, `tmpfs` for disposable data, `MD5PasswordHasher` in tests.
- **G-32** Layering: `apps/<app>/services/<one_file_per_service>.py`; `api/v1/<app>/` has serializers, views, urls; comments/docstrings in English; every endpoint has explicit `permission_classes`.
- **G-33** Existing URL paths, JSON field names, permission codenames, DB table names, enum values and Uzbek message texts stay unchanged unless a task renames them.

**Files and folders you must not edit outside their task** — `Architectures/` (except the one sentence in T8.4), `branding/`, `docs/` (only new files named by the plan), `init-db.sql`, `frontend/ilbi/public/`, every already-committed migration, `telegram_bot_sms/` (only T7.8), `nginx/` (only T9.3), Docker/compose files (only Phase 0/9 and the env rename in T7.8).

---

# APPENDIX H — FRONTEND CODE SKELETONS (use as written; adapt only names that really differ)

The frontend tasks (T1.8, T2.6, T3.7, T4.14, T7.9, T8.4) must use these building blocks so every page behaves the same. Do not invent other tenant/storage mechanisms.

### H.1 `frontend/ilbi/src/api/tenantStorage.js` (new file)
```js
// Active-tenant + per-tenant storage helpers. Every persisted key starts with "ilbi_".
const ACTIVE_KEY = 'ilbi_active_tenant';
const KEEP_ON_LOGOUT = ['ilbi_remember_me', 'ilbi_theme']; // verify the real theme key in ThemeContext.jsx

const currentUserId = () => {
  try {
    const raw = localStorage.getItem('ilbi_user') || sessionStorage.getItem('ilbi_user');
    return raw ? JSON.parse(raw)?.id ?? null : null;
  } catch {
    return null;
  }
};

export const getActiveTenantId = () => {
  const uid = currentUserId();
  if (!uid) return null;
  const key = `${ACTIVE_KEY}:${uid}`;
  // sessionStorage first: each browser tab may work on a different tenant.
  return sessionStorage.getItem(key) || localStorage.getItem(key) || null;
};

export const setActiveTenantId = (tenantId) => {
  const uid = currentUserId();
  if (!uid) return;
  const key = `${ACTIVE_KEY}:${uid}`;
  sessionStorage.setItem(key, String(tenantId));
  localStorage.setItem(key, String(tenantId)); // default for NEW tabs
};

/** Per-tenant storage key, e.g. tenantKey('ilbi_stock_intake_full_draft_v1'). */
export const tenantKey = (base) => `${base}:${getActiveTenantId() ?? 'none'}`;

export const clearAllILBIKeys = () => {
  [localStorage, sessionStorage].forEach((store) => {
    Object.keys(store)
      .filter((k) => k.startsWith('ilbi_') && !KEEP_ON_LOGOUT.includes(k))
      .forEach((k) => store.removeItem(k));
  });
};
```

### H.2 `frontend/ilbi/src/api/client.js` — the ONLY edits allowed
1. Add at the top: `import { getActiveTenantId, clearAllILBIKeys } from './tenantStorage';`
2. In `request()`, right after the block that sets `headers['Authorization']`, add:
```js
  // Tell the backend which tenant this request is for (verified server-side on every request).
  const skipTenantHeader =
    endpoint.startsWith('/auth/') || endpoint.startsWith('/tenants/my') || endpoint.startsWith('/public/');
  const activeTenantId = getActiveTenantId();
  if (activeTenantId && !skipTenantHeader && !headers['X-Tenant-ID']) {
    headers['X-Tenant-ID'] = String(activeTenantId);
  }
```
3. Replace the body of `clearTokens` by `clearAllILBIKeys();` (it already removes the token keys because they start with `ilbi_`; it must also remove drafts, signatures, cart and the active-tenant key).
4. Do **not** touch the refresh queue logic, `parseJwt`, `resolveAvatarUrl` or any other function in this file.

### H.3 `frontend/ilbi/src/context/TenantContext.jsx` (new; replaces the deleted `BranchContext.jsx`)
```jsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { request } from '../api/client';
import { getActiveTenantId, setActiveTenantId } from '../api/tenantStorage';

const TenantContext = createContext(null);
export const useTenant = () => useContext(TenantContext);

export function TenantProvider({ children }) {
  const [me, setMe] = useState(null);                     // response of GET /auth/me/
  const [activeTenantId, setActive] = useState(getActiveTenantId());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await request('/auth/me/');
      setMe(data);
      const ids = (data.tenants || []).map((t) => String(t.id));
      let current = getActiveTenantId();
      if (!current || !ids.includes(String(current))) {
        current = ids[0] ?? null;
        if (current) setActiveTenantId(current);
      }
      setActive(current);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const switchTenant = useCallback((id) => {
    setActiveTenantId(id);
    // Full reload = every page refetches with the new X-Tenant-ID and all in-memory state (cart, filters) is reset.
    window.location.reload();
  }, []);

  const value = useMemo(() => {
    const tenants = me?.tenants ?? [];
    const permissions = me?.permissions ?? [];
    return {
      me, tenants, loading, activeTenantId,
      activeTenant: tenants.find((t) => String(t.id) === String(activeTenantId)) ?? null,
      permissions,
      can: (code) => permissions.includes('*') || permissions.includes(code),
      switchTenant, reload: load,
    };
  }, [me, loading, activeTenantId, load, switchTenant]);

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}
```
Usage rules: wrap the app in `<TenantProvider>` inside the authenticated layout (not on public routes); hide UI with `const { can } = useTenant(); {can('cashbox.close_shift') && <Button .../>}` — the backend still enforces everything; show the active tenant name in the header and in `document.title`; staff (one tenant) see no switcher.

### H.4 `frontend/ilbi/src/api/paginated.js` (new)
```js
/** Normalise list responses: accepts {count,next,previous,results} or a plain array. */
export const unwrapPage = (data) =>
  Array.isArray(data) ? { results: data, count: data.length, next: null, previous: null } : data;

export async function fetchPage(request, endpoint, { page = 1, pageSize = 50, params = {} } = {}) {
  const qs = new URLSearchParams();
  Object.entries({ ...params, page, page_size: pageSize }).forEach(([k, v]) => {
    if (v !== '' && v !== null && v !== undefined) qs.set(k, String(v));
  });
  return unwrapPage(await request(`${endpoint}?${qs.toString()}`));
}
```
Pages use `fetchPage(...)` and the existing `Pagination.jsx` component. Dropdown pickers use the `.../options/?q=` endpoints (T3.7), never "load everything".

### H.5 Logout (in `AuthContext.jsx`)
```js
const logout = async () => {
  try {
    await request('/auth/logout/', { method: 'POST', body: { refresh: getRefreshToken() } });
  } catch { /* the server may be unreachable; local cleanup must still happen */ }
  clearTokens();                    // now also removes drafts, signatures, cart and the active-tenant key
  window.location.assign('/login');
};
```

### H.6 Public receipt (T4.13)
Route `<Route path="/r/:token" element={<PublicReceiptView />} />` placed **outside** the authenticated layout; `PublicReceiptView` fetches `GET /public/receipts/${token}/` (no tenant header — `request()` skips `/public/`), shows the receipt fields only, and for an unknown token shows a neutral "Chek topilmadi" message.
