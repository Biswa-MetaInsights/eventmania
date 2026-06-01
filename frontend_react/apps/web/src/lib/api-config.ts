import { configureApiBaseUrl } from "@eventmind/api";

configureApiBaseUrl(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000");