# Cubid Starter v3 TODO

This file tracks starter-app roadmap work. Keep this app a developer-facing
demo surface, not a production auth gate for the starter itself.

## SIWC / SSO / OIDC Demo Panel

### SIWC-DEMO01. Define the embedded SIWC demo panel contract

- Status: Completed 2026-05-28
- Feature branch: codex/siwc-demo-todos
- Target surface: `src/components/cubid/browser-demo.tsx` or a sibling panel

Add a panel inside the existing starter page that demonstrates Sign in with
Cubid without using Cubid to log into or gate the starter app itself. The first
screen should show a clear "not signed in yet" demo state, a "Sign in with
Cubid" action, and a short explanation that an existing Cubid session may skip
the passkey prompt as normal SSO behavior. The panel should make it obvious
that the starter app is demonstrating the protocol flow, not protecting its own
routes.

Completion note: the starter SIWC surface is defined as an embedded
developer-facing demo panel, not app-wide authentication. The panel should show
an initial unsigned demo state, launch Cubid-hosted OIDC/SIWC, return with a
starter-owned demo session, and expose safe protocol details for developers.

### SIWC-DEMO02. Implement server-mediated OIDC start/callback/session/logout routes

- Status: Completed 2026-05-28
- Feature branch: codex/siwc-demo-todos
- Depends on: SIWC-DEMO01

Implement the demo through starter-owned server routes instead of storing raw
tokens in browser state. Add routes for:

- `GET /api/cubid/siwc/start`
- `GET /api/cubid/siwc/callback`
- `GET /api/cubid/siwc/session`
- `POST /api/cubid/siwc/logout`

The start route should create `state`, `nonce`, and PKCE verifier values in
HttpOnly cookies, then redirect to the Cubid issuer authorization endpoint.
The callback route should validate state and nonce, exchange the authorization
code server-side, store a short-lived demo session in an HttpOnly cookie, and
redirect back to the starter page. The session route should return a redacted
browser-safe session summary. The logout route should clear only the starter
demo session by default, preserving the distinction between starter app session
and Cubid SSO session.

Completion note: starter-owned SIWC API routes now launch Cubid OIDC with
state, nonce, and PKCE in HttpOnly cookies; handle callbacks server-side; store
only a short-lived redacted demo session in an HttpOnly cookie; expose a safe
session summary; and clear only the starter demo session on logout.

### SIWC-DEMO03. Add an ordered request/response trace for developer education

- Status: Completed 2026-05-28
- Feature branch: codex/siwc-demo-todos
- Depends on: SIWC-DEMO02

Record and display the OIDC/SIWC calls made during the demo in chronological
order. The panel should show enough detail for a developer to understand the
flow, while redacting secrets and bearer tokens. Include at least:

- issuer discovery request and selected endpoints;
- authorization request parameters, including client id, redirect URI, scopes,
  state presence, nonce presence, PKCE method, and optional prompt/max-age;
- callback query result, with code/state presence but not raw secrets;
- token exchange request summary and response summary with token values
  redacted;
- userinfo request/response summary when enabled;
- final app-scoped subject, claims, and session status;
- logout request and cleared-session response.

The trace should persist across the callback redirect long enough to render the
complete flow after the user returns to the starter page.

Completion note: the SIWC routes now maintain a short-lived ordered trace for
discovery, authorization, callback, token exchange, userinfo, session creation,
and starter-session logout. The session route returns the trace with token,
code, verifier, nonce, and cookie values redacted or represented only by
presence flags.

### SIWC-DEMO04. Add SSO demonstration controls

- Status: Completed 2026-05-28
- Feature branch: codex/siwc-demo-todos
- Depends on: SIWC-DEMO02

Add controls that let developers see the difference between normal OIDC SSO and
forced re-auth/consent behavior:

- normal SIWC start, which may reuse an existing Cubid session;
- force login, using `prompt=login` or `max_age=0` when supported;
- force consent, using `prompt=consent` when supported;
- clear starter demo session only;
- optional link to Cubid-hosted logout if the developer wants to reset the
  Cubid SSO session too.

The panel copy should explain that a passkey scoped to `cubid.me` does not
automatically log the user into the starter. It only becomes relevant when
Cubid's login surface starts a WebAuthn ceremony, and an existing Cubid session
may legitimately skip that ceremony.

Completion note: the browser demo now includes a server-mediated SIWC/SSO panel
with normal sign-in, force-login, force-consent, starter-session-only logout,
and a Cubid logout link. The panel renders the safe session/trace payload
returned by the starter routes.

### SIWC-DEMO05. Document hosted domain setup for `starter.cubid.me`

- Status: Completed 2026-05-28
- Feature branch: codex/siwc-demo-todos
- Depends on: SIWC-DEMO02

Update the starter setup docs and env examples for local and hosted SIWC demos.
Document the expected issuer, login UI origin, callback URL, post-logout URL,
and Cubid Admin client configuration for:

- local development, for example `http://localhost:3000/auth/callback` or the
  new server callback route;
- hosted starter, for example `https://starter.cubid.me`;
- preview deployments, where callback URLs may be branch-specific.

Call out that `starter.cubid.me` being a Cubid subdomain is acceptable. The
starter remains a relying party/client, while `login.cubid.me` owns passkeys
and Cubid SSO.

Completion note: README and `.env.example` now document the server-mediated
SIWC issuer, client id, callback URL, scopes, local callback, hosted
`starter.cubid.me` callback, preview callback handling, post-logout URL, and
why a Cubid subdomain can still demo OIDC as a relying-party client.

### SIWC-DEMO06. Validate the demo panel locally and against hosted Cubid

- Status: Blocked 2026-05-28 on local Cubid OIDC client configuration
- Feature branch: codex/siwc-demo-todos
- Depends on: SIWC-DEMO03, SIWC-DEMO04, SIWC-DEMO05

Validate the panel with browser testing and record the result. Cover:

- first-run user with no starter demo session;
- user with an existing Cubid SSO session;
- force-login behavior;
- force-consent behavior;
- starter-session logout without Cubid logout;
- callback state mismatch failure;
- missing env/client configuration;
- redaction of access tokens, ID tokens, refresh tokens, PKCE verifier, nonce,
  and cookies from the visible trace.

This todo is complete when the demo reliably shows "not signed in yet" on page
load, launches SIWC, returns to "successfully signed in" after callback, and
prints the ordered safe request/response trace.

Validation note: local static/type/build validation passed. A built server on
port 3210 returned `not_signed_in` for the session route, cleared only the
starter session through logout, and returned a safe `missing_config` response
from the start route because no local SIWC/OIDC client id is configured. The
live Cubid redirect/callback round trip remains open until a registered client
id and callback URL are available locally or in a hosted preview environment.
