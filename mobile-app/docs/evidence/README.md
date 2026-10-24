# Verification evidence

`implementation-*` records the current implementation checks. `review-*`, `phase1_*` and `full_test_suite_output.txt` are historical prototype/review outputs. A passing Android/iOS Hermes export is a JavaScript bundle check, not an installed native package test.

The current checkpoint has 176 passing Jest tests, strict ESLint with zero warnings, TypeScript checking, real isolated PostgreSQL/Django serializer/idempotency and receipt-tax checks, both native JavaScript exports and the interactive Docker phone regression. Current screenshots use explicit synthetic preview data.

The live audit ledger is authoritative for remaining work and external gates. Security findings are recorded separately in `../DEPENDENCY_SECURITY.md`; passing application tests does not resolve those findings.

Historical Docker/lint traces have terminal whitespace normalized for plain-text review. Their recorded outcomes are preserved.
