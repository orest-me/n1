# The Trust Protocol — MVP

> **Concept only.** The Trust Protocol is a concept, not a shipping product. This MVP exists
> to explore and illustrate the design — it is not maintained or production-ready.

A runnable MVP of [the Trust Protocol](../content/protocol/index.md): an open, append-only,
signed, content-addressed log of a person's acts, streamed in real time, that anyone can
read and verify.

It proves the core loop end-to-end:

1. **API to stream data in** — publish signed entries (`POST /entries`).
2. **API to read the stream out** — subscribe to the live feed (`GET /stream`, SSE,
   resumable) + fetch history.
3. **A working third-party client** — a Telegram bot that, on an interval, posts a rich
   digest: a monospace `when · type · what · source` table plus a four-core trust
   scorecard, computed live from the stream.

## Shape

**Rust owns every protocol semantic; the Telegram bot (Node) is a thin renderer that
duplicates no protocol logic.** The entry is signed canonical JSON, so the boundary is
clean and language-neutral.

```
crates/core        the entry primitive: ed25519 + blake3 + JCS canonicalization,
                   two-pass sign-then-id, chain & signature verification
crates/log         append-only JSONL log, verify-on-ingest, per-identity chains,
                   rolling head hash, broadcast fan-out
crates/projection  deterministic replay -> participant state + the four cores
crates/relay       axum server (POST publish, SSE stream, history, /cores, /types,
                   /authors) + `verify` subcommand
crates/producer    a demo participant that lives a small working life on the log
bot/               Node (ESM, zero deps): SSE subscribe -> render -> post to Telegram
```

## Run it

```sh
# 0. one-time: install Rust (https://rustup.rs) and Node >= 20
cargo build

# 1. start the relay (terminal A)
cargo run -p n1-relay                 # listens on :8787, writes data/log.jsonl

# 2. stream a life of entries (terminal B)
cargo run -p n1-producer              # publishes mission, goals, tasks, a deal, ...

# 3. run the Telegram bot client (terminal C)
#    With no token it runs in DRY mode and prints each digest to stdout.
cd bot && npm run bot
#    To post to a real channel: create a bot via @BotFather, add it to your channel
#    as an admin, then:
TELEGRAM_BOT_TOKEN=123:abc TELEGRAM_CHAT_ID=@yourchannel npm run bot
```

Inspect and verify:

```sh
curl localhost:8787/head
curl "localhost:8787/cores?author=<id>"      # the four cores, computed in Rust
cargo run -p n1-relay -- verify              # signature + chain + id checks over the log
```

## Tests

```sh
cargo test -p n1-core      # sign/verify roundtrip, tamper detection, canonical determinism
cd bot && npm test         # rendering + HTML escaping + length guard
```

## Configuration (env)

| var | default | used by |
|---|---|---|
| `PORT` | `8787` | relay |
| `N1_DATA` | `data` | relay, producer (log + identity dir) |
| `RELAY_URL` | `http://localhost:8787` | producer, bot |
| `PRODUCE_INTERVAL_MS` | `2500` | producer |
| `POST_INTERVAL_MS` | `15000` | bot |
| `AUTHOR_ID` | first/most-active author | bot |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | _(dry run)_ | bot |

## Honest MVP scope

This is faithful to the spec's primitive and stream model, and honest about what a single
weekend MVP leaves out (the spec itself repeatedly flags "honest limits").

| Implemented | Stubbed | Omitted (documented) |
|---|---|---|
| entry primitive (sign / hash / chain / verify) | `oracle` / `correction` type — shape only, no real evidence-checking | **witnessing**: no Trillian-style inclusion/consistency proofs or witness gossip. The rolling `log_head` detects local tampering but **not** a split view |
| append-only JSONL log + verify-on-ingest | crypto-agility — every hash/sig is algorithm-tagged and `hash_bytes` is a single chokepoint, but no PQ suite is implemented | personhood / zk-KYC / Sybil-weighting — identities here are free keypairs |
| streaming relay: publish + SSE + history | types are well-known content-addressed schemas, not yet signed `type` entries | blobs / mirrors, time-lock seal |
| deterministic projection + four cores | | type supersedes / migrations / flow-score ranking |
| `verify` subcommand (signature, chain, id) | | multi-relay gossip; matching / goal vectors |

The **biggest** omission is witnessing — without it, this relay can't prove two readers
see the same history. Everything else is a natural extension of the same entry shape.
