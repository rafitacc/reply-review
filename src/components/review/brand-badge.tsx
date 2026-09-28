export function BrandBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex h-6 items-center rounded-field border border-base-300 bg-base-200 px-2 text-xs font-medium">
      {name}
    </span>
  );
}
