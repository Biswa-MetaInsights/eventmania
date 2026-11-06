"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient, isAxiosError } from "@eventmind/api";

type Provider = "google" | "facebook";
type Capabilities = Record<Provider, boolean>;
const providers = [
  { id: "google", name: "Google", color: "#DB4437", initial: "G", host: "accounts.google.com" },
  { id: "facebook", name: "Facebook", color: "#1877F2", initial: "f", host: "www.facebook.com" },
] as const;

export function SocialSignIn({ mode = "signin", disabled = false }: { mode?: "signin" | "link"; disabled?: boolean }) {
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState("");
  const capabilities = useQuery({
    queryKey: ["auth-capabilities"],
    queryFn: () => apiClient.get<Capabilities>("/auth/capabilities").then(r => r.data),
    staleTime: 60_000,
    retry: false,
  });
  const connected = useQuery({
    queryKey: ["connected-social-accounts"],
    queryFn: () => apiClient.get<{ providers: Provider[] }>("/auth/oauth/accounts").then(r => r.data.providers),
    enabled: mode === "link",
    retry: false,
  });

  async function start(provider: typeof providers[number]) {
    setError("");
    setBusy(provider.id);
    try {
      const { data } = await apiClient.post<{ authorization_url: string }>(`/auth/oauth/${provider.id}/start`, { intent: mode }, { withCredentials: true });
      const target = new URL(data.authorization_url);
      if (target.protocol !== "https:" || target.hostname !== provider.host) throw new Error("Invalid provider destination");
      window.location.assign(target.href);
    } catch (cause) {
      setError(isAxiosError(cause) && typeof cause.response?.data?.detail === "string"
        ? cause.response.data.detail : "Sign-in could not start. Please try again.");
      setBusy(null);
    }
  }

  return <div className="space-y-4">
    {providers.map(provider => {
      const linked = mode === "link" && connected.data?.includes(provider.id);
      const available = capabilities.data?.[provider.id] === true;
      const waiting = capabilities.isPending || (mode === "link" && connected.isPending);
      return <button key={provider.id} type="button"
        disabled={disabled || busy !== null || !available || linked || waiting || (mode === "link" && connected.isError)}
        title={linked ? `${provider.name} is connected` : available ? undefined : `${provider.name} sign-in is not configured yet`}
        onClick={() => void start(provider)}
        className="w-full flex items-center justify-center gap-3 py-4 rounded-lg border-2 border-[var(--brand-control-border)] bg-[var(--brand-bg)] text-[var(--brand-text)] font-semibold hover:bg-[var(--brand-surface)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
        <span aria-hidden="true" className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: provider.color }}>{provider.initial}</span>
        {busy === provider.id ? "Opening secure sign-in…" : linked ? `${provider.name} connected` : `${mode === "link" ? "Connect" : "Continue with"} ${provider.name}`}
      </button>;
    })}
    {capabilities.isError && <p role="alert" className="nf-meta">Sign-in options could not be loaded. Refresh the page to try again.</p>}
    {mode === "link" && connected.isError && <p role="alert" className="nf-meta">Connected accounts could not be loaded. Please sign in again.</p>}
    {error && <p role="alert" className="nf-meta">{error}</p>}
  </div>;
}
