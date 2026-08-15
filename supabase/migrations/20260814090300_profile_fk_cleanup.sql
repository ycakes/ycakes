-- audit_log.actor_id, expenses.created_by, and delivery_calendar_blocks.created_by
-- all reference profiles(id) with the default ON DELETE NO ACTION, which
-- makes Supabase Auth's user-deletion API fail with a FK violation the
-- moment that user has any audit entry, expense, or calendar block.
-- orders.customer_id is intentionally excluded — account-deletion handling
-- for orders needs a product decision, not just a schema tweak.
--
-- Constraint names confirmed via pg_constraint before writing this
-- migration; they match Postgres/Supabase's default naming convention.

alter table public.audit_log drop constraint audit_log_actor_id_fkey;
alter table public.audit_log add constraint audit_log_actor_id_fkey
  foreign key (actor_id) references public.profiles(id) on delete set null;

alter table public.expenses drop constraint expenses_created_by_fkey;
alter table public.expenses add constraint expenses_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.delivery_calendar_blocks drop constraint delivery_calendar_blocks_created_by_fkey;
alter table public.delivery_calendar_blocks add constraint delivery_calendar_blocks_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;
