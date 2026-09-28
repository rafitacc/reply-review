import Link from "next/link";

type Props = {
  title: string;
  body: string;
  action?: { href: string; label: string };
};

export function EmptyState({ title, body, action }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-box border border-dashed border-base-300 px-6 py-16 text-center">
      <p className="text-base font-medium">{title}</p>
      <p className="max-w-sm text-base-content/70">{body}</p>
      {action && (
        <Link href={action.href} className="btn btn-sm btn-ghost mt-2 font-normal text-primary">
          {action.label}
        </Link>
      )}
    </div>
  );
}
