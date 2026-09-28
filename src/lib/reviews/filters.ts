// Queue filters live in the URL so they survive a refresh and travel with
// "Save and next". They only shape what the lead sees; RLS decides access.

export const STATUSES = ["to_review", "reviewed", "all"] as const;
export type Status = (typeof STATUSES)[number];

export type QueueFilters = {
  // Brand slug, or null for every brand the user leads.
  brand: string | null;
  status: Status;
};

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// Unknown values fall back to the defaults instead of erroring: a stale or
// hand-edited URL should still land somewhere useful.
export function parseFilters(params: RawParams, ledBrandSlugs: readonly string[]): QueueFilters {
  const brand = first(params.brand);
  const status = first(params.status);
  return {
    brand: brand && ledBrandSlugs.includes(brand) ? brand : null,
    status: STATUSES.includes(status as Status) ? (status as Status) : "to_review",
  };
}

export function filtersToQuery(filters: QueueFilters): string {
  const query = new URLSearchParams();
  if (filters.brand) query.set("brand", filters.brand);
  if (filters.status !== "to_review") query.set("status", filters.status);
  const text = query.toString();
  return text ? `?${text}` : "";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}
