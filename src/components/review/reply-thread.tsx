import type { ReplyForReview } from "@/lib/data/replies";

// The customer's message, then what the specialist sent. The two are set apart
// by label and surface, not by heavy chrome, so the text stays the focus.
export function ReplyThread({ reply }: { reply: ReplyForReview }) {
  return (
    <div className="flex flex-col gap-4">
      <article aria-labelledby="customer-heading" className="rounded-box border border-base-300 bg-base-200 p-5">
        <h2 id="customer-heading" className="mb-3 font-mono text-xs uppercase tracking-wide text-base-content/60">
          Customer wrote
        </h2>
        <p className="prose-reply text-base-content/90">{reply.customerMessage}</p>
      </article>

      <article aria-labelledby="reply-heading" className="rounded-box border border-base-300 p-5">
        <h2 id="reply-heading" className="mb-3 font-mono text-xs uppercase tracking-wide text-base-content/60">
          {reply.specialistName} replied
        </h2>
        <p className="prose-reply">{reply.replyBody}</p>
      </article>
    </div>
  );
}
