# Decisions

## Product

**The problem.** Review happens informally today. A team lead skims the shared
inbox, reads about five replies a day and pings people on Slack. Nothing is
recorded, so there is nothing to coach from and no way to show a client that
quality is improving.

**The reading I chose: the review workflow.** Without recorded reviews there is
no trend and no coaching library, so the loop comes first: score, tag and comment
on a sent reply, and the specialist sees it. The brand summary is the minimum
proof that the records are worth keeping.

**Left out, on purpose:**

- *Coaching library.* It needs recorded reviews first.
- *Client-facing reports and export.* What a client should see is still open.
- *Helpdesk import.* Replies are seeded; `source` + `external_id` keep it possible.
- *Real authentication.* A switcher over real Supabase users is enough to prove
  authorization, the part that can't be faked.
- *Any AI in the product.*

**Where a model could earn its place.** Not in scoring: the score is the lead's
judgement and the thing we want to record. The useful job is choosing which 5 of
~30 daily replies the lead reads, by flagging likely problems: a refund offered
without diagnosis, product facts that contradict the guidelines, an answer that
ignores the order history. Before trusting it I would want three things: measure
it against a few hundred existing lead reviews, show the lead why each reply was
flagged, and keep random sampling in the mix so the model can't hide its own
blind spots.

**Questions before V2:**

- Do two leads ever review the same brand?
- Should specialists be able to reply to or dispute a review?
- Does each brand need its own rubric, or are shared issue tags enough?
- What exactly would a client see?
- How should the five replies be sampled?

## Architecture

**Shape.** Next.js App Router. Server Components read, Server Actions write, and
all data access lives in `src/lib/data/`.

**Data model.**

- The role lives on `brand_members`, so a person can lead one brand and write
  for another.
- A composite foreign key `(brand_id, specialist_id)` to `brand_members` means a
  reply can only belong to a member of its brand.
- `issue_types` is a table, not an enum: a new tag is a data change.
- `(source, external_id)` is unique, ready for an import.

**Authorization.** Every rule is enforced in Postgres with Row Level Security.
RLS is on for every table, the default is deny, and each policy is explicit.
The helper functions (`is_brand_member`, `is_brand_lead`, `shares_brand_with`)
are `security definer` in a `private` schema with an empty `search_path`, so
policies don't recurse and the helpers can't be called as RPCs. Column grants
limit what a lead can write on `reviews`: insert only `reply_id`, `reviewer_id`,
`score` and `comment`, update only `score` and `comment`, so a review can't be
backdated or handed to someone else. The app only uses the anon key with the
user's session; the service role key is never read in `src/`.

Why the database: a rule in Postgres holds for every client, including someone
calling the REST API directly with a valid session. `supabase/tests/rls_check.sql`
proves it with 28 checks run as real users.

**Fake login.** The switcher signs in as a seeded Supabase user on the server, so
`auth.uid()` in the policies is real. Moving to real authentication would need
SSO or magic links for staff, an admin screen to provision `profiles` and
`brand_members`, removing the demo password and `DEMO_MODE`, and a session expiry
policy.

**What breaks first as it grows:**

- The brand summary loads every review in the period and aggregates in
  TypeScript (capped at 1,000 rows). Next step: a SQL view with
  `security_invoker = true`, so it still runs under RLS.
- The review queue shows at most the 100 newest replies. Fine for a daily sample,
  not for a backlog.
- Saving tags is two requests (insert added, delete removed), not a transaction.
  A failure leaves extra tags, never missing ones; a `security invoker` function
  would make it atomic.

## AI

**How I worked.** `CLAUDE.md` holds the context and the rules (scope,
authorization, stack, design, git workflow). Each PR started from one prompt,
all saved in `prompts/`. The agent wrote the code and opened each PR. I tested
every role in the browser and read the diff before writing my review, and the
fixes went in as follow-up commits on the same branch.

**Where I overrode it:**

- PR 2: insert on `reviews` accepted a custom `created_at`, which would let
  someone backdate the evidence. **[PLACEHOLDER: example / what I asked for]**
- PR 2: the RLS checks never touched `review_issues`.
  **[PLACEHOLDER: example]**
- PR 3: raw Postgres error messages reached the browser.
  **[PLACEHOLDER: example]**
- PR 3: the RLS check depended on app state and broke after I had reviewed every
  Voltra reply. **[PLACEHOLDER: example]**

**A prompt excerpt I'm pleased with:**

> **[PLACEHOLDER: paste prompt excerpt]**

## Status

**Finished.** The in-scope loop: lead queue by brand with review status, keyboard
review form, My feedback, brand summary, user switcher, RLS with the check
script, designed empty/loading/error states, light and dark themes.

**Half done.**

- Tests: the RLS check is the only one; `saveReview` has none.
- Tag saving and the summary aggregation (see Architecture).
- Dates render in the server's time zone.

**Never touched.** Everything in "Left out" above.

**Order I'd pick things up:**

1. Integration tests for `saveReview` (insert, edit, double submit, tag changes).
2. Atomic tag saving through a `security invoker` function.
3. Move the brand summary into a `security_invoker` view.
4. Answer the V2 questions with the leads, then decide between sampling help and
   the coaching library.
5. Real authentication and provisioning.

**The one thing I'd flag hardest:** **[PLACEHOLDER: to write]**

**Housekeeping.** An earlier PR accidentally committed local files
(`supabase/snippets/`, `.playwright-mcp/`, `.claude/launch.json`). They were
removed and added to `.gitignore` in a normal commit in this PR, instead of
rewriting history.
