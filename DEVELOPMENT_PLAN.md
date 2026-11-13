# Development plan

## Phase 0 — foundation

- [x] Establish repository documentation and environment template
- [x] Add Docker Compose services for web, NestJS API scaffold, PostGIS, and Redis
- [~] Compose configuration validated; complete the image build locally (the managed execution build session was interrupted during API dependency installation)
- [x] Add strict TypeScript, Tailwind, linting, and standalone frontend production build configuration

## Phase 1 — meeting operations UI

- [x] Responsive app shell with light/dark theme and mobile navigation
- [x] Dashboard, employee directory/profile, attendance, field-agent view
- [x] Meeting agenda, meeting detail workflow, and booking wizard with synthetic data
- [x] Alert-rule and notification interface with transparent location limitations
- [x] Explicit prototype, loading, empty, success, and permission-denied states

## Deferred next phase

- [ ] Domain model, migrations, RBAC, and internally managed authentication in NestJS
- [ ] Persist meetings and users through API contracts
- [ ] Calendar availability, map rendering with MapLibre/OpenStreetMap, and controlled file uploads
- [ ] Consent, location session lifecycle, and BullMQ alerts after security review
- [ ] Customer/CRM modules only if/when explicitly reprioritised

