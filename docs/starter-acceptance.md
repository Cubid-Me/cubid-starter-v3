# Cubid starter acceptance contract

Use the same criteria for Next.js v3 and the TanStack sibling. Framework
adapters can differ; issuer, PKCE, state/nonce, claims, and redaction
behavior should agree. Use the published SDK for protocol primitives.

## Automated

1. Install from a frozen lockfile on the documented Node runtime. Run
   lint, typecheck, unit tests and production build without credentials.
2. Exercise a browser authorization redirect, exact callback, S256
   verifier exchange, RS256/JWKS verification, state/nonce and subject
   checks, redacted session, persistence, focus refresh and local reset.
3. Reject a tampered ID-token signature and create no session on failure.
   Unit tests cover mapping success/failure, unsafe redirect paths and
   forged or cross-port cookies. No production secrets belong in tests.
4. Verify missing configuration leaves the unrelated demo controls usable
   and displays a safe, actionable response. Inspect client assets for
   secrets whenever deploying with server credentials.

## Hosted sign-in release gate

1. Register the exact HTTPS preview or production callback with the
   intended Cubid client. Use a separate dev client for localhost.
2. Start sign-in from the app. Confirm the correct client on Cubid Login.
   A user completes the passkey and reviews consent on the Cubid origin.
3. Confirm the browser returns to the exact callback, the server verifies
   the code exchange and ID token, and the panel says **Successfully
   signed in**. Verify persistence on reload, expiry/focus refresh, and
   **Clear starter session** returning to the unsigned state.
4. Record date, commit, environment, callback and outcome in the session
   log. Omit tokens, secrets, raw authorization URLs and personal claims.
   Mark this gate pending if the user or hosted callback is unavailable.
   A loopback issuer pass never substitutes for this gate.

The Next.js starter passed this gate on the protected HTTPS `dev`
preview on 2026-11-08. See the [hosted SIWC session log](../agent-context/session-log/2026-11-08-hosted-siwc-acceptance.md)
for the tested commit, exact callback and observed outcomes. This is
preview acceptance, not verification of a production deployment.
