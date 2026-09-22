import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * The participant's own profile picture.
 *
 * ⚠️ THERE IS NO UPLOAD ENDPOINT AND NO FILE STORAGE — the same wall the event
 * cover image hit (see `apps/web/src/lib/image-upload.ts`). The user service
 * does have `profiles.avatar_url`, but it is a `String(512)`, which a `data:`
 * URL does not come close to fitting, and the web app has no client for that
 * service at all. So the picture lives HERE, in localStorage, exactly like the
 * wishlist and the tickets do.
 *
 * ⚠️ KEYED BY EMAIL, NOT A BARE `avatarUrl`. Two people sharing a laptop is the
 * ordinary case for a browser, and a single slot would hand the second one the
 * first one's face. `clearAuth` on logout deliberately does NOT touch this: the
 * picture is keyed to the account, so signing back in brings it back.
 *
 * When a real endpoint lands this becomes the cache in front of `avatar_url`
 * and no call site has to move.
 */
interface ProfileState {
  /** email → `data:` URL (an upload) or an `http(s)` link (a pasted one). */
  avatars: Record<string, string>;
  /** `""` removes the picture rather than storing an empty one. */
  setAvatar: (email: string, avatarUrl: string) => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      avatars: {},
      setAvatar: (email, avatarUrl) =>
        set((s) => {
          const key = email.trim().toLowerCase();
          if (!key) return s;
          const next = { ...s.avatars };
          if (avatarUrl.trim()) next[key] = avatarUrl.trim();
          else delete next[key];
          return { avatars: next };
        }),
    }),
    { name: "eventmind-profile" }
  )
);

/**
 * The picture for one signed-in email, or `""`.
 *
 * A plain helper rather than a second store field, so every reader lowercases
 * the key the same way `setAvatar` wrote it — an address typed `Gautham@…` at
 * login and `gautham@…` the next time is the same person.
 */
export function avatarFor(avatars: Record<string, string>, email: string | null): string {
  if (!email) return "";
  return avatars[email.trim().toLowerCase()] ?? "";
}
