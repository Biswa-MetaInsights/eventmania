import { apiClient } from "./client";
import type { OrganizerProfile } from "@eventmind/types";

export interface OrganizerProfileCreate {
  full_name: string;
  company_name: string;
  company_address: string;
  company_email: string;
  company_website?: string;
  country: string;
  registration_number: string;
}

export const organizerApi = {
  get: (userId: string) =>
    apiClient.get<OrganizerProfile>(`/user/${userId}/organizer`),

  submit: (userId: string, data: OrganizerProfileCreate) =>
    apiClient.post<OrganizerProfile>(`/user/${userId}/organizer`, data),
};
