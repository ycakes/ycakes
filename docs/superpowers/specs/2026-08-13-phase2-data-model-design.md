# Phase 2 — Data Model Design

Status: approved, ready for implementation plan.
Scope: TASKS.md Phase 2 (finalize schema, write migrations, RLS policies per role, seed script).

## Conventions

- All primary keys: `uuid default gen_random_uuid()`.
- Bilingual product content (anything shown on the storefront/admin that isn't a static UI string): `jsonb` column shaped `{ "en": "...", "ar": "..." }`, per ARCHITECTURE.md's i18n decision. Static UI strings stay in `messages/en.json` / `messages/ar.json`, never in the DB.
- Money: `numeric(10,2)`, EGP only, no currency column.
- Timestamps: `timestamptz default now()`.
- Soft-delete pattern: catalog rows (`cakes`, `flavors`, `colors`, `toppers`, `shapes`, `sizes`, `tiers`, `delivery_areas`) use an `active boolean` flag, never hard-deleted, so historical `order_items` FKs stay valid and admin can temporarily disable instead of losing data.
- `order_items` and its children are a **point-in-time snapshot** — price fields are copied at order time so later catalog price edits never retroactively change a past order's total.

## Tables

### Roles

**`profiles`** — 1:1 with `auth.users`.
- `id uuid PK references auth.users(id) on delete cascade`
- `role text not null default 'customer' check (role in ('customer','admin','accountant'))`
- `full_name text`, `phone text`
- `created_at timestamptz default now()`

A trigger on `auth.users` insert creates the matching `profiles` row with `role='customer'`. Admin/accountant roles are never self-service — elevated manually (Phase 8 tooling) by editing the `role` column.

### Categories

**`categories`** — self-referencing for the Candy Corner → Cupcakes/Pops/Popsicles hierarchy.
- `id uuid PK`
- `parent_id uuid references categories(id)` (null for top-level)
- `name jsonb not null`
- `slug text not null unique`
- `sort_order int default 0`
- `active boolean default true`
- `created_at timestamptz default now()`

Top-level seed rows: Birthday, Wedding, Graduation, Bento, Custom, Fake, Candy Corner. Candy Corner's children: Cupcakes, Pops, Popsicles. `cakes.category_id` always points at a leaf category (e.g. "Cupcakes", never "Candy Corner" directly).

### Sizes

**`sizes`**
- `id uuid PK`
- `category_id uuid not null references categories(id)`
- `min_qty int not null`, `max_qty int not null` (equal for single-number sizes: bento, candy corner increments)
- `unit text not null check (unit in ('servings','quantity','cm'))` — servings for birthday/wedding/graduation/custom/bento, quantity for candy corner, cm for fake cakes (drives storefront label formatting without hardcoding by category slug)
- `price_modifier numeric(10,2) not null default 0`
- `sort_order int default 0`, `active boolean default true`
- `unique(category_id, min_qty, max_qty)`

### Tiers

**`tiers`**
- `id uuid PK`
- `tier_count int not null unique check (tier_count between 2 and 6)`
- `price_modifier numeric(10,2) not null default 0`
- `active boolean default true`

**`size_tiers`** — join table marking which tier counts are selectable for a given size.
- `size_id uuid references sizes(id) on delete cascade`
- `tier_id uuid references tiers(id) on delete cascade`
- `primary key (size_id, tier_id)`

Confirmed rule for birthday/wedding/graduation/custom: sizes below 24>30 get no `size_tiers` rows (no tier choice shown); 24>30 gets tiers {2,3}; 34>40 and every larger size (including wedding's 80>90, 100>120) gets {2,3,4}. Bento never gets tier rows. Fake cakes can go up to 6 tiers but their sizes are still TBD from the owner, so no `size_tiers` rows are seeded for Fake yet — admin adds them once Fake sizes exist.

### Catalog

**`cakes`**
- `id uuid PK`, `category_id uuid not null references categories(id)`
- `name jsonb not null`, `description jsonb`
- `base_price numeric(10,2) not null default 0`
- `primary_image_url text`
- `featured boolean default false` (home page curation)
- `active boolean default true`, `sort_order int default 0`
- `created_at`, `updated_at timestamptz default now()`

**`cake_images`** — `id`, `cake_id references cakes(id) on delete cascade`, `url text not null`, `sort_order int default 0`

**`flavors`** — `id`, `name jsonb not null`, `price_modifier numeric(10,2) default 0`, `active`, `sort_order`
**`colors`** — `id`, `name jsonb not null`, `hex_code text`, `active`, `sort_order`
**`shapes`** — `id`, `name jsonb not null`, `active`, `sort_order`
**`toppers`** — `id`, `name jsonb not null`, `price_modifier numeric(10,2) default 0`, `has_color_variants boolean default false`, `active`, `sort_order`
**`topper_colors`** — `topper_id references toppers(id) on delete cascade`, `color_id references colors(id) on delete cascade`, composite PK

**`cake_flavors`**, **`cake_colors`**, **`cake_toppers`** — join tables, composite PK `(cake_id, X_id)`, `on delete cascade`. Toppers are only ever assigned to cakes in the Custom category — enforced at the admin-UI/app level (topper picker only shows for Custom-category cakes), not a DB constraint, consistent with how shape/color availability isn't DB-enforced either. Candy Corner cakes should only ever get `cake_flavors` rows for vanilla + chocolate — same app-level convention, documented here and in ARCHITECTURE.md for whoever builds the Phase 5 admin catalog UI.

### Orders

**`orders`**
- `id uuid PK default gen_random_uuid()` — this **is** the guest-order identifier from ARCHITECTURE.md's "UUID-linked" guest order model
- `customer_id uuid references profiles(id)` (null = guest)
- `guest_name text`, `guest_phone text`
- `status text not null default 'pending' check (status in ('pending','confirmed','cancelled','completed'))`
- `fulfillment_type text not null check (fulfillment_type in ('delivery','pickup'))`
- `delivery_area_id uuid references delivery_areas(id)`, `delivery_address text`
- `fulfillment_date date not null`
- `promo_code_id uuid references promo_codes(id)`
- `subtotal_estimate numeric(10,2) not null default 0`, `delivery_price numeric(10,2) not null default 0`, `discount_amount numeric(10,2) not null default 0`
- `final_price numeric(10,2)` — null until admin confirms and prices it
- `notes text`
- `created_at`, `confirmed_at`, `completed_at`, `cancelled_at timestamptz`
- `check (customer_id is not null or (guest_name is not null and guest_phone is not null))`

No guest-facing order lookup — confirmation is shown once at checkout / sent over WhatsApp. Guests cannot query `orders` afterward; only admin/accountant can.

**`order_items`**
- `id uuid PK`, `order_id references orders(id) on delete cascade`
- `cake_id references cakes(id)` (restrict delete — cakes are soft-deleted via `active`, never hard-deleted, so history stays intact)
- `size_id references sizes(id)`, `tier_id references tiers(id)` (nullable), `shape_id references shapes(id)`, `color_id references colors(id)`
- `is_fifty_fifty boolean default false`
- `topper_id references toppers(id)` (nullable), `topper_color_id references colors(id)` (nullable)
- `text_on_cake text`, `text_on_board text`, `notes text`
- `quantity int not null default 1`
- `unit_base_price numeric(10,2) not null`, `price_modifiers_total numeric(10,2) not null default 0`, `line_estimate numeric(10,2) not null` — all snapshotted at order time
- `created_at timestamptz default now()`

**`order_item_flavors`** — `order_item_id references order_items(id) on delete cascade`, `flavor_id references flavors(id)`, `position smallint not null default 1 check (position in (1,2))`, PK `(order_item_id, position)`. 1 row normally, 2 for a 50/50 item.

### Promo codes

**`promo_codes`** — `id`, `code text unique not null`, `discount_type text check (in ('fixed','percentage'))`, `discount_value numeric(10,2) not null`, `min_order_amount numeric(10,2)`, `expiry_date date`, `redemption_cap int` (null = unlimited), `active boolean default true`, `created_at`

**`promo_code_redemptions`** — `id`, `promo_code_id references promo_codes(id)`, `order_id references orders(id)`, `created_at`, `unique(order_id)` (one promo per order)

Concurrency: a `BEFORE INSERT` trigger on `promo_code_redemptions` does `SELECT ... FOR UPDATE` on the parent `promo_codes` row, counts existing redemptions, and raises an exception if the cap (when set) would be exceeded, or if the code is inactive/expired. The row lock serializes concurrent checkouts for the same code so two simultaneous last-redemption orders can't both succeed.

### Delivery

**`delivery_areas`** — `id`, `name jsonb not null`, `price numeric(10,2) default 0`, `active`, `sort_order`. No seed rows — real areas are TBD from the owner, same as Fake cake sizes.

**`delivery_calendar_blocks`** — `id`, `blocked_date date unique not null`, `reason text`, `created_by references profiles(id)`, `created_at`

### Expenses

**`expense_categories`** — `id`, `name jsonb not null`, `active`. Seeded with placeholders: Ingredients, Packaging, Delivery, Utilities, Marketing — freely editable via the Phase 7 admin UI.

**`expenses`** — `id`, `category_id references expense_categories(id)`, `amount numeric(10,2) not null`, `expense_date date not null`, `description text`, `created_by references profiles(id)`, `created_at`

### Audit log

**`audit_log`** — `id`, `actor_id references profiles(id)`, `table_name text not null`, `row_id uuid`, `action text check (in ('insert','update','delete'))`, `old_data jsonb`, `new_data jsonb`, `created_at`

A generic trigger function (`fn_audit_log()`, using `TG_TABLE_NAME`/`TG_OP`/`row_to_json`/`auth.uid()`) is attached `AFTER INSERT OR UPDATE OR DELETE` to every admin/accountant-mutable table: `categories`, `sizes`, `tiers`, `size_tiers`, `cakes`, `cake_images`, `flavors`, `colors`, `shapes`, `toppers`, `topper_colors`, `cake_flavors`, `cake_colors`, `cake_toppers`, `orders`, `order_items`, `order_item_flavors`, `promo_codes`, `delivery_areas`, `delivery_calendar_blocks`, `expense_categories`, `expenses`, `profiles`. No policy ever allows a direct insert/update/delete on `audit_log` itself — it's trigger-populated only.

### Newsletter

**`newsletter_subscribers`** — `id`, `phone text unique not null`, `opted_in_at timestamptz default now()`, `active boolean default true`

## RLS policy plan

- **Public/anon**: `SELECT` on active catalog rows (`categories`, `sizes`, `tiers`, `size_tiers`, `cakes` + related images/flavors/colors/toppers/shapes joins, `delivery_areas`, `delivery_calendar_blocks`) filtered `where active = true`. `INSERT` on `orders`/`order_items`/`order_item_flavors`/`promo_code_redemptions` (guest checkout) and `newsletter_subscribers`. No `SELECT` on `orders`/`order_items` at all for anon/guest.
- **Customer** (authenticated, `role = 'customer'`): everything anon has, plus `SELECT`/`INSERT` on their own `orders` (`customer_id = auth.uid()`) and related `order_items`/`order_item_flavors`. No `UPDATE`/`DELETE` — orders are immutable once placed from the customer side. `SELECT`/`UPDATE` own `profiles` row.
- **Admin**: full `SELECT`/`INSERT`/`UPDATE`/`DELETE` on every table except `audit_log` (read-only) and `profiles.role` self-elevation (role changes happen via Phase 8 tooling, not open RLS).
- **Accountant**: `SELECT` on `orders`/`order_items`/`order_item_flavors` (no catalog access), full CRUD on `expenses`/`expense_categories`, `SELECT` on `promo_codes`/`promo_code_redemptions`/`delivery_areas` (for analytics), no write access to catalog tables (`categories`, `cakes`, `sizes`, `tiers`, `flavors`, `colors`, `toppers`, `shapes`).
- Every policy checks role via a join to `profiles` (per the earlier decision to use a `profiles` table over JWT custom claims).

## Indexes

Beyond PK/unique indexes, add btree indexes on: `sizes.category_id`, `cakes.category_id`, `order_items.order_id`, `order_items.cake_id`, `order_item_flavors.order_item_id`, `promo_code_redemptions.promo_code_id`, `orders.status`, `orders.fulfillment_date`, `audit_log(table_name, row_id)`, `categories.parent_id`.

## Seed script scope

Reference/lookup data only — no actual `cakes` product rows, no `promo_codes`, no `orders` (those are real catalog entry / Phase 5+ work):
- `categories`: 7 top-level + 3 Candy Corner children
- `sizes`: explicit rows for birthday/graduation/custom (4>6 … 60>70), wedding (adds 80>90, 100>120), bento (2, 3), candy corner cupcakes (6, then 12…996 by 12s), pops/popsicles (12…996 by 12s). Fake cakes: no rows (cm's TBD).
- `tiers`: 2, 3, 4, 5, 6
- `size_tiers`: per the confirmed threshold rule above, for birthday/wedding/graduation/custom only
- `shapes`: Circle, Heart, Square, Rectangle
- `colors`: ~30 common cake colors (name + hex)
- `flavors`: Vanilla, Chocolate, Ferrero Rocher, Blueberry, Raspberry, Dulce de Leche, Caramel, Oreo, Chocolate Spread, Chocolate Chips, Strawberry, Mango
- `expense_categories`: Ingredients, Packaging, Delivery, Utilities, Marketing

All `price_modifier` values seed at `0` — no real pricing numbers exist yet; the owner fills these in via the admin dashboard once Phase 5/7 ship.

## Deferred / explicitly out of scope for Phase 2

- Real `delivery_areas` data (owner TBD)
- Fake cake sizes (cm's) and their tier thresholds (owner TBD)
- Actual cake product catalog entry (Phase 5 admin UI)
- Real price modifiers for sizes/flavors/toppers/tiers (owner TBD, admin-editable)
- Candy Corner storefront "snap to nearest valid size" input UX — noted in ARCHITECTURE.md, implemented in Phase 3
- Admin/accountant account provisioning flow (Phase 8)

## Migration file plan (Supabase CLI convention, `supabase/migrations/<timestamp>_<name>.sql`)

1. `profiles` + auth trigger
2. `categories`
3. `sizes`, `tiers`, `size_tiers`
4. `flavors`, `colors`, `shapes`, `toppers`, `topper_colors`
5. `cakes`, `cake_images`, `cake_flavors`, `cake_colors`, `cake_toppers`
6. `delivery_areas`, `delivery_calendar_blocks`
7. `promo_codes`, `promo_code_redemptions` (+ cap-enforcement trigger)
8. `orders`, `order_items`, `order_item_flavors`
9. `expense_categories`, `expenses`
10. `audit_log` + generic trigger function + attach to all mutable tables
11. `newsletter_subscribers`
12. RLS policies (one migration per table group, or consolidated — decided at plan time)
13. Seed script (`supabase/seed.sql` or a TS seed script — decided at plan time) populating the reference/lookup data above
