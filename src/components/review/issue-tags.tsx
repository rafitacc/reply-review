// Read-only issue tags, styled like the review form's tag buttons at rest.
export function IssueTags({ labels }: { labels: readonly string[] }) {
  if (labels.length === 0) return null;
  return (
    <ul aria-label="Issues" className="flex flex-wrap gap-1.5">
      {labels.map((label) => (
        <li
          key={label}
          className="inline-flex h-6 items-center rounded-full border border-base-300 px-2.5 text-xs text-base-content/80"
        >
          {label}
        </li>
      ))}
    </ul>
  );
}
