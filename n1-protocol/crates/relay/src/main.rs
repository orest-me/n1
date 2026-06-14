//! Transport — a single dumb relay. It can't forge an entry (signed), alter one
//! (content-addressed), or accept a fork (chain-checked). Two jobs map to the user's two
//! APIs:
//!   * `POST /entries`  — stream data IN  (publish a signed entry)
//!   * `GET  /stream`   — stream data OUT (live SSE feed, resumable via Last-Event-ID)
//! Plus history (`/entries`, `/entries/{id}`), `/head`, and Rust-computed `/state`,
//! `/cores`, `/types`, `/authors` so clients (the Node bot) never re-implement protocol
//! logic. `relay verify` runs the spec's four checks over the log.

use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::{
        sse::{Event, KeepAlive, Sse},
        IntoResponse,
    },
    routing::{get, post},
    Json, Router,
};
use futures::{Stream, StreamExt};
use n1_core::Entry;
use n1_log::{AppendError, Log};
use serde::Deserialize;
use serde_json::json;
use std::convert::Infallible;
use std::sync::{Arc, Mutex};
use tokio::sync::broadcast;
use tokio_stream::wrappers::BroadcastStream;

#[derive(Clone)]
struct AppState {
    log: Arc<Mutex<Log>>,
    tx: broadcast::Sender<(u64, Entry)>,
}

#[derive(Deserialize, Default)]
struct EntriesQuery {
    author: Option<String>,
    since: Option<u64>,
}

#[tokio::main]
async fn main() {
    let data_dir = std::env::var("N1_DATA").unwrap_or_else(|_| "data".to_string());
    let _ = std::fs::create_dir_all(&data_dir);
    let path = std::path::PathBuf::from(format!("{data_dir}/log.jsonl"));

    let (tx, _rx) = broadcast::channel(4096);
    let mut log = Log::new(path.clone(), tx.clone());
    let load_errors = log.load();

    // `relay verify` — replay the log and report the four checks.
    if std::env::args().nth(1).as_deref() == Some("verify") {
        run_verify(&log, &load_errors);
        return;
    }

    if !load_errors.is_empty() {
        eprintln!("[warn] {} entr(ies) failed verification on load:", load_errors.len());
        for e in &load_errors {
            eprintln!("  - {e}");
        }
    }

    let state = AppState {
        log: Arc::new(Mutex::new(log)),
        tx,
    };

    let app = Router::new()
        .route("/health", get(|| async { "ok" }))
        .route("/entries", post(post_entry).get(get_entries))
        .route("/entries/{id}", get(get_entry))
        .route("/stream", get(stream))
        .route("/head", get(head))
        .route("/state", get(state_h))
        .route("/cores", get(cores_h))
        .route("/types", get(types_h))
        .route("/authors", get(authors_h))
        .with_state(state);

    let port = std::env::var("PORT").unwrap_or_else(|_| "8787".to_string());
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}"))
        .await
        .expect("bind");
    println!("n1 relay listening on :{port}  (log: {})", path.display());
    axum::serve(listener, app).await.expect("serve");
}

/// Publish a signed entry. (= the user's "API to stream data in".)
async fn post_entry(State(st): State<AppState>, Json(entry): Json<Entry>) -> impl IntoResponse {
    let mut log = st.log.lock().unwrap();
    match log.append(entry, true) {
        Ok((id, seq)) => (StatusCode::CREATED, Json(json!({ "id": id, "seq": seq }))).into_response(),
        Err(AppendError::BadRequest(m)) => {
            (StatusCode::BAD_REQUEST, Json(json!({ "error": m }))).into_response()
        }
        Err(AppendError::Conflict(m)) => {
            (StatusCode::CONFLICT, Json(json!({ "error": m }))).into_response()
        }
    }
}

