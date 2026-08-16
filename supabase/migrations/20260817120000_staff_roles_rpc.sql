-- Phase 8: Multi-admin account management (/admin/staff). Register-then-
-- promote model — no invite-email flow, an account must already exist via
-- /register before it can be added here. profiles has no email column
-- (email lives on auth.users), so every RPC below joins it directly; that's
-- safe from a security-definer function even though authenticated has no
-- grant on auth.users itself.
--
-- Guardrails are enforced by strengthening the existing
-- prevent_self_role_change trigger (profiles.sql), not just inside these
-- RPCs — that way even a direct profiles.update() (admin_all RLS already
-- permits admins to write profiles directly) can't bypass them. The RPCs
-- are the friendly entry point the UI calls; the trigger is the real
-- enforcement boundary.
create or replace function public.prevent_self_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = old.role then
    return new;
  end if;

  if public.current_profile_role() <> 'admin' then
    raise exception 'Only admins can change a profile role';
  end if;

  if old.id = auth.uid() then
    raise exception 'You cannot change your own role — ask another admin to do it';
  end if;

  if old.role = 'admin' and (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception 'Cannot remove the last remaining admin';
  end if;

  return new;
end;
$$;

-- Looks up profiles/auth.users by email and sets the role directly — used
-- by both "Add Staff Member" and "Edit" (same modal, same fields).
create or replace function public.admin_set_staff_role(p_email text, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if public.current_profile_role() <> 'admin' then
    raise exception 'Only admins can manage staff roles';
  end if;

  if p_role not in ('admin', 'accountant') then
    raise exception 'Invalid role';
  end if;

  select au.id into v_id
  from auth.users au
  where lower(au.email) = lower(trim(p_email))
  limit 1;

  if v_id is null then
    raise exception 'No account found with this email — ask them to register first, then try again';
  end if;

  update public.profiles set role = p_role where id = v_id;
end;
$$;

grant execute on function public.admin_set_staff_role(text, text) to authenticated;

-- Revokes dashboard access (reverts role to 'customer') without touching
-- the underlying account.
create or replace function public.admin_revoke_staff_role(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_profile_role() <> 'admin' then
    raise exception 'Only admins can manage staff roles';
  end if;

  update public.profiles set role = 'customer' where id = p_profile_id;

  if not found then
    raise exception 'Staff member not found';
  end if;
end;
$$;

grant execute on function public.admin_revoke_staff_role(uuid) to authenticated;

-- Lists every admin/accountant profile with their email (from auth.users,
-- otherwise unreachable via the anon/authenticated key).
create or replace function public.admin_list_staff()
returns table (
  id uuid,
  first_name text,
  last_name text,
  email text,
  role text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if public.current_profile_role() <> 'admin' then
    raise exception 'Only admins can view staff accounts';
  end if;

  return query
    select p.id, p.first_name, p.last_name, au.email, p.role, p.created_at
    from public.profiles p
    join auth.users au on au.id = p.id
    where p.role in ('admin', 'accountant')
    order by p.created_at asc;
end;
$$;

grant execute on function public.admin_list_staff() to authenticated;
