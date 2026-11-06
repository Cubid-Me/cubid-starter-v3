# Starter template parity

## 2026-11-06T15:51:49Z

- Agent: Codex
- Branch: codex/siwc-panel-completion
- Head: 43245a5
- Summary: Extracted the reusable SIWC hook, standalone panel and server callback adapter. Added a post-verification account mapping hook with an allowlisted, size-bounded account ID. Kept failure traces, refreshed on focus and expiry, separated local reset and Cubid SSO, and isolated cookies across local ports. Split browser capabilities and removed displayed token fragments and personal claims.
- Validation: 34 unit tests, lint, typecheck and build passed on Node 24. Four browser tests passed against a loopback issuer with real S256 PKCE and RS256 verification. A browser round trip exposed NextURL loopback-host normalization; the fix preserves the exact registered host. In-app browser verified independent recovery and missing-config diagnostics. Client asset scan found no configured server-secret leakage.
- Follow-ups: Commit template setup, CI and shared release criteria. Hosted passkey/consent acceptance remains separate and pending.

## 2026-11-06T15:52:29Z

- Agent: Codex
- Branch: codex/siwc-panel-completion
- Head: 17b7ebd
- Summary: Added portable template setup, Apache-2.0 licensing consistent with the public SDK, Node 24 and pnpm setup, real dynamic-registration instructions and shared starter acceptance criteria. Added frozen-lockfile CI and browser tests using an ephemeral signed-token issuer. Wrote the parallel TanStack handover in chat without sending it to another agent.
- Validation: Frozen install, lint, typecheck, 34 unit tests, production build, four Chromium tests and diff checks passed. Local preview uses port 3002 without a live SIWC client because the registered ports are occupied; ignored credentials were preserved.
- Follow-ups: Publish PR to dev. The dev base was created from unchanged main because it did not exist. Enable the repository template setting without changing its default branch. Production sign-in acceptance is still pending a human passkey and consent round trip.
