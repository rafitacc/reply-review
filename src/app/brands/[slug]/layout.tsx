import { notFound } from "next/navigation";

import { getLedBrand } from "@/lib/data/brand-summary";

// Access check above loading.tsx so notFound() returns a real 404, as in
// /review/[replyId]. The summary query is also RLS-bound, so a user who
// does not lead the brand would get no rows even without this check.
export default async function BrandLayout({ children, params }: LayoutProps<"/brands/[slug]">) {
  const { slug } = await params;
  if (!(await getLedBrand(slug))) notFound();
  return children;
}
