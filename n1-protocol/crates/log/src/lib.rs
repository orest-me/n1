//! The log — an append-only store of entries. Source of record (JSONL on disk), with
//! per-identity hash chains, a rolling head hash, and a broadcast channel that fans new
//! entries out to live stream subscribers.
//!
//! Honest scope: the rolling head detects local tampering, but this MVP has **no
//! witnesses**, so it can't prevent a split view. That's the biggest stub vs the spec's
//! Trillian-style witnessed Merkle tree.

use n1_core::{compute_id, pubkey_of_identity, types, verify, Entry};
use std::collections::HashMap;
use std::fs::OpenOptions;
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use tokio::sync::broadcast;

#[derive(Debug)]
pub enum AppendError {
    /// Malformed / unverifiable — maps to HTTP 400.
    BadRequest(String),
    /// Chain conflict or duplicate — maps to HTTP 409.
    Conflict(String),
}

impl std::fmt::Display for AppendError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AppendError::BadRequest(m) => write!(f, "bad request: {m}"),
            AppendError::Conflict(m) => write!(f, "conflict: {m}"),
        }
    }
}

struct IdentityRec {
    pubkey: String,
    name: String,
}

pub struct Log {
    path: PathBuf,
    by_id: HashMap<String, (u64, Entry)>,
    order: Vec<String>,
    heads: HashMap<String, String>, // chain id (identity id) -> latest entry id
    identities: HashMap<String, IdentityRec>,
    seq: u64,
    log_head: String,
    tx: broadcast::Sender<(u64, Entry)>,
}

impl Log {
    pub fn new(path: PathBuf, tx: broadcast::Sender<(u64, Entry)>) -> Self {
        Log {
            path,
            by_id: HashMap::new(),
            order: Vec::new(),
            heads: HashMap::new(),
            identities: HashMap::new(),
            seq: 0,
            log_head: n1_core::hash_bytes(b"n1-genesis"),
            tx,
        }
    }

    /// Replay the JSONL file into memory, re-verifying every entry. Returns the list of
    /// problems found (empty == a clean, untampered log). Does not re-persist.
    pub fn load(&mut self) -> Vec<String> {
        let mut errs = Vec::new();
        let file = match std::fs::File::open(&self.path) {
            Ok(f) => f,
            Err(_) => return errs, // no log yet
        };
        for (i, line) in BufReader::new(file).lines().enumerate() {
            let line = match line {
                Ok(l) => l,
                Err(e) => {
                    errs.push(format!("line {}: read error: {e}", i + 1));
                    continue;
                }
            };
            if line.trim().is_empty() {
                continue;
            }
            match serde_json::from_str::<Entry>(&line) {
                Ok(entry) => {
                    if let Err(e) = self.append(entry, false) {
                        errs.push(format!("line {}: {e}", i + 1));
                    }
                }
                Err(e) => errs.push(format!("line {}: parse error: {e}", i + 1)),
            }
        }
        errs
    }

