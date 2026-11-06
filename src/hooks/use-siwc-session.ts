"use client";

import { useCallback, useEffect, useState } from "react";
import type { SiwcDemoTraceEntry } from "@/lib/cubid/siwc-demo";

export type SiwcSessionResponse = {
  authenticated: boolean;
  status: "signed_in" | "not_signed_in";
  session?: {
    expiresAt: number;
    subject: string;
    app?: { accountId: string };
  } & Record<string, unknown>;
  config: { configured: boolean; missing?: string[] };
  trace: SiwcDemoTraceEntry[];
};

export type SiwcSignInOptions = {
  maxAge?: number;
  prompt?: "login" | "consent";
};

export function useSiwcSession(returnTo?: string) {
  const [session, setSession] = useState<SiwcSessionResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [startFailure, setStartFailure] = useState<SiwcDemoTraceEntry | null>(
    null,
  );

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/cubid/siwc/session", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Session request failed");
      setSession((await response.json()) as SiwcSessionResponse);
      setStatus("idle");
    } catch {
      setSession(null);
      setError("Unable to load the SIWC demo session.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const failed = url.searchParams.has("siwc_error");
    if (failed) {
      url.searchParams.delete("siwc_error");
      window.history.replaceState(window.history.state, "", url);
    }
    void Promise.resolve()
      .then(refresh)
      .then(() => {
        if (failed) {
          setError(
            "Cubid sign-in failed. Review the callback response below, then try again.",
          );
          setStatus("error");
        }
      });
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  const expiresAt = session?.session?.expiresAt;
  useEffect(() => {
    if (expiresAt === undefined) return;
    const timer = window.setTimeout(
      () => {
        void refresh();
      },
      Math.max(0, expiresAt - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [expiresAt, refresh]);

  const signIn = useCallback(
    async (options: SiwcSignInOptions = {}) => {
      setStatus("loading");
      setError(null);
      setStartFailure(null);
      const { pathname, search, hash } = window.location;
      const params = new URLSearchParams({
        format: "json",
        return_to: returnTo ?? pathname + search + hash,
      });
      if (options.prompt) params.set("prompt", options.prompt);
      if (options.maxAge !== undefined)
        params.set("max_age", String(options.maxAge));

      try {
        const response = await fetch(`/api/cubid/siwc/start?${params}`, {
          cache: "no-store",
        });
        const payload = await response.json();
        if (!response.ok) {
          setStartFailure({
            at: new Date().toISOString(),
            step: "start",
            label: "Start authorization failed",
            request: {
              method: "GET",
              url: "/api/cubid/siwc/start",
              ...options,
            },
            response: {
              httpStatus: response.status,
              error: payload.error,
              missing: payload.missing,
            },
          });
          setError(
            payload.missing
              ? `Configure ${payload.missing.join(", ")}`
              : "Cubid authorization could not be started.",
          );
          setStatus("error");
          return;
        }
        window.location.assign(payload.authorizationUrl);
      } catch {
        setError("Sign-in could not be started.");
        setStatus("error");
      }
    },
    [returnTo],
  );

  const clearSession = useCallback(async () => {
    setStatus("loading");
    setError(null);
    setStartFailure(null);
    try {
      const response = await fetch("/api/cubid/siwc/logout", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Reset failed");
      await refresh();
    } catch {
      setError("Unable to clear the starter session.");
      setStatus("error");
    }
  }, [refresh]);

  return {
    session,
    status,
    error,
    startFailure,
    signIn,
    clearSession,
    refresh,
  };
}