/// Historical fetch.
async fn get_entries(State(st): State<AppState>, Query(q): Query<EntriesQuery>) -> impl IntoResponse {
    let log = st.log.lock().unwrap();
    Json(log.entries(q.author.as_deref(), q.since.unwrap_or(0)))
}

async fn get_entry(State(st): State<AppState>, Path(id): Path<String>) -> impl IntoResponse {
    let log = st.log.lock().unwrap();
    match log.get(&id) {
        Some(e) => Json(e).into_response(),
        None => (StatusCode::NOT_FOUND, Json(json!({ "error": "not found" }))).into_response(),
    }
}

/// Live feed. (= the user's "API to get the stream".) Honors `Last-Event-ID` (or `?since=`):
/// we subscribe to the broadcast *first*, then replay the gap, then dedup the boundary —
/// so a reconnect drops nothing and double-sends nothing.
async fn stream(
    State(st): State<AppState>,
    Query(q): Query<EntriesQuery>,
    headers: HeaderMap,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let last = headers
        .get("last-event-id")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.parse::<u64>().ok())
        .or(q.since)
        .unwrap_or(0);
    let author = q.author.clone();

    let rx = st.tx.subscribe(); // subscribe before snapshot => no gap
    let missed = {
        let log = st.log.lock().unwrap();
        log.entries_seq(author.as_deref(), last)
    };
    let last_missed_seq = missed.last().map(|(seq, _)| *seq).unwrap_or(last);

    let author_live = author.clone();
    let live = BroadcastStream::new(rx).filter_map(move |res| {
        let author = author_live.clone();
        async move {
            match res {
                Ok((seq, e)) => {
                    let keep = seq > last_missed_seq
                        && author.as_deref().map_or(true, |a| {
                            e.author == a || n1_core::compute_id(&e) == a
                        });
                    keep.then_some((seq, e))
                }
                Err(_) => None,
            }
        }
    });

    let stream = futures::stream::iter(missed).chain(live).map(|(seq, e)| {
        Ok(Event::default()
            .id(seq.to_string())
            .event("entry")
            .data(serde_json::to_string(&e).expect("serializable")))
    });

    Sse::new(stream).keep_alive(KeepAlive::default())
}

async fn head(State(st): State<AppState>) -> impl IntoResponse {
    let log = st.log.lock().unwrap();
    Json(json!({ "log_head": log.log_head(), "count": log.len() }))
}

async fn state_h(State(st): State<AppState>, Query(q): Query<EntriesQuery>) -> impl IntoResponse {
    let log = st.log.lock().unwrap();
    let entries = log.entries(q.author.as_deref(), 0);
    Json(n1_projection::project(&entries))
}

async fn cores_h(State(st): State<AppState>, Query(q): Query<EntriesQuery>) -> impl IntoResponse {
    let log = st.log.lock().unwrap();
    let entries = log.entries(q.author.as_deref(), 0);
    let state = n1_projection::project(&entries);
    let cores = n1_projection::cores(&state);
    Json(json!({ "name": state.identity, "author": state.author, "cores": cores }))
}

async fn types_h() -> impl IntoResponse {
    Json(n1_core::types::all())
}

async fn authors_h(State(st): State<AppState>) -> impl IntoResponse {
    let log = st.log.lock().unwrap();
    let authors: Vec<_> = log
        .authors()
        .into_iter()
        .map(|(id, name)| json!({ "id": id, "name": name }))
        .collect();
    Json(authors)
}

/// The spec's four checks, run over the whole log. Load already re-verified signatures
/// and chain continuity (any failure lands in `errors`); here we just report.
fn run_verify(log: &Log, errors: &[String]) {
    println!("n1 verify — {} entr(ies)", log.len());
    println!("log_head: {}", log.log_head());
    if errors.is_empty() {
        println!("✓ signature, chain & continuity, id consistency: all pass");
        std::process::exit(0);
    }
    println!("✗ {} problem(s):", errors.len());
    for e in errors {
        println!("  - {e}");
    }
    std::process::exit(1);
}
