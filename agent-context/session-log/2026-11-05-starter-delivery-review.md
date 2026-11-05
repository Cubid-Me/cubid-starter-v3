# Starter delivery review and sibling comparison

## 2026-11-05T18:05:31Z

- Agent: Codex
- Branch: codex/siwc-panel-completion
- Head: a6c4c01
- Summary: Committed the prior SIWC changes, registered a real public-web OIDC client with exact localhost callbacks on ports 3000 and 3001, and configured ignored mode-0600 local environment and registration-management files. No secret values were added to source control. Started the v3 preview on port 3001, preserving the unrelated app on port 3000.
- Live evidence: The real issuer accepted the authorization request and redirected to Cubid Login with the registered client name and passkey requirement. The authenticator request timed out without user completion; the user was asked to complete passkey authentication and review any subsequent consent themselves. No live callback success has been claimed.
- Comparison: Inspected TanStack c4caf1e against Next.js a6c4c01 and added docs/starter-comparison-2026-11-05.md. Verified GitHub template flags (v3 false, TanStack true), reviewed the reusable client/server hook structure, and recorded prioritized improvements for both. Recommendations have not been implemented or silently converted into repository setting changes.
- Validation: Both starters passed 29 tests, lint, typecheck and build. TanStack build emitted non-failing dependency directive warnings. Reviewed exact callback/state/nonce/issuer and userinfo-subject checks and cookie encryption/redaction paths.
- Delivery decision: Production delivery remains on hold pending a real successful callback, persisted/refreshed starter session and reset/logout verification. The commit is local; no starter push, deployment, or GitHub template mutation performed.
- Follow-ups: Complete the user's passkey handoff, verify the resulting callback and session, and only then finalize delivery readiness. Create GitHub issues for approved comparison recommendations.
