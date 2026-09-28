// One headline number with a label above and an optional note below.
export function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 p-4">
      <dt className="text-base-content/60">{label}</dt>
      <dd className="flex items-center gap-2 font-mono text-2xl tracking-tight">{value}</dd>
      {note && <dd className="text-xs text-base-content/60">{note}</dd>}
    </div>
  );
}
