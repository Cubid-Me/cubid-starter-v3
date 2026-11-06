# Cubid Starter v3

A full-stack Next.js App Router example for the public
[Cubid SDK](https://github.com/Cubid-Me/cubid-sdk). It demonstrates
app-scoped identity, proof of personhood, Sign in with Cubid (SIWC),
ClearPass Verify, comms preferences, and hosted wallet recovery.
The [TanStack starter](https://github.com/Cubid-Me/cubid-tan-starter) is
the sibling for TanStack Start. Earlier starters
[v1](https://github.com/Cubid-Me/cubid-starter-v1) and
[v2](https://github.com/Cubid-Me/cubid-starter-v2) are deprecated archives.

## Start A Project

Use **Use this template** on GitHub, or run:

```sh
gh repo create my-app --template Cubid-Me/cubid-starter-v3 --private --clone
cd my-app
cp -n .env.example .env.local
pnpm install --frozen-lockfile
pnpm dev
```

Use Node 24 LTS (see `.node-version`) and the pnpm version in
`package.json`. This starter runs on Node, including its crypto and
compression helpers. An Edge runtime is not supported.

GitHub templates start new history. Fork the repo instead if you intend to
regularly merge upstream changes. The template normally uses the default
branch. To try a merged `dev` snapshot before it is promoted to `main`,
add `--include-all-branches` when creating the repo, then switch to `dev`.
You can also clone this repository directly and run the setup commands
from its checkout. No sibling SDK checkout is required.

Open [localhost:3000](http://localhost:3000). Missing Cubid configuration
does not prevent the starter from running. For another port, use
`pnpm dev --port 3001` and register the exact corresponding callback URI.

## Register A Cubid OIDC Client

Read [issuer discovery](https://id.cubid.me/.well-known/openid-configuration)
to find the registration endpoint. It takes a JSON **POST**, not browser
navigation. For a new local SIWC client, run this once:

```sh
(
  test ! -e .env.oidc-registration.local.json || exit 1
  umask 077
  curl --fail-with-body --silent --show-error https://id.cubid.me/register \
    --header 'Content-Type: application/json' \
    --output .env.oidc-registration.local.json \
    --data '{
      "client_name": "My app - local development",
      "client_type": "public_web",
      "token_endpoint_auth_method": "none",
      "grant_types": ["authorization_code"],
      "redirect_uris": ["http://localhost:3000/api/cubid/siwc/callback"],
      "default_scopes": ["openid", "profile", "email"],
      "allowed_scopes": ["openid", "profile", "email"]
    }'
)
node -p 'require("./.env.oidc-registration.local.json").client_id'
```

The saved response includes a private `registration_access_token` and
its `registration_client_uri` for managing the client. Keep the file
ignored and private; only the returned `client_id` belongs in the app
configuration. The public-web client uses PKCE and no client secret.

Set these in `.env.local` and restart the server:

```dotenv
CUBID_SIWC_ISSUER_URL=https://id.cubid.me
CUBID_SIWC_CLIENT_ID=your-registered-client-id
CUBID_SIWC_REDIRECT_URI=http://localhost:3000/api/cubid/siwc/callback
CUBID_SIWC_SCOPE="openid profile email"
```

Use exactly the registered scheme, host, port and path. `localhost` and
`127.0.0.1` are different callback hosts. Register a separate production
client with its exact HTTPS callback. For the optional browser-only demo,
register `http://localhost:3000/auth/callback` and configure the public
OIDC variables separately.

## Configure Only What You Use

| Demo | Configuration |
| --- | --- |
| Server-mediated SIWC | `CUBID_SIWC_ISSUER_URL`, `CUBID_SIWC_CLIENT_ID`, and the exact `CUBID_SIWC_REDIRECT_URI` |
| Browser sign-in | `NEXT_PUBLIC_CUBID_ISSUER_URL`, `NEXT_PUBLIC_CUBID_OIDC_CLIENT_ID`, `NEXT_PUBLIC_CUBID_REDIRECT_URI` |
| ClearPass Verify | `NEXT_PUBLIC_CUBID_PASSPORT_BASE_URL`, `NEXT_PUBLIC_CUBID_CLEARPASS_PAGE_ID`, and an app-scoped Cubid ID |
| Notification preferences | Browser sign-in plus `NEXT_PUBLIC_CUBID_PASSPORT_BASE_URL` |
| Wallet recovery | `NEXT_PUBLIC_CUBID_PASSPORT_BASE_URL` and a recovery session ID from the server helper |
| Server API demo | `CUBID_API_BASE_URL`, `CUBID_API_KEY` from [Cubid Admin](https://admin.cubid.me/), and optional `CUBID_DAPP_ID` |

`NEXT_PUBLIC_*` settings can appear in the browser bundle. Never put a
dapp API key, service-role key, recovery bundle, registration management
token, or cookie key there. The server demo returns a safe setup response
when credentials are missing. Add app-level authorization before exposing
credentialed API operations to public users.

`CUBID_SIWC_COOKIE_SECRET` is required in production. Generate it with
`openssl rand -hex 32`; keep it stable across instances. Development uses a
process-local key when it is unset. `CUBID_SIWC_SCOPE` defaults to
`openid profile email`. `CUBID_SIWC_LOGIN_BASE_URL` optionally overrides the
Login health diagnostic; authorization always uses issuer discovery.

## Reuse SIWC Without The Demo UI

The demo never gates the starter. The
[`useSiwcSession` hook](src/hooks/use-siwc-session.ts) exposes session state,
`signIn()`, `clearSession()`, `refresh()`, and safe start diagnostics.
It reads the local session on load, focus, and expiry. The
[standalone panel](src/components/cubid/siwc-panel.tsx) renders the traces.

The [server callback](src/lib/cubid/siwc-callback.ts) validates state,
ID-token signature, issuer, audience, nonce, and userinfo subject. To map
the verified identity to an app account, adapt the callback route:

```ts
import type { NextRequest } from "next/server";
import { handleSiwcCallback } from "@/lib/cubid/siwc-callback";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  return handleSiwcCallback(request, {
    onAuthenticated: async ({ issuer, clientId, subject }) => ({
      accountId: await resolveAccount(issuer, clientId, subject),
    }),
  });
}
```

`resolveAccount` is your own server function. The hook runs only after
verification. It can return only `{ accountId }`, an opaque browser-safe
identifier of 1–128 ASCII letters, digits, hyphens or underscores, or
`undefined`. Other fields, invalid values and exceptions fail closed.
Verified claims are available server-side for mapping, but do not copy raw
claims, credentials, or authorization roles into this summary.

The demo uses encrypted, authenticated HttpOnly cookies with bounded
payloads, short expiry, and a port-specific suffix for alternate local
ports. It persists no tokens. Clearing the starter session does not end
Cubid SSO; the panel offers a separate discovered Cubid logout link.
Production applications should use their own server session and access
checks rather than treating demo status as authorization.

## Validation And Release

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

The browser suite starts a loopback test issuer and exercises real PKCE,
RS256 verification, session refresh/reset, redaction, and signature
rejection. It does not use hosted credentials or prove real passkey login.
The [shared release contract](docs/starter-acceptance.md) includes the manual
hosted acceptance check. Run a production build with `pnpm start`.

Licensed under [Apache-2.0](LICENSE), matching the public Cubid SDK.
