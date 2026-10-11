# INVENTRA Plan Notes & Decisions Log

This document records ambiguities, justified scope extensions, human checklist actions, and owner-confirmed decisions during the execution of `INVENTRA_MASTER_PLAN.md`.

---

## 1. Scope Guard Extensions
- **INVENTRA_MASTER_PLAN.md**: Added to `always` in `docs/plan_scope.json` because it is the root master plan document driving this implementation.
- **frontend/inventra/src/components/docs/MarkdownViewer.jsx**: Added to `phase0` in `docs/plan_scope.json` because an unhandled conditional `useEffect` call violated React Rules of Hooks and caused `npm run lint` in the T0.2 CI job to fail. Moving `useEffect` before the early return resolved the single error in the frontend.

---

## 2. Linting & CI Observations
- **T0.2 Ruff in CI**: Legacy backend files contain ~580 lint warnings (e.g. unused imports, line lengths, unsorted imports). In accordance with §1A.2 (Rule 5: "No mass ruff --fix over untouched files" and Rule 16: "Do not fix lint/type warnings in files you are not already editing") and Appendix E ("ruff check clean for touched files"), untouched files are not modified in Phase 0. CI runs `ruff check . --exit-zero` while each touched file is kept strictly clean.

---

## 3. Human Action Checklist (Pending Owner / Production Operator)
Checklist from T0.3(d) to be performed manually in production environments:
- [ ] Rotate `SECRET_KEY` in production (old insecure key exists in git history).
- [ ] Rotate `TELEGRAM_BOT_TOKEN`.
- [ ] Rotate MinIO / S3 credentials.
- [ ] Invalidate all JWT tokens after rotating keys.
- [ ] Configure production domain and SSL certificate (Phase 9).

---

## 4. Ambiguities & Conflict Records
*(None at present)*
