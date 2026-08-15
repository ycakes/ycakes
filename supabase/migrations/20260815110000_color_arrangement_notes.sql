-- Owner request: when a customer picks more than one icing color, capture
-- how they want them arranged on the cake as its own field (not mixed into
-- the general "Additional Notes" free text).
alter table public.order_items add column color_arrangement_notes text;
