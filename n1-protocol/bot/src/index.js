// A third-party Trust Protocol client. It consumes the live stream from the Rust relay
// (the user's "API to get the stream") and, on an interval, posts a rich digest to a
// Telegram channel: a monospace table of recent acts + a four-core trust scorecard.
//
// It re-implements ZERO protocol logic: the table is just a render of stream entries, and
// the scorecard comes straight from the relay's Rust-computed GET /cores. With no bot
// token it runs in dry mode, printing each post to stdout — so the demo is verifiable
// without Telegram credentials.

import { buildMessage, rowFor } from "./telegram.js";

const RELAY = process.env.RELAY_URL || "http://localhost:8787";
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const CHAT = process.env.TELEGRAM_CHAT_ID || "";
const INTERVAL = Number(process.env.POST_INTERVAL_MS || 15000);
let AUTHOR = process.env.AUTHOR_ID || "";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(path) {
  const res = await fetch(`${RELAY}${path}`);
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return res.json();
}

// Wait for the relay to be up and for at least one participant to exist.
async function discover() {
  for (;;) {
    try {
      const types = await getJson("/types"); // { id: name }
      const authors = await getJson("/authors"); // [{ id, name }] (most active first)
      if (!AUTHOR && authors.length) AUTHOR = authors[0].id;
      if (AUTHOR) {
        const me = authors.find((a) => a.id === AUTHOR) || authors[0] || {};
        console.log(`bot: relay=${RELAY} author=${AUTHOR} (${me.name || "?"})`);
        return types;
      }
    } catch (e) {
      // relay not ready yet
    }
    await sleep(1500);
  }
}

// Consume Server-Sent Events with native fetch; resume via Last-Event-ID on reconnect.
async function subscribe(typeMap, onRow) {
  let lastId = null;
  for (;;) {
    try {
      const headers = lastId ? { "Last-Event-ID": String(lastId) } : {};
      const res = await fetch(`${RELAY}/stream?author=${encodeURIComponent(AUTHOR)}`, { headers });
      if (!res.ok || !res.body) throw new Error(`stream -> ${res.status}`);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf("\n\n")) >= 0) {
          const chunk = buf.slice(0, i);
          buf = buf.slice(i + 2);
          let id = null;
          let data = null;
          for (const line of chunk.split("\n")) {
            if (line.startsWith("id:")) id = line.slice(3).trim();
            else if (line.startsWith("data:"))
              data = (data ? data + "\n" : "") + line.slice(5).trimStart();
          }
          if (id) lastId = id;
          if (data) {
            try {
              const entry = JSON.parse(data);
              const row = rowFor(entry, typeMap[entry.type]);
              if (row) onRow(row);
            } catch {
              /* ignore malformed frame */
            }
          }
        }
      }
    } catch (e) {
      console.error(`bot: stream dropped (${e.message}); reconnecting...`);
    }
    await sleep(2000); // backoff before reconnect
  }
}

async function send(text) {
  if (!TOKEN || !CHAT) {
    console.log("\n--- digest (dry run; set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID to post) ---");
    console.log(text);
    return;
  }
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  if (res.status === 429) {
    const j = await res.json().catch(() => ({}));
    const wait = (j.parameters?.retry_after || 1) * 1000;
    console.error(`bot: rate limited; retrying in ${wait}ms`);
    await sleep(wait);
    return send(text);
  }
  if (!res.ok) console.error("bot: telegram error", res.status, await res.text());
}

async function main() {
  const typeMap = await discover();
  const rows = [];
  subscribe(typeMap, (row) => {
    rows.push(row);
    if (rows.length > 200) rows.shift();
  });

  // Post a digest on the interval (and once shortly after startup).
  await sleep(3000);
  for (;;) {
    try {
      const { name, cores } = await getJson(`/cores?author=${encodeURIComponent(AUTHOR)}`);
      if (rows.length) await send(buildMessage(name, rows, cores));
    } catch (e) {
      console.error(`bot: digest failed (${e.message})`);
    }
    await sleep(INTERVAL);
  }
}

main().catch((e) => {
  console.error("bot: fatal", e);
  process.exit(1);
});
