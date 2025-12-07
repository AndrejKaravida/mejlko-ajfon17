import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";
const USERNAME = process.env.USERNAME ?? "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !USERNAME) {
  throw new Error("Missing SUPABASE_URL, SUPABASE_ANON_KEY, or USERNAME environment variables");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

type CouponStatus = "claimed" | "not_eligible" | "already_claimed";

interface ClaimedCoupon {
  offer_id: string;
  name: string;
  partner_name: string;
  username: string;
  status: CouponStatus;
}

export async function getClaimedOfferIds(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("claimed_coupons")
    .select("offer_id")
    .eq("username", USERNAME);

  if (error) {
    console.error("Failed to fetch claimed offers:", error.message);
    return new Set();
  }

  return new Set(data.map((row) => row.offer_id));
}

export async function getSuccessfulClaimCount(): Promise<number> {
  const { count, error } = await supabase
    .from("claimed_coupons")
    .select("*", { count: "exact", head: true })
    .eq("username", USERNAME)
    .eq("status", "claimed");

  if (error) {
    console.error("Failed to fetch claim count:", error.message);
    return 0;
  }

  return count ?? 0;
}

export async function saveCoupon(offerId: string, name: string, partnerName: string, status: CouponStatus = "claimed"): Promise<void> {
  const { error } = await supabase.from("claimed_coupons").insert({
    offer_id: offerId,
    name,
    partner_name: partnerName,
    username: USERNAME,
    status,
  } satisfies ClaimedCoupon);

  if (error) {
    throw new Error(`Failed to save coupon: ${error.message}`);
  }
}
