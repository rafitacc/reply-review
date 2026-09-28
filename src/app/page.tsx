import { getCurrentUser, getMyMemberships, getVisibleCounts } from "@/lib/data/session";

// Proof page for PR 2: shows that the session is real and that what the
// current user can read comes from RLS. Replaced by the real views in PR 3.
export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main>
        <h1>reply-review</h1>
        <p>Not signed in. Pick a demo user above to see what they can access.</p>
      </main>
    );
  }

  const [memberships, counts] = await Promise.all([
    getMyMemberships(user.id),
    getVisibleCounts(),
  ]);

  return (
    <main>
      <h1>reply-review</h1>

      <h2>Signed in as</h2>
      <p>
        {user.fullName ?? "(no profile)"} · {user.email}
        <br />
        <code>{user.id}</code>
      </p>

      <h2>Brand memberships</h2>
      {memberships.length === 0 ? (
        <p>No brand memberships.</p>
      ) : (
        <ul>
          {memberships.map((m) => (
            <li key={m.brandId}>
              {m.brandName} · {m.role}
            </li>
          ))}
        </ul>
      )}

      <h2>Visible through RLS</h2>
      <ul>
        <li>Replies: {counts.replies}</li>
        <li>Reviews: {counts.reviews}</li>
      </ul>
    </main>
  );
}