    /// Verify-on-ingest and append. `persist` writes the JSONL line (false during replay).
    pub fn append(&mut self, entry: Entry, persist: bool) -> Result<(String, u64), AppendError> {
        use AppendError::*;
        let id = compute_id(&entry);
        if self.by_id.contains_key(&id) {
            return Err(Conflict(format!("duplicate entry {id}")));
        }

        let tname = types::type_name(&entry.type_id);
        if tname.is_none() {
            return Err(BadRequest(format!("unknown type {}", entry.type_id)));
        }
        let is_genesis = tname.as_deref() == Some("identity")
            && entry.author == "self"
            && entry.prev.is_none();

        // Resolve the public key: from the body on genesis, from the registry otherwise.
        let pubkey = if is_genesis {
            pubkey_of_identity(&entry).map_err(BadRequest)?
        } else {
            self.identities
                .get(&entry.author)
                .map(|r| r.pubkey.clone())
                .ok_or_else(|| BadRequest(format!("unknown author {}", entry.author)))?
        };

        verify(&entry, &pubkey).map_err(BadRequest)?;

        // Chain continuity: every non-genesis entry must extend its author's current head.
        let chain_id = if is_genesis { id.clone() } else { entry.author.clone() };
        if !is_genesis {
            match (self.heads.get(&chain_id).cloned(), entry.prev.clone()) {
                (Some(head), Some(prev)) if head == prev => {}
                (Some(head), prev) => {
                    return Err(Conflict(format!(
                        "prev mismatch for {chain_id}: head={head} prev={prev:?}"
                    )))
                }
                (None, _) => return Err(Conflict(format!("no chain for author {chain_id}"))),
            }
        }

        // Commit.
        self.seq += 1;
        let seq = self.seq;
        if is_genesis {
            let name = entry
                .body
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            self.identities.insert(id.clone(), IdentityRec { pubkey, name });
            self.heads.insert(id.clone(), id.clone());
        } else {
            self.heads.insert(chain_id, id.clone());
        }
        self.by_id.insert(id.clone(), (seq, entry.clone()));
        self.order.push(id.clone());
        self.log_head = n1_core::hash_bytes(format!("{}{}", self.log_head, id).as_bytes());

        if persist {
            self.persist_line(&entry);
        }
        let _ = self.tx.send((seq, entry));
        Ok((id, seq))
    }

    fn persist_line(&self, entry: &Entry) {
        if let Some(dir) = self.path.parent() {
            let _ = std::fs::create_dir_all(dir);
        }
        match OpenOptions::new().create(true).append(true).open(&self.path) {
            Ok(mut f) => {
                let line = serde_json::to_string(entry).expect("serializable");
                let _ = writeln!(f, "{line}");
            }
            Err(e) => eprintln!("[log] persist failed: {e}"),
        }
    }

    fn matches_author(entry: &Entry, author: &str) -> bool {
        // A participant's entries carry author == identity id; the genesis entry carries
        // author == "self" but *is* that identity (its id == the author we filter for).
        entry.author == author || compute_id(entry) == author
    }

    /// Entries in ingest order, optionally filtered by author, with seq > `since`.
    pub fn entries_seq(&self, author: Option<&str>, since: u64) -> Vec<(u64, Entry)> {
        self.order
            .iter()
            .filter_map(|id| self.by_id.get(id))
            .filter(|(seq, e)| *seq > since && author.map_or(true, |a| Self::matches_author(e, a)))
            .cloned()
            .collect()
    }

    pub fn entries(&self, author: Option<&str>, since: u64) -> Vec<Entry> {
        self.entries_seq(author, since)
            .into_iter()
            .map(|(_, e)| e)
            .collect()
    }

    pub fn get(&self, id: &str) -> Option<Entry> {
        self.by_id.get(id).map(|(_, e)| e.clone())
    }

    pub fn subscribe(&self) -> broadcast::Receiver<(u64, Entry)> {
        self.tx.subscribe()
    }

    pub fn log_head(&self) -> &str {
        &self.log_head
    }

    pub fn len(&self) -> usize {
        self.order.len()
    }

    pub fn is_empty(&self) -> bool {
        self.order.is_empty()
    }

    /// Registered identities as `(id, name)`, sorted by entry count desc then id, so the
    /// bot can pick the most active participant deterministically when no author is set.
    pub fn authors(&self) -> Vec<(String, String)> {
        let mut v: Vec<(String, String, usize)> = self
            .identities
            .iter()
            .map(|(id, rec)| {
                let count = self
                    .by_id
                    .values()
                    .filter(|(_, e)| Self::matches_author(e, id))
                    .count();
                (id.clone(), rec.name.clone(), count)
            })
            .collect();
        v.sort_by(|a, b| b.2.cmp(&a.2).then(a.0.cmp(&b.0)));
        v.into_iter().map(|(id, name, _)| (id, name)).collect()
    }
}
