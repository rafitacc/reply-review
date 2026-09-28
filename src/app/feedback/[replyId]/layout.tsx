import { notFound } from "next/navigation";

import { getOwnReply } from "@/lib/data/feedback";

// Access check above loading.tsx so notFound() returns a real 404, as in
// /review/[replyId].
export default async function FeedbackReplyLayout({ children, params }: LayoutProps<"/feedback/[replyId]">) {
  const { replyId } = await params;
  if (!(await getOwnReply(replyId))) notFound();
  return children;
}
