# PR 1 — Project setup, schema and seed data

## Context
We are building `reply-review`, an internal tool for a customer-experience agency.
The agency answers support email on behalf of several ecommerce brands. Team leads
review replies that specialists already sent, score them, and tag what was wrong.
Specialists read back their own scores. This is NOT a helpdesk: nobody talks to
customers here. No AI features in the product.

This PR only sets up the project, the database schema and realistic seed data.
No UI beyond the default page, no auth flow, no RLS policies yet (those come in PR 2).

## Stack (fixed)
- Next.js (App Router) + TypeScript, `src/` directory
- Tailwind CSS (daisyUI will be added later, do not configure themes now)
- Supabase running locally via the Supabase CLI (`supabase init`, `supabase start`)
- `@supabase/supabase-js` and `@supabase/ssr` installed, no client code yet

## Git workflow
1. Create branch `feat/01-schema-and-seed` from `main`.
2. Make small, meaningful commits (setup, migration, seed, types). Do not squash.
3. Open a pull request with `gh pr create` whose description explains: what changed,
   the key data-model decisions and why, and how to verify locally.
4. Do not merge. I will review the PR first.

## Data model
Write it as a single migration in `supabase/migrations/`.

- `profiles`: `id uuid PK references auth.users(id) on delete cascade`,
  `full_name text not null`, `created_at timestamptz default now()`.
- `brands`: `id uuid PK`, `name text not null unique`, `slug text not null unique`,
  `voice_guidelines text not null` (what a good reply looks like for this brand),
  `created_at`.
- `brand_members`: `brand_id`, `user_id` (references profiles), `role` with a check
  constraint (`'lead' | 'specialist'`), primary key `(brand_id, user_id)`.
  Role lives on the membership, not on the user, so a person can lead one brand and
  write replies for another.
- `replies`: `id uuid PK`, `brand_id`, `specialist_id`, `subject text`,
  `customer_message text not null`, `reply_body text not null`,
  `sent_at timestamptz not null`, `first_response_minutes int`,
  `source text not null default 'seed'`, `external_id text`, `created_at`.
  - Composite FK `(brand_id, specialist_id)` references `brand_members(brand_id, user_id)`,
    so a reply can only belong to someone who is a member of that brand.
  - Unique `(source, external_id)` so a future helpdesk import can upsert safely.
  - Indexes on `(brand_id, sent_at desc)` and `(specialist_id, sent_at desc)`.
- `issue_types`: `id smallint PK`, `slug text unique`, `label text`, `description text`.
  Use a lookup table, not a Postgres enum, so new issue types are a data change,
  not a migration. Seed: `wrong_tone`, `answered_different_question`,
  `incorrect_information`, `skipped_order_history`, `would_not_resolve`, `too_slow`.
- `reviews`: `id uuid PK`, `reply_id` (on delete cascade), `reviewer_id` (references
  profiles), `score smallint not null check (score between 1 and 5)`,
  `comment text`, `created_at`, `updated_at`. Unique `(reply_id, reviewer_id)`.
- `review_issues`: `review_id`, `issue_type_id`, primary key on both.

Enable RLS on every table in this migration with no policies, so everything is
denied by default until PR 2 adds explicit policies. Add a comment in the migration
saying so.

## Seed data (`supabase/seed.sql`)
It must run cleanly with `supabase db reset`.

Users: create them in `auth.users` and `auth.identities` with fixed UUIDs, confirmed
emails and the shared password `password123` (hashed with `crypt()` / `gen_salt('bf')`).
Set token columns to empty strings, not null, or GoTrue login fails. Then insert
matching `profiles`.

- Leads: Marta (marta@reply-review.test), Nuria (nuria@reply-review.test)
- Specialists: Dani, Lucía, Tomás (same email pattern)

Brands (all invented):
- **Voltra**, electric scooters. A good reply diagnoses before offering a return,
  because many complaints are usage errors (battery lock, firmware, tyre pressure).
  Warm, patient, asks one clarifying question at a time.
- **Packwell**, industrial packaging supplier. A good reply is fast, exact and about
  three lines: quantities, SKUs, dates. No small talk.
- **Lumen**, skincare. Gentle, reassuring, never gives medical advice, always checks
  order history before answering about deliveries.

Memberships:
- Marta leads Voltra and Packwell. Nuria leads Lumen.
- Dani: Voltra and Packwell. Lucía: Packwell and Lumen. Tomás: Voltra.

Replies: about 18 in total, 6 per brand, spread over the last 14 days using
`now() - interval`, with at least 5 sent "yesterday". Write them as real,
plausible support emails, not lorem ipsum. The brands must clearly not sound alike.
Include deliberate problems a lead would catch:
- A Voltra reply that offers a refund immediately without any diagnosis.
- A Packwell reply that is long, chatty and vague about the delivery date.
- A reply that states something wrong about the customer's own product.
- A Lumen reply that answers a delivery question without checking order history.
- At least two replies that are genuinely excellent for their brand.

Reviews: about 12, spread over the 14 days, with scores that make the averages
meaningful, comments written as a real team lead would write them, and issue tags
that match the problem in each reply. Leave the rest unreviewed.

## Also include
- Generate types with `supabase gen types typescript --local` into
  `src/lib/database.types.ts` and add an npm script `db:types` for it.
- npm scripts: `db:start`, `db:reset`.
- A `CLAUDE.md` already exists at the root. Do not rewrite it. Only update it if something in this PR changes a convention, and mention it in the PR description., the stack, the git
  workflow, and the rule that authorization is always enforced in the database
  via RLS, never only in the UI.
- A `.env.example` with the local Supabase URL and anon key placeholders.
  Never commit real keys. Never use the service role key in app code.

## How to verify (put this in the PR description)
- `supabase start` then `npm run db:reset` completes with no errors.
- In Supabase Studio: 5 users, 3 brands, ~18 replies, ~12 reviews.
- Querying any table with the anon key returns nothing (RLS on, no policies).
