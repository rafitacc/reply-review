// Semantic colour is reserved for scores and kept small: a dot and the number.
export function scoreTone(score: number): "error" | "warning" | "success" {
  if (score <= 2) return "error";
  if (score === 3) return "warning";
  return "success";
}

const DOT = {
  error: "bg-error",
  warning: "bg-warning",
  success: "bg-success",
} as const;

export function ScoreBadge({ score }: { score: number }) {
  return (
    <span
      className="inline-flex h-6 items-center gap-1.5 rounded-field border border-base-300 px-2 font-mono text-xs"
      aria-label={`Score ${score} out of 5`}
    >
      <span aria-hidden className={`size-1.5 rounded-full ${DOT[scoreTone(score)]}`} />
      {score}
    </span>
  );
}
