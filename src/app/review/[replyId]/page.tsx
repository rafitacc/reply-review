import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BrandBadge } from "@/components/review/brand-badge";
import { ReplyThread } from "@/components/review/reply-thread";
import { ReviewForm } from "@/components/review/review-form";
import { VoiceGuidelines } from "@/components/review/voice-guidelines";
import { getReply } from "@/lib/data/replies";
import { getMyReview, listIssueTypes } from "@/lib/data/reviews";
import { getCurrentUser, getLedBrands } from "@/lib/data/session";
import { dateTime, minutesLabel } from "@/lib/format";
import { filtersToQuery, isUuid, parseFilters } from "@/lib/reviews/filters";

export const metadata: Metadata = { title: "Review a reply · reply-review" };

export default async function ReviewReplyPage({ params, searchParams }: PageProps<"/review/[replyId]">) {
  const { replyId } = await params;
  // A malformed id would be a database error; it is simply a reply that is
  // not there.
  if (!isUuid(replyId)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/");

  const [reply, ledBrands] = await Promise.all([getReply(replyId), getLedBrands(user.id)]);
  // Missing, hidden by RLS, or visible only because it is the user's own reply
  // on a brand they do not lead: all look the same from outside.
  if (!reply || !ledBrands.some((b) => b.brandId === reply.brand.id)) notFound();

  const [myReview, issueTypes] = await Promise.all([getMyReview(reply.id, user.id), listIssueTypes()]);
  const filters = parseFilters(await searchParams, ledBrands.map((b) => b.brandSlug));

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <Link
        href={`/review${filtersToQuery(filters)}`}
        className="w-fit text-base-content/60 transition-colors hover:text-base-content"
      >
        ← Review queue
      </Link>

      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-medium tracking-tight">{reply.subject ?? "(no subject)"}</h1>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-base-content/70">
          <BrandBadge name={reply.brand.name} />
          <span>{reply.specialistName}</span>
          <time dateTime={reply.sentAt} className="font-mono text-xs">
            Sent {dateTime(reply.sentAt)}
          </time>
          {reply.firstResponseMinutes !== null && (
            <span className="font-mono text-xs">First response {minutesLabel(reply.firstResponseMinutes)}</span>
          )}
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <ReplyThread reply={reply} />

        <aside className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
          <VoiceGuidelines brandName={reply.brand.name} guidelines={reply.brand.voiceGuidelines} />
          <ReviewForm
            // Remount when moving to another reply so no state carries over.
            key={reply.id}
            replyId={reply.id}
            issueTypes={issueTypes}
            initial={myReview}
            filters={filters}
          />
        </aside>
      </div>
    </main>
  );
}
