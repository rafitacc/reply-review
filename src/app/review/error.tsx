"use client";

import { LoadError } from "@/components/shell/load-error";

export default function ReviewError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <LoadError {...props} title="The replies could not be loaded" back={{ href: "/review", label: "Back to the queue" }} />;
}
