# Loopice

Whitelabel, multi-tenant logistics platform for small/medium logistics companies.

Phase 1 scope: multi-tenant foundation (tenants, branding, auth, roles) and order management.
Shipment (inter-city/station) and fleet management are planned for later phases; the data
model reserves room for them.

## Stack

- `apps/api` — Node.js + Express + TypeScript + Prisma (PostgreSQL)
- `apps/web` — React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- `packages/shared` — types/enums/zod schemas shared by both apps
- pnpm workspaces monorepo

## Multi-tenancy

Single shared database; every tenant-scoped table carries a `tenantId` column. Tenants are
resolved by subdomain (e.g. `acme.yourapp.com`) in production.

### Local subdomain resolution

This repo ships without wildcard DNS setup. Two ways to work locally:

1. **Real subdomains (recommended on your own machine):** modern browsers/OSes resolve
   `*.localhost` to `127.0.0.1` automatically — just browse to `http://acme.localhost:5173`.
2. **Dev header/query fallback (used in sandboxed/headless environments):** when
   `NODE_ENV !== 'production'`, the API also accepts an `X-Tenant-Subdomain: acme` header or
   `?tenant=acme` query param instead of parsing the `Host` header. The web app's API client
   attaches this header automatically in dev mode, using `VITE_DEV_TENANT_SUBDOMAIN`.

## Getting started

```bash
pnpm install

# Postgres (native install)
sudo pg_ctlcluster 16 main start   # or: sudo service postgresql start
sudo -u postgres psql -c "CREATE USER loopice WITH PASSWORD 'loopice' CREATEDB;"
sudo -u postgres createdb -O loopice loopice_dev

# or: docker compose up -d   (if Docker is available)

cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

cd apps/api
npx prisma migrate dev --name init
npx prisma db seed
cd ../..

pnpm dev:api   # http://localhost:4000
pnpm dev:web   # http://localhost:5173
```

### Seeded demo accounts (tenant subdomain: `acme`)

| Role         | Email                  | Password      |
|--------------|-------------------------|---------------|
| SuperAdmin   | superadmin@loopice.dev   | Password123!  |
| Tenant Admin | admin@acme.test          | Password123!  |
| Dispatcher   | dispatcher@acme.test     | Password123!  |

SuperAdmin has no web UI yet in phase 1 — tenant management is done via the
`/api/superadmin/tenants` API (curl/Postman) until a dedicated admin app is built.

## Scripts

- `pnpm dev:api` / `pnpm dev:web` — run each app's dev server
- `pnpm -r typecheck` — typecheck all workspace packages
- `pnpm build` — build all workspace packages
