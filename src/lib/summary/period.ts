// Period filter shared by "My feedback" and the brand summary. It lives in the
// URL (?period=30) like the queue filters, and only shapes what is shown.
//
// A period is the last N days counted back from now, in UTC milliseconds, and
// a reply belongs to it by `sent_at`: the summary is about the work sent in
// those days, whenever the lead got round to reviewing it.

export const PERIODS = [7, 14, 30] as const;
export type Period = (typeof PERIODS)[number];
export const DEFAULT_PERIOD: Period = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

type RawParams = Record<string, string | string[] | undefined>;

export function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parsePeriod(params: RawParams): Period {
  const value = Number(first(params.period));
  return PERIODS.includes(value as Period) ? (value as Period) : DEFAULT_PERIOD;
}

export type Range = { from: Date; to: Date };

// [from, to) for this period and for the one of the same length before it.
export function periodRanges(days: Period, now: Date = new Date()): { current: Range; previous: Range } {
  const to = now.getTime();
  const from = to - days * DAY_MS;
  return {
    current: { from: new Date(from), to: new Date(to) },
    previous: { from: new Date(from - days * DAY_MS), to: new Date(from) },
  };
}

// The period split into 7-day buckets counted back from `to`, oldest first.
// The oldest bucket is shorter when the period is not a whole number of weeks
// (30 days is four weeks and two days).
export function weekRanges({ from, to }: Range): Range[] {
  const weeks: Range[] = [];
  for (let end = to.getTime(); end > from.getTime(); end -= 7 * DAY_MS) {
    weeks.unshift({ from: new Date(Math.max(end - 7 * DAY_MS, from.getTime())), to: new Date(end) });
  }
  return weeks;
}

export function inRange(iso: string, { from, to }: Range): boolean {
  const time = Date.parse(iso);
  return time >= from.getTime() && time < to.getTime();
}
