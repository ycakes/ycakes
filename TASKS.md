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

**Design status: Figma design complete for all four pages below, and all four are now built.** File: "YCakes — Design System", key `UR2u2vVxduNHFheGewn9CH`. Pages `Home`, `Shop`, `Cake Detail`, `Cart` in that file are full assembled mockups (not just components) — read from there for spacing, copy, states, and component structure rather than re-deriving it from scratch. Component pages (`Button`, `Product Card`, `Nav Bar`, `Footer`, `Category Card`, `Price Tag`, `Badge`, `Input Field`, `Filter Chip`, `Quantity Stepper`, `Cart Item Row`, `Color Swatch`, `Topper Card`) document variants/states/properties for each. Several rounds of post-implementation UX/design fixes were made against real usage that go beyond the original Figma mockup (background colors, image sizing, validation UX, multi-select icing colors) — noted inline below. Remaining Phase 3 open item: full Arabic translation QA and RTL visual pass are tracked separately under Phase 9, not here.

- [x] Home page: hero, "Shop by Category" (6 categories — no Fake Cakes card, see below), "Trending Cakes" (6 category sections, 4 cakes each), footer
  - Real category photos now in `public/images/categories/{slug}.jpeg` (owner-supplied). Trending Cakes still uses placeholder cake rows (4 per category, seeded via `20260814110000_phase3_placeholder_cakes.sql`) that reuse the category photo — swap for real per-product photos once the owner provides them.
  - Hero background photo (owner-supplied, `public/images/hero/hero.jpg`) renders full-bleed behind the entire Hero section at **every** breakpoint, including behind the text — owner explicitly rejected a mobile-only "photo as a separate card below the text" layout, wanting the whole section to just scale down as a unit instead. Achieved via a `min-h` on the section (`480px`/`560px`/auto across breakpoints) so mobile's aspect ratio stays close enough to the photo's own that `object-cover` doesn't crop it to a sliver, rather than letting stacked text content dictate an arbitrarily tall, narrow section.
  - **Mirrored in Arabic** via a separately-shot photo (`public/images/hero/hero-flipped.jpg`), swapped in when `locale === "ar"` — the photo's cake sits on one side with a text-safe blended area on the other, and since `flex-direction: row` follows the CSS writing direction, the text column already visually swaps sides under `dir="rtl"`, so the photo needs to match. A CSS `scaleX(-1)` flip was tried first but also mirrored the YCakes logo baked into the photo itself (backwards text/logo), hence the separate owner-supplied flipped asset instead of a transform.
  - Subheadline text ("Handmade cakes for birthdays...") got a semi-opaque rounded background (`bg-bg-page/80` + `backdrop-blur-sm`) and bumped to `font-bold` — it sits directly over the photo and could land on the cake itself at some viewport widths/zoom levels, where the plain semi-bold text on `text-secondary` wasn't reliably legible.
  - **Mobile nav menu**: `NavBar` only ever showed logo + language toggle + cart on small screens — the four nav links (Home/Shop/Custom Cakes/Contact) had `hidden md:flex` with no mobile fallback, so they were simply invisible below `md`. Added a hamburger button (`lucide-react` `Menu`/`X`) that toggles a dropdown panel with the same links, closing on navigation.
  - Design tokens (colors, Cairo/Baloo 2/Caveat fonts, pill Button variants) pulled from Figma into `globals.css` / `button.tsx`, reusable by the rest of Phase 3.
  - Cart badge in `NavBar` reads from the new Zustand store (`src/store/cart.ts`), client-persisted only — no `cart_items` DB sync in Phase 3, deferred to Phase 4 once accounts exist.
- [x] Shop / category browse page: category filter chips, product grid, pagination
  - `/shop` (all cakes) and `/shop/[category]` (single top-level category, Candy Corner aggregates its 4 subcategories) share one `ShopBrowse` component. Pagination is query-param based (`?page=`), 12 cakes/page, hidden when everything fits on one page.
  - Figma's mock "New"/"Sale" product badges were **not** implemented — there's no `is_new`/`sale_price` concept in the `cakes` schema, so nothing to drive them from real data. Flag to the owner if that's wanted; would need a schema change.
