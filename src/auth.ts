import { createClient } from "@supabase/supabase-js";

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";
const USERNAME = process.env.USERNAME ?? "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !USERNAME) {
  throw new Error("Missing SUPABASE_URL, SUPABASE_ANON_KEY, or USERNAME");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentSessionCookie = "";
let currentRefreshToken = process.env.YETTEL_REFRESH_TOKEN ?? "";

export function getSessionCookie(): string {
  return currentSessionCookie;
}

async function loadRefreshToken(): Promise<string | null> {
  const { data, error } = await supabase
    .from("user_tokens")
    .select("refresh_token")
    .eq("username", USERNAME)
    .single();

  if (error || !data) {
    console.log("No stored refresh token found for", USERNAME);
    return null;
  }

  return data.refresh_token;
}

async function saveRefreshToken(token: string): Promise<void> {
  const { error } = await supabase
    .from("user_tokens")
    .upsert({
      username: USERNAME,
      refresh_token: token,
      updated_at: new Date().toISOString(),
    }, { onConflict: "username" });

  if (error) {
    console.error("Failed to save refresh token:", error.message);
  } else {
    console.log("Refresh token saved for", USERNAME);
  }
}

export async function refreshSession(): Promise<boolean> {
  const storedToken = await loadRefreshToken();
  const tokenToUse = storedToken ?? currentRefreshToken;

  if (!tokenToUse) {
    console.error("No refresh token available");
    return false;
  }

  try {
    console.log("Refreshing token...");
    const tokenResponse = await fetch("https://www.yettel.rs/nalog/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*",
      },
      body: JSON.stringify({
        client_id: "market",
        grant_type: "refresh_token",
        refresh_token: tokenToUse,
      }),
    });

    if (!tokenResponse.ok) {
      const text = await tokenResponse.text();
      console.error(`Token refresh failed: ${tokenResponse.status} - ${text}`);
      return false;
    }

    const tokens = (await tokenResponse.json()) as TokenResponse;
    console.log("Got new access token, saving new refresh token...");

    currentRefreshToken = tokens.refresh_token;
    await saveRefreshToken(tokens.refresh_token);

    console.log("Exchanging for session...");
    const authResponse = await fetch("https://shopping.yettel.rs/api/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*",
        "x-version": "2.2.0",
      },
      body: JSON.stringify({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      }),
    });

    if (!authResponse.ok) {
      const text = await authResponse.text();
      console.error(`Auth failed: ${authResponse.status} - ${text}`);
      return false;
    }

    const setCookie = authResponse.headers.get("set-cookie");
    if (setCookie) {
      const match = setCookie.match(/yshc\.connect\.sid=([^;]+)/);
      if (match?.[1]) {
        currentSessionCookie = match[1];
        console.log("Session refreshed successfully");
        return true;
      }
    }

    console.error("No session cookie in response");
    return false;
  } catch (error) {
    console.error("Refresh error:", error);
    return false;
  }
}

export async function initSession(): Promise<void> {
  console.log("Initializing session for", USERNAME);
  const success = await refreshSession();
  if (!success) {
    throw new Error("Failed to initialize session");
  }
}
