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
