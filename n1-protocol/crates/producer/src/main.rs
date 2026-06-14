//! A demo participant living a small, real working life on the log: mission, goals, a
//! plan, a decision, commitments made and kept, a deal, a problem raised and resolved,
//! and an oracle correction. It deliberately commits to 3 things and completes 2, so the
//! Integrity core reads a non-trivial 2/3.
//!
//! Identity (the signing key + genesis entry) is persisted to `data/producer-identity.json`
//! so re-runs continue the same chain. Everything is published over `POST /entries`.

use n1_core::{compute_id, generate_identity, make_entry, signing_key_from_hex, types, Entry};
use serde_json::{json, Value};
use std::time::Duration;

fn now() -> String {
    chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true)
}

/// A deterministic, off-network counterparty reference (resolves to no identity — fine,
/// `with` is just a reference, like an off-protocol party).
fn party(name: &str) -> String {
    n1_core::hash_bytes(format!("counterparty:{name}").as_bytes())
}

#[tokio::main]
async fn main() {
    let relay = std::env::var("RELAY_URL").unwrap_or_else(|_| "http://localhost:8787".to_string());
    let interval = Duration::from_millis(
        std::env::var("PRODUCE_INTERVAL_MS")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(2500),
    );
    let id_path = std::env::var("N1_DATA").unwrap_or_else(|_| "data".to_string())
        + "/producer-identity.json";

    let client = reqwest::Client::new();

    // Load or mint the identity.
    let (sk_hex, author, genesis): (String, String, Entry) =
        match std::fs::read_to_string(&id_path).ok().and_then(|s| {
            serde_json::from_str::<Value>(&s).ok()
        }) {
            Some(v) => (
                v["signing_key_hex"].as_str().unwrap().to_string(),
                v["author"].as_str().unwrap().to_string(),
                serde_json::from_value(v["genesis"].clone()).unwrap(),
            ),
            None => {
                let ident = generate_identity("Alice Protocol", &now());
                let saved = json!({
                    "signing_key_hex": ident.signing_key_hex,
                    "author": ident.id,
                    "genesis": ident.entry,
                });
                if let Some(dir) = std::path::Path::new(&id_path).parent() {
                    let _ = std::fs::create_dir_all(dir);
                }
                std::fs::write(&id_path, serde_json::to_string_pretty(&saved).unwrap()).unwrap();
                (ident.signing_key_hex, ident.id.clone(), ident.entry)
            }
        };
    let sk = signing_key_from_hex(&sk_hex).expect("valid key");

    // Ensure genesis is on the relay (idempotent: 409 means it already is).
    post(&client, &relay, &genesis).await;

    // Resume from the author's current head so restarts extend, not fork, the chain.
    let mut prev = current_head(&client, &relay, &author)
        .await
        .unwrap_or_else(|| author.clone());

    let bob = party("Bob Industries");
    let carol = party("Carol Studio");
    let terms = n1_core::hash_bytes(b"NDA + milestone schedule v1");

    // The scripted arc. (type, body)
    let script: Vec<(&str, Value)> = vec![
        ("mission", json!({ "statement": "Make integrity cheap to verify." })),
        ("goal", json!({ "title": "Ship Trust Protocol MVP", "target_date": "2026-07-01" })),
        ("goal", json!({ "title": "Onboard 10 pilot orgs", "target_date": "2026-09-01" })),
        ("capability", json!({ "skills": ["rust", "distributed-systems", "cryptography"], "resources": ["relay-infra"] })),
        ("connection", json!({ "with": bob })),
        ("plan", json!({ "title": "Build core, log, relay, client, bot" })),
        ("decision", json!({ "title": "SSE over WebSocket; blake3 ids", "rationale": "native resume, simplicity" })),
        ("task", json!({ "title": "Implement core entry primitive", "status": "open" })),
        ("task", json!({ "title": "Implement streaming relay", "status": "open" })),
        ("agreement", json!({ "with": bob, "commit": "Ship v1 API", "terms_hash": terms, "deadline": "2026-07-01" })),
        ("problem", json!({ "title": "SSE proxy buffering", "status": "open" })),
        ("task", json!({ "title": "Implement core entry primitive", "status": "done" })),
        ("task", json!({ "title": "Implement streaming relay", "status": "done" })),
        ("problem", json!({ "title": "SSE proxy buffering", "status": "resolved" })),
        ("transaction", json!({ "with": carol, "amount": 250000, "unit": "USD-cents", "memo": "Consulting engagement" })),
    ];

    println!("producer: author={author}\n  streaming {} acts every {:?}...", script.len(), interval);
    let mut first_goal: Option<String> = None;
    for (i, (type_name, body)) in script.into_iter().enumerate() {
        tokio::time::sleep(interval).await;
        let type_id = types::type_id(type_name).expect("known type");
        let entry = make_entry(&type_id, &author, Some(prev.clone()), &now(), body, &sk);
        let id = compute_id(&entry);
        if post(&client, &relay, &entry).await {
            prev = id.clone();
            println!("  [{:>2}] {type_name}", i + 1);
            if type_name == "goal" && first_goal.is_none() {
                first_goal = Some(id);
            }
        }
    }

    // An oracle refines an account — riding alongside it, nothing erased.
    if let Some(target) = first_goal {
        tokio::time::sleep(interval).await;
        let type_id = types::type_id("correction").unwrap();
        let body = json!({
            "target": target,
            "note": "Roadmap cross-checked against public commits — on track.",
            "source": "oracle:n1"
        });
        let entry = make_entry(&type_id, &author, Some(prev.clone()), &now(), body, &sk);
        if post(&client, &relay, &entry).await {
            println!("  [16] correction (oracle)");
        }
    }

    println!("producer: done. The stream stands; the bot keeps posting digests.");
}

/// POST an entry. Returns true on accept (201) or harmless duplicate (409).
async fn post(client: &reqwest::Client, relay: &str, entry: &Entry) -> bool {
    match client.post(format!("{relay}/entries")).json(entry).send().await {
        Ok(resp) => {
            let status = resp.status();
            if status.is_success() {
                true
            } else if status.as_u16() == 409 {
                true // already present — fine for idempotent genesis / re-runs
            } else {
                let body = resp.text().await.unwrap_or_default();
                eprintln!("  ! relay rejected ({status}): {body}");
                false
            }
        }
        Err(e) => {
            eprintln!("  ! relay unreachable: {e}");
            false
        }
    }
}

/// The id of the author's latest entry (for chaining), or None if the log is empty.
async fn current_head(client: &reqwest::Client, relay: &str, author: &str) -> Option<String> {
    let entries: Vec<Entry> = client
        .get(format!("{relay}/entries"))
        .query(&[("author", author)])
        .send()
        .await
        .ok()?
        .json()
        .await
        .ok()?;
    entries.last().map(compute_id)
}
