"use client";

import { useState, useTransition } from "react";
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
} from "lucide-react";

const publicConfig = {
  clearPassPageId: process.env.NEXT_PUBLIC_CUBID_CLEARPASS_PAGE_ID ?? "",
  clientId: process.env.NEXT_PUBLIC_CUBID_OIDC_CLIENT_ID ?? "",
  issuer: process.env.NEXT_PUBLIC_CUBID_ISSUER_URL ?? "",
  passportBaseUrl: process.env.NEXT_PUBLIC_CUBID_PASSPORT_BASE_URL ?? "",
  redirectUri: process.env.NEXT_PUBLIC_CUBID_REDIRECT_URI ?? "",
};

const panelClass = "rounded-lg border border-[#dce2d6] p-4";

export function BrowserDemo() {
  const authReady = Boolean(
    publicConfig.issuer && publicConfig.clientId && publicConfig.redirectUri,
  );
  return (
    <section className="min-w-0 rounded-lg border border-[#d9ddd2] bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-3 text-xl font-semibold">
        <Fingerprint size={20} aria-hidden="true" />
        Browser UX demo
      </h2>
      <div className="mt-6 grid gap-4">
        {authReady ? (
          <CubidAuthProvider
            autoUserInfo
            clientId={publicConfig.clientId}
            issuer={publicConfig.issuer}
            redirectUri={publicConfig.redirectUri}
            scope={["openid", "profile", "email"]}
          >
            <BrowserIdentityDemo />
          </CubidAuthProvider>
        ) : (
          <CapabilitySetup
            name="Browser sign-in"
            settings="NEXT_PUBLIC_CUBID_ISSUER_URL, NEXT_PUBLIC_CUBID_OIDC_CLIENT_ID, NEXT_PUBLIC_CUBID_REDIRECT_URI"
          />
        )}
        {!authReady ? (
          <CapabilitySetup
            name="Notification preferences"
            settings="Browser sign-in and NEXT_PUBLIC_CUBID_PASSPORT_BASE_URL"
          />
        ) : null}
        <ClearPassDemo />
        <RecoveryDemo />
      </div>
    </section>
  );
}

function CapabilitySetup({
  name,
  settings,
}: {
  name: string;
  settings: string;
}) {
  return (
    <div className={panelClass}>
      <h3 className="text-sm font-semibold">{name}</h3>
      <p className="mt-2 break-words text-sm text-[#596456]">
        Required: {settings}
      </p>
    </div>
  );
}

function BrowserIdentityDemo() {
  const auth = useCubidAuth();
  const [commsState, setCommsState] = useState<{
    result: unknown;
    status: "idle" | "loading" | "success" | "error";
  }>({ result: null, status: "idle" });
  const [isPending, startTransition] = useTransition();
  function loadCommsProfile() {
    const accessToken = auth.session?.accessToken;
    if (!accessToken) {
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
          accessToken,
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
              isDefault: channel.isDefault,
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
      } catch {
        setCommsState({
          result: "Unable to load Cubid comms profile.",
          status: "error",
        });
      }
    });
  }

  return (
    <>
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
                Browser sign-in with Cubid
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
              accessTokenPresent: Boolean(auth.session?.accessToken),
              identityClaimsPresent: Boolean(auth.session?.idTokenClaims),
              userInfoPresent: Boolean(auth.session?.userInfo),
              scope: auth.session?.scope ?? [],
            },
            null,
            2,
          )}
        </pre>
      </div>
      {publicConfig.passportBaseUrl ? (
        <div className="rounded-lg border border-[#dce2d6] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Bell size={16} aria-hidden="true" />
            Notification channels and preferences
          </div>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#cfd6c7] bg-white px-4 text-sm font-semibold text-[#1d2a1e] transition hover:bg-[#eef3eb] disabled:cursor-not-allowed disabled:text-[#8a9585]"
            disabled={isPending || !auth.session?.accessToken}
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
            {!auth.session?.accessToken || commsState.status === "idle"
              ? "Sign in with the browser demo to read notification preferences."
              : JSON.stringify(commsState.result, null, 2)}
          </pre>
        </div>
      ) : (
        <CapabilitySetup
          name="Notification preferences"
          settings="NEXT_PUBLIC_CUBID_PASSPORT_BASE_URL"
        />
      )}
    </>
  );
}

function ClearPassDemo() {
  const [userId, setUserId] = useState("");
  if (!publicConfig.clearPassPageId || !publicConfig.passportBaseUrl) {
    return (
      <CapabilitySetup
        name="ClearPass Verify"
        settings="NEXT_PUBLIC_CUBID_CLEARPASS_PAGE_ID, NEXT_PUBLIC_CUBID_PASSPORT_BASE_URL"
      />
    );
  }
  const hostedUrl = userId.trim()
    ? buildClearPassVerifyUrl({
        pageId: publicConfig.clearPassPageId,
        passportOrigin: publicConfig.passportBaseUrl,
        userId: userId.trim(),
      })
    : null;
  return (
    <div className={`${panelClass} cubid-widget-shell`}>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <ExternalLink size={16} aria-hidden="true" />
        ClearPass Verify
      </h3>
      <label className="mb-3 grid gap-2 text-sm font-medium">
        App-scoped Cubid ID from the server demo
        <input
          className="h-11 rounded-md border border-[#cfd6c7] px-3 text-sm"
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
        />
      </label>
      {hostedUrl ? (
        <>
          <ClearPassVerifyButton
            className="cubid-hosted-widget"
            pageId={publicConfig.clearPassPageId}
            passportOrigin={publicConfig.passportBaseUrl}
            userId={userId.trim()}
          />
          <a
            className="mt-3 inline-flex text-sm font-medium text-[#1f6f50] underline"
            href={hostedUrl}
            rel="noreferrer"
            target="_blank"
          >
            Open URL built by @cubid/browser
          </a>
        </>
      ) : null}
    </div>
  );
}

function RecoveryDemo() {
  const [recoverySessionId, setRecoverySessionId] = useState("");
  if (!publicConfig.passportBaseUrl) {
    return (
      <CapabilitySetup
        name="Hosted wallet recovery"
        settings="NEXT_PUBLIC_CUBID_PASSPORT_BASE_URL"
      />
    );
  }
  return (
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
  );
}
