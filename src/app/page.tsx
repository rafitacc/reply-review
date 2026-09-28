import { redirect } from "next/navigation";

import { EmptyState } from "@/components/review/empty-state";
import { getCurrentUser, getLedBrands } from "@/lib/data/session";

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

  if ((await getLedBrands(user.id)).length > 0) redirect("/review");

  // Placeholder until the specialist's "My feedback" view (PR 4).
  return (
    <Page>
      <EmptyState
        title="Your feedback is coming in the next version"
        body="Soon you will see your own replies here, with the scores and comments your team lead left on them."
      />
    </Page>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto w-full max-w-4xl px-4 py-8">{children}</main>;
}
