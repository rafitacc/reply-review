import "server-only";

import { average, rankIssues, type IssueCount } from "@/lib/summary/aggregate";
import { inRange, periodRanges, weekRanges, type Period } from "@/lib/summary/period";
import { createClient } from "@/lib/supabase/server";

// Upper bound on rows read for one summary (two periods of one brand). Matches
// PostgREST's max_rows in supabase/config.toml: past it the numbers would be
// silently incomplete, so the summary says so instead.
export const SUMMARY_ROW_LIMIT = 1000;

// Every reply of the brand sent in the period and the one before it, with
// its reviews. Replies without a review are included to count coverage.
const SUMMARY_SELECT = `
  id, subject, sent_at, specialist_id,
  member:brand_members!replies_brand_member_fkey ( specialist:profiles ( full_name ) ),
  reviews (
    id, score, created_at,
    reviewer:profiles ( full_name ),
    review_issues ( issue_type:issue_types ( id, label ) )
  )
` as const;

export type WeekSummary = { from: string; to: string; average: number | null; reviewCount: number };

export type SpecialistSummary = {
  id: string;
  name: string;
  repliesSent: number;
  repliesReviewed: number;
  average: number | null;
  topIssue: string | null;
};

export type LatestReview = {
  id: string;
  replyId: string;
  subject: string | null;
  score: number;
  createdAt: string;
  reviewerName: string;
  specialistName: string;
  issues: string[];
};

export type BrandSummary = {
  reviewCount: number;
  average: number | null;
  // Null when the previous period has no reviews.
  previousAverage: number | null;
  repliesSent: number;
  repliesReviewed: number;
  weeks: WeekSummary[];
  issues: IssueCount[];
  specialists: SpecialistSummary[];
  latest: LatestReview[];
  // True when the row limit was hit and the numbers only cover part of it.
  capped: boolean;
};

// How one brand is going in a period, for its lead. The caller has already
// checked the user leads the brand (for a clean 404); RLS enforces it anyway,
// since the query goes through the user's own client: for anyone else it
// returns no rows and the summary is empty.
//
// V1 reads the period's rows and aggregates here, in TypeScript. A brand gets
// a few hundred replies a month and only a sample is reviewed, so this is at
// most a few hundred small rows. See the PR 4 description for what changes
// when that stops being true.
export async function getBrandSummary(brandId: string, period: Period): Promise<BrandSummary> {
  const { current, previous } = periodRanges(period);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("replies")
    .select(SUMMARY_SELECT)
    .eq("brand_id", brandId)
    .gte("sent_at", previous.from.toISOString())
    .lt("sent_at", current.to.toISOString())
    .order("sent_at", { ascending: false })
    .limit(SUMMARY_ROW_LIMIT);
  if (error) throw new Error(`Could not load the brand summary: ${error.message}`);

  const replies = data.filter((r) => inRange(r.sent_at, current));
  const previousScores = data
    .filter((r) => inRange(r.sent_at, previous))
    .flatMap((r) => r.reviews.map((rv) => rv.score));

  const reviews = replies.flatMap((reply) =>
    reply.reviews.map((rv) => ({
      id: rv.id,
      replyId: reply.id,
      subject: reply.subject,
      sentAt: reply.sent_at,
      specialistId: reply.specialist_id,
      specialistName: reply.member.specialist.full_name,
      score: rv.score,
      createdAt: rv.created_at,
      reviewerName: rv.reviewer.full_name,
      issues: rv.review_issues.map((ri) => ri.issue_type),
    })),
  );

  const weeks = weekRanges(current).map((week) => {
    const scores = reviews.filter((rv) => inRange(rv.sentAt, week)).map((rv) => rv.score);
    return {
      from: week.from.toISOString(),
      to: week.to.toISOString(),
      average: average(scores),
      reviewCount: scores.length,
    };
  });

  const specialists = new Map<string, SpecialistSummary & { scores: number[]; tags: { id: number; label: string }[] }>();
  for (const reply of replies) {
    const entry = specialists.get(reply.specialist_id) ?? {
      id: reply.specialist_id,
      name: reply.member.specialist.full_name,
      repliesSent: 0,
      repliesReviewed: 0,
      average: null,
      topIssue: null,
      scores: [],
      tags: [],
    };
    entry.repliesSent += 1;
    if (reply.reviews.length > 0) entry.repliesReviewed += 1;
    specialists.set(reply.specialist_id, entry);
  }
  for (const rv of reviews) {
    const entry = specialists.get(rv.specialistId);
    if (!entry) continue;
    entry.scores.push(rv.score);
    entry.tags.push(...rv.issues);
  }

  return {
    reviewCount: reviews.length,
    average: average(reviews.map((rv) => rv.score)),
    previousAverage: average(previousScores),
    repliesSent: replies.length,
    repliesReviewed: replies.filter((r) => r.reviews.length > 0).length,
    weeks,
    issues: rankIssues(reviews.flatMap((rv) => rv.issues)),
    specialists: [...specialists.values()]
      .map(({ scores, tags, ...entry }) => ({
        ...entry,
        average: average(scores),
        topIssue: rankIssues(tags)[0]?.label ?? null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    latest: reviews
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5)
      .map((rv) => ({
        id: rv.id,
        replyId: rv.replyId,
        subject: rv.subject,
        score: rv.score,
        createdAt: rv.createdAt,
        reviewerName: rv.reviewerName,
        specialistName: rv.specialistName,
        issues: rv.issues.map((issue) => issue.label),
      })),
    capped: data.length === SUMMARY_ROW_LIMIT,
  };
}
