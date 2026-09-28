"use client";

import { LoadError } from "@/components/shell/load-error";

export default function FeedbackError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <LoadError {...props} title="Your feedback could not be loaded" back={{ href: "/feedback", label: "Back to my feedback" }} />;
}
