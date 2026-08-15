-- Phase 3 placeholder trending-cake data. Real cake photos/data pending from
-- the owner; each cake reuses its category's single placeholder photo
-- (public/images/categories/{slug}.jpg) until real product photos exist.
-- 4 cakes per top-level "Shop by Category" tile (6 categories), so Home's
-- "Trending Cakes" section has content to render. Candy Corner's 4 are
-- spread one per subcategory so its four listing pages aren't empty either.

insert into public.cakes (category_id, name, description, base_price, primary_image_url, featured, sort_order)
select c.id,
  jsonb_build_object('en', c.name->>'en' || ' Cake ' || n, 'ar', (c.name->>'ar') || ' ' || n),
  jsonb_build_object('en', 'Placeholder ' || (c.name->>'en') || ' cake, real product photos coming soon.', 'ar', 'صورة مؤقتة، سيتم إضافة صور المنتج الحقيقية قريبًا.'),
  0,
  '/images/categories/' || c.slug || '.jpg',
  true,
  n
from public.categories c
cross join generate_series(1, 4) as n
where c.slug in ('birthday', 'wedding', 'graduation', 'bento', 'custom');

insert into public.cakes (category_id, name, description, base_price, primary_image_url, featured, sort_order)
select c.id,
  jsonb_build_object('en', c.name->>'en', 'ar', c.name->>'ar'),
  jsonb_build_object('en', 'Placeholder Candy Corner item, real product photos coming soon.', 'ar', 'صورة مؤقتة، سيتم إضافة صور المنتج الحقيقية قريبًا.'),
  0,
  '/images/categories/candy-corner.jpg',
  true,
  1
from public.categories c
where c.slug in ('cupcakes', 'pops', 'popsicles', 'dessert-cups');
