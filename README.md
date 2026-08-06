# HaulWise — Smart Commercial Freight Router & Live GPS Telemetry

A premium SaaS smart freight route planner and live GPS telematics system for commercial drivers. Enter your current location, pickup, and dropoff — HaulWise generates a fully FMCSA-compliant driving plan with HOS-enforced breaks, fuel stops, live telemetry, and multi-day ELD daily log sheets.

## Run & Operate

- `pnpm dev` — launch frontend development server (`http://localhost:5173`)
- `pnpm --filter @haulwise/web run dev` — run web frontend standalone
- `pnpm --filter @haulwise/api run dev` — run API backend server (`http://localhost:5000`)
- `pnpm run typecheck` — full typecheck across all workspace packages
- `pnpm run build` — typecheck + build all packages

## Architecture & Workspace Stack

- **Monorepo**: pnpm workspaces, Node.js 20+, TypeScript
- **Apps**: `@haulwise/web` (React 19 + Vite), `@haulwise/api` (Express 5)
- **Packages**: `@haulwise/db`, `@haulwise/api-spec`, `@haulwise/api-zod`, `@haulwise/api-client-react`
- **Routing & Geocoding**: OSRM polyline engine, Nominatim geocoder
