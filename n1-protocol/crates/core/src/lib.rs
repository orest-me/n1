//! The protocol's one primitive: the **entry** — a signed, content-addressed, typed,
//! chained JSON record of a single act. Everything else is entries or pure functions
//! over entries. This crate is the single source of truth for signing, hashing and
//! canonicalization; the log, relay, projection and producer all build on it.

pub mod types;

use ed25519_dalek::{Signature, Signer, SigningKey, Verifier, VerifyingKey};
use serde::{Deserialize, Serialize};
use serde_json::Value;

/// One signed act. The `id` is never stored — it *is* the hash of the canonical bytes.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Entry {
    /// Envelope version (cheap future-proofing).
    pub v: u32,
    /// id of the `type` this entry conforms to (resolves via [`types`]).
    #[serde(rename = "type")]
    pub type_id: String,
    /// id of the author's genesis identity entry — or the sentinel `"self"` on genesis.
    pub author: String,
    /// id of the author's previous entry; `null` only on a genesis entry.
    pub prev: Option<String>,
    /// Author's *claimed* time (RFC3339). Not authoritative — the log's ingest order is.
    pub ts: String,
    /// Structured fields the protocol reasons about.
    pub body: Value,
    /// `ed25519:<hex>` over `canonicalize(entry-without-sig)`.
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub sig: Option<String>,
}

/// A freshly generated identity plus the secret material to keep signing as it.
pub struct Identity {
    pub entry: Entry,
    /// 32-byte ed25519 seed, hex — the private key. Keep secret.
    pub signing_key_hex: String,
    /// `ed25519:<hex>` public key.
    pub verifying_key_hex: String,
    /// The genesis entry id — this identity's permanent address.
    pub id: String,
}

/// Split an algorithm-tagged value (`ed25519:ff..`, `blake3:ab..`) into `(algo, hex)`.
/// Tagging every hash and signature is what makes the suite swappable (crypto-agility).
pub fn parse_tagged(s: &str) -> Result<(String, String), String> {
    let (algo, rest) = s
        .split_once(':')
        .ok_or_else(|| format!("untagged value: {s}"))?;
    Ok((algo.to_string(), rest.to_string()))
}

/// Canonical bytes of any value: a JCS-compatible subset — keys sorted, no whitespace,
/// integer-only numbers. (serde_json's default object map is a sorted `BTreeMap`, so
/// `to_value` then `to_string` yields one byte-exact serialization. We keep `body`
/// values to strings/ints/bools, sidestepping JCS float/Unicode edge cases.)
pub fn canonicalize<T: Serialize>(v: &T) -> String {
    let val = serde_json::to_value(v).expect("serializable");
    serde_json::to_string(&val).expect("serializable")
}

/// Tagged hash of bytes — today `blake3:<hex>`. The single chokepoint for hashing, so
/// swapping the suite is a one-line change.
pub fn hash_bytes(bytes: &[u8]) -> String {
    format!("blake3:{}", blake3::hash(bytes).to_hex())
}

/// The exact bytes that get signed: the entry with `sig` stripped.
pub fn signing_payload(entry: &Entry) -> String {
    let mut e = entry.clone();
    e.sig = None;
    canonicalize(&e)
}

/// The entry's id: hash of its full canonical bytes (including `sig`). Never stored.
pub fn compute_id(entry: &Entry) -> String {
    hash_bytes(canonicalize(entry).as_bytes())
}

fn signing_key_from_seed(seed: &[u8; 32]) -> SigningKey {
    SigningKey::from_bytes(seed)
}

/// Load a signing key from its 32-byte hex seed.
pub fn signing_key_from_hex(h: &str) -> Result<SigningKey, String> {
    let b = hex::decode(h).map_err(|e| e.to_string())?;
    let arr: [u8; 32] = b
        .as_slice()
        .try_into()
        .map_err(|_| "signing key must be 32 bytes".to_string())?;
    Ok(signing_key_from_seed(&arr))
}

/// Sign a payload, returning `ed25519:<hex>`.
pub fn sign(payload: &str, sk: &SigningKey) -> String {
    let sig: Signature = sk.sign(payload.as_bytes());
    format!("ed25519:{}", hex::encode(sig.to_bytes()))
}

/// Build and sign an entry. The two-pass order is mandatory: sign over the sig-less
/// canonical bytes, *then* the id is the hash of the bytes that now include the sig.
pub fn make_entry(
    type_id: &str,
    author: &str,
    prev: Option<String>,
    ts: &str,
    body: Value,
    sk: &SigningKey,
) -> Entry {
    let mut e = Entry {
        v: 1,
        type_id: type_id.to_string(),
        author: author.to_string(),
        prev,
        ts: ts.to_string(),
        body,
        sig: None,
    };
    e.sig = Some(sign(&signing_payload(&e), sk));
    e
}

