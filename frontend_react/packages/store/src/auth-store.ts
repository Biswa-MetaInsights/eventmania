import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthTokens } from "@eventmind/types";

interface AuthState {
  userEmail: string | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setAuth: (email: string, tokens: AuthTokens) => void;
  clearAuth: () => void;
  setHasHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userEmail: null,
      tokens: null,
      isAuthenticated: false,
      _hasHydrated: false,
      setAuth: (userEmail, tokens) =>
        set({ userEmail, tokens, isAuthenticated: true }),
      clearAuth: () =>
        set({ userEmail: null, tokens: null, isAuthenticated: false }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: "eventmind-auth",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);