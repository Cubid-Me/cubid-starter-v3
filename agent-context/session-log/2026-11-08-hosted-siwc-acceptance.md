# Starter v3 hosted SIWC acceptance

- Date: 2026-11-08 (America/Toronto).
- Tested source: `599c43e7cb81582e17dd20d2ee50188067203df5` (`dev`).
- Environment: [protected HTTPS preview](https://cubid-starter-v3-dev-599c43e.vercel.app/#siwc), Vercel deployment `dpl_2CVhypw6LhLwzHti89SYdPPNLTTK`.
- Exact registered callback: `https://cubid-starter-v3-dev-599c43e.vercel.app/api/cubid/siwc/callback`. The preview used a separate public PKCE client and server-only session key, with no dapp API key. The deploy used a preview-only frozen pnpm install override. Production settings were unchanged.
- Preflight: Canonical UI, unsigned session, exact callback, S256, secure transaction cookie, and safe missing-transaction and mismatched-state returns. The server API demo returned a safe `503` naming missing settings only.
- Hosted browser: A user completed passkey and consent with the designated test identity. The preview verified callback state, token exchange, signature, issuer, audience and nonce, fetched userinfo, and displayed a signed-in starter session. The trace redacted protocol secrets. Reload preserved the session. Clearing the starter session returned to unsigned and stayed cleared after reload.
- Modes: Normal relaunch and Force login reached the hosted passkey prompt. The current issuer does not reuse sign-in sessions across authorization requests. Force consent completed another verified passkey callback with `prompt=consent` recorded in the trace.
- Expiry: The second session was signed in before its reported 15-minute expiry and returned to unsigned without a reload or manual reset. The sign-in control remained usable. The focus-refresh path passed the signed loopback browser test.
- Automated checks: [Exact-source CI](https://github.com/Cubid-Me/cubid-starter-v3/actions/runs/42247901699) and a fresh credential-free run both passed frozen install, lint, typecheck, 34 unit tests, build and four Chromium tests.
- Scope: Preview evidence only. Production acceptance and the broader [STARTER-03](https://github.com/Cubid-Me/cubid-starter-v3/issues/4) work remain separate.
