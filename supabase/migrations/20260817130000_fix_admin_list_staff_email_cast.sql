-- Fix 42804 "structure of query does not match function result type":
-- auth.users.email is varchar, not text, and RETURN QUERY requires an exact
-- type match against the RETURNS TABLE declaration — cast explicitly.
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
    select p.id, p.first_name, p.last_name, au.email::text, p.role, p.created_at
    from public.profiles p
    join auth.users au on au.id = p.id
    where p.role in ('admin', 'accountant')
    order by p.created_at asc;
end;
$$;
