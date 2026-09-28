// The seeded demo accounts (see supabase/seed.sql), listed for the user
// switcher. This only says who the demo users are. What each of them can see
// is decided by RLS in the database, never by this file.
export type DemoUser = {
  email: string;
  name: string;
  label: string;
};

export const DEMO_USERS: readonly DemoUser[] = [
  { email: "marta@reply-review.test", name: "Marta Soler", label: "Lead · Voltra, Packwell" },
  { email: "nuria@reply-review.test", name: "Nuria Vidal", label: "Lead · Lumen" },
  { email: "dani@reply-review.test", name: "Dani Ferrer", label: "Specialist · Voltra, Packwell" },
  { email: "lucia@reply-review.test", name: "Lucía Romero", label: "Specialist · Packwell, Lumen" },
  { email: "tomas@reply-review.test", name: "Tomás Herrera", label: "Specialist · Voltra" },
];

export function isDemoUserEmail(email: string): boolean {
  return DEMO_USERS.some((user) => user.email === email);
}

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}
