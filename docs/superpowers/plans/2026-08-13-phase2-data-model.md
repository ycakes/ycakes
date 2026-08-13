# Phase 2 — Data Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the full Phase 2 Supabase schema (tables, constraints, triggers, RLS policies) and a reference-data seed script for the ycakes cake-ordering app, exactly as designed in the approved spec.

**Architecture:** One SQL migration file per logical table group, applied in dependency order directly against the hosted Supabase project (ref `yddapkhhniecjnnzrolv`) via the Supabase MCP `apply_migration` tool, immediately followed by `alter table ... enable row level security` in the same migration so no table is ever left open. RLS policies are added in two later migrations (public/self-service, then admin/accountant) once all tables exist. A final `supabase/seed.sql` populates reference/lookup data only.

**Tech Stack:** Supabase Postgres (hosted), SQL migrations via the Supabase CLI file convention (`supabase/migrations/<timestamp>_<name>.sql`), applied via the Supabase MCP server's `apply_migration` / `execute_sql` tools.

**Spec:** `docs/superpowers/specs/2026-08-13-phase2-data-model-design.md` — this plan implements it table-for-table; the two travel together.

## Global Constraints

- All money is EGP, `numeric(10,2)`, no currency column (CLAUDE.md hard rule 7).
- Bilingual product content is `jsonb` shaped `{ "en": "...", "ar": "..." }` (ARCHITECTURE.md i18n decision). Never a bare English string on a storefront-facing column.
- Role enforcement is via Postgres RLS, never UI-only (ARCHITECTURE.md Roles section).
- **Never commit automatically.** Every task ends by staging its file(s) with `git add` and stopping — no `git commit`. The human commits manually (CLAUDE.md hard rule 1). The final task proposes one consolidated commit message covering the whole phase.
- **Never run a dev server or open a browser to self-test** (CLAUDE.md hard rule 2) — not applicable to this plan anyway (no app code, only SQL).
- **No local Docker/psql available in this environment.** Verification happens directly against the hosted Supabase project via the Supabase MCP tools (`apply_migration`, `execute_sql`, `list_tables`, `get_advisors`). The project is empty and pre-launch, so this carries low risk; mistakes are fixed with a corrective migration, not a rollback.
- **RLS verification caveat:** `execute_sql` runs with elevated/service privileges and bypasses RLS, so it cannot be used to simulate "does anon actually get blocked." RLS correctness is instead verified by (a) inspecting `pg_policies` to confirm the expected policies exist with the right `using`/`with check` clauses, and (b) running `get_advisors(type: "security")` after every RLS-touching task, which flags tables with RLS gaps.
- Two additions to the spec discovered during planning, both included below: (1) `promo_codes` needs a public/anon SELECT policy for active codes — the spec's RLS section granted this to nobody, which would make checkout unable to validate a promo code at all; (2) `promo_code_redemptions` and `newsletter_subscribers` are intentionally *not* in the audit-trigger list, matching the spec's explicit enumeration (flagged here, not silently expanded).

---

### Task 1: Profiles, roles, and the role-check helper

**Files:**
- Create: `supabase/migrations/20260813120000_profiles.sql`

**Interfaces:**
- Produces: `public.profiles(id, role, full_name, phone, created_at)`; `public.current_profile_role() returns text` (SECURITY DEFINER, used by every later RLS policy to check the caller's role); triggers `trg_handle_new_user` (on `auth.users`) and `trg_prevent_self_role_change` (on `public.profiles`).

- [ ] **Step 1: Write the migration**

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'customer' check (role in ('customer','admin','accountant')),
  full_name text,
  phone text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Auto-provision a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'customer');
  return new;
end;
$$;

create trigger trg_handle_new_user
after insert on auth.users
for each row execute function public.handle_new_user();

-- Reads the caller's role, bypassing RLS on profiles so it's safe to call
-- from inside other tables' RLS policies without recursion issues.
create or replace function public.current_profile_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Only an actor whose *current* role is 'admin' may change a role column.
create or replace function public.prevent_self_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role <> old.role and public.current_profile_role() <> 'admin' then
    raise exception 'Only admins can change a profile role';
  end if;
  return new;
end;
$$;

create trigger trg_prevent_self_role_change
before update on public.profiles
for each row execute function public.prevent_self_role_change();
```

- [ ] **Step 2: Apply the migration to the hosted project**

Use `mcp__plugin_supabase_supabase__apply_migration` with `project_id: "yddapkhhniecjnnzrolv"`, `name: "profiles"`, `query:` the full SQL above.

- [ ] **Step 3: Verify structure**

Run `mcp__plugin_supabase_supabase__list_tables` (`project_id: "yddapkhhniecjnnzrolv"`, `schemas: ["public"]`, `verbose: true`) and confirm `profiles` has exactly the columns above with RLS enabled.

Run `execute_sql`:
```sql
select proname from pg_proc
where proname in ('handle_new_user','current_profile_role','prevent_self_role_change')
order by proname;
```
Expected: all 3 rows returned.

```sql
select tgname from pg_trigger
where tgname in ('trg_handle_new_user','trg_prevent_self_role_change')
order by tgname;
```
Expected: both rows returned.

- [ ] **Step 4: Stage**

```bash
git add supabase/migrations/20260813120000_profiles.sql
```
Do not commit.

---

### Task 2: Categories (self-referencing hierarchy)

**Files:**
- Create: `supabase/migrations/20260813120100_categories.sql`

**Interfaces:**
- Consumes: nothing new.
- Produces: `public.categories(id, parent_id, name, slug, sort_order, active, created_at)`.

- [ ] **Step 1: Write the migration**

```sql
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete set null,
  name jsonb not null,
  slug text not null unique,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_categories_parent_id on public.categories(parent_id);
alter table public.categories enable row level security;
```

- [ ] **Step 2: Apply**

`apply_migration` with `name: "categories"`, `project_id: "yddapkhhniecjnnzrolv"`.

- [ ] **Step 3: Verify**

```sql
insert into public.categories (name, slug) values ('{"en":"__test__","ar":"__test__"}', '__test_parent__')
returning id;
```
Note the returned id, then:
```sql
insert into public.categories (parent_id, name, slug)
values ((select id from public.categories where slug = '__test_parent__'), '{"en":"__test_child__","ar":"__test_child__"}', '__test_child__');

