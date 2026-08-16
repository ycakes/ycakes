-- Phase 6 admin orders: the Orders list/detail joins orders.customer_id to
-- profiles for the customer's name. Accountants already have accountant_read
-- on orders/order_items (20260813121300_rls_admin_accountant.sql), but there
-- was no accountant read policy on profiles itself, so that join would
-- silently return null for account-linked orders viewed by an accountant
-- (PostgREST drops an embedded relation the caller can't read, it doesn't
-- error) — same reasoning as the earlier accountant catalog-read grant.
create policy accountant_read on public.profiles
for select
to authenticated
using (public.current_profile_role() = 'accountant');
