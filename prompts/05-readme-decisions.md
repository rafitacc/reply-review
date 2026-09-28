# PR 5 — Cleanup, README and DECISIONS.md

## Goal
Make the repository easy for a stranger to run and read, and write down the
decisions behind it. Follow CLAUDE.md. No product code changes in this PR.

## Git workflow
Branch `docs/05-readme-decisions` from `main`. Small commits, no squash.
Commit this prompt as `prompts/05-readme-decisions.md`. Open the PR with
`gh pr create`. Do not merge.

## 1. Cleanup (first commit)
An earlier commit accidentally added local files. Remove them with a normal
commit (do NOT rewrite history) and add them to `.gitignore`:
- `supabase/snippets/`
- `.playwright-mcp/`
- `.claude/launch.json`

## 2. README.md
Goal: clone to running in under ten minutes. Include:
- One paragraph: what the tool is and who it is for.
- Starter: `create-next-app` (say so explicitly).
- Prerequisites: Node version, Docker Desktop running. No global Supabase CLI
  needed (it is a dev dependency).
- Setup, as copy-paste commands: clone, `npm install`,
  `cp .env.example .env.local`, `npm run db:start`, paste the anon key it prints
  into `.env.local`, `npm run db:reset`, `npm run dev`.
- Demo users table: name, email, role, brands. Password `password123`.
- How to switch role: the switcher in the top bar.
- A two-minute tour: as Marta review a reply with the keyboard, then open
  Brands → Voltra; as Dani open My feedback; as Tomás paste one of Dani's
  feedback URLs and get a 404.
- Security check: `npm run db:rls-check`, what it proves, and a sample of its output.
- Project structure: short tree of `src/lib/data`, `src/app`, `supabase/`, `prompts/`.
- Time spent: **4 h 25 min**, including reading the brief and planning.
- Tests, one line: the RLS check script is the one test that exists; next I would
  add integration tests for `saveReview` (insert, edit, double submit, tag
  changes), and it was not the best use of hour five because authorization was
  already covered and the flows were verified by hand.
- Troubleshooting: Docker not running; port already in use; "run db:reset" if the
  RLS check says the seed is missing.

## 3. DECISIONS.md — two pages maximum (~900 words), direct, no filler
Write a first draft from the points below. I will edit it in my own words, so keep
it plain and factual. Use exactly these sections:

### Product
- Real problem: review happens informally, a lead reads ~5 replies a day, leaves
  no record, can't coach from it or prove improvement to a client.
- Reading chosen: the review workflow. Without recorded reviews there is no trend
  and no coaching library, so the loop comes first. Brand summary is the minimum
  proof on top of it.
- Left out and why: coaching library, client-facing reports/export, helpdesk
  import (schema keeps `source` + `external_id`), real auth, any AI in the product.
- Where a model could earn its place: choosing which 5 of ~30 replies the lead
  reads (flagging likely problems: refunds offered, wrong product facts, skipped
  order history). Never scoring. Before trusting it: measured against a few
  hundred lead reviews, the lead sees why each reply was flagged, and random
  sampling stays in the mix so the model can't hide its blind spots.
- Questions before V2: do two leads ever review the same brand; should specialists
  be able to reply to or dispute a review; does each brand need its own rubric;
  what exactly would a client see; how should the 5 replies be sampled.

### Architecture
- Next.js App Router, Server Components for reads, Server Actions for writes,
  data access in `src/lib/data`.
- Data model: role lives on `brand_members`; composite FK so a reply can only
  belong to a member of its brand; `issue_types` as a table, not an enum;
  `(source, external_id)` unique for future import.
- Authorization: RLS in Postgres on every table, deny by default; helpers are
  `security definer` in a private schema with an empty search_path; column grants
  so reviews can only edit score and comment and can't be backdated; the app never
  uses the service role key. Why the database: it holds for every client, including
  someone calling the REST API directly. `rls_check.sql` proves it (28 checks).
- Fake login: the switcher signs in as seeded Supabase users on the server, so
  `auth.uid()` is real. Real auth would need: SSO or magic links for staff,
  provisioning of `profiles` and `brand_members` from an admin screen, removing the
  demo password and DEMO_MODE, and session expiry.
- What breaks first: brand summary aggregates in TypeScript over every review in
  the period; move it to a SQL view with `security_invoker = true`. The queue is
  capped at 100 rows. Tag replacement is two requests, not a transaction.

### AI
- How I worked: `CLAUDE.md` with context and rules, one prompt per PR (all in
  `prompts/`), the agent wrote the code and opened each PR, I tested each role in
  the browser and read the diff before writing the review.
- Where I overrode it (placeholders, I will fill in examples): PR 2 insert on
  reviews allowed a custom `created_at`, which would let someone backdate the
  evidence; PR 2 checks never touched `review_issues`; PR 3 raw Postgres errors
  reached the browser; PR 3 the RLS check depended on app state and broke after I
  reviewed every Voltra reply.
- A prompt excerpt I'm pleased with: leave a marked placeholder, I will paste it.

### Status
- Finished, half done, never touched, and the order I'd pick things up.
- Leave a marked placeholder for "the one thing I'd flag hardest", I will write it.
- Mention the accidental commit of local files and that it was cleaned up in this
  PR instead of rewriting history.