select c.slug, p.slug as parent_slug
from public.categories c join public.categories p on p.id = c.parent_id
where c.slug = '__test_child__';
```
Expected: one row, `parent_slug = '__test_parent__'`, proving the self-reference works.

Clean up:
```sql
delete from public.categories where slug in ('__test_child__','__test_parent__');
```

- [ ] **Step 4: Stage**

```bash
git add supabase/migrations/20260813120100_categories.sql
```

---

### Task 3: Sizes, tiers, size_tiers

**Files:**
- Create: `supabase/migrations/20260813120200_sizes_tiers.sql`

**Interfaces:**
- Consumes: `public.categories(id)` from Task 2.
- Produces: `public.sizes(id, category_id, min_qty, max_qty, unit, price_modifier, sort_order, active, created_at)`; `public.tiers(id, tier_count, price_modifier, active)`; `public.size_tiers(size_id, tier_id)`.

- [ ] **Step 1: Write the migration**

```sql
create table public.sizes (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id),
  min_qty int not null,
  max_qty int not null,
  unit text not null check (unit in ('servings','quantity','cm')),
  price_modifier numeric(10,2) not null default 0,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (category_id, min_qty, max_qty)
);
create index idx_sizes_category_id on public.sizes(category_id);
alter table public.sizes enable row level security;

create table public.tiers (
  id uuid primary key default gen_random_uuid(),
  tier_count int not null unique check (tier_count between 2 and 6),
  price_modifier numeric(10,2) not null default 0,
  active boolean not null default true
);
alter table public.tiers enable row level security;

create table public.size_tiers (
  size_id uuid not null references public.sizes(id) on delete cascade,
  tier_id uuid not null references public.tiers(id) on delete cascade,
  primary key (size_id, tier_id)
);
alter table public.size_tiers enable row level security;
```

- [ ] **Step 2: Apply**

`apply_migration` with `name: "sizes_tiers"`.

- [ ] **Step 3: Verify**

```sql
select column_name, data_type from information_schema.columns
where table_schema='public' and table_name='sizes' order by ordinal_position;
```
Confirm the 9 columns above.

```sql
insert into public.tiers (tier_count) values (99) returning id;
```
Expected: **fails** with a check-constraint violation (99 not between 2 and 6) — confirms the constraint works. No cleanup needed since it fails.

- [ ] **Step 4: Stage**

```bash
git add supabase/migrations/20260813120200_sizes_tiers.sql
```

---

### Task 4: Catalog options — flavors, colors, shapes, toppers

**Files:**
- Create: `supabase/migrations/20260813120300_catalog_options.sql`

**Interfaces:**
- Produces: `public.flavors(id, name, price_modifier, active, sort_order)`; `public.colors(id, name, hex_code, active, sort_order)`; `public.shapes(id, name, active, sort_order)`; `public.toppers(id, name, price_modifier, has_color_variants, active, sort_order)`; `public.topper_colors(topper_id, color_id)`.

- [ ] **Step 1: Write the migration**

```sql
create table public.flavors (
  id uuid primary key default gen_random_uuid(),
  name jsonb not null,
  price_modifier numeric(10,2) not null default 0,
  active boolean not null default true,
  sort_order int not null default 0
);
alter table public.flavors enable row level security;

create table public.colors (
  id uuid primary key default gen_random_uuid(),
  name jsonb not null,
  hex_code text,
  active boolean not null default true,
  sort_order int not null default 0
);
alter table public.colors enable row level security;

create table public.shapes (
  id uuid primary key default gen_random_uuid(),
  name jsonb not null,
  active boolean not null default true,
  sort_order int not null default 0
);
alter table public.shapes enable row level security;

create table public.toppers (
  id uuid primary key default gen_random_uuid(),
  name jsonb not null,
  price_modifier numeric(10,2) not null default 0,
  has_color_variants boolean not null default false,
  active boolean not null default true,
  sort_order int not null default 0
);
alter table public.toppers enable row level security;

create table public.topper_colors (
  topper_id uuid not null references public.toppers(id) on delete cascade,
  color_id uuid not null references public.colors(id) on delete cascade,
  primary key (topper_id, color_id)
);
alter table public.topper_colors enable row level security;
```

- [ ] **Step 2: Apply**

`apply_migration` with `name: "catalog_options"`.

- [ ] **Step 3: Verify**

`list_tables` (verbose) — confirm all 5 tables exist with RLS enabled and the FK on `topper_colors` points at `toppers`/`colors`.

- [ ] **Step 4: Stage**

```bash
git add supabase/migrations/20260813120300_catalog_options.sql
```

---

### Task 5: Cakes and their catalog joins

**Files:**
- Create: `supabase/migrations/20260813120400_cakes.sql`

**Interfaces:**
- Consumes: `categories(id)`, `flavors(id)`, `colors(id)`, `toppers(id)`.
- Produces: `public.cakes(id, category_id, name, description, base_price, primary_image_url, featured, active, sort_order, created_at, updated_at)`; `public.cake_images`; `public.cake_flavors`; `public.cake_colors`; `public.cake_toppers`.

- [ ] **Step 1: Write the migration**

```sql
create table public.cakes (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id),
  name jsonb not null,
  description jsonb,
  base_price numeric(10,2) not null default 0,
  primary_image_url text,
  featured boolean not null default false,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_cakes_category_id on public.cakes(category_id);
alter table public.cakes enable row level security;

create table public.cake_images (
  id uuid primary key default gen_random_uuid(),
  cake_id uuid not null references public.cakes(id) on delete cascade,
  url text not null,
  sort_order int not null default 0
);
alter table public.cake_images enable row level security;

create table public.cake_flavors (
  cake_id uuid not null references public.cakes(id) on delete cascade,
  flavor_id uuid not null references public.flavors(id) on delete cascade,
  primary key (cake_id, flavor_id)
);
alter table public.cake_flavors enable row level security;

create table public.cake_colors (
  cake_id uuid not null references public.cakes(id) on delete cascade,
  color_id uuid not null references public.colors(id) on delete cascade,
  primary key (cake_id, color_id)
);
alter table public.cake_colors enable row level security;

