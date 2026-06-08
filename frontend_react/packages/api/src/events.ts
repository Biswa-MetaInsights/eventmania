import { apiClient } from "./client";
import type { Event } from "@eventmind/types";

export interface EventSearchParams {
  q?: string;
  category?: string;
  event_type?: string;
  date_from?: string;
  date_to?: string;
  price_max?: number;
  community_id?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  organizer_id?: string;
  limit?: number;
}

export interface EventCreateData {
  organizer_id: string;
  title: string;
  description: string;
  category: string;
  event_type: string;
  location: Record<string, unknown>;
  target_audience?: string;
  tags?: string[];
  language?: string;
  event_website?: string;
  community_id?: string;
  start_date: string;
  end_date: string;
  capacity: number;
  price: number;
  status: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  user_id: string;
  message: string;
  history: ChatMessage[];
}

export interface ChatResponse {
  reply: string;
  role: "assistant";
}

export const eventsApi = {
  search: (params?: EventSearchParams) =>
    apiClient.get<Event[]>("/event/search", {
      params: { status: "published", ...params },
    }),

  get: (id: string) => apiClient.get<Event>(`/event/${id}`),

  create: (data: EventCreateData) => apiClient.post<Event>("/event/", data),

  chat: (eventId: string, data: ChatRequest) =>
    apiClient.post<ChatResponse>(`/event/${eventId}/chat`, data),
};
