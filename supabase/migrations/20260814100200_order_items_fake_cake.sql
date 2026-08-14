-- Fake Cake support (ARCHITECTURE.md "Fake Cake ordering"): a per-order-item
-- cake type toggle, not a category. Adds the fields a Fake Cake needs and
-- makes the real-cake-only fields (size_id, shape_id) conditionally required
-- instead of always-present.

-- shapes: reuse the existing table for the Fake Cake shape restriction
-- (Rectangle/Circle only) via a filtered flag, rather than a duplicate enum.
alter table public.shapes add column fake_eligible boolean not null default false;

update public.shapes set fake_eligible = true
where name->>'en' in ('Rectangle', 'Circle');

-- order_items: size_id/shape_id become optional (real-cake fields only);
-- fake_size_cm/fake_shape_id/reference_image_url are the Fake Cake fields.
alter table public.order_items alter column size_id drop not null;
alter table public.order_items alter column shape_id drop not null;

alter table public.order_items add column is_fake boolean not null default false;
alter table public.order_items add column fake_size_cm numeric(10,2);
alter table public.order_items add column fake_shape_id uuid references public.shapes(id);
alter table public.order_items add column reference_image_url text;

-- Mutual exclusivity: a real cake needs size_id/shape_id and no fake fields;
-- a Fake Cake needs fake_size_cm/fake_shape_id and none of the real-cake-only
-- fields that don't apply to a display cake (tier, 50/50 split).
alter table public.order_items add constraint order_items_fake_cake_fields check (
  (
    is_fake = false
    and size_id is not null
    and shape_id is not null
    and fake_size_cm is null
    and fake_shape_id is null
  ) or (
    is_fake = true
    and size_id is null
    and shape_id is null
    and tier_id is null
    and is_fifty_fifty = false
    and fake_size_cm is not null
    and fake_shape_id is not null
  )
);

-- fake_shape_id must reference a fake-eligible shape (Rectangle/Circle) --
-- not expressible as a plain check constraint since it spans two tables.
create or replace function public.order_items_validate_fake_shape()
returns trigger
language plpgsql
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

create trigger trg_order_items_validate_fake_shape
before insert or update on public.order_items
for each row execute function public.order_items_validate_fake_shape();

-- is_fake = true is invalid for Bento and Candy Corner items (their own
-- category, or a child of Candy Corner) per ARCHITECTURE.md.
create or replace function public.order_items_validate_fake_category()
returns trigger
language plpgsql
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

create trigger trg_order_items_validate_fake_category
before insert or update on public.order_items
for each row execute function public.order_items_validate_fake_category();
