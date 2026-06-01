import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface StoredTicket {
  id: string;
  event_id: string;
  event_title: string;
  start_date: string;
  price_paid: number;
  seat_info: string;
  qr_hash: string;
  claimed_at: string;
}

interface TicketsState {
  tickets: StoredTicket[];
  addTicket: (ticket: StoredTicket) => void;
  clearTickets: () => void;
}

export const useTicketsStore = create<TicketsState>()(
  persist(
    (set) => ({
      tickets: [],
      addTicket: (ticket) =>
        set((s) => ({ tickets: [ticket, ...s.tickets] })),
      clearTickets: () => set({ tickets: [] }),
    }),
    { name: "eventmind-tickets" }
  )
);
