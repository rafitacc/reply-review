import { EmptyState } from "@/components/review/empty-state";

// Same message whether the brand does not exist or the user does not lead it.
export default function BrandNotFound() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <EmptyState
        title="This brand isn't available"
        body="It may not exist, or you don't lead it. Brand summaries are for the brand's team lead."
        action={{ href: "/", label: "Go to home" }}
      />
    </main>
  );
}
