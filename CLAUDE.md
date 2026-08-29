# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

**Rigoletto ProStudio** — internal operating system for a recording studio in Tijuana, MX. Two initial users: Owner/Admin and Studio Manager & Lead Engineer ("Turi"), with the schema designed to grow to Junior Engineers, sales reps, and admin staff. `PHASE1_PLAN.md` is the original Phase 1 planning doc (still accurate for Phase 1's rationale); this file reflects the **current, full state of the app** — Phases 1 through 6 are all implemented.

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind v4 + shadcn/ui (generated on **Base UI**, not Radix) · Prisma 7 + PostgreSQL (via `@prisma/adapter-pg`) · Auth.js v5 (Credentials provider, JWT sessions) · Recharts (analytics) · Vitest (unit) + Playwright (e2e) · deployed on Render.

## Running Locally

```bash
brew install postgresql@16 && brew services start postgresql@16
createdb rigoletto_dev

npm install
cp .env.example .env        # set DATABASE_URL, AUTH_SECRET
npx prisma migrate dev
npx prisma generate         # migrate dev does NOT reliably regenerate the client on this Prisma 7 setup — always run this after any schema change
npm run db:seed
npm run dev
```

**`npm run dev` runs `next dev --webpack`, not Turbopack.** Turbopack's dev server (default in Next 16) went into a crash loop in this project — repeatedly deleting and rebuilding its own `.next/dev` directory until it died — most likely from watching `src/generated/prisma` (a large, frequently-regenerated directory) or the `pg` native driver. `next build` (production) uses Turbopack fine; only the long-running dev watcher was affected. If you ever need to debug this further, try excluding `src/generated` from the watcher via `next.config.ts` before reaching for Turbopack again.

We initially tried `npx prisma dev`'s embedded local Postgres; its WAL-replay/auto-persistence behavior kept resurrecting dropped tables during migration work in a way we couldn't fully control, so local dev uses a plain Homebrew Postgres instead (see above).

## Architecture

- `prisma/schema.prisma` — source of truth for the schema, ~20 models across all 6 phases. Generated client outputs to `src/generated/prisma` (gitignored) via the `prisma-client` generator, **not** the old `prisma-client-js`.
- `src/lib/db.ts` — Prisma client singleton, instantiated with a `PrismaPg` driver adapter (Prisma 7 requires an adapter; `datasource.url` no longer lives in `schema.prisma`, it's read from `DATABASE_URL` via `prisma.config.ts`).
- `src/lib/auth.ts` — Auth.js config (Credentials provider, bcrypt against `Employee.passwordHash`, JWT carries `employeeId` + `roleCode`).
- `src/lib/auth/session.ts` — the actual authorization boundary: `getCurrentEmployee()`, `requireEmployee()`, `requireRole('ADMIN')`. **There is no Postgres RLS in this app.** `src/proxy.ts` (Next 16 renamed `middleware.ts` → `proxy.ts`) only does an optimistic redirect based on the session cookie — it is not a security boundary. Every Server Action and page that needs authorization calls into `lib/auth/session.ts` or the per-domain `assertCanWrite*` helpers in `lib/actions/*`.
- `src/lib/actions/*` — Server Actions, the only write path from the UI. Each one starts with a role/ownership check.
- `src/lib/queries/*` — read-only data-fetch helpers for Server Components.
- `src/lib/services/compensation/` — the compensation engine, split in two: `calculate.ts` is pure functions (no Prisma, no I/O) unit-tested exhaustively at every tier boundary in `tests/unit/services/compensation/`; `gather.ts` pulls real inputs (delivered songs, time-based revenue, studio revenue) from the database for a given employee/period and is the untested-by-design integration glue — see comments there for the attribution rules (per-employee vs studio-wide).
- `src/lib/services/audit.ts` — `logAudit()`, a fire-and-forget helper wired into financial/compensation mutations (payments, expenses, compensation approval/pay/adjustment, month close). Never throws.
- `src/lib/serialize.ts` — **read this before passing a Prisma model to a `"use client"` component.** Prisma `Decimal` fields (prices, compensation values, base pay, tier thresholds) are class instances and cannot cross the Server→Client boundary — Next.js fails silently in the browser console, not at build time. Use `toPlainService`/`toPlainEmployee`/`toPlainLead`/`toPlainProductionTier`/`toPlainRevenueBonusTier` etc. If you're passing a query result that has relations `include`d, build a narrow explicit object instead of spreading the whole thing — an included relation can carry its own Decimal fields the helper won't know to touch (see `ProjectEditDialog`'s `EditableProject` type, or `EditLeadPage`'s bare `prisma.lead.findUnique` with no `include`, for the pattern). **This bug recurred multiple times across phases while building this app — check every new `"use client"` prop for Decimal fields, including in arrays and nested objects.**

## Base UI gotchas (shadcn's `base-nova` preset, not Radix)

This project's shadcn components are generated on `@base-ui/react`, which has a different composition API than the Radix-based shadcn you may know:

- **No `asChild`.** Use the `render` prop instead: `<Button render={<Link href="/x" />}>Label</Button>` — the outer component's children get merged into the rendered element, not the other way around. `<DialogTrigger render={<Button>...</Button>} />` for trigger composition.
- **`render`-ing a non-button as a `Button`** (e.g. a `<Link>`, which is an `<a>`) needs `nativeButton={false}`, or Base UI logs an accessibility warning in dev. Don't add it when the rendered element IS already a button (e.g. `DialogTrigger render={<Button>...}` doesn't need it).
- **`Menu.GroupLabel` (shadcn's `DropdownMenuLabel`) must be inside a `Menu.Group` (`DropdownMenuGroup`)** or it throws "MenuGroupContext is missing" at runtime, not build time.
- If anything about Base UI's API surprises you, `node_modules/@base-ui/react/docs/react/handbook/composition.md` is bundled in this repo and is explicitly marked authoritative over training data.
- A harmless `caret-color: transparent` hydration-mismatch warning shows up on text/date/month `Input`/`Textarea` fields — that's Base UI's own SSR technique inside the library, not a bug in this app's code. Ignore it.

## Prisma 7 notes

- `prisma/schema.prisma`'s `datasource` block has **no `url`** — that moved to `prisma.config.ts` (reads `DATABASE_URL` via `dotenv`).
- `PrismaClient` requires a driver `adapter` in the constructor (`@prisma/adapter-pg`'s `PrismaPg`) — see `src/lib/db.ts`.
- **Always run `npx prisma generate` after `npx prisma migrate dev`** — it does not reliably happen automatically in this setup, and the build will fail with `Property 'x' does not exist on type 'PrismaClient'` if you forget.
- Seeding runs via `prisma.config.ts`'s `migrations.seed` field (`tsx prisma/seed.ts`), invoked with `npm run db:seed` (`prisma db seed`). The seed script is idempotent (upserts / existence checks) — safe to rerun.
- Prisma's own Claude Code skills are installed at `.claude/skills/prisma-*` (added automatically by `prisma init`) — useful for anything CLI/client-API related that isn't covered above.

## Authorization Model (no RLS)

Two roles: `ADMIN` (Owner, sees/writes everything, including all financial/compensation data) and `STUDIO_MANAGER` (Turi — sees all studio activity and his own compensation, but can only create/update projects and sessions he leads or is assigned to, cannot reassign a project's lead engineer away from himself, and cannot access Settings, Finance, Marketing, Analytics, or Expenses). Enforced entirely in TypeScript, no Postgres RLS:

- `assertCanWriteProject()` in `lib/actions/projects.ts`, `assertCanWriteSession()` in `lib/actions/sessions.ts` — ownership-scoped writes.
- `requireRole('ADMIN')` gates every Settings action, Expenses, Marketing, Analytics, compensation period approval/pay, and month-end close.
- `requireEmployee()` (any authenticated employee) gates Clients, Projects, Sessions, Leads, Quotes, Tasks, Invoices/Payments, and viewing one's own Compensation.

These are unit-tested in `tests/unit/actions/*` by mocking `@/lib/auth/session`'s `requireEmployee` — follow that pattern for any new authorization branch rather than mocking Prisma/NextAuth directly.

## Configuration-First Rule

Business rules are DB rows, never hardcoded constants: service pricing/compensation type (`Service`), lead-source commission eligibility (`LeadSource.eligibleForAcquisitionCommission`), monthly/annual goals plus weekly available studio hours (`Goal` — yes, hours reuses the same generic numeric-config table as revenue goals), and the compensation engine's tier thresholds (`ProductionTier`, `RevenueBonusTier`, both editable at `/settings/compensation-tiers`). If you're tempted to hardcode a number that a business person might reasonably want to change, put it in a config table instead.

## What's Implemented (Phases 1-6, all of them)

- **Phase 1 — Foundation**: Auth, roles, Clients/Artists, Services, Lead Sources, Projects (with per-track `ProjectTrack` progress and full lifecycle timestamps), Sessions (multi-engineer), role-branched Dashboard.
- **Phase 2 — Operations**: Calendar (week/month views over Sessions), Leads/Pipeline (Kanban-style board by stage), Quotes (lead/client → accept → convert to Project), Tasks.
- **Phase 3 — Financial**: Invoices + Payments (`Invoice`/`Payment` models, additive to Session's own quick `paymentStatus` — see the schema comment above the Invoice model for why these two revenue paths deliberately aren't reconciled against each other), Expenses (Admin-only, categorized), Financial Dashboard.
- **Phase 4 — Compensation Engine**: The centerpiece. Tiered production bonus, flat-bracket monthly revenue bonus, mix/master variable, time-based-service variable, all pure-function-tested; `CompensationPeriod` generate/approve/pay workflow (Admin); a **live, unsaved forecast** (`getLiveCompensationForecast`) powers Turi's real-time "Projected Pay" card and the "$X more revenue unlocks +$Y bonus" motivational messaging — this is the feature the entire spec is built around, treat changes to it with proportionate care and always add a unit test at the boundary you're touching.
- **Phase 5 — Marketing, Audit, Notifications**: `Campaign` tracking with CAC/ROAS, `AuditLog` (wired into payments/expenses/compensation actions/month close), and a **live-computed** notification bell (`getLiveNotifications` — not persisted `Notification` rows; there's no cron/job runner in this app yet, so "becoming overdue" is recomputed on every request rather than event-sourced. The `Notification` table exists in the schema for a future persisted/dismissable version).
- **Phase 6 — Analytics & Close**: 6-month historical trend charts (revenue/expenses/profit, utilization, compensation), month-over-month/3-month-avg/vs-goal comparisons, `MonthlyClose` — **informational only**, it records that Admin reviewed a month but does not currently block further edits to that period's records. If real financial locking is ever needed, that's a deliberate gap to close, not an oversight.

## UI Conventions

- Dark theme only for now (`className="dark"` forced in the root layout) — no light/dark toggle yet.
- Status badges use semantic tone colors (`ProjectStatusBadge`, `TrackStatusBadge`, `PaymentStatusBadge` in `components/shared/status-badge.tsx`) — green/yellow/red/gray, not ad hoc classes.
- Forms use native `<form action={serverAction}>` + `useActionState`, not react-hook-form — matches the Next.js 16 canonical pattern (see `node_modules/next/dist/docs/01-app/02-guides/authentication.md`, also bundled and authoritative). Quick inline status changes (project/track/lead/quote/task status, payment status) use a `Select` with `onValueChange` calling the Server Action directly via `useTransition`, not a form submit.
- Sidebar nav (`components/shared/nav-links.tsx`) is grouped by section (Studio, Sales, Finance, Growth, Compensation, Settings) — it's long; that's expected at this feature count, don't try to collapse it without a real navigation redesign.
- Interactive elements that share a component shape (`DropdownMenuTrigger`, etc.) need distinguishing `aria-label`s once there's more than one per page (e.g. the notification bell vs. the user menu) — both for accessibility and because e2e tests select on them.

## Testing

- `npm run test` — Vitest. Validation schemas, authorization branches, and the full compensation calculation service (every tier boundary from the spec, explicitly).
- `npm run test:e2e` — Playwright, two specs: `smoke.spec.ts` (Phase 1 golden path) and `phases-2-6.spec.ts` (Lead → Quote → Client → Project → Invoice → Payment → Expense → Compensation → Campaign → Analytics, ~15 routes, `test.setTimeout(90_000)` because it's intentionally long). Both assume the dev server is reachable at `localhost:3000`; `playwright.config.ts`'s `webServer` will start one if none is running.
