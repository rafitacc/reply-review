import { redirect } from "next/navigation";

import { EmptyState } from "@/components/review/empty-state";
import { getCurrentUser, getLedBrands, getSpecialistBrands } from "@/lib/data/session";

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Page>
        <EmptyState
          title="Pick a demo user to start"
          body="Use the switcher in the top right to act as a team lead or a specialist. Each one sees only what their brand memberships allow."
        />
      </Page>
    );
  }

  // Leads land on their queue even if they also write replies somewhere;
  // "My feedback" stays one click away in the top bar.
  if ((await getLedBrands(user.id)).length > 0) redirect("/review");
  if ((await getSpecialistBrands(user.id)).length > 0) redirect("/feedback");

  return (
    <Page>
      <EmptyState
        title="You're not on any brand yet"
        body="Once a team lead adds you to a brand, as a lead or a specialist, your replies or your review queue show up here."
      />
    </Page>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto w-full max-w-4xl px-4 py-8">{children}</main>;
}
