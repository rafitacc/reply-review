-- reply-review: Row Level Security policies
--
-- The initial schema enabled RLS on every table with no policies (deny all).
-- This migration opens exactly what CLAUDE.md section 4 allows, and nothing
-- else. Every policy is for the `authenticated` role; `anon` gets no policy
-- and therefore sees and writes nothing.
--
-- Summary
--   brands         select: member of the brand
--   brand_members  select: own rows, or every row of a brand the user leads
--   profiles       select: self, or anyone who shares a brand with the user
--   issue_types    select: any authenticated user
--   replies        select: lead of the brand, or the reply's own specialist
--   reviews        select: lead of the reply's brand, or the reply's specialist
--                  insert/update: lead of the reply's brand, as themselves
--   review_issues  select: mirrors reviews
--                  insert/delete: author of the parent review, still lead
--
-- Anything not listed (e.g. writes to replies, deleting reviews) has no policy
-- and is denied.

-- ---------------------------------------------------------------------------
-- Helper functions
--
-- Policies on several tables need to ask "is the current user a member / lead
-- of brand X?". Asking that with a subquery on brand_members from inside a
-- brand_members policy would recurse, and from other tables it would be
-- filtered by brand_members' own RLS. These helpers run as their owner
-- (security definer) so they read brand_members directly.
--
-- They live in a `private` schema, which is not exposed through the REST API,
-- so they cannot be called as RPCs. search_path is empty and every name is
-- fully qualified, so a caller cannot shadow a table with their own object.
-- Each one only ever answers about auth.uid(), never about an arbitrary user.
-- ---------------------------------------------------------------------------
create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated;

create function private.is_brand_member(brand_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.brand_members bm
    where bm.brand_id = is_brand_member.brand_id
      and bm.user_id = (select auth.uid())
  );
$$;

create function private.is_brand_lead(brand_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.brand_members bm
    where bm.brand_id = is_brand_lead.brand_id
      and bm.user_id = (select auth.uid())
      and bm.role = 'lead'
  );
$$;

-- True when `other_user_id` is a member of at least one brand the current
-- user is also a member of. Used to show names (e.g. who reviewed my reply)
-- without exposing the whole profiles table.
create function private.shares_brand_with(other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.brand_members mine
    join public.brand_members theirs on theirs.brand_id = mine.brand_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = shares_brand_with.other_user_id
  );
$$;

revoke all on function private.is_brand_member(uuid)     from public;
revoke all on function private.is_brand_lead(uuid)       from public;
revoke all on function private.shares_brand_with(uuid)   from public;
grant execute on function private.is_brand_member(uuid)   to authenticated;
grant execute on function private.is_brand_lead(uuid)     to authenticated;
grant execute on function private.shares_brand_with(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- brands
-- ---------------------------------------------------------------------------
create policy "members can read their brands"
  on public.brands
  for select
  to authenticated
  using (private.is_brand_member(id));

-- ---------------------------------------------------------------------------
-- brand_members
-- A specialist sees only their own memberships; a lead sees the whole team
-- of the brands they lead.
-- ---------------------------------------------------------------------------
create policy "users read own memberships, leads read their brand's team"
  on public.brand_members
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or private.is_brand_lead(brand_id)
  );

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy "users read own profile and people they share a brand with"
  on public.profiles
  for select
  to authenticated
  using (
    id = (select auth.uid())
    or private.shares_brand_with(id)
  );

-- ---------------------------------------------------------------------------
-- issue_types: reference data, readable by anyone signed in
-- ---------------------------------------------------------------------------
create policy "authenticated users read issue types"
  on public.issue_types
  for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- replies: read-only from the app
-- A specialist sees only their own replies, never a colleague's, even on the
-- same brand.
-- ---------------------------------------------------------------------------
create policy "leads read their brand's replies, specialists read their own"
  on public.replies
  for select
  to authenticated
  using (
    private.is_brand_lead(brand_id)
    or specialist_id = (select auth.uid())
  );

-- ---------------------------------------------------------------------------
-- reviews
-- The subqueries on replies run with the caller's RLS, which is what we want:
-- you can only reach a review through a reply you are allowed to see.
-- ---------------------------------------------------------------------------
create policy "leads and the reply's specialist read reviews"
  on public.reviews
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.replies r
      where r.id = reviews.reply_id
        and (
          private.is_brand_lead(r.brand_id)
          or r.specialist_id = (select auth.uid())
        )
    )
  );

create policy "leads create reviews on their brand's replies, as themselves"
  on public.reviews
  for insert
  to authenticated
  with check (
    reviewer_id = (select auth.uid())
    and exists (
      select 1
      from public.replies r
      where r.id = reviews.reply_id
        and private.is_brand_lead(r.brand_id)
    )
  );

-- `using` decides which existing rows can be updated (only your own, on a
-- brand you still lead); `with check` validates the new row the same way, so
-- an update cannot hand the review to someone else.
create policy "leads update their own reviews on their brand's replies"
  on public.reviews
  for update
  to authenticated
  using (
    reviewer_id = (select auth.uid())
    and exists (
      select 1
      from public.replies r
      where r.id = reviews.reply_id
        and private.is_brand_lead(r.brand_id)
    )
  )
  with check (
    reviewer_id = (select auth.uid())
    and exists (
      select 1
      from public.replies r
      where r.id = reviews.reply_id
        and private.is_brand_lead(r.brand_id)
    )
  );

-- Only the judgement itself is editable. Moving a review to another reply,
-- or rewriting its timestamps, is not something the app should ever do.
revoke update on public.reviews from authenticated;
grant update (score, comment) on public.reviews to authenticated;

-- No delete policy on reviews: deleting is denied.

-- ---------------------------------------------------------------------------
-- review_issues
-- ---------------------------------------------------------------------------
create policy "review issues are readable wherever the review is"
  on public.review_issues
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.reviews rv
      where rv.id = review_issues.review_id
    )
  );

create policy "review authors add tags on brands they lead"
  on public.review_issues
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.reviews rv
      join public.replies r on r.id = rv.reply_id
      where rv.id = review_issues.review_id
        and rv.reviewer_id = (select auth.uid())
        and private.is_brand_lead(r.brand_id)
    )
  );

create policy "review authors remove tags on brands they lead"
  on public.review_issues
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.reviews rv
      join public.replies r on r.id = rv.reply_id
      where rv.id = review_issues.review_id
        and rv.reviewer_id = (select auth.uid())
        and private.is_brand_lead(r.brand_id)
    )
  );
