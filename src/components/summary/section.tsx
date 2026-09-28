// A titled block of the summary pages, set apart by a thin border only.
export function Section({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  const id = `section-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={id} className="font-mono text-xs uppercase tracking-wide text-base-content/60">
          {title}
        </h2>
        {aside && <span className="text-xs text-base-content/60">{aside}</span>}
      </div>
      {children}
    </section>
  );
}
