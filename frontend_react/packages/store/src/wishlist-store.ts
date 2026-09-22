import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Mirrors `BadgeType` in apps/web's EventBadges.tsx. Inlined rather than
 *  imported: this package must not depend on the web app. Keep the two in step. */
export type WishlistBadgeType =
  | "free" | "selling-fast" | "today" | "sold-out" | "this-week" | "recommended";

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
  /**
   * ⚠️ `badgeType` is the COMMUNITY field (one tag) and `badgeTypes` the EVENT
   * one (all of them) — the same split `ActionItem` carries in EventActions.tsx.
   *
   * The array was added on 2026-09-11 so a saved event shows the SAME tags the
   * home-page card showed (Gautham: "show all tags thats shown in the home
   * page"); before that only the first was kept and the wishlist row could
   * claim "Free" for an event the grid also called "Selling Fast".
   *
   * Both stay, and readers must fall back from the array to the single value:
   * this store is PERSISTED to localStorage, so a wishlist saved before that
   * date holds rows with only `badgeType`. Dropping it would blank their tags.
   */
  badgeType?: WishlistBadgeType;
  badgeTypes?: WishlistBadgeType[];
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
