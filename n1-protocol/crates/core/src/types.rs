//! Types are entries too. In the full protocol a type is a signed, content-addressed
//! schema entry; for the MVP the core set is a fixed list of well-known schemas whose
//! ids are still **content-addressed** — `blake3(canonical({kind,name,schema}))` — so
//! every party derives the same id with no registry and no handshake. The relay exposes
//! the id→name map at `GET /types`, which is how the Node bot resolves type names
//! without re-implementing any protocol logic.

use serde_json::{json, Value};
use std::collections::BTreeMap;

/// The current core set (spec §"Types are entries too"), plus a pragmatic `capability`
/// type so a participant can declare skills/resources for the Capabilities core vector.
pub fn type_defs() -> Vec<(&'static str, Value)> {
    vec![
        ("identity", json!({ "name": "string", "pubkey": "string", "suite": "string" })),
        ("type", json!({ "name": "string", "schema": "object" })),
        ("personhood", json!({ "nullifier": "string", "verifier": "id" })),
        ("mission", json!({ "statement": "string" })),
        ("goal", json!({ "title": "string", "target_date": "date" })),
        ("plan", json!({ "title": "string" })),
        ("decision", json!({ "title": "string", "rationale": "string" })),
        ("task", json!({ "title": "string", "status": "string", "goal": "id" })),
        ("agreement", json!({ "with": "id", "commit": "string", "terms_hash": "hash", "deadline": "date" })),
        ("transaction", json!({ "with": "id", "amount": "int", "unit": "string", "memo": "string" })),
        ("problem", json!({ "title": "string", "status": "string" })),
        ("calendar_event", json!({ "title": "string", "at": "date" })),
        ("connection", json!({ "with": "id" })),
        ("capability", json!({ "skills": "array", "resources": "array" })),
        ("attestation", json!({ "subject": "id", "claim": "string" })),
        ("oracle", json!({ "about": "id", "note": "string" })),
        ("correction", json!({ "target": "id", "note": "string", "source": "string" })),
    ]
}

fn type_id_of(name: &str, schema: &Value) -> String {
    let canon = crate::canonicalize(&json!({ "kind": "type", "name": name, "schema": schema }));
    crate::hash_bytes(canon.as_bytes())
}

/// Deterministic id for a core type by name.
pub fn type_id(name: &str) -> Option<String> {
    type_defs()
        .into_iter()
        .find(|(n, _)| *n == name)
        .map(|(n, s)| type_id_of(n, &s))
}

/// The full id→name map (what `GET /types` returns).
pub fn all() -> BTreeMap<String, String> {
    type_defs()
        .into_iter()
        .map(|(n, s)| (type_id_of(n, &s), n.to_string()))
        .collect()
}

/// Resolve a type id back to its human name.
pub fn type_name(id: &str) -> Option<String> {
    all().get(id).cloned()
}
