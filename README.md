# Cubid Starter v3

Canonical full-stack Next.js starter for the modern Cubid public SDK package
family from [`Cubid-Me/cubid-sdk`](https://github.com/Cubid-Me/cubid-sdk).

This app demonstrates Cubid as an identity stack first: identity aggregation,
proof of personhood and sybil-defense signals, Login with Cubid, ClearPass
Verify, user notification preferences, and passkey-first wallet recovery.

Deprecated archive references:

- [`Cubid-Me/cubid-starter-v1`](https://github.com/Cubid-Me/cubid-starter-v1)
- `/Users/botmaster/src/cubid/cubid-starter-v2`

Do not copy wallet-heavy examples, old `cubid-sdk` usage, deprecated
`@cubid/web2` / `@cubid/web2-react` imports, Cubid-generated wallet creation,
or normal Cubid transaction-signing examples from those projects.

## What This Starter Shows

- `@cubid/core` in a server-only Next.js API route for dapp API-key calls.
- `@cubid/auth` and `@cubid/auth-react` for Login with Cubid / OIDC PKCE.
- `@cubid/browser` and `@cubid/react` for hosted ClearPass Verify launchers.
- `@cubid/comms` for signed-in notification channel and preference metadata.
- `@cubid/wallet-recovery` and `@cubid/wallet-recovery-react` for hosted,
  user-authorized recoverable-wallet recovery launchers.

Cubid dapp API keys, service-role keys, and recovery bundle material must stay
out of browser env vars and client bundles.

## Copy-Paste Local Setup

```sh
cd /Users/botmaster/src/cubid/cubid-starter-v3
cp .env.example .env.local
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). If port 3000 is busy,
Next.js will print the alternate local URL. Update
`NEXT_PUBLIC_CUBID_REDIRECT_URI` and the Cubid OIDC client redirect URI to
match that alternate port before testing Login with Cubid.

## Environment Variables

Browser-safe values use `NEXT_PUBLIC_*` and can appear in the client bundle:

```sh
NEXT_PUBLIC_CUBID_ISSUER_URL=https://id.cubid.me
NEXT_PUBLIC_CUBID_OIDC_CLIENT_ID=your-oidc-client-id
NEXT_PUBLIC_CUBID_REDIRECT_URI=http://localhost:3000/auth/callback
NEXT_PUBLIC_CUBID_PASSPORT_BASE_URL=https://passport.cubid.me
NEXT_PUBLIC_CUBID_CLEARPASS_PAGE_ID=your-clearpass-page-id
```

Server-only values are read only by `src/app/api/cubid/server-demo/route.ts`:

```sh
CUBID_API_BASE_URL=https://passport.cubid.me
CUBID_API_KEY=your-dapp-api-key
CUBID_DAPP_ID=your-dapp-id
CUBID_SIWC_ISSUER_URL=https://id.cubid.me
CUBID_SIWC_CLIENT_ID=your-oidc-client-id
CUBID_SIWC_REDIRECT_URI=http://localhost:3000/api/cubid/siwc/callback
CUBID_SIWC_SCOPE="openid profile email"
```

Never rename server credentials to `NEXT_PUBLIC_*`. The starter intentionally
fails the server demo with a safe setup response when `CUBID_API_BASE_URL` or
`CUBID_API_KEY` is missing.

### Required For Cubid To Work

Set these values in `.env.local` before testing live Cubid flows:

| Variable | Required for | Where to get it |
| --- | --- | --- |
| `NEXT_PUBLIC_CUBID_ISSUER_URL` | Login with Cubid / OIDC PKCE discovery. | Cubid issuer URL, usually `https://id.cubid.me`. |
| `NEXT_PUBLIC_CUBID_OIDC_CLIENT_ID` | Browser sign-in launch and callback handling. | Create or copy the OIDC client id in [Cubid Admin](https://admin.cubid.me/). |
| `NEXT_PUBLIC_CUBID_REDIRECT_URI` | OIDC callback validation. | Use your local callback URL, for example `http://localhost:3000/auth/callback`, and register the same URL on the OIDC client. |
| `NEXT_PUBLIC_CUBID_PASSPORT_BASE_URL` | Hosted Cubid browser flows such as ClearPass Verify, comms, and recovery launchers. | Cubid hosted app/API origin, usually `https://passport.cubid.me`. |
| `CUBID_SIWC_ISSUER_URL` | Server-mediated SIWC issuer discovery. | Cubid issuer URL, usually `https://id.cubid.me`. |
| `CUBID_SIWC_CLIENT_ID` | Server-mediated SIWC start and callback routes. | Create or copy the OIDC client id in [Cubid Admin](https://admin.cubid.me/). |
| `CUBID_SIWC_REDIRECT_URI` | Server-mediated SIWC callback handling. | Use `http://localhost:3000/api/cubid/siwc/callback` locally and register that exact URL on the OIDC client. |
| `CUBID_API_BASE_URL` | Server API demo calls through `@cubid/core`. | Cubid API origin, usually `https://passport.cubid.me`. |
| `CUBID_API_KEY` | Server-side dapp API calls such as ensure user, identity, score, stamps, and recovery metadata. | Generate or copy your dapp API key in [Cubid Admin](https://admin.cubid.me/). Keep it server-only. |

### Optional Or Flow-Specific

| Variable | Used for | Notes |
| --- | --- | --- |
| `CUBID_DAPP_ID` | Cubid API endpoints that require an explicit dapp id. | Set it if your Cubid environment or API key is scoped by dapp id. Keep it server-only unless Cubid explicitly provides a public page/dapp id for a browser flow. |
| `CUBID_SIWC_SCOPE` | Server-mediated SIWC scopes. | Defaults to `openid profile email`. Add scopes only when the consuming app has a clear need and Cubid Admin allows them for the client. |
| `NEXT_PUBLIC_CUBID_CLEARPASS_PAGE_ID` | ClearPass Verify launcher. | Required only for the ClearPass Verify demo. This is browser-safe because it identifies a hosted verification page, not a secret. |

## Cubid Console Setup

Create or configure an OIDC client in Cubid with:

- Issuer URL: the Cubid issuer, for example `https://id.cubid.me`.
- Client id: copied into `NEXT_PUBLIC_CUBID_OIDC_CLIENT_ID`.
- Browser callback redirect URI: `http://localhost:3000/auth/callback` for the
  legacy browser-only demo.
- Server SIWC callback redirect URI:
  `http://localhost:3000/api/cubid/siwc/callback` for the server-mediated
  protocol demo.
- Post-logout redirect URI: `http://localhost:3000` for local dev.

For a hosted starter at `https://starter.cubid.me`, register:

- App origin: `https://starter.cubid.me`.
- Server SIWC callback redirect URI:
  `https://starter.cubid.me/api/cubid/siwc/callback`.
- Post-logout redirect URI: `https://starter.cubid.me`.

For preview deployments, register the preview callback URL exactly as Vercel
serves it, for example
`https://cubid-starter-v3-git-branch-org.vercel.app/api/cubid/siwc/callback`.
Do not reuse the production callback URL for previews unless the preview is
served from that same origin.

`starter.cubid.me` is acceptable even though it is a Cubid subdomain. The
starter remains an OIDC client/relying party. Cubid passkeys and SSO are owned
by the Cubid login issuer, and the starter receives only the OIDC callback and
its own short-lived demo session.

The server-mediated demo reads every concrete OIDC endpoint from discovery and
rejects discovery metadata whose issuer does not exactly match the configured
issuer (ignoring only a trailing slash). The optional Cubid-hosted logout link
is shown only after discovery provides `end_session_endpoint`; the starter does
not construct issuer-relative endpoint paths. Callback return targets are
normalized as local paths and resolved only when their origin exactly matches
the starter request origin; authority-like slash and backslash variants fall
back to `/`. Visible session and trace output redacts token material,
authorization codes, PKCE verifiers, nonce/state values, cookies, and direct
PII while retaining protocol facts and the app-scoped pairwise subject.

Create or configure your dapp API credentials with:

- Cubid API base URL: copied into `CUBID_API_BASE_URL`.
- Dapp API key: copied into `CUBID_API_KEY`.
- Dapp id: copied into `CUBID_DAPP_ID` when your Cubid environment requires it.
- ClearPass page id: copied into `NEXT_PUBLIC_CUBID_CLEARPASS_PAGE_ID`.

## Package Source

Most `@cubid/*` packages are published on npm. This checkout is also wired as a
small pnpm workspace that links the current local SDK packages from:

```txt
/Users/botmaster/src/cubid/cubid-sdk-v2/packages/*
```

That keeps the starter aligned with the canonical SDK source while package
publishing catches up, especially for `@cubid/comms`.

## Validation

```sh
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

The focused tests cover missing configuration, mismatched callback state,
mismatched ID-token nonce, configured/discovered issuer mismatch, safe return
paths, and recursive trace/session redaction.

## Production Deployment Handoff

Do not deploy this branch as part of the implementation task. The deployment
task must first merge this PR, then configure the production Vercel project
with `CUBID_SIWC_ISSUER_URL=https://id.cubid.me`, the registered production
client id, and the exact
`https://starter.cubid.me/api/cubid/siwc/callback` redirect URI. Register that
same callback and `https://starter.cubid.me` post-logout URI on the production
relying-party client. Keep preview callbacks separate and exact; never use a
staging issuer as an implicit production fallback.

The browser demo can render without server credentials. The server demo returns
a non-secret setup message until server-only Cubid credentials are present in
`.env.local`.
