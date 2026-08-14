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

## Roles

- **Guest** — no account, can browse and order, gets a UUID-linked order visible only to admin
- **Customer** (optional account) — same as guest plus saved addresses/phone, order history tab
- **Admin** (2-3 accounts) — full access: catalog, orders, promo codes, delivery config, expenses, analytics, role/user management
- **Accountant** (1 account) — orders + business analytics + expenses only, no catalog/category control. Read-only access to catalog tables (cakes, categories, sizes, tiers, flavors, colors, shapes, toppers and their join tables) so analytics can resolve order line items to human-readable names instead of bare IDs — unfiltered by `active`, so a since-disabled item still resolves for historical orders. No catalog write access.

All role-gated access enforced via Supabase Row-Level Security, not just UI hiding.

## Core entities (implemented in Phase 2 — see `supabase/migrations/`)

- `categories` (birthday, wedding, graduation, bento, custom, fake, candy corner + subcategories: cupcakes/pops/popsicles) — admin manages fully: create/edit/delete/reorder
- `cakes` — belongs to category, bilingual name/description, images (Cloudinary), one primary image
- `sizes` — per category; normal cakes sized by serving count, candy corner items by quantity. Cupcakes uniquely start at 6, then all three (cupcakes, pops, popsicles) proceed in 12-unit steps (pops/popsicles start at 12); max up to 996 (the largest multiple of 12 not exceeding 1000)
- `flavors`, `colors`, `toppers` (custom cakes only, some toppers have color variants) — admin managed, can be disabled temporarily
- `orders` — status: Pending → Confirmed / Cancelled → Completed / Cancelled; guest (UUID + name) or linked to customer account; delivery or pickup; delivery/pickup date checked against `delivery_calendar_blocks`. `customer_id` is `on delete set null` — deleting a customer account never blocks on order history and never cascades it away; the order just reverts to guest-shaped (customer_id null), same as it would look if placed without an account
- `order_items` — cake + all chosen customization (size, color, shape, flavor(s), 50/50 flag, text on cake, text on board, topper, additional notes), price starts as a base estimate and is finalized by admin
- `promo_codes` — code, fixed/percentage discount, min order, expiry date, total redemption cap, unlimited-per-customer use while active
- `promo_code_redemptions` — tracks usage against the cap
- `delivery_areas` — area name + delivery price, admin managed
- `delivery_calendar_blocks` — dates admin has closed for both delivery and pickup
- `expenses` — amount, date, category (admin-managed categories), free entry, backdatable
- `expense_categories`
- `audit_log` — who changed what, when, on every admin/accountant mutation
- `newsletter_subscribers` — phone numbers that opted in to WhatsApp campaign updates

## Tiers

Birthday, Wedding, Graduation, and Custom cakes can have multiple tiers at larger sizes: no tier choice below the 24>30 size, tiers {2,3} available at 24>30, tiers {2,3,4} available at 34>40 and every larger size. Bento never has tiers. Fake cakes can go up to 6 tiers but their sizes (in cm) and tier thresholds are still TBD from the owner. Tiers are admin-editable and connected to specific sizes (not hardcoded thresholds) via a `size_tiers` join table, so the owner can add/remove tier availability per size from the dashboard without a migration.

## Candy Corner size input (Phase 3 note)

Cupcakes/Pops/Popsicles sizes are discrete quantity rows (cupcakes: 6, then 12-step increments to 996; pops/popsicles: 12-step increments to 996), not a free-typed number. The storefront should let the customer type any number and snap it to the nearest valid size, telling them which two sizes bracket their input (e.g. typing 9 offers "6 or 12").

## Business analytics (owner-facing)

Revenue (from completed orders' final price) by day/week/month/year and custom date range, order volume, average order value, most-ordered cakes/flavors/sizes over a period, delivery area breakdown, promo code usage, cancelled order list, expenses by category, net profit (revenue − expenses) — with Excel export on all of the above.

## Folder structure (Phase 1)

- `src/app/[locale]/(storefront)/...` — public site, mounted at `/`
- `src/app/[locale]/(admin)/admin/...` — admin dashboard, mounted at `/admin` (route group name doesn't affect the URL; the `admin` path segment does)
- `src/i18n/` — next-intl `routing.ts` (locales, default locale), `navigation.ts` (locale-aware `Link`/`redirect`/router), `request.ts` (message loading)
- `src/proxy.ts` — locale-detection proxy (Next.js 16 renamed the `middleware.ts` convention to `proxy.ts`; same edge-runtime mechanism)
- `messages/en.json`, `messages/ar.json` — static UI strings
- `src/components/`, `src/lib/` — shared across storefront and admin (shadcn/ui components live in `src/components/ui/`)
- `src/lib/supabase/client.ts` (browser) and `server.ts` (Server Components/Actions, via `@supabase/ssr` + `next/headers` cookies) — session-refresh logic in `src/proxy.ts` deferred until Phase 4 (auth), no auth flow exists yet
- Hosted Supabase project ref: `yddapkhhniecjnnzrolv` (region eu-central-1). Only the anon/publishable key is used client + server side; `service_role` is never used — RLS handles authorization per [Roles](#roles)

## Local development

- Day to day, run against the **local** Supabase stack (Docker), not hosted — `.env.local` points at `http://127.0.0.1:54321`. Swap it back to the hosted URL/key only to debug something hosted-specific.
- Schema changes: write the migration file in `supabase/migrations/`, apply it locally (`supabase db reset` for a clean re-apply of everything + seed, or `supabase migration up` for just the new file), confirm it does what's intended, then `supabase db push` to apply the same file to the hosted project. `db push` is what keeps local and hosted migration history in lockstep — never hand-apply a migration to hosted only (that's exactly how the version-number drift fixed on 2026-08-14 happened).

## Open / to be decided in later phases

- Fake cake sizes (in cm) and their tier thresholds (owner TBD)
- Real delivery areas and prices (owner TBD)
- Real price modifiers for sizes/flavors/toppers/tiers/cakes (owner TBD, entered via Phase 5/7 admin UI — everything seeds at 0)
- Cart persistence (`cart_items` table for logged-in users, per the locked Cart stack decision) — not yet built, scheduled for Phase 3
- Customer saved addresses — not yet built, scheduled for Phase 4 alongside account order history
- Core Phase 2 schema implemented — see `docs/superpowers/specs/2026-08-13-phase2-data-model-design.md` and `supabase/migrations/`; cart persistence and saved-address storage still pending per Phase 3/4
