import { apiClient } from "./client";

export const recommendationsApi = {
  ingestCity: (city: string, lat: number, lng: number, radius = 100) =>
    apiClient.post(`/recommendation/ingest-city`, null, {
      params: { city, lat, lng, radius },
    }),

  generateEventsForCity: (city: string, lat: number, lng: number) =>
    apiClient.post(`/recommendation/generate-events`, null, {
      params: { city, lat, lng },
    }),
};
