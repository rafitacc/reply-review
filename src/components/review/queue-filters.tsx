import { Segmented, SegmentedOption as Option } from "@/components/ui/segmented";
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
