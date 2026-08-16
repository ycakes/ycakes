-- Owner request: stop showing the placeholder category/cake photos
-- anywhere on the live site. These were local /images/categories/*.jpeg
-- paths seeded in Phase 3 (both directly on cakes.primary_image_url and,
-- after the Phase 5 backfill, duplicated into cake_images rows). Clearing
-- them here leaves the storefront's existing "no image" blank-box fallback
-- to render until the owner uploads real photos through the new admin
-- upload UI (cakes) or the new category image uploader (categories).
delete from public.cake_images where url like '/images/%';
update public.cakes set primary_image_url = null where primary_image_url like '/images/%';
