import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/review/empty-state";
import { QueueFilters } from "@/components/review/queue-filters";
import { QueueList } from "@/components/review/queue-list";
import { countToReview, listQueue } from "@/lib/data/replies";
import { getCurrentUser, getLedBrands } from "@/lib/data/session";
import { filtersToQuery, parseFilters, type QueueFilters as Filters } from "@/lib/reviews/filters";

export const metadata: Metadata = { title: "Review · reply-review" };

export default async function ReviewQueuePage({ searchParams }: PageProps<"/review">) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const ledBrands = await getLedBrands(user.id);
  if (ledBrands.length === 0) {
    return (
      <Page>
        <EmptyState
          title="You don't lead any brand"
          body="The review queue is for team leads. Your own replies and the feedback on them will show up on your home page."
          action={{ href: "/", label: "Go to home" }}
        />
      </Page>
    );
  }

  const filters = parseFilters(await searchParams, ledBrands.map((b) => b.brandSlug));
  const brandIds = ledBrands
    .filter((b) => filters.brand === null || b.brandSlug === filters.brand)
    .map((b) => b.brandId);

  const [items, toReview] = await Promise.all([
    listQueue({ userId: user.id, brandIds, status: filters.status }),
    countToReview(user.id, brandIds),
  ]);

  const brandName = ledBrands.find((b) => b.brandSlug === filters.brand)?.brandName;

  return (
    <Page>
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-medium tracking-tight">Review queue</h1>
        <p className="text-base-content/70">
          <span className="font-mono text-base-content">{toReview}</span> to review
          {brandName ? ` for ${brandName}` : ""}
        </p>
      </header>

      <QueueFilters filters={filters} brands={ledBrands} />

      {items.length === 0 ? (
        <QueueEmpty filters={filters} brandName={brandName} />
      ) : (
        <QueueList items={items} query={filtersToQuery(filters)} showBrand={filters.brand === null && ledBrands.length > 1} />
      )}
    </Page>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">{children}</main>;
}

function QueueEmpty({ filters, brandName }: { filters: Filters; brandName: string | undefined }) {
  const forBrand = brandName ? `for ${brandName}` : "for your brands";
  if (filters.status === "to_review") {
    return (
      <EmptyState
        title={`Nothing left to review ${forBrand}`}
        body="Every recent reply has your score. New replies appear here as specialists send them."
        action={{ href: `/review${filtersToQuery({ ...filters, status: "reviewed" })}`, label: "See reviewed replies" }}
      />
    );
  }
  if (filters.status === "reviewed") {
    return (
      <EmptyState
        title={`You haven't reviewed anything ${forBrand} yet`}
        body="Replies you score show up here, so you can go back and edit a review."
        action={{ href: `/review${filtersToQuery({ ...filters, status: "to_review" })}`, label: "Go to replies to review" }}
      />
    );
  }
  return (
    <EmptyState
      title={`No recent replies ${forBrand}`}
      body="Once specialists send replies from the brand's helpdesk, they appear here."
    />
  );
}