- [x] Cake Detail + customization flow (`/cakes/[id]`, `CakeCustomizer` client component)
  - [x] Normal cake flow: size (servings), tiers (conditional, driven by `size_tiers` data — no separate category flag needed), flavor + 50/50 split toggle, icing color, shape, toppers (Custom Cakes only), text on cake, text on board, additional notes, quantity, add to cart
  - [x] **Cake Type toggle** (Normal / Fake) at the top of the page, above size — hidden entirely for Bento and Candy Corner (`allowFakeCake` computed from the top-level category slug)
  - [x] Fake Cake flow (shown when Cake Type = Fake): size in cm, icing color, shape (restricted to `shapes.fake_eligible`), text on cake, text on board, additional notes, optional reference image upload, toppers only if category is Custom Cakes
  - [x] Reference image upload is available for **every** cake (not just Fake Cake — the schema never restricted it, only the old UI did), with a remove/X button once a photo's picked, `object-contain` so the whole photo is visible, and page-background-colored empty space instead of white/tan mismatch. Still a client-side `URL.createObjectURL` preview only — no Cloudinary wiring on the storefront yet (lands with Phase 5 admin CRUD), so it isn't a persisted/uploadable file yet. Revisit once Cloudinary is wired up; Phase 4 checkout will need a real upload step here.
  - [x] Candy Corner snap-to-valid-size input (`SizeQuantityInput`): custom +/− stepper buttons move between valid sizes (6→12→24…), not by 1 — native number-input arrows can't express a variable step. Typing an in-between number is treated as invalid/blocking (red, "Must be {a} or {b}"), not an optional suggestion; typing below the smallest size shows "Minimum is {min}" instead of a nonsensical lower bound.
  - [x] **Icing color is multi-select** (owner request) — any number of colors per item via the `order_item_colors` table (see ARCHITECTURE.md). Selecting more than one reveals a dedicated **Color Arrangement** textbox (separate from Additional Notes, `order_items.color_arrangement_notes`) to describe how to arrange them — **mandatory** (blocks add-to-cart, same scroll-to-and-highlight validation as every other required field) whenever 2+ colors are selected. The textbox stays mounted (not cleared) when toggling back down to 1 color, so an accidental deselect-reselect doesn't lose what was typed — but its value is only submitted with the cart item, and only required, when 2+ colors are still selected at add-to-cart time.
  - [x] **Per-category flavor restriction** (owner request) via the new `category_flavors` join table: Cupcakes/Pops/Popsicles only offer Vanilla or Chocolate; Dessert Cups gets its own 7-flavor list (Oreo, Chocolate, Lotus, Ferrero Rocher, Tiramisu, Red Velvet, Cheesecake — the last four newly added `flavors` rows). Every other category is unaffected (unrestricted, same as before).
  - [x] **50/50 flavor split gated by tier availability**, not a hardcoded category list — only offered when the selected size has `size_tiers` rows. This already excludes Bento and all of Candy Corner for free (neither ever has tier rows) without extra category-specific logic, and for Birthday/Wedding/Graduation/Custom it's exactly the owner's "24>30 or bigger" rule since that's the same threshold tiers unlock at.
  - [x] **`1 Tier` added as an explicit, auto-selected default** at any size that unlocks tiers (previously tiers started at 2, forcing a choice even for a plain single-tier cake). `tiers.tier_count` constraint widened to allow 1; picking a qualifying size auto-selects the 1-tier option, with 2/3/(4) still available as alternatives.
  - Add-to-cart is now always enabled (was disabled-until-valid). Clicking with missing required fields scrolls to the first incomplete section and shows inline red errors instead. The resulting `CartItem` is shaped 1:1 onto `order_items`/`order_item_flavors`/`order_item_colors`.
  - Price display/modifiers are computed from real DB values (size/tier/flavor/topper `price_modifier`), not hardcoded — since everything currently seeds at 0, cards show "Price on request" until the owner enters real pricing in a later phase's admin UI.
  - Placeholder cake description text ("Placeholder ... real product photos coming soon") removed from the seeded rows (`20260815100100_clear_placeholder_cake_descriptions.sql`) — was only ever dev filler, reads oddly on the real storefront.
  - Fixed a `CartItem is not iterable` crash on `/cart` for anyone with a cart persisted before the multi-color change (old shape had singular `colorId`/`colorName`) — the Zustand cart store now has a `version`/`migrate` that resets incompatible old local carts instead of crashing.
