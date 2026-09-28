import { scoreLabel } from "@/lib/format";

// Semantic colour is reserved for scores and kept small: a dot and the number.
// Averages take the tone of the score they round to (2.6 reads as a 3).
export function scoreTone(score: number): "error" | "warning" | "success" {
  const rounded = Math.round(score);
  if (rounded <= 2) return "error";
  if (rounded === 3) return "warning";
  return "success";
}

const DOT = {
  error: "bg-error",
  warning: "bg-warning",
  success: "bg-success",
} as const;

export function ScoreDot({ score }: { score: number }) {
  return <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${DOT[scoreTone(score)]}`} />;
}

export function ScoreBadge({ score }: { score: number }) {
  const label = scoreLabel(score);
  return (
    <span
      className="inline-flex h-6 items-center gap-1.5 rounded-field border border-base-300 px-2 font-mono text-xs"
      aria-label={`Score ${label} out of 5`}
    >
      <ScoreDot score={score} />
      {label}
    </span>
  );
}
