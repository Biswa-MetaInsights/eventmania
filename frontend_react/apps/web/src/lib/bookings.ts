import { apiClient, authApi, eventsApi } from "@eventmind/api";
import type { StoredTicket } from "@eventmind/store";

interface TicketRecord {
  id: string;
  event_id: string;
  price_paid: number;
  qr_code_hash: string;
  purchased_at: string;
}

async function storedTicket(ticket: TicketRecord): Promise<StoredTicket> {
  const { data: event } = await eventsApi.get(ticket.event_id);
  return {
    id: ticket.id, event_id: ticket.event_id, event_title: event.title,
    start_date: event.start_date, currency: event.currency,
    price_paid: ticket.price_paid, seat_info: "General Admission",
    qr_hash: ticket.qr_code_hash, claimed_at: ticket.purchased_at,
  };
}

export async function loadBookings(): Promise<StoredTicket[]> {
  const { data: user } = await authApi.me();
  const { data } = await apiClient.get<TicketRecord[]>(`/ticket/user/${user.id}`);
  return Promise.all(data.map(storedTicket));
}

export async function bookFreeEvent(eventId: string, quantity: number, requestId: string) {
  const { data: user } = await authApi.me();
  const { data } = await apiClient.post<TicketRecord[]>("/ticket/book", {
    event_id: eventId, user_id: user.id, quantity, request_id: requestId,
  });
  return Promise.all(data.map(storedTicket));
}
