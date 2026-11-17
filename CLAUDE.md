# OpsHub — Project Memory

## Purpose and current scope

OpsHub is a self-hosted internal operations platform. The current implementation is a **UI-first HR, attendance, and CRM prototype** using synthetic, browser-local data only.

The present user-facing scope is:

- Employee attendance check-in and check-out with deduction tracking
- Admin-configured company location label and allowed check-in radius
- Employee-private attendance view: personal status, shift, records, deductions
- Employee-private meeting agenda: users see only their own meetings
- CRM daily tasks: Ads, Projects in Market (Knowledge), Calls, Rotation
- CRM requests and meetings (unified card, per-employee targets)
- CRM performance tracking and task history
- Finance dashboard: per-employee and all-employees deduction summary
- Admin panel: employees, settings, assessment locks, meetings tab (delete)
- Admin-assigned extra tasks visible on employee CRM page

## Workspace and access model

The application is organised into two primary workspaces:

- **Workplace:** attendance, office operations, leave, deductions, payslips, and HR workflows.
- **CRM:** daily tasks, requests, meetings, performance, history, and field-sales workflows.

Sales users can access their own Workplace/HR information and the CRM in separate top-level tabs. Employees see only personal Workplace data; HR/admin roles manage broader people and payroll data; CRM visibility is role-based.

## Brand commitment

Use `public/Logo.png` as the brand asset. The visual system is formal and modern, informed by the logo's deep evergreen/teal and near-black palette. Avoid the previous purple SaaS visual language.

## Technology

- Next.js App Router, React, TypeScript, Tailwind CSS, shadcn-style components
- NestJS API scaffold (`GET /health`) — no frontend API integration yet
- Docker Compose with web, API, PostGIS, and Redis declarations
- Local Docker UI runtime available on `http://localhost:3000` using container `opshub-web-local`

## Important constraints

- Keep TypeScript strict and UI components small and reusable.
- Label any demo/mock action clearly. Do not imply persistence where there is none.
- Do not add live authentication, GPS/location tracking, external file storage, or production notifications until an approved backend phase.
- Browser location must always be consent-aware. It can be denied, unavailable, or stale; missing updates do not prove presence.
- Never hard-code credentials. Configure local Compose credentials through `.env`.

## Prototype identity

- Current user: `ME_ID = "ahmed-khalil"`, `ME_NAME = "Ahmed Khalil"` — used in all CRM workspaces.
- All data stored in browser `localStorage`; no server persistence.

## Attendance behaviour

- Admin settings store a company location name and radius in browser `localStorage`.
- Employee attendance captures the browser clock time when the user clicks Check in or Check out.
- The employee Attendance screen (Today view) shows a "Deductions today" sidebar card when late-arrival or CRM deductions apply.
- The Month view stats tile shows combined deductions (delay + CRM); calendar cells show `-Xd` pills per deduction day.
- A future admin attendance view needs server-side RBAC and may display team records, exceptions, corrections, and reports.

## Meetings behaviour

- The employee Meetings screen is **My meetings** only; it must not reveal other employees' meetings or assignments.
- Admin → Meetings tab allows viewing and deleting all meeting records with inline confirmation.

## CRM daily tasks behaviour

### Ads & WhatsApp Campaign
- Requires N valid social media URLs (count configured by admin, default 3).
- Each URL must be a recognised social media link (Facebook, Instagram, TikTok, Snapchat, WhatsApp, etc.).
- Duplicate URLs across slots are rejected immediately.
- Post date verification is deferred to the server phase — the form does not ask the user to self-report the date.

