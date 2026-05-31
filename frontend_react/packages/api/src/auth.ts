import { apiClient } from "./client";
import type { AuthTokens } from "@eventmind/types";

interface RegisterResponse {
  msg: string;
  user_id: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<AuthTokens>("/auth/login", { email, password }),

  register: (email: string, password: string, full_name: string) =>
    apiClient.post<RegisterResponse>("/auth/register", {
      email,
      password,
      full_name,
      role: "user",
    }),

  me: () => apiClient.get("/auth/me"),
};