create table public.cake_toppers (
  cake_id uuid not null references public.cakes(id) on delete cascade,
  topper_id uuid not null references public.toppers(id) on delete cascade,
  primary key (cake_id, topper_id)
);
alter table public.cake_toppers enable row level security;
```

- [ ] **Step 2: Apply**

`apply_migration` with `name: "cakes"`.

- [ ] **Step 3: Verify**

```sql
insert into public.cakes (category_id, name, base_price)
select id, '{"en":"__test__","ar":"__test__"}', 100
from public.categories where slug = 'birthday'
returning id;
```
```sql
insert into public.cake_flavors (cake_id, flavor_id)
select (select id from public.cakes where name->>'en' = '__test__'), id
from public.flavors limit 0;
```
(No flavors exist yet — this confirms the insert runs without error against zero matching rows, i.e. the join table accepts the shape correctly.) Clean up:
```sql
delete from public.cakes where name->>'en' = '__test__';
```

- [ ] **Step 4: Stage**

```bash
git add supabase/migrations/20260813120400_cakes.sql
```

---

### Task 6: Delivery areas and calendar blocks

**Files:**
- Create: `supabase/migrations/20260813120500_delivery.sql`

**Interfaces:**
- Consumes: `profiles(id)` (for `created_by`).
- Produces: `public.delivery_areas(id, name, price, active, sort_order)`; `public.delivery_calendar_blocks(id, blocked_date, reason, created_by, created_at)`.

- [ ] **Step 1: Write the migration**

```sql
create table public.delivery_areas (
  id uuid primary key default gen_random_uuid(),
  name jsonb not null,
  price numeric(10,2) not null default 0,
  active boolean not null default true,
  sort_order int not null default 0
);
alter table public.delivery_areas enable row level security;

create table public.delivery_calendar_blocks (
  id uuid primary key default gen_random_uuid(),
  blocked_date date not null unique,
  reason text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
alter table public.delivery_calendar_blocks enable row level security;
```

- [ ] **Step 2: Apply**

`apply_migration` with `name: "delivery"`.

- [ ] **Step 3: Verify**

```sql
insert into public.delivery_calendar_blocks (blocked_date, reason) values ('2026-12-25', '__test__') returning id;
insert into public.delivery_calendar_blocks (blocked_date, reason) values ('2026-12-25', '__test_dup__');
```
Expected: second insert **fails** on the unique constraint. Clean up:
```sql
delete from public.delivery_calendar_blocks where reason = '__test__';
```

- [ ] **Step 4: Stage**

```bash
git add supabase/migrations/20260813120500_delivery.sql
```

---

### Task 7: Promo codes (table only — redemptions come after `orders` exists)

**Files:**
- Create: `supabase/migrations/20260813120600_promo_codes.sql`

**Interfaces:**
- Produces: `public.promo_codes(id, code, discount_type, discount_value, min_order_amount, expiry_date, redemption_cap, active, created_at)`.

- [ ] **Step 1: Write the migration**

```sql
create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('fixed','percentage')),
  discount_value numeric(10,2) not null,
  min_order_amount numeric(10,2),
  expiry_date date,
  redemption_cap int,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.promo_codes enable row level security;
```

- [ ] **Step 2: Apply**

`apply_migration` with `name: "promo_codes"`.

- [ ] **Step 3: Verify**

```sql
insert into public.promo_codes (code, discount_type, discount_value) values ('__TEST__', 'bogus', 10);
```
Expected: **fails** on the `discount_type` check constraint.

- [ ] **Step 4: Stage**

```bash
git add supabase/migrations/20260813120600_promo_codes.sql
```

---

### Task 8: Orders, order items, order item flavors

**Files:**
- Create: `supabase/migrations/20260813120700_orders.sql`

**Interfaces:**
- Consumes: `profiles(id)`, `delivery_areas(id)`, `promo_codes(id)`, `cakes(id)`, `sizes(id)`, `tiers(id)`, `shapes(id)`, `colors(id)`, `toppers(id)`, `flavors(id)`.
- Produces: `public.orders(...)`; `public.order_items(...)`; `public.order_item_flavors(order_item_id, flavor_id, position)`.

- [ ] **Step 1: Write the migration**

```sql
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.profiles(id),
  guest_name text,
  guest_phone text,
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled','completed')),
  fulfillment_type text not null check (fulfillment_type in ('delivery','pickup')),
  delivery_area_id uuid references public.delivery_areas(id),
  delivery_address text,
  fulfillment_date date not null,
  promo_code_id uuid references public.promo_codes(id),
  subtotal_estimate numeric(10,2) not null default 0,
  delivery_price numeric(10,2) not null default 0,
  discount_amount numeric(10,2) not null default 0,
  final_price numeric(10,2),
  notes text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  check (customer_id is not null or (guest_name is not null and guest_phone is not null))
);
create index idx_orders_status on public.orders(status);
create index idx_orders_fulfillment_date on public.orders(fulfillment_date);
alter table public.orders enable row level security;

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  cake_id uuid not null references public.cakes(id) on delete restrict,
  size_id uuid not null references public.sizes(id),
  tier_id uuid references public.tiers(id),
  shape_id uuid not null references public.shapes(id),
  color_id uuid not null references public.colors(id),
  is_fifty_fifty boolean not null default false,
  topper_id uuid references public.toppers(id),
  topper_color_id uuid references public.colors(id),
  text_on_cake text,
  text_on_board text,
  notes text,
  quantity int not null default 1,
  unit_base_price numeric(10,2) not null,
  price_modifiers_total numeric(10,2) not null default 0,
  line_estimate numeric(10,2) not null,
  created_at timestamptz not null default now()
);
create index idx_order_items_order_id on public.order_items(order_id);
create index idx_order_items_cake_id on public.order_items(cake_id);
alter table public.order_items enable row level security;

create table public.order_item_flavors (
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  flavor_id uuid not null references public.flavors(id),
  position smallint not null default 1 check (position in (1,2)),
  primary key (order_item_id, position)
);
create index idx_order_item_flavors_order_item_id on public.order_item_flavors(order_item_id);
alter table public.order_item_flavors enable row level security;
```

- [ ] **Step 2: Apply**

`apply_migration` with `name: "orders"`.

- [ ] **Step 3: Verify**

```sql
-- Neither customer_id nor guest info: must fail the check constraint.
insert into public.orders (fulfillment_type, fulfillment_date) values ('pickup', '2026-09-01');
```
Expected: **fails**.

```sql
-- Guest order: must succeed.
insert into public.orders (guest_name, guest_phone, fulfillment_type, fulfillment_date)
values ('__test__', '01000000000', 'pickup', '2026-09-01')
returning id;
```
Expected: succeeds. Clean up:
```sql
delete from public.orders where guest_name = '__test__';
```

- [ ] **Step 4: Stage**

```bash
git add supabase/migrations/20260813120700_orders.sql
```

---

### Task 9: Promo code redemptions + concurrency-safe cap trigger

**Files:**
- Create: `supabase/migrations/20260813120800_promo_code_redemptions.sql`

**Interfaces:**
- Consumes: `promo_codes(id, code, active, expiry_date, redemption_cap)`, `orders(id)`.
- Produces: `public.promo_code_redemptions(id, promo_code_id, order_id, created_at)`; `public.check_promo_redemption_cap()` trigger function; `trg_check_promo_redemption_cap`.

- [ ] **Step 1: Write the migration**

```sql
create table public.promo_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references public.promo_codes(id),
  order_id uuid not null references public.orders(id),
  created_at timestamptz not null default now(),
  unique (order_id)
);
create index idx_promo_code_redemptions_promo_code_id on public.promo_code_redemptions(promo_code_id);
alter table public.promo_code_redemptions enable row level security;

