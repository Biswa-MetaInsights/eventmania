import { apiClient } from "./client";
import type { Community } from "@eventmind/types";

export interface CommunityCreateData {
  name: string;
  description?: string;
  category?: string;
  website?: string;
}

export const communityApi = {
  create: (organizerId: string, data: CommunityCreateData) =>
    apiClient.post<Community>("/community/", data, { params: { organizer_id: organizerId } }),

  update: (communityId: string, organizerId: string, data: CommunityCreateData) =>
    apiClient.patch<Community>(`/community/${communityId}`, data, { params: { organizer_id: organizerId } }),

  getByOrganizer: (organizerId: string) =>
    apiClient.get<Community>(`/community/by-organizer/${organizerId}`),

  getBySlug: (slug: string) =>
    apiClient.get<Community>(`/community/${slug}`),

  search: (params?: { q?: string; category?: string; limit?: number }) =>
    apiClient.get<Community[]>("/community/search", { params }),
};
