"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isDemoMode, isDemoUserEmail } from "@/lib/demo-users";
import { createClient } from "@/lib/supabase/server";

export type SwitchUserResult = { error: string } | undefined;

// Fake login for the demo: signs in as a seeded user on the server, so the
// session cookie carries a real Supabase token and auth.uid() is real in RLS.
// The shared password is read from the server env and never sent to the browser.
export async function switchUser(email: unknown): Promise<SwitchUserResult> {
  if (!isDemoMode()) {
    return { error: "The user switcher is disabled. Set DEMO_MODE=true to enable it." };
  }
  if (typeof email !== "string" || !isDemoUserEmail(email)) {
    return { error: "That is not one of the demo users." };
  }

  const password = process.env.DEMO_PASSWORD;
  if (!password) {
    return { error: "DEMO_PASSWORD is not set on the server. Add it to .env.local." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: `Could not sign in as ${email}: ${error.message}` };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/");
}
