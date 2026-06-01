import axios from "axios";

export const apiClient = axios.create({
  baseURL: "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

export function configureApiBaseUrl(url: string) {
  apiClient.defaults.baseURL = url;
}

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("eventmind-auth");
    if (stored) {
      const { state } = JSON.parse(stored);
      if (state?.tokens?.access_token) {
        config.headers.Authorization = `Bearer ${state.tokens.access_token}`;
      }
    }
  }
  return config;
});