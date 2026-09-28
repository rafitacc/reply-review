import "server-only";

import type { Status } from "@/lib/reviews/filters";
import { createClient } from "@/lib/supabase/server";

// How far back the queue looks. Reviews happen within days of a reply being
// sent; anything older is out of the lead's working window.
const QUEUE_LIMIT = 100;

// A reply only knows its brand through the membership it was sent under
// (composite FK replies_brand_member_fkey), so brand and specialist are both
// reached through brand_members. `reviews` is narrowed to the current lead's
// own review by a filter in each query.
const QUEUE_SELECT = `
  id, subject, reply_body, sent_at,
  member:brand_members!replies_brand_member_fkey (
    brand:brands ( id, name, slug ),
    specialist:profiles ( full_name )
  ),
  reviews ( id, score )
` as const;

export type QueueItem = {
  id: string;
  subject: string | null;
  excerpt: string;
  sentAt: string;
  brand: { id: string; name: string; slug: string };
  specialistName: string;
  myScore: number | null;
};

type QueueQuery = {
  userId: string;
  // Brands the user leads, already narrowed by the brand filter. The queue is
  // only for brands the user leads; RLS would also return the user's own
  // replies on a brand where they are a specialist.
  brandIds: readonly string[];
  status: Status;
};

// Recent replies for the lead's queue, newest first. "Reviewed" means reviewed
// by this lead: each lead keeps their own queue.
export async function listQueue({ userId, brandIds, status }: QueueQuery): Promise<QueueItem[]> {
  if (brandIds.length === 0) return [];

  const supabase = await createClient();
  let query = supabase
    .from("replies")
    .select(QUEUE_SELECT)
    .in("brand_id", brandIds)
    .eq("reviews.reviewer_id", userId)
    .order("sent_at", { ascending: false })
    .limit(QUEUE_LIMIT);

  if (status === "to_review") query = query.is("reviews", null);
  if (status === "reviewed") query = query.not("reviews", "is", null);

  const { data, error } = await query;
  if (error) throw new Error(`Could not load the review queue: ${error.message}`);

  return data.map((row) => ({
    id: row.id,
    subject: row.subject,
    excerpt: excerpt(row.reply_body),
    sentAt: row.sent_at,
    brand: row.member.brand,
    specialistName: row.member.specialist.full_name,
    myScore: row.reviews[0]?.score ?? null,
  }));
}

// How many replies in these brands this lead has not reviewed yet.
export async function countToReview(userId: string, brandIds: readonly string[]): Promise<number> {
  if (brandIds.length === 0) return 0;

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("replies")
    .select("id, reviews ( id )", { count: "exact", head: true })
    .in("brand_id", brandIds)
    .eq("reviews.reviewer_id", userId)
    .is("reviews", null);
  if (error) throw new Error(`Could not count replies to review: ${error.message}`);

  return count ?? 0;
}

// The newest reply this lead still has to review in these brands, other than
// `excludeId` (the one just saved). Null when the queue is done.
export async function findNextToReview(
  userId: string,
  brandIds: readonly string[],
  excludeId: string,
): Promise<string | null> {
  if (brandIds.length === 0) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("replies")
    .select("id, reviews ( id )")
    .in("brand_id", brandIds)
    .neq("id", excludeId)
    .eq("reviews.reviewer_id", userId)
    .is("reviews", null)
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Could not find the next reply: ${error.message}`);

  return data?.id ?? null;
}

export type ReplyForReview = {
  id: string;
  subject: string | null;
  customerMessage: string;
  replyBody: string;
  sentAt: string;
  firstResponseMinutes: number | null;
  brand: { id: string; name: string; slug: string; voiceGuidelines: string };
  specialistName: string;
};

// One reply with everything the review page shows. Returns null both when the
// reply does not exist and when RLS hides it, so callers cannot tell the two
// apart (and neither can the person using the app).
export async function getReply(replyId: string): Promise<ReplyForReview | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("replies")
    .select(
      `id, subject, customer_message, reply_body, sent_at, first_response_minutes,
       member:brand_members!replies_brand_member_fkey (
         brand:brands ( id, name, slug, voice_guidelines ),
         specialist:profiles ( full_name )
       )`,
    )
    .eq("id", replyId)
    .maybeSingle();
  if (error) throw new Error(`Could not load the reply: ${error.message}`);
  if (!data) return null;

  const { brand } = data.member;
  return {
    id: data.id,
    subject: data.subject,
    customerMessage: data.customer_message,
    replyBody: data.reply_body,
    sentAt: data.sent_at,
    firstResponseMinutes: data.first_response_minutes,
    brand: { id: brand.id, name: brand.name, slug: brand.slug, voiceGuidelines: brand.voice_guidelines },
    specialistName: data.member.specialist.full_name,
  };
}

function excerpt(body: string): string {
  const oneLine = body.replace(/\s+/g, " ").trim();
  return oneLine.length > 160 ? `${oneLine.slice(0, 160).trimEnd()}…` : oneLine;
}
