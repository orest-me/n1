import { test } from "node:test";
import assert from "node:assert/strict";
import {
  escapeHtml,
  truncate,
  labelFor,
  renderTable,
  buildMessage,
  rowFor,
} from "../src/telegram.js";

test("escapeHtml escapes & first, then < and >", () => {
  assert.equal(escapeHtml("<a> & </a>"), "&lt;a&gt; &amp; &lt;/a&gt;");
  // & must be escaped before < / > so we never double-escape an entity
  assert.equal(escapeHtml("a<b&c>d"), "a&lt;b&amp;c&gt;d");
});

test("truncate adds an ellipsis past the limit", () => {
  assert.equal(truncate("hello", 10), "hello");
  assert.equal(truncate("hello world", 6), "hello…");
});

test("labelFor renders a task done marker and a deal amount", () => {
  assert.equal(labelFor("task", { title: "Ship", status: "done" }), "✓ Ship");
  assert.equal(labelFor("transaction", { memo: "Consulting", amount: 250000 }), "Consulting $2,500");
});

test("renderTable aligns columns and escapes content", () => {
  const out = renderTable([
    { when: "09:14", type: "goal", what: "Ship <MVP> & more", source: "self" },
  ]);
  assert.match(out, /^<pre>/);
  assert.match(out, /<\/pre>$/);
  assert.match(out, /&lt;MVP&gt; &amp; more/); // escaped inside <pre>
  assert.match(out, /when {3}type {2}what/); // header padded
});

test("rowFor skips infrastructure entries", () => {
  assert.equal(rowFor({ ts: "x", body: {} }, "identity"), null);
  assert.equal(rowFor({ ts: "x", body: {} }, "type"), null);
  const r = rowFor({ ts: "2026-06-15T09:14:02Z", body: { title: "X" } }, "goal");
  assert.equal(r.when, "09:14");
  assert.equal(r.type, "goal");
  assert.equal(r.source, "self");
});

test("rowFor marks correction source from body", () => {
  const r = rowFor(
    { ts: "2026-06-15T09:14:02Z", body: { note: "checked", source: "oracle:n1" } },
    "correction"
  );
  assert.equal(r.source, "oracle:n1");
});

test("buildMessage stays within the Telegram length limit", () => {
  const cores = {
    integrity: { summary: "kept 2/3 (67%)" },
    intent: { summary: "2 active goal(s)" },
    capabilities: { summary: "3 skill(s), 3 demonstrated" },
    results: { summary: "2 shipped · 1 deal(s) · 1 problem(s) solved" },
  };
  const rows = Array.from({ length: 500 }, (_, i) => ({
    when: "09:14",
    type: "task",
    what: "A very long task description number " + i,
    source: "self",
  }));
  const msg = buildMessage("Alice", rows, cores);
  assert.ok(msg.length <= 4096, `message length ${msg.length} must be <= 4096`);
  assert.match(msg, /<b>n1 · Alice<\/b>/);
  assert.match(msg, /kept 2\/3/);
});
