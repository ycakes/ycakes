# ARCHITECTURE.md

Living document. Update whenever an architectural decision is made or changed. This is the source of truth — if code and this file disagree, that's a bug in one of them.

## Stack decisions (locked)

- Framework: Next.js App Router, TypeScript, no separate backend service
- DB/Auth: Supabase (Postgres, Row-Level Security for role enforcement)
- Images: Cloudinary
- Email: Resend (account confirmation only)
- Styling: Tailwind CSS + shadcn/ui
- i18n: next-intl for static UI strings; bilingual product content stored as JSONB per field (e.g. `{ "en": "...", "ar": "..." }`) directly on DB rows. Locale-prefixed routing (`/en/...`, `/ar/...`) via a `[locale]` root segment — applies to storefront **and** admin, per hard rule 6 (no English-only surfaces). `dir` (ltr/rtl) is set on `<html>` per locale in the root layout.
- Cart: Zustand, client-persisted for guests, `cart_items` table for logged-in users
- No Redis, no separate payment gateway, no SMS/WhatsApp API integration (admin-customer contact is manual, via a `wa.me` deep link with prefilled text, not automated)
- Deploy: Vercel (app), Supabase (hosted DB/Auth)
- Source control: GitHub (`github.com/ycakes/ycakes`), connected to the Vercel project for git-push deploys

## Design system (Figma)

The storefront visual design is built and maintained in Figma, not invented ad hoc in code. Claude Code implementing Phase 3 UI should read from this file rather than guessing at spacing, color, or component structure.

- **File**: "YCakes — Design System", file key `UR2u2vVxduNHFheGewn9CH` (`https://www.figma.com/design/UR2u2vVxduNHFheGewn9CH`)
- **Foundations**: color/typography/spacing/radius/shadow tokens live as Figma variables (not hardcoded hex), on the `Foundations` page. Every token has a `var(--...)` web code syntax name matching what should be used in Tailwind config / CSS variables.
- **Components** (one per dedicated page, e.g. `Button`, `Product Card`, `Nav Bar`, `Footer`, `Category Card`, `Price Tag`, `Badge`, `Input Field`, `Filter Chip`, `Quantity Stepper`, `Cart Item Row`, `Color Swatch`, `Topper Card`): each documented with usage notes and, where relevant, known interaction states (hover, selected, disabled).
- **Page mockups** (full assembled pages, not just components): `Home`, `Shop`, `Cake Detail`, `Cart` — each includes Nav + Footer + real (or clearly placeholder) content, composed from the components above as actual Figma component instances, not redrawn copies.
- **Cake Detail page** has two example variants on the same page: the default Normal Cake customization flow, and a second frame ("Cake Detail Page — Fake Cake Variant") showing the Fake Cake flow. A yellow/red annotation note on that page explains the conditional logic in plain language for implementation reference.
- Category and product photography throughout is placeholder (dashed/tinted rectangles) pending real photos from the owner — do not treat placeholder colors as final brand colors for images.

## Roles

- **Guest** — no account, can browse and order, gets a UUID-linked order visible only to admin
- **Customer** (optional account) — same as guest plus saved addresses/phone, order history tab
- **Admin** (2-3 accounts) — full access: catalog, orders, promo codes, delivery config, expenses, analytics, role/user management. Admins can also manually register orders that were placed **off-platform** (phone, Instagram DM, in-person) so business analytics reflect the whole business, not just website orders — see "Manual/offline order entry" below.
- **Accountant** (1 account) — orders + business analytics + expenses only, no catalog/category control. Read-only access to catalog tables (cakes, categories, sizes, tiers, flavors, colors, shapes, toppers and their join tables) so analytics can resolve order line items to human-readable names instead of bare IDs — unfiltered by `active`, so a since-disabled item still resolves for historical orders. No catalog write access.

All role-gated access enforced via Supabase Row-Level Security, not just UI hiding.

## Core entities (implemented in Phase 2 — see `supabase/migrations/`)

- `categories` — **birthday, wedding, graduation, bento, custom, candy corner** (+ Candy Corner subcategories: **cupcakes, pops, popsicles, dessert cups** — 4 subcategories, not 3; dessert cups was added after initial Phase 2 implementation and needs a follow-up migration/seed update). Admin manages fully: create/edit/delete/reorder.
  - **"Fake Cakes" is no longer a category.** It was removed as a top-level category and reworked as an order-item-level attribute — see "Fake Cake ordering" below. Any `fake` row in the `categories` table from the original Phase 2 seed needs to be removed or deactivated in a follow-up migration, and any FK references to it reassigned.
