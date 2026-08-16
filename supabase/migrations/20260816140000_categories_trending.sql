-- Per-category control over the Home page's Trending Cakes rows: whether a
-- top-level category gets its own row at all, and what order the rows
-- appear in (independent of `sort_order`, which drives the Shop-by-Category
-- grid and admin listings — the owner wants these orderable separately).
alter table public.categories add column show_trending boolean not null default true;
alter table public.categories add column trending_sort_order int not null default 0;

-- Seed trending_sort_order from the existing sort_order so today's row
-- order doesn't change until the owner reorders trending explicitly.
update public.categories set trending_sort_order = sort_order;