- [x] Cart page (`/cart` server component fetching delivery data → `CartPageContent` client component reading the Zustand cart): item list (thumbnail, name, attribute chips derived from the `CartItem`, quantity stepper, remove button, line price), order summary (subtotal, "Calculated at checkout" delivery placeholder, estimated total, pricing-finalized-via-WhatsApp disclaimer), proceed-to-checkout button. "Your Cart" heading uses `text-brand-primary`, matching the rest of the storefront's heading color convention.
  - Checkout button is intentionally **disabled** with a "coming soon" caption, gated by a `CHECKOUT_ENABLED = false` flag in `src/store/cart.ts` rather than linking to a route that doesn't exist — Phase 4 isn't built yet, so there's nothing to proceed to. Flip that one constant once Phase 4 checkout exists to submit to.
  - [x] **Pickup/Delivery + fulfillment date picked on the Cart page itself** (owner request), ahead of the rest of Phase 4 checkout: pickup (single fixed location, "New Cairo", `Store` icon) vs. delivery (area chips from `delivery_areas` — now seeded with Cairo/Giza/Helwan at price 0, TBD real pricing, `Truck` icon) as buttons, then a custom month-grid `DatePicker` (`src/components/storefront/DatePicker.tsx`, no calendar library dependency) — earliest selectable date is tomorrow (same-day reservation isn't offered), dates in `delivery_calendar_blocks` render disabled/struck-through. Icons are `lucide-react` (already a dependency), not Figma assets — this whole section isn't in the Figma Cart mockup, it's new scope pulled forward from Phase 4.
  - [x] **Confirmed decision: this fulfillment/date selection is a permanent, store-persisted part of the cart**, not local/undecided state. `fulfillmentMethod`/`deliveryAreaId`/`fulfillmentDate` now live in the Zustand cart store (`src/store/cart.ts`, persist `version` bumped to 2 with a matching `migrate` step) and survive navigation/reload exactly like cart items do. `useFulfillmentComplete()` implements the real validation (date always required; an area additionally required when the method is delivery) and already gates the checkout button's enabled state — it's just currently ANDed with `CHECKOUT_ENABLED = false`, so the button stays disabled today regardless of how complete the selection is, but the logic itself is correct and ready for when Phase 4 flips that flag on.
  - Empty-cart state (message + "Browse Cakes" link) wasn't in the Figma mockup (which only showed the populated state) but is needed for a real empty cart — added as a reasonable extrapolation.
  - Cart item names/attribute chips are captured as plain strings in the locale active at add-to-cart time (not re-derived bilingually) since `CartItem` isn't re-fetched from the DB — switching language after adding an item won't retranslate what's already in the cart. Acceptable for a client-only Phase 3 cart; revisit if it matters once Phase 4 persists carts server-side.
- [x] ~~Contact page~~ — not needed. "Contact" in the nav is an anchor link to the footer (WhatsApp number + Instagram), not a separate route. Decided after Figma design work, correcting an earlier assumption that it would be a full page.

## Phase 4 — Checkout & orders

**Design status: Figma design complete for Checkout, Order Confirmation, Register, Login, and Profile — see ARCHITECTURE.md's "Phase 4 — Checkout & accounts" section for full page-by-page decisions.** File: "YCakes — Design System", key `UR2u2vVxduNHFheGewn9CH`.

- [x] Nav Bar centering fix (Phase 3 follow-up): nav links now absolutely centered (`left-1/2 -translate-x-1/2`) independent of the logo/actions widths; Profile icon (lucide `User`, not the Figma emoji placeholder — this repo avoids emoji in code) added between the language toggle and cart icon. Currently always links to `/login` — no auth/session state exists yet to branch to `/profile`, revisit once Login/Register land. See ARCHITECTURE.md's "Nav Bar" section.
- [x] Saved-address/saved-phone schema: `customer_addresses` (label, address, apartment) and `customer_phones` (phone, contact_method), both FK to `profiles(id)`, capped at 5 rows each via a shared `fn_enforce_customer_item_cap()` trigger, owner-only RLS + admin_all + audit log triggers (`20260815130000_customer_addresses_phones.sql`, pushed to hosted). Supabase advisors check not run this session — MCP server isn't authenticated; worth a manual pass before Phase 4 ships.
- [ ] Checkout page (`/checkout`): 3-way Guest/Log In/Register tab switcher, expanded Contact Details, sidebar Fulfillment Details recap + inline Edit modal (reusing Cart's DatePicker/delivery-area logic), Order Summary with inline Promo Code
- [ ] Guest order creation (UUID-linked) and account order creation
- [ ] Confirmation email (Resend)
- [ ] Order Confirmation page: order number, "What Happens Next" WhatsApp `wa.me` deep link, full recap
- [x] Register page (`/register`): First/Last Name + Email + Password + Confirm Password (all with show/hide toggle on password fields), optional expandable Address/Phone sections (up to 5 each, Call/WhatsApp/Both chips per phone). Calls `supabase.auth.signUp()`; any addresses/phones entered are held in `sessionStorage` until email confirmation completes (no session exists yet at signup time to write against), then synced by `/register/complete` once the confirmation link lands the user in an authenticated session — see ARCHITECTURE.md's "Auth (Phase 4)" section.
- [x] `/auth/confirm` route handler (`src/app/auth/confirm/route.ts`, outside `[locale]` — `proxy.ts` matcher updated to exclude `/auth`): verifies the emailed `token_hash` via `supabase.auth.verifyOtp()`, redirects into `/register/complete`.
- [x] Resend-powered confirmation email: `supabase/functions/send-email/index.ts` — a Supabase Auth "Send Email" hook (Standard Webhooks-verified) that sends the actual confirmation email via Resend instead of Supabase's built-in SMTP, bilingual (EN/AR based on `user_metadata.locale`).
  - **Not yet deployed/wired** — needs, in order: (1) `supabase functions deploy send-email`, (2) `supabase secrets set RESEND_API_KEY=... SEND_EMAIL_HOOK_SECRET=...` (user has the Resend key), (3) enabling the hook + `enable_confirmations = true` on the **hosted** project. Step 3 touches live Supabase Auth settings (`supabase config push` syncs the *entire* local `config.toml`, which could silently overwrite hosted-only settings like `site_url` that aren't visible from here) — deliberately paused for explicit confirmation before running, see conversation.
- [x] Login page (`/login`): Email/Password with show/hide toggle, Forgot Password link present but inert (not wired — flagged open in ARCHITECTURE.md), calls `supabase.auth.signInWithPassword()`.
- [x] `profiles.full_name` → `first_name`/`last_name` split (`20260815140000_profiles_first_last_name.sql`), populated at signup via `auth.users.raw_user_meta_data`.
- [ ] Profile page (`/profile`, new scope this session): sidebar Profile Info + Saved Addresses + Saved Phone Numbers (up to 5 each, Edit/Remove), main panel Order History (status color-coded, item summary, price, View Details)

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
