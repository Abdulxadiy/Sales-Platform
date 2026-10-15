# ILBI frontend

React/Vite interface for the ILBI sales platform. Updated: 2026-10-14.

## Development

From this directory:

```bash
npm ci
VITE_API_TARGET=http://127.0.0.1:8000 npm run dev
```

Vite proxies `/api` and `/media` to `VITE_API_TARGET` (default: `http://localhost`). Use the root Docker Compose setup when the backend, proxy and frontend should start together. Production builds use the production stage in this directory's Dockerfile.

```bash
npm test
npm run lint
npm run build
```

## Routes and access

`App.jsx` defines public entry pages, authenticated layout routes and role gates. Account state comes from `context/AuthContext.jsx`; consumers use `hooks/useAuth.js` and the stable context object is in `context/authContext.js`; active shop context comes from `TenantContext`. The API checks permissions independently of frontend navigation.

- `/login`: username/phone/email, password and Telegram OTP; includes a public help link.
- `/support`: public help center; guests and signed-in users have private conversations. Platform administrators see the operator inbox. UI languages: Uzbek, Russian, English.
- `/docs`: guides and documents filtered by role. Administrator editing writes the corresponding backend Markdown file.
- `/pos`, `/catalog`, `/inventory`, `/sales`, `/debts`, `/b2b`, `/shifts`: operational pages; access and buttons depend on role/permissions.
- `/my-tenants`, `/tenants`, `/seller-profiles/review`, `/employees`, `/services`, `/audit`: relevant owner/admin workflows.

The global help launcher shows unread support replies. On POS, help is a header link so checkout remains unobstructed. Support requests do not automatically inherit a stale tenant header; new conversations attach the active authorized shop only when available.

## Documentation images

`MarkdownViewer` renders the current guides and resolves known Markdown document links into the help center. `DocImage` opens focused PNG screenshots in a native dialog with zoom and keyboard dismissal. Images come from `/api/v1/docs/images/` and use synthetic demo fixtures.

The source documentation is in [docs](../../docs/README.md). Support endpoint/setup details are in [SUPPORT.md](../../docs/SUPPORT.md). The capture script is `scripts/capture_guides.cjs` at repository root.

## Current product limits

Retail POS uses UZS; the USD calculator is informational. The backend currently blocks production retail sales pending fiscal integration. AI support has not been connected. Role guides remain in Uzbek; translated public starter guides and the support interface cover all three supported languages.

## Development recovery

If the support app was added while Docker services were already running, apply its migration with `docker compose exec -T ilbi python manage.py migrate support --noinput` from the repository root. Backend source reloads do not apply schema changes.

A failed support read backs off instead of issuing overlapping repeated requests. The retry button resumes reads. For a development render error, reload once; the recovery button preserves local sessions, guest chat access and drafts.
