import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ReviewNote } from "@/components/feedback/review-note";
import { BrandBadge } from "@/components/review/brand-badge";
import { ReplyThread } from "@/components/review/reply-thread";
import { getOwnReply } from "@/lib/data/feedback";
import { getSpecialistBrands } from "@/lib/data/session";
import { dateTime } from "@/lib/format";
import { feedbackQuery, parseFeedbackFilters } from "@/lib/summary/period";

export const metadata: Metadata = { title: "Feedback on a reply · reply-review" };

// Read-only: the specialist sees what they sent and what their lead said.
export default async function FeedbackReplyPage({ params, searchParams }: PageProps<"/feedback/[replyId]">) {
  const { replyId } = await params;
  // Same cached check as the layout; repeated here to narrow the types.
  const own = await getOwnReply(replyId);
  if (!own) notFound();
  const { reply, reviews } = own;

  const brands = await getSpecialistBrands(reply.specialistId);
  const filters = parseFeedbackFilters(await searchParams, brands.map((b) => b.brandSlug));

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <Link
        href={`/feedback${feedbackQuery(filters)}`}
        className="w-fit text-base-content/60 transition-colors hover:text-base-content"
      >
        ← My feedback
      </Link>

      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-medium tracking-tight">{reply.subject ?? "(no subject)"}</h1>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-base-content/70">
          <BrandBadge name={reply.brand.name} />
          <time dateTime={reply.sentAt} className="font-mono text-xs">
            Sent {dateTime(reply.sentAt)}
          </time>
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <ReplyThread reply={reply} replyHeading="You replied" />

        <aside aria-labelledby="reviews-heading" className="flex flex-col gap-3 lg:sticky lg:top-6 lg:self-start">
          <h2 id="reviews-heading" className="font-mono text-xs uppercase tracking-wide text-base-content/60">
            {reviews.length === 1 ? "Review" : `${reviews.length} reviews`}
          </h2>
          {reviews.length === 0 ? (
            <p className="rounded-box border border-dashed border-base-300 p-4 text-base-content/70">
              Nobody has reviewed this reply yet.
            </p>
          ) : (
            reviews.map((review) => <ReviewNote key={review.id} review={review} />)
          )}
        </aside>
      </div>
    </main>
  );
}
