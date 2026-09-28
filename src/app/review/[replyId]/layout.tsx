import { notFound } from "next/navigation";

import { getReviewableReply } from "@/lib/data/replies";

// The access check runs here, above this segment's loading.tsx, so it finishes
// before the response starts streaming. That way notFound() returns a real 404
// status. Inside the page it would be a 200 with not-found content.
export default async function ReviewReplyLayout({ children, params }: LayoutProps<"/review/[replyId]">) {
  const { replyId } = await params;
  if (!(await getReviewableReply(replyId))) notFound();
  return children;
}
