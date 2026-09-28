import { EmptyState } from "@/components/review/empty-state";

// Same message whether the reply does not exist or belongs to a brand the
// user does not lead, so this page never confirms that a reply exists.
export default function ReplyNotFound() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <EmptyState
        title="This reply isn't available"
        body="It may not exist, or it isn't part of a brand you lead. Check the link, or pick a reply from your queue."
        action={{ href: "/review", label: "Back to the queue" }}
      />
    </main>
  );
}
