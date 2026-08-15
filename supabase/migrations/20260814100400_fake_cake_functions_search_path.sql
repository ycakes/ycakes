-- Pin search_path on the trigger functions added for Fake Cake support
-- (and normalize_order_on_insert, touched by the same batch) so an
-- attacker-controlled search_path can't shadow public.shapes/cakes/
-- categories lookups inside them. Flagged by `supabase db advisors`.
create or replace function public.normalize_order_on_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.status := 'pending';
  new.final_price := null;
  new.confirmed_at := null;
  new.completed_at := null;
  new.cancelled_at := null;
  new.source := 'website';
  return new;
end;
$$;

create or replace function public.order_items_validate_fake_shape()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.fake_shape_id is not null and not exists (
    select 1 from public.shapes s where s.id = new.fake_shape_id and s.fake_eligible
  ) then
    raise exception 'fake_shape_id must reference a fake-eligible shape (Rectangle or Circle)';
  end if;
  return new;
end;
$$;

create or replace function public.order_items_validate_fake_category()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_slug text;
  v_parent_slug text;
begin
  if new.is_fake then
    select c.slug, p.slug into v_slug, v_parent_slug
    from public.cakes ck
    join public.categories c on c.id = ck.category_id
    left join public.categories p on p.id = c.parent_id
    where ck.id = new.cake_id;

    if v_slug in ('bento', 'candy-corner') or v_parent_slug = 'candy-corner' then
      raise exception 'Fake Cake is not available for Bento or Candy Corner items';
    end if;
  end if;
  return new;
end;
$$;
