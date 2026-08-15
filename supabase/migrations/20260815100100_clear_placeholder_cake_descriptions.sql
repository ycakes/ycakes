-- Drop the "Placeholder ... real product photos coming soon" filler copy
-- from the Phase 3 placeholder cakes (20260814110000) — it was only ever
-- meant as a dev-time stand-in and reads oddly on the storefront. The
-- image/name placeholders stay until these rows are replaced by real admin
-- CRUD data.
update public.cakes
set description = null
where description->>'en' like 'Placeholder %';
