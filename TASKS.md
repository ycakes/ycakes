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

### Phase 2 follow-up migration — done

Decisions made after the original Phase 2 schema was built, applied via `20260814100000`–`20260814100400`:

- [x] Add **Dessert Cups** as a 4th Candy Corner subcategory (seed data — alongside cupcakes/pops/popsicles), 12-step sizes starting at 12 like pops/popsicles
- [x] Remove the **`fake` category row** in `categories` — Fake Cakes is no longer a top-level category (see ARCHITECTURE.md "Fake Cake ordering"). No cake rows existed yet, so nothing needed FK reassignment (defensive reassignment-to-`custom` included anyway).
- [x] Add new `order_items` columns for Fake Cake support: `is_fake` (boolean, default false), `fake_size_cm` (numeric), `fake_shape_id` (FK to `shapes`, via a new `shapes.fake_eligible` flag rather than a dedicated enum), `reference_image_url`. `size_id`/`shape_id` are now nullable; a DB check constraint (`order_items_fake_cake_fields`) enforces real-cake vs. Fake Cake field sets are mutually exclusive.
- [x] Add `orders.source` column (`website`/`phone`/`instagram`/`in_person`, default `website`). The only insert path today is the customer-facing flow, so `normalize_order_on_insert` now forces `source = 'website'` on every insert regardless of client input; Phase 6 manual entry will need its own privileged path.
- [x] Add DB-level validation (trigger, since it spans `order_items`→`cakes`→`categories`): `is_fake = true` rejected for Bento and Candy Corner (including its subcategories) items. A second trigger validates `fake_shape_id` references a `fake_eligible` shape.

## Phase 3 — Public storefront

**Design status: Figma design complete for all four pages below.** File: "YCakes — Design System", key `UR2u2vVxduNHFheGewn9CH`. Pages `Home`, `Shop`, `Cake Detail`, `Cart` in that file are full assembled mockups (not just components) — read from there for spacing, copy, states, and component structure rather than re-deriving it from scratch. Component pages (`Button`, `Product Card`, `Nav Bar`, `Footer`, `Category Card`, `Price Tag`, `Badge`, `Input Field`, `Filter Chip`, `Quantity Stepper`, `Cart Item Row`, `Color Swatch`, `Topper Card`) document variants/states/properties for each. **Code has not been written yet for any Phase 3 page** — this is 100% still ahead of Claude Code, the "done" above refers only to Figma design work.

- [x] Home page: hero, "Shop by Category" (6 categories — no Fake Cakes card, see below), "Trending Cakes" (6 category sections, 4 cakes each), footer
  - Real category photos now in `public/images/categories/{slug}.jpeg` (owner-supplied). Trending Cakes still uses placeholder cake rows (4 per category, seeded via `20260814110000_phase3_placeholder_cakes.sql`) that reuse the category photo — swap for real per-product photos once the owner provides them.
  - Hero background photo (owner-supplied, `public/images/hero/hero.jpg`) renders full-bleed behind the entire Hero section, including behind the text — not a separate boxed image.
  - Design tokens (colors, Cairo/Baloo 2/Caveat fonts, pill Button variants) pulled from Figma into `globals.css` / `button.tsx`, reusable by the rest of Phase 3.
  - Cart badge in `NavBar` reads from the new Zustand store (`src/store/cart.ts`), client-persisted only — no `cart_items` DB sync in Phase 3, deferred to Phase 4 once accounts exist.
- [x] Shop / category browse page: category filter chips, product grid, pagination
  - `/shop` (all cakes) and `/shop/[category]` (single top-level category, Candy Corner aggregates its 4 subcategories) share one `ShopBrowse` component. Pagination is query-param based (`?page=`), 12 cakes/page, hidden when everything fits on one page.
  - Figma's mock "New"/"Sale" product badges were **not** implemented — there's no `is_new`/`sale_price` concept in the `cakes` schema, so nothing to drive them from real data. Flag to the owner if that's wanted; would need a schema change.
- [ ] Cake Detail + customization flow
  - [ ] Normal cake flow: size (servings), tiers (conditional, 24>30+), flavor + 50/50 split toggle, icing color, shape, toppers (Custom Cakes only), text on cake, text on board, additional notes, quantity, add to cart
  - [ ] **Cake Type toggle** (Normal / Fake) at the top of the page, above size — shown for every category except Bento and Candy Corner
  - [ ] Fake Cake flow (shown when Cake Type = Fake): size in cm, icing color, shape (Rectangle/Circle only), text on cake, text on board, additional notes, optional reference image upload, toppers **only** if category is Custom Cakes — see the Figma "Cake Detail Page — Fake Cake Variant" frame and its annotation note for the full conditional logic
  - [ ] Candy Corner snap-to-valid-size input (typing 9 → "6 or 12"), across all 4 subcategories including Dessert Cups
- [ ] Cart page: item list (view/quantity/remove), order summary (subtotal, estimated total, pricing-finalized-via-WhatsApp disclaimer), proceed-to-checkout button (leads into Phase 4, not built yet)
- [x] ~~Contact page~~ — not needed. "Contact" in the nav is an anchor link to the footer (WhatsApp number + Instagram), not a separate route. Decided after Figma design work, correcting an earlier assumption that it would be a full page.

## Phase 4 — Checkout & orders

- [ ] Checkout form (delivery area, promo code, contact details, delivery/pickup date against calendar blocks, notes)
- [ ] Guest order creation (UUID-linked) and account order creation
- [ ] Confirmation email (Resend)
- [ ] Optional account: register/login/profile/order history

## Phase 5 — Admin: catalog

- [ ] Cakes CRUD (images via Cloudinary, bilingual fields)
- [ ] Categories CRUD + reorder (incl. Candy Corner subcategories — now 4: cupcakes, pops, popsicles, dessert cups)
- [ ] Sizes/Flavors/Colors/Toppers management (incl. temporary disable)

## Phase 6 — Admin: orders & operations

- [ ] Orders list/detail, status changes, final pricing
- [ ] **Manual/offline order entry** — admin can register orders placed off-platform (phone, Instagram DM, in-person) directly into the dashboard, tagged via `orders.source`, so they count toward business analytics alongside real website orders
- [ ] Delivery areas + pricing management
- [ ] Delivery/pickup calendar block management
- [ ] Promo codes CRUD + redemption cap enforcement

## Phase 7 — Admin: money

- [ ] Expenses entry (categorized, backdatable)
- [ ] Business analytics dashboard (revenue, volume, AOV, popular items, area breakdown, promo usage, cancellations, net profit) — **must include manually-entered offline/Instagram orders by default**, not just website orders
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
