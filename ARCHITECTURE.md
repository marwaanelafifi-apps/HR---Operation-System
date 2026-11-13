# Architecture

## Current UI-first structure

`web` is a Next.js App Router application using TypeScript, Tailwind CSS, and shadcn-style reusable primitives in `components/ui`. Route pages compose the application shell and prototype meeting components. Synthetic data is isolated in `lib/mock-data.ts`.

`api` is a minimal NestJS health-check scaffold only. It is not connected to the frontend and deliberately contains no domain or location logic yet.

## Intended production boundary

The future NestJS API will own authentication, RBAC, meeting records, audit events, private file access, and consented location sessions. PostgreSQL with PostGIS will store transactional and geospatial data. Redis/BullMQ will run queued notifications and expiry jobs. The browser and a future React Native client will consume that same API.

## Security decisions

- No hard-coded credentials; Docker uses required values from `.env`.
- Postgres and Redis volumes are persistent.
- Production auth and authorisation must be implemented server-side before any sensitive data or location data is persisted.
- Location evidence must retain availability/permission metadata and must not infer presence from missing updates.

