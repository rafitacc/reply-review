# PR 4 — Specialist feedback view and brand summary

## Goal
Close the loop. A specialist reads back their own scores and what the lead wrote.
A lead opens a brand and sees how it is going: average, trend, recurring issues,
per specialist. Follow CLAUDE.md, especially sections 3, 4, 7 and 10.
Reuse the design system and components from PR 3. No new UI libraries, no chart
library: simple bars with CSS are enough.

## Git workflow
Branch `feat/04-specialist-and-summary` from `main`. Small commits, no squash.
Commit this prompt as `prompts/04-specialist-and-summary.md`. Open the PR with
`gh pr create`. Do not merge.

## 1. Routing and navigation
- `/`: leads go to `/review` (as today); users who only write replies go to
  `/feedback`. Remove the "coming in the next version" placeholder.
- Top bar links, shown by role (UX only, access is still RLS):
  - Leads: "Review" and "Brands" (a small menu listing the brands they lead).
  - Specialists: "My feedback".
  - Someone who is both sees both.

## 2. Specialist: `/feedback`
- Only the signed-in user's own replies that have at least one review, newest
  review first.
- Header: average score in the period, number of reviewed replies, and their
  most frequent issue tags. Period filter in the URL: last 7, 14 (default), 30 days.
- Brand filter (only brands where they are a specialist).
- Each item: brand badge, subject, score badge, issue tags, the lead's comment,
  reviewer name, review date. Links to `/feedback/[replyId]`.
- `/feedback/[replyId]`: read-only page with the customer message, their reply,
  and every review on it (score, tags, comment, reviewer, date). If the reply is
  not theirs or does not exist, `notFound()`, same as PR 3.
- Empty state: "No feedback yet. When your lead reviews one of your replies,
  it shows up here."

## 3. Lead: `/brands/[slug]`
- Only for brands the user leads; otherwise `notFound()`.
- Period filter in the URL: 7, 14 (default), 30 days.
- Top: average score, number of reviews, and replies reviewed vs replies sent in
  the period. Next to the average, the change vs the previous period of the same
  length ("+0.4 vs previous 14 days"), or "No previous data".
- Always show the sample size ("Based on 8 reviews"). If there are fewer than 5
  reviews, say the average is not reliable yet.
- Trend: average score per week as horizontal CSS bars, with the count per week.
- Recurring issues: issue tags ranked by count in the period, CSS bars.
- By specialist: name, reviewed replies, average score, top issue.
- Latest reviews: last 5, each linking to `/review/[replyId]`.
- Empty state for a period with no reviews.

## 4. Aggregation (important)
- Put the queries in `src/lib/data/feedback.ts` and `src/lib/data/brand-summary.ts`.
- For V1, fetch the reviews of the period through the normal RLS-bound client and
  aggregate in TypeScript. Explain in the PR description why this is fine now and
  what you would change when the volume grows.
- Do NOT create a SQL view or function that bypasses RLS. If you add a view,
  it must be `with (security_invoker = true)`; if you add a function, it must not
  be `security definer`. Say which you chose and why.
- Dates are compared in UTC; say so in the PR description.

## 5. States
Reuse the loading, error and not-found patterns from PR 3 for both new areas.

## How to verify (put in the PR description)
- As Dani: `/feedback` shows only his replies, from Voltra and Packwell.
- As Tomás: only Voltra; a `/feedback/<Dani's reply id>` URL returns 404;
  `/brands/voltra` returns 404.
- As Marta: `/brands/voltra` shows average, trend, issues and specialists;
  changing the period changes the numbers; reviewing a new reply updates the summary.
- As Nuria: `/brands/voltra` returns 404.
- `npm run db:reset && npm run db:rls-check` passes.
- Screenshots of `/feedback` and `/brands/voltra`, light and dark.