/// Verify an entry's signature against a `ed25519:<hex>` public key.
pub fn verify(entry: &Entry, pubkey_tag: &str) -> Result<(), String> {
    let sig_tag = entry.sig.as_ref().ok_or("missing sig")?;
    let (salgo, shex) = parse_tagged(sig_tag)?;
    if salgo != "ed25519" {
        return Err(format!("unsupported sig algo: {salgo}"));
    }
    let (palgo, phex) = parse_tagged(pubkey_tag)?;
    if palgo != "ed25519" {
        return Err(format!("unsupported key algo: {palgo}"));
    }
    let pkb = hex::decode(&phex).map_err(|e| e.to_string())?;
    let pkarr: [u8; 32] = pkb
        .as_slice()
        .try_into()
        .map_err(|_| "public key must be 32 bytes".to_string())?;
    let vk = VerifyingKey::from_bytes(&pkarr).map_err(|e| e.to_string())?;
    let sgb = hex::decode(&shex).map_err(|e| e.to_string())?;
    let sig = Signature::from_slice(&sgb).map_err(|e| e.to_string())?;
    vk.verify(signing_payload(entry).as_bytes(), &sig)
        .map_err(|_| "signature verification failed".to_string())
}

/// Pull the `ed25519:<hex>` public key out of a genesis identity entry's body.
pub fn pubkey_of_identity(genesis: &Entry) -> Result<String, String> {
    genesis
        .body
        .get("pubkey")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| "identity entry missing body.pubkey".to_string())
}

/// Mint a fresh identity: random ed25519 keypair bound to a genesis `identity` entry.
pub fn generate_identity(name: &str, ts: &str) -> Identity {
    let mut seed = [0u8; 32];
    getrandom::getrandom(&mut seed).expect("os rng");
    let sk = signing_key_from_seed(&seed);
    let vk_hex = format!("ed25519:{}", hex::encode(sk.verifying_key().to_bytes()));
    let body = serde_json::json!({
        "name": name,
        "pubkey": vk_hex,
        "suite": "ed25519-blake3"
    });
    let type_id = types::type_id("identity").expect("identity type");
    // Genesis can't name its own not-yet-known id, so author is the sentinel "self".
    let entry = make_entry(&type_id, "self", None, ts, body, &sk);
    let id = compute_id(&entry);
    Identity {
        entry,
        signing_key_hex: hex::encode(seed),
        verifying_key_hex: vk_hex,
        id,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn alice() -> (Identity, SigningKey) {
        let id = generate_identity("Alice", "2026-06-15T00:00:00Z");
        let sk = signing_key_from_hex(&id.signing_key_hex).unwrap();
        (id, sk)
    }

    #[test]
    fn sign_then_verify_roundtrips() {
        let (id, sk) = alice();
        assert_eq!(verify(&id.entry, &id.verifying_key_hex), Ok(()));
        let e = make_entry(
            &types::type_id("goal").unwrap(),
            &id.id,
            Some(id.id.clone()),
            "2026-06-15T00:01:00Z",
            json!({ "title": "Ship MVP" }),
            &sk,
        );
        assert_eq!(verify(&e, &id.verifying_key_hex), Ok(()));
    }

    #[test]
    fn tamper_breaks_verification() {
        let (id, _) = alice();
        let mut e = id.entry.clone();
        e.body = json!({ "name": "Mallory", "pubkey": id.verifying_key_hex });
        assert!(verify(&e, &id.verifying_key_hex).is_err());
    }

    #[test]
    fn canonicalize_is_field_order_independent() {
        let a = json!({ "b": 1, "a": 2, "z": { "y": 1, "x": 2 } });
        let b = json!({ "z": { "x": 2, "y": 1 }, "a": 2, "b": 1 });
        assert_eq!(canonicalize(&a), canonicalize(&b));
    }

    #[test]
    fn id_is_stable_and_content_addressed() {
        let (id, _) = alice();
        assert_eq!(compute_id(&id.entry), id.id);
        let mut e = id.entry.clone();
        e.ts = "2026-06-15T00:00:01Z".into(); // any change => different id
        assert_ne!(compute_id(&e), id.id);
    }

    #[test]
    fn type_ids_are_deterministic() {
        assert_eq!(types::type_id("agreement"), types::type_id("agreement"));
        assert_ne!(types::type_id("agreement"), types::type_id("transaction"));
        let id = types::type_id("task").unwrap();
        assert_eq!(types::type_name(&id).as_deref(), Some("task"));
    }
}
