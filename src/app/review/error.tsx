"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ReviewError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col px-4 py-8">
      <div role="alert" className="flex flex-col items-start gap-3 rounded-box border border-base-300 p-6">
        <p className="text-base font-medium">The replies could not be loaded</p>
        <p className="max-w-prose text-base-content/70">
          Something went wrong while talking to the database. Nothing you saved is lost. Try again; if it
          keeps failing, check that the local database is running (<code className="font-mono text-xs">npm run db:start</code>).
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-base-content/60">Reference: {error.digest}</p>
        )}
        <div className="flex gap-2">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => retry()}>
            Try again
          </button>
          <Link href="/review" className="btn btn-ghost btn-sm font-normal">
            Back to the queue
          </Link>
        </div>
      </div>
    </main>
  );
}
