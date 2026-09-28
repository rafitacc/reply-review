import { notFound, redirect } from "next/navigation";

import { getCurrentUser, getLedBrands } from "@/lib/data/session";

// /brands has no page of its own: go to the first brand the user leads.
export default async function BrandsIndex() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const [first] = await getLedBrands(user.id);
  if (!first) notFound();
  redirect(`/brands/${first.brandSlug}`);
}
