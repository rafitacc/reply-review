import Link from "next/link";

import { BrandBadge } from "@/components/review/brand-badge";
import { IssueTags } from "@/components/review/issue-tags";
import { ScoreBadge } from "@/components/review/score-badge";
import type { FeedbackItem } from "@/lib/data/feedback";
import { dateTime } from "@/lib/format";

type Props = {
  items: readonly FeedbackItem[];
  // Appended to each link so the detail page's back link keeps the filters.
  query: string;
  showBrand: boolean;
};

export function FeedbackList({ items, query, showBrand }: Props) {
  return (
    <ul className="divide-y divide-base-300 overflow-hidden rounded-box border border-base-300">
      {items.map((item) => {
        const [latest, ...older] = item.reviews;
        return (
          <li key={item.replyId}>
            <Link
              href={`/feedback/${item.replyId}${query}`}
              className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-base-200 focus-visible:bg-base-200 focus-visible:outline-none"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-2">
                  {showBrand && <BrandBadge name={item.brand.name} />}
                  <span className="truncate font-medium">{item.subject ?? "(no subject)"}</span>
                </div>
                <ScoreBadge score={latest.score} />
              </div>
              <IssueTags labels={latest.issues.map((issue) => issue.label)} />
              {latest.comment && <p className="prose-reply line-clamp-3 text-base-content/80">{latest.comment}</p>}
              <p className="font-mono text-xs text-base-content/60">
                {latest.reviewerName} · <time dateTime={latest.createdAt}>{dateTime(latest.createdAt)}</time>
                {older.length > 0 && ` · +${older.length} more ${older.length === 1 ? "review" : "reviews"}`}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
