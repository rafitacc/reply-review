// Small pure helpers for the numbers on the feedback and brand summary pages.
// They run in TypeScript over rows already filtered by RLS; see the data files
// for why that is fine at this volume.

export type IssueCount = { id: number; label: string; count: number };

// Below this many reviews an average says more about one reply than about
// the brand or the person, and the page says so.
export const RELIABLE_SAMPLE = 5;

export function average(scores: readonly number[]): number | null {
  if (scores.length === 0) return null;
  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}

// Issue tags ranked by how often they were used, most frequent first. Ties
// keep the issue type order, so the ranking is stable between renders.
export function rankIssues(issues: readonly { id: number; label: string }[]): IssueCount[] {
  const counts = new Map<number, IssueCount>();
  for (const issue of issues) {
    const entry = counts.get(issue.id) ?? { id: issue.id, label: issue.label, count: 0 };
    entry.count += 1;
    counts.set(issue.id, entry);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.id - b.id);
}
