-- Backfill cake_images for cakes that already have a primary_image_url set
-- directly (Phase 3 placeholder-cake seed) but never got a corresponding
-- cake_images row. Without this, the Cake Form loads images: [] for these
-- cakes, and Task 11's "null primary_image_url when images.length===0" save
-- guard wipes their real storefront photo on the very next edit.
insert into public.cake_images (cake_id, url, sort_order, is_primary)
select id, primary_image_url, 0, true
from public.cakes
where primary_image_url is not null
  and not exists (
    select 1 from public.cake_images ci where ci.cake_id = cakes.id
  );
