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
  config?: { configured: boolean; missing?: string[] };
  trace?: Array<{
    label?: string;
    at?: string;
    request?: Record<string, unknown>;
    response?: Record<string, unknown>;
    step?: string;
  }>;
};

export function BrowserDemo() {
  const missing = missingPublicConfig();

  if (missing.length > 0) {
    return (
      <section className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 rounded-lg border border-[#d9ddd2] bg-white p-5 shadow-sm">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#dbe9d6] text-[#1f6f50]">
            <Fingerprint size={20} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-semibold">Browser UX demo</h2>
            <p className="mt-2 text-sm leading-6 text-[#596456]">
              Add the browser-safe `NEXT_PUBLIC_CUBID_*` values from
              `.env.example` to enable Login with Cubid, ClearPass Verify,
              notification preferences, and recovery launchers.
            </p>
          </div>
        </div>
        <div className="mt-5 break-words rounded-md border border-[#e4d4a1] bg-[#fffbea] p-4 text-sm text-[#665313]">
          Missing browser-safe config: {missing.join(", ")}
        </div>
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
    <section className="min-w-0 rounded-lg border border-[#d9ddd2] bg-white p-5 shadow-sm">
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
              2,
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
              <LoaderCircle
                className="animate-spin"
                size={16}
                aria-hidden="true"
              />
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

export function ServerMediatedSiwcPanel() {
  const [session, setSession] = useState<SiwcDemoSessionResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<unknown>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const cubidLogoutUrl = session?.trace?.find(
    (entry) => entry.step === "discovery",
  )?.response?.endSessionEndpoint;

  useEffect(() => {
    const callbackError = new URLSearchParams(window.location.search).get(
      "siwc_error",
    );
    void loadSession().then(() => {
      if (callbackError) {
        setError(
          "Cubid sign-in failed. Review the callback response below, then try again.",
        );
        setStatus("error");
        const url = new URL(window.location.href);
        url.searchParams.delete("siwc_error");
        window.history.replaceState(null, "", url);
      }
    });
  }, []);

  async function loadSession() {
    setStatus("loading");
    setError(null);

    try {
      const response = await fetch("/api/cubid/siwc/session", {
        cache: "no-store",
        headers: { accept: "application/json" },
      });
      if (!response.ok)
        throw new Error("Unable to load the SIWC demo session.");
      const payload = (await response.json()) as SiwcDemoSessionResponse;
      setSession(payload);
      setStatus("idle");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load the SIWC demo session.",
      );
      setStatus("error");
    }
  }

  async function startSiwc(options: { maxAge?: number; prompt?: string } = {}) {
    setStatus("loading");
    setError(null);
    const params = new URLSearchParams({
      return_to: `${window.location.pathname}#siwc`,
      format: "json",
    });

    if (options.prompt) {
      params.set("prompt", options.prompt);
    }

    if (typeof options.maxAge === "number") {
      params.set("max_age", String(options.maxAge));
    }

    try {
      const response = await fetch(
        `/api/cubid/siwc/start?${params.toString()}`,
        { cache: "no-store" },
      );
      const payload = await response.json();
      if (!response.ok) {
        setSession((previous) => ({
          ...(previous ?? { authenticated: false, status: "not_signed_in" }),
          trace: [
            ...(previous?.trace ?? []),
            {
              label: "Start authorization failed",
              step: "start",
              at: new Date().toISOString(),
              request: {
                method: "GET",
                url: `/api/cubid/siwc/start?${params.toString()}`,
              },
              response: {
                httpStatus: response.status,
                error: payload.error,
                missing: payload.missing,
              },
            },
          ],
        }));
        throw new Error(
          payload.missing
            ? `Configure ${payload.missing.join(", ")}`
            : "Cubid authorization could not be started. Check the issuer and client configuration.",
        );
      }
      window.location.assign(payload.authorizationUrl);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Sign-in could not be started.",
      );
      setStatus("error");
    }
  }

  async function clearStarterSession() {
    setStatus("loading");
    setError(null);

    try {
      const response = await fetch("/api/cubid/siwc/logout", {
        headers: { accept: "application/json" },
        method: "POST",
      });
      if (!response.ok) throw new Error("Unable to clear the starter session.");
      await response.json();
      await loadSession();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to clear the starter demo session.",
      );
      setStatus("error");
    }
  }

  return (
    <section
      id="siwc"
      className="min-w-0 scroll-mt-6 border-y border-[#d9ddd2] bg-white p-5"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-[#1f6f50]">
          <ShieldCheck size={18} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold">Sign in with Cubid</h2>
          <p className="mt-2 text-sm leading-6 text-[#596456]">
            Cubid hosts passkeys, consent, device handoff, and recovery. This
            relying-party demo exchanges the authorization code on the server
            and displays the resulting app-scoped identity.
          </p>
        </div>
      </div>

      <p
        role="status"
        className="mt-5 flex items-center gap-2 text-base font-semibold"
      >
        <CheckCircle2
          size={18}
          className={
            session?.authenticated ? "text-[#1f6f50]" : "text-[#596456]"
          }
          aria-hidden="true"
        />
        {session?.authenticated
          ? "Successfully signed in"
          : "Not signed in yet"}
        {status === "loading" ? (
          <LoaderCircle
            className="animate-spin"
            size={16}
            aria-label="Loading"
          />
        ) : null}
      </p>
      {session?.config?.configured === false ? (
        <p className="mt-2 break-words text-sm text-[#713022]">
          Required configuration: {session.config.missing?.join(", ")}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#1f6f50] px-4 text-sm font-semibold text-white transition hover:bg-[#18593f]"
          onClick={() => startSiwc()}
          disabled={status === "loading"}
          type="button"
        >
          <LogIn size={16} aria-hidden="true" />
          Sign in with Cubid
        </button>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#cfd6c7] bg-white px-4 text-sm font-semibold text-[#1d2a1e] transition hover:bg-[#eef3eb]"
          onClick={() => startSiwc({ maxAge: 0, prompt: "login" })}
          disabled={status === "loading"}
          type="button"
        >
          Force login
        </button>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#cfd6c7] bg-white px-4 text-sm font-semibold text-[#1d2a1e] transition hover:bg-[#eef3eb]"
          onClick={() => startSiwc({ prompt: "consent" })}
          disabled={status === "loading"}
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
        {typeof cubidLogoutUrl === "string" ? (
          <a
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#cfd6c7] bg-white px-4 text-sm font-semibold text-[#1d2a1e] transition hover:bg-[#eef3eb]"
            href={cubidLogoutUrl}
          >
            <ExternalLink size={16} aria-hidden="true" />
            Cubid logout
          </a>
        ) : null}
      </div>

      <details className="mt-5 border-t border-[#dce2d6] pt-4">
        <summary className="cursor-pointer text-sm font-semibold">
          Cubid Login deployment
        </summary>
        <button
          type="button"
          disabled={checkingHealth}
          className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[#1f6f50]"
          onClick={async () => {
            setCheckingHealth(true);
            try {
              const response = await fetch("/api/cubid/siwc/health", {
                cache: "no-store",
              });
              setHealth(await response.json());
            } catch {
              setHealth({ error: "Unable to fetch Login health." });
            } finally {
              setCheckingHealth(false);
            }
          }}
        >
          <RefreshCcw
            size={16}
            className={checkingHealth ? "animate-spin" : ""}
          />
          Check deployment
        </button>
        {health ? (
          <pre className="mt-3 max-h-64 overflow-auto bg-[#f8faf6] p-3 text-xs">
            {JSON.stringify(health, null, 2)}
          </pre>
        ) : null}
      </details>

      {error ? (
        <div className="mt-3 rounded-md border border-[#e0b7ad] bg-[#fff7f5] p-3 text-sm text-[#713022]">
          {error}
        </div>
      ) : null}

      <div className="mt-5 border-t border-[#dce2d6] pt-4">
        <h3 className="text-base font-semibold">Calls and responses</h3>
        <p className="mt-2 text-sm leading-6 text-[#596456]">
          The starter records its OIDC calls below. Passkey, consent, and
          recovery requests happen on the Cubid origin and are not visible to
          this app. Tokens, codes, state, nonce, and personal details are
          redacted.
        </p>
        <ol className="mt-4 divide-y divide-[#dce2d6]">
          <li className="py-4">
            <h4 className="text-sm font-semibold">Read starter session</h4>
            <div className="mt-3 grid min-w-0 gap-3 md:grid-cols-2">
              <TraceValue
                title="Request"
                value={{ method: "GET", url: "/api/cubid/siwc/session" }}
              />
              <TraceValue
                title="Response"
                value={{
                  authenticated: session?.authenticated ?? false,
                  status: session?.status ?? "not_signed_in",
                  session: session?.session ?? null,
                }}
              />
            </div>
          </li>
          {session?.trace?.map((entry, index) => (
            <li key={`${entry.at}-${index}`} className="py-4">
              <h4 className="text-sm font-semibold">
                {entry.label ?? entry.step}
              </h4>
              <div className="mt-3 grid min-w-0 gap-3 md:grid-cols-2">
                <TraceValue
                  title="Request"
                  value={entry.request ?? { type: "local server operation" }}
                />
                <TraceValue
                  title="Response"
                  value={entry.response ?? { received: true }}
                />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function TraceValue({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="min-w-0">
      <p className="mb-2 text-xs font-semibold uppercase text-[#596456]">
        {title}
      </p>
      <pre className="max-h-64 max-w-full overflow-auto rounded-md border border-[#dce2d6] bg-[#f8faf6] p-3 text-xs leading-5 text-[#263026]">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
