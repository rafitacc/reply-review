# PR 3 — Design system and the lead review flow

## Goal
Build the core of the product: a team lead opens the tool, sees recent replies
for the brands they lead, and reviews them quickly (score, issue tags, comment).
Follow CLAUDE.md, especially sections 3, 4, 7 and 10. The specialist view and the
brand summary are PR 4, not this one.

## Git workflow
Branch `feat/03-lead-review` from `main`. Small commits, no squash.
Commit this prompt as `prompts/03-lead-review.md`. Open the PR with
`gh pr create`. Do not merge.

## 1. Design system (first commit, keep it small)
- Add daisyUI. Define two custom themes, `reply-light` and `reply-dark`, following
  CLAUDE.md section 7: zinc neutrals, one accent (deep indigo), score colours only
  for small badges (1–2 error, 3 warning, 4–5 success). Follow system preference.
- Geist Sans for UI, Geist Mono for dates and metadata (`next/font`).
- Fixed type scale 12 / 14 / 16 / 20 / 28. Reply bodies at 15–16px, line height 1.6,
  max width ~70ch.
- 1px borders, 8px radius, no heavy shadows. No hard-coded hex values in components.
- App shell: slim top bar with the product name, the current user and the user
  switcher restyled as a compact dropdown.

## 2. Routing
- `/`: if the current user leads at least one brand, redirect to `/review`.
  Otherwise show a simple placeholder "Your feedback is coming in the next version"
  (PR 4 replaces it).
- `/review`: the lead's queue.
- `/review/[replyId]`: review one reply.

## 3. The queue (`/review`)
- Recent replies the lead can see, newest first, grouped by day
  ("Yesterday", "Mon 21 Sep"...).
- Filters in the URL (so they survive refresh): brand (only brands the user leads)
  and status (`to review` default, `reviewed`, `all`).
- Each row: brand badge, specialist name, subject, one-line excerpt, time sent,
  and a score badge if reviewed. The whole row links to the review page.
- A small counter at the top: "N to review".

## 4. The review page (`/review/[replyId]`)
- Left: the customer message, then the specialist's reply, clearly separated
  and comfortable to read. Metadata: brand, specialist, time sent.
- Right: the brand's voice guidelines (collapsible), then the form:
  - Score 1–5 as five buttons.
  - Issue tags as toggle chips, loaded from `issue_types`.
  - Comment textarea.
  - "Save" and "Save and next" (goes to the next reply still to review
    with the same filters).
- Keyboard: keys 1–5 set the score and Cmd/Ctrl+Enter saves, but number keys
  must NOT change the score while the focus is in the textarea.
- If this lead already reviewed the reply, the form opens pre-filled and saving
  edits the review.
- If the reply does not exist or RLS hides it, call `notFound()`. Never reveal
  whether a reply from another brand exists.

## 5. Saving (Server Action)
- `saveReview` in `src/lib/reviews/actions.ts` (or similar), validates input on the
  server: score integer 1–5, known issue type ids, comment max 2000 chars.
- Insert when there is no review yet, update `score` and `comment` when there is.
  Do NOT use upsert: `authenticated` may only update `score` and `comment`, and an
  upsert tries to set every column, so it would be rejected by the column grants.
- Never send `reviewer_id` from the browser; take it from the session on the server.
- Tags: replace the review's tags with the submitted set (delete the ones removed,
  insert the ones added). If this is not atomic, say so in the PR description.
- Revalidate the queue after saving.

## 6. States (designed, not defaulted)
- Empty queue: "Nothing left to review for this brand" with a link to see
  reviewed replies.
- `loading.tsx` with skeletons for the queue and the review page.
- `error.tsx` with a clear message and a retry button.
- Save errors shown inline in the form, without losing what the lead typed.

## Data access
Queries live in `src/lib/data/replies.ts` and `src/lib/data/reviews.ts`.
Filters in queries are for UX; access control is RLS. Use generated types, no `any`.

## How to verify (put in the PR description)
- As Marta: queue shows Voltra and Packwell only; review a reply with keyboard
  only; edit it; "Save and next" works.
- As Nuria: open a Voltra reply URL copied from Marta's session → 404.
- As Dani: `/review` shows no lead queue.
- `npm run db:rls-check` still passes.
- Screenshots of the queue and the review page, light and dark.
