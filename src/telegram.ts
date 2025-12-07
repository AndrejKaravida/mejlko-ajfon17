const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? "";
const USERNAME = process.env.USERNAME ?? "";

export async function sendTelegramMessage(message: string): Promise<void> {
  if (!BOT_TOKEN || !CHAT_ID) return;

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: `(${USERNAME}) ${message}`,
        parse_mode: "HTML",
      }),
    });
  } catch {
    console.error("Failed to send Telegram message");
  }
}
