import { Router } from "@tsndr/cloudflare-worker-router";

export interface Env {
  Chats: KVNamespace;
  Keys: KVNamespace;
  TELEGRAM_KEY: string;
}
const router = new Router<Env>();

async function sendTelegramMessage(
  chatId: string,
  msg: string,
  env: Env
): Promise<number> {
  const telegramUrl = `https://api.telegram.org/bot${env.TELEGRAM_KEY}/sendMessage?chat_id=${chatId}&text=${msg}&parse_mode=HTML`;
  const telegramRes = await fetch(telegramUrl);
  if (!telegramRes.ok) {
    console.error(
      `Failed request to telegram ${await telegramRes.text()} (${
        telegramRes.status
      })`
    );
  }
  return telegramRes.status;
}

async function createKey(chatId: string, env: Env): Promise<string> {
  const key = crypto.randomUUID();
  await Promise.all([env.Chats.put(chatId, key), env.Keys.put(key, chatId)]);
  return key;
}

router.post("/", async ({ req, res, env }) => {
  const chatId = req.body.message.chat.id;
  let key = await env.Chats.get(chatId);
  if (!key) {
    key = await createKey(chatId, env);
  }
  const status = await sendTelegramMessage(
    chatId,
    `Here is your key: <code>${key}</code>. You will be asked to paste it the first time you run <code>noclify</code>`,
    env
  );
  res.status = status;
});

router.post("/:key", async ({ req, res, env }) => {
  const { key } = req.params;
  const chatId = await env.Keys.get(key);

  if (!chatId) {
    res.status = 404;
    return;
  }

  const { error, command, durationInMs } = req.body;

  const durationInSeconds = durationInMs / 1000;

  const msg = error
    ? `🤨 <code>${command}</code> ended with error (${durationInSeconds}s)`
    : `✅ <code>${command}</code> ended successfully (${durationInSeconds}s)`;

  const status = await sendTelegramMessage(chatId, msg, env);

  res.status = status;
});

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return router.handle(env, request);
  },
};
