import { apiClient, authApi } from '@eventmind/api';
import { useAuthStore } from '@eventmind/store';
import type { DummyAttendee, DummyEarningRow, dummyPortfolio, dummyNextEvent } from './fixtures/organizer';

export function currentUserId(): string {
  const token = useAuthStore.getState().tokens?.access_token;
  if (!token) return '';
  try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub ?? ''; }
  catch { return ''; }
}

export interface ParticipantProfile { id: string; full_name: string; bio: string | null; avatar_url: string | null; interests: string[]; updated_at: string }
export async function loadProfile(): Promise<ParticipantProfile> {
  const me = await authApi.me();
  return (await apiClient.get<ParticipantProfile>(`/user/${me.data.id}`)).data;
}
export async function uploadImage(dataUrl: string, kind: 'avatar' | 'event') {
  return (await apiClient.post<{url: string}>(`/user/${currentUserId()}/assets`, { data_url: dataUrl, kind })).data.url;
}
export async function privateImage(url: string): Promise<string> {
  const { data } = await apiClient.get<Blob>(url.replace(/^\/api/, ''), { responseType: 'blob' });
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(data);
  });
}
export type Attendee = DummyAttendee & { checked_in_at?: string | null };
export type Overview = { portfolio: typeof dummyPortfolio; next: typeof dummyNextEvent | null; earnings: DummyEarningRow[] };
export async function loadOverview() {
  return apiClient.get<Overview>(`/ticket/organizer/${currentUserId()}/overview`);
}
export interface Notice { id: string; title: string; body: string; kind: string; href: string; created_at: string; read_at: string | null }
export interface Room { id: string; name: string; unread_count: number; organizer: boolean }
export interface RoomMessage { id: string; sender_id: string; name: string; content: string; is_organizer: boolean; created_at: string }
export const collaboration = {
  notices: () => apiClient.get<{items: Notice[]; unread_count: number}>('/event/notifications'),
  read: (id: string) => apiClient.post(`/event/notifications/${id}/read`),
  readAll: () => apiClient.post('/event/notifications/read'),
  rooms: () => apiClient.get<Room[]>('/event/rooms'),
  messages: (id: string) => apiClient.get<RoomMessage[]>(`/event/${id}/messages`),
  post: (id: string, content: string, request_id: string) => apiClient.post(`/event/${id}/messages`, {content, request_id}),
  readRoom: (id: string) => apiClient.post(`/event/${id}/messages/read`),
};
