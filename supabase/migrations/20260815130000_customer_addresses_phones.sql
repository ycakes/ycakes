-- Saved customer addresses/phones for Phase 4 Checkout/Register/Profile
-- (see ARCHITECTURE.md's "Data model additions needed for Phase 4"). Each
-- capped at 5 rows per customer via a shared trigger function; RLS follows
-- the profiles_select_own/profiles_update_own pattern (own rows only) plus
-- admin_all, matching every other table's convention. No accountant policy
-- -- an accountant's job is orders/expenses/analytics, not a customer's
-- personal address book (see ARCHITECTURE.md's Roles section).

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  label text not null,
  address text not null,
  apartment text,
  created_at timestamptz not null default now()
);
create index idx_customer_addresses_customer_id on public.customer_addresses(customer_id);
alter table public.customer_addresses enable row level security;

create table public.customer_phones (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  phone text not null,
  contact_method text not null check (contact_method in ('call','whatsapp','both')),
  created_at timestamptz not null default now()
);
create index idx_customer_phones_customer_id on public.customer_phones(customer_id);
alter table public.customer_phones enable row level security;

-- Generic cap-enforcement trigger: the row limit is passed as a trigger
-- argument (TG_ARGV[0]) so one function serves both tables instead of two
-- near-identical copies.
create or replace function public.fn_enforce_customer_item_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max int := TG_ARGV[0]::int;
  v_count int;
begin
  execute format('select count(*) from public.%I where customer_id = $1', TG_TABLE_NAME)
    into v_count
    using new.customer_id;

  if v_count >= v_max then
    raise exception 'Maximum of % saved entries already reached', v_max;
  end if;

  return new;
end;
$$;

create trigger trg_customer_addresses_cap
before insert on public.customer_addresses
for each row execute function public.fn_enforce_customer_item_cap(5);

create trigger trg_customer_phones_cap
before insert on public.customer_phones
for each row execute function public.fn_enforce_customer_item_cap(5);

-- RLS: owner-only CRUD, scoped to authenticated (guests can't have saved
-- addresses/phones), (select auth.uid()) per the rls_performance pattern.
create policy customer_addresses_select_own on public.customer_addresses
for select to authenticated
using ((select auth.uid()) = customer_id);

create policy customer_addresses_insert_own on public.customer_addresses
for insert to authenticated
with check ((select auth.uid()) = customer_id);

create policy customer_addresses_update_own on public.customer_addresses
for update to authenticated
using ((select auth.uid()) = customer_id)
with check ((select auth.uid()) = customer_id);

create policy customer_addresses_delete_own on public.customer_addresses
for delete to authenticated
using ((select auth.uid()) = customer_id);

create policy admin_all on public.customer_addresses
for all to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

create policy customer_phones_select_own on public.customer_phones
for select to authenticated
using ((select auth.uid()) = customer_id);

create policy customer_phones_insert_own on public.customer_phones
for insert to authenticated
with check ((select auth.uid()) = customer_id);

create policy customer_phones_update_own on public.customer_phones
for update to authenticated
using ((select auth.uid()) = customer_id)
with check ((select auth.uid()) = customer_id);

create policy customer_phones_delete_own on public.customer_phones
for delete to authenticated
using ((select auth.uid()) = customer_id);

create policy admin_all on public.customer_phones
for all to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

create trigger trg_audit_customer_addresses
after insert or update or delete on public.customer_addresses
for each row execute function public.fn_audit_log();

create trigger trg_audit_customer_phones
after insert or update or delete on public.customer_phones
for each row execute function public.fn_audit_log();
