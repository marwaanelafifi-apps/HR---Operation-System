# OpsHub engineering guide

- Keep TypeScript strict and favour small reusable UI components.
- This repository is currently a **UI prototype**. Use synthetic data and label actions that do not persist.
- Do not add live authentication, GPS tracking, external storage, or production notifications without an approved backend phase.
- Location interfaces must state their limits: browser location needs permission, can be unavailable/stale, and is not reliable iPhone background tracking.
- Never put secrets in source or Compose files. Configure local credentials through `.env`.

