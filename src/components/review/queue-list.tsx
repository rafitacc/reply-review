import Link from "next/link";

import type { QueueItem } from "@/lib/data/replies";
import { groupByDay, timeOfDay } from "@/lib/format";
import { BrandBadge } from "./brand-badge";
import { ScoreBadge } from "./score-badge";

type Props = {
  items: readonly QueueItem[];
  // Appended to each row's link so the review page knows the active filters.
  query: string;
  showBrand: boolean;
};

export function QueueList({ items, query, showBrand }: Props) {
  return (
    <div className="flex flex-col gap-8">
      {groupByDay(items, (item) => item.sentAt).map((group) => (
        <section key={group.label} aria-labelledby={`day-${group.label}`}>
          <h2
            id={`day-${group.label}`}
            className="mb-2 font-mono text-xs uppercase tracking-wide text-base-content/60"
          >
            {group.label}
          </h2>
          <ul className="divide-y divide-base-300 overflow-hidden rounded-box border border-base-300">
            {group.items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/review/${item.id}${query}`}
                  className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 px-4 py-3 transition-colors hover:bg-base-200 focus-visible:bg-base-200 focus-visible:outline-none"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {showBrand && <BrandBadge name={item.brand.name} />}
                    <span className="truncate font-medium">{item.subject ?? "(no subject)"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.myScore !== null && <ScoreBadge score={item.myScore} />}
                    <time dateTime={item.sentAt} className="font-mono text-xs text-base-content/60">
                      {timeOfDay(item.sentAt)}
                    </time>
                  </div>
                  <p className="col-span-2 truncate text-base-content/70">
                    <span className="text-base-content">{item.specialistName}</span>
                    <span aria-hidden> · </span>
                    {item.excerpt}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
