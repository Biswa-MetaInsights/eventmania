# NewFind — Event Discovery and Communities

NewFind is an event discovery, organizer, and community platform developed by MetaInsights BV.

## Frontend (supported)

The supported web frontend is **Next.js + React + TypeScript**, located at `frontend_react/apps/web`. Flutter is legacy and must not be used for new development or deployment.

### Development

Requirements: Node.js 20+, pnpm 9+.

```bash
cd frontend_react
pnpm install
pnpm --filter @eventmind/web dev
```

The `@eventmind/*` workspace package identifiers are legacy technical names, pending coordinated migration to `@newfind/*` with lockfile and imports updated together.

## Backend

Python FastAPI services are located in `backend/`. See `backend/` and `docker-compose.yml` for configuration. Set API environment variables for your deployment; do not commit credentials.

## Rename and deployment safety

- **Official product name:** NewFind
- **Supported frontend:** Next.js (not Flutter)
- **Legacy code:** Keep existing Flutter code untouched until the Next.js build and deployment are verified.
- **Repository:** Currently `eventmania`; GitHub repository rename to `newfind` is a separate repository-settings operation.
- **Deployment:** No deployment is triggered by this documentation change.

Powered by MetaInsights BV.
