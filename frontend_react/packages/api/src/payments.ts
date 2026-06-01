import { apiClient } from "./client";

export const paymentsApi = {
  createIntent: (data: {
    user_id: string;
    event_id: string;
    amount: number;
    currency: string;
    metadata: Record<string, unknown>;
  }) => apiClient.post("/payment/create-intent", data),
};
