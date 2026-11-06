"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient, isAxiosError } from "@eventmind/api";
import { useAuthStore } from "@eventmind/store";
import type { AuthTokens } from "@eventmind/types";

export function SocialCallback({ provider }: { provider: "google" | "facebook" }) {
  const router = useRouter();
  const cache = useQueryClient();
  const started = useRef(false);
  const [error, setError] = useState("");
  useEffect(() => {
    // Strict Mode replays effects; an authorization code must be exchanged once.
    if (started.current) return;
    started.current = true;
    const query = new URLSearchParams(window.location.search);
    const state = query.get("state") ?? "";
    const code = query.get("code") ?? "";
    const denied = query.has("error");
    window.history.replaceState(null, "", window.location.pathname);
    async function finish() {
      try {
        if (!state || (!code && !denied)) throw new Error("missing_callback");
        const { data } = await apiClient.post<AuthTokens & { email: string; linked: boolean }>(
          `/auth/oauth/${provider}/complete`, { state, code, error: denied ? "access_denied" : "" }, { withCredentials: true });
        cache.clear();
        useAuthStore.getState().setAuth(data.email, {
          access_token: data.access_token, refresh_token: data.refresh_token, token_type: data.token_type,
        });
        router.replace(data.linked ? "/dashboard?tab=profile" : "/dashboard");
      } catch (cause) {
        setError(isAxiosError(cause) && typeof cause.response?.data?.detail === "string"
          ? cause.response.data.detail : "Sign-in could not be completed. Please return to sign in and try again.");
      }
    }
    void finish();
  }, [provider, router, cache]);

  return <main className="min-h-[100dvh] flex items-center justify-center px-5 py-12 bg-[var(--brand-bg)] text-[var(--brand-text)]">
    <section className="w-full max-w-lg space-y-5">
      <h1 className="nf-section-title">{error ? "Sign-in needs attention" : "Completing secure sign-in…"}</h1>
      <p role={error ? "alert" : "status"} className="nf-body">{error || "Please keep this page open while we verify your account."}</p>
      {error && <Link href="/auth" className="inline-block py-3 underline">Return to sign in</Link>}
    </section>
  </main>;
}
