# NewFind — Current State

Owner: **Biswajith Gopinathan (Biswa-MetaInsights)**. Reviewed 2026-11-07.

## Deployment state

Homepage hero update (2026-11-06), owner **Biswajith Gopinathan**: original images and wording retained in a rotating full-width background above discovery, with an 80–120 px theme-aware bottom fade. Image brightness selects contrasting copy and scrim; Pause/Resume and reduced-motion handling are included. TypeScript/build/lint pass. Production revision `cf17b31b6a907f47b7717067c6edfa42ab210867` was verified in the public desktop browser, including full-width geometry, fade, changing foreground and no horizontal overflow. Real-device checks remain pending.

Typography update (2026-11-06), owner **Biswajith Gopinathan**: Inter and shared responsive type roles are live and verified through computed browser styles; logo artwork and green palette are preserved. TypeScript/build pass; focused ESLint has no errors. Complete responsive and real-device QA remains pending.

The core release is live on 2026-11-03. Backend API images were updated to application revision `b4c4849d14ff799ab17cb732b14729b8ebc8682b`; post-rollout health and persisted core workflows passed, with unchanged TalktoFile container start times. The frontend uses the production Vercel project `newfind` and its same-origin `/api` proxy.

Live PostgreSQL tests passed for registration/login, private profiles, event creation/content, cross-border discovery, currency validation, free booking/retry, organizer-only attendee access, private QR, duplicate check-in, chat, communities/reviews and rescheduling notifications. Records survived NewFind-only user/event/ticketing restarts. The same journeys passed through the public HTTPS Vercel API proxy; post-frontend-release persistence verification passed.

All seven NewFind containers were healthy at the core rollout. NewFind used approximately 363 MiB RAM and 9.24% aggregate Docker CPU during that QA snapshot. No new paid services were added. Four databases passed protected backup, isolated restore, checksum and table-row-count verification; daily local backups and five-minute health checks are active. Gmail SMTP was activated on 2026-11-06: auth/event refreshes passed health checks with unchanged TalktoFile start times. TLS authentication, application SMTP send and owner-confirmed inbox receipt passed. Paid remote backups remain deferred, and external monitoring alerts need an approved destination.

Public browser checks verified international town search (Leuven), the attributed 200 km map and closed-registration event details with persisted agenda. Authenticated browser UI, real-device mobile QA and production concurrent-load testing are not fully verified; API tests do not substitute for those checks. This is a controlled core-feature test release, not completion of every priority 1–3 item.

Frontend revision `e238d193387c4ca10a9068f4bfc8ba3e7b35f66e` was promoted to Production on 2026-11-04. The live footer shows “Developed and powered by MetaInsights BV” and company copyright; the public API gateway responds operational. The original GitHub repository was renamed in place to `Biswa-MetaInsights/newfind`, preserving repository ID 1194615580, PR #10 and the release branch. Local clone remotes use the new URL; the server remote still needs explicit verification and update.

## Mobile frontend update — 2026-11-04

Owner: **Biswajith Gopinathan**. Prepared higher-contrast dark logo/headline, consistent shared navigation icons, explicit first-visit city selection with persisted confirmation, 44 px city controls, bounded scrollable city picker, mobile menu ARIA state/Escape/outside dismissal, and labeled autofill-friendly 16 px authentication fields. Existing saved cities are preserved. TypeScript and production build pass; focused ESLint has no errors (one pre-existing unused `showToast` warning). Location-store runtime checks pass for hydration, reload persistence, explicit default-city confirmation and legacy records; calculated dark headline/background contrast is 14.78:1. Production Vercel promotion remains blocked by connector project access and browser sign-in. Real-device mobile and authenticated browser journeys remain unverified; these fixes must not be reported as live until promotion and verification.

## Deployed core capabilities

The professional-QA candidate adds persistent event operations on the existing isolated five-API stack. PostgreSQL and Redis remain private. Kafka and extra service containers are unnecessary for these journeys.

