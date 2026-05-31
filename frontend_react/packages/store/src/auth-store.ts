import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthTokens } from "@eventmind/types";

interface AuthState {
  userEmail: string | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  setAuth: (email: string, tokens: AuthTokens) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userEmail: null,
      tokens: null,
      isAuthenticated: false,
      setAuth: (userEmail, tokens) =>
        set({ userEmail, tokens, isAuthenticated: true }),
      clearAuth: () =>
        set({ userEmail: null, tokens: null, isAuthenticated: false }),
    }),
    { name: "eventmind-auth" }
  )
);