import fetch from "node-fetch";

const url = "https://noclify.alexmenor.workers.dev";

export async function notifyTelegram(
  chatId: string,
  meta: { error: boolean; command: string; durationInMs: number }
) {
  const body = JSON.stringify(meta);
  const result = await fetch(`${url}/${chatId}`, {
    method: "POST",
    body,
    headers: { "Content-Type": "application/json" },
  });

  if (!result.ok) {
    console.error(`🔕 Telegram could not be notified (error ${result.status})`);
  } else {
    console.log("✅ Telegram has been notified");
  }
}
