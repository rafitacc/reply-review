import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FeedbackList } from "@/components/feedback/feedback-list";
import { EmptyState } from "@/components/review/empty-state";
import { IssueTags } from "@/components/review/issue-tags";
import { ScoreDot } from "@/components/review/score-badge";
import { PeriodFilter } from "@/components/summary/period-filter";
import { Stat } from "@/components/summary/stat";
import { Segmented, SegmentedOption } from "@/components/ui/segmented";
import { listMyFeedback } from "@/lib/data/feedback";
import { getCurrentUser, getSpecialistBrands } from "@/lib/data/session";
import { averageLabel } from "@/lib/format";
import { RELIABLE_SAMPLE } from "@/lib/summary/aggregate";
import { feedbackQuery, parseFeedbackFilters, periodRanges } from "@/lib/summary/period";

export const metadata: Metadata = { title: "My feedback · reply-review" };

export default async function FeedbackPage({ searchParams }: PageProps<"/feedback">) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const brands = await getSpecialistBrands(user.id);
  if (brands.length === 0) {
    return (
      <Page>
        <EmptyState
          title="You don't write replies for any brand"
          body="My feedback shows the reviews on replies you sent. You're not a specialist on any brand right now."
          action={{ href: "/", label: "Go to home" }}
        />
      </Page>
    );
  }

  const filters = parseFeedbackFilters(await searchParams, brands.map((b) => b.brandSlug));
  const brandIds = brands.filter((b) => filters.brand === null || b.brandSlug === filters.brand).map((b) => b.brandId);
  const feedback = await listMyFeedback({ userId: user.id, brandIds, range: periodRanges(filters.period).current });

  return (
    <Page>
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-medium tracking-tight">My feedback</h1>
        <p className="text-base-content/70">What your leads said about replies you sent in the last {filters.period} days.</p>
      </header>

      <nav aria-label="Filters" className="flex flex-wrap items-center justify-between gap-3">
        <Segmented label="Brand">
          {brands.length > 1 && (
            <SegmentedOption href={`/feedback${feedbackQuery({ ...filters, brand: null })}`} active={filters.brand === null}>
              All brands
            </SegmentedOption>
          )}
          {brands.map((b) => (
            <SegmentedOption
              key={b.brandId}
              href={`/feedback${feedbackQuery({ ...filters, brand: b.brandSlug })}`}
              active={filters.brand === b.brandSlug || brands.length === 1}
            >
              {b.brandName}
            </SegmentedOption>
          ))}
        </Segmented>
        <PeriodFilter current={filters.period} hrefFor={(period) => `/feedback${feedbackQuery({ ...filters, period })}`} />
      </nav>

      {feedback.items.length === 0 ? (
        <EmptyState
          title="No feedback yet"
          body="When your lead reviews one of your replies, it shows up here."
          action={
            filters.period !== 30 ? { href: `/feedback${feedbackQuery({ ...filters, period: 30 })}`, label: "Look at the last 30 days" } : undefined
          }
        />
      ) : (
        <>
          <dl className="grid divide-y divide-base-300 rounded-box border border-base-300 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <Stat
              label="Average score"
              value={
                feedback.average === null ? (
                  "–"
                ) : (
                  <>
                    <ScoreDot score={feedback.average} />
                    {averageLabel(feedback.average)}
                  </>
                )
              }
              note={
                feedback.reviewCount < RELIABLE_SAMPLE
                  ? `Based on ${plural(feedback.reviewCount, "review")}, too few to read much into`
                  : `Based on ${plural(feedback.reviewCount, "review")}`
              }
            />
            <Stat label="Reviewed replies" value={feedback.items.length} />
            <div className="flex flex-col gap-2 p-4">
              <dt className="text-base-content/60">Most frequent issues</dt>
              <dd>
                {feedback.topIssues.length === 0 ? (
                  <span className="text-base-content/60">None tagged</span>
                ) : (
                  <IssueTags labels={feedback.topIssues.map((issue) => `${issue.label} · ${issue.count}`)} />
                )}
              </dd>
            </div>
          </dl>

          <FeedbackList items={feedback.items} query={feedbackQuery(filters)} showBrand={filters.brand === null && brands.length > 1} />
        </>
      )}
    </Page>
  );
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function Page({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">{children}</main>;
}
