import "server-only";

import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

type IssueTypeRow = Database["public"]["Tables"]["issue_types"]["Row"];

export type IssueType = Pick<IssueTypeRow, "id" | "slug" | "label" | "description">;

export type MyReview = {
  id: string;
  score: number;
  comment: string | null;
  issueTypeIds: number[];
  updatedAt: string;
};

export async function listIssueTypes(): Promise<IssueType[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("issue_types")
    .select("id, slug, label, description")
    .order("id");
  if (error) throw new Error(`Could not load issue types: ${error.message}`);
  return data;
}

// The current lead's own review of a reply, if they wrote one. Other leads'
// reviews of the same reply are not part of this lead's form.
export async function getMyReview(replyId: string, reviewerId: string): Promise<MyReview | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("id, score, comment, updated_at, review_issues ( issue_type_id )")
    .eq("reply_id", replyId)
    .eq("reviewer_id", reviewerId)
    .maybeSingle();
  if (error) throw new Error(`Could not load your review: ${error.message}`);
  if (!data) return null;

  return {
    id: data.id,
    score: data.score,
    comment: data.comment,
    issueTypeIds: data.review_issues.map((issue) => issue.issue_type_id),
    updatedAt: data.updated_at,
  };
}

export type ReviewContent = {
  score: number;
  comment: string | null;
};

// Writes are split into insert and update on purpose, not an upsert:
// `authenticated` may only insert (reply_id, reviewer_id, score, comment) and
// only update (score, comment). An upsert would try to set every column on
// conflict and be rejected by those column grants.

// Returns the new review id, or the database error (RLS refusal, or 23505
// when a review by this lead already exists).
export async function insertReview(
  replyId: string,
  reviewerId: string,
  content: ReviewContent,
): Promise<{ id: string } | { error: string; code?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .insert({ reply_id: replyId, reviewer_id: reviewerId, ...content })
    .select("id")
    .single();
  if (error) return { error: error.message, code: error.code };
  return { id: data.id };
}

// Returns false when no row was updated, which is what RLS looks like from
// here (the review is not yours, or you no longer lead the brand).
export async function updateReview(reviewId: string, content: ReviewContent): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .update(content)
    .eq("id", reviewId)
    .select("id");
  if (error) throw new Error(`Could not update the review: ${error.message}`);
  return data.length === 1;
}

// Makes the review's tags equal to `issueTypeIds`: inserts the missing ones,
// then deletes the ones no longer selected. These are two separate requests,
// so this is NOT atomic. If the second one fails the review keeps a superset
// of the chosen tags, never loses one it should have; saving again fixes it.
export async function replaceReviewIssues(
  reviewId: string,
  current: readonly number[],
  next: readonly number[],
): Promise<void> {
  const supabase = await createClient();
  const toAdd = next.filter((id) => !current.includes(id));
  const toRemove = current.filter((id) => !next.includes(id));

  if (toAdd.length > 0) {
    const { error } = await supabase
      .from("review_issues")
      .insert(toAdd.map((issue_type_id) => ({ review_id: reviewId, issue_type_id })));
    if (error) throw new Error(`Could not add issue tags: ${error.message}`);
  }

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("review_issues")
      .delete()
      .eq("review_id", reviewId)
      .in("issue_type_id", toRemove);
    if (error) throw new Error(`Could not remove issue tags: ${error.message}`);
  }
}