- `cakes` — belongs to category, bilingual name/description, images (Cloudinary), one primary image
- `sizes` — per category; normal cakes sized by serving count, candy corner items by quantity. Cupcakes uniquely start at 6, then all four Candy Corner subcategories (cupcakes, pops, popsicles, dessert cups) proceed in 12-unit steps (pops/popsicles/dessert cups start at 12); max up to 996 (the largest multiple of 12 not exceeding 1000)
- `flavors`, `colors`, `toppers` (custom cakes only, some toppers have color variants) — admin managed, can be disabled temporarily
- `orders` — status: Pending → Confirmed / Cancelled → Completed / Cancelled; guest (UUID + name) or linked to customer account; delivery or pickup; delivery/pickup date checked against `delivery_calendar_blocks`. `customer_id` is `on delete set null` — deleting a customer account never blocks on order history and never cascades it away; the order just reverts to guest-shaped (customer_id null), same as it would look if placed without an account.
  - **New field needed**: `source` (enum: `website`, `phone`, `instagram`, `in_person`, or similar) so manually-entered offline/Instagram orders are distinguishable from real website orders in reporting, while still being included in all revenue/volume/AOV analytics by default. Defaults to `website` for anything created through the customer-facing flow.
- `order_items` — cake + all chosen customization. For a **Normal** cake: size, color, shape, flavor(s), 50/50 flag, text on cake, text on board, topper, additional notes, price starts as a base estimate and is finalized by admin. For a **Fake** cake, see "Fake Cake ordering" below — several of these fields don't apply and new ones are needed.
- `promo_codes` — code, fixed/percentage discount, min order, expiry date, total redemption cap, unlimited-per-customer use while active
- `promo_code_redemptions` — tracks usage against the cap
- `delivery_areas` — area name + delivery price, admin managed
- `delivery_calendar_blocks` — dates admin has closed for both delivery and pickup
- `expenses` — amount, date, category (admin-managed categories), free entry, backdatable
- `expense_categories`
- `audit_log` — who changed what, when, on every admin/accountant mutation
- `newsletter_subscribers` — phone numbers that opted in to WhatsApp campaign updates

## Fake Cake ordering

Previously "Fake Cakes" was planned as its own top-level category. That's been reworked: **Fake Cake is now a per-order-item cake type toggle**, not a category.

