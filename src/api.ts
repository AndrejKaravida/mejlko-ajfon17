import { getSessionCookie } from "./auth.js";
import type { Offer, OffersResponse } from "./types.js";

const BASE_URL = "https://shopping.yettel.rs/api";
const DEFAULT_LIMIT = 50;

const SERVER_ID = process.env.YETTEL_SERVER_ID ?? "partner_be1";
const DEVICE_ID = process.env.YETTEL_DEVICE_ID ?? "";
const ACCOUNT_USER = process.env.YETTEL_ACCOUNT_USER ?? "";

if (!DEVICE_ID || !ACCOUNT_USER) {
  throw new Error("Missing required Yettel environment variables (YETTEL_DEVICE_ID, YETTEL_ACCOUNT_USER)");
}

function getCookieString(): string {
  return [
    `yshc.connect.sid=${getSessionCookie()}`,
    `SERVERID=${SERVER_ID}`,
    `device_identifier=${DEVICE_ID}`,
    `account-logged-in-user=${ACCOUNT_USER}`,
    `last-logged-in-user=${ACCOUNT_USER}`,
  ].join("; ");
}

function getHeaders(): Record<string, string> {
  return {
    Cookie: getCookieString(),
    "Content-Type": "application/json",
    Accept: "application/json, text/plain, */*",
    "x-version": "2.2.0",
    Origin: "https://shopping.yettel.rs",
    Referer: "https://shopping.yettel.rs/",
  };
}

export async function fetchOffers(limit = DEFAULT_LIMIT, offset = 0): Promise<OffersResponse> {
  const url = `${BASE_URL}/offers?limit=${limit}&offset=${offset}&is_advantage=0`;
  const response = await fetch(url, { headers: getHeaders() });

  if (!response.ok) {
    throw new Error(`Failed to fetch offers: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<OffersResponse>;
}

export async function fetchAllOffers(): Promise<Offer[]> {
  const allOffers: Offer[] = [];
  let offset = 0;
  let total = 0;

  do {
    const response = await fetchOffers(DEFAULT_LIMIT, offset);
    allOffers.push(...response.data);
    total = response.meta.total;
    offset += response.data.length;
  } while (allOffers.length < total);

  return allOffers;
}

export function filterUnclaimedOffers(offers: Offer[]): Offer[] {
  return offers.filter((offer) => !offer.code);
}

export async function claimOffer(offerId: string, partnerCategory: string): Promise<void> {
  const url = `${BASE_URL}/offers/${offerId}/code`;
  const body = {
    coupon_list_name: "HomePage",
    coupon_list_id: "HomePage",
    coupon_brand_category: partnerCategory,
    page_location: "https://shopping.yettel.rs/",
    combo_type: "regular",
  };

  const response = await fetch(url, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to claim offer ${offerId}: ${response.status} - ${text}`);
  }
}
