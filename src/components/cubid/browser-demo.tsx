"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { buildClearPassVerifyUrl } from "@cubid/browser";
import { createCubidCommsClient } from "@cubid/comms";
import {
  CubidAuthProvider,
  CubidSignInButton,
  CubidSignOutButton,
  useCubidAuth,
} from "@cubid/auth-react";
import { ClearPassVerifyButton } from "@cubid/react";
import { CubidRecoveryLaunchButton } from "@cubid/wallet-recovery-react";
import {
  Bell,
  CheckCircle2,
  ExternalLink,
  Fingerprint,
  KeyRound,
  LoaderCircle,
  LogIn,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";

const publicConfig = {
  clearPassPageId: process.env.NEXT_PUBLIC_CUBID_CLEARPASS_PAGE_ID ?? "",
  clientId: process.env.NEXT_PUBLIC_CUBID_OIDC_CLIENT_ID ?? "",
  issuer: process.env.NEXT_PUBLIC_CUBID_ISSUER_URL ?? "",
  passportBaseUrl: process.env.NEXT_PUBLIC_CUBID_PASSPORT_BASE_URL ?? "",
  redirectUri: process.env.NEXT_PUBLIC_CUBID_REDIRECT_URI ?? "",
};

function missingPublicConfig() {
  return Object.entries(publicConfig)
    .filter(([, value]) => !value.trim())
    .map(([key]) => key);
}

function summarizeToken(token: string | null | undefined) {
  if (!token) {
    return "No access token in the current browser session.";
  }

  return `${token.slice(0, 8)}...${token.slice(-6)} (${token.length} chars)`;
}

type SiwcDemoSessionResponse = {
  authenticated: boolean;
  session?: Record<string, unknown>;
  status: string;
  trace?: Array<Record<string, unknown>>;
};

export function BrowserDemo() {
  const missing = missingPublicConfig();

  if (missing.length > 0) {
    return (
      <section className="grid gap-4 rounded-lg border border-[#d9ddd2] bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#dbe9d6] text-[#1f6f50]">
            <Fingerprint size={20} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Browser UX demo</h2>
            <p className="mt-2 text-sm leading-6 text-[#596456]">
              Add the browser-safe `NEXT_PUBLIC_CUBID_*` values from
              `.env.example` to enable Login with Cubid, ClearPass Verify,
              notification preferences, and recovery launchers.
            </p>
          </div>
        </div>
        <div className="mt-5 rounded-md border border-[#e4d4a1] bg-[#fffbea] p-4 text-sm text-[#665313]">
          Missing browser-safe config: {missing.join(", ")}
        </div>
        <ServerMediatedSiwcPanel />
      </section>
    );
  }

  return (
    <CubidAuthProvider
      autoUserInfo
      clientId={publicConfig.clientId}
      issuer={publicConfig.issuer}
      postLogoutRedirectUri={
        typeof window === "undefined" ? undefined : window.location.origin
      }
      redirectUri={publicConfig.redirectUri}
      scope={["openid", "profile", "email"]}
    >
      <BrowserDemoPanel />
    </CubidAuthProvider>
  );
}

function BrowserDemoPanel() {
  const auth = useCubidAuth();
  const [recoverySessionId, setRecoverySessionId] = useState("");
  const [commsState, setCommsState] = useState<{
    result: unknown;
    status: "idle" | "loading" | "success" | "error";
  }>({ result: null, status: "idle" });
  const [isPending, startTransition] = useTransition();
  const subject = auth.session?.subject ?? "";

  const clearPassHeadlessUrl = useMemo(() => {
    if (!subject || !publicConfig.clearPassPageId) {
      return null;
    }

    return buildClearPassVerifyUrl({
      pageId: publicConfig.clearPassPageId,
      passportOrigin: publicConfig.passportBaseUrl,
      userId: subject,
    });
  }, [subject]);

  function loadCommsProfile() {
    if (!auth.session?.accessToken) {
      setCommsState({
        result: "Sign in before loading notification preferences.",
        status: "error",
      });
      return;
    }

    setCommsState({ result: null, status: "loading" });
    startTransition(async () => {
      try {
        const client = createCubidCommsClient({
          accessToken: auth.session!.accessToken,
          baseUrl: publicConfig.passportBaseUrl,
        });
        const [channels, preferences] = await Promise.all([
          client.channels.list(),
          client.preferences.list(),
        ]);

        setCommsState({
          result: {
            channels: channels.channels.map((channel) => ({
              channelId: channel.channelId,
              channelType: channel.channelType,
              displayHint: channel.displayHint,
              isDefault: channel.isDefault,
              label: channel.label,
              status: channel.status,
              verificationStatus: channel.verificationStatus,
            })),
            preferences: preferences.preferences.map((preference) => ({
              categoryKey: preference.categoryKey,
              channelId: preference.channelId,
              mutedUntil: preference.mutedUntil,
              priorityFloor: preference.priorityFloor,
              status: preference.status,
            })),
          },
          status: "success",
        });
      } catch (error) {
        setCommsState({
          result:
            error instanceof Error
              ? { message: error.message, name: error.name }
              : { message: "Unable to load Cubid comms profile." },
          status: "error",
        });
      }
    });
  }

  return (
    <section className="rounded-lg border border-[#d9ddd2] bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#dbe9d6] text-[#1f6f50]">
          <Fingerprint size={20} aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Browser UX demo</h2>
          <p className="mt-2 text-sm leading-6 text-[#596456]">
            These controls use browser-safe packages only: `@cubid/auth-react`,
            `@cubid/browser`, `@cubid/react`, `@cubid/comms`, and
            `@cubid/wallet-recovery-react`.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        <ServerMediatedSiwcPanel />

        <div className="rounded-lg border border-[#dce2d6] bg-[#f8faf6] p-4">
          <div className="flex flex-wrap items-center gap-3">
            {auth.isAuthenticated ? (
              <CubidSignOutButton className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#cfd6c7] bg-white px-4 text-sm font-semibold text-[#1d2a1e] transition hover:bg-[#eef3eb]">
                Sign out
              </CubidSignOutButton>
            ) : (
              <CubidSignInButton className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#1f6f50] px-4 text-sm font-semibold text-white transition hover:bg-[#18593f]">
                <span className="inline-flex items-center gap-2">
                  <LogIn size={16} aria-hidden="true" />
                  Login with Cubid
                </span>
              </CubidSignInButton>
            )}
            <span className="inline-flex items-center gap-2 text-sm text-[#596456]">
              <CheckCircle2
                size={16}
                aria-hidden="true"
                className={
                  auth.isAuthenticated ? "text-[#1f6f50]" : "text-[#9ca696]"
                }
              />
              {auth.status}
            </span>
          </div>

          <pre className="mt-4 max-h-64 overflow-auto rounded-md border border-[#dce2d6] bg-white p-3 text-xs leading-5 text-[#263026]">
            {JSON.stringify(
              {
                accessToken: summarizeToken(auth.session?.accessToken),
                claims: auth.session?.idTokenClaims ?? null,
                subject: auth.session?.subject ?? null,
                userInfo: auth.session?.userInfo ?? null,
              },
              null,
              2
            )}
          </pre>
        </div>

        <div className="cubid-widget-shell rounded-lg border border-[#dce2d6] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <ExternalLink size={16} aria-hidden="true" />
            ClearPass Verify
          </div>
          <ClearPassVerifyButton
            className="cubid-hosted-widget"
            pageId={publicConfig.clearPassPageId}
            passportOrigin={publicConfig.passportBaseUrl}
            userId={subject}
          />
          {clearPassHeadlessUrl ? (
            <a
              className="mt-3 inline-flex text-sm font-medium text-[#1f6f50] underline-offset-4 hover:underline"
              href={clearPassHeadlessUrl}
              rel="noreferrer"
              target="_blank"
            >
              Open the same URL built by `@cubid/browser`
            </a>
          ) : null}
        </div>

        <div className="rounded-lg border border-[#dce2d6] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Bell size={16} aria-hidden="true" />
            Notification channels and preferences
          </div>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#cfd6c7] bg-white px-4 text-sm font-semibold text-[#1d2a1e] transition hover:bg-[#eef3eb] disabled:cursor-not-allowed disabled:text-[#8a9585]"
            disabled={isPending || commsState.status === "loading"}
            onClick={loadCommsProfile}
            type="button"
          >
            {commsState.status === "loading" ? (
              <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />
            ) : (
              <Bell size={16} aria-hidden="true" />
            )}
            Load preferences
          </button>
          <pre
            className={`mt-3 max-h-56 overflow-auto rounded-md border p-3 text-xs leading-5 ${
              commsState.status === "error"
                ? "border-[#e0b7ad] bg-[#fff7f5] text-[#713022]"
                : "border-[#dce2d6] bg-[#f8faf6] text-[#263026]"
            }`}
          >
            {commsState.status === "idle"
              ? "Signed-in comms metadata appears here."
              : JSON.stringify(commsState.result, null, 2)}
          </pre>
        </div>

        <div className="rounded-lg border border-[#dce2d6] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <KeyRound size={16} aria-hidden="true" />
            Hosted recoverable-wallet recovery
          </div>
          <label className="grid gap-2 text-sm font-medium">
            Recovery session id from the server helper
            <input
              className="h-11 rounded-md border border-[#cfd6c7] px-3 text-sm outline-none focus:border-[#1f6f50]"
              onChange={(event) => setRecoverySessionId(event.target.value)}
              placeholder="rw_release_..."
              value={recoverySessionId}
            />
          </label>
          <CubidRecoveryLaunchButton
            className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#1f6f50] px-4 text-sm font-semibold text-white transition hover:bg-[#18593f] disabled:cursor-not-allowed disabled:bg-[#a8b6a1]"
            disabled={!recoverySessionId.trim()}
            passportOrigin={publicConfig.passportBaseUrl}
            recoverySessionId={recoverySessionId}
          >
            Open recovery flow
          </CubidRecoveryLaunchButton>
        </div>
      </div>
    </section>
  );
}

function ServerMediatedSiwcPanel() {
  const [session, setSession] = useState<SiwcDemoSessionResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const cubidLogoutUrl = publicConfig.issuer
    ? `${publicConfig.issuer.replace(/\/+$/u, "")}/logout`
    : null;

  useEffect(() => {
    void loadSession();
  }, []);

  async function loadSession() {
    setStatus("loading");
    setError(null);

    try {
      const response = await fetch("/api/cubid/siwc/session", {
        headers: { accept: "application/json" },
      });
      const payload = (await response.json()) as SiwcDemoSessionResponse;
      setSession(payload);
      setStatus("idle");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load the SIWC demo session."
      );
      setStatus("error");
    }
  }

  function startSiwc(options: { maxAge?: number; prompt?: string } = {}) {
    const params = new URLSearchParams({
      return_to: window.location.pathname,
    });

    if (options.prompt) {
      params.set("prompt", options.prompt);
    }

    if (typeof options.maxAge === "number") {
      params.set("max_age", String(options.maxAge));
    }

    window.location.assign(`/api/cubid/siwc/start?${params.toString()}`);
  }

  async function clearStarterSession() {
    setStatus("loading");
    setError(null);

    try {
      const response = await fetch("/api/cubid/siwc/logout", {
        headers: { accept: "application/json" },
        method: "POST",
      });
      await response.json();
      await loadSession();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to clear the starter demo session."
      );
      setStatus("error");
    }
  }

  return (
    <div className="rounded-lg border border-[#cfd8c8] bg-[#f8faf6] p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-[#1f6f50]">
          <ShieldCheck size={18} aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-base font-semibold">SIWC / SSO protocol demo</h3>
          <p className="mt-2 text-sm leading-6 text-[#596456]">
            This panel starts Cubid-hosted OIDC from starter-owned server
            routes. A passkey scoped to `cubid.me` does not sign into the
            starter by itself; an existing Cubid SSO session may simply skip the
            passkey ceremony.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#1f6f50] px-4 text-sm font-semibold text-white transition hover:bg-[#18593f]"
          onClick={() => startSiwc()}
          type="button"
        >
          <LogIn size={16} aria-hidden="true" />
          Sign in with Cubid
        </button>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#cfd6c7] bg-white px-4 text-sm font-semibold text-[#1d2a1e] transition hover:bg-[#eef3eb]"
          onClick={() => startSiwc({ maxAge: 0, prompt: "login" })}
          type="button"
        >
          Force login
        </button>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#cfd6c7] bg-white px-4 text-sm font-semibold text-[#1d2a1e] transition hover:bg-[#eef3eb]"
          onClick={() => startSiwc({ prompt: "consent" })}
          type="button"
        >
          Force consent
        </button>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#cfd6c7] bg-white px-4 text-sm font-semibold text-[#1d2a1e] transition hover:bg-[#eef3eb] disabled:cursor-not-allowed disabled:text-[#8a9585]"
          disabled={status === "loading"}
          onClick={clearStarterSession}
          type="button"
        >
          <RefreshCcw size={16} aria-hidden="true" />
          Clear starter session
        </button>
        {cubidLogoutUrl ? (
          <a
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#cfd6c7] bg-white px-4 text-sm font-semibold text-[#1d2a1e] transition hover:bg-[#eef3eb]"
            href={cubidLogoutUrl}
          >
            <ExternalLink size={16} aria-hidden="true" />
            Cubid logout
          </a>
        ) : null}
      </div>

      {error ? (
        <div className="mt-3 rounded-md border border-[#e0b7ad] bg-[#fff7f5] p-3 text-sm text-[#713022]">
          {error}
        </div>
      ) : null}

      <pre className="mt-4 max-h-80 overflow-auto rounded-md border border-[#dce2d6] bg-white p-3 text-xs leading-5 text-[#263026]">
        {status === "loading" && !session
          ? "Loading SIWC demo session..."
          : JSON.stringify(
              session ?? {
                authenticated: false,
                status: "not_signed_in",
                trace: [],
              },
              null,
              2
            )}
      </pre>
    </div>
  );
}
