import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";
const USERNAME = process.env.USERNAME ?? "Unknown";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface ClaimedCoupon {
  offer_id: string;
  name: string;
  partner_name: string;
  username: string;
}

export async function saveCoupon(offerId: string, name: string, partnerName: string): Promise<void> {
  const { error } = await supabase.from("claimed_coupons").insert({
    offer_id: offerId,
    name,
    partner_name: partnerName,
    username: USERNAME,
  } satisfies ClaimedCoupon);

  if (error) {
    throw new Error(`Failed to save coupon: ${error.message}`);
  }
}