create or replace function public.check_promo_redemption_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promo record;
  v_count int;
begin
  select * into v_promo from public.promo_codes where id = new.promo_code_id for update;

  if not found then
    raise exception 'Promo code % not found', new.promo_code_id;
  end if;

  if not v_promo.active then
    raise exception 'Promo code % is not active', v_promo.code;
  end if;

  if v_promo.expiry_date is not null and v_promo.expiry_date < current_date then
    raise exception 'Promo code % has expired', v_promo.code;
  end if;

  if v_promo.redemption_cap is not null then
    select count(*) into v_count
    from public.promo_code_redemptions
    where promo_code_id = new.promo_code_id;

    if v_count >= v_promo.redemption_cap then
      raise exception 'Promo code % has reached its redemption cap', v_promo.code;
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_check_promo_redemption_cap
before insert on public.promo_code_redemptions
for each row execute function public.check_promo_redemption_cap();
```

- [ ] **Step 2: Apply**

`apply_migration` with `name: "promo_code_redemptions"`.

- [ ] **Step 3: Verify the cap trigger behaviorally**

```sql
insert into public.promo_codes (code, discount_type, discount_value, redemption_cap)
values ('__TESTCAP__', 'fixed', 50, 1) returning id;

insert into public.orders (guest_name, guest_phone, fulfillment_type, fulfillment_date)
values ('__test1__', '01000000001', 'pickup', '2026-09-01') returning id;

insert into public.orders (guest_name, guest_phone, fulfillment_type, fulfillment_date)
values ('__test2__', '01000000002', 'pickup', '2026-09-01') returning id;

insert into public.promo_code_redemptions (promo_code_id, order_id)
values (
  (select id from public.promo_codes where code = '__TESTCAP__'),
  (select id from public.orders where guest_name = '__test1__')
);
```
Expected: succeeds (first redemption, cap is 1).

```sql
insert into public.promo_code_redemptions (promo_code_id, order_id)
values (
  (select id from public.promo_codes where code = '__TESTCAP__'),
  (select id from public.orders where guest_name = '__test2__')
);
```
Expected: **fails** with "has reached its redemption cap" — proves the cap is enforced.

Clean up:
```sql
delete from public.promo_code_redemptions where promo_code_id = (select id from public.promo_codes where code = '__TESTCAP__');
delete from public.orders where guest_name in ('__test1__','__test2__');
delete from public.promo_codes where code = '__TESTCAP__';
```

- [ ] **Step 4: Stage**

```bash
git add supabase/migrations/20260813120800_promo_code_redemptions.sql
```

---

### Task 10: Expense categories and expenses

**Files:**
- Create: `supabase/migrations/20260813120900_expenses.sql`

**Interfaces:**
- Consumes: `profiles(id)`.
- Produces: `public.expense_categories(id, name, active)`; `public.expenses(id, category_id, amount, expense_date, description, created_by, created_at)`.

- [ ] **Step 1: Write the migration**

```sql
create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  name jsonb not null,
  active boolean not null default true
);
alter table public.expense_categories enable row level security;

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.expense_categories(id),
  amount numeric(10,2) not null,
  expense_date date not null,
  description text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index idx_expenses_category_id on public.expenses(category_id);
create index idx_expenses_expense_date on public.expenses(expense_date);
alter table public.expenses enable row level security;
```

- [ ] **Step 2: Apply**

`apply_migration` with `name: "expenses"`.

- [ ] **Step 3: Verify**

`list_tables` (verbose) — confirm both tables exist, `expenses.category_id` FK points to `expense_categories.id`, RLS enabled on both.

- [ ] **Step 4: Stage**

```bash
git add supabase/migrations/20260813120900_expenses.sql
```

---

### Task 11: Audit log + generic trigger, attached to every admin/accountant-mutable table

**Files:**
- Create: `supabase/migrations/20260813121000_audit_log.sql`

**Interfaces:**
- Consumes: `profiles(id)` and every table listed in Step 1's `DO` block.
- Produces: `public.audit_log(id, actor_id, table_name, row_id, action, old_data, new_data, created_at)`; `public.fn_audit_log()`; a `trg_audit_<table>` trigger on each listed table.

- [ ] **Step 1: Write the migration**

```sql
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  table_name text not null,
  row_id uuid,
  action text not null check (action in ('insert','update','delete')),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index idx_audit_log_table_row on public.audit_log(table_name, row_id);
alter table public.audit_log enable row level security;

create or replace function public.fn_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new jsonb;
  v_old jsonb;
  v_row_id uuid;
begin
  if TG_OP = 'DELETE' then
    v_old := to_jsonb(OLD);
    v_new := null;
  elsif TG_OP = 'INSERT' then
    v_old := null;
    v_new := to_jsonb(NEW);
  else
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
  end if;

  v_row_id := nullif(coalesce(v_new->>'id', v_old->>'id'), '')::uuid;

  insert into public.audit_log (actor_id, table_name, row_id, action, old_data, new_data)
  values (auth.uid(), TG_TABLE_NAME, v_row_id, lower(TG_OP), v_old, v_new);

  if TG_OP = 'DELETE' then
    return OLD;
  else
    return NEW;
  end if;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'categories','sizes','tiers','size_tiers','cakes','cake_images',
    'flavors','colors','shapes','toppers','topper_colors',
    'cake_flavors','cake_colors','cake_toppers',
    'orders','order_items','order_item_flavors',
    'promo_codes','delivery_areas','delivery_calendar_blocks',
    'expense_categories','expenses','profiles'
  ]
  loop
    execute format(
      'create trigger trg_audit_%1$s after insert or update or delete on public.%1$s for each row execute function public.fn_audit_log();',
      t
    );
  end loop;
