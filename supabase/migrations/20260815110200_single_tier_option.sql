-- Owner request: at sizes where tiers become available (24>30 and up), show
-- "1 Tier" as an explicit, normally-selected default alongside 2/3/4 —
-- rather than requiring the customer to add extra tiers just because the
-- size qualifies. "1 Tier" means a single normal (non-tiered) cake.
alter table public.tiers drop constraint tiers_tier_count_check;
alter table public.tiers add constraint tiers_tier_count_check check (tier_count between 1 and 6);

insert into public.tiers (tier_count) values (1);

-- Link the new 1-tier option everywhere a 2-tier option is already linked
-- (i.e. every size that unlocks tiers at all).
insert into public.size_tiers (size_id, tier_id)
select st.size_id, t1.id
from public.size_tiers st
join public.tiers t2 on t2.id = st.tier_id and t2.tier_count = 2
cross join (select id from public.tiers where tier_count = 1) t1;
