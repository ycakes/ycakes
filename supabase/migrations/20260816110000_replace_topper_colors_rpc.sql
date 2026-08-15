-- Wraps the topper_colors delete-then-insert (previously two separate
-- client-side calls in ToppersPageContent) in one transaction, closing the
-- narrow non-atomicity window flagged during the Phase 5 review: a failed
-- insert after a successful delete could leave a topper with zero color
-- variants even though the admin intended to set some.
create or replace function public.fn_replace_topper_colors(p_topper_id uuid, p_color_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_profile_role() <> 'admin' then
    raise exception 'Only admins can modify topper colors';
  end if;

  delete from public.topper_colors where topper_id = p_topper_id;

  if array_length(p_color_ids, 1) > 0 then
    insert into public.topper_colors (topper_id, color_id)
    select p_topper_id, unnest(p_color_ids);
  end if;
end;
$$;
