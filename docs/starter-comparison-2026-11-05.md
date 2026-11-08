# Cubid starter comparison and delivery assessment

Snapshot: 2026-11-05. Next.js starter implementation: `a6c4c01`.
TanStack starter: `c4caf1e`. This is an assessment, not an active backlog;
approved implementation work should be tracked in GitHub Issues/Projects.

## Delivery gates

| Gate | Evidence | State |
| --- | --- | --- |
| Commit previous Next.js work | `a6c4c01`, branch `codex/siwc-panel-completion` | Complete locally; not pushed |
| Register OIDC client | Live issuer accepted a public-web Authorization Code + PKCE client with token endpoint authentication `none` | Complete |
| Register exact callback | Both `http://localhost:3000/api/cubid/siwc/callback` and `http://localhost:3001/api/cubid/siwc/callback` are registered | Complete |
| Configure local app | Server-only `.env.local`; registration management token stored separately in an ignored file; both mode 0600 | Complete |
| Start live authorization | Starter redirected through production issuer to the Cubid-hosted Login screen displaying the correct client name and passkey requirement | Complete |
| Verify real callback/session | Passkey request requires the user's authenticator; the initial request timed out without a response | Pending user authentication |
| Review and authorize production delivery | Local checks passed; successful real callback, refreshed session and reset/logout still need verification | Hold |

The preview uses port 3001 because an unrelated application occupies port 3000.
That application was preserved. No production deployment, starter push, or
template-setting change was performed. Human consent/authenticator actions
cannot be replaced with a mocked success or an agent approval.

## Comparison

| Area | Next.js starter v3 | TanStack starter |
| --- | --- | --- |
| Framework | Next.js App Router | TanStack Start with Vite and Nitro Node adapter |
| SDK dependencies | Published `@cubid/*` packages | Same published package versions |
| Core SIWC behavior | Server-mediated PKCE, verified ID token, encrypted cookies, redacted trace | Same behavior, ported from v3 |
| Client integration | SIWC state and panel live together in `browser-demo.tsx` | Dedicated `useSiwcSession` hook and `siwc-panel.tsx` |
| Server integration | NextRequest/NextResponse route handlers | Thin route adapters calling Web Request/Response handlers |
| App account mapping | No explicit extension hook | `onAuthenticated` receives verified claims and may return `session.app` extras |
| GitHub template setting | Disabled, verified on GitHub | Enabled, verified on GitHub |
| Automated CI | No tracked GitHub workflow | No tracked GitHub workflow |
| Local validation | 29 tests, lint, typecheck, build passed | 29 tests, lint, typecheck, build passed |

The TanStack build succeeds with bundler warnings about preserved `use client`
directives in dependencies. These are not failing checks, but host-specific
deployment smoke tests remain necessary. Framework-neutral handler types do
not make the Node crypto/zlib implementation automatically portable to every
edge runtime.

## Recommendations for Next.js v3

1. **Make v3 a GitHub template.** Enable the repository template setting and
   document `gh repo create my-app --template Cubid-Me/cubid-starter-v3`.
   Replace the machine-specific `cd /Volumes/MiniBot/...` setup with a
   clone/template-first path. Keep app identity and credential values unset
   in the template, and choose an explicit source license before promoting
   broad reuse. Neither repository currently has a GitHub-recognized license.
2. **Bring back TanStack's integration structure.** Extract a reusable
   `useSiwcSession` hook and standalone SIWC panel. Keep Next.js-specific
   route adapters, and introduce an explicit post-verification account-mapping
   hook only with a documented, bounded, browser-safe return schema.
3. **Keep diagnostics useful while simplifying adoption.** Preserve v3's
   failed-start request/response trace, including when configuration is absent.
   Export the supported integration surface so consumers need not copy demo UI
   to use authentication.

Evidence: [current SIWC component](../src/components/cubid/browser-demo.tsx),
[callback](../src/app/api/cubid/siwc/callback/route.ts),
[setup instructions](../README.md).

## Recommendations for TanStack

1. **Test and constrain the new account hook.** Add tests for hook success,
   failure, no hook execution on invalid state/nonce/token, safe `session.app`
   disclosure, and oversized return data. Currently the added hook has no
   corresponding tests. The session cookie is not size-bounded like the trace,
   so arbitrary extras can cause browser cookie rejection. Use an allowlist
   and a defined size budget for extras; keep credentials and private claims
   out of the browser session summary.
2. **Repair template update instructions.** The README repeats the history
   alignment section and offers `reset --hard` plus force-push as the setup
   path. Remove the duplication. Clearly distinguish template-generated
   independent history from a history-preserving fork, recommend forks when
   ongoing upstream merges are important, and avoid a destructive default.
3. **Restore start-failure protocol diagnostics.** The reusable hook currently
   converts failed start responses into an error string. Preserve sanitized
   request/response details for the demo, as v3 does, without coupling the
   reusable hook to the panel's presentation.

Evidence: [client hook](https://github.com/Cubid-Me/cubid-tan-starter/blob/c4caf1e/src/hooks/use-siwc-session.ts),
[server hooks](https://github.com/Cubid-Me/cubid-tan-starter/blob/c4caf1e/src/server/cubid/siwc-handlers.ts),
[README](https://github.com/Cubid-Me/cubid-tan-starter/blob/c4caf1e/README.md).

## Improvements shared by both

- Add CI for install from the frozen lockfile, tests, lint, typecheck and build.
  Add a browser smoke using a test issuer with signed tokens, then record a
  separate manual hosted passkey/consent/callback acceptance check for releases.
- Document actual dynamic client registration (`POST` to the issuer's
  discovered registration endpoint), secure retention of the registration
  management token, and exact callback matching. The current generic Admin
  instructions are insufficient for the registration flow just exercised.
- Enable demo panels per capability. Missing a ClearPass page ID currently
  hides the whole browser demo, including unrelated browser sign-in and comms.
- Apply redaction consistently to the browser-only demo as well: both still
  display access-token fragments and raw claim/userinfo objects there, while
  the server-mediated SIWC panel redacts them.
- Treat app authentication and demo authentication as separate documented
  choices. Refresh session state on expiry/focus, and label starter-only
  logout separately from ending Cubid SSO. Namespace cookies when several
  starter instances share localhost, since cookie scope does not include ports.
- Keep the two frameworks as maintained siblings with a shared acceptance
  contract and explicit Node/runtime requirements. Prefer SDK-owned protocol
  primitives over creating another shared starter framework prematurely.

Recommendation: preserve both starters. Bring TanStack's reusable integration
surface into Next.js, and bring v3's diagnostic completeness into TanStack.
Authorize production delivery only after the outstanding real sign-in gate
has passed and its evidence has been recorded.
