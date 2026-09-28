import "server-only";

import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

type Role = Database["public"]["Tables"]["brand_members"]["Row"]["role"];

export type CurrentUser = {
  id: string;
  email: string | null;
  fullName: string | null;
};

export type Membership = {
  brandId: string;
  brandName: string;
  brandSlug: string;
  role: Role;
};

// The signed-in user, verified from the session JWT. Null when signed out.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", claims.sub)
    .maybeSingle();

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    fullName: profile?.full_name ?? null,
  };
}

// The current user's own memberships. The user_id filter selects "mine" out
// of what RLS returns (a lead also sees teammates' rows); it is not the
// access control.
export async function getMyMemberships(userId: string): Promise<Membership[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brand_members")
    .select("brand_id, role, brands (name, slug)")
    .eq("user_id", userId)
    .order("brand_id");
  if (error) throw new Error(`Could not load brand memberships: ${error.message}`);

  return data.map((row) => ({
    brandId: row.brand_id,
    brandName: row.brands.name,
    brandSlug: row.brands.slug,
    role: row.role,
  }));
}

// Brands the current user leads, by name. Leading is per brand, so someone can
// lead one brand and be a specialist on another.
export async function getLedBrands(userId: string): Promise<Membership[]> {
  const memberships = await getMyMemberships(userId);
  return memberships
    .filter((m) => m.role === "lead")
    .sort((a, b) => a.brandName.localeCompare(b.brandName));
}

// Everything RLS lets the current user read, counted without filters.
export async function getVisibleCounts(): Promise<{ replies: number; reviews: number }> {
  const supabase = await createClient();
  const [replies, reviews] = await Promise.all([
    supabase.from("replies").select("*", { count: "exact", head: true }),
    supabase.from("reviews").select("*", { count: "exact", head: true }),
  ]);
  if (replies.error) throw new Error(`Could not count replies: ${replies.error.message}`);
  if (reviews.error) throw new Error(`Could not count reviews: ${reviews.error.message}`);

  return { replies: replies.count ?? 0, reviews: reviews.count ?? 0 };
}
