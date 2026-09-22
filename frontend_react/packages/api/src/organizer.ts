import { apiClient } from "./client";
import type { OrganizerProfile } from "@eventmind/types";

export interface OrganizerProfileCreate {
  full_name: string;
  /** Not yet persisted — backend has no column for this. See TODO.md. */
  contact_email: string;
  company_name: string;
  company_address: string;
  company_email: string;
  company_website?: string;
  country: string;
  registration_number: string;
  bank_name: string;
  /** Separators stripped before it is sent — see `normaliseAccount` on
   *  `/organizer/onboarding`, the only thing that calls this. */
  bank_account_number: string;
}

export const organizerApi = {
  get: (userId: string) =>
    apiClient.get<OrganizerProfile>(`/user/${userId}/organizer`),

  submit: (userId: string, data: OrganizerProfileCreate) =>
    apiClient.post<OrganizerProfile>(`/user/${userId}/organizer`, data),
};
