# PR 2 — User switcher, server session and RLS policies

## Goal
Make "who can see what" real and enforced in the database. Authentication stays
fake (a user switcher), authorization is real (RLS on every table).
Follow CLAUDE.md, especially sections 4, 8 and 10. No real UI yet beyond a
minimal page that proves the session works; the design system comes in PR 3.

## Git workflow
Branch `feat/02-auth-rls` from `main`. Small commits, no squash.
Open the PR with `gh pr create`. Do not merge.
Commit this prompt as `prompts/02-auth-rls.md`.

## 1. Supabase clients and session
- `src/lib/supabase/server.ts`: per-request server client with `@supabase/ssr`
  using Next.js cookies.
- `src/lib/supabase/client.ts`: browser client (anon key only).
- `src/middleware.ts`: refresh the Supabase session on each request, following
  the official `@supabase/ssr` pattern for the App Router.
- Never use the service role key anywhere in `src/`.

## 2. User switcher (fake login)
- `src/lib/demo-users.ts`: the list of seeded users (email, name, a short label
  like "Lead · Voltra, Packwell"). Hardcoding who the demo users are is fine;
  what they can see must NOT be hardcoded.
- A Server Action `switchUser(email)` that validates the email is in the demo list,
  then calls `signInWithPassword` on the server with `DEMO_PASSWORD` from env.
  The password must never reach the browser.
- A Server Action `signOut()`.
- The switcher only works when `DEMO_MODE=true`. Add `DEMO_MODE` and
  `DEMO_PASSWORD` to `.env.example`.
- A small unstyled switcher component (a select) placed in the root layout.
  It will be redesigned in PR 3.

## 3. RLS policies (new migration, never edit the PR 1 migration)
Create helper functions in a private schema or with `security definer`,
`stable`, and `set search_path = ''` (fully qualify table names inside them)
to avoid policy recursion on `brand_members`:
- `is_brand_member(brand_id uuid) returns boolean`
- `is_brand_lead(brand_id uuid) returns boolean`

Policies, all for the `authenticated` role only. `anon` gets nothing.
- `brands`: select if `is_brand_member(id)`.
- `brand_members`: select own rows, or all rows of brands where the user is lead.
- `profiles`: select own profile, or profiles of people who share a brand with
  the user.
- `issue_types`: select for any authenticated user.
- `replies`: select if `is_brand_lead(brand_id)` OR `specialist_id = auth.uid()`.
  A specialist must NOT see other specialists' replies, even within the same brand.
  No insert, update or delete from the app.
- `reviews`:
  - select if the user leads the reply's brand, or the reply's `specialist_id`
    is the user.
  - insert and update only if the user leads the reply's brand AND
    `reviewer_id = auth.uid()` (use `with check`, so nobody can write a review
    in someone else's name).
  - no delete.
- `review_issues`: select mirrors `reviews`; insert and delete only if the
  parent review belongs to the user and the user leads that brand.

## 4. Proof page
Replace the home page with a minimal server-rendered page showing: the current
user, their brand memberships, and the count of replies and reviews they can see.
This is only a proof for this PR.

## 5. RLS check script
Add `supabase/tests/rls_check.sql` that, inside a transaction, impersonates users
with `set local role authenticated` and
`set local request.jwt.claims = '{"sub": "<uuid>"}'`, and selects counts to show:
- Tomás (specialist) sees only his own replies and zero Packwell or Lumen data.
- Nuria (lead of Lumen) sees zero Voltra or Packwell replies.
- Marta cannot insert a review with `reviewer_id` set to Nuria.
Document how to run it in the PR description. This is a verification script,
not a test suite.

## How to verify (put in the PR description)
- `npm run db:reset` then `npm run dev`.
- Switch between users and watch the visible counts change.
- Run the RLS check script and paste its output in the PR description.
- As a specialist, call the REST API directly with the session's access token
  for another brand's replies and show it returns `[]`.
