-- reply-review: initial schema
--
-- Tables for reviewing support replies that were already sent on behalf of
-- client brands. See CLAUDE.md section 6 for the data model summary.
--
-- ROW LEVEL SECURITY
-- RLS is enabled on every table below and NO policies are defined in this
-- migration. With RLS on and no policies, Postgres denies every read and write
-- for the anon and authenticated roles. That is intentional: access is closed by
-- default until the next migration (PR 2) adds explicit, reviewed policies.

-- ---------------------------------------------------------------------------
-- profiles: one row per person, 1:1 with auth.users
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null check (length(trim(full_name)) > 0),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- brands: client brands the agency answers email for
-- ---------------------------------------------------------------------------
create table public.brands (
  id                uuid primary key default gen_random_uuid(),
  name              text not null unique,
  slug              text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  voice_guidelines  text not null,
  created_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- brand_members: who works on which brand, and in which role.
-- The role lives on the membership, not on the person, so someone can lead
-- one brand and write replies for another.
-- ---------------------------------------------------------------------------
create table public.brand_members (
  brand_id    uuid not null references public.brands (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  role        text not null check (role in ('lead', 'specialist')),
  created_at  timestamptz not null default now(),
  primary key (brand_id, user_id)
);

-- "Which brands does this user belong to?" is the lookup every RLS policy
-- in PR 2 will make; the PK only covers lookups by brand.
create index brand_members_user_id_idx on public.brand_members (user_id);

-- ---------------------------------------------------------------------------
-- replies: a reply that was already sent from the brand's helpdesk
-- ---------------------------------------------------------------------------
create table public.replies (
  id                      uuid primary key default gen_random_uuid(),
  brand_id                uuid not null,
  specialist_id           uuid not null,
  subject                 text,
  customer_message        text not null,
  reply_body              text not null,
  sent_at                 timestamptz not null,
  first_response_minutes  integer check (first_response_minutes >= 0),
  source                  text not null default 'seed',
  external_id             text,
  created_at              timestamptz not null default now(),

  -- A reply can only belong to someone who is a member of that brand.
  constraint replies_brand_member_fkey
    foreign key (brand_id, specialist_id)
    references public.brand_members (brand_id, user_id)
    on delete restrict,

  -- Lets a future helpdesk import upsert on (source, external_id).
  -- Seed rows have a null external_id; nulls are distinct, so they don't clash.
  constraint replies_source_external_id_key unique (source, external_id)
);

create index replies_brand_sent_at_idx      on public.replies (brand_id, sent_at desc);
create index replies_specialist_sent_at_idx on public.replies (specialist_id, sent_at desc);

-- ---------------------------------------------------------------------------
-- issue_types: lookup of what can go wrong in a reply.
-- A table instead of an enum so a new issue type is a data change, not a
-- migration.
-- ---------------------------------------------------------------------------
create table public.issue_types (
  id           smallint primary key,
  slug         text not null unique,
  label        text not null,
  description  text
);

-- ---------------------------------------------------------------------------
-- reviews: a lead's judgement of one reply
-- ---------------------------------------------------------------------------
create table public.reviews (
  id           uuid primary key default gen_random_uuid(),
  reply_id     uuid not null references public.replies (id) on delete cascade,
  reviewer_id  uuid not null references public.profiles (id) on delete restrict,
  score        smallint not null check (score between 1 and 5),
  comment      text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- One review per reviewer per reply; editing a review updates this row.
  constraint reviews_reply_reviewer_key unique (reply_id, reviewer_id)
);

create index reviews_reviewer_id_idx on public.reviews (reviewer_id);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- review_issues: issue tags attached to a review
-- ---------------------------------------------------------------------------
create table public.review_issues (
  review_id      uuid not null references public.reviews (id) on delete cascade,
  issue_type_id  smallint not null references public.issue_types (id) on delete restrict,
  primary key (review_id, issue_type_id)
);

-- Supports "most frequent issue tags" in the brand summary.
create index review_issues_issue_type_id_idx on public.review_issues (issue_type_id);

-- ---------------------------------------------------------------------------
-- Reference data: issue types are part of the schema's meaning, so they ship
-- with the migration rather than only with the dev seed.
-- ---------------------------------------------------------------------------
insert into public.issue_types (id, slug, label, description) values
  (1, 'wrong_tone',                  'Wrong tone',                  'Does not sound like the brand''s voice guidelines.'),
  (2, 'answered_different_question', 'Answered a different question','Replies to something the customer did not ask, or misses what they did ask.'),
  (3, 'incorrect_information',       'Incorrect information',       'States something factually wrong about the product, order or policy.'),
  (4, 'skipped_order_history',       'Skipped order history',       'Answers without checking what the customer actually ordered or received.'),
  (5, 'would_not_resolve',           'Would not resolve',           'The customer will have to write again; the reply does not move the case forward.'),
  (6, 'too_slow',                    'Too slow',                    'First response took longer than the brand expects.');

-- ---------------------------------------------------------------------------
-- Row Level Security: on everywhere, no policies yet (deny by default).
-- ---------------------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.brands         enable row level security;
alter table public.brand_members  enable row level security;
alter table public.replies        enable row level security;
alter table public.issue_types    enable row level security;
alter table public.reviews        enable row level security;
alter table public.review_issues  enable row level security;