| Area | Implemented behavior | Verification |
|---|---|---|
| Accounts | Email/password registration/login, profiles, recovery/verification; Google/Facebook authorization code and explicit linking implementation prepared | Live core API and Gmail delivery passed; one-use recovery links/session invalidation tested locally. Social auth has signed-token/security tests but is not yet activated or verified against real provider accounts |
| Discovery | International town/city search, manual/GPS centre, map, 1–200 km radius across borders, server filters/badges, currency-scoped comparisons, pagination | Brussels/Maastricht inclusion and Berlin/invalid coordinates exclusion checked; frontend build/type check |
| Event authoring | Persistent agenda, FAQ, announcements, cover, venue time zone, visibility, organizer ownership and lifecycle validation | API integration and persistence across restart |
| Tickets | Free booking, PostgreSQL capacity lock, retry identity, private locally rendered QR, persistent bookings | Live PostgreSQL booking, retries, access controls and restart persistence; concurrent-capacity test from the earlier release remains separate evidence |
| Organizer operations | Real attendees, contacts scoped to owner, check-in/undo with audit, inventory including used tickets, overview and revenue split by currency | API integration and restart persistence |
| Collaboration | Ticket-holder/organizer rooms, persistent messages/read cursors, polling, event-change notifications, durable email outbox | API permissions, message persistence and notification read state checked |
| Communities | Directory/detail, owner-scoped creation, durable join/leave/reviews, linked events and member event notifications | Live API integration including restart; full authenticated browser membership/review QA remains |
| Suggestions | Saved-interest/category/tag matching within selected radius, with nearby fallback | API integration; no paid AI service |
| Operations | Guarded sequential build, backup and isolated restore before rollout, rollback image manifests, retention and local health timer | Guarded live rollout, protected backup and isolated restore passed |

## External activation and remaining QA

**This candidate is not a claim that all priorities 1–3 are complete.**

- Provider event catalogue: Ticketmaster/publiq/OpenAgenda approval and credentials pending. No live import is activated. Native QA events are not a complete real-world catalogue.
- SMTP: `metainsights.bv@gmail.com` is configured privately on the host. TLS/authentication and one approved application test email passed; the owner confirmed receipt on 2026-11-06. Complete deployed recovery/verification user journeys and event-mail delivery still need QA. No secret is stored in GitHub.
- Google is the current priority. Social authorization implementation and isolated tests cover single-use browser-bound state, Google PKCE, signed ID-token audience/issuer/expiry/nonce checks, provider-subject identity, and explicit authenticated account linking. Email equality never silently links existing accounts. Host credential entry is `backend/scripts/configure_google.py`; the exact redirect is `https://newfind-khaki.vercel.app/auth/google/callback`. Production activation, consent configuration and real sign-up/link/login verification remain pending; the agent browser currently cannot access Google Cloud. Facebook stays disabled pending its own credentials, explicit Graph API version and provider setup. Neither provider is claimed complete.
- Paid ticket tiers, Stripe test checkout/webhooks, refunds and settlement statements: not released. Paid bookings fail closed; no real payments.
- AI assistant: not released; paid inference is not activated.
- Paid off-server backup storage is explicitly deferred by the owner until testing goes well (2026-11-04); do not purchase or activate it during this testing phase. Outbound monitoring alerts still require an approved destination. The restic workflow reads back the exact uploaded snapshot and verifies hashes; it never restores over production. Local encryption/restore, wrong-password/corrupt-data rejection and alert failure/recovery tests passed. Local backups/health checks do not cover host loss or notify an operator externally.
- Full mobile/browser/accessibility, production concurrent load, cross-device organizer door operation and deployed community sharing need evidence before professional handover. An isolated 10,000-listing geographic pagination regression passed, with one inventory lookup per page; date/price discovery pages no longer fetch inventory for the entire catalogue. The current browser is signed out and its phone-width emulation attempt was blocked, so those UI checks remain pending.
- A dedicated NewFind domain remains separate. GitHub repository rename is complete; Vercel linked-repository display and the Hetzner remote need post-rename verification. The default `main` branch still awaits PR #10 review; use the release branch for current application work.

## Deployment boundaries

NewFind remains a separate Compose project, network and volumes. The frontend uses its same-origin `/api` proxy to the approved HTTPS backend route. Existing TalktoFile containers, volumes and Caddy configuration must remain untouched.

The guarded attempts created old API image tags and protected database snapshots with isolated restore verification before reaching their respective failures. Additive columns are backward compatible; new lifecycle values may require restoring the protected pre-release snapshot for a full rollback. Never restore over live data without assessing changes since the snapshot.

Operational activation and QA checklist: `Eventmind_files/OPERATIONS_READINESS.md`.
