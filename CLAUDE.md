# reply-review — Project context

Read this whole file before doing anything. It is the single source of truth for
this repository. When a task prompt and this file disagree, ask before proceeding.

## 1. What this is

`reply-review` is an internal quality-review tool for a customer-experience agency.
The agency answers support email on behalf of several ecommerce brands, in each
brand's voice, from each brand's helpdesk. The customer never knows the agency exists.

One specialist covers two or three brands a day, and every brand wants something
different:

- For a technical product (e.g. electric scooters) a good reply **diagnoses before
  offering a return**, because many complaints are usage errors.
- For a commodity supplier (e.g. packaging) a good reply is **fast, exact and about
  three lines long**.

The same paragraph can be excellent for one brand and wrong for another. Today a team
lead skims the shared inbox and pings people on Slack. There is no record, so nobody
can coach from it or prove improvement to a client.

**This tool is where replies that were already sent get reviewed afterwards.**
It is NOT a helpdesk, inbox or ticketing system. Nobody talks to a customer here.

## 2. Users and roles

- **Team lead** (e.g. Marta): leads several brands. Opens the tool, sees what her
  specialists sent recently, reviews a handful, records a score, tags what was wrong
  and writes a comment. Can see a simple summary per brand.
- **Specialist** (e.g. Dani): sees **only his own** replies, scores and the comments
  written on them. Never anybody else's.

Roles live on the **brand membership**, not on the user: a person could lead one brand
and write replies for another.

## 3. Product scope (decided)

Interpretation chosen: **the review workflow**. Getting through a few replies quickly
and consistently is the core of the product. Everything else builds on having
reviews recorded.

### In scope
1. Lead: list of recent replies for the brands they lead, filterable by brand,
   with reviewed / not reviewed status.
2. Lead: review a reply side by side with the customer message and the brand's voice
   guidelines. Score 1–5, issue tags, comment. Fast, keyboard-friendly.
3. Specialist: "My feedback" view with their own replies, scores and comments.
4. Lead: a simple brand summary — average score, number reviewed, most frequent
   issue tags, latest reviews.
5. A user switcher (fake login) to act as any seeded user.

### Out of scope (on purpose, documented in DECISIONS.md)
- Coaching library of good/bad examples.
- Elaborate trend charts and client-facing reports.
- Importing replies from a real helpdesk. The schema keeps `source` + `external_id`
  so it stays possible later.
- **Any AI or model inside the product.** No automatic scoring, no summaries.
- Real authentication (sign-up, password reset, OAuth).

## 4. Authorization — non-negotiable

Authentication may be faked. **Authorization may not.**

- Seeded users are real Supabase Auth users with a shared password. The user switcher
  signs in as the chosen user **on the server**, so `auth.uid()` is real.
- Every access rule is enforced in Postgres with **Row Level Security**. The UI hiding
  something is never the protection.
- RLS is enabled on every table. Default is deny. Each policy is explicit.
- Rules:
  - A user only sees brands they are a member of.
  - A lead sees and reviews replies of brands they lead.
  - A specialist sees only replies where `specialist_id = auth.uid()` and only the
    reviews on those replies.
  - Only a lead of the reply's brand can create or edit a review on it.
- **Never** use the Supabase `service_role` key in application code. It bypasses RLS.
  It may only appear in local tooling if strictly required, never in `src/`.
- Always use the per-request server client from `@supabase/ssr`, bound to the user's
  session cookies.
- Test to keep in mind: signed in as a specialist, asking the API directly for another
  brand's data must return nothing.

## 5. Stack (fixed, do not swap)

- Next.js, App Router, TypeScript, `src/` directory.
- Supabase (Postgres) running locally with the Supabase CLI.
- `@supabase/supabase-js` + `@supabase/ssr`.
- Tailwind CSS + daisyUI (custom theme, see section 7).
- npm as package manager.

## 6. Data model

Defined in `supabase/migrations/`. Summary:

