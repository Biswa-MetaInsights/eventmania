"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@eventmind/api";
import { useAuthStore } from "@eventmind/store";
import type { AuthTokens } from "@eventmind/types";
import { isAxiosError } from "@eventmind/api";

export default function AuthPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="flex min-h-screen" style={{ backgroundColor: "#F2EFEA" }}>
      {/* Left panel — hidden on small screens */}
      <div className="hidden lg:flex lg:flex-1 items-center justify-center p-16"
        style={{ background: "linear-gradient(135deg, #F3FAFA 0%, #E5F6F6 100%)" }}>
        <div className="max-w-md">
          <div className="w-24 h-24 rounded-2xl bg-[#184E4A] flex items-center justify-center mb-10">
            <span className="text-white text-3xl font-bold">E</span>
          </div>
          <h1 className="text-5xl font-extrabold text-[#111827] leading-tight mb-6">
            Unlock Your Next<br />Great Experience.
          </h1>
          <p className="text-xl text-[#4B5563] leading-relaxed">
            Join thousands of attendees discovering AI summits, tech workshops,
            and networking events daily.
          </p>
        </div>
      </div>

      {/* Right panel — auth form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 lg:px-20" style={{ backgroundColor: "#F2EFEA" }}>
        <div className="w-full max-w-md">
          <h2 className="text-3xl font-bold text-[#111827] mb-3">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="text-[#6B7280] mb-10">
            {isLogin
              ? "Sign in to access your dashboard and event tickets."
              : "Join the EventMind community to start your journey."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <Field label="Full Name">
                <input
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
              className="w-full py-4 rounded-2xl bg-[#184E4A] text-white text-lg font-bold
                         hover:bg-[#133d39] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? "Please wait…" : isLogin ? "Sign In" : "Sign Up"}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              className="text-[#4B5563] font-semibold hover:text-[#184E4A] transition-colors"
            >
              {isLogin
                ? "Don't have an account? Sign Up"
                : "Already have an account? Sign In"}
            </button>
          </div>

          <div className="my-8 flex items-center gap-4">
            <div className="flex-1 h-px bg-[#E2DDD5]" />
            <span className="text-[#9CA3AF] font-semibold text-sm">OR</span>
            <div className="flex-1 h-px bg-[#E2DDD5]" />
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
  "w-full px-4 py-3 rounded-xl border border-[#E2DDD5] bg-white text-[#111827] " +
  "placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#184E4A]/30 " +
  "focus:border-[#184E4A] transition-colors";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-[#111827]">{label}</label>
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
      className="w-full flex items-center justify-center gap-3 py-4 rounded-xl border border-[#E2DDD5]
                 bg-white text-[#111827] font-semibold hover:bg-[#F9F9F9] transition-colors
                 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold"
        style={{ backgroundColor: color }}>
        {initial}
      </span>
      {label}
    </button>
  );
}