import Link from "next/link";

import type { Membership } from "@/lib/data/session";
import { filtersToQuery, type QueueFilters, type Status } from "@/lib/reviews/filters";

const STATUS_LABELS: Record<Status, string> = {
  to_review: "To review",
  reviewed: "Reviewed",
  all: "All",
};

type Props = {
  filters: QueueFilters;
  brands: readonly Membership[];
};

// Plain links, so filters are in the URL, work without JavaScript and
// survive a refresh.
export function QueueFilters({ filters, brands }: Props) {
  return (
    <nav aria-label="Filters" className="flex flex-wrap items-center justify-between gap-3">
      <Segmented label="Brand">
        {brands.length > 1 && (
          <Option href={`/review${filtersToQuery({ ...filters, brand: null })}`} active={filters.brand === null}>
            All brands
          </Option>
        )}
        {brands.map((b) => (
          <Option
            key={b.brandId}
            href={`/review${filtersToQuery({ ...filters, brand: b.brandSlug })}`}
            active={filters.brand === b.brandSlug || brands.length === 1}
          >
            {b.brandName}
          </Option>
        ))}
      </Segmented>

      <Segmented label="Status">
        {(Object.keys(STATUS_LABELS) as Status[]).map((status) => (
          <Option
            key={status}
            href={`/review${filtersToQuery({ ...filters, status })}`}
            active={filters.status === status}
          >
            {STATUS_LABELS[status]}
          </Option>
        ))}
      </Segmented>
    </nav>
  );
}

function Segmented({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <ul aria-label={label} className="flex items-center gap-0.5 rounded-field border border-base-300 p-0.5">
      {children}
    </ul>
  );
}

function Option({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`block rounded-[calc(var(--radius-field)-2px)] px-3 py-1 transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
          active ? "bg-base-200 font-medium text-base-content" : "text-base-content/60 hover:text-base-content"
        }`}
      >
        {children}
      </Link>
    </li>
  );
}
