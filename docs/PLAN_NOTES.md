# INVENTRA Plan Notes & Decisions Log

This document records ambiguities, justified scope extensions, human checklist actions, and owner-confirmed decisions during the execution of `INVENTRA_MASTER_PLAN.md`.

---

## 1. Scope Guard Extensions
- **INVENTRA_MASTER_PLAN.md**: Added to `always` in `docs/plan_scope.json` because it is the root master plan document driving this implementation.

---

## 2. Human Action Checklist (Pending Owner / Production Operator)
Checklist from T0.3(d) to be performed manually in production environments:
- [ ] Rotate `SECRET_KEY` in production (old insecure key exists in git history).
- [ ] Rotate `TELEGRAM_BOT_TOKEN`.
- [ ] Rotate MinIO / S3 credentials.
- [ ] Invalidate all JWT tokens after rotating keys.
- [ ] Configure production domain and SSL certificate (Phase 9).

---

## 3. Ambiguities & Conflict Records
*(Empty. Will be logged if any task encounters conflicts with existing code.)*
