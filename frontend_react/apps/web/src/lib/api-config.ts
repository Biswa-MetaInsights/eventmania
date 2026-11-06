import { configureApiBaseUrl } from "@eventmind/api";

const publicUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
configureApiBaseUrl(
  typeof window === "undefined"
    ? process.env.NEWFIND_BACKEND_ORIGIN ?? publicUrl
    : publicUrl,
);
