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

- `categories` — **birthday, wedding, graduation, bento, custom, candy corner** (+ Candy Corner subcategories: **cupcakes, pops, popsicles, dessert cups** — 4 subcategories, not 3). Admin manages fully: create/edit/delete/reorder.
  - **"Fake Cakes" is no longer a category.** It was removed as a top-level category and reworked as an order-item-level attribute — see "Fake Cake ordering" below. The original Phase 2 seed's `fake` row was deleted in the Phase 2 follow-up migration (`20260814100100_remove_fake_category.sql`).
- `cakes` — belongs to category, bilingual name/description, images (Cloudinary), one primary image
- `sizes` — per category; normal cakes sized by serving count, candy corner items by quantity. Cupcakes uniquely start at 6, then all four Candy Corner subcategories (cupcakes, pops, popsicles, dessert cups) proceed in 12-unit steps (pops/popsicles/dessert cups start at 12); max up to 996 (the largest multiple of 12 not exceeding 1000)
- `flavors`, `colors`, `toppers` (custom cakes only, some toppers have color variants) — admin managed, can be disabled temporarily
  - `category_flavors` (`category_id`, `flavor_id`, `20260815110100_category_flavors.sql`) opt-in restricts which flavors are selectable per category — **no rows for a category means unrestricted** (all flavors, today's behavior for Birthday/Wedding/Graduation/Bento/Custom), rows present means only those. Seeded: Cupcakes/Pops/Popsicles → Vanilla or Chocolate only (single choice — Candy Corner never has a 50/50 split regardless, see Tiers below); Dessert Cups → its own 7-flavor list (Oreo, Chocolate, Lotus, Ferrero Rocher, Tiramisu, Red Velvet, Cheesecake), four of which (Lotus/Tiramisu/Red Velvet/Cheesecake) are new `flavors` rows added in the same migration. Those four aren't excluded from other categories' unrestricted lists — the restriction is opt-in per category, not a global exclusivity rule.
- `orders` — status: Pending → Confirmed / Cancelled → Completed / Cancelled; guest (UUID + name) or linked to customer account; delivery or pickup; delivery/pickup date checked against `delivery_calendar_blocks`. `customer_id` is `on delete set null` — deleting a customer account never blocks on order history and never cascades it away; the order just reverts to guest-shaped (customer_id null), same as it would look if placed without an account.
  - `source` (`website`/`phone`/`instagram`/`in_person`, default `website`) distinguishes manually-entered offline/Instagram orders from real website orders in reporting, while still being included in all revenue/volume/AOV analytics by default. The `normalize_order_on_insert` trigger forces `source = 'website'` on every insert today, since the only insert path is the customer-facing flow — Phase 6 manual entry will need its own privileged insert path that can set the other values.
- `order_items` — cake + all chosen customization. For a **Normal** cake: size, color(s), shape, flavor(s), 50/50 flag, text on cake, text on board, topper, additional notes, price starts as a base estimate and is finalized by admin. For a **Fake** cake, see "Fake Cake ordering" below — several of these fields don't apply and different ones are used instead; `size_id`/`shape_id` are nullable for this reason, with a `order_items_fake_cake_fields` check constraint enforcing the two field sets stay mutually exclusive.
  - Icing color is **multi-select** (owner request, Phase 3): `order_items.color_id` was dropped in favor of `order_item_colors` (`order_item_id`, `color_id`, `sort_order`), mirroring the existing `order_item_flavors` join-table pattern — any number of colors per item, no cap. RLS/audit-log wiring mirrors `order_item_flavors` exactly (`20260815100000_order_item_colors.sql`).
  - When more than one color is picked, the storefront shows a dedicated `color_arrangement_notes` text field (nullable at the DB level, `order_items`, `20260815110000_color_arrangement_notes.sql`) — kept separate from the general `notes` field on purpose, not mixed into it. **Required at the UI level** whenever 2+ colors are selected (blocks add-to-cart like any other required field), even though the column itself is nullable — nullable because it's meaningless/absent for the single-color case, not because it's optional when multi-color. The field/textbox itself stays mounted (not unmounted) when toggling back down to 1 color so typed text isn't lost by an accidental deselect, but its value is only carried into the `CartItem`/order submission when 2+ colors are still selected at add-to-cart time.
  - 50/50 flavor split is only offered when the selected size has tiers available (`size_tiers` non-empty for that size) — this already naturally excludes Bento and every Candy Corner subcategory (neither ever has `size_tiers` rows) without needing a separate category flag, and for Birthday/Wedding/Graduation/Custom it lines up exactly with the owner's "24>30 or bigger" rule since that's the same threshold tiers unlock at.
  - `reference_image_url` is available for **every** order item, not just Fake Cake — the schema never actually restricted it to `is_fake = true` (only `order_items_fake_cake_fields` gates `size_id`/`shape_id`/`fake_size_cm`/`fake_shape_id`), so Phase 3 UI now shows the upload field unconditionally. Currently client-side-only (`URL.createObjectURL`, no persisted upload) since Cloudinary isn't wired into the storefront yet — see the Phase 3 note below.
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
  - **Icing color** (same Color Swatch picker as real cakes — multi-select for both, see `order_item_colors` in Core entities above)
  - **Shape** — restricted to **Rectangle and Circle only** (real cakes offer a broader shape set including Round/Square/Heart/etc. — fake cakes deliberately don't)
  - **Text on cake**, **text on board** (same as real cakes)
  - **Additional notes** (same as real cakes)
  - **Reference image** (optional upload — a photo of what the display cake should look like; also available for real cakes in Phase 3, not fake-exclusive — see Core entities above)
  - **Toppers**: **only shown when the fake cake was built via the Custom Cakes category.** If it's a fake/display version of an existing design from another category, no topper section appears at all.
- **Schema (implemented, `20260814100200_order_items_fake_cake.sql`)**:
  - `order_items` columns: `is_fake` (boolean, default false), `fake_size_cm` (numeric), `fake_shape_id` (uuid, FK to `shapes(id)`), `reference_image_url` (text, nullable — not Cloudinary-specific at the schema level; Phase 3 currently populates it client-side only, see Phase 3 implementation notes below).
  - `fake_shape_id` restriction implemented via a `shapes.fake_eligible` boolean flag (true for Rectangle/Circle only) rather than a dedicated enum — reuses the existing `shapes` table as the single source of truth. A trigger (`order_items_validate_fake_shape`) enforces `fake_shape_id` points to a `fake_eligible` row, since that can't be expressed as a plain single-table check constraint.
  - `size_id` and `shape_id` on `order_items` are now nullable. The `order_items_fake_cake_fields` check constraint enforces the real-cake vs. Fake Cake field sets are mutually exclusive: real cakes require `size_id`/`shape_id` and forbid the fake fields; Fake Cake items require `fake_size_cm`/`fake_shape_id` and forbid `size_id`/`shape_id`/`tier_id`, with `is_fifty_fifty` forced false. Flavor selection (`order_item_flavors`, a separate table) isn't DB-constrained by `is_fake` — that's left to application logic when Phase 3/4 code is written.
  - `is_fake = true` is rejected at the DB level for Bento and Candy Corner (including its subcategories) items via a trigger (`order_items_validate_fake_category`), since the check spans `order_items` → `cakes` → `categories` and can't be a plain check constraint either.

## Tiers

Birthday, Wedding, Graduation, and Custom cakes can have multiple tiers at larger sizes: no tier choice below the 24>30 size, tiers {**1**,2,3} available at 24>30, tiers {**1**,2,3,4} available at 34>40 and every larger size. Bento never has tiers. Candy Corner never has tiers. **Fake Cake items never have tiers**, regardless of category — tiers are a real-cake-only concept.

- **`tier_count = 1`** (owner request, `20260815110200_single_tier_option.sql`) represents "just a normal, non-tiered cake" as an explicit, normally-preselected option alongside 2/3/4 — rather than requiring the customer to add extra tiers just because the size happens to qualify. The `tiers.tier_count` check constraint was widened from `between 2 and 6` to `between 1 and 6`; the storefront auto-selects the 1-tier option whenever a qualifying size is picked, leaving 2/3/(4) as alternatives.

## Candy Corner size input (Phase 3 note)

Cupcakes/Pops/Popsicles/**Dessert Cups** sizes are discrete quantity rows (cupcakes: 6, then 12-step increments to 996; pops/popsicles/dessert cups: 12-step increments to 996), not a free-typed number. Implemented as `SizeQuantityInput` (`src/components/storefront/SizeQuantityInput.tsx`): typing an in-between number is treated as invalid and blocks add-to-cart (shows which two valid sizes bracket it, e.g. typing 9 shows "Must be 6 or 12"; typing below the smallest size shows "Minimum is 6" instead). Custom +/− stepper buttons move between valid sizes (6→12→24…), not by 1 — native number-input arrows can't express a variable step.

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

## Storefront pages (Phase 3 — all built)

Home (`/`), Shop/category browse (`/shop`, `/shop/[category]`), Cake Detail (`/cakes/[id]`, customization flow with Normal + Fake Cake variants), Cart (`/cart`). **No separate Contact page** — "Contact" in the nav is an anchor link that scrolls to the footer, which contains the WhatsApp number and Instagram link. This was a deliberate simplification, not an oversight — don't build a `/contact` route.

## Development environment

- **Hosted only, no local Docker stack** — decided 2026-08-14 after a working local setup was deliberately reverted (`supabase stop`). `.env.local` points at the hosted project (`https://yddapkhhniecjnnzrolv.supabase.co`); `npm run dev` always talks to hosted. This was tried both ways — the local stack did work at one point (Docker Desktop API-version issues fixed, all 23 migrations confirmed matching) — so if Docker workflow is ever wanted back, `supabase start` + swapping `.env.local` to `http://127.0.0.1:54321` (publishable key from `supabase status`) is the known-working path, just not the current one.
- Schema changes: write the migration file in `supabase/migrations/`, then `supabase db push` straight to hosted (no local apply step, since there's no local Postgres to apply it to). `db push` derives the hosted version number from the filename, which is what keeps them in lockstep — never hand-apply SQL to hosted outside a migration file (that's exactly how the version-number drift fixed on 2026-08-14 happened, via one-off MCP `apply_migration` calls). Because there's no local DB to sanity-check against first, prefer smaller, more reviewable migrations and check `get_advisors` after pushing.
- Known gotcha if local Docker is ever revisited: the local CLI/Docker stack did not reliably replicate the baseline `anon`/`authenticated`/`service_role` table grants that hosted Supabase projects get automatically at provisioning — a fresh local stack denied even `service_role` a plain `select`. `20260814090800_baseline_table_grants.sql` states those grants explicitly (matching hosted's actual grant set: `select/insert/update/delete`, not `all`) so this doesn't block a future local restart. If it ever recurs, it's a grants problem, not an RLS problem, when it happens to `service_role`.

## Phase 3 implementation notes

- **Cart is Zustand-only for Phase 3** (`src/store/cart.ts`, localStorage-persisted via `zustand/middleware persist`). The `cart_items` DB table (for logged-in users, per the locked Cart stack decision) is a Phase 4 concern — no account system exists yet to sync it against. `CartItem` (`src/types/cart.ts`) is shaped to map 1:1 onto `order_items`/`order_item_flavors`/`order_item_colors` so Phase 4 checkout can submit it close to as-is.
  - The store also carries **fulfillment state** — `fulfillmentMethod` (`'pickup' | 'delivery'`), `deliveryAreaId`, `fulfillmentDate` (ISO) — as a confirmed, permanent part of the cart data model (owner decision, not local/undecided): it's set on the Cart page and persists across reloads/navigation via the same `persist` middleware as `items`. Setting `fulfillmentMethod` clears `deliveryAreaId` (switching to pickup, or between delivery attempts, shouldn't carry a stale area over).
  - `CHECKOUT_ENABLED` (currently `false`) gates the "Proceed to Checkout" button independently of whether the fulfillment selection is complete — `useFulfillmentComplete()` (date always required; delivery additionally requires an area; pickup needs no area) is fully implemented and correct today even though the button stays unconditionally disabled until `CHECKOUT_ENABLED` flips to `true` once Phase 4 checkout exists to submit to.
  - The persisted store carries a `version` + `migrate` (currently: any version older than the current one resets the incompatible parts to their defaults — full reset below v1, fulfillment-fields-only reset from v1→v2). There's no real order data to preserve pre-launch, so a shape change is treated as something to reset cleanly rather than write real migration logic for — bump `version` again next time the shape changes.
- **Add-to-cart validation UX**: the button is always enabled (not disabled-until-valid) — clicking with missing required fields scrolls to the first incomplete section and shows an inline red error there, rather than silently doing nothing. Applied across `CakeCustomizer`'s `Section`/`InputField` components via `id`/`error` props.
- **Placeholder trending-cake data**: `20260814110000_phase3_placeholder_cakes.sql` seeds 4 cakes per top-level category (24 total; Candy Corner's 4 are spread one per subcategory) with `base_price = 0` and `primary_image_url` reusing that category's placeholder photo. Swap for real cakes/photos once the owner provides them — this is data, not schema, so no migration is needed to replace it, just admin CRUD once Phase 5 exists (or direct SQL/MCP in the meantime).
- **Category photos**: owner-supplied, one per top-level category, at `public/images/categories/{slug}.jpeg` (note: `.jpeg`, not `.jpg`). Referenced directly as local paths in both the DB (`cakes.primary_image_url`) and `CategoryCard`, not routed through Cloudinary — Cloudinary integration for the storefront hasn't been wired up yet (Phase 5 admin CRUD is where cake image upload actually happens). Revisit whether local `public/images` placeholders should move to Cloudinary once that's built.
- Design tokens from Figma ("YCakes — Design System" file) are now in `src/app/globals.css` as CSS variables under `@theme inline` (`--color-brand-primary`, `--color-bg-page`, etc., generating Tailwind utilities like `bg-brand-primary`) and fonts (Cairo for body/UI incl. Arabic subset, Baloo 2 for headings, Caveat for the script accent) are loaded in `src/app/[locale]/layout.tsx`. `Button` (`src/components/ui/button.tsx`) gained `brand-primary`/`brand-ghost` variants and an `xl` size matching Figma's pill-shaped CTAs — built with Base UI's `render` prop pattern (not `asChild`), e.g. `<Button render={<Link href="/shop" />}>`.
- **Figma MCP note for future sessions**: the desktop-app bridge's `get_metadata` (no nodeId) and `get_design_context` calls require an active *selection* in the Figma desktop app at call time, not just the file/page being open — `get_metadata`/`get_screenshot` with an explicit nodeId work without a live selection, but `get_design_context` and `get_variable_defs` don't. Ask the user to click the exact frame in Figma desktop immediately before each `get_design_context` call.
- **Cart page** (`/cart`) is a server component (`page.tsx`, fetches `delivery_areas` + `delivery_calendar_blocks`) wrapping a client component (`CartPageContent`, reads the Zustand cart). The checkout button is disabled with a "coming soon" caption rather than linking anywhere, since Phase 4 doesn't exist yet. Cart item names/attribute chips are frozen as plain strings in whatever locale was active when added (not re-fetched/re-translated), so switching language after adding an item won't retranslate the cart — acceptable for a client-only cart, worth revisiting once Phase 4 persists carts server-side.
- **Pickup/Delivery + fulfillment date live on the Cart page, store-persisted** (confirmed owner decision, ahead of the rest of Phase 4 checkout — see the fulfillment-state bullet above): pickup is a single fixed location (hardcoded "New Cairo" label, not DB-driven — there's only one physical location); delivery pulls area chips from `delivery_areas` (seeded: Cairo, Giza, Helwan, all at price 0/TBD, `20260815120000_seed_delivery_areas.sql`). Date selection is a custom month-grid calendar (`DatePicker.tsx`, no calendar library dependency) disabling anything before tomorrow (no same-day reservation) and any date in `delivery_calendar_blocks`. When Phase 4 checkout is designed, it can build directly on this existing persisted state rather than needing to invent it — the open question is only whether Checkout keeps reading/writing the same cart-store fields or the picker UI itself moves to a dedicated checkout page.

## Open / to be decided in later phases

- Fake cake sizes: format is numeric cm (`fake_size_cm`, decided in the Phase 2 follow-up migration); whether any price modifier applies is still owner TBD
- Real delivery prices (owner TBD, seeds at 0) — the areas themselves are now named: Cairo, Giza, Helwan (`20260815120000_seed_delivery_areas.sql`)
- Real price modifiers for sizes/flavors/toppers/tiers/cakes (owner TBD, entered via Phase 5/7 admin UI — everything seeds at 0)
- Whether admins can edit/reassign `orders.source` after creation, once Phase 6 manual entry exists (owner TBD) — the enum values themselves (`website`/`phone`/`instagram`/`in_person`) are locked in
- Cart persistence (`cart_items` table for logged-in users, per the locked Cart stack decision) — not yet built, scheduled for Phase 3
- Customer saved addresses — not yet built, scheduled for Phase 4 alongside account order history
- Core Phase 2 schema implemented — see `docs/superpowers/specs/2026-08-13-phase2-data-model-design.md` and `supabase/migrations/`; cart persistence and saved-address storage still pending per Phase 3/4. Phase 2 follow-up migration (Dessert Cups, `fake` category removal, `order_items` fake-cake columns, `orders.source`) is done — see `20260814100000`–`20260814100400`.
