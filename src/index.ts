import "dotenv/config";

import { claimOffer, fetchAllOffers, filterUnclaimedOffers } from "./api.js";
import { saveCoupon } from "./db.js";
import { sendTelegramMessage } from "./telegram.js";
import { delay, randomDelay } from "./utils.js";

const RETRY_DELAY_SECONDS = 120;
const HEARTBEAT_INTERVAL = 15;

let runsSinceLastHeartbeat = 0;

async function runScraper(): Promise<void> {
  const offers = await fetchAllOffers();
  const unclaimedOffers = filterUnclaimedOffers(offers);

  console.log(`📊 Unclaimed: ${unclaimedOffers.length}/${offers.length}`);

  if (unclaimedOffers.length === 0) {
    runsSinceLastHeartbeat++;
    if (runsSinceLastHeartbeat >= HEARTBEAT_INTERVAL) {
      await sendTelegramMessage("💚 Alive, no new coupons");
      runsSinceLastHeartbeat = 0;
    }
    return;
  }

  runsSinceLastHeartbeat = 0;

  for (const offer of unclaimedOffers) {
    try {
      await claimOffer(offer.id, offer.partner_category_name);
      await saveCoupon(offer.id, offer.name, offer.partner_name);
      console.log(`✓ ${offer.name}`);
      await sendTelegramMessage(`✅ ${offer.name}`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`✗ ${offer.name}: ${errMsg}`);
      await sendTelegramMessage(`❌ ${offer.name}\n${errMsg}`);
    }
    await randomDelay(3, 6);
  }
}

async function main() {
  console.log("Yettel coupon scraper started");
  await sendTelegramMessage("🚀 Started");

  while (true) {
    try {
      await runScraper();
      await delay(RETRY_DELAY_SECONDS);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`Error: ${errMsg}`);
      await sendTelegramMessage(`⚠️ Error: ${errMsg}`);
      await delay(RETRY_DELAY_SECONDS);
    }
  }
}

main();
