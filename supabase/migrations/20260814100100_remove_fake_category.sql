-- "Fake Cakes" is no longer a top-level category — reworked as a
-- per-order-item cake type toggle (see ARCHITECTURE.md "Fake Cake
-- ordering"). Remove the leftover `fake` category row from the original
-- Phase 2 seed. No cake rows exist yet (Phase 5 catalog admin isn't built),
-- but reassign defensively first in case any were created out-of-band.
update public.cakes
set category_id = (select id from public.categories where slug = 'custom')
where category_id = (select id from public.categories where slug = 'fake');

delete from public.categories where slug = 'fake';
