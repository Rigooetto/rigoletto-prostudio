# Rigoletto ProStudio

Internal operating system for Rigoletto ProStudio (Tijuana, MX) — clients, projects, sessions, calendar, CRM pipeline, invoicing, expenses, a full compensation engine, marketing/CAC tracking, audit log, and historical analytics, with a role-branched dashboard for the Owner and the Studio Manager. All 6 build phases are implemented; see `CLAUDE.md` for the current architecture and `PHASE1_PLAN.md` for the original Phase 1 planning doc.

## Stack

Next.js (App Router) + TypeScript + Tailwind + shadcn/ui (Base UI) · Prisma + PostgreSQL · Auth.js (Credentials) · Recharts · Vitest + Playwright · deployed on Render.

## Local Development

```bash
brew install postgresql@16 && brew services start postgresql@16
createdb rigoletto_dev

npm install
cp .env.example .env   # fill in DATABASE_URL and AUTH_SECRET
npx prisma migrate dev
npx prisma generate    # always run after any schema/migration change
npm run db:seed
npm run dev
```

Seeded logins (change these before going to production):

- Admin: `admin@rigolettoprostudio.com` / `ChangeMe123!`
- Studio Manager (Turi): `turi@rigolettoprostudio.com` / `ChangeMe123!`

Override the seeded passwords with `SEED_ADMIN_PASSWORD` / `SEED_TURI_PASSWORD` env vars before running `db:seed`.

**Notes on two things that fought us during setup** (both documented in detail in `CLAUDE.md`):
- Local Postgres uses plain Homebrew Postgres, not `npx prisma dev` — that tool's embedded local server kept resurrecting dropped tables via WAL replay during migration work.
- `npm run dev` runs `next dev --webpack`, not Turbopack — Turbopack's dev watcher crash-looped in this project.

## Testing

```bash
npm run test       # Vitest — validation schemas, authorization logic, and the full compensation calculation engine
npm run test:e2e   # Playwright — two golden-path specs across all 6 phases (needs the dev server)
```

## Deployment

Render Web Service, see `render.yaml` / `Procfile`. `npm run build` runs `prisma migrate deploy` before `next build` (production builds are unaffected by the Turbopack dev issue above), so migrations apply automatically on deploy. Set `DATABASE_URL` and `AUTH_SECRET` in the Render dashboard.
