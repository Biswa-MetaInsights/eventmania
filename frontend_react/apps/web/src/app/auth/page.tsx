"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@eventmind/api";
import { useAuthStore } from "@eventmind/store";
import type { AuthTokens } from "@eventmind/types";
import { isAxiosError } from "@eventmind/api";
import { BrandLogo } from "@/components/brand";

export default function AuthPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When a sign-in fails because the email has no account, we flip to the
  // sign-up form (keeping the entered email/password) and drop the cursor into
  // the Full Name field — the only thing left for the user to fill in.
  const nameRef = useRef<HTMLInputElement>(null);
  const [focusNameOnSignup, setFocusNameOnSignup] = useState(false);

  useEffect(() => {
    if (!isLogin && focusNameOnSignup) {
      nameRef.current?.focus();
      setFocusNameOnSignup(false);
    }
  }, [isLogin, focusNameOnSignup]);

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isLogin) {
        const { data } = await authApi.login(email, password);
        setAuth(email, data as AuthTokens);
        router.push("/");
      } else {
        await authApi.register(email, password, name);
        // auto-login after register (mirrors Flutter behaviour)
        const { data } = await authApi.login(email, password);
        setAuth(email, data as AuthTokens);
        router.push("/");
      }
    } catch (err) {
      console.error("[Auth error]", err);
      if (isAxiosError(err)) {
        if (!err.response) {
          setError("Cannot reach the server. Is the backend running on port 8000?");
        } else if (isLogin && err.response.data?.detail === "email_not_registered") {
          // No account for this email — carry the entered credentials into the
          // sign-up form so the user only needs to add their name.
          setIsLogin(false);
          setFocusNameOnSignup(true);
          setError("This email isn't registered with us. Please sign up to continue.");
        } else {
          setError(err.response.data?.detail ?? `Error ${err.response.status}`);
        }
      } else {
        setError(String(err));
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--brand-bg)" }}>
      {/* Left panel — hidden on small screens. A fixed green fill in BOTH themes
          (like the footer), so everything on it takes --brand-on-green rather
          than the themed text tokens. */}
      <div className="hidden lg:flex lg:flex-1 items-center justify-center p-16"
        style={{ backgroundColor: "var(--brand-green)", color: "var(--brand-on-green)" }}>
        <div className="max-w-md">
          <BrandLogo markSize={70} gap={14} className="mb-10" />
          <h1 className="text-[42px] font-extrabold leading-tight mb-6">
            Unlock Your Next<br />Great Experience.
          </h1>
          <p className="text-xl leading-relaxed">
            Discover AI summits, tech workshops, and networking events near you.
          </p>
        </div>
      </div>

      {/* Right panel — auth form */}
      <div className="flex flex-1 items-center justify-center px-4 sm:px-6 py-12 lg:px-20" style={{ backgroundColor: "var(--brand-bg)" }}>
        <div className="w-full max-w-md">
          <h2 className="text-3xl font-bold text-[var(--brand-text)] mb-3">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="text-[var(--brand-hint)] mb-10">
            {/* PARKED 2026-08-14 (MVP) — the sign-up line read "Join the EventMind
                community to start your journey." One edit drops both the word
                community (deferred to Phase 2) and the retired internal brand
                name. */}
            {isLogin
              ? "Sign in to access your dashboard and event tickets."
              : "Sign in to start joining events."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <Field label="Full Name">
                <input
                  ref={nameRef}
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className={inputCls}
                />
              </Field>
            )}

            <Field label="Email Address">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputCls}
              />
            </Field>

            <Field label="Password">
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputCls}
              />
            </Field>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-lg bg-[var(--brand-green)] text-[var(--brand-on-green)] text-lg font-bold
                         hover:bg-[var(--brand-green-hover)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? "Please wait…" : isLogin ? "Sign In" : "Sign Up"}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              className="text-[var(--brand-hint)] font-semibold hover:text-[var(--brand-green)] transition-colors"
            >
              {isLogin
                ? "Don't have an account? Sign Up"
                : "Already have an account? Sign In"}
            </button>
          </div>

          <div className="my-8 flex items-center gap-4">
            <div className="flex-1 h-px bg-[var(--brand-border)]" />
            <span className="text-[var(--brand-hint)] font-semibold text-sm">OR</span>
            <div className="flex-1 h-px bg-[var(--brand-border)]" />
          </div>

          <div className="space-y-4">
            <SocialButton label="Continue with Google" color="#DB4437" initial="G" />
            <SocialButton label="Continue with Facebook" color="#1877F2" initial="f" />
          </div>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full px-4 py-3 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-bg)] text-[var(--brand-text)] " +
  "placeholder:text-[var(--brand-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)]/30 " +
  "focus:border-[var(--brand-green)] transition-colors";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-[var(--brand-text)]">{label}</label>
      {children}
    </div>
  );
}

function SocialButton({ label, color, initial }: { label: string; color: string; initial: string }) {
  return (
    <button
      type="button"
      disabled
      title="Coming soon"
      className="w-full flex items-center justify-center gap-3 py-4 rounded-lg border-2 border-[var(--brand-control-border)]
                 bg-[var(--brand-bg)] text-[var(--brand-text)] font-semibold hover:bg-[var(--brand-surface)] transition-colors
                 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--brand-on-green)] text-sm font-bold"
        style={{ backgroundColor: color }}>
        {initial}
      </span>
      {label}
    </button>
  );
}