import "dotenv/config";

import {
  claimOffer,
  fetchAllOffers,
  fetchClaimedCount,
  filterUnclaimedOffers,
} from "./api.js";
import { initSession, refreshSession } from "./auth.js";
import { getClaimedOfferIds, saveCoupon } from "./db.js";
import { sendTelegramMessage } from "./telegram.js";
import { delay, randomDelay } from "./utils.js";

const USERNAME = process.env.USERNAME ?? "";
const SCRAPING_ENABLED = process.env.SCRAPING_ENABLED === "true";
const RETRY_DELAY_SECONDS = 120;
const HEARTBEAT_INTERVAL = 15;

let runsSinceLastHeartbeat = 0;
let authFailures = 0;

async function runScraper(): Promise<void> {
  const [offers, claimedIds] = await Promise.all([
    fetchAllOffers(),
    getClaimedOfferIds(),
  ]);

  const unclaimedOffers = filterUnclaimedOffers(offers).filter(
    (offer) => !claimedIds.has(offer.id)
  );

  console.log(
    `📊 New: ${unclaimedOffers.length} | Already claimed: ${claimedIds.size} | Total: ${offers.length}`
  );
  authFailures = 0;

  if (unclaimedOffers.length === 0) {
    runsSinceLastHeartbeat++;
    if (runsSinceLastHeartbeat >= HEARTBEAT_INTERVAL) {
      const claimCount = await fetchClaimedCount();
      const msg = `💚 ${USERNAME} | ${claimCount} coupons claimed`;
      console.log(msg);
      await sendTelegramMessage(msg);
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
      if (errMsg.includes("10204")) {
        await saveCoupon(offer.id, offer.name, offer.partner_name);
        console.log(`⊘ ${offer.name} (already claimed)`);
      } else {
        console.error(`✗ ${offer.name}: ${errMsg}`);
        await sendTelegramMessage(`❌ ${offer.name}\n${errMsg}`);
      }
    }
    await randomDelay(3, 6);
  }
}

async function main() {
  console.log("Yettel coupon scraper started");

  if (!SCRAPING_ENABLED) {
    console.log("⏸️ Scraping disabled via SCRAPING_ENABLED env var");
    return;
  }

  await initSession();

  await sendTelegramMessage("🚀 Started");

  while (true) {
    try {
      await runScraper();
      await delay(RETRY_DELAY_SECONDS);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`Error: ${errMsg}`);

      if (errMsg.includes("403") || errMsg.includes("401")) {
        authFailures++;
        if (authFailures <= 3) {
          console.log("Attempting to refresh session...");
          const refreshed = await refreshSession();
          if (refreshed) {
            console.log("🔄 Session refreshed");
            await sendTelegramMessage("🔄 Session refreshed");
            continue;
          }
        }
        console.log(`🔒 Auth failed: ${errMsg}`);
        await sendTelegramMessage(`🔒 Auth failed: ${errMsg}`);
      } else {
        console.log(`⚠️ Error: ${errMsg}`);
        await sendTelegramMessage(`⚠️ Error: ${errMsg}`);
      }

      await delay(RETRY_DELAY_SECONDS);
    }
  }
}

main();
