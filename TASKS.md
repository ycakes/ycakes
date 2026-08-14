# TASKS.md

Check items off as completed. Add sub-tasks as they get discovered mid-phase — don't let this file go stale.

## Phase 1 — Foundation

- [x] Init Next.js (App Router, TypeScript) project — `create-next-app`, npm, `src/` dir, Tailwind v4
- [x] Init git repo, .gitignore
- [x] Connect Supabase project (local via CLI + hosted)
  - [x] `supabase init` — local `supabase/config.toml` scaffolded
  - [x] Hosted project connected via Supabase MCP (project ref `yddapkhhniecjnnzrolv`, region eu-central-1, empty — schema comes in Phase 2). `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` (gitignored) + `.env.example` template. `src/lib/supabase/client.ts` + `server.ts` browser/server helpers added, no code calls them yet.
  - [x] Add the same two env vars to the Vercel project dashboard
  - [x] `supabase link` — CLI linked to hosted project `yddapkhhniecjnnzrolv`
  - [x] `supabase start` (local Docker stack) — tried in Phase 2, worked, then deliberately dropped in favor of hosted-only dev (see ARCHITECTURE.md's Development environment section)
- [x] Set up Tailwind + shadcn/ui
- [x] Set up next-intl skeleton (EN default, AR toggle, RTL wiring) — locale-prefixed routing (`/en`, `/ar`), see ARCHITECTURE.md
- [x] Basic folder structure: (storefront) route group, (admin) route group, shared components/lib
- [x] Deploy empty shell to Vercel, confirm pipeline works end-to-end — repo pushed to `github.com/ycakes/ycakes`, connected to Vercel project "ycakes", production deploy live at `ycakes.vercel.app`
- [ ] Connect custom domain (once purchased)

## Phase 2 — Data model

- [x] Finalize full schema per ARCHITECTURE.md core entities
- [x] Write Supabase migrations
- [x] Set up Row-Level Security policies per role
- [x] Seed script for categories/sizes/flavors/etc. (placeholder data)
  - Follow-up items from the Phase 2 final review (RLS TO-clause hygiene applied, order-write guardrails added, promo enumeration closed — see `.superpowers/sdd/2026-08-13-phase2-data-model/progress.md` for the full review and what was fixed vs. deferred)
- [x] `orders.customer_id` deferred decision resolved: `on delete set null` (`20260814090600_orders_customer_id_set_null.sql`)
- [x] Accountant read-only catalog RLS (`20260814090700_accountant_catalog_read.sql`)
- [x] Reconciled hosted `supabase_migrations.schema_migrations` version numbers to match local filenames (they'd drifted — MCP `apply_migration` timestamps recorded the moment each call ran, not the filename); going forward, migrations are pushed via `supabase db push` so they can't drift again
- [x] Local Supabase stack via Docker — got it working after a Docker Desktop update fixed the earlier API-version mismatch, `supabase migration list` showed all 23 migrations matching hosted exactly, then reverted by choice: `supabase stop` (containers removed, data volume kept for a fast future restart), `.env.local` back to hosted. Day-to-day dev currently runs against hosted, not local — `supabase start` + flip `.env.local` back to `http://127.0.0.1:54321` any time local dev is wanted again.
- [x] Baseline table grants (`20260814090800_baseline_table_grants.sql`) — hosted projects get `select/insert/update/delete` on every `public` table granted to `anon`/`authenticated`/`service_role` automatically at provisioning; the local CLI/Docker stack didn't replicate that (confirmed: even `service_role` got `permission denied` on a plain select, not an RLS issue). Stated explicitly now so local dev doesn't depend on CLI/Docker bootstrap behavior. Re-granting an already-granted privilege is a no-op, so pushing it to hosted was a safe no-change confirmation, not a fix there.

## Phase 3 — Public storefront

- [ ] Home page: hero, category sections with admin-curated featured cakes
- [ ] Shop / category browse pages
- [ ] Contact page (address/hours, wa.me link, social links)
- [ ] Cake detail + customization flow (size, color, shape, flavor(s), 50/50, text, toppers for custom, notes)
- [ ] Cart (view, quantity, remove, estimated price)

## Phase 4 — Checkout & orders

- [ ] Checkout form (delivery area, promo code, contact details, delivery/pickup date against calendar blocks, notes)
- [ ] Guest order creation (UUID-linked) and account order creation
- [ ] Confirmation email (Resend)
- [ ] Optional account: register/login/profile/order history

## Phase 5 — Admin: catalog

- [ ] Cakes CRUD (images via Cloudinary, bilingual fields)
- [ ] Categories CRUD + reorder (incl. Candy Corner subcategories)
- [ ] Sizes/Flavors/Colors/Toppers management (incl. temporary disable)

## Phase 6 — Admin: orders & operations

- [ ] Orders list/detail, status changes, final pricing
- [ ] Delivery areas + pricing management
- [ ] Delivery/pickup calendar block management
- [ ] Promo codes CRUD + redemption cap enforcement

## Phase 7 — Admin: money

- [ ] Expenses entry (categorized, backdatable)
- [ ] Business analytics dashboard (revenue, volume, AOV, popular items, area breakdown, promo usage, cancellations, net profit)
- [ ] Excel export on analytics

## Phase 8 — Roles & security

- [ ] Admin/accountant role separation fully enforced (RLS pass)
- [ ] Audit log wired to every admin/accountant mutation
- [ ] Multi-admin account management (2-3 admins, 1 accountant)

## Phase 9 — i18n/RTL completion

- [ ] Full Arabic translation of static UI strings
- [ ] RTL visual QA across every page (storefront + admin)

## Phase 10 — Launch prep

- [ ] Final QA pass
- [ ] Performance check
- [ ] Basic SEO (meta tags, sitemap)
- [ ] Go live
