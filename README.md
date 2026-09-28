# reply-review

An internal quality-review tool for a customer-experience agency that answers
support email for several ecommerce brands, each in its own voice. Team leads use
it to review replies their specialists already sent: read the reply next to the
customer's message and the brand's voice guidelines, score it 1–5, tag what went
wrong and leave a comment. Specialists see only their own replies and the
feedback written on them. It is not a helpdesk: nobody talks to a customer here.

Built on Next.js (App Router), Supabase (local Postgres + Auth) and Tailwind +
daisyUI. The project was started with **`create-next-app`**.

The reasoning behind the scope and the architecture is in
[DECISIONS.md](DECISIONS.md).

## Prerequisites

- **Node.js 20.9 or newer** (required by Next.js 16) and npm.
- **Docker Desktop, running.** The local Supabase stack runs in containers.
- No global Supabase CLI needed: it is a dev dependency and runs through
  `npm run db:*`.

## Setup

```bash
git clone https://github.com/rafitacc/reply-review.git
```

```bash
cd reply-review
```

```bash
npm install
```

```bash
cp .env.example .env.local
```

```bash
npm run db:start
```

The first `db:start` pulls the Supabase images and takes a few minutes. When it
finishes it prints the local URLs and keys. Copy the **anon key** into
`.env.local` as `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the URL in `.env.example` is
already correct). If you lose the output, `npx supabase status -o env` prints it
again as `ANON_KEY`. Do not use the service role key: the app never needs it.

```bash
npm run db:reset
```

This applies the migrations and loads the seed (users, brands, replies, reviews).

```bash
npm run dev
```

Open <http://localhost:3000>.

## Demo users

All users share the password `password123`. You never type it: the switcher
signs in on the server.

| Name | Email | Role | Brands |
|---|---|---|---|
| Marta Soler | marta@reply-review.test | Lead | Voltra, Packwell |
| Nuria Vidal | nuria@reply-review.test | Lead | Lumen |
| Dani Ferrer | dani@reply-review.test | Specialist | Voltra, Packwell |
| Lucía Romero | lucia@reply-review.test | Specialist | Packwell, Lumen |
| Tomás Herrera | tomas@reply-review.test | Specialist | Voltra |

**Switching role:** use the user switcher in the top bar (top right) and pick anyone from the
list. Leads land on the review queue, specialists on My feedback.

## Two-minute tour

1. **As Marta**, open **Review**. Pick a reply marked not reviewed. Read the
   customer message, the reply and Voltra's or Packwell's voice guidelines side by
   side. Press **1–5** to score, pick the issue tags, write a comment and press
   **Cmd+Enter** (Ctrl+Enter on Windows/Linux) to save.
2. Still as Marta, open **Brands → Voltra**: average score, number reviewed, most
   frequent issue tags and latest reviews.
3. **As Dani**, open **My feedback**: only Dani's replies, with scores and
   comments. Open one and copy its URL, or use this one:
   `http://localhost:3000/feedback/c0000000-0000-4000-a000-000000000008`
4. **As Tomás**, paste that URL. It returns a 404: the database does not give
   Tomás the row, so the page has nothing to show.

## Security check

```bash
npm run db:rls-check
```

Runs [`supabase/tests/rls_check.sql`](supabase/tests/rls_check.sql) inside the
database container. It impersonates seeded users the same way PostgREST does
(role `authenticated` plus JWT claims) and checks what each one can read and
write: specialists only see their own replies and the reviews on them, leads only
see their brands, only a lead of the reply's brand can create or edit a review,
reviews can't be backdated or handed to someone else, and anonymous requests see
nothing. It creates its own fixtures and rolls everything back, so it does not
depend on what you clicked in the app. Sample output (28 checks in total):

```
  who  |                     check                     |     expected     |      actual      | result
-------+-----------------------------------------------+------------------+------------------+--------
 Tomás | replies by anyone else                        | 0                | 0                | ok
 Tomás | Packwell or Lumen replies                     | 0                | 0                | ok
 Nuria | Voltra or Packwell reply ids by guess         | 0                | 0                | ok
 Marta | insert review on a Lumen reply                | denied (42501)   | denied (42501)   | ok
 Marta | insert review with a custom created_at        | denied (42501)   | denied (42501)   | ok
 Marta | attach a tag to a review owned by Nuria       | denied (42501)   | denied (42501)   | ok
 Dani  | insert review on his own reply                | denied (42501)   | denied (42501)   | ok
 anon  | replies visible                               | 0                | 0                | ok
 ...

 passed | failed
--------+--------
     28 |      0
```

## Project structure

```
src/
  app/
    review/          lead: reply queue and review form
    brands/[slug]/   lead: brand summary
    feedback/        specialist: My feedback list and reply page
  lib/
    data/            all reads and writes, one file per area (replies, reviews,
                     feedback, brand-summary, session)
    supabase/        per-request server client and browser client (anon key only)
  components/        UI grouped by feature
supabase/
  migrations/        schema and RLS policies
  seed.sql           demo users, brands, replies and reviews
  tests/rls_check.sql
prompts/             the prompt behind each PR
```

## Time spent

**4 h 25 min**, including reading the brief and planning.

## Tests

The RLS check is the one test that exists. Next I would add integration tests for
`saveReview` (insert, edit, double submit, tag changes); it was not the best use of
hour five because authorization was already covered and the flows were verified by
hand.

## Troubleshooting

- **`db:start` fails with "Cannot connect to the Docker daemon"**: start Docker
  Desktop, wait until it says it is running, and try again.
- **Port already in use** (54321–54324 for Supabase, 3000 for Next.js): another
  Supabase project or dev server is running. Stop it (`npx supabase stop` in that
  project, or `npm run db:stop` here) or free the port. Next.js falls back to 3001
  on its own; open the URL it prints.
- **The RLS check says the seeded users and brands are missing**: run
  `npm run db:reset` and try again.
- **The app says `NEXT_PUBLIC_SUPABASE_ANON_KEY is not set`**: copy
  `.env.example` to `.env.local`, fill in the anon key and restart `npm run dev`.
