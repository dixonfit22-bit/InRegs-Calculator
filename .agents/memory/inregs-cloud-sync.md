---
name: InRegs cloud sync architecture
description: How profile persistence works — PostgreSQL via Express API, Vite proxy, optimistic updates
---

## Storage architecture

Profiles are stored in PostgreSQL (`profiles` table, JSONB `data` column, PK `id TEXT`).
The API server (Express, port 8080) owns the DB connection via `pg` Pool.
The frontend (Vite, port 21953) proxies `/api/*` to `http://localhost:8080` in dev via `vite.config.ts server.proxy`.

## Key files
- `artifacts/api-server/src/lib/db.ts` — pg Pool (DATABASE_URL, ssl conditional on localhost)
- `artifacts/api-server/src/routes/profiles.ts` — GET/POST/DELETE /api/profiles
- `artifacts/inregs/src/lib/api.ts` — frontend fetch wrapper; `VITE_API_BASE_URL` env var for production URL override
- `artifacts/inregs/src/lib/storage.ts` — MarineProfile type, pure helpers (computeTrend, pushAssessmentHistory, newProfileId); active profile ID still in localStorage
- `artifacts/inregs/src/components/ProfileLoader.tsx` — async save/load via API
- `artifacts/inregs/src/components/CommandDashboard.tsx` — async fetch; optimistic delete

## Optimistic delete pattern

**Why:** React async state timing caused stale UI after API delete. Drawer closure + API call + refresh created a race where the tester saw stale data.

**How to apply:** In CommandDashboard.handleDelete: immediately `setProfiles(prev => prev.filter(p => p.id !== id))` + `setSelected(null)`, THEN fire `apiDeleteProfile(id)` in the background. On API error, call `refresh()` to re-sync.

## Drawer scroll layout

**Why:** Vaul Drawer with `overflow-y-auto` on root caused footer buttons to scroll out of view on mobile, making them unclickable for test automation.

**Fix:** DrawerContent = `flex flex-col max-h-[90dvh]`. Inner body = `flex-1 overflow-y-auto`. DrawerFooter = `shrink-0 border-t bg-background` so it's always anchored at bottom.

## Multi-device / auth gap

Without user auth, each browser/device generates a new UUID for the same marine. Users sharing a dashboard URL will share a single pool of profiles (no per-user scoping). This is intentional for v1 (unit-level shared dashboard), but will need auth if per-user isolation is required.

## Production deployment note

For the deployed (published) app, both artifacts are deployed separately. The frontend needs `VITE_API_BASE_URL` set to the API server's deployed domain. Without it, `/api/*` calls go to the frontend's own origin (which won't have the API routes) and return 404. Set this env var in the frontend artifact's environment after deploying the API server.
