import { IssueTags } from "@/components/review/issue-tags";
import { ScoreBadge } from "@/components/review/score-badge";
import type { ReceivedReview } from "@/lib/data/feedback";
import { dateTime } from "@/lib/format";

// One lead's review as the specialist reads it: score, tags, then the comment
// in reading type, then who wrote it and when.
export function ReviewNote({ review }: { review: ReceivedReview }) {
  return (
    <article className="flex flex-col gap-3 rounded-box border border-base-300 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <ScoreBadge score={review.score} />
        <IssueTags labels={review.issues.map((issue) => issue.label)} />
      </div>
      {review.comment ? (
        <p className="prose-reply">{review.comment}</p>
      ) : (
        <p className="text-base-content/60">No comment, only the score.</p>
      )}
      <p className="font-mono text-xs text-base-content/60">
        {review.reviewerName} · <time dateTime={review.createdAt}>{dateTime(review.createdAt)}</time>
      </p>
    </article>
  );
}
