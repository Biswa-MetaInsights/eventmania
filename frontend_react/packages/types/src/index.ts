export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: "attendee" | "organizer" | "admin";
}

export interface Event {
  id: string;
  organizer_id: string;
  title: string;
  slug: string;
  description?: string;
  category: string;
  location: Record<string, unknown>; // { address?, latitude?, longitude?, ... }
  start_date: string;
  end_date: string;
  capacity: number;
  tickets_sold: number;
  price: number;
  status: string;
  content_generated?: Record<string, unknown>;
  moderation_score?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Ticket {
  id: string;
  event_id: string;
  user_id: string;
  status: "pending" | "confirmed" | "cancelled";
  purchased_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface ApiError {
  detail: string;
  status_code?: number;
}

export type VerificationStatus = "unverified" | "pending" | "verified";

export interface OrganizerProfile {
  id: string;
  user_id: string;
  company_name: string;
  company_address: string;
  company_email: string;
  country: string;
  registration_number: string;
  verification_status: VerificationStatus;
}
