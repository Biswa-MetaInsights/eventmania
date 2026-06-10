import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WishlistItem {
  kind: "event" | "community";
  id: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  price: string;
  imageUrl: string;
  badge?: string;
  badgeType?: "free" | "selling-fast" | "today" | "sold-out" | "this-week" | "recommended";
  isSoldOut?: boolean;
  category: string;
  memberCount?: string;
}

interface WishlistState {
  items: WishlistItem[];
  toggleItem: (item: WishlistItem) => void;
  removeItem: (id: string) => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set) => ({
      items: [],
      toggleItem: (item) =>
        set((s) => {
          const exists = s.items.some((i) => i.id === item.id);
          return exists
            ? { items: s.items.filter((i) => i.id !== item.id) }
            : { items: [item, ...s.items] };
        }),
      removeItem: (id) =>
        set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
    }),
    { name: "eventmind-wishlist" }
  )
);
