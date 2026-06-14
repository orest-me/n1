# The Trust Protocol

A single, open protocol that makes a person's integrity cheap to verify — so trust stops being a gamble and win-win becomes the default move.

:::callout
**Elevate the system for humanity: make it easier to grow through benefit, harder to grow through harm.** The protocol has one job — move the world toward 100% win-win at the ^[Speed of Trust](Covey's term. Trust down, cost up and speed down. Trust up, the opposite.).
:::

---

## The bottleneck

Trust is the gate to every win-win. The deal that would help both sides never happens because neither can cheaply confirm the other is honest, competent, and aligned. So the world defaults to suspicion — contracts, lawyers, escrow, due diligence, gut feel — and most cooperation dies in the cost of checking.

The mistake is to treat this as a shortage of virtue. **The scarce resource is verification, not honesty.** The trustworthy and the deceptive look identical until you pay to tell them apart, and that price is what kills the deal.

So the fix is mechanical, not moral. Make the trustworthy **trivial to verify** and lying **too expensive to sustain**, and you don't have to ask anyone to be good — cooperation becomes the dominant strategy on its own. Everything below derives that one move.

## The primitive — everything is an entry

The whole protocol is one object and one operation. The object is an **entry**: a small, signed, content-addressed, typed record of a single act. The operation is **append**: add entries to your own log, never remove them. Identity, types, state, and trust aren't separate systems — they're all entries, or pure functions over entries.

Four properties define the entry, and the rest of the protocol falls out of them.

**Signed.** A participant *is* a signing keypair. You hold the private key; the network only ever sees signatures. Every entry names its algorithm in the signature itself (`ed25519:…`) rather than assuming one, so the scheme can change without changing the form (see *Crypto-agility*).

**Content-addressed.** Each entry is canonicalized JSON (^[JCS](RFC 8785 — JSON Canonicalization Scheme. One byte-exact serialization, so a signature is reproducible.)) and its **id is the hash of those bytes, tagged with the algorithm** — today `blake3:…`. That tagged hash is the only *kind* of identifier in the system: your identity is the id of your genesis `identity` entry, a `type` reference is a type's id, a `prev` link is the previous entry's id. An id proves its bytes and nothing more — no registry to mint from, no slug to squat.

**Typed.** Every entry commits to the hash of the schema it conforms to. Types are themselves entries (see *Types are entries too*), so the shape is never guessed — it's named.

**Chained.** Each entry names the id of your previous one, forming a **per-identity hash chain**. Change any past entry and every hash after it breaks.

```json
{
  "type": "blake3:c4d2…e8",
  "author": "blake3:1f90…a1",
  "prev": "blake3:7b3e…d0",
  "ts": "2026-06-13T09:14:02Z",
  "body": {
    "with": "blake3:4d81…c7",
    "commit": "Ship v1 API by 2026-07-01",
    "terms_hash": "blake3:e55a…90"
  },
  "sig": "ed25519:3a77…ff"
}
```

`author` and `with` are genesis-entry ids — they resolve to public keys. The entry carries no `id` field: the id *is* its hash, computed by the reader, never stored. The `ts` field is only the author's *claim* about when they wrote the entry; the authoritative time is the witnessed interval the entry is pinned to (see *The log*).

**Crypto-agility — the form outlives the primitive.** Because every hash and signature names its algorithm, the **suite (hash, signature) is swappable**. To cross a cryptographic break — the day a quantum computer threatens Ed25519, or a hash weakens — an identity publishes a **rebind**: a new key in a new suite, a post-quantum signature such as ^[ML-DSA](Dilithium / FIPS 204, with SLH-DSA / SPHINCS+ as a hash-based fallback — both standardized post-quantum signatures.), signed by the *old* key while it's still sound, chaining the identity across the break. Two things keep this routine: **migrate before the break** — a rebind is only trustworthy if witnessed while the old primitive still holds, so it's an ordinary early entry, never a flag day under fire — and **history is anchored by witnessing, not by the hash alone** — a later-weakened hash can't retroactively forge your past, because the past was cosigned into the log while the hash was strong.

Because the suite is named *per entry*, you spend post-quantum's larger signatures only where forgery is catastrophic: **witness keys and genesis/rebind keys go hybrid-or-PQ now** (they anchor everyone's past and each person's identity), while **the high-frequency stream stays classical** (each tick is cheap and ephemeral, its past already held by the witness heads, its future by rebinding before the break).

From these four properties comes the one law of the protocol, worth stating once:

:::callout
**You can append to revise the future; you cannot rewrite — or hide — the past.** Any edit to history breaks the hash chain, and because your timeline is **continuously witnessed** (see *The log*), there is no unobserved interval to splice into or quietly disappear during. Tampering isn't merely detectable; there's no dark window to attempt it in.
:::

And one rule for content, so the entry stays small no matter what it carries. The `body` holds only the **structured fields the protocol reasons about** — references, commitments, terms, deadlines. **Any opaque payload, of any type and size, is a content-addressed blob**, referenced from the body by its hash and verified by rehashing, exactly like `prev` or `author`. A 2 KB note, a 400-page book, a photo, a 4 GB video are all identical — `{ "hash": "blake3:…", "mime": "…", "size": 0, "name": "…", "mirrors": ["…"] }`. The *kind* of file is the `mime` field — data, not a schema — so there's no `photo`/`video`/`media` type to define, and the log stays small, signable, and streamable while the bytes travel beside it. Small entries gossip to every relay for free; a large blob can't, so `mirrors` lists ^[where to fetch the bytes](URLs, IPFS CIDs, blob-store locations. Pure hints: a mirror that serves the wrong bytes fails the rehash, so none is trusted.). You fetch from whoever has it and confirm by rehashing: the hash is the *what*, the mirrors only the *where*.

A participant's whole working life is this one shape — append-only, streamed, open by default: mission, goals, plans, decisions, tasks, transactions, agreements, problems, calendar events, files, connections. You revise the future freely; the past stands and never goes dark.

:::callout
Openness adds power and opens no new wound — it only puts a spotlight on the ones already there.
:::

## The five layers

Nothing here is exotic; the point is that it's buildable today from parts that already work. Each layer does one job, and each follows from the entry.

**Identity — a keypair bound to one human.** No registrar, no central account: your identity is the id of your genesis entry, its key history auditable like everything else. That keypair is bound once to a *single real person* through **personhood** (below) — what stops a thousand free keypairs from becoming a thousand fake reputations.

**Entries — the atom above.** Signed, content-addressed, typed, chained. The unit of every action.

**The log — a continuously witnessed Merkle tree.** Entries land in an append-only **Merkle tree** (^[Trillian-style](Google's Trillian: a verifiable, append-only log with inclusion and consistency proofs — the same machinery as Certificate Transparency.)) that publishes signed tree heads. Independent **witnesses cosign and gossip** those heads, which stops a **split view** — showing one history to you and a different one to someone else: if the heads match across witnesses, everyone reads the same past. Witnessing also fixes time — **an entry's authoritative timestamp is the interval between the cosigned heads that bracket it**, not the `ts` it claims. And because every entry enters the tree *as it streams*, the log is live by nature (see *The stream*).

**Transport — Nostr-style relays, dumb on purpose.** Clients publish signed entries to many **relays** that gossip them onward; blobs travel the same pipes. Anyone can run a relay; none is trusted. They can't forge an entry (it's signed), alter one (content-addressed), or hide one for long (mirrored). The trust lives in the cryptography, not the server.

**State — deterministic projections.** The raw log is a stream of events; useful questions ("their open goals? their live capabilities? their track record?") need current state, so clients **replay the log into a SQL projection** rebuilt by deterministic event-sourcing. Replay the same log, land on the same tables. The database is a cache; the log is the source of record.

## The stream — real-time by default

Treat every log as a **real-time stream** — a live feed of one person's acts where the freshest entry *is* the present. **"Now" is simply the last entry that was sent**, whether that was a millisecond ago or an hour ago. There's no separate question of whether someone is "live": their most recent entry is their current state, and how fresh it is is a fact anyone reads straight off the log.

Latency should be as small as the world allows. Tech will sometimes widen it (a flaky link, a batched upload), but that changes only the *fidelity* of the stream, never the *model* — a 1 ms feed and an hourly one are the same object at different resolutions, exactly as a live video and a once-a-day photo are. ^[video-rate](At the fast end each entry references a chunk blob — the blob rule, unchanged — so a live A/V stream and a once-a-day note are one object at different latencies.)

Two guarantees and one honest limit follow, all already paid for by witnessing — no new mechanism:

- **No rewrite, no hidden stretch.** A chain that later fails to extend a head the witnesses already cosigned is a detectable splice. The past is fixed the moment it's witnessed.
- **Staleness is readable, never hidden.** Go quiet and your "now" simply ages — a weak, uninformative stream, but not a violation; it's a visible fact. You can stop streaming; you can't make your last "now" look fresher than it is, because its time is the witnessed one, not a number you type.

:::callout
The honest limit: a real-time log proves you didn't **rewrite** or **hide a stretch of** your timeline, and it makes acted-upon facts visible as they happen. It can't force you to stream a private fact no one else can see or refer to. The guarantee is **continuity and a readable now**, not omniscient completeness.
:::

## Personhood — one human, one root

Free keypairs are the protocol's strength and its hole. Strength: no registrar, no permission. Hole: if a reputation is just a key, then a key can be **farmed** (a thousand sock puppets), **sold** (hand a buyer your spotless history), or **lost** (and with it your whole track record). The fix is a single binding done once: **one human, one root identity.**

A **personhood** entry binds a genesis key to a unique person — not by publishing who they are, but by proving they are *one and only one* of them.

- **Attested, not minted.** Personhood is issued by independent **verifiers** — KYC providers, institutions, or in-person webs — each publishing a signed, revocable attestation. No single verifier owns the gate; a corrupt or sloppy verifier's attestations lose weight and get revoked like any other claim. ^[n1 personhood](The n1 verifier network is one such issuer — a "super-KYC" an applicant clears once. An issuer competing on reputation inside the protocol, not an owner of it.)
- **Unique without doxxing.** A verifier derives a **nullifier** from a strong deduplicating anchor (a government-ID or biometric template) such that the *same human cannot obtain two distinct roots* — the nullifier would collide — while the raw document is **never published**. What lands on the log is a ^[zero-knowledge proof](zk-KYC / proof-of-personhood: prove "a recognized verifier confirmed a unique human who holds no other root" without revealing the human's documents. World-ID and BrightID-style nullifiers are the same idea.) that a unique, verified person stands behind this key.
- **The key is replaceable; the person is not.** Lose your key, or have it stolen, and you **re-attest personhood to a fresh key**: the verifier confirms the same person, the old key is revoked on the log, and the new key chains to the same personhood anchor. Your *person's* continuity survives a key change — the mechanism "social recovery" always implied.

This one binding closes three holes at once:

- **Sybil is dead at the root.** A thousand keypairs can't even *acquire* personhood, so they never enter the personhood-weighted scoring. One human, one root.
- **Reputation is non-transferable.** Selling your key hands over signing power but not your *person*: the buyer can't re-attest as you, and the moment they must refresh personhood the transfer is exposed.
- **Type-flow can't be sock-puppeted.** The "live shape" score (see *Types are entries too*) weights references by distinct verified persons, so a malicious type can't be voted real by an army of empty keys.

:::callout
The honest limit: personhood is only as sound as its verifiers. It **collapses Sybil and key-sale**, but a fully verified human who is **coerced or who colludes** is still one real person doing real harm. Personhood bounds the *number* of bad actors to the number of bad humans; it doesn't make humans good. That is the right job for it, and the only one it can do.
:::

## Types are entries too

A protocol that freezes its schema dies the day the world needs a shape it didn't foresee — and a protocol owned by no one has no committee to add that shape. So the type system obeys the same primitive: **a type is just another entry.**

To define a type, publish a `type` entry — a signed, content-addressed schema naming the fields. That's the whole ceremony: no approval, no version handshake. Anyone mints a type the moment they need one; if it's useful, others reference it; if not, it sits inert and costs nothing. Because a type is content-addressed, **the hash is the version** — editing a schema mints a new type with a new id, so there are no `v1`/`v2` naming wars. The readable name (`agreement`) lives only in `body.name` as a label clients display, never something an entry references.

- **Don't mutate — supersede.** When a shape must evolve, publish a new type that declares `supersedes: <old-id>` and ships a **migration**. Old entries stay valid forever; new entries flow into the new type; readers follow the supersedes-chain to the live shape.
- **Migrations are deterministic — and honest about their limits.** A migration is a pure function in a **restricted, sandboxed expression language** (no clock, locale, or network; fixed numeric and ordering semantics) so every client replaying it lands on byte-identical tables. The trivial map (`rename(due → deadline)`) is the easy case; the hard cases are handled, not hidden. A migration must be **total** over the old schema: where information is lost or a field can't be derived, it maps to an explicit `partial`/`unmapped` marker that stays visible downstream, never a silent guess. And where a field's *meaning* shifts — which no pure map can express — the type **supersedes without auto-migration**: old entries keep their shape, flagged as needing re-statement until a fresh entry by the author or an oracle correction reconciles them. The protocol refuses to fabricate a migration it can't compute. Because the migration ships *inside* the superseding type, any client projects an old entry into the newest view automatically — the same result for everyone, never a handshake two parties negotiate first.
- **Switching costs one field.** To move to a better type, set `type: <new-id>` on your next entry. Unilateral and per-entry — no flag day, no consumer to break, no lock-in.
- **"Live" is computed, not declared.** Every client walks the `supersedes` DAG to the tip — the canonical shape. When a fork leaves two tips, they're ranked by a **flow score** anyone recomputes from the log: references inside a trailing window, weighted by **distinct personhood-verified authors** and by the matchers indexing them, with older references decayed out. Because authors are personhood-bound, the ranking can't be inflated by sock puppets — everyone replays the same log and derives the same referee-free ranking.
- **Stock can't win.** Because the score is windowed and decayed, a million inert legacy entries contribute ≈0; only present flow counts. A type stops being "the real one" the moment new entries stop choosing it.
- **Deprecation and re-convergence are entries too.** A type carries `status: deprecated` and a `successor`, so clients flag dated data and point at the replacement. A fork re-merges when someone publishes a type that `supersedes` both tips with a migration from each. The graph converges on the best shape and stays fully auditable, because every edge is a signed entry.

**The current core set** — common today, expected to drift, and that's the point:

`identity` · `type` · `personhood` · `mission` · `goal` · `plan` · `decision` · `task` · `agreement` · `transaction` · `problem` · `calendar_event` · `connection` · `attestation` · `oracle` · `correction`

There is deliberately no `media` type: a file of any kind attaches to *any* entry as `{ hash, mime, size, name }`. Below is the `type` entry that defines the `agreement` shape the sample above referenced — its id is `blake3:c4d2…e8`, the value that entry's `type` field names, and its own `type` points at the ^[genesis type](The one self-describing schema — it defines what a `type` entry looks like. Every other type descends from it.):

```json
{
  "type": "blake3:0000…01",
  "author": "blake3:1f90…a1",
  "prev": "blake3:1a44…b2",
  "ts": "2026-06-13T09:20:00Z",
  "body": {
    "name": "agreement",
    "schema": { "with": "id", "commit": "string", "terms_hash": "hash", "deadline": "date" },
    "supersedes": ["blake3:a019…7f"],
    "migration": "rename(due → deadline); default(deadline, commit_ts)",
    "status": "active"
  },
  "sig": "ed25519:3a77…ff"
}
```

## Oracle Intelligence — accuracy, not verdicts

A signed, unbroken, streamed log proves one thing exactly: that you **said** this and never **un-said** it. It does not make the account **accurate** — I can stream `"shipped v1 API"` and have shipped nothing. A faithful record of what was *said* is not an accurate picture of what *happened*, and no append-only structure closes that gap on its own.

So the protocol takes a deliberately humble stance: **there is no "true" or "false" here — only more accurate and less accurate.** Every account is a model, and models get refined. No one counter-signs your data, and nothing is ever stamped false. Instead:

- **Every entry stands as given** — the author's account, taken as-is, the starting point and not a claim awaiting approval.
- **Any oracle can make it more accurate.** An `oracle` is a participant who checks accounts against other sources — a release against the repo, a payment against the chain, a registration against the registry. Anyone can run one; like everyone, it's personhood-bound and carries a reputation. To improve an account it publishes a `correction`: a more-accurate revision of a target entry, with its evidence. The correction rides alongside the entry forever — nothing is deleted, nothing branded false. The record of any fact is the original account *plus* the corrections layered on it, each weighted by the standing of its source.
- **AI oracles refine the stream continuously.** Because the record is open and real-time, machines surface where an account drifts from its sources: internal tension (the stream says X, then not-X), cross-source gaps (the account against the registry it should match), and acts other records refer to that this stream never carried.
- **Disagreement is just more accuracy.** Two oracles offering different corrections isn't "who's right" — it's competing refinements, weighted by evidence and by each oracle's own track record. Correct accurately and your standing rises; correct carelessly and it falls. There's no referee because there's no verdict to hand down — only the most accurate picture the evidence currently supports.

:::callout
The honest stance: the log makes **tampering impossible to hide**, and Oracle Intelligence makes an account **steadily more accurate** as evidence accrues — but an account no one can check and no one refines simply stands at the author's word. That's the price of trading "true/false" for "more or less accurate": maximal openness and no proving-ceremony, with accuracy treated as something that converges, never something stamped.
:::

## Prior art — borrowed parts, a new whole

Almost every *part* of this protocol already exists. Pretending otherwise is the fastest way to be dismissed; the contribution is the **synthesis and the scoped epistemics**, not any single primitive.

- **Secure Scuttlebutt** — signed, append-only, per-identity hash chains, content-addressed messages, gossip replication. This is most of *the entry* and *transport*. Lacks: a transparency log (so it can't stop equivocation), a real-time stream model, personhood, and any accuracy layer.
- **Certificate Transparency / Trillian** — a verifiable append-only Merkle log, signed tree heads, witness gossip, split-view prevention. Borrowed wholesale for *the log*. Carries no identity, behavioral, or economic semantics.
- **Nostr** — dumb signed-event relays anyone can run. Borrowed for *transport*. No integrity log, no chain of custody beyond a single signature.
- **W3C DIDs & Verifiable Credentials** — keypair-as-identity and counter-signed attestations. The shape of *identity* and *attestation*. No append-only behavioral stream, no continuous witnessing.
- **PGP web-of-trust / EigenTrust** — trust derived from an attestation graph. The ancestor of *smart trust*. Declarative graphs over *who vouches for whom*, with no behavioral record to compute integrity or results from.
- **Proof-of-personhood — World ID, BrightID, zk-KYC** — unique-human binding via nullifiers and zero-knowledge proofs. Borrowed directly for *personhood*.
- **Decentralized oracle networks — Chainlink, UMA's optimistic oracle, Kleros** — external facts brought on-chain, disputes adjudicated by escalation and slashing. Borrowed for *Oracle Intelligence*.
- **On-chain reputation systems** — non-transferable reputation as a primitive. The same goal, but paid for with the global consensus this protocol deliberately avoids: no chain, no token, witnessed logs instead.

What is **new** is the combination none of them is: a **continuous, personhood-anchored behavioral log whose accounts are refined by open oracle corrections** — credibility read as *vectors* over the record, never a single score — with the honest scoping that the log is exact while accuracy only ever converges.

## What you can verify — the four cores

Anyone can read four ^[cores of credibility](Covey's Four Cores. Two ask *can I trust your character*, two ask *can I trust your competence*. Trust needs all four.) off a participant, without taking their word for it. Each is **computed from the record**, and each is a **vector, not a single score** — you read the *shape* of someone's character and competence, never a grade stamped on them.

**Character — the roots: your motives and your moral compass.**

- **Integrity** *(honesty and congruence)* → the **divergence between what you committed to and what the record shows you did**, over time, sharpened wherever oracle corrections show word and deed came apart.
- **Intent** *(motives and agenda)* → read from your **published goals**, and whether your recorded actions actually serve the other side.

**Competence — the branches: the skills that turn intent into results.**

- **Capabilities** *(skills, talents, resources)* → your **recorded skills and resources, plus demonstrated work**, sharpened by any oracle correction.
- **Results** *(track record)* → your **portfolio of outcomes** — shipped work, completed deals and transactions, problems solved or not — read straight from the closed record. Not a promise-tally (word-versus-deed is Integrity's job); this is the body of work itself, as a vector.

None of these is a badge you grant yourself. They are vectors over an open log — read as given, and refined toward accuracy by oracle corrections.

## How you verify — four checks

Trust here means *checking*, and the check is fast. To verify any claim a participant makes, anyone runs four steps:

1. **Signature** — the entry verifies against the identity's public key (resolved from the author's genesis entry). *It's really theirs.*
2. **Chain & continuity** — its `prev` resolves and the per-identity hash chain is unbroken back to genesis and continuous up to the latest entry, the present. *Nothing was spliced out, and no stretch was hidden.*
3. **Inclusion** — a Merkle inclusion proof shows the entry sits in a witness-cosigned tree head. *It's part of the one shared history, at a real position in time.*
4. **Replay** — project the relevant entries to reconstruct the current state and the derived core vectors. *The account matches the record.*

Any attempt to edit history breaks step 2 *and* invalidates step 3 — loudly, not quietly. But these four answer one question only: *is this record authentic and untampered?* They do **not** answer *is the account accurate?* — that is the separate job of Oracle Intelligence. The log is exact and decidable; accuracy is a separate, ever-refining matter for oracle corrections, never a true/false stamp.

## Derived — matching

With the data open, machines do the matching. Goals, capabilities, and constraints are published as structured **goal vectors** — typed, machine-readable fields, not prose. Anyone can run a **matcher**: an indexer that reads vectors across the network and surfaces deals where every side comes out ahead, continuously and in real time. Because the data is open, there is no central matchmaker to capture or corrupt; matchers compete on quality.

**Smart trust is downstream, and not part of this protocol — yet.** ^[Smart Trust](Covey's term: judgment that extends trust deliberately to *minimize risk and maximize possibilities* — see franklincovey.co.uk/solutions/smart-trust. Not a stored number.) Deciding how far to extend for one *specific* action is a real-time computation a client runs over this record for the case at hand, weighing the core vectors and corrections against what's at stake. It is not a score the protocol stores or hands out. The protocol's only job is to make the record that judgment draws on cheap to read and impossible to fake; the judgment itself stays with whoever is deciding.

## Time-locked, not secret

Total exposure of every byte the instant it exists isn't always possible — an unannounced deal can't be shouted before it's signed. But permanent hiding (encrypting bodies to a chosen few *forever*, shredding keys to erase content) **breaks the very thesis**: if anything can stay permanently hidden, the deceptive simply hide the incriminating part, and a log full of permanent secrets carries no signal. So the protocol keeps exactly one tool, and it hides nothing permanently:

- **Delay, then reveal — never conceal.** Publish an entry's hash now; reveal its body when the time is right. Timestamp and ordering lock in immediately — you can later prove *what* you committed to and *when*, with no backdating — and the body **always becomes public on its timer**. A "seal" is a **countdown, not a vault**: it buys time, never secrecy.

:::callout
The corollary: **you cannot keep a permanent secret on this log.** You can delay disclosure; you cannot escape it. Every body reveals — so there is no permanent dark place for the deceptive to file the thing they don't want checked.
:::

Third-party data follows from the same stance: you log *your* side, a counterparty logs *theirs*, and neither writes the other's secrets into a place that never opens. Radical openness is the design, and delay — not concealment — is its only concession.

## Threat model

Every attack runs into a mechanism already built above, not a new defense:

| Attack | What stops it |
|---|---|
| **Key compromise** | Rotation and revocation are log entries chaining from the genesis id, and **personhood re-attestation** rebinds the identity to a fresh key. The theft is visible, the person recovers, and the stolen key is revoked — not silently inherited. |
| **Self-serving or inaccurate account** | Any oracle publishes an evidence-backed **correction**; account and corrections sit side by side on the record forever. Inaccuracy is out-weighed by better-sourced corrections, never erased or branded. |
| **Split view / equivocation** | Witnesses cosign and gossip tree heads, and entries are witnessed as the stream arrives, so no interval exists in which two histories could both survive. |
| **Relay censorship or outage** | Entries and blobs are content-addressed and mirrored across many relays; drop one and the rest still serve it. |
| **Sybil identities** | Keypairs are free, but **personhood is one-per-human**: fresh keys can't acquire it, so they're zeros that never enter the scoring. Track record is bound to a person — so non-transferable. |
| **Backdating** | An entry's authoritative time is the **witnessed interval** between the cosigned heads that bracket it; a "past" entry slipped in after the fact lands in the wrong interval and is caught. |

## The behaviors it makes default

Under an open log, the trustworthy way to act is also the cheapest. These stop being aspirations and become the path of least resistance:

- **Talk straight** — call things what they are; no spin, no withheld facts.
- **Create transparency** — lean toward disclosure; be verifiable, not just believable.
- **Demonstrate respect** — care without hidden motive.
- **Confront reality** — take on the undiscussables instead of routing around them.
- **Clarify expectations** — state and validate them up front.
- **Practice accountability** — hold yourself to account first; own the result.
- **Right wrongs** — fix mistakes fast, and make real restitution.
- **Keep commitments** — say it, then do it. Make the promise the unit of honor.
- **Deliver results** — build a track record, not a reputation.
- **Get better** — upgrade capabilities; hunt feedback.
- **Listen first** — understand before you answer.
- **Show loyalty** — give credit freely; speak of people as if present.
- **Extend trust** — move from suspicion to trust, calibrated to the record.

## Why it works alone

You don't need the world to adopt this first. A public, append-only commitment is a **costly, irreversible signal** — ^[you go first](Cortés burned his ships. We just publish ours.) and the asymmetry pays you back: defection is now permanently recorded, so lying gets expensive while honesty compounds. Each participant who joins gets stronger and exposes no new vulnerability. One protocol, more influential than the internet: no one owns it, everyone reads it.

When integrity is cheap to verify and deception is expensive to sustain, the consequences compound:

- **Fair competition.** You win on merit or not at all.
- **Zero corruption.** Nowhere left to hide it.
- **Deception goes bankrupt.** Expensive to run, short-lived, dangerous to attempt.
- **Fewer civilizational mistakes.** The species checks its work.

:::callout
Lying goes bankrupt — and win-win becomes the only game worth playing.
:::

---

Based on the ideas at [n1.community](https://n1.community).

Example of a third-party client connected to the protocol: [Wireframes](https://api.anthropic.com/v1/design/h/0MaVkmRibRYzBIDTGnZFug?open_file=Wireframes.dc.html) — one page holding a whole life, where every record shares the single entry shape: *when · type · what · source*.
