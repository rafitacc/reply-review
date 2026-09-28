-- reply-review: RLS verification script
--
-- Not a test suite: a readable walk-through that impersonates seeded users the
-- same way PostgREST does (role `authenticated` + JWT claims) and prints one
-- row per check with the expected and actual result.
--
-- Run against the local database after `npm run db:reset`:
--
--   npm run db:rls-check
--
-- Everything runs inside one transaction that is rolled back, so the writes it
-- attempts never persist.

\set ON_ERROR_STOP on
\pset footer off

begin;

-- Seeded ids (see supabase/seed.sql)
\set marta   '00000000-0000-4000-a000-000000000001'
\set nuria   '00000000-0000-4000-a000-000000000002'
\set dani    '00000000-0000-4000-a000-000000000003'
\set tomas   '00000000-0000-4000-a000-000000000005'
\set voltra  'b0000000-0000-4000-a000-000000000001'

-- JWT claims as PostgREST would set them for each signed-in user
\set claims_marta '{"sub": "00000000-0000-4000-a000-000000000001", "role": "authenticated"}'
\set claims_nuria '{"sub": "00000000-0000-4000-a000-000000000002", "role": "authenticated"}'
\set claims_dani  '{"sub": "00000000-0000-4000-a000-000000000003", "role": "authenticated"}'
\set claims_tomas '{"sub": "00000000-0000-4000-a000-000000000005", "role": "authenticated"}'

-- ---------------------------------------------------------------------------
-- Ground truth, read as the table owner (bypasses RLS). Expected values come
-- from here rather than being hardcoded, so the script survives seed edits.
-- ---------------------------------------------------------------------------
select
  (select count(*) from public.replies where specialist_id = :'tomas') as tomas_own_replies,
  (select count(*) from public.reviews rv join public.replies r on r.id = rv.reply_id
     where r.specialist_id = :'tomas')                                  as tomas_own_reviews,
  (select count(*) from public.replies r join public.brands b on b.id = r.brand_id
     where b.slug = 'lumen')                                            as lumen_replies,
  (select count(*) from public.brand_members where brand_id = :'voltra') as voltra_team,
  (select r.id from public.replies r
     where r.brand_id = :'voltra'
       and not exists (select 1 from public.reviews rv
                       where rv.reply_id = r.id and rv.reviewer_id = :'marta')
     order by r.sent_at limit 1)                                        as voltra_unreviewed_reply,
  (select r.id from public.replies r join public.brands b on b.id = r.brand_id
     where b.slug = 'lumen' order by r.sent_at limit 1)                 as lumen_reply,
  (select r.id from public.replies r
     where r.specialist_id = :'dani' order by r.sent_at limit 1)        as dani_reply,
  (select rv.id from public.reviews rv
     where rv.reviewer_id = :'marta' order by rv.created_at limit 1)    as marta_review,
  (select rv.id from public.reviews rv
     where rv.reviewer_id = :'nuria' order by rv.created_at limit 1)    as nuria_review,
  (select count(*) from public.review_issues ri
     join public.reviews rv on rv.id = ri.review_id
     join public.replies r on r.id = rv.reply_id
     where r.specialist_id = :'tomas')                                  as tomas_own_tags,
  (select count(*) from public.review_issues ri
     join public.reviews rv on rv.id = ri.review_id
     join public.replies r on r.id = rv.reply_id
     where r.specialist_id <> :'tomas')                                 as others_tags,
  -- Ids of reviews on other specialists' replies, so the check can ask for
  -- their tags directly instead of through joins RLS would already filter.
  (select array_agg(rv.id) from public.reviews rv
     join public.replies r on r.id = rv.reply_id
     where r.specialist_id <> :'tomas')                                 as others_review_ids
\gset

-- An issue type not yet on Marta's review, so tagging it is a clean insert.
select it.id as free_issue_type
from public.issue_types it
where not exists (select 1 from public.review_issues ri
                  where ri.review_id = :'marta_review' and ri.issue_type_id = it.id)
order by it.id
limit 1
\gset

create temp table rls_check (
  n         serial,
  who       text,
  check_    text,
  expected  text,
  actual    text
) on commit drop;
grant insert, select on rls_check to authenticated, anon;
grant usage on sequence rls_check_n_seq to authenticated, anon;

-- Runs a write as the current role and records whether RLS / grants let it
-- through. Any error is reported as its SQLSTATE (42501 = insufficient
-- privilege / row violates RLS policy).
create function pg_temp.try_write(sql text)
returns text
language plpgsql
as $$
declare
  n bigint;
begin
  execute sql;
  get diagnostics n = row_count;
  return case when n = 0 then 'no rows affected' else 'allowed' end;
exception when others then
  return 'denied (' || sqlstate || ')';
end;
$$;
grant execute on function pg_temp.try_write(text) to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Tomás: specialist on Voltra only
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = :'claims_tomas';

insert into rls_check (who, check_, expected, actual) values
  ('Tomás', 'replies visible (all his own)',        :'tomas_own_replies',
     (select count(*) from public.replies)::text),
  ('Tomás', 'replies by anyone else',               '0',
     (select count(*) from public.replies where specialist_id <> :'tomas')::text),
  ('Tomás', 'Packwell or Lumen replies',            '0',
     (select count(*) from public.replies where brand_id <> :'voltra')::text),
  ('Tomás', 'brands visible',                       'Voltra',
     (select coalesce(string_agg(name, ', ' order by name), '(none)') from public.brands)),
  ('Tomás', 'brand_members rows visible',           '1',
     (select count(*) from public.brand_members)::text),
  ('Tomás', 'reviews visible (only on his replies)', :'tomas_own_reviews',
     (select count(*) from public.reviews)::text),
  ('Tomás', 'profiles visible (Voltra team)',       :'voltra_team',
     (select count(*) from public.profiles)::text),
  ('Tomás', 'review tags visible (only on his replies)', :'tomas_own_tags',
     (select count(*) from public.review_issues)::text),
  ('Tomás', 'tags on other specialists'' reviews (' || :'others_tags' || ' exist)', '0',
     (select count(*) from public.review_issues
        where review_id = any (:'others_review_ids'::uuid[]))::text),
  ('Tomás', 'insert a reply',                       'denied (42501)',
     pg_temp.try_write(format(
       $q$insert into public.replies (brand_id, specialist_id, customer_message, reply_body, sent_at)
          values (%L, %L, 'x', 'x', now())$q$, :'voltra', :'tomas')));

