// Pure rendering — no I/O, fully unit-testable. Telegram has no tables, so we draw
// fixed-width monospace blocks inside <pre> and use HTML parse mode (far less escaping
// than MarkdownV2). The one rule that matters: escape & first, then < and >, even inside
// <pre>, or sendMessage rejects the entities.

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function truncate(s, n) {
  s = String(s);
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

function short(id) {
  if (typeof id !== "string") return "";
  const hex = id.includes(":") ? id.split(":")[1] : id;
  return hex.slice(0, 6);
}

// The "what" cell: a short human label per entry type.
export function labelFor(type, body = {}) {
  switch (type) {
    case "mission": return body.statement || "";
    case "goal": return body.title + (body.target_date ? ` (${body.target_date})` : "");
    case "plan": return body.title || "";
    case "decision": return body.title || "";
    case "task": return (body.status === "done" ? "✓ " : "") + (body.title || "");
    case "agreement": return body.commit || "";
    case "transaction": {
      const amt = typeof body.amount === "number" ? `$${(body.amount / 100).toLocaleString()}` : "";
      return [body.memo, amt].filter(Boolean).join(" ");
    }
    case "problem": return (body.status === "resolved" ? "✓ " : "") + (body.title || "");
    case "connection": return `connect ${short(body.with)}`;
    case "capability": return (body.skills || []).join(", ");
    case "correction": return body.note || "";
    default: return JSON.stringify(body).slice(0, 30);
  }
}

// rows: [{ when, type, what, source }] — render an aligned monospace table.
export function renderTable(rows) {
  const cols = ["when", "type", "what", "source"];
  const widths = cols.map((c) =>
    Math.max(c.length, ...rows.map((r) => String(r[c] ?? "").length))
  );
  const fmt = (cells) =>
    cols.map((c, i) => String(cells[c] ?? "").padEnd(widths[i])).join("  ");
  const header = fmt(Object.fromEntries(cols.map((c) => [c, c])));
  const lines = rows.map(fmt);
  // Build the raw (unescaped) table for correct width, then escape the whole thing once.
  return "<pre>" + escapeHtml([header, ...lines].join("\n")) + "</pre>";
}

export function renderScorecard(cores) {
  const rows = [
    ["Integrity", cores?.integrity?.summary],
    ["Intent", cores?.intent?.summary],
    ["Capabilities", cores?.capabilities?.summary],
    ["Results", cores?.results?.summary],
  ];
  const w = Math.max(...rows.map((r) => r[0].length));
  const body = rows
    .map(([k, v]) => `${k.padEnd(w)}  ${v ?? "—"}`)
    .join("\n");
  return "<pre>" + escapeHtml(body) + "</pre>";
}

// Assemble the full message, capping rows so we stay under Telegram's 4096-char limit.
export function buildMessage(name, rows, cores, maxRows = 12) {
  const assemble = (rs) =>
    `<b>n1 · ${escapeHtml(name || "participant")}</b>\n` +
    renderTable(rs) +
    "\n" +
    renderScorecard(cores);

  let rs = rows.slice(-maxRows);
  let text = assemble(rs);
  while (text.length > 3800 && rs.length > 3) {
    rs = rs.slice(1);
    text = assemble(rs);
  }
  return text;
}

// Map a raw stream entry to a table row. Returns null for infrastructure entries.
export function rowFor(entry, typeName) {
  if (!typeName || typeName === "identity" || typeName === "type") return null;
  const body = entry.body || {};
  const source = typeName === "correction" ? (body.source || "oracle") : "self";
  return {
    when: (entry.ts || "").slice(11, 16),
    type: typeName,
    what: truncate(labelFor(typeName, body), 26),
    source,
  };
}
