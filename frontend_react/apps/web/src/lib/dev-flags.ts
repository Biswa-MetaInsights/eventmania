/**
 * Developer escape hatches. One flag today; keep them all here so there is a
 * single place to look before a release.
 *
 * ⚠️ EVERY flag in this file must be `NODE_ENV === "development" && <env var>`.
 * The NODE_ENV half is what makes these structurally impossible to turn on in a
 * production build — someone setting the var in a deploy environment gets
 * nothing. **Do not "simplify" a flag to the env var alone**, and do not key one
 * to a list of developers' emails: an allowlist ships inside the client bundle,
 * publishing those addresses, and would still be live in production.
 *
 * Both halves are statically replaced at build time, so a `false` flag is dead
 * code the bundler drops — the dev-only UI behind one never reaches users.
 */

/**
 * Opens `/organizer/create` without a verified organiser profile, and turns the
 * create ⇄ onboarding pair into a round trip you can walk in both directions:
 *
 * - `/organizer/create` skips its `organizerApi.get()` gate, and its back button
 *   goes to `/organizer/onboarding` instead of into browser history.
 * - `/organizer/onboarding` stops bouncing an already-verified organiser
 *   straight back to `/organizer/create` (that redirect is what would otherwise
 *   make the back button ping-pong), and grows a forward control.
 *
 * ⚠️ It skips the CHECK, not the requirement. With no organiser profile a
 * real-mode submit can still be refused by the backend; dummy mode writes to
 * fixtures and works end to end.
 *
 * Set `NEXT_PUBLIC_SKIP_ORGANIZER_VERIFICATION=true` in `apps/web/.env.local`.
 */
export const SKIP_ORGANIZER_VERIFICATION =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_SKIP_ORGANIZER_VERIFICATION === "true";
