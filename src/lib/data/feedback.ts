import "server-only";

import { cache } from "react";

import { getReply, type ReplyForReview } from "@/lib/data/replies";
import { getCurrentUser } from "@/lib/data/session";
import { isUuid } from "@/lib/reviews/filters";
import { average, rankIssues, type IssueCount } from "@/lib/summary/aggregate";
import type { Range } from "@/lib/summary/period";
import { createClient } from "@/lib/supabase/server";

// Every review on a reply, with the reviewer's name and tags. RLS lets a
// specialist read the reviews on their own replies and nothing else, and lets
// them read the reviewer's profile because they share the brand.
const REVIEW_SELECT = `
  id, score, comment, created_at,
  reviewer:profiles ( full_name ),
  review_issues ( issue_type:issue_types ( id, label ) )
` as const;

export type ReceivedReview = {
  id: string;
  score: number;
  comment: string | null;
  createdAt: string;
  reviewerName: string;
  issues: { id: number; label: string }[];
};

type ReviewRow = {
  id: string;
  score: number;
  comment: string | null;
  created_at: string;
  reviewer: { full_name: string };
  review_issues: { issue_type: { id: number; label: string } }[];
};

function toReview(row: ReviewRow): ReceivedReview {
  return {
    id: row.id,
    score: row.score,
    comment: row.comment,
    createdAt: row.created_at,
    reviewerName: row.reviewer.full_name,
    issues: row.review_issues.map((ri) => ri.issue_type).sort((a, b) => a.id - b.id),
  };
}

function newestFirst(a: ReceivedReview, b: ReceivedReview): number {
  return b.createdAt.localeCompare(a.createdAt);
}

export type FeedbackItem = {
  replyId: string;
  subject: string | null;
  sentAt: string;
  brand: { name: string; slug: string };
  // Newest first. Usually one: each brand has one lead today.
  reviews: ReceivedReview[];
};

export type MyFeedback = {
  items: FeedbackItem[];
  // Over every review in the period, not per reply.
  average: number | null;
  reviewCount: number;
  topIssues: IssueCount[];
};

type FeedbackQuery = {
  userId: string;
  // Brands where the user is a specialist, already narrowed by the brand filter.
  brandIds: readonly string[];
  range: Range;
};

// The signed-in specialist's own replies sent in the period that have at least
// one review, newest review first. The specialist_id filter selects "mine";
// RLS already refuses anyone else's replies, even to a lead of the same brand.
//
// Aggregation happens here in TypeScript over the period's rows. A specialist
// sends tens of replies a week and only some get reviewed, so this is a few
// dozen rows even for 30 days.
export async function listMyFeedback({ userId, brandIds, range }: FeedbackQuery): Promise<MyFeedback> {
  if (brandIds.length === 0) return { items: [], average: null, reviewCount: 0, topIssues: [] };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("replies")
    .select(
      `id, subject, sent_at,
       member:brand_members!replies_brand_member_fkey ( brand:brands ( name, slug ) ),
       reviews!inner ( ${REVIEW_SELECT} )` as const,
    )
    .eq("specialist_id", userId)
    .in("brand_id", brandIds)
    .gte("sent_at", range.from.toISOString())
    .lt("sent_at", range.to.toISOString());
  if (error) throw new Error(`Could not load your feedback: ${error.message}`);

  const items: FeedbackItem[] = data
    .map((row) => ({
      replyId: row.id,
      subject: row.subject,
      sentAt: row.sent_at,
      brand: row.member.brand,
      reviews: row.reviews.map(toReview).sort(newestFirst),
    }))
    .sort((a, b) => newestFirst(a.reviews[0], b.reviews[0]));

  const reviews = items.flatMap((item) => item.reviews);
  return {
    items,
    average: average(reviews.map((r) => r.score)),
    reviewCount: reviews.length,
    topIssues: rankIssues(reviews.flatMap((r) => r.issues)).slice(0, 3),
  };
}

export type OwnReply = {
  reply: ReplyForReview;
  reviews: ReceivedReview[];
};

// One of the signed-in user's own replies with every review on it. Null when
// the id is malformed, the reply does not exist, RLS hides it, or it is
// someone else's reply that the user can read as a lead: this page is only
// for the person who wrote it.
export const getOwnReply = cache(async (replyId: string): Promise<OwnReply | null> => {
  if (!isUuid(replyId)) return null;
  const user = await getCurrentUser();
  if (!user) return null;

  const reply = await getReply(replyId);
  if (!reply || reply.specialistId !== user.id) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.from("reviews").select(REVIEW_SELECT).eq("reply_id", replyId);
  if (error) throw new Error(`Could not load the reviews: ${error.message}`);

  return { reply, reviews: data.map(toReview).sort(newestFirst) };
});
