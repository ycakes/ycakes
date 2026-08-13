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

## Roles

- **Guest** — no account, can browse and order, gets a UUID-linked order visible only to admin
- **Customer** (optional account) — same as guest plus saved addresses/phone, order history tab
- **Admin** (2-3 accounts) — full access: catalog, orders, promo codes, delivery config, expenses, analytics, role/user management
- **Accountant** (1 account) — orders + business analytics + expenses only, no catalog/category control

All role-gated access enforced via Supabase Row-Level Security, not just UI hiding.

## Core entities (high level — full schema TBD in Phase 2)

- `categories` (birthday, wedding, graduation, bento, custom, fake, candy corner + subcategories: cupcakes/pops/popsicles) — admin manages fully: create/edit/delete/reorder
- `cakes` — belongs to category, bilingual name/description, images (Cloudinary), one primary image
- `sizes` — per category; normal cakes sized by serving count, candy corner items by quantity (cupcakes min 6, pops/popsicles min 12 then they get increased by 12 so 6 12 24 36 etc.., max of 1000 for all three)
- `flavors`, `colors`, `toppers` (custom cakes only, some toppers have color variants) — admin managed, can be disabled temporarily
- `orders` — status: Pending → Confirmed / Cancelled → Completed / Cancelled; guest (UUID + name) or linked to customer account; delivery or pickup; delivery/pickup date checked against `delivery_calendar_blocks`
- `order_items` — cake + all chosen customization (size, color, shape, flavor(s), 50/50 flag, text on cake, text on board, topper, additional notes), price starts as a base estimate and is finalized by admin
- `promo_codes` — code, fixed/percentage discount, min order, expiry date, total redemption cap, unlimited-per-customer use while active
- `promo_code_redemptions` — tracks usage against the cap
- `delivery_areas` — area name + delivery price, admin managed
- `delivery_calendar_blocks` — dates admin has closed for both delivery and pickup
- `expenses` — amount, date, category (admin-managed categories), free entry, backdatable
- `expense_categories`
- `audit_log` — who changed what, when, on every admin/accountant mutation
- `newsletter_subscribers` — phone numbers that opted in to WhatsApp campaign updates

## Business analytics (owner-facing)

Revenue (from completed orders' final price) by day/week/month/year and custom date range, order volume, average order value, most-ordered cakes/flavors/sizes over a period, delivery area breakdown, promo code usage, cancelled order list, expenses by category, net profit (revenue − expenses) — with Excel export on all of the above.

## Folder structure (Phase 1)

- `src/app/[locale]/(storefront)/...` — public site, mounted at `/`
- `src/app/[locale]/(admin)/admin/...` — admin dashboard, mounted at `/admin` (route group name doesn't affect the URL; the `admin` path segment does)
- `src/i18n/` — next-intl `routing.ts` (locales, default locale), `navigation.ts` (locale-aware `Link`/`redirect`/router), `request.ts` (message loading)
- `src/proxy.ts` — locale-detection proxy (Next.js 16 renamed the `middleware.ts` convention to `proxy.ts`; same edge-runtime mechanism)
- `messages/en.json`, `messages/ar.json` — static UI strings
- `src/components/`, `src/lib/` — shared across storefront and admin (shadcn/ui components live in `src/components/ui/`)

## Open / to be decided in later phases

- Exact list of sizes per category (from owner)
- Exact expense categories (from owner)
- Full DB schema and migrations (Phase 2)
