# Mobile toolchain dependency findings

Checked on 2026-10-25 against the locked dependency tree and the live npm advisory service. `npm audit` currently reports **5 high-severity dependency entries, 2 underlying advisories**. These findings remain open. The CI `mobile-dependency-security` job runs the unfiltered high-severity audit and fails while they remain unresolved.

- `node-forge@1.4.0` is required by Expo CLI and its certificate helper. The [maintainer fix PR](https://github.com/digitalbazaar/forge/pull/1152) is still open and the latest npm release is 1.4.0. The [advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv) lists no patched release.
- `zod@3.25.76` is required by `@expo/cli@58.1.15` through `^3.25.76` and by the React Hooks lint toolchain. npm flags versions below 4.6.6. The [maintainer patch](https://github.com/colinhacks/zod/commit/a0ebf97) changes Zod v4. A global override to v4 would cross the CLI/linter dependency's declared major version; its compatibility has not been established.

The application source does not import either package. This is a development/build-tool dependency boundary; that observation does not waive the findings or establish native release safety. Expo SDK remains 58. Expo doctor passes 20/20 checks. npm's suggested forced downgrade to Expo 44 is incompatible with this application's current React Native/Router stack and was not applied.

Resolution requires a reviewed fixed Forge release and compatible Expo/lint dependencies, or a reviewed reproducible vendor patch with targeted certificate/schema tests. Do not edit `node_modules` by hand, suppress the audit, change version numbers to hide findings, or claim these findings fixed because app tests pass. Repeat `npm audit --json` and verify dependency compatibility when an upstream update becomes available.
