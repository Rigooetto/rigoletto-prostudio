# Rigoletto ProStudio — Phase 1 ("Foundation") Plan

## Context

Rigoletto ProStudio is a recording studio in Tijuana with no existing software system — right now the owner has no single source of truth for revenue, production status, studio utilization, or Turi's (the Studio Manager & Lead Engineer) compensation. The goal is a new internal web app that becomes the studio's operating system: an Owner view that answers "how is the business doing" in seconds, and a Turi view that turns his work into a visible feedback loop (work → revenue → progress → bonus → next goal) instead of the owner having to say "we need to produce more."

The full specification the owner provided is large (roles, configurable services, a tiered compensation engine for Turi, CRM/pipeline, marketing attribution, studio calendar, financial dashboards, month-end close, audit log). The spec itself says: build in phases, don't hardcode business rules, and put financial calculations server-side with tests. This plan covers **Phase 1 (Foundation) only** — auth, roles, clients, services, projects, sessions, and a real (not fake) basic dashboard — with the database schema shaped so Phases 2–5 (calendar, billing, the compensation engine, CRM, marketing, analytics) can be added without reworking Phase 1 tables.

Confirmed this is a from-scratch build: the current directory only contains an unrelated Flask app (`publishing-contract/`, LabelMind.ai — a different business) and unrelated OBS streaming-config files elsewhere on the Desktop. Nothing to reuse.

**Decisions made with the user:**
- New standalone git repo (sibling directory, e.g. `~/Desktop/rigoletto-prostudio/`)
- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- **Fully on Render** (not Supabase): Render-managed PostgreSQL + Next.js deployed as a Render Web Service, matching the deploy workflow already used for `publishing-contract`. One provider, one dashboard, one mental model.
- Prisma as the ORM/migration tool
- Auth.js (NextAuth) with a Credentials provider for login; authorization enforced at the application layer (Server Actions doing role checks) rather than Postgres RLS — the same pattern the sibling Flask app already uses (blueprint-level role checks, not DB policies), so both of the owner's systems share one authorization mental model
- First build = Phase 1 only (Foundation)
- Dark, premium, Stripe/Linear-style executive dashboard aesthetic, desktop-first, responsive

## Folder Structure

```
rigoletto-prostudio/
├── CLAUDE.md                        # repo conventions for this new project
├── Procfile                         # Render web service start command (mirrors publishing-contract)
├── prisma/
│   ├── schema.prisma                # source of truth for schema
│   ├── migrations/                  # numbered Prisma migrations
│   └── seed.ts                      # seed services, lead sources, goals, 2 employees (hashed passwords)
├── src/
│   ├── app/
│   │   ├── (auth)/login/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx           # authed shell: sidebar + topbar, role-aware nav
│   │   │   ├── dashboard/page.tsx   # role-branches to OwnerDashboard | TuriDashboard
│   │   │   ├── clients/{page,[clientId]/page,new/page}.tsx
│   │   │   ├── projects/{page,[projectId]/page,new/page}.tsx
│   │   │   ├── sessions/{page,[sessionId]/page,new/page}.tsx
│   │   │   └── settings/{services,lead-sources,users}/page.tsx   # admin-only
│   │   ├── api/auth/[...nextauth]/route.ts   # Auth.js handler
│   │   └── layout.tsx / globals.css
│   ├── components/{ui,dashboard,clients,projects,sessions,shared}/
│   ├── lib/
│   │   ├── db.ts                    # Prisma client singleton
│   │   ├── auth.ts                  # Auth.js config: Credentials provider, JWT session, role in token
│   │   ├── auth/session.ts          # getCurrentEmployee(), requireRole() server helpers used by every action
│   │   ├── actions/                 # "use server" writes: clients.ts, projects.ts, sessions.ts, services.ts, lead-sources.ts
│   │   │                            #   — every action starts with a requireRole()/ownership check (the RLS-equivalent boundary)
│   │   ├── queries/                 # read-only fetch helpers: dashboard.ts, clients.ts, projects.ts, sessions.ts
│   │   ├── services/compensation/   # EMPTY in Phase 1 except README — reserved for Phase 4's pure calc functions
│   │   └── validation/              # zod schemas shared by forms + server actions
│   ├── types/domain.ts              # enums/domain types mirrored from Prisma schema
│   └── middleware.ts                # Auth.js session check + route protection for (dashboard)/*
└── tests/{unit,e2e}/
```

