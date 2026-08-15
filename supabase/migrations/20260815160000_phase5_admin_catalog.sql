-- Toppers need a real photo (e.g. a graduation-hat topper shown as an
-- actual image in the Custom Cakes topper picker). TopperCard already
-- accepts an imageSrc prop that nothing has ever populated.
alter table public.toppers add column image_url text;

-- cake_images gains a primary flag; cakes.primary_image_url stays the
-- single denormalized column every existing storefront query reads
-- (ProductCard, Home, Cart, CakeCustomizer, OrderDetailModal) — this
-- trigger is the only thing that writes it from now on.
alter table public.cake_images add column is_primary boolean not null default false;

create or replace function public.fn_sync_cake_primary_image()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_primary then
    update public.cake_images
      set is_primary = false
      where cake_id = new.cake_id and id <> new.id and is_primary;
    update public.cakes set primary_image_url = new.url where id = new.cake_id;
  end if;
  return new;
end;
$$;

create trigger trg_sync_cake_primary_image
after insert or update of is_primary, url on public.cake_images
for each row execute function public.fn_sync_cake_primary_image();