- **Where it appears**: on the Cake Detail / customization page, a "Cake Type" selector (Normal Cake / Fake Cake) shows at the very top, above size selection — for every category **except Bento and Candy Corner** (those two stay real-cake-only; a display-only fake bento or fake candy-corner item isn't a real use case for this business).
- **Two ways to reach a Fake Cake**: (1) built from scratch via the Custom Cakes category, or (2) picked as a fake/display version of an existing listed design in another category (e.g. browsing Birthday Cakes, then choosing a specific cake and marking it Fake instead of ordering it real).
- **When Fake Cake is selected, the customization fields change entirely** — no serving-size, no tiers, no flavor, no 50/50 split (a display cake isn't edible, so flavor is meaningless):
  - **Size in centimeters** (free text/number field, not the servings-based size picker used for real cakes)
  - **Icing color** (same Color Swatch picker as real cakes)
  - **Shape** — restricted to **Rectangle and Circle only** (real cakes offer a broader shape set including Round/Square/Heart/etc. — fake cakes deliberately don't)
  - **Text on cake**, **text on board** (same as real cakes)
  - **Additional notes** (same as real cakes)
  - **Reference image** (optional upload — a photo of what the display cake should look like)
  - **Toppers**: **only shown when the fake cake was built via the Custom Cakes category.** If it's a fake/display version of an existing design from another category, no topper section appears at all.
- **Schema implications** (needs a Phase 2 follow-up migration, not yet built):
  - `order_items` needs new columns: `is_fake` (boolean, default false), `fake_size_cm` (text or numeric — confirm format with the owner), `fake_shape` (constrained to rectangle/circle — either a check constraint, a small dedicated enum, or a filtered join against an existing shapes table with a `fake_eligible` flag; pick whichever fits the current `shapes` table design), `reference_image_url` (text, nullable, Cloudinary URL).
  - Existing `shape_id` / flavor / tier / size columns on `order_items` should be nullable or conditionally required depending on `is_fake`, enforced in application logic (and ideally a check constraint) rather than assumed always-present.
  - Application-level validation: `is_fake = true` must be rejected for `bento` and `candy_corner` categories.

## Tiers

Birthday, Wedding, Graduation, and Custom cakes can have multiple tiers at larger sizes: no tier choice below the 24>30 size, tiers {2,3} available at 24>30, tiers {2,3,4} available at 34>40 and every larger size. Bento never has tiers. Candy Corner never has tiers. **Fake Cake items never have tiers**, regardless of category — tiers are a real-cake-only concept.

## Candy Corner size input (Phase 3 note)

Cupcakes/Pops/Popsicles/**Dessert Cups** sizes are discrete quantity rows (cupcakes: 6, then 12-step increments to 996; pops/popsicles/dessert cups: 12-step increments to 996), not a free-typed number. The storefront should let the customer type any number and snap it to the nearest valid size, telling them which two sizes bracket their input (e.g. typing 9 offers "6 or 12").

## Business analytics (owner-facing)

Revenue (from completed orders' final price) by day/week/month/year and custom date range, order volume, average order value, most-ordered cakes/flavors/sizes over a period, delivery area breakdown, promo code usage, cancelled order list, expenses by category, net profit (revenue − expenses) — with Excel export on all of the above.

**All of the above must include manually-entered offline/Instagram orders alongside real website orders by default** (see `orders.source` above), since the owner needs whole-business numbers, not just the website's slice of it. Reports may optionally allow filtering by source later, but the default view is combined.

## Manual/offline order entry (future phase — Admin)

Admins need a way to register orders that came in through channels other than the website (phone calls, Instagram DMs, in-person) directly into their dashboard, so those orders count toward business analytics the same way real website orders do. This is **not** a Phase 3 storefront concern — it's an admin-dashboard feature for a later phase (alongside order management), but it has schema implications now worth knowing about (`orders.source`, see above) so the orders table isn't designed in a way that assumes every order came through the customer-facing flow.

## Folder structure (Phase 1)

- `src/app/[locale]/(storefront)/...` — public site, mounted at `/`
- `src/app/[locale]/(admin)/admin/...` — admin dashboard, mounted at `/admin` (route group name doesn't affect the URL; the `admin` path segment does)
- `src/i18n/` — next-intl `routing.ts` (locales, default locale), `navigation.ts` (locale-aware `Link`/`redirect`/router), `request.ts` (message loading)
- `src/proxy.ts` — locale-detection proxy (Next.js 16 renamed the `middleware.ts` convention to `proxy.ts`; same edge-runtime mechanism)
- `messages/en.json`, `messages/ar.json` — static UI strings
- `src/components/`, `src/lib/` — shared across storefront and admin (shadcn/ui components live in `src/components/ui/`)
- `src/lib/supabase/client.ts` (browser) and `server.ts` (Server Components/Actions, via `@supabase/ssr` + `next/headers` cookies) — session-refresh logic in `src/proxy.ts` deferred until Phase 4 (auth), no auth flow exists yet
- Hosted Supabase project ref: `yddapkhhniecjnnzrolv` (region eu-central-1). Only the anon/publishable key is used client + server side; `service_role` is never used — RLS handles authorization per [Roles](#roles)

## Storefront pages (Phase 3)

Home, Shop/category browse, Cake Detail (customization flow, Normal + Fake Cake variants), Cart. **No separate Contact page** — "Contact" in the nav is an anchor link that scrolls to the footer, which contains the WhatsApp number and Instagram link. This was a deliberate simplification, not an oversight — don't build a `/contact` route.

## Development environment

- **Hosted only, no local Docker stack** — decided 2026-08-14 after a working local setup was deliberately reverted (`supabase stop`). `.env.local` points at the hosted project (`https://yddapkhhniecjnnzrolv.supabase.co`); `npm run dev` always talks to hosted. This was tried both ways — the local stack did work at one point (Docker Desktop API-version issues fixed, all 23 migrations confirmed matching) — so if Docker workflow is ever wanted back, `supabase start` + swapping `.env.local` to `http://127.0.0.1:54321` (publishable key from `supabase status`) is the known-working path, just not the current one.
- Schema changes: write the migration file in `supabase/migrations/`, then `supabase db push` straight to hosted (no local apply step, since there's no local Postgres to apply it to). `db push` derives the hosted version number from the filename, which is what keeps them in lockstep — never hand-apply SQL to hosted outside a migration file (that's exactly how the version-number drift fixed on 2026-08-14 happened, via one-off MCP `apply_migration` calls). Because there's no local DB to sanity-check against first, prefer smaller, more reviewable migrations and check `get_advisors` after pushing.
- Known gotcha if local Docker is ever revisited: the local CLI/Docker stack did not reliably replicate the baseline `anon`/`authenticated`/`service_role` table grants that hosted Supabase projects get automatically at provisioning — a fresh local stack denied even `service_role` a plain `select`. `20260814090800_baseline_table_grants.sql` states those grants explicitly (matching hosted's actual grant set: `select/insert/update/delete`, not `all`) so this doesn't block a future local restart. If it ever recurs, it's a grants problem, not an RLS problem, when it happens to `service_role`.

## Open / to be decided in later phases

- Fake cake sizes (in cm — free text vs. structured min/max) and whether any price modifier applies (owner TBD)
- Real delivery areas and prices (owner TBD)
- Real price modifiers for sizes/flavors/toppers/tiers/cakes (owner TBD, entered via Phase 5/7 admin UI — everything seeds at 0)
- Exact `orders.source` enum values and whether admins can edit/reassign source after creation (owner TBD, needed before the Phase 2 follow-up migration)
- Exact schema shape for `fake_shape` (dedicated enum vs. filtered join against `shapes`) — implementation detail to settle when writing the migration, not a product decision
- Cart persistence (`cart_items` table for logged-in users, per the locked Cart stack decision) — not yet built, scheduled for Phase 3
- Customer saved addresses — not yet built, scheduled for Phase 4 alongside account order history
- Core Phase 2 schema implemented — see `docs/superpowers/specs/2026-08-13-phase2-data-model-design.md` and `supabase/migrations/`; cart persistence and saved-address storage still pending per Phase 3/4. **Follow-up migration needed** for: Dessert Cups subcategory seed data, removal/deactivation of the `fake` category row, new `order_items` fake-cake columns, new `orders.source` column.
