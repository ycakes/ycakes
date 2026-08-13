# TASKS.md

Check items off as completed. Add sub-tasks as they get discovered mid-phase — don't let this file go stale.

## Phase 1 — Foundation
- [x] Init Next.js (App Router, TypeScript) project — `create-next-app`, npm, `src/` dir, Tailwind v4
- [x] Init git repo, .gitignore
- [x] Connect Supabase project (local via CLI + hosted)
  - [x] `supabase init` — local `supabase/config.toml` scaffolded
  - [x] Hosted project connected via Supabase MCP (project ref `yddapkhhniecjnnzrolv`, region eu-central-1, empty — schema comes in Phase 2). `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` (gitignored) + `.env.example` template. `src/lib/supabase/client.ts` + `server.ts` browser/server helpers added, no code calls them yet.
  - [x] Add the same two env vars to the Vercel project dashboard
  - [ ] `supabase start` (local Docker stack) + `supabase link` (needs `supabase login`, interactive) — deferred until Phase 2 needs local migrations
- [x] Set up Tailwind + shadcn/ui
- [x] Set up next-intl skeleton (EN default, AR toggle, RTL wiring) — locale-prefixed routing (`/en`, `/ar`), see ARCHITECTURE.md
- [x] Basic folder structure: (storefront) route group, (admin) route group, shared components/lib
- [x] Deploy empty shell to Vercel, confirm pipeline works end-to-end — repo pushed to `github.com/ycakes/ycakes`, connected to Vercel project "ycakes", production deploy live at `ycakes.vercel.app`
- [ ] Connect custom domain (once purchased)

## Phase 2 — Data model
- [ ] Finalize full schema per ARCHITECTURE.md core entities
- [ ] Write Supabase migrations
- [ ] Set up Row-Level Security policies per role
- [ ] Seed script for categories/sizes/flavors/etc. (placeholder data)

## Phase 3 — Public storefront
- [ ] Home page: hero, category sections with admin-curated featured cakes
- [ ] Shop / category browse pages
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