### Projects in Market (Knowledge task)
- Minimum target: 2 assessments per day (admin-configurable, minimum enforced at 2).
- Unlimited submissions allowed — "Add more" button always visible.
- Form opens directly (no mode selector). Fields use the config from `lib/crm-task-config.ts`.
- **19 fields in order:**
  1. Project Name* (text)
  2. Company Name* (text)
  3. Previous Projects or Owner History* (textarea)
  4. Location* (textarea)
  5. Project Acres* (textarea)
  6. Project Details & Facilities* (textarea)
  7. Unit Types* (textarea)
  8. Prices & Acres* (textarea)
  9. Payment Plan* (textarea, full-width)
  10. Finishing Type* (dropdown: Fully Finished Furnished / Fully Finished / Semi Finished / Flexi Finished / Core, Shell)
  11. Construction* (dropdown: Ready / Off Plan / Construction in Progress) — stacked under Finishing Type
  12. Delivery Date* (date picker, full-width)
  13. Maintenance (textarea, optional)
  14. Engineering Consultant (textarea, optional)
  15. Management & Operations (textarea, optional)
  16. Terms of the Operating Contract (textarea, optional)
  17. Selling Points* (textarea)
  18. Weakness Points* (textarea)
  19. Additional Notes (textarea, optional, full-width)
- All fields marked `*` are required visually but submission is never hard-blocked.
- Text/dropdown/date fields (1, 2, 10, 11, 12) have no mic button — typing/selection only.
- All textarea fields show a mic button for per-field voice-to-text (Arabic or English). Transcribed text is editable. Voice language toggle appears at top of form when speech recognition is available (Chrome/Edge).
- `Owner` field is disabled in DEFAULT_FIELDS (not shown).

### Field config system (`lib/crm-task-config.ts`)
- `KnowledgeFieldConfig` has: `key`, `labelEn`, `labelAr`, `enabled`, `required`, `fieldType` (`"text" | "date" | "dropdown" | "textarea"`), `options`, `layout` (`"full" | "right"`).
- `layout: "full"` → spans both grid columns. `layout: "right"` → groups consecutive right-layout fields into one flex column paired with the preceding left field.

## Deductions

- **CRM deductions** (`CRMDeduction` in `lib/crm-store.ts`): assigned by admin via extra tasks with `deductionDays`.
- **Delay deductions**: computed from `calcDelayMinutes` + `deductionForDelay` from `lib/work-schedule.ts`.
- Both types are surfaced in:
  - Attendance Today view sidebar ("Deductions today" red card)
  - Attendance Month view stats tile + calendar cell pills
  - Finance per-employee stats tile ("Total Deductions" = mgmt + late)
  - Finance all-employees table ("Deductions" column)

## Lead sources

Grouped with `<optgroup>`:
- **Direct Outreach:** Fresh Lead, Cold Call, Walk-in
- **Digital:** Social Media, WhatsApp Campaign
- **Relationships:** Referral, Previous Client
- **Other:** Exhibition / Event, Other

## CRM Settings

- Daily Targets card: requests, meetings, projects, ads link count — 3-column grid.
- Ads & WhatsApp links config is inside the Daily Targets card (divider-separated).
- Locked Assessments removed from CRM settings — lives in Admin panel only.

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

- All builds pass (typecheck + lint + production build).
- Local Docker UI verified on `http://localhost:3000`.
- Latest committed baseline: `8243451 feat: add meeting operations prototype`.
- **All work since that commit is uncommitted**, including: CRM daily tasks system, finance dashboard, attendance deductions, Projects in Market form redesign, per-field voice input, Ads duplicate detection, admin meetings tab, extra tasks, lead source groups, CRM settings consolidation.

## Pending / next steps

1. **Commit** all uncommitted changes.
2. **Admin submissions view** — admin can't yet see Projects in Market submissions.
3. **CRM Performance** — verify assessment count reflects new multi-submission model.
4. **History workspace** — old submissions with legacy field names gracefully show only filled fields (confirmed by filter `([, v]) => v`).
5. **Backend phase** — Ads post-date server verification, real auth, RBAC, persistent storage.

## Installed project skills

- `impeccable`: UI design, critique, polish, and audit workflow
- `grill-me` and `grilling`: structured planning and pressure-testing workflow
