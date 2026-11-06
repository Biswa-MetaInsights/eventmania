# NewFind — Current State

Owner: **Biswajith Gopinathan (Biswa-MetaInsights)**. Reviewed 2026-11-04.

## Deployment state

Typography update (2026-11-06), owner **Biswajith Gopinathan**: Inter replaces Roboto through the single app font loader. Shared roles give compact responsive hero/section/card titles, 16 px body and controls, and 14 px metadata; logo artwork and green palette are preserved. Local production build and TypeScript pass; focused ESLint has no errors and two existing EventsCarousel unused-symbol warnings. Local browser preview is unreachable from the cloud browser, so visual/responsive verification and production promotion remain pending. This typography candidate is not yet confirmed live.

The core release is live on 2026-11-03. Backend API images were updated to application revision `b4c4849d14ff799ab17cb732b14729b8ebc8682b`; post-rollout health and persisted core workflows passed, with unchanged TalktoFile container start times. The frontend uses the production Vercel project `newfind` and its same-origin `/api` proxy.

Live PostgreSQL tests passed for registration/login, private profiles, event creation/content, cross-border discovery, currency validation, free booking/retry, organizer-only attendee access, private QR, duplicate check-in, chat, communities/reviews and rescheduling notifications. Records survived NewFind-only user/event/ticketing restarts. The same journeys passed through the public HTTPS Vercel API proxy; post-frontend-release persistence verification passed.

All seven NewFind containers are healthy. The rollout verified unchanged TalktoFile container start times. NewFind used approximately 363 MiB RAM and 9.24% aggregate Docker CPU during QA. No new paid services were added. Four current databases passed protected backup, isolated restore, checksum and table-row-count verification. Daily backup retention and five-minute local health checks are active. Encrypted off-server transfer/restore, alert retry/cooldown/recovery and SMTP preflight tools are prepared and tested; activation still requires an approved external destination, sender credentials and alert recipient. No remote provider transfer or real inbox receipt is claimed.

Public browser checks verified international town search (Leuven), the attributed 200 km map and closed-registration event details with persisted agenda. Authenticated browser UI, real-device mobile QA and production concurrent-load testing are not fully verified; API tests do not substitute for those checks. This is a controlled core-feature test release, not completion of every priority 1–3 item.

Frontend revision `e238d193387c4ca10a9068f4bfc8ba3e7b35f66e` was promoted to Production on 2026-11-04. The live footer shows “Developed and powered by MetaInsights BV” and company copyright; the public API gateway responds operational. The original GitHub repository was renamed in place to `Biswa-MetaInsights/newfind`, preserving repository ID 1194615580, PR #10 and the release branch. Local clone remotes use the new URL; the server remote still needs explicit verification and update.

## Mobile frontend update — 2026-11-04

Owner: **Biswajith Gopinathan**. Prepared higher-contrast dark logo/headline, consistent shared navigation icons, explicit first-visit city selection with persisted confirmation, 44 px city controls, bounded scrollable city picker, mobile menu ARIA state/Escape/outside dismissal, and labeled autofill-friendly 16 px authentication fields. Existing saved cities are preserved. TypeScript and production build pass; focused ESLint has no errors (one pre-existing unused `showToast` warning). Location-store runtime checks pass for hydration, reload persistence, explicit default-city confirmation and legacy records; calculated dark headline/background contrast is 14.78:1. Production Vercel promotion remains blocked by connector project access and browser sign-in. Real-device mobile and authenticated browser journeys remain unverified; these fixes must not be reported as live until promotion and verification.

## Deployed core capabilities

The professional-QA candidate adds persistent event operations on the existing isolated five-API stack. PostgreSQL and Redis remain private. Kafka and extra service containers are unnecessary for these journeys.

| Area | Implemented behavior | Verification |
|---|---|---|
| Accounts | Email/password registration/login, private editable profiles, sanitised persistent avatars, recovery and email verification | Live registration/login/profile API integration; recovery delivered only to a local QA SMTP mailbox; one-use links and old-session invalidation checked locally |
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
- SMTP: the owner selected `metainsights.bv@gmail.com` on 2026-11-04. Production sender credentials are still absent; the public, secret-free Gmail configuration template is `backend/gmail.env.example`. TLS/authentication preflight is implemented; reserved synthetic QA recipients are suppressed on production transports. Recovery/verification and event email transport are implemented and locally tested; live email delivery remains disabled. In-app notifications operate independently.
- Google/Facebook: disabled; verified OAuth implementation, app credentials and callback approval remain.
- Paid ticket tiers, Stripe test checkout/webhooks, refunds and settlement statements: not released. Paid bookings fail closed; no real payments.
- AI assistant: not released; paid inference is not activated.
- Paid off-server backup storage is explicitly deferred by the owner until testing goes well (2026-11-04); do not purchase or activate it during this testing phase. Outbound monitoring alerts still require an approved destination. The restic workflow reads back the exact uploaded snapshot and verifies hashes; it never restores over production. Local encryption/restore, wrong-password/corrupt-data rejection and alert failure/recovery tests passed. Local backups/health checks do not cover host loss or notify an operator externally.
- Full mobile/browser/accessibility, production concurrent load, cross-device organizer door operation and deployed community sharing need evidence before professional handover. An isolated 10,000-listing geographic pagination regression passed, with one inventory lookup per page; date/price discovery pages no longer fetch inventory for the entire catalogue. The current browser is signed out and its phone-width emulation attempt was blocked, so those UI checks remain pending.
- A dedicated NewFind domain remains separate. GitHub repository rename is complete; Vercel linked-repository display and the Hetzner remote need post-rename verification. The default `main` branch still awaits PR #10 review; use the release branch for current application work.

## Deployment boundaries

NewFind remains a separate Compose project, network and volumes. The frontend uses its same-origin `/api` proxy to the approved HTTPS backend route. Existing TalktoFile containers, volumes and Caddy configuration must remain untouched.

The guarded attempts created old API image tags and protected database snapshots with isolated restore verification before reaching their respective failures. Additive columns are backward compatible; new lifecycle values may require restoring the protected pre-release snapshot for a full rollback. Never restore over live data without assessing changes since the snapshot.

Operational activation and QA checklist: `Eventmind_files/OPERATIONS_READINESS.md`.
