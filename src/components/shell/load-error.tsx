"use client";

import Link from "next/link";
import { useEffect } from "react";

type Props = {
  error: Error & { digest?: string };
  retry: () => void;
  title: string;
  back: { href: string; label: string };
};

// Body of a segment's error.tsx. Says what failed, that nothing saved is lost,
// and what to try next; the database's own message stays in the server log.
export function LoadError({ error, retry, title, back }: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col px-4 py-8">
      <div role="alert" className="flex flex-col items-start gap-3 rounded-box border border-base-300 p-6">
        <p className="text-base font-medium">{title}</p>
        <p className="max-w-prose text-base-content/70">
          Something went wrong while talking to the database. Nothing you saved is lost. Try again; if it
          keeps failing, check that the local database is running (<code className="font-mono text-xs">npm run db:start</code>).
        </p>
        {error.digest && <p className="font-mono text-xs text-base-content/60">Reference: {error.digest}</p>}
        <div className="flex gap-2">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => retry()}>
            Try again
          </button>
          <Link href={back.href} className="btn btn-ghost btn-sm font-normal">
            {back.label}
          </Link>
        </div>
      </div>
    </main>
  );
}
