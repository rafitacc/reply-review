// Date formatting for the UI. Runs on the server, in the server's time zone.

const LOCALE = "en-GB";

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

// "Today", "Yesterday", then "Mon 21 Sep" (with the year only when it differs).
export function dayLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (dayKey(date) === dayKey(now)) return "Today";
  if (dayKey(date) === dayKey(yesterday)) return "Yesterday";

  const part = (options: Intl.DateTimeFormatOptions) => date.toLocaleDateString("en-US", options);
  const label = `${part({ weekday: "short" })} ${date.getDate()} ${part({ month: "short" })}`;
  return date.getFullYear() === now.getFullYear() ? label : `${label} ${date.getFullYear()}`;
}

export function groupByDay<T>(items: readonly T[], getIso: (item: T) => string): { label: string; items: T[] }[] {
  const groups: { label: string; items: T[] }[] = [];
  const now = new Date();
  for (const item of items) {
    const label = dayLabel(getIso(item), now);
    const last = groups.at(-1);
    if (last?.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}

export function timeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit" });
}

export function dateTime(iso: string): string {
  return `${dayLabel(iso)}, ${timeOfDay(iso)}`;
}

export function minutesLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

// "4" for a single score, "3.7" for an average.
export function scoreLabel(score: number): string {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

// "22 Sep" in UTC. Summary periods are computed in UTC, so their edges are
// labelled in UTC too; otherwise a bucket could look a day off.
function utcDay(date: Date): string {
  return `${date.getUTCDate()} ${date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })}`;
}

// "22 Sep – 28 Sep" for [from, to). The end is exclusive, so the label shows
// the last day inside the range.
export function utcRangeLabel(fromIso: string, toIso: string): string {
  const lastDay = new Date(Date.parse(toIso) - 1);
  const first = utcDay(new Date(fromIso));
  const last = utcDay(lastDay);
  return first === last ? first : `${first} – ${last}`;
}

// "3.0", "3.7": averages always carry one decimal so they don't read as a score.
export function averageLabel(average: number): string {
  return average.toFixed(1);
}

// "+0.4", "−0.3", "±0.0" for a change in average score.
export function deltaLabel(delta: number): string {
  const rounded = Math.round(delta * 10) / 10;
  if (rounded === 0) return "±0.0";
  return `${rounded > 0 ? "+" : "−"}${Math.abs(rounded).toFixed(1)}`;
}