-- ---------------------------------------------------------------------------
-- Nuria: lead of Lumen only
-- ---------------------------------------------------------------------------
set local request.jwt.claims = :'claims_nuria';

insert into rls_check (who, check_, expected, actual) values
  ('Nuria', 'Lumen replies visible',                :'lumen_replies',
     (select count(*) from public.replies r join public.brands b on b.id = r.brand_id
        where b.slug = 'lumen')::text),
  ('Nuria', 'Voltra or Packwell replies',           '0',
     (select count(*) from public.replies r
        where not exists (select 1 from public.brands b
                          where b.id = r.brand_id and b.slug = 'lumen'))::text),
  ('Nuria', 'Voltra or Packwell reply ids by guess', '0',
     (select count(*) from public.replies where brand_id = :'voltra')::text),
  ('Nuria', 'brands visible',                       'Lumen',
     (select coalesce(string_agg(name, ', ' order by name), '(none)') from public.brands));

-- ---------------------------------------------------------------------------
-- Marta: lead of Voltra and Packwell
-- ---------------------------------------------------------------------------
set local request.jwt.claims = :'claims_marta';

insert into rls_check (who, check_, expected, actual) values
  ('Marta', 'insert review with reviewer_id = Nuria', 'denied (42501)',
     pg_temp.try_write(format(
       $q$insert into public.reviews (reply_id, reviewer_id, score) values (%L, %L, 4)$q$,
       :'voltra_unreviewed_reply', :'nuria'))),
  ('Marta', 'insert review on a Lumen reply',       'denied (42501)',
     pg_temp.try_write(format(
       $q$insert into public.reviews (reply_id, reviewer_id, score) values (%L, %L, 4)$q$,
       :'lumen_reply', :'marta'))),
  -- Same reply and reviewer as the allowed insert below, so the only reason
  -- for the denial is the backdated created_at.
  ('Marta', 'insert review with a custom created_at', 'denied (42501)',
     pg_temp.try_write(format(
       $q$insert into public.reviews (reply_id, reviewer_id, score, created_at)
          values (%L, %L, 4, now() - interval '90 days')$q$,
       :'voltra_unreviewed_reply', :'marta'))),
  ('Marta', 'insert review as herself on Voltra',   'allowed',
     pg_temp.try_write(format(
       $q$insert into public.reviews (reply_id, reviewer_id, score) values (%L, %L, 4)$q$,
       :'voltra_unreviewed_reply', :'marta'))),
  ('Marta', 'update score of her own review',       'allowed',
     pg_temp.try_write(format(
       $q$update public.reviews set score = 3 where id = %L$q$, :'marta_review'))),
  ('Marta', 'hand her review to Nuria',             'denied (42501)',
     pg_temp.try_write(format(
       $q$update public.reviews set reviewer_id = %L where id = %L$q$, :'nuria', :'marta_review'))),
  ('Marta', 'delete her own review',                'no rows affected',
     pg_temp.try_write(format(
       $q$delete from public.reviews where id = %L$q$, :'marta_review'))),
  ('Marta', 'attach a tag to her own review',       'allowed',
     pg_temp.try_write(format(
       $q$insert into public.review_issues (review_id, issue_type_id) values (%L, %s)$q$,
       :'marta_review', :'free_issue_type'))),
  ('Marta', 'attach a tag to a review owned by Nuria', 'denied (42501)',
     pg_temp.try_write(format(
       $q$insert into public.review_issues (review_id, issue_type_id) values (%L, %s)$q$,
       :'nuria_review', :'free_issue_type'))),
  ('Marta', 'remove tags from a review owned by Nuria', 'no rows affected',
     pg_temp.try_write(format(
       $q$delete from public.review_issues where review_id = %L$q$, :'nuria_review')));

-- ---------------------------------------------------------------------------
-- Dani: specialist, tries to review his own reply
-- ---------------------------------------------------------------------------
set local request.jwt.claims = :'claims_dani';

insert into rls_check (who, check_, expected, actual) values
  ('Dani', 'insert review on his own reply',        'denied (42501)',
     pg_temp.try_write(format(
       $q$insert into public.reviews (reply_id, reviewer_id, score) values (%L, %L, 5)$q$,
       :'dani_reply', :'dani')));

-- ---------------------------------------------------------------------------
-- anon: no session at all
-- ---------------------------------------------------------------------------
reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

insert into rls_check (who, check_, expected, actual) values
  ('anon', 'replies visible',                       '0', (select count(*) from public.replies)::text),
  ('anon', 'brands visible',                        '0', (select count(*) from public.brands)::text),
  ('anon', 'issue_types visible',                   '0', (select count(*) from public.issue_types)::text);

-- ---------------------------------------------------------------------------
-- Report
-- ---------------------------------------------------------------------------
reset role;

select
  who,
  check_ as "check",
  expected,
  actual,
  case when expected = actual then 'ok' else 'FAIL' end as result
from rls_check
order by n;

select
  count(*) filter (where expected = actual) as passed,
  count(*) filter (where expected <> actual) as failed
from rls_check;

rollback;
