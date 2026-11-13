# Project memory

## 2026-11-13 — baseline and meeting UI prototype

The repository began empty (no previous source, documentation, or Compose configuration). Phase 0 and Phase 1 were scaffolded as a new local-only project.

### Completed

- Next.js UI using strict TypeScript, Tailwind, responsive app shell, dark mode, and shadcn-style primitives.
- Synthetic meeting workflow: dashboard, meeting list/details, booking wizard, agent view, employee directory, attendance, alerts, and settings.
- The user reprioritised work away from CRM/customer management. CRM routes were not created and are not exposed in navigation.
- Docker Compose defines web, API scaffold, PostGIS, Redis, and persistent volumes; all passwords are supplied through `.env`.
- NestJS provides only `/health` as an intentional scaffold; UI has no live backend integration.
- The UI `web` Compose service does not depend on API startup, so the demo remains immediately runnable while backend work is deferred.

### Key decisions

- User-facing actions are marked as prototype/demo and only alter browser-local component state.
- Location interaction is represented solely as an employee-initiated check-in UI. It explicitly shows denied/processing/completed states and does not claim background tracking.
- Customer CRM, customer booking, forms, reports, persistence, and authentication are deferred.

### Known issues / next actions

- Verified: `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`, and `docker compose --env-file .env.example config` pass.
- A Docker image build was started after adding `.dockerignore`; the execution environment interrupted the long-running Docker build session during dependency installation, so a full Compose image-build completion remains to be verified locally.
- API package needs its lockfile generated during Docker build validation.
- Add tests and API contracts with the first persistence phase.

