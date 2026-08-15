-- Restrict which flavors are selectable per category. Owner request:
-- Candy Corner's Cupcakes/Pops/Popsicles only offer Vanilla or Chocolate
-- (single choice, never 50/50 — enforced in application logic since it's a
-- UI/selection concern, not a DB-level rule), and Dessert Cups has its own
-- distinct flavor list, separate from the general cake flavors.
--
-- No rows for a category = unrestricted (today's behavior, unchanged for
-- Birthday/Wedding/Graduation/Bento/Custom). Rows present = only those.
create table public.category_flavors (
  category_id uuid not null references public.categories(id) on delete cascade,
  flavor_id uuid not null references public.flavors(id) on delete cascade,
  primary key (category_id, flavor_id)
);
create index idx_category_flavors_flavor_id on public.category_flavors(flavor_id);
alter table public.category_flavors enable row level security;

create policy public_read_all on public.category_flavors
for select
to anon, authenticated
using (true);

create policy admin_all on public.category_flavors
for all
to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

-- New Dessert Cups-only flavors (Vanilla, Chocolate, Oreo, Ferrero Rocher
-- already exist from the general flavor list).
insert into public.flavors (name, sort_order) values
  ('{"en":"Lotus","ar":"لوتس"}', 13),
  ('{"en":"Tiramisu","ar":"تيراميسو"}', 14),
  ('{"en":"Red Velvet","ar":"ريد فيلفيت"}', 15),
  ('{"en":"Cheesecake","ar":"تشيز كيك"}', 16);

-- Cupcakes / Pops / Popsicles: Vanilla or Chocolate only.
insert into public.category_flavors (category_id, flavor_id)
select c.id, f.id
from public.categories c
join public.flavors f on f.name->>'en' in ('Vanilla', 'Chocolate')
where c.slug in ('cupcakes', 'pops', 'popsicles');

-- Dessert Cups: its own 7-flavor list.
insert into public.category_flavors (category_id, flavor_id)
select c.id, f.id
from public.categories c
join public.flavors f on f.name->>'en' in
  ('Oreo', 'Chocolate', 'Lotus', 'Ferrero Rocher', 'Tiramisu', 'Red Velvet', 'Cheesecake')
where c.slug = 'dessert-cups';
