//! State — deterministic projection. The raw log is a stream of acts; replaying it lands
//! on the same `State`, and from that we read the four cores of credibility (spec §"What
//! you can verify"). Pure functions, no clock, no I/O: replay the same entries, get the
//! same tables and the same vectors.

use n1_core::{types, Entry};
use serde::Serialize;
use serde_json::{json, Value};

#[derive(Default, Serialize)]
pub struct State {
    pub identity: Option<String>,
    pub author: Option<String>,
    pub mission: Option<String>,
    pub goals: Vec<Value>,
    pub plans: Vec<Value>,
    pub decisions: Vec<Value>,
    pub tasks_open: Vec<String>,
    pub tasks_done: Vec<String>,
    pub agreements: Vec<Value>,
    pub transactions: Vec<Value>,
    pub problems_open: Vec<String>,
    pub problems_solved: Vec<String>,
    pub connections: u32,
    pub capabilities: Vec<String>,
    pub corrections: u32,
    /// One row per non-infrastructure act: `{ when, type, body }` — the `when · type ·
    /// what · source` feed the bot renders.
    pub recent: Vec<Value>,
}

fn s(body: &Value, k: &str) -> String {
    body.get(k).and_then(|v| v.as_str()).unwrap_or("").to_string()
}

fn push_unique(v: &mut Vec<String>, x: String) {
    if !v.contains(&x) {
        v.push(x);
    }
}

/// Replay entries (in ingest order) into current state.
pub fn project(entries: &[Entry]) -> State {
    let mut st = State::default();
    for e in entries {
        let name = types::type_name(&e.type_id).unwrap_or_else(|| "unknown".into());
        let b = &e.body;
        match name.as_str() {
            "identity" => {
                st.identity = b.get("name").and_then(|v| v.as_str()).map(String::from);
                st.author = Some(n1_core::compute_id(e));
            }
            "mission" => st.mission = Some(s(b, "statement")),
            "goal" => st
                .goals
                .push(json!({ "title": s(b, "title"), "target_date": s(b, "target_date") })),
            "plan" => st.plans.push(json!({ "title": s(b, "title") })),
            "decision" => st.decisions.push(json!({ "title": s(b, "title") })),
            "task" => {
                let t = s(b, "title");
                if s(b, "status") == "done" {
                    st.tasks_open.retain(|x| x != &t);
                    push_unique(&mut st.tasks_done, t);
                } else if !st.tasks_done.contains(&t) {
                    push_unique(&mut st.tasks_open, t);
                }
            }
            "agreement" => st.agreements.push(json!({
                "with": s(b, "with"), "commit": s(b, "commit"), "deadline": s(b, "deadline")
            })),
            "transaction" => st.transactions.push(json!({
                "with": s(b, "with"),
                "amount": b.get("amount").cloned().unwrap_or(json!(0)),
                "memo": s(b, "memo")
            })),
            "problem" => {
                let t = s(b, "title");
                if s(b, "status") == "resolved" {
                    st.problems_open.retain(|x| x != &t);
                    push_unique(&mut st.problems_solved, t);
                } else if !st.problems_solved.contains(&t) {
                    push_unique(&mut st.problems_open, t);
                }
            }
            "connection" => st.connections += 1,
            "capability" => {
                if let Some(arr) = b.get("skills").and_then(|v| v.as_array()) {
                    for sk in arr.iter().filter_map(|v| v.as_str()) {
                        push_unique(&mut st.capabilities, sk.to_string());
                    }
                }
            }
            "correction" => st.corrections += 1,
            _ => {}
        }
        if name != "identity" && name != "type" {
            st.recent
                .push(json!({ "when": e.ts.clone(), "type": name, "body": b.clone() }));
        }
    }
    st
}

#[derive(Serialize)]
pub struct Cores {
    pub integrity: Value,
    pub intent: Value,
    pub capabilities: Value,
    pub results: Value,
}

/// The four cores, each a small vector + a one-line `summary` for the scorecard.
pub fn cores(st: &State) -> Cores {
    // Integrity: divergence between what was committed and what the record shows done.
    let opened = st.tasks_open.len() + st.tasks_done.len();
    let committed = st.agreements.len() + opened;
    let fulfilled_agreements = st
        .agreements
        .iter()
        .filter(|a| {
            let w = a.get("with").and_then(|v| v.as_str()).unwrap_or("");
            st.transactions
                .iter()
                .any(|t| t.get("with").and_then(|v| v.as_str()) == Some(w))
        })
        .count();
    let kept = st.tasks_done.len() + fulfilled_agreements;
    let pct = if committed > 0 { kept * 100 / committed } else { 100 };

    let demonstrated = st.tasks_done.len() + st.transactions.len();
    Cores {
        integrity: json!({
            "committed": committed, "kept": kept, "pct": pct,
            "summary": format!("kept {}/{} ({}%)", kept, committed, pct)
        }),
        intent: json!({
            "active_goals": st.goals.len(),
            "summary": format!("{} active goal(s)", st.goals.len())
        }),
        capabilities: json!({
            "skills": st.capabilities.len(), "demonstrated": demonstrated,
            "summary": format!("{} skill(s), {} demonstrated", st.capabilities.len(), demonstrated)
        }),
        results: json!({
            "shipped": st.tasks_done.len(), "deals": st.transactions.len(),
            "problems_solved": st.problems_solved.len(),
            "summary": format!("{} shipped · {} deal(s) · {} problem(s) solved",
                st.tasks_done.len(), st.transactions.len(), st.problems_solved.len())
        }),
    }
}
