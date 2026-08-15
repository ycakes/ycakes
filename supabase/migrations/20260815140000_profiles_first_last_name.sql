-- Split profiles.full_name into first_name/last_name (owner decision,
-- Phase 4): every Register/Checkout/Profile mockup collects and displays
-- First Name and Last Name as separate fields, so storing one combined
-- string and splitting on whitespace later would be fragile (breaks for
-- multi-part last names). No customer rows exist yet (no auth flow built
-- until this session), so this is a plain column swap, no backfill needed.

alter table public.profiles rename column full_name to first_name;
alter table public.profiles add column last_name text;

-- Auto-provision now reads the name Register passes via
-- supabase.auth.signUp({ options: { data: { first_name, last_name } } })
-- out of auth.users.raw_user_meta_data, instead of leaving name columns
-- null on every new profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, first_name, last_name)
  values (
    new.id,
    'customer',
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name'
  );
  return new;
end;
$$;
