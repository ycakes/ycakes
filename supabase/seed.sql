-- Categories: top-level + Candy Corner's four subcategories. No "Fake"
-- category — Fake Cake is a per-order-item toggle, not a category (see
-- ARCHITECTURE.md "Fake Cake ordering").
insert into public.categories (name, slug, sort_order) values
  ('{"en":"Birthday","ar":"عيد ميلاد"}', 'birthday', 1),
  ('{"en":"Wedding","ar":"زفاف"}', 'wedding', 2),
  ('{"en":"Graduation","ar":"تخرج"}', 'graduation', 3),
  ('{"en":"Bento","ar":"بينتو"}', 'bento', 4),
  ('{"en":"Custom","ar":"مخصص"}', 'custom', 5),
  ('{"en":"Candy Corner","ar":"ركن الحلوى"}', 'candy-corner', 6);

insert into public.categories (parent_id, name, slug, sort_order)
select id, '{"en":"Cupcakes","ar":"كب كيك"}'::jsonb, 'cupcakes', 1 from public.categories where slug = 'candy-corner'
union all
select id, '{"en":"Cake Pops","ar":"كيك بوبس"}'::jsonb, 'pops', 2 from public.categories where slug = 'candy-corner'
union all
select id, '{"en":"Popsicles","ar":"بوبسيكل"}'::jsonb, 'popsicles', 3 from public.categories where slug = 'candy-corner'
union all
select id, '{"en":"Dessert Cups","ar":"أكواب الحلوى"}'::jsonb, 'dessert-cups', 4 from public.categories where slug = 'candy-corner';

-- Sizes: birthday, graduation, custom share the same serving ranges.
insert into public.sizes (category_id, min_qty, max_qty, unit, sort_order)
select c.id, r.min_qty, r.max_qty, 'servings', r.sort_order
from public.categories c
cross join (values
  (4, 6, 1), (8, 10, 2), (12, 15, 3), (17, 21, 4),
  (24, 30, 5), (34, 40, 6), (45, 55, 7), (60, 70, 8)
) as r(min_qty, max_qty, sort_order)
where c.slug in ('birthday', 'graduation', 'custom');

-- Wedding: same ranges plus two larger tiers.
insert into public.sizes (category_id, min_qty, max_qty, unit, sort_order)
select c.id, r.min_qty, r.max_qty, 'servings', r.sort_order
from public.categories c
cross join (values
  (4, 6, 1), (8, 10, 2), (12, 15, 3), (17, 21, 4),
  (24, 30, 5), (34, 40, 6), (45, 55, 7), (60, 70, 8),
  (80, 90, 9), (100, 120, 10)
) as r(min_qty, max_qty, sort_order)
where c.slug = 'wedding';

-- Bento: single-number sizes (2 people, 3 people).
insert into public.sizes (category_id, min_qty, max_qty, unit, sort_order)
select c.id, r.n, r.n, 'servings', r.sort_order
from public.categories c
cross join (values (2, 1), (3, 2)) as r(n, sort_order)
where c.slug = 'bento';

-- Candy Corner - Cupcakes: 6, then 12-step increments up to 996.
insert into public.sizes (category_id, min_qty, max_qty, unit, sort_order)
select c.id, 6, 6, 'quantity', 0
from public.categories c where c.slug = 'cupcakes'
union all
select c.id, n, n, 'quantity', (n / 12)
from public.categories c, generate_series(12, 996, 12) as n
where c.slug = 'cupcakes';

-- Candy Corner - Pops / Popsicles / Dessert Cups: 12-step increments up to 996.
insert into public.sizes (category_id, min_qty, max_qty, unit, sort_order)
select c.id, n, n, 'quantity', (n / 12)
from public.categories c, generate_series(12, 996, 12) as n
where c.slug in ('pops', 'popsicles', 'dessert-cups');

-- Tiers: 2 through 6 (Fake cakes may use 5-6 once their sizes exist).
insert into public.tiers (tier_count) values (2), (3), (4), (5), (6);

-- size_tiers: birthday/wedding/graduation/custom — 24>30 unlocks {2,3};
-- 34>40 and every larger size unlocks {2,3,4}. Bento and Fake get none yet.
insert into public.size_tiers (size_id, tier_id)
select s.id, t.id
from public.sizes s
join public.categories c on c.id = s.category_id
join public.tiers t on t.tier_count in (2, 3)
where c.slug in ('birthday', 'wedding', 'graduation', 'custom')
  and s.min_qty = 24;

insert into public.size_tiers (size_id, tier_id)
select s.id, t.id
from public.sizes s
join public.categories c on c.id = s.category_id
join public.tiers t on t.tier_count in (2, 3, 4)
where c.slug in ('birthday', 'wedding', 'graduation', 'custom')
  and s.min_qty >= 34;

