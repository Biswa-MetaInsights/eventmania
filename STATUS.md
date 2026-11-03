# NewFind — Current State

Owner: **Biswajith Gopinathan (Biswa-MetaInsights)**. Reviewed 2026-11-03.

## Release candidate

The professional-QA candidate adds persistent event operations on the existing isolated five-API stack. PostgreSQL and Redis remain private. Kafka and extra service containers are unnecessary for these journeys.

| Area | Implemented behavior | Verification |
|---|---|---|
| Accounts | Email/password registration/login, private editable profiles, sanitised persistent avatars, recovery and email verification | Isolated service integration; recovery delivered to a local QA SMTP mailbox; one-use links and old-session invalidation checked |
| Discovery | International town/city search, manual/GPS centre, map, 1–200 km radius across borders, server filters/badges, currency-scoped comparisons, pagination | Brussels/Maastricht inclusion and Berlin/invalid coordinates exclusion checked; frontend build/type check |
| Event authoring | Persistent agenda, FAQ, announcements, cover, venue time zone, visibility, organizer ownership and lifecycle validation | API integration and persistence across restart |
| Tickets | Free booking, PostgreSQL capacity lock, retry identity, private locally rendered QR, persistent bookings | Core integration; live PostgreSQL concurrency requires release smoke |
| Organizer operations | Real attendees, contacts scoped to owner, check-in/undo with audit, inventory including used tickets, overview and revenue split by currency | API integration and restart persistence |
| Collaboration | Ticket-holder/organizer rooms, persistent messages/read cursors, polling, event-change notifications, durable email outbox | API permissions, message persistence and notification read state checked |
| Communities | Directory/detail, owner-scoped creation, durable join/leave/reviews, linked events and member event notifications | API integration including restart; public UI requires deployed browser pass |
| Suggestions | Saved-interest/category/tag matching within selected radius, with nearby fallback | API integration; no paid AI service |
| Operations | Guarded sequential build, backup and isolated restore before rollout, rollback image manifests, retention and local health timer | Deployment must run the guarded release script |

## External activation and remaining QA

**This candidate is not a claim that all priorities 1–3 are complete.**

- Provider event catalogue: Ticketmaster/publiq/OpenAgenda approval and credentials pending. No live import is activated. Native QA events are not a complete real-world catalogue.
- SMTP: production sender credentials absent. Recovery/verification and event email transport are implemented and locally tested; live email delivery remains disabled. In-app notifications operate independently.
- Google/Facebook: disabled; verified OAuth implementation, app credentials and callback approval remain.
- Paid ticket tiers, Stripe test checkout/webhooks, refunds and settlement statements: not released. Paid bookings fail closed; no real payments.
- AI assistant: not released; paid inference is not activated.
- Off-server encrypted backup destination and outbound monitoring alerts require approved destination credentials. Local backups/health checks do not cover host loss or notify an operator externally.
- Full mobile/browser/accessibility, large-catalogue load, cross-device organizer door operation and deployed community sharing need evidence before professional handover.
- A dedicated NewFind domain and GitHub repository rename remain separate account/domain operations.

## Deployment boundaries

NewFind remains a separate Compose project, network and volumes. The frontend uses its same-origin `/api` proxy to the approved HTTPS backend route. Existing TalktoFile containers, volumes and Caddy configuration must remain untouched.

The release script preserves old API images and four database snapshots before starting new APIs. Additive columns are backward compatible; new lifecycle values may require restoring the protected pre-release snapshot for a full rollback. Never restore over live data without assessing changes since the snapshot.