Key conventions:
- **Server Actions are the only write path** from the UI. Since there's no Postgres RLS doing enforcement for us, every action in `lib/actions/*` opens with an explicit `requireRole()` or ownership check before touching Prisma — this is the hard authorization boundary, and it's the single pattern the rest of the app (and Phase 4's compensation writes) copies.
- **`lib/services/`** is reserved from day one for backend business logic decoupled from Next.js request plumbing, so Phase 4's compensation engine (tiered production bonus, revenue bonus, acquisition commission) is unit-testable in isolation, per the spec's explicit "financial calculations must not rely only on frontend logic" rule.
- Reads (`lib/queries/`) and writes (`lib/actions/`) are physically separated for easier permission auditing.

## Database Schema (Phase 1)

Principles: status fields are Prisma/Postgres `enum`s; anything the spec calls "configurable" (services, lead-source commission eligibility, goals) is a config table, never hardcoded; every table has `id`, `createdAt`, `updatedAt`; money columns are `Decimal(12,2)`; FK columns that will point at Phase 3/4 tables (invoices, payments) are added now as **nullable** so Phase 1 tables don't need rework later.

- `Role` — code (`ADMIN`/`STUDIO_MANAGER`), label, `isConfidentialFinancials` flag (drives future Owner-only gating on net-profit data)
- `Employee` — `email`, `passwordHash` (bcrypt), `roleId` FK, `basePayWeekly` (Turi's $300/wk lives as data, not code) — this is the table Auth.js Credentials provider authenticates against directly; no separate auth-provider user table needed since we're not using Supabase Auth
- `LeadSource` — code/label, `isMarketingChannel`, `eligibleForAcquisitionCommission` (both Admin-editable; consumed by Phase 4, stored now)
- `Client` — contact info, `leadSourceId`, `originatedByEmployeeId`; lifetime revenue/session/project counts are a **derived Prisma query/view**, never stored redundantly
- `Artist` — child of `Client` (a client/company can have N artists)
- `Service` — `serviceName`, `billingType` enum (PER_SONG/PER_HOUR/PER_DAY/FIXED_PROJECT/CUSTOM), `defaultPrice`, `compensationType`/`compensationValue` (interpreted by Phase 4); seeded with the 5 initial services
- `Project` — client/artist/service/lead-engineer FKs, `status` enum, `trackCount`, quoted price + currency/exchange-rate triad, and the **full lifecycle timestamp set** from the spec (scheduled → recording → editing → mix → master → first delivery → revision → final delivery); nullable `quoteId`/`invoiceId` placeholders for Phase 2/3
- `ProjectTrack` — per-track status enum, `deliveredAt` (Phase 4's tiered production bonus counts off this field), auto-created N rows per project on creation
- `Session` — project/client/artist/service FKs, room (free text in Phase 1), start/end, amount + currency triad, `paymentStatus` enum, nullable `invoiceId`/`paymentId` placeholders; indexed on `startsAt` so Phase 2's calendar needs no migration
- `SessionEngineer` — join table, supports multiple engineers per session (future junior engineers)
- `Goal` — monthly/stretch/long-term/annual revenue targets as rows, not constants; created in Phase 1 (cheap, 4 rows) so the dashboard's goal-progress bar is real data immediately, even though the full bonus-forecast consumer is Phase 4

Full Prisma schema (fields, enums, indexes, and the client-summary aggregation query) gets written out in `prisma/schema.prisma` when implementation starts; the table list and column intent above is the approved shape.

## Authorization (replaces Postgres RLS)

Every table above has a real owner, but enforcement lives in TypeScript, not the database:
- `lib/auth/session.ts` exposes `getCurrentEmployee()` (reads the Auth.js JWT, which carries `employeeId` + `roleCode`) and `requireRole('ADMIN')`.
- **Operational data** (clients, artists, projects, project tracks, sessions): both roles can read everything (spec: Turi sees "all studio sessions"). Admin can write anything. Studio Manager can create/update records tied to his own work (`leadEngineerId === session.employeeId`, or presence in `SessionEngineer`) but not delete, and not reassign a project away from himself — each `lib/actions/*` function encodes this explicitly, e.g. `updateProject()` checks `isAdmin || project.leadEngineerId === employee.id` before writing.
- **Config tables** (`Service`, `LeadSource`, `Goal`): both roles read; only Admin writes — enforced by `requireRole('ADMIN')` at the top of every settings action.
- **`Employee`**: everyone can read names (needed for engineer-assignment UI); only Admin can update others' `roleId`/`basePayWeekly`.
- Phase 1 has no truly Owner-only financial data yet (net profit/expenses are Phase 3/4) — `Role.isConfidentialFinancials` exists now so those later checks don't require a schema change, just a new `if` in the relevant query/action.
- Because every write already funnels through `lib/actions/*`, this is also the natural place Phase 5's audit log hooks in later (wrap the action, log old/new value) without refactoring.

## Auth

Auth.js (NextAuth v5) with a **Credentials provider**, JWT session strategy (required for Credentials — no database session table needed), bcrypt-hashed passwords on `Employee.passwordHash`. No public signup route — this is an internal 2-person tool; Admin creates both accounts via `prisma/seed.ts` (hashes initial passwords) or, later, the `/settings/users` admin page. `middleware.ts` checks the Auth.js session and redirects unauthenticated requests to `/login` for everything under `(dashboard)/*`. The JWT callback embeds `employeeId` and `roleCode` so `getCurrentEmployee()` never needs an extra DB round-trip just to check role.

## Deployment

Render Web Service (Node) running the Next.js app, `Procfile`-style start command mirroring `publishing-contract`'s existing pattern; Render-managed PostgreSQL instance (separate from the Flask app's DB — different business, own instance); `DATABASE_URL` and `AUTH_SECRET` set in Render's environment variable dashboard, same workflow the owner already uses. `prisma migrate deploy` runs as part of the Render build/release step.

## Phase 1 Scope

**In:** login/session, Admin + Studio Manager roles enforced via app-layer checks, employees settings page (Admin-only), Clients (list/detail/create, derived lifetime revenue), Artists (inline under client), Services (Admin-only config CRUD, seeded), Lead Sources (Admin-only config CRUD, seeded, including commission-eligibility toggle), Projects (list/detail with full lifecycle timestamps + status + `ProjectTrack` sub-table showing "7/10 edited, 4/10 mixed" rollups), Sessions (list/detail/create with engineer assignment, manually-set payment status since there's no `Payment` table yet), and a real role-branched Dashboard.

**Explicitly deferred**, with the Phase 1 schema already accommodating each: calendar UI (Phase 2 — `Session` already indexed/shaped), CRM/pipeline/leads/quotes (Phase 2 — `Project.status` already has LEAD/QUOTED, `quoteId` placeholder ready), marketing/campaigns (Phase 2/3 — `LeadSource.isMarketingChannel` ready), invoices/payments/expenses/multi-currency UI (Phase 3 — placeholder FKs and currency triads already present), the compensation engine and bonus/tier math (Phase 4 — all the data it needs, `compensationType`/`Value`, `basePayWeekly`, `deliveredAt`, acquisition-commission eligibility, already exists; `lib/services/compensation/` folder reserved), audit log and notifications (Phase 5 — Server Actions are the natural interception point to add later).

Turi's dashboard explicitly shows a "Compensation forecast — coming in a future update" placeholder rather than fabricating numbers, since the compensation engine isn't built yet.

## Key Pages

`/login` · `/dashboard` (role-branched: Owner gets today/week/month/YTD revenue + goal progress bar + project counts by status + this week's sessions; Turi gets his own attributable revenue, today/this-week sessions, his project counts) · `/clients`, `/clients/[id]`, `/clients/new` · `/projects`, `/projects/[id]` (lifecycle stepper + tracks sub-table), `/projects/new` · `/sessions`, `/sessions/[id]`, `/sessions/new` · `/settings/services`, `/settings/lead-sources`, `/settings/users` (Admin-only, hidden entirely from Studio Manager in nav, not just disabled).

## Testing

Vitest for `lib/validation/*` (zod schemas) and every `requireRole()`/ownership-check branch in `lib/actions/*` (Admin vs Studio Manager attempting a forbidden write, e.g. Turi trying to edit `Service` pricing or reassign someone else's project) — this is Phase 1's analog of Postgres RLS test coverage, and it's Phase 1's highest-risk correctness surface. One Playwright smoke test: login → create client → create project → create session → dashboard reflects it. The `lib/services/compensation/` convention is established now specifically so Phase 4's tiered-bonus arithmetic (production tiers, revenue bonus tiers, all boundary values) is unit-tested as pure functions with zero Next.js dependency when that phase is built.

## Verification

1. `npm run dev` locally against a local or Render-hosted Postgres via `DATABASE_URL`, confirm the app connects and Prisma migrations apply cleanly
2. Log in as both seeded users (Admin, Turi), confirm role-based nav differences (Settings hidden from Turi) and that a Turi-authenticated request to an Admin-only action is rejected server-side
3. Create a client → create a multi-track project (e.g. 10 songs) → confirm 10 `ProjectTrack` rows auto-created → mark some tracks DELIVERED → confirm the rollup count updates
4. Create a session, assign 1+ engineers, confirm it shows on both dashboards appropriately scoped
5. Confirm dashboard revenue tiles reflect real session/project data, not placeholders
6. Run `npm run test` (Vitest) and the Playwright smoke test, both green
7. Deploy to a Render Web Service against a Render PostgreSQL instance and confirm the same login/CRUD flow works in that environment
