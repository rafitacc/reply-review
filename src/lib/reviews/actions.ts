"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { findNextToReview, getReply } from "@/lib/data/replies";
import {
  getMyReview,
  insertReview,
  listIssueTypes,
  replaceReviewIssues,
  updateReview,
} from "@/lib/data/reviews";
import { getCurrentUser, getLedBrands } from "@/lib/data/session";
import { filtersToQuery, isUuid, STATUSES, type QueueFilters, type Status } from "./filters";
import { COMMENT_MAX_LENGTH } from "./limits";

export type SaveReviewInput = {
  replyId: string;
  score: number;
  issueTypeIds: number[];
  comment: string;
  intent: "save" | "next";
  filters: QueueFilters;
};

export type SaveReviewResult = { ok: true; savedAt: string } | { ok: false; error: string };

type Valid = Omit<SaveReviewInput, "comment"> & { comment: string | null };

// Everything from the browser is untrusted, including its shape. Note there is
// no reviewer in the input: who is reviewing comes from the session.
function validate(input: unknown): Valid | string {
  if (typeof input !== "object" || input === null) return "The form data was not readable.";
  const raw = input as Record<string, unknown>;

  if (typeof raw.replyId !== "string" || !isUuid(raw.replyId)) return "This reply is not available.";
  if (typeof raw.score !== "number" || !Number.isInteger(raw.score) || raw.score < 1 || raw.score > 5) {
    return "Pick a score from 1 to 5.";
  }
  if (
    !Array.isArray(raw.issueTypeIds) ||
    !raw.issueTypeIds.every((id): id is number => typeof id === "number" && Number.isInteger(id))
  ) {
    return "The issue tags were not readable.";
  }
  if (typeof raw.comment !== "string") return "The comment was not readable.";
  const comment = raw.comment.trim();
  if (comment.length > COMMENT_MAX_LENGTH) {
    return `Keep the comment under ${COMMENT_MAX_LENGTH} characters (it has ${comment.length}).`;
  }
  const intent = raw.intent === "next" ? "next" : "save";

  const rawFilters = (typeof raw.filters === "object" && raw.filters !== null ? raw.filters : {}) as Record<
    string,
    unknown
  >;
  const filters: QueueFilters = {
    brand: typeof rawFilters.brand === "string" ? rawFilters.brand : null,
    status: STATUSES.includes(rawFilters.status as Status) ? (rawFilters.status as Status) : "to_review",
  };

  return {
    replyId: raw.replyId,
    score: raw.score,
    issueTypeIds: [...new Set(raw.issueTypeIds)],
    comment: comment === "" ? null : comment,
    intent,
    filters,
  };
}

export async function saveReview(input: unknown): Promise<SaveReviewResult> {
  const valid = validate(input);
  if (typeof valid === "string") return { ok: false, error: valid };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session has ended. Pick a demo user again, then save." };

  let nextHref: string | null = null;
  try {
    // These checks give a clear message. They are not the protection: RLS
    // refuses the write anyway if the user does not lead the reply's brand.
    const [reply, ledBrands, issueTypes] = await Promise.all([
      getReply(valid.replyId),
      getLedBrands(user.id),
      listIssueTypes(),
    ]);
    if (!reply || !ledBrands.some((b) => b.brandId === reply.brand.id)) {
      return { ok: false, error: "You can only review replies of brands you lead." };
    }
    const knownIds = new Set(issueTypes.map((t) => t.id));
    if (!valid.issueTypeIds.every((id) => knownIds.has(id))) {
      return { ok: false, error: "One of the issue tags no longer exists. Reload the page and try again." };
    }

    const content = { score: valid.score, comment: valid.comment };
    let existing = await getMyReview(valid.replyId, user.id);
    let reviewId: string;

    if (existing) {
      if (!(await updateReview(existing.id, content))) {
        return { ok: false, error: "This review could not be updated. You may no longer lead this brand." };
      }
      reviewId = existing.id;
    } else {
      const inserted = await insertReview(valid.replyId, user.id, content);
      if ("id" in inserted) {
        reviewId = inserted.id;
      } else if (inserted.code === "23505") {
        // Saved twice in a row (e.g. a double submit): the first one won, so
        // this save becomes an edit of it.
        existing = await getMyReview(valid.replyId, user.id);
        if (!existing || !(await updateReview(existing.id, content))) {
          return { ok: false, error: "This review was saved elsewhere. Reload the page to see it." };
        }
        reviewId = existing.id;
      } else {
        return { ok: false, error: `The review was not saved: ${inserted.error}` };
      }
    }

    await replaceReviewIssues(reviewId, existing?.issueTypeIds ?? [], valid.issueTypeIds);

    if (valid.intent === "next") {
      const brandIds = ledBrands
        .filter((b) => valid.filters.brand === null || b.brandSlug === valid.filters.brand)
        .map((b) => b.brandId);
      const nextId = await findNextToReview(user.id, brandIds, valid.replyId);
      nextHref = nextId
        ? `/review/${nextId}${filtersToQuery(valid.filters)}`
        : `/review${filtersToQuery({ ...valid.filters, status: "to_review" })}`;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return { ok: false, error: `${message} Your score, tags and comment are still here; try saving again.` };
  }

  revalidatePath("/review", "layout");
  // redirect() throws, so it stays outside the try/catch above.
  if (nextHref) redirect(nextHref);
  return { ok: true, savedAt: new Date().toISOString() };
}
