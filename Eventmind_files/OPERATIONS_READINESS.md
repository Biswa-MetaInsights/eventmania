# NewFind operations activation and QA

Owner: Biswajith Gopinathan. These commands affect NewFind only.

## Current boundary

The live core and local database restore checks have passed. Encrypted off-server transport, outgoing alerts and production email must not be marked active until their real destinations and credentials are configured and tested. No paid storage or email service is created by these scripts.

`test_operations.py` exercises a real encrypted restic repository and exact-snapshot restore using synthetic data, wrong-password rejection, corrupt-dump rejection, alert retry/cooldown/recovery, TLS SMTP authentication preflight, and private configuration handling. This is not evidence of a remote provider upload or real email inbox delivery.

## Protected configuration

Enter values directly into the existing owner-only NewFind `.env` on the server, not into chat, GitHub, issue comments, screenshots or command-line arguments. Scripts read only their allow-listed keys and never evaluate shell text. The file must belong to the executing user and have mode 0600.

SMTP needs `SMTP_HOST`, `SMTP_PORT` (587/STARTTLS or 465/TLS), `SMTP_FROM`, `SMTP_USERNAME`, `SMTP_PASSWORD`, and the HTTPS `APP_PUBLIC_URL`. Use an approved sender/domain and complete the provider's SPF/DKIM verification. `python3 backend/scripts/mail_readiness.py` checks TLS and authentication without sending. It does not prove inbox delivery. Account/event mail workers suppress reserved example/test recipients on production transports, preventing synthetic QA mail from being replayed externally.

Alerts need `ALERT_EMAIL_TO` using the SMTP settings, or an approved HTTPS JSON webhook in `ALERT_WEBHOOK_URL` and optional `ALERT_WEBHOOK_TOKEN`. `python3 backend/scripts/operations_alerts.py --test` explicitly sends a labelled test, only after the destination is approved. Confirm receipt with the operator. Duplicate failure messages are limited to one per channel per 30 minutes; failed transports retry, and a delivered failure receives one recovery message. The host monitor can report application failures while the host is running; independent host-down monitoring still needs an approved external monitor.

## Encrypted off-server backups

Install restic from the official distribution and verify its release checksum. Use an existing approved private S3 bucket; a new paid bucket requires approval. Configure `RESTIC_REPOSITORY=s3:https://ENDPOINT/BUCKET/newfind`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and optional `AWS_DEFAULT_REGION`.

`RESTIC_PASSWORD_FILE` must point to a regular owner-only file containing a strong encryption password (at least 20 characters). Keep an independent recovery copy in the owner's password manager. Losing both the host and the password makes recovery impossible. Use dedicated credentials restricted to the backup destination, not credentials borrowed from another application.

After configuration, run `python3 backend/scripts/offsite_backup.py --init --verify-database --install` once to initialize the encrypted repository, upload the latest complete local four-database snapshot, read back that exact snapshot, validate all hashes, verify it in a disposable private PostgreSQL container, and install the daily off-server job. Use `--init` only for a new empty repository. No bucket is created and no remote snapshots are deleted/pruned by the script.

The daily job runs after the existing local backup window. Uploads are throttled, CPU/memory are bounded, each source snapshot is capped at 1 GiB, and a 20 GiB repository guard requires a retention review before more storage accumulates. These guards do not guarantee a provider's account-wide bill. The monitor reports an off-server copy that is missing or older than 36 hours after the repository is configured.

Recovery always starts in an empty temporary directory. The optional database verification uses a newly created, network-isolated PostgreSQL container; it never restores over production. A real disaster restore needs explicit assessment of data newer than the snapshot.

## Browser handover checklist

A secure user sign-in is needed for authenticated browser checks; existing API test credentials must not be printed or injected into a browser. Verify participant profile editing/upload, free checkout and saved QR ticket, organizer creation/content, attendee check-in/undo across sessions, chat/read state, notices, community membership/reviews, refresh/logout and cross-account privacy. Record screenshots without personal data.

Check 390px, 768px and desktop layouts, keyboard navigation, focus, labels, validation/error states, scrolling and touch targets using an approved viewport-capable browser or physical devices. The current cloud browser blocked phone-width emulation; that check remains open. A new login and real phone evidence cannot be inferred from API tests.

`test_catalogue_scale.py` builds 10,000 isolated listings, checks cross-border geographic paging and disjoint results, and asserts one inventory call per result page. It is a regression/scaling check on synthetic data, not a production concurrency benchmark or a large imported provider catalogue.
