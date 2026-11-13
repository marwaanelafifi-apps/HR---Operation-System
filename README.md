# OpsHub

A self-hosted meeting operations prototype for internal teams. The current version is UI-first and uses synthetic data; it does not persist bookings or perform real tracking.

## Run locally

1. Copy `.env.example` to `.env` and replace the two password placeholders.
2. Run `docker compose up --build`. For the UI prototype alone, run `docker compose up --build web`.
3. Open `http://localhost:3000`. The API health scaffold is at `http://localhost:4000/health`.

For frontend-only development, run `npm.cmd install` and `npm.cmd run dev`.

## Useful validation commands

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
docker compose config
```

## Scope and privacy

The location panels describe a future consent-aware workflow only. Browser location can be denied, unavailable, or stale, and web apps must not claim reliable iPhone background tracking. CRM/customer management, database integration, authentication, and production notifications are deferred.

