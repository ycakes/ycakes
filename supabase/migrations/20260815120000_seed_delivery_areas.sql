-- Delivery areas were never seeded (owner TBD per ARCHITECTURE.md). Owner
-- has now named the initial delivery coverage: Cairo, Giza, Helwan. Prices
-- still seed at 0 like every other price field — real pricing is entered
-- later via the Phase 5/7 admin UI.
insert into public.delivery_areas (name, price, sort_order) values
  ('{"en":"Cairo","ar":"القاهرة"}', 0, 1),
  ('{"en":"Giza","ar":"الجيزة"}', 0, 2),
  ('{"en":"Helwan","ar":"حلوان"}', 0, 3);
