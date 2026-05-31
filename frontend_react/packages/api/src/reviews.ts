import { apiClient } from "./client";

export interface Review {
  id: string;
  user_id: string;
  event_id: string;
  rating: number;
  content: string;
  created_at: string;
}

export interface ReviewAggregates {
  average_rating: number;
  review_count: number;
}

export const reviewsApi = {
  forEvent: (eventId: string) =>
    apiClient.get<Review[]>(`/review/event/${eventId}`),

  aggregates: (eventId: string) =>
    apiClient.get<ReviewAggregates>(`/review/event/${eventId}/aggregates`),
};
