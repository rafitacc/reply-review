import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/review/empty-state";
import { IssueTags } from "@/components/review/issue-tags";
import { ScoreBadge, ScoreDot } from "@/components/review/score-badge";
import { Bar } from "@/components/summary/bar";
import { PeriodFilter } from "@/components/summary/period-filter";
import { Section } from "@/components/summary/section";
import { Stat } from "@/components/summary/stat";
import { getBrandSummary, getLedBrand, SUMMARY_ROW_LIMIT, type BrandSummary } from "@/lib/data/brand-summary";
import { averageLabel, dateTime, deltaLabel, utcRangeLabel } from "@/lib/format";
import { filtersToQuery } from "@/lib/reviews/filters";
import { RELIABLE_SAMPLE } from "@/lib/summary/aggregate";
import { parsePeriod, periodQuery, type Period } from "@/lib/summary/period";

export const metadata: Metadata = { title: "Brand summary · reply-review" };

export default async function BrandPage({ params, searchParams }: PageProps<"/brands/[slug]">) {
  const { slug } = await params;
  // Same cached check as the layout; repeated here to narrow the types.
  const brand = await getLedBrand(slug);
  if (!brand) notFound();

  const period = parsePeriod(await searchParams);
  const summary = await getBrandSummary(brand.brandId, period);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-medium tracking-tight">{brand.brandName}</h1>
          <p className="text-base-content/70">
            Replies sent in the last {period} days
            {summary.capped && ` · only the newest ${SUMMARY_ROW_LIMIT} replies are counted`}
          </p>
        </div>
        <PeriodFilter current={period} hrefFor={(p) => `/brands/${slug}${periodQuery(p)}`} />
      </header>

      {summary.reviewCount === 0 ? (
        <EmptyState
          title={`No reviews in the last ${period} days`}
          body={
            summary.repliesSent === 0
              ? `Nobody sent a ${brand.brandName} reply in this period, so there is nothing to summarise yet.`
              : `${plural(summary.repliesSent, "reply", "replies")} went out, but none has a review yet. Review a few and the summary fills in.`
          }
          action={
            summary.repliesSent > 0
              ? { href: `/review${filtersToQuery({ brand: slug, status: "to_review" })}`, label: `Review ${brand.brandName} replies` }
              : period !== 30
                ? { href: `/brands/${slug}${periodQuery(30)}`, label: "Look at the last 30 days" }
                : undefined
          }
        />
      ) : (
        <>
          <Headline summary={summary} period={period} />
          <div className="grid gap-8 md:grid-cols-2">
            <Trend summary={summary} />
            <Issues summary={summary} />
          </div>
          <Specialists summary={summary} />
          <Latest summary={summary} />
        </>
      )}
    </main>
  );
}

function Headline({ summary, period }: { summary: BrandSummary; period: Period }) {
  const { average, previousAverage, reviewCount, repliesReviewed, repliesSent } = summary;
  const reliable = reviewCount >= RELIABLE_SAMPLE;
  return (
    <dl className="grid divide-y divide-base-300 rounded-box border border-base-300 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      <Stat
        label="Average score"
        value={
          average === null ? (
            "–"
          ) : (
            <>
              <ScoreDot score={average} />
              {averageLabel(average)}
              <span className="text-xs font-normal text-base-content/60">
                {previousAverage === null
                  ? "No previous data"
                  : `${deltaLabel(average - previousAverage)} vs previous ${period} days`}
              </span>
            </>
          )
        }
        note={
          reliable
            ? `Based on ${plural(reviewCount, "review")}`
            : `Based on ${plural(reviewCount, "review")}. Under ${RELIABLE_SAMPLE}, the average isn't reliable yet.`
        }
      />
      <Stat label="Reviews" value={reviewCount} />
      <Stat
        label="Replies reviewed"
        value={
          <>
            {repliesReviewed}
            <span className="text-base font-normal text-base-content/60">of {repliesSent} sent</span>
          </>
        }
        note={repliesSent > 0 ? `${Math.round((repliesReviewed / repliesSent) * 100)}% of the period's replies` : undefined}
      />
    </dl>
  );
}

function Trend({ summary }: { summary: BrandSummary }) {
  return (
    <Section title="Average by week" aside="Out of 5">
      <ul className="flex flex-col gap-3">
        {summary.weeks.map((week) => (
          <li key={week.from} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <span className="w-28 whitespace-nowrap font-mono text-xs text-base-content/60">{utcRangeLabel(week.from, week.to)}</span>
            {week.average === null ? (
              <span className="col-span-2 text-xs text-base-content/60">No reviews</span>
            ) : (
              <>
                <Bar value={week.average} max={5} />
                <span className="flex w-24 items-center justify-end gap-1.5 font-mono text-xs">
                  <ScoreDot score={week.average} />
                  {averageLabel(week.average)}
                  <span className="text-base-content/60">({week.reviewCount})</span>
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Issues({ summary }: { summary: BrandSummary }) {
  const max = summary.issues[0]?.count ?? 0;
  return (
    <Section title="Recurring issues" aside="Times tagged">
      {summary.issues.length === 0 ? (
        <p className="text-base-content/60">No issue tags in this period. Every review was clean.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {summary.issues.map((issue) => (
            <li key={issue.id} className="grid grid-cols-[9rem_1fr_2rem] items-center gap-3">
              <span className="truncate">{issue.label}</span>
              <Bar value={issue.count} max={max} />
              <span className="text-right font-mono text-xs">{issue.count}</span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function Specialists({ summary }: { summary: BrandSummary }) {
  return (
    <Section title="By specialist">
      <div className="overflow-x-auto rounded-box border border-base-300">
        <table className="table">
          <thead>
            <tr className="border-base-300 text-base-content/60">
              <th className="font-normal">Specialist</th>
              <th className="font-normal">Reviewed</th>
              <th className="font-normal">Average</th>
              <th className="font-normal">Top issue</th>
            </tr>
          </thead>
          <tbody>
            {summary.specialists.map((s) => (
              <tr key={s.id} className="border-base-300">
                <td className="font-medium">{s.name}</td>
                <td className="font-mono text-xs">
                  {s.repliesReviewed} <span className="text-base-content/60">of {s.repliesSent}</span>
                </td>
                <td>
                  {s.average === null ? (
                    <span className="text-base-content/60">–</span>
                  ) : (
                    <span className="flex items-center gap-1.5 font-mono text-xs">
                      <ScoreDot score={s.average} />
                      {averageLabel(s.average)}
                    </span>
                  )}
                </td>
                <td className={s.topIssue ? undefined : "text-base-content/60"}>{s.topIssue ?? "None"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function Latest({ summary }: { summary: BrandSummary }) {
  return (
    <Section title="Latest reviews">
      <ul className="divide-y divide-base-300 overflow-hidden rounded-box border border-base-300">
        {summary.latest.map((review) => (
          <li key={review.id}>
            <Link
              href={`/review/${review.replyId}`}
              className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-base-200 focus-visible:bg-base-200 focus-visible:outline-none"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="truncate font-medium">{review.subject ?? "(no subject)"}</span>
                <ScoreBadge score={review.score} />
              </div>
              <IssueTags labels={review.issues} />
              <p className="font-mono text-xs text-base-content/60">
                {review.specialistName} · reviewed by {review.reviewerName} ·{" "}
                <time dateTime={review.createdAt}>{dateTime(review.createdAt)}</time>
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function plural(count: number, noun: string, pluralNoun = `${noun}s`): string {
  return `${count} ${count === 1 ? noun : pluralNoun}`;
}
