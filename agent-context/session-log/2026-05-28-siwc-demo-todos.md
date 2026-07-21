# 2026-05-28 SIWC Demo TODOs

## 2026-05-28T20:39:42Z

- Agent: Codex
- Branch: codex/siwc-demo-todos
- Head: 241673d
- Summary: Defined the starter v3 SIWC demo panel contract as an embedded developer-facing protocol demo instead of app-wide starter authentication.
- Validation: `git diff --check -- agent-context/todo.md agent-context/session-log/2026-05-28-siwc-demo-todos.md`
- Follow-ups: Implement SIWC-DEMO02 with server-mediated OIDC start, callback, session, and logout routes before adding trace UI.

## 2026-05-28T20:42:46Z

- Agent: Codex
- Branch: codex/siwc-demo-todos
- Head: 87c3ba5
- Summary: Implemented starter-owned SIWC route handlers for OIDC start, callback, session summary, and starter-session logout.
- Validation: `git diff --check -- src/lib/cubid/siwc-demo.ts src/app/api/cubid/siwc/start/route.ts src/app/api/cubid/siwc/callback/route.ts src/app/api/cubid/siwc/session/route.ts src/app/api/cubid/siwc/logout/route.ts`; `pnpm typecheck`
- Follow-ups: Add the ordered request/response trace and browser panel rendering for SIWC-DEMO03.

## 2026-05-28T20:43:35Z

- Agent: Codex
- Branch: codex/siwc-demo-todos
- Head: ecab6e4
- Summary: Added a server-maintained SIWC trace covering discovery, authorization, callback, token exchange, userinfo, session creation, and starter-session logout.
- Validation: `pnpm typecheck`
- Follow-ups: Add visible SSO demonstration controls and wire the panel actions to the SIWC routes.

## 2026-05-28T20:46:10Z

- Agent: Codex
- Branch: codex/siwc-demo-todos
- Head: 3f2c329
- Summary: Added the visible SIWC/SSO demo panel with normal, force-login, force-consent, starter-session logout, hosted Cubid logout, and safe trace rendering.
- Validation: `pnpm typecheck`; `pnpm lint`
- Follow-ups: Document local, hosted, and preview SIWC setup for starter v3.

## 2026-05-28T20:47:15Z

- Agent: Codex
- Branch: codex/siwc-demo-todos
- Head: 04535e4
- Summary: Documented server-mediated SIWC env setup, local and hosted callback URLs, preview deployment handling, and why `starter.cubid.me` remains a relying-party demo client.
- Validation: `git diff --check -- README.md .env.example`
- Follow-ups: Validate the demo panel locally and record any hosted Cubid gaps.

## 2026-05-28T20:48:25Z

- Agent: Codex
- Branch: codex/siwc-demo-todos
- Head: d8c5dae
- Summary: Validated the implemented starter SIWC demo as far as local configuration allows and recorded the live OIDC round-trip blocker.
- Validation: `pnpm lint`; `pnpm typecheck`; `pnpm build`; built server smoke checks on `http://localhost:3210/api/cubid/siwc/session`, `POST /api/cubid/siwc/logout`, and `GET /api/cubid/siwc/start`.
- Follow-ups: Configure `CUBID_SIWC_CLIENT_ID` or `NEXT_PUBLIC_CUBID_OIDC_CLIENT_ID` with a registered callback URL, then complete the live Cubid redirect/callback validation.

## 2026-07-21T02:28:04Z

- Agent: Codex issue-implementer
- Branch: codex/siwc-demo-todos
- Head: ef43a4c
- Summary: Reconciled STARTER-01 and the three registered dirty UI files with the SDK production issuer handoff; added exact configured/discovered issuer validation, discovery-owned logout metadata, recursive trace/session secret and PII redaction, focused route/helper tests, a complete env reference, and responsive demo hardening.
- Validation: `pnpm test` (7 passed); `pnpm lint`; `pnpm typecheck`; `pnpm build`; `git diff --check`; production-server API smoke on port 3210 for unsigned session, safe missing configuration, and starter-only logout; Playwright desktop and 390px mobile snapshots/screenshots, including verification that mobile document width is 375px with no horizontal overflow.
- Follow-ups: Independent issue validation is required before moving STARTER-01 to In Review. STARTER-02 owns Vercel deployment, production env configuration, relying-party registration, and the hosted callback round trip; do not deploy from this task.

## 2026-07-21T02:39:25Z

- Agent: Codex issue-implementer
- Branch: codex/siwc-demo-todos
- Head: da81ae3
- Summary: Fixed the STARTER-01 validator's callback open-redirect reproduction by strictly rejecting raw, encoded, and repeatedly encoded authority-like slash/backslash paths and resolving every accepted return target against the exact request origin.
- Validation: `pnpm test` (22 passed); `pnpm lint`; `pnpm typecheck`; `pnpm build`; `git diff --check`; built server on port 3210 returned same-origin `http://localhost:3210/?siwc_error=missing_config` for `/\\evil.example/proof`, `/%5Cevil.example/proof`, `/%5C%5Cevil.example/proof`, `//evil.example/proof`, and `/%2F%2Fevil.example/proof`, while preserving `/docs/siwc?tab=callback` locally.
- Follow-ups: Re-run independent validation on the new fix commit before moving STARTER-01 to In Review. STARTER-02 remains out of scope; do not merge or deploy from this task.
