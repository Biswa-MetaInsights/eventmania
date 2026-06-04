import { apiClient } from "./client";
import type { Event } from "@eventmind/types";

export const eventsApi = {
  search: (params?: { q?: string; category?: string; lat?: number; lng?: number; radius?: number; organizer_id?: string }) =>
    apiClient.get<Event[]>("/event/search", {
      params: { status: "published", ...params },
    }),

  get: (id: string) => apiClient.get<Event>(`/event/${id}`),

  create: (data: {
    organizer_id: string;
    title: string;
    description: string;
    category: string;
    location: Record<string, unknown>;
    start_date: string;
    end_date: string;
    capacity: number;
    price: number;
    status: string;
  }) => apiClient.post<Event>("/event/", data),
};