-- Shapes. fake_eligible marks the shapes selectable for a Fake Cake
-- (Rectangle/Circle only, see ARCHITECTURE.md "Fake Cake ordering").
insert into public.shapes (name, sort_order, fake_eligible) values
  ('{"en":"Circle","ar":"دائري"}', 1, true),
  ('{"en":"Heart","ar":"قلب"}', 2, false),
  ('{"en":"Square","ar":"مربع"}', 3, false),
  ('{"en":"Rectangle","ar":"مستطيل"}', 4, true);

-- Flavors (Candy Corner cakes should only ever link to Vanilla + Chocolate
-- via cake_flavors once real products are entered — enforced at the admin
-- UI in Phase 5, not here, since this seed creates no cake rows).
insert into public.flavors (name, sort_order) values
  ('{"en":"Vanilla","ar":"فانيليا"}', 1),
  ('{"en":"Chocolate","ar":"شوكولاتة"}', 2),
  ('{"en":"Ferrero Rocher","ar":"فيريرو روشيه"}', 3),
  ('{"en":"Blueberry","ar":"توت أزرق"}', 4),
  ('{"en":"Raspberry","ar":"توت العليق"}', 5),
  ('{"en":"Dulce de Leche","ar":"دولسي دي ليتشي"}', 6),
  ('{"en":"Caramel","ar":"كراميل"}', 7),
  ('{"en":"Oreo","ar":"أوريو"}', 8),
  ('{"en":"Chocolate Spread","ar":"شوكولاتة قابلة للدهن"}', 9),
  ('{"en":"Chocolate Chips","ar":"رقائق شوكولاتة"}', 10),
  ('{"en":"Strawberry","ar":"فراولة"}', 11),
  ('{"en":"Mango","ar":"مانجو"}', 12);

-- Colors (~30 common cake colors)
insert into public.colors (name, hex_code, sort_order) values
  ('{"en":"White","ar":"أبيض"}', '#FFFFFF', 1),
  ('{"en":"Ivory","ar":"عاجي"}', '#FFFFF0', 2),
  ('{"en":"Black","ar":"أسود"}', '#000000', 3),
  ('{"en":"Red","ar":"أحمر"}', '#E53935', 4),
  ('{"en":"Burgundy","ar":"عنابي"}', '#800020', 5),
  ('{"en":"Pink","ar":"وردي"}', '#F8BBD0', 6),
  ('{"en":"Hot Pink","ar":"وردي فاقع"}', '#FF69B4', 7),
  ('{"en":"Rose Gold","ar":"ذهبي وردي"}', '#B76E79', 8),
  ('{"en":"Orange","ar":"برتقالي"}', '#FB8C00', 9),
  ('{"en":"Peach","ar":"خوخي"}', '#FFDAB9', 10),
  ('{"en":"Yellow","ar":"أصفر"}', '#FDD835', 11),
  ('{"en":"Gold","ar":"ذهبي"}', '#D4AF37', 12),
  ('{"en":"Mustard","ar":"خردلي"}', '#E1AD01', 13),
  ('{"en":"Green","ar":"أخضر"}', '#43A047', 14),
  ('{"en":"Mint Green","ar":"أخضر نعناعي"}', '#98FF98', 15),
  ('{"en":"Sage Green","ar":"أخضر سيج"}', '#B2AC88', 16),
  ('{"en":"Emerald","ar":"زمردي"}', '#50C878', 17),
  ('{"en":"Teal","ar":"أزرق مخضر"}', '#008080', 18),
  ('{"en":"Turquoise","ar":"فيروزي"}', '#40E0D0', 19),
  ('{"en":"Blue","ar":"أزرق"}', '#1E88E5', 20),
  ('{"en":"Baby Blue","ar":"أزرق فاتح"}', '#89CFF0', 21),
  ('{"en":"Navy","ar":"كحلي"}', '#000080', 22),
  ('{"en":"Purple","ar":"بنفسجي"}', '#8E24AA', 23),
  ('{"en":"Lavender","ar":"لافندر"}', '#E6E6FA', 24),
  ('{"en":"Lilac","ar":"ليلكي"}', '#C8A2C8', 25),
  ('{"en":"Brown","ar":"بني"}', '#6D4C41', 26),
  ('{"en":"Beige","ar":"بيج"}', '#F5F5DC', 27),
  ('{"en":"Silver","ar":"فضي"}', '#C0C0C0', 28),
  ('{"en":"Grey","ar":"رمادي"}', '#9E9E9E', 29),
  ('{"en":"Champagne","ar":"شمبانيا"}', '#F7E7CE', 30);

-- Expense categories
insert into public.expense_categories (name) values
  ('{"en":"Ingredients","ar":"مكونات"}'),
  ('{"en":"Packaging","ar":"تغليف"}'),
  ('{"en":"Delivery","ar":"توصيل"}'),
  ('{"en":"Utilities","ar":"مرافق"}'),
  ('{"en":"Marketing","ar":"تسويق"}');
