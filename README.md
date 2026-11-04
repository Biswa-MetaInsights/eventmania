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
- **Repository:** https://github.com/Biswa-MetaInsights/newfind — the original repository renamed in place; history, branches and PRs are preserved.
- **Current release branch:** `deployment/hetzner-backend`. PR #10 collects the tested deployment changes for review into `main`.
- **Existing clones:** `git remote set-url origin https://github.com/Biswa-MetaInsights/newfind.git`.
- **Hosting:** Vercel project `newfind` serves the frontend; Hetzner `/opt/newfind` runs the backend. The older Vercel project is a separate deferred decommissioning task.
- **Deployment:** Git pushes may build previews; production promotion requires checking the intended revision and environment.

Powered by MetaInsights BV.
