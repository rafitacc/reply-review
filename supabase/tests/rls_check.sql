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
-- attempts never persist. The rows the write checks act on (a reply nobody has
-- reviewed, a review by Marta, a review by Nuria) are created as fixtures at
-- the start of that transaction, so the result depends only on the seeded
-- users and brands, not on whatever was reviewed in the app since the last
-- `npm run db:reset`.

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
\set lucia   '00000000-0000-4000-a000-000000000004'
\set lumen   'b0000000-0000-4000-a000-000000000003'

-- Fixture ids, only ever alive inside this transaction
\set fx_voltra_reply 'f0000000-0000-4000-a000-000000000001'
\set fx_marta_reply  'f0000000-0000-4000-a000-000000000002'
\set fx_lumen_reply  'f0000000-0000-4000-a000-000000000003'
\set fx_marta_review 'f0000000-0000-4000-a000-000000000011'
\set fx_nuria_review 'f0000000-0000-4000-a000-000000000012'

-- The fixtures below need the seeded people and brands. Without them the
-- inserts would fail on a foreign key with a message that points nowhere
-- useful, so check first and say what to do.
do $$
begin
  if (select count(*) from public.brand_members
      where (brand_id, user_id, role) in (
        ('b0000000-0000-4000-a000-000000000001'::uuid, '00000000-0000-4000-a000-000000000001'::uuid, 'lead'),
        ('b0000000-0000-4000-a000-000000000001'::uuid, '00000000-0000-4000-a000-000000000003'::uuid, 'specialist'),
        ('b0000000-0000-4000-a000-000000000003'::uuid, '00000000-0000-4000-a000-000000000002'::uuid, 'lead'),
        ('b0000000-0000-4000-a000-000000000003'::uuid, '00000000-0000-4000-a000-000000000004'::uuid, 'specialist'))) <> 4
  then
    raise exception 'rls_check: the seeded users and brands are missing or changed. Run `npm run db:reset` first.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Fixtures, inserted as the table owner (bypasses RLS and column grants):
--   fx_voltra_reply  Voltra reply by Dani that nobody has reviewed
--   fx_marta_reply   Voltra reply by Dani, reviewed by Marta (no tags)
--   fx_lumen_reply   Lumen reply by Lucía, reviewed by Nuria (one tag, not
--                    the one Marta tries to attach, so a denial can only be RLS)
-- ---------------------------------------------------------------------------
insert into public.replies (id, brand_id, specialist_id, subject, customer_message, reply_body, sent_at, source) values
  (:'fx_voltra_reply', :'voltra', :'dani',  'rls_check fixture', 'Fixture message.', 'Fixture reply.', now(), 'rls_check'),
  (:'fx_marta_reply',  :'voltra', :'dani',  'rls_check fixture', 'Fixture message.', 'Fixture reply.', now(), 'rls_check'),
  (:'fx_lumen_reply',  :'lumen',  :'lucia', 'rls_check fixture', 'Fixture message.', 'Fixture reply.', now(), 'rls_check');

insert into public.reviews (id, reply_id, reviewer_id, score) values
  (:'fx_marta_review', :'fx_marta_reply', :'marta', 4),
  (:'fx_nuria_review', :'fx_lumen_reply', :'nuria', 4);

insert into public.review_issues (review_id, issue_type_id)
select :'fx_nuria_review', max(id) from public.issue_types;

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
  -- Write checks act on the fixtures, never on rows the app may have changed.
  :'fx_voltra_reply'::uuid                                            as voltra_unreviewed_reply,
  :'fx_lumen_reply'::uuid                                             as lumen_reply,
  :'fx_voltra_reply'::uuid                                            as dani_reply,
  :'fx_marta_review'::uuid                                            as marta_review,
  :'fx_nuria_review'::uuid                                            as nuria_review,
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
