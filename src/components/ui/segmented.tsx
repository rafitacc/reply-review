import Link from "next/link";

// A row of link options with one active, used for URL filters. Plain links, so
// filters work without JavaScript and survive a refresh.
export function Segmented({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <ul aria-label={label} className="flex items-center gap-0.5 rounded-field border border-base-300 p-0.5">
      {children}
    </ul>
  );
}

export function SegmentedOption({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`block rounded-[calc(var(--radius-field)-2px)] px-3 py-1 transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
          active ? "bg-base-200 font-medium text-base-content" : "text-base-content/60 hover:text-base-content"
        }`}
      >
        {children}
      </Link>
    </li>
  );
}
