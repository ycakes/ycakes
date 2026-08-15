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

## Auth (Phase 4)

- `profiles.full_name` was split into `first_name`/`last_name` (`20260815140000_profiles_first_last_name.sql`) — every Phase 4 mockup (Register, Checkout, Profile) treats them as separate fields, so a combined string split on whitespace later would be fragile. `handle_new_user()` now reads `first_name`/`last_name` out of `auth.users.raw_user_meta_data`, populated via `supabase.auth.signUp({ options: { data: { first_name, last_name } } })`.
- **Email confirmation flow**: signUp() with confirmation required returns no active session until the user clicks the emailed confirmation link — so Register's optional Address/Phone entries can't be inserted at signup time (RLS requires `auth.uid() = customer_id`, and there's no `auth.uid()` yet). Confirmed approach: any addresses/phones entered during Register are held client-side (sessionStorage) until the confirmation link completes and lands the user in an authenticated session, at which point they're submitted then. A `/auth/confirm` route handler exchanges the emailed code for a session.
- Saved-address/phone data doesn't survive a different device/browser confirming the email than the one that filled out Register (sessionStorage is per-browser) — accepted limitation, not solved this phase. Worth a "your addresses didn't come through, add them from Profile" fallback message if the sessionStorage read comes back empty post-confirmation.
- **Implemented**: `/register`, `/login`, `/register/complete` (client components, `src/app/[locale]/(storefront)/...`), `/auth/confirm` (Route Handler, `src/app/auth/confirm/route.ts` — deliberately outside `[locale]` since it's a link target from an email, not app navigation; `proxy.ts`'s matcher excludes `/auth` so next-intl doesn't try to locale-prefix it). `src/lib/supabase/client.ts`/`server.ts` (already existed) are used as-is — browser client for signUp/signInWithPassword/inserts, server client for `verifyOtp`.
- **Resend integration**: `supabase/functions/send-email/index.ts` is a Supabase Auth "Send Email" hook (Standard Webhooks-signature verified) — Supabase calls it instead of sending its own email, and it sends the real confirmation email via Resend (bilingual, driven by `user_metadata.locale` set at signUp). Confirmation link points at `/auth/confirm`. **Deployed and wired** (function deployed, `RESEND_API_KEY`/`SEND_EMAIL_HOOK_SECRET` secrets set, hook enabled in the dashboard, `enable_confirmations` on).
- **Known limitation, blocked on Phase 1's still-open "Connect custom domain" task**: the `from:` address is Resend's shared sandbox sender (`onboarding@resend.dev`), which can only deliver to the email address on the Resend account itself (`ycakesnet@gmail.com`) — any other recipient is silently rejected by Resend, surfacing as a generic signUp() failure. Real customers can't receive confirmation emails until a domain is purchased, connected, and verified in Resend (Domains → Add Domain → add the SPF/DKIM records), at which point `send-email/index.ts`'s `from:` should be swapped to an address on that domain.
- **Temporary: "Enable email confirmations" is OFF** (owner decision, dashboard-only toggle under Authentication) until the domain/Resend verification above is sorted — `signUp()` returns an active session immediately with no email step. Register's code handles both states without needing further changes: it checks whether `signUp()` returned a session (`data.session`) and, if so, syncs any addresses/phones immediately and redirects home instead of showing the "check your email" screen; if not (confirmations back on later), it falls back to the sessionStorage + `/register/complete` flow described above.
- Password fields enforce a client-side 8-character minimum (`Register`'s `MIN_PASSWORD_LENGTH`) ahead of Supabase's own `minimum_password_length` check.
- `ToggleChip` (`src/components/storefront/ToggleChip.tsx`) is a new stateful button-based chip for the Call/WhatsApp/Both contact-method picker — the existing `FilterChip` is `Link`/URL-driven (built for Shop's category filters) and isn't usable inside a form, so this is a separate component rather than overloading that one.
- `InputField` (`src/components/storefront/InputField.tsx`) gained a `type` prop (`text`/`email`/`tel`/`password`) and, for `password`, a show/hide eye-icon toggle (hidden by default) — used by Login/Register and will be reused by Checkout's inline Register tab.

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

Home (`/`), Shop/category browse (`/shop`, `/shop/[category]`), Cake Detail (`/cakes/[id]`, customization flow with Normal + Fake Cake variants), Cart (`/cart`). **No separate Contact page** — don't build a `/contact` route. "Contact" in the nav and footer no longer scrolls to the footer (superseded, Phase 4 follow-up): it opens `ContactModal` (`src/components/layout/ContactModal.tsx`, Base UI `Dialog`) — phone number with Call (`tel:`) and WhatsApp buttons, plus an Instagram link, all opening in a new tab except Call. Footer's separate always-visible "Get in Touch" section (WhatsApp + Instagram inline) is unchanged, just now reads from the same shared constants.
- **Contact info is centralized in `src/lib/contact.ts`** (`CONTACT_PHONE_DISPLAY`/`CONTACT_PHONE_TEL`/`CONTACT_WHATSAPP_URL`/`CONTACT_INSTAGRAM_URL`) — the phone number is still a placeholder (`+20 100 123 4567`) pending the owner providing the real one; swap it in this one file once known, everything else (modal, Footer) reads from it.

## Nav Bar (Phase 3 follow-up, confirmed post-Figma-review)

- The four nav links (Home/Shop/Custom Cakes/Contact) are now **centered** on the page — previously `justify-between`-style distribution skewed them off-center toward the wider action-icon side (language toggle/cart/etc.). Fixed as part of the Phase 4 design session's Nav Bar component update.
- A **Profile icon** was added to the nav actions area, positioned between the language toggle and the cart icon, styled to match the cart/language-toggle (bordered circle, `bg-bg-surface`, shadow).
- **Session-aware** (`src/hooks/useSession.ts`, a thin wrapper over `supabase.auth.getSession()` + `onAuthStateChange`, shared by NavBar/Login/Register): logged out → plain link to `/login`. Logged in → a Base UI `Menu` dropdown (`@base-ui/react/menu`, already a dependency via `Button`) with **Profile** (links to `/profile`, not built yet) and **Log Out** (calls `supabase.auth.signOut()`, redirects home). No separate dropdown library was added — Base UI's headless `Menu` primitive covers it.
- Login and Register both redirect to `/` if a session already exists (checked via the same `useSession()` hook) — a logged-in user has no reason to see either page.

## Phase 4 — Checkout & accounts (Figma design confirmed)

Design status: Figma design complete for Checkout, Order Confirmation, Register, Login, and a new Profile page (all added in this session), plus the updated Nav Bar component covered above. File: "YCakes — Design System", key `UR2u2vVxduNHFheGewn9CH`, pages `Checkout`, `Order Confirmation`, `Register`, `Login`, `Profile`.

### Checkout page (`/checkout`)

- **Layout**: main column (auth tabs, contact details) + sidebar (right column) with **Fulfillment Details recap above Order Summary** — fulfillment recap is no longer a main-column section, it moved to the sidebar.
  - Fulfillment recap's "Edit" action opens an **inline modal** (Pickup/Delivery toggle, delivery area chips, date picker) rather than navigating back to `/cart`. The modal reuses the existing `DatePicker.tsx` and delivery-area chip logic already built for the Cart page (`src/store/cart.ts`, `delivery_areas` table) — not a reimplementation.
- **Auth**: a 3-way tab switcher (**Guest / Log In / Register**) sits inline at the top of Checkout, replacing the earlier simpler Guest/Create-Account toggle.
  - Switching tabs must never clear anything already typed in Contact Details below — Contact Details state is independent of which auth tab is active.
  - On successful inline login/register (without navigating away from Checkout, cart/session state preserved throughout), any saved addresses/phone numbers on the account appear as selectable chips that auto-fill Contact Details.
- **Contact Details** (expanded from the earlier simpler version):
  - Row: First Name + Last Name + Company (optional)
  - Address
  - Apartment/Suite (optional)
  - Phone Number 1 and Phone Number 2 (optional), each paired with a **contact-method preference** (Call / WhatsApp / Both)
  - Email (optional)
  - **"Save Address" button** (shown only when logged in) saves name/address/phone to the account in one action — replaces the earlier per-field "save" checkbox idea.
- **Order Summary**: Promo Code is now part of Order Summary, not a separate section — input + Apply button + applied-state feedback live directly under Subtotal.

**Implemented** (`src/app/[locale]/(storefront)/checkout/page.tsx` → `CheckoutPageContent`): the design above, plus real (not stubbed) Promo Code validation and Save Address writes.

- `EditFulfillmentModal` + `FulfillmentFields` (`src/components/storefront/`): the fulfillment picker was extracted out of `CartPageContent` into `FulfillmentFields`, a plain controlled component (locale/deliveryAreas/blockedDates + value/onChange props), used directly by Cart (unchanged behavior) and wrapped in a Base UI `Dialog` by `EditFulfillmentModal` for Checkout. Both read/write `useCartStore` directly — no staged/local copy — matching the confirmed decision that Cart and Checkout must never disagree on fulfillment state. `Cart`'s "Proceed to Checkout" now navigates to `/checkout` (`CHECKOUT_ENABLED` flipped `true` in `src/store/cart.ts`).
- `CheckoutAuthCard` (`src/components/storefront/`): when `useSession()` has no session, renders the Guest/Log In/Register tabs (Contact Details lives in the parent and is never touched by tab switching, satisfying the confirmed decision). When a session exists, the tabs disappear entirely in favor of a "Logged in as {email}" line plus "Use this" chips for every saved address/phone (fetched client-side from `customer_addresses`/`customer_phones`, RLS-scoped to the caller automatically). Login/Register here call the same `supabase.auth` methods as the standalone `/login`/`/register` pages; Register handles both the confirmations-on and confirmations-off cases the same way `/register` does.
  - **Deviation from the Figma annotation**: the inline Register tab includes First/Last Name (the annotation described only Email/Password/Confirm Password) — Contact Details right below already asks for a name, but that's the *delivery contact*, not necessarily the account holder (e.g. ordering for someone else), so the two were kept independent rather than having Register silently borrow from Contact Details.
- **Promo Code**: real lookup against `promo_codes` (`active = true`, unexpired, `min_order_amount` checked against the live cart subtotal), not a mock. No promo codes are seeded yet, so there's nothing to test against until the owner or a migration adds one.
- **Save Address**: writes one `customer_addresses` row (using the translated word "Address" as the label — Checkout's Contact Details has no dedicated label field the way Register/Profile do) and, if Phone Number 1 is filled, one `customer_phones` row. Surfaces the 5-row cap trigger's error as a plain "you've reached the limit" message rather than a raw Postgres error.
- **Scope boundary — deliberately not built yet**: actual order submission (`orders`/`order_items` inserts for both guest and account paths) is a separate TASKS.md item. "Place Order" is present but disabled with a caption, same pattern Cart's own checkout button used pre-Phase-4. Contact Details has no field-level validation yet — nothing to validate against until submission exists; lands together with that task rather than being built and then rebuilt.

### Order Confirmation page

- Success block: check icon, "Order Placed!", a greeting line ("Thanks, {first name} — we've got your order."), and the order number (format `YC-YYYYMMDD-####`, e.g. `YC-20260822-0842`).
- "What Happens Next" card: explains the team will follow up over WhatsApp/phone to confirm final price, plus a "Message Us on WhatsApp" button — **confirmed via annotation**: this is a plain `wa.me` deep link prefilled with **the order number only** (no customer name or item summary — owner looks those up in the admin dashboard), not any WhatsApp API integration (matches the locked stack decision).
- "Order Details" card: line items (thumbnail, name, an attribute summary string like `24>30 • 1 Tier • Vanilla, Chocolate • Black, Red • Heart • Qty 1`, price), a FULFILLMENT section (method + area, date), a CONTACT & DELIVERY ADDRESS section (name, phone + contact-method label, address), and the total with the same WhatsApp-confirmation-pricing disclaimer used elsewhere.
- "Continue Shopping" CTA at the bottom, links back to the storefront.

**Implemented** (`src/app/[locale]/(storefront)/order-confirmation/page.tsx`) — reads a one-time `OrderConfirmationSnapshot` from `sessionStorage` (`src/lib/orders/lastOrder.ts`), never the DB (see "Order creation" below for why). Redirects home if visited directly with no snapshot present (e.g. a bookmark, or the tab was closed and reopened). The check-circle icon uses lucide's `CircleCheck`, not a hand-authored SVG — the Figma asset URL was a temporary export link, not something to hotlink or recreate by hand.

## Order creation (Phase 4)

- **`create_order` Postgres RPC** (`20260815150100_create_order_rpc.sql`, `security definer`, called from `src/lib/orders/createOrder.ts`): the actual write path for both guest and account orders. Wraps `orders` + `order_items` + `order_item_flavors` + `order_item_colors` + `promo_code_redemptions` in one atomic transaction — chosen over five sequential client-side `.insert()` calls specifically because a mid-checkout failure on call #3 would otherwise leave a broken, half-written order sitting in the table for an admin to eventually notice and have to clean up by hand. The function re-validates the two things RLS would otherwise enforce (a logged-in caller can only create an order for `auth.uid()`; a guest order must carry `guest_name`/`guest_phone`) since it runs as `security definer` and bypasses the underlying tables' RLS insert policies (which are left in place, unused today, as a safety net for any future direct-write path). `p_items` is a `jsonb` array mirroring `CartItem` (`src/types/cart.ts`) 1:1, including nested `flavor_ids`/`color_ids` for the join tables.
- **`orders.order_number`** (`20260815150000_order_number.sql`): format `YC-YYYYMMDD-####`, generated by a `before insert` trigger reading a real Postgres sequence (`orders_order_number_seq`) — not a same-day `count(*)`, which would race under concurrent checkouts.
- **Guest order visibility — confirmed, not changed**: the Roles section above already says guests get "a UUID-linked order visible only to admin," meaning there's intentionally no RLS SELECT policy letting a guest re-fetch their own order afterward (`orders_select_own` requires `auth.uid() = customer_id`, which is never true for a guest). Order Confirmation therefore never queries the database — Checkout builds the confirmation snapshot from data it already has at the moment of successful submission and hands it off client-side. This applies uniformly to logged-in customers too (one code path, not two), even though they technically *could* be read back from the DB — that capability is reserved for the future Profile/Order History page instead, which has an actual reason to re-fetch.
- **Bug fix surfaced while wiring this up**: Checkout's Promo Code "Apply" (built in the previous session) queried `promo_codes` directly via `.select()`. That table's public SELECT policy was dropped in an earlier migration (`20260814090200_promo_code_lookup.sql`, predates this session) in favor of a narrow `validate_promo_code(p_code)` RPC — direct SELECT would have let anyone enumerate every active code's discount terms. Missed when Checkout was first built (the older migration wasn't cross-checked at the time); fixed to call the RPC instead.
- **Checkout's Contact Details now has real required-field validation** (First/Last Name, Address, Phone 1 — scroll-to-first-error + inline red border/message, matching the `CakeCustomizer`/`Register` convention), added together with submission since there was nothing to validate against before "Place Order" actually did something.
- Cart is cleared (`useCartStore.getState().clear()`) immediately after a successful order, before navigating to Order Confirmation.

### Register page

- Only **First Name, Last Name, Email, Password** are required (standalone `/register` page — no Confirm Password field here, per the actual Figma frame).
- Address and phone number sections are **collapsed by default** (just a "+ Add Another Address (1 of 5)" / "+ Add Another Phone Number (1 of 5)" button, no entry form shown) — clicking expands an entry with Remove; the "+ Add" button's counter increments and the button disappears once 5 is reached. Fully optional to skip both; addable later from Checkout or the Profile page.
- Each phone number entry pairs with the same Call/WhatsApp/Both contact-method chips used elsewhere.
- **Confirmed (resolves the Figma frame inconsistency)**: **Confirm Password** is added to every password-creation form — the standalone `/register` page (beyond what its current frame shows) and the inline Checkout Register tab both get it, for consistency rather than following either frame literally.
- **All password fields** (Login, Register, inline Checkout Register tab) get a show/hide toggle (eye icon) — **hidden by default**. Not in the current Figma frames; a UX addition confirmed at the start of Phase 4 implementation.

### Login page

- Standard Email/Password with a Forgot Password link — **not yet wired to a flow, open item** for a later phase.
- Password field gets the same show/hide (eye icon, hidden by default) toggle as Register/Checkout.

### Profile page (`/profile`, new scope)

- Sidebar: editable Profile Info card (name/email + Edit button), Saved Addresses card (each entry has a short **label** like "Home"/"Work" plus the address text, Edit/Remove, "+ Add Address (N of 5)" counter button), Saved Phone Numbers card (same pattern — number + contact-method label like "WhatsApp", Edit/Remove, up to 5).
- Main panel: Order History — cards per order (order number, date, color-coded status badge [Completed=green, Confirmed=blue, Cancelled=red, Pending presumably a 4th color — not shown in the 3 example cards], one-line item summary, price, "View Details" link).

**Implemented** (`src/app/[locale]/(storefront)/profile/page.tsx` + `ProfileInfoCard`/`SavedAddressesCard`/`SavedPhonesCard`/`OrderHistoryList`) — requires a session (redirects to `/login` if none), everything reads/writes live from the DB since a logged-in customer's own data is a normal RLS-scoped read (`profiles_update_own`, and the owner-only policies on `customer_addresses`/`customer_phones`/`orders`), unlike guest orders (see "Order creation" above).

- Email is shown read-only, not editable here — changing it would need Supabase's own re-confirmation flow (a new verification email to the *new* address), which is its own scope beyond a simple field edit. First/Last Name are editable inline (Edit → inline fields → Save, writes `profiles`).
- **Change Password** (added after feedback): inside the same Profile Info edit form, an optional "Change Password" section (Current/New/Confirm New Password, all-or-nothing — leave all three blank to just save the name). Supabase has no standalone "verify current password" call, so `handleSave` re-authenticates via `supabase.auth.signInWithPassword({ email, password: currentPassword })` first (confirms the caller actually knows it, refreshes the session as a side effect) before `supabase.auth.updateUser({ password: newPassword })` is allowed to run.
- Saved Addresses/Phones: Edit turns that one entry into an inline form (reusing the same label/address/apartment or phone/contact-method fields as Register). Edit/Remove use the real `Button` component (`brand-ghost`/`destructive` variants — matching Profile Info's own Edit button, not a plain text link). Remove confirms via the shared `ConfirmDialog` (`src/components/ui/confirm-dialog.tsx`, Base UI `Dialog`) — **not** `window.confirm()`, replaced after feedback that a native browser confirm looked out of place; this component is meant to be the one used for any future confirm-before-destructive-action anywhere in the app, not just here. The 5-row cap trigger's error surfaces as a plain "you've reached the maximum" message.
- Order History pulls `orders` filtered to the caller (`customer_id = auth.uid()`, the same `orders_select_own` policy mentioned in "Order creation" above) with a nested `order_items(quantity, cakes(name))` select for the one-line item summary. **Known limitation**: `cakes`' RLS only exposes `active = true` rows to a plain customer (unlike the accountant role, which the schema deliberately lets resolve historical/disabled items) — a past order referencing a since-discontinued cake would show a blank name here. Not fixed this pass; would need either exposing inactive cakes to a customer for their own past orders, or denormalizing the cake name onto `order_items` at creation time.
- **"View Details" (`OrderDetailModal`)**: originally skipped as out of scope, then built after feedback that the compact card alone wasn't enough — and expanded a second time after feedback that it needed the cake photo and full customization detail, not just fulfillment/totals. Each line item now shows the cake photo (`cakes.primary_image_url`, `next/image`) and an expandable "Cake Details" section (size or fake-size-cm, tier count, flavors, icing colors + arrangement notes, shape, topper, text on cake/board, notes, and the reference image if one was uploaded). The reference image renders via a plain `<img>`, not `next/image` — `reference_image_url` is currently a client-side `blob:` URL (Cloudinary isn't wired to the storefront yet), same reasoning and pattern as `CakeCustomizer`'s own preview.
  - The expanded query embeds `shapes` twice (real `shape_id` and `fake_shape_id`, both FK to the same table) — disambiguated via PostgREST's relationship-hint syntax (`shape:shapes!order_items_shape_id_fkey(name)`), relying on Postgres's default `<table>_<column>_fkey` constraint naming since none of the relevant migrations named these constraints explicitly. Not verified against the live hosted schema this session (Supabase MCP wasn't authenticated) — if "View Details" ever throws a PostgREST relationship error, this hint is the first place to check.

### Checkout auto-fills from the account when logged in

Contact Details' First Name, Last Name, and Email pre-fill from `profiles`/`session.user.email` once a session is available — but only into fields still empty, same "never overwrite what's typed" rule as the saved-address "Use this" chips (confirmed decision from earlier in Phase 4).

### Bug fixed: order placed but Confirmation page never showed

`handlePlaceOrder` used to call `useCartStore.getState().clear()` immediately before `router.push("/order-confirmation")`, both on `/checkout`. Clearing the cart while still mounted there made `items.length === 0` true on the next render, which fired Checkout's own "redirect to `/cart` if empty" effect — racing (and sometimes winning) against the navigation to Order Confirmation, so the customer could land back on an empty cart instead, even though the order itself had already been created successfully (visible afterward in Profile's Order History). Fixed by moving the cart-clear into Order Confirmation's own effect, after it has already read the snapshot — Checkout no longer touches the cart at all on success.

### Bug fixed: Order Confirmation showed briefly then redirected home

A second, related bug: even after the fix above, the page could still redirect to `/` a couple of seconds after appearing. Root cause: the mount effect's dependency array was `[router]`, and if that reference isn't stable across renders (or the `setOrder()` call inside the effect itself triggers a re-render), the effect body can run a second time — finding `sessionStorage` already cleared from the first run, and redirecting home as if no order existed. Fixed with a `useRef` guard so the effect's actual logic only ever executes once, regardless of how many times React invokes the effect callback.

### Home page LCP warning

Next.js's dev-mode console flagged `birthday.jpeg` as the Largest Contentful Paint candidate without `loading="eager"`. The Shop-by-Category grid already passes `priority` to its first three `CategoryCard`s (birthday included), but the same file is *also* reused as the placeholder photo for Birthday's Trending Cakes row further down the same page (`ProductCard`, Phase 3's placeholder-cake seed) — those instances had no `priority` at all. Fixed by passing `priority` to the first category's first three `ProductCard`s too, matching the Shop grid's existing convention.

### Add to Cart no longer auto-navigates to Cart

`CakeCustomizer`'s "Add to Cart" used to call `router.push("/cart")` immediately after adding the item — changed (owner decision) to a confirmation modal instead (Base UI `Dialog`, fully controlled, no `Dialog.Trigger`) with **Continue Shopping** (just closes the modal — the customer stays on the same Cake Detail page, useful for adding several items from one product) and **Go to Cart** (navigates to `/cart`, matching the same `Button render={<Link .../>}` pattern used elsewhere for link-styled buttons).

### Cart items are now editable

Each `CartItemRow` gained an Edit button (pencil icon, next to Remove) alongside the existing quantity stepper. Clicking it stashes the full `CartItem` in `sessionStorage` (`src/lib/cart/editItem.ts`, `setEditCartItem`) and navigates to that cake's Detail page. `CakeCustomizer` reads it once on mount (an effect, not a lazy `useState` initializer — same SSR/hydration-mismatch reasoning as Order Confirmation's snapshot read) and pre-fills every field from it, then clears the sessionStorage key.

- **Editing never touches the original cart row** — confirmed owner decision: the pre-filled form is a fresh customization pass, and clicking "Add to Cart" again creates a **new** cart item via the normal flow. The old item stays in the cart until the customer removes it manually. This was a deliberate choice, not a missing "replace" feature — asking the customer to explicitly remove the old one avoids a customization change accidentally discarding an item they still wanted.
- **Known limitation carried over from Fake Cake's reference image**: if the edited item had a reference image, `referenceImageUrl` is a client-side `blob:` URL (Cloudinary isn't wired up yet) — it will only still resolve if the browser tab that created it is still open. A stale/closed-tab blob URL will just show as a broken image on re-edit; not fixed this pass, same root cause as the `OrderDetailModal` reference-image note above.

### "Use this" chips and Order Details' close button

Two smaller polish items from feedback:
- Checkout's saved-address/phone "Use this" chips were plain underlined text links — now a real `Button` (`variant="brand-primary"`), matching the styling of the Apply button next to Promo Code, for visual consistency between the two "commit a suggested value" actions on the same page.
- `OrderDetailModal`'s close (X) button is now `sticky` within the popup's own scroll container (bleeds to the popup's edges with a matching background so content scrolls invisibly underneath it) instead of scrolling away with the content, and slightly larger (`size-10` button / `size-5` icon, up from `size-8`/`size-4`).

### Data model additions needed for Phase 4 (saved addresses/phones)

**Implemented** (`20260815130000_customer_addresses_phones.sql`, pushed to hosted): dedicated join tables (`customer_addresses`, `customer_phones`), not JSONB arrays — matches the existing `order_item_flavors`/`order_item_colors` join-table pattern and keeps RLS/edit/remove straightforward. Confirmed requirements driving the design:
- Saved **customer addresses**: capped at 5 per customer, each with a short free-text **label** (customer-typed, e.g. "Home"/"Work"/"Mom's House" — not a fixed enum) in addition to the address text (street/apartment).
- Saved **customer phone numbers**: capped at 5 per customer, each with a call/WhatsApp/both contact-method preference.
- Both need to be selectable/auto-fillable from Checkout (as chips) and manageable (add/edit/remove) from the Profile page and from Register's optional expandable sections.
- Cap enforcement: a shared `fn_enforce_customer_item_cap()` trigger function (reads the max via `TG_ARGV[0]`, one function serves both tables). RLS: owner-only CRUD (`(select auth.uid()) = customer_id`, scoped to `authenticated` — guests can't have saved rows) plus `admin_all`; no accountant policy (address book isn't accountant's domain, see Roles). Audit-logged via the standard `fn_audit_log()` triggers, same as every other table.

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
- Forgot Password flow — Login page has the link designed but it's not wired to anything yet (owner TBD on email-reset vs. other approach)
- Real business phone number (owner TBD) — placeholder `+20 100 123 4567` in `src/lib/contact.ts`, feeds ContactModal + Footer
- Core Phase 2 schema implemented — see `docs/superpowers/specs/2026-08-13-phase2-data-model-design.md` and `supabase/migrations/`; cart persistence and saved-address storage still pending per Phase 3/4. Phase 2 follow-up migration (Dessert Cups, `fake` category removal, `order_items` fake-cake columns, `orders.source`) is done — see `20260814100000`–`20260814100400`.
