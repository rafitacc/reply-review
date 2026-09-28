// A horizontal bar drawn with CSS: a quiet track and a neutral fill. Colour
// stays neutral on purpose; the score dot next to a value carries the tone.
export function Bar({ value, max }: { value: number; max: number }) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div aria-hidden className="h-2 w-full overflow-hidden rounded-full bg-base-200 ring-1 ring-inset ring-base-300">
      <div className="h-full rounded-full bg-base-content/60" style={{ width: `${percent}%` }} />
    </div>
  );
}
