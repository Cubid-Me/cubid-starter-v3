# Starter template parity

## 2026-11-06T15:51:49Z

- Agent: Codex
- Branch: codex/siwc-panel-completion
- Head: 43245a5
- Summary: Extracted the reusable SIWC hook, standalone panel and server callback adapter. Added a post-verification account mapping hook with an allowlisted, size-bounded account ID. Kept failure traces, refreshed on focus and expiry, separated local reset and Cubid SSO, and isolated cookies across local ports. Split browser capabilities and removed displayed token fragments and personal claims.
- Validation: 34 unit tests, lint, typecheck and build passed on Node 24. Four browser tests passed against a loopback issuer with real S256 PKCE and RS256 verification. A browser round trip exposed NextURL loopback-host normalization; the fix preserves the exact registered host. In-app browser verified independent recovery and missing-config diagnostics. Client asset scan found no configured server-secret leakage.
- Follow-ups: Commit template setup, CI and shared release criteria. Hosted passkey/consent acceptance remains separate and pending.
