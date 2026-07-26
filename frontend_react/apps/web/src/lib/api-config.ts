import { configureApiBaseUrl } from "@newfind/api";

configureApiBaseUrl(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000");