end $$;
```

- [ ] **Step 2: Apply**

`apply_migration` with `name: "audit_log"`.

- [ ] **Step 3: Verify behaviorally**

```sql
insert into public.shapes (name) values ('{"en":"__test__","ar":"__test__"}') returning id;
update public.shapes set name = '{"en":"__test2__","ar":"__test2__"}' where name->>'en' = '__test__';
delete from public.shapes where name->>'en' = '__test2__';

select action, table_name from public.audit_log
where table_name = 'shapes' and (old_data->>'en' = '__test__' or new_data->>'en' in ('__test__','__test2__') or old_data->>'en'='__test2__')
order by created_at;
```
Wait — simpler and more reliable: query by the row_id captured from the insert.
```sql
select action from public.audit_log where table_name = 'shapes'
order by created_at desc limit 3;
```
Expected: 3 rows, actions `delete`, `update`, `insert` (most recent first).

Clean up the audit rows so the log stays real-data-only before real usage:
```sql
delete from public.audit_log where table_name = 'shapes' and new_data->>'en' in ('__test__','__test2__');
delete from public.audit_log where table_name = 'shapes' and old_data->>'en' in ('__test__','__test2__');
```

- [ ] **Step 4: Stage**

```bash
git add supabase/migrations/20260813121000_audit_log.sql
```

---

### Task 12: Newsletter subscribers

**Files:**
- Create: `supabase/migrations/20260813121100_newsletter.sql`

**Interfaces:**
- Produces: `public.newsletter_subscribers(id, phone, opted_in_at, active)`.

- [ ] **Step 1: Write the migration**

```sql
create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  opted_in_at timestamptz not null default now(),
  active boolean not null default true
);
alter table public.newsletter_subscribers enable row level security;
```

- [ ] **Step 2: Apply**

`apply_migration` with `name: "newsletter"`.

- [ ] **Step 3: Verify**

```sql
insert into public.newsletter_subscribers (phone) values ('__test_phone__');
insert into public.newsletter_subscribers (phone) values ('__test_phone__');
```
Expected: second insert **fails** (unique). Clean up:
```sql
delete from public.newsletter_subscribers where phone = '__test_phone__';
```

- [ ] **Step 4: Stage**

```bash
git add supabase/migrations/20260813121100_newsletter.sql
```

---

### Task 13: RLS — public/anon reads and guest/customer self-service writes

**Files:**
- Create: `supabase/migrations/20260813121200_rls_public.sql`

**Interfaces:**
- Consumes: `public.current_profile_role()` from Task 1; every table created in Tasks 2–12.
- Produces: SELECT policies on catalog tables; INSERT/SELECT policies on `orders`/`order_items`/`order_item_flavors`/`promo_code_redemptions`; INSERT policy on `newsletter_subscribers`; self-access policies on `profiles`.

- [ ] **Step 1: Write the migration**

```sql
-- Catalog tables with an `active` flag: readers see only active rows.
do $$
declare
  t text;
begin
  foreach t in array array[
    'categories','sizes','tiers','flavors','colors','shapes','toppers','cakes','delivery_areas'
  ]
  loop
    execute format(
      'create policy public_read_active on public.%1$s for select using (active = true);',
      t
    );
  end loop;
end $$;

-- Join/detail tables have no active flag of their own; the parent row
-- already governs relevance, so allow open reads here.
do $$
declare
  t text;
begin
  foreach t in array array[
    'size_tiers','cake_images','cake_flavors','cake_colors','cake_toppers',
    'topper_colors','delivery_calendar_blocks'
  ]
  loop
    execute format(
      'create policy public_read_all on public.%1$s for select using (true);',
      t
    );
  end loop;
end $$;

-- Promo codes: anyone can look up an active, unexpired code to validate it
-- at checkout (addition beyond the original spec RLS section — see plan's
-- Global Constraints note).
create policy public_read_active_promo on public.promo_codes
for select
using (active = true and (expiry_date is null or expiry_date >= current_date));

-- Orders: guests (customer_id null) and authenticated customers (their own
-- customer_id) may create orders. Nobody but admin/accountant can read
-- them here — that grant lands in the next migration.
create policy orders_insert on public.orders
for insert
with check (customer_id is null or customer_id = auth.uid());

create policy orders_select_own on public.orders
for select
using (auth.uid() is not null and customer_id = auth.uid());

create policy order_items_insert on public.order_items
for insert
with check (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.customer_id is null or o.customer_id = auth.uid())
  )
);

create policy order_items_select_own on public.order_items
for select
using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and auth.uid() is not null
      and o.customer_id = auth.uid()
  )
);

create policy order_item_flavors_insert on public.order_item_flavors
for insert
with check (
  exists (
    select 1 from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.id = order_item_id
      and (o.customer_id is null or o.customer_id = auth.uid())
  )
);

create policy order_item_flavors_select_own on public.order_item_flavors
for select
using (
  exists (
    select 1 from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.id = order_item_id
      and auth.uid() is not null
      and o.customer_id = auth.uid()
  )
);

create policy promo_code_redemptions_insert on public.promo_code_redemptions
for insert
with check (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.customer_id is null or o.customer_id = auth.uid())
  )
);

-- Newsletter: anyone can subscribe; nobody can read the list back here.
create policy newsletter_insert on public.newsletter_subscribers
for insert
with check (true);

-- Profiles: any authenticated user manages only their own row. Role
-- changes are additionally guarded by trg_prevent_self_role_change.
create policy profiles_select_own on public.profiles
for select
using (auth.uid() = id);

create policy profiles_update_own on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);
```

- [ ] **Step 2: Apply**

`apply_migration` with `name: "rls_public"`.

- [ ] **Step 3: Verify via policy introspection**

```sql
select tablename, policyname, cmd from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```
Confirm every policy named above appears against the right table.

Run `get_advisors` with `type: "security"` and confirm no finding says a table from Tasks 2–12 has RLS enabled with zero policies (that would mean a policy failed to apply) — some tables (e.g. `expense_categories`, `audit_log`) are *expected* to still show as fully locked until Task 14, that's fine.

- [ ] **Step 4: Stage**

```bash
git add supabase/migrations/20260813121200_rls_public.sql
```

---

### Task 14: RLS — admin and accountant policies

**Files:**
- Create: `supabase/migrations/20260813121300_rls_admin_accountant.sql`

**Interfaces:**
- Consumes: `public.current_profile_role()`.
- Produces: `admin_all` policy on every table except `audit_log`; `accountant_read` policy on orders/promo/delivery tables; `accountant_all` on expense tables; `audit_log_admin_read`.

- [ ] **Step 1: Write the migration**

```sql
-- Admins have full CRUD on every table except audit_log (append-only,
-- trigger-populated — no policy grants direct writes to it for anyone).
do $$
declare
  t text;
begin
  foreach t in array array[
    'categories','sizes','tiers','size_tiers','flavors','colors','shapes',
    'toppers','topper_colors','cakes','cake_images','cake_flavors','cake_colors','cake_toppers',
    'delivery_areas','delivery_calendar_blocks','promo_codes','promo_code_redemptions',
    'orders','order_items','order_item_flavors','expense_categories','expenses',
    'newsletter_subscribers','profiles'
  ]
  loop
    execute format(
      'create policy admin_all on public.%1$s for all using (public.current_profile_role() = %2$L) with check (public.current_profile_role() = %2$L);',
      t, 'admin'
    );
  end loop;
end $$;

-- Accountants: read-only on orders and money-adjacent catalog context,
-- full control of expenses (their actual domain). No catalog write access,
-- per ARCHITECTURE.md's role definition.
do $$
declare
  t text;
begin
  foreach t in array array[
    'orders','order_items','order_item_flavors',
    'promo_codes','promo_code_redemptions','delivery_areas'
  ]
  loop
    execute format(
      'create policy accountant_read on public.%1$s for select using (public.current_profile_role() = %2$L);',
      t, 'accountant'
    );
  end loop;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array['expense_categories','expenses']
  loop
    execute format(
      'create policy accountant_all on public.%1$s for all using (public.current_profile_role() = %2$L) with check (public.current_profile_role() = %2$L);',
      t, 'accountant'
    );
  end loop;
end $$;

-- Audit log: admin can read history; nobody (including admin) writes to it
-- directly — only fn_audit_log(), running as the migration owner, does.
create policy audit_log_admin_read on public.audit_log
for select
using (public.current_profile_role() = 'admin');
```

- [ ] **Step 2: Apply**

`apply_migration` with `name: "rls_admin_accountant"`.

- [ ] **Step 3: Verify**

```sql
select tablename, policyname, cmd from pg_policies
where schemaname = 'public' and policyname in ('admin_all','accountant_read','accountant_all','audit_log_admin_read')
order by tablename;
```
Confirm: `admin_all` on all 25 tables except `audit_log`; `accountant_read` on the 6 listed tables; `accountant_all` on `expense_categories`/`expenses`; `audit_log_admin_read` on `audit_log`.

Run `get_advisors` with `type: "security"` — confirm zero remaining findings of the form "RLS enabled, no policies" across every table in the schema.

- [ ] **Step 4: Stage**

```bash
git add supabase/migrations/20260813121300_rls_admin_accountant.sql
```

---

### Task 15: Seed script — reference/lookup data

**Files:**
- Create: `supabase/seed.sql`

**Interfaces:**
- Consumes: every table from Tasks 2–10 (categories, sizes, tiers, size_tiers, shapes, flavors, colors, expense_categories).
- Produces: populated rows in those tables. No `cakes`, `promo_codes`, or `orders` rows (explicitly out of scope per the spec).

- [ ] **Step 1: Write the seed file**

```sql
-- Categories: top-level + Candy Corner's three subcategories.
insert into public.categories (name, slug, sort_order) values
  ('{"en":"Birthday","ar":"عيد ميلاد"}', 'birthday', 1),
  ('{"en":"Wedding","ar":"زفاف"}', 'wedding', 2),
  ('{"en":"Graduation","ar":"تخرج"}', 'graduation', 3),
  ('{"en":"Bento","ar":"بينتو"}', 'bento', 4),
  ('{"en":"Custom","ar":"مخصص"}', 'custom', 5),
  ('{"en":"Fake","ar":"وهمية"}', 'fake', 6),
  ('{"en":"Candy Corner","ar":"ركن الحلوى"}', 'candy-corner', 7);

insert into public.categories (parent_id, name, slug, sort_order)
select id, '{"en":"Cupcakes","ar":"كب كيك"}', 'cupcakes', 1 from public.categories where slug = 'candy-corner'
union all
select id, '{"en":"Cake Pops","ar":"كيك بوبس"}', 'pops', 2 from public.categories where slug = 'candy-corner'
union all
select id, '{"en":"Popsicles","ar":"بوبسيكل"}', 'popsicles', 3 from public.categories where slug = 'candy-corner';

-- Sizes: birthday, graduation, custom share the same serving ranges.
insert into public.sizes (category_id, min_qty, max_qty, unit, sort_order)
select c.id, r.min_qty, r.max_qty, 'servings', r.sort_order
from public.categories c
cross join (values
  (4, 6, 1), (8, 10, 2), (12, 15, 3), (17, 21, 4),
  (24, 30, 5), (34, 40, 6), (45, 55, 7), (60, 70, 8)
) as r(min_qty, max_qty, sort_order)
where c.slug in ('birthday', 'graduation', 'custom');

-- Wedding: same ranges plus two larger tiers.
insert into public.sizes (category_id, min_qty, max_qty, unit, sort_order)
select c.id, r.min_qty, r.max_qty, 'servings', r.sort_order
from public.categories c
cross join (values
  (4, 6, 1), (8, 10, 2), (12, 15, 3), (17, 21, 4),
  (24, 30, 5), (34, 40, 6), (45, 55, 7), (60, 70, 8),
  (80, 90, 9), (100, 120, 10)
) as r(min_qty, max_qty, sort_order)
where c.slug = 'wedding';

-- Bento: single-number sizes (2 people, 3 people).
insert into public.sizes (category_id, min_qty, max_qty, unit, sort_order)
select c.id, r.n, r.n, 'servings', r.sort_order
from public.categories c
cross join (values (2, 1), (3, 2)) as r(n, sort_order)
where c.slug = 'bento';

-- Candy Corner - Cupcakes: 6, then 12-step increments up to 996.
insert into public.sizes (category_id, min_qty, max_qty, unit, sort_order)
select c.id, 6, 6, 'quantity', 0
from public.categories c where c.slug = 'cupcakes'
union all
select c.id, n, n, 'quantity', (n / 12)
from public.categories c, generate_series(12, 996, 12) as n
where c.slug = 'cupcakes';

-- Candy Corner - Pops / Popsicles: 12-step increments up to 996.
insert into public.sizes (category_id, min_qty, max_qty, unit, sort_order)
select c.id, n, n, 'quantity', (n / 12)
from public.categories c, generate_series(12, 996, 12) as n
where c.slug in ('pops', 'popsicles');

-- Tiers: 2 through 6 (Fake cakes may use 5-6 once their sizes exist).
insert into public.tiers (tier_count) values (2), (3), (4), (5), (6);

-- size_tiers: birthday/wedding/graduation/custom — 24>30 unlocks {2,3};
-- 34>40 and every larger size unlocks {2,3,4}. Bento and Fake get none yet.
insert into public.size_tiers (size_id, tier_id)
select s.id, t.id
from public.sizes s
join public.categories c on c.id = s.category_id
join public.tiers t on t.tier_count in (2, 3)
where c.slug in ('birthday', 'wedding', 'graduation', 'custom')
  and s.min_qty = 24;

insert into public.size_tiers (size_id, tier_id)
select s.id, t.id
from public.sizes s
join public.categories c on c.id = s.category_id
join public.tiers t on t.tier_count in (2, 3, 4)
where c.slug in ('birthday', 'wedding', 'graduation', 'custom')
  and s.min_qty >= 34;

-- Shapes
insert into public.shapes (name, sort_order) values
  ('{"en":"Circle","ar":"دائري"}', 1),
  ('{"en":"Heart","ar":"قلب"}', 2),
  ('{"en":"Square","ar":"مربع"}', 3),
  ('{"en":"Rectangle","ar":"مستطيل"}', 4);

-- Flavors (Candy Corner cakes should only ever link to Vanilla + Chocolate
-- via cake_flavors once real products are entered — enforced at the admin
-- UI in Phase 5, not here, since this seed creates no cake rows).
insert into public.flavors (name, sort_order) values
  ('{"en":"Vanilla","ar":"فانيليا"}', 1),
  ('{"en":"Chocolate","ar":"شوكولاتة"}', 2),
  ('{"en":"Ferrero Rocher","ar":"فيريرو روشيه"}', 3),
  ('{"en":"Blueberry","ar":"توت أزرق"}', 4),
  ('{"en":"Raspberry","ar":"توت العليق"}', 5),
  ('{"en":"Dulce de Leche","ar":"دولسي دي ليتشي"}', 6),
  ('{"en":"Caramel","ar":"كراميل"}', 7),
  ('{"en":"Oreo","ar":"أوريو"}', 8),
  ('{"en":"Chocolate Spread","ar":"شوكولاتة قابلة للدهن"}', 9),
  ('{"en":"Chocolate Chips","ar":"رقائق شوكولاتة"}', 10),
  ('{"en":"Strawberry","ar":"فراولة"}', 11),
  ('{"en":"Mango","ar":"مانجو"}', 12);

-- Colors (~30 common cake colors)
insert into public.colors (name, hex_code, sort_order) values
  ('{"en":"White","ar":"أبيض"}', '#FFFFFF', 1),
  ('{"en":"Ivory","ar":"عاجي"}', '#FFFFF0', 2),
  ('{"en":"Black","ar":"أسود"}', '#000000', 3),
  ('{"en":"Red","ar":"أحمر"}', '#E53935', 4),
  ('{"en":"Burgundy","ar":"عنابي"}', '#800020', 5),
  ('{"en":"Pink","ar":"وردي"}', '#F8BBD0', 6),
  ('{"en":"Hot Pink","ar":"وردي فاقع"}', '#FF69B4', 7),
  ('{"en":"Rose Gold","ar":"ذهبي وردي"}', '#B76E79', 8),
  ('{"en":"Orange","ar":"برتقالي"}', '#FB8C00', 9),
  ('{"en":"Peach","ar":"خوخي"}', '#FFDAB9', 10),
  ('{"en":"Yellow","ar":"أصفر"}', '#FDD835', 11),
  ('{"en":"Gold","ar":"ذهبي"}', '#D4AF37', 12),
  ('{"en":"Mustard","ar":"خردلي"}', '#E1AD01', 13),
  ('{"en":"Green","ar":"أخضر"}', '#43A047', 14),
  ('{"en":"Mint Green","ar":"أخضر نعناعي"}', '#98FF98', 15),
  ('{"en":"Sage Green","ar":"أخضر سيج"}', '#B2AC88', 16),
  ('{"en":"Emerald","ar":"زمردي"}', '#50C878', 17),
  ('{"en":"Teal","ar":"أزرق مخضر"}', '#008080', 18),
  ('{"en":"Turquoise","ar":"فيروزي"}', '#40E0D0', 19),
  ('{"en":"Blue","ar":"أزرق"}', '#1E88E5', 20),
  ('{"en":"Baby Blue","ar":"أزرق فاتح"}', '#89CFF0', 21),
  ('{"en":"Navy","ar":"كحلي"}', '#000080', 22),
  ('{"en":"Purple","ar":"بنفسجي"}', '#8E24AA', 23),
  ('{"en":"Lavender","ar":"لافندر"}', '#E6E6FA', 24),
  ('{"en":"Lilac","ar":"ليلكي"}', '#C8A2C8', 25),
  ('{"en":"Brown","ar":"بني"}', '#6D4C41', 26),
  ('{"en":"Beige","ar":"بيج"}', '#F5F5DC', 27),
  ('{"en":"Silver","ar":"فضي"}', '#C0C0C0', 28),
  ('{"en":"Grey","ar":"رمادي"}', '#9E9E9E', 29),
  ('{"en":"Champagne","ar":"شمبانيا"}', '#F7E7CE', 30);

-- Expense categories
insert into public.expense_categories (name) values
  ('{"en":"Ingredients","ar":"مكونات"}'),
  ('{"en":"Packaging","ar":"تغليف"}'),
  ('{"en":"Delivery","ar":"توصيل"}'),
  ('{"en":"Utilities","ar":"مرافق"}'),
  ('{"en":"Marketing","ar":"تسويق"}');