| Table | Purpose | Key points |
|---|---|---|
| `profiles` | Person | `id` = `auth.users.id`, `full_name` |
| `brands` | Client brand | `name`, `slug`, `voice_guidelines` |
| `brand_members` | Who works on which brand, and how | PK `(brand_id, user_id)`, `role` in (`lead`, `specialist`) |
| `replies` | A reply that was already sent | composite FK `(brand_id, specialist_id)` → `brand_members`; `source` + `external_id` unique for future import |
| `issue_types` | Lookup of what can go wrong | table, not enum, so new types are data changes |
| `reviews` | A lead's judgement of one reply | `score` 1–5, `comment`, unique `(reply_id, reviewer_id)` |
| `review_issues` | Tags on a review | PK `(review_id, issue_type_id)` |

Rules:
- Schema changes only through new migration files. Never edit a merged migration.
- After any schema change, regenerate types: `npm run db:types`.
- Prefer constraints in the database over validation only in TypeScript.

## 7. Design direction — minimal and modern

This is an internal tool, which is not a licence for it to be ugly. The design must
show intent, not defaults.

- **Feel:** calm, quiet, lots of white space, content first. Reading replies is the
  main activity, so text must be comfortable to read.
- **Typography:** Geist Sans for UI, Geist Mono for small metadata (dates, IDs).
  Fixed type scale: 12 / 14 / 16 / 20 / 28 px. Body text at 14–16px with generous
  line height (1.6) for reply bodies. Max ~70 characters per line for reply text.
- **Colour system:**
  - Neutrals (zinc scale) do almost all the work: backgrounds, borders, text.
  - **One** accent colour for primary actions and focus (a deep indigo or teal).
  - Semantic colours only for scores: 1–2 red, 3 amber, 4–5 green, used sparingly
    (small badges or dots, never full backgrounds).
  - Support light and dark mode through daisyUI theme tokens, no hard-coded hex values
    in components.
- **Layout:** thin 1px borders instead of heavy shadows, rounded corners (8px),
  consistent 4/8px spacing grid, a narrow sidebar or top bar for navigation.
- **States are designed, not defaulted:** every list has an empty state with a clear
  message, loading uses skeletons, errors explain what happened and what to do next.
- **Interaction:** the review form should work with the keyboard (1–5 to score,
  Cmd/Ctrl+Enter to save).

## 8. Git workflow — required for every change

1. One branch per piece of work, named `feat/NN-short-name` (e.g. `feat/02-auth-rls`).
2. Small commits with clear messages. **Never squash. Never rebase merged history.**
3. When the work is done, open a pull request with `gh pr create`. The description
   must include: what changed, key decisions and why, and how to verify locally.
4. **Never merge.** The human reviews the PR in writing first. Review comments are
   addressed in follow-up commits on the same branch.
5. Keep each PR readable in about five minutes.

Each task prompt is saved in `prompts/NN-name.md` and committed with its PR.

## 9. PR plan

| PR | Branch | Content |
|---|---|---|
| 1 | `feat/01-schema-and-seed` | Next.js + Supabase setup, schema migration, realistic seed |
| 2 | `feat/02-auth-rls` | User switcher, server session, RLS policies |
| 3 | `feat/03-lead-review` | Design system + lead reply list and review form |
| 4 | `feat/04-specialist-and-summary` | Specialist feedback view, brand summary, states |
| 5 | `docs/05-readme-decisions` | README (clone to running in <10 min) and DECISIONS.md |

Total time budget is tight. Prefer a complete, coherent flow with rough edges over
one polished screen. If something does not fit, stop and flag it in the PR
description instead of expanding scope.

## 10. Code conventions

- Server Components for reading data; Server Actions for writes.
- Data access lives in `src/lib/data/` (one file per area, e.g. `replies.ts`,
  `reviews.ts`). Components do not build queries inline.
- Supabase clients in `src/lib/supabase/` (`server.ts`, `client.ts`).
- UI components in `src/components/`, grouped by feature.
- Use the generated `Database` types everywhere. No `any`.
- Validate Server Action input on the server before writing.
- Keep it simple: no state management libraries, no ORMs, no extra UI kits beyond
  daisyUI.

## 11. Never do

- Never add AI features to the product.
- Never filter by brand or user only in the frontend as a form of access control.
- Never use the `service_role` key in `src/`.
- Never commit `.env` files or real keys. Only `.env.example`.
- Never merge a PR, squash commits or rewrite history.
- Never use lorem ipsum. Seed content must read like real support emails.
