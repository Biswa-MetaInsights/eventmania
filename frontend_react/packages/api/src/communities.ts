import { apiClient } from "./client";
import type { Community } from "@eventmind/types";

export const communitiesApi = {
  search: (params?: { q?: string; category?: string }) =>
    apiClient.get<Community[]>("/community/search", {
      params: { status: "active", ...params },
    }),

  get: (id: string) => apiClient.get<Community>(`/community/${id}`),

  create: (data: {
    organizer_id: string;
    name: string;
    description?: string;
    category: string;
    location: Record<string, unknown>;
    next_event_date?: string;
    member_count: number;
    price: number;
    status: string;
  }) => apiClient.post<Community>("/community/", data),
};