```

- [ ] **Step 2: Apply the seed data**

This is DML, not DDL, so use `execute_sql` (not `apply_migration`) with `project_id: "yddapkhhniecjnnzrolv"` and the full seed SQL as `query`.

- [ ] **Step 3: Verify counts and shape**

```sql
select slug, parent_id is not null as has_parent from public.categories order by sort_order;
```
Expected: 10 rows — 7 with `has_parent = false`, 3 (`cupcakes`,`pops`,`popsicles`) with `has_parent = true`.

```sql
select c.slug, count(*) from public.sizes s join public.categories c on c.id = s.category_id
group by c.slug order by c.slug;
```
Expected: `birthday`=8, `graduation`=8, `custom`=8, `wedding`=10, `bento`=2, `cupcakes`=84, `pops`=83, `popsicles`=83, no `fake` row.

```sql
select count(*) from public.tiers;  -- expect 5
select c.slug, count(*) from public.size_tiers st
join public.sizes s on s.id = st.size_id
join public.categories c on c.id = s.category_id
group by c.slug order by c.slug;
```
Expected: only `birthday`, `wedding`, `graduation`, `custom` appear (never `bento`, `cupcakes`, `pops`, `popsicles`, `fake`).

```sql
select count(*) from public.shapes;             -- expect 4
select count(*) from public.flavors;            -- expect 12
select count(*) from public.colors;              -- expect 30
select count(*) from public.expense_categories; -- expect 5
```

- [ ] **Step 4: Stage**

```bash
git add supabase/seed.sql
```

---

### Task 16: Final security check, docs update, and commit message

**Files:**
- Modify: `TASKS.md`
- Modify: `ARCHITECTURE.md`

**Interfaces:**
- Consumes: everything from Tasks 1–15.

- [ ] **Step 1: Run a full security advisor scan**

`get_advisors` with `type: "security"`, `project_id: "yddapkhhniecjnnzrolv"`. Confirm zero findings referencing any table created in this plan (`profiles`, `categories`, `sizes`, `tiers`, `size_tiers`, `flavors`, `colors`, `shapes`, `toppers`, `topper_colors`, `cakes`, `cake_images`, `cake_flavors`, `cake_colors`, `cake_toppers`, `delivery_areas`, `delivery_calendar_blocks`, `promo_codes`, `promo_code_redemptions`, `orders`, `order_items`, `order_item_flavors`, `expense_categories`, `expenses`, `audit_log`, `newsletter_subscribers`). If any finding appears (e.g. a missing policy), write and apply a corrective migration before continuing — do not proceed with a known open RLS gap.

- [ ] **Step 2: Update `TASKS.md`**

Check off every Phase 2 item:
```markdown
## Phase 2 — Data model
- [x] Finalize full schema per ARCHITECTURE.md core entities
- [x] Write Supabase migrations
- [x] Set up Row-Level Security policies per role
- [x] Seed script for categories/sizes/flavors/etc. (placeholder data)
```
Also update the Phase 1 line about deferred local dev:
```markdown
  - [ ] `supabase start` (local Docker stack) + `supabase link` — still deferred; Phase 2 migrations were written and applied directly against the hosted project via the Supabase MCP tools instead (see docs/superpowers/plans/2026-08-13-phase2-data-model.md).
```

- [ ] **Step 3: Update `ARCHITECTURE.md`**

Replace the "Core entities" section's stub note and the "Open / to be decided" section to reflect what Phase 2 actually built. Add a new subsection after "Core entities" documenting the tier system and the candy-corner nearest-size UX, and add a pointer to the spec:

```markdown
## Tiers

Birthday, Wedding, Graduation, and Custom cakes can have multiple tiers at larger sizes: no tier choice below the 24>30 size, tiers {2,3} available at 24>30, tiers {2,3,4} available at 34>40 and every larger size. Bento never has tiers. Fake cakes can go up to 6 tiers but their sizes (in cm) and tier thresholds are still TBD from the owner. Tiers are admin-editable and connected to specific sizes (not hardcoded thresholds) via a `size_tiers` join table, so the owner can add/remove tier availability per size from the dashboard without a migration.

## Candy Corner size input (Phase 3 note)

Cupcakes/Pops/Popsicles sizes are discrete quantity rows (cupcakes: 6, then 12-step increments to 996; pops/popsicles: 12-step increments to 996), not a free-typed number. The storefront should let the customer type any number and snap it to the nearest valid size, telling them which two sizes bracket their input (e.g. typing 9 offers "6 or 12").
```

And in "Open / to be decided in later phases", replace:
```markdown
- Exact list of sizes per category (from owner)
- Exact expense categories (from owner)
- Full DB schema and migrations (Phase 2)
```
with:
```markdown
- Fake cake sizes (in cm) and their tier thresholds (owner TBD)
- Real delivery areas and prices (owner TBD)
- Real price modifiers for sizes/flavors/toppers/tiers/cakes (owner TBD, entered via Phase 5/7 admin UI — everything seeds at 0)
- Full DB schema: implemented — see `docs/superpowers/specs/2026-08-13-phase2-data-model-design.md` and `supabase/migrations/`
```

- [ ] **Step 4: Stage and propose the commit message**

```bash
git add TASKS.md ARCHITECTURE.md
git status --short
```

Do not commit. Propose this message to the human:
```
Add Phase 2 data model: schema, RLS, and seed data

Implements the full Phase 2 schema (roles, categories/sizes/tiers,
catalog, orders, promo codes, delivery, expenses, audit log,
newsletter) with role-scoped RLS and a reference-data seed script,
per docs/superpowers/specs/2026-08-13-phase2-data-model-design.md.
```

---

## Self-review notes

- **Spec coverage:** every table, trigger, and RLS grant in the spec has a task. The two spec gaps found during planning (public promo-code SELECT; promo_code_redemptions/newsletter_subscribers excluded from the audit-trigger list) are called out explicitly rather than silently patched.
- **Dependency ordering:** `promo_codes` (Task 7) precedes `orders` (Task 8) because `orders.promo_code_id` references it; `promo_code_redemptions` (Task 9) comes after `orders` because it references both `promo_codes` and `orders`. This reorders the spec's original migration-file list slightly — noted here since the spec's own "Migration file plan" section lists promo codes as one unit; splitting it into two migrations is the correction.
- **Type/name consistency:** `current_profile_role()` (Task 1) is the exact name used in every RLS policy in Tasks 13–14. `fn_audit_log()` (Task 11) matches the trigger definitions in the same task. All FK column names match their source table's PK name (`id`) throughout.
