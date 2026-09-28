-- reply-review: restrict which review columns can be set on insert
--
-- Follow-up to PR 2 review. Update on reviews was already limited to
-- (score, comment), but insert was not, so a lead could create a review with
-- a chosen created_at (or updated_at). Review timestamps feed the brand
-- trend, so backdating a review would be editing the evidence.
--
-- Same pattern as update: take away table-wide insert and grant it back only
-- on the columns a review is made of. id, created_at and updated_at always
-- come from their defaults. RLS policies are unchanged.

revoke insert on public.reviews from authenticated;
grant insert (reply_id, reviewer_id, score, comment) on public.reviews to authenticated;
