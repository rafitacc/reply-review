import { EmptyState } from "@/components/review/empty-state";

// Same message whether the reply does not exist or is someone else's, so this
// page never confirms that a reply exists.
export default function FeedbackReplyNotFound() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <EmptyState
        title="This reply isn't available"
        body="It may not exist, or it isn't one of your replies. Check the link, or pick a reply from your feedback."
        action={{ href: "/feedback", label: "Back to my feedback" }}
      />
    </main>
  );
}
