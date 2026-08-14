-- Product decision: deleting a customer account should not be blocked by
-- their order history, and their past orders should not cascade-delete
-- either (the business still needs them for fulfillment/analytics). Detach
-- the order from the deleted account instead — orders.customer_id becomes
-- null, same as a guest order, and guest_name/guest_phone stay null since
-- the check constraint only requires one of the two identification paths.
--
-- Constraint name confirmed via pg_constraint before writing this
-- migration; matches Postgres/Supabase's default naming convention.

alter table public.orders drop constraint orders_customer_id_fkey;
alter table public.orders add constraint orders_customer_id_fkey
  foreign key (customer_id) references public.profiles(id) on delete set null;
