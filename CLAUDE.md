# OpsHub — Project Memory

## Purpose and current scope

OpsHub is a self-hosted internal operations platform. The current implementation is a **UI-first meeting and attendance prototype** using synthetic, browser-local data only.

The present user-facing scope is:

- Employee attendance check-in and check-out
- Admin-configured company location label and allowed check-in radius
- Employee-private attendance view: users see only their own attendance record
- Employee-private meeting agenda: users see only their own meetings
- Meeting creation, meeting details, employee directory, field-agent and alert UI shells

Customer CRM and customer management are intentionally deferred.

## Technology

- Next.js App Router, React, TypeScript, Tailwind CSS, shadcn-style components
- NestJS API scaffold (`GET /health`) — no frontend API integration yet
- Docker Compose with web, API, PostGIS, and Redis declarations
- Local Docker UI runtime available on `http://localhost:3000` using container `opshub-web-local`

## Important constraints

- Keep TypeScript strict and UI components small and reusable.
- Label any demo/mock action clearly. Do not imply persistence where there is none.
- Do not add live authentication, GPS/location tracking, external file storage, or production notifications until an approved backend phase.
- Browser location must always be consent-aware. It can be denied, unavailable, or stale; missing updates do not prove presence. Do not promise iPhone background tracking in the web app.
- Never hard-code credentials. Configure local Compose credentials through `.env`.

## Attendance behaviour

- Admin settings store a company location name and radius in browser `localStorage` for this prototype.
- Employee attendance captures the browser clock time when the user clicks Check in or Check out.
- The employee Attendance screen contains only personal status, shift, check-in/out records, and assigned site. It must not render other employees or company-wide status.
- A future admin attendance view needs server-side RBAC and may display team records, exceptions, corrections, and reports.

## Meetings behaviour

- The employee Meetings screen is **My meetings** only; it must not reveal other employees’ meetings or assignments.
- New meeting and detail routes remain demo flows using synthetic data.

## Validation and commands

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
docker compose --env-file .env.example config
```

To run the currently built UI in Docker:

```powershell
docker run -d --name opshub-web-local -w /app -p 3000:3000 -e NODE_ENV=production -e PORT=3000 -e HOSTNAME=0.0.0.0 -v "${PWD}\.next\standalone:/app" -v "${PWD}\.next\static:/app/.next/static" -v "${PWD}\public:/app/public" node:24-alpine node server.js
```

## Current status

- Type checking, linting, and production builds have passed after the attendance and meetings redesigns.
- The local Docker UI was verified with HTTP 200 on `/attendance` and `/meetings`.
- Docker Compose configuration validates. Full service image startup may require Docker Desktop/registry access for its PostGIS and BuildKit layers.
- Latest committed baseline: `8243451 feat: add meeting operations prototype`. Subsequent attendance privacy, live-click time, meetings privacy/redesign, and installed project skills remain uncommitted.

## Installed project skills

- `impeccable`: UI design, critique, polish, and audit workflow
- `grill-me` and `grilling`: structured planning and pressure-testing workflow

