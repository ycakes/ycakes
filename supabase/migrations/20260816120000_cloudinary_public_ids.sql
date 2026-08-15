-- Store each Cloudinary asset's public_id alongside its URL so uploads can
-- be deleted from Cloudinary storage (not just unlinked from the DB) when a
-- cake/category/topper photo is removed or its owning row is deleted.
alter table public.cake_images add column public_id text;
alter table public.toppers add column image_public_id text;
alter table public.categories add column image_url text;
alter table public.categories add column image_public_id text;
