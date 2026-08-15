-- Add Dessert Cups as a 4th Candy Corner subcategory, alongside
-- cupcakes/pops/popsicles. Sizes follow the pops/popsicles pattern
-- (12-step increments starting at 12, not cupcakes' 6-start) per
-- ARCHITECTURE.md "Core entities" / TASKS.md Phase 2 follow-up.

insert into public.categories (parent_id, name, slug, sort_order)
select id, '{"en":"Dessert Cups","ar":"أكواب الحلوى"}'::jsonb, 'dessert-cups', 4
from public.categories where slug = 'candy-corner';

insert into public.sizes (category_id, min_qty, max_qty, unit, sort_order)
select c.id, n, n, 'quantity', (n / 12)
from public.categories c, generate_series(12, 996, 12) as n
where c.slug = 'dessert-cups';
