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
