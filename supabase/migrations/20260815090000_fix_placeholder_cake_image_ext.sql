-- The owner-supplied category placeholder photos were saved as .jpeg, not
-- .jpg as the prior migration assumed. Fix primary_image_url to match.
update public.cakes
set primary_image_url = replace(primary_image_url, '.jpg', '.jpeg')
where primary_image_url like '/images/categories/%.jpg';
