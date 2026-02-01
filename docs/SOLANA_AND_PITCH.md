# Solana in Sentinel — What It Does, Why It’s There, and How to Pitch It

## What the Solana integration does

When a judge **finalizes an inspection** (after photos → AI analysis → pass/fail):

1. **Evidence bundle** is built: inspection ID, robot ID, result (PASS/FAIL), violations, components, image hash, analysis hash.
2. That bundle is **hashed** (SHA-256) into a single **evidence hash**.
3. A **Solana transaction** is sent using the **Memo program**: the memo stores a short record (inspection ID, robot ID, result, evidence hash). Optionally it’s **encrypted** on-chain if `ENCRYPTION_KEY` is set.
4. The **transaction signature** is saved with the inspection and returned to the frontend.
5. The **Verify** UI shows each inspection with a link to **Solana Explorer** (e.g. devnet) so anyone can see the tx and timestamp.

So in one sentence: **Solana is used to write an immutable, timestamped, publicly verifiable record of each inspection (key facts + evidence hash) so results can’t be faked or backdated.**

---

## Why it’s needed

- **Trust** — Judges and teams can prove “this pass/fail was recorded at this time” without trusting your server.
- **Non-repudiation** — Once the tx is on-chain, the result and evidence hash are tied to a blockchain timestamp; you can’t silently change history.
- **Auditability** — Organizers, sponsors, or appeals committees can check Solana Explorer and verify that an inspection exists and matches the evidence hash.
- **Lightweight** — Uses the Memo program (no custom program): one tx per inspection, low cost, works on devnet/mainnet.

Without Solana you’d only have your own database; with it you have a **neutral, verifiable anchor** for competition integrity.

---

## Use cases (how to describe it)

1. **Robot competition compliance** — Before/after inspections to verify bots meet rules (motors, sensors, etc.). Solana = “this bot was officially checked and passed/failed at this time.”
2. **Appeals and disputes** — Team claims “we were compliant.” Anyone can open the inspection in Verify, follow the Solana link, and see the on-chain record + evidence hash.
3. **Sponsor / regulator transparency** — “All inspections are recorded on a public ledger” is a strong integrity pitch.
4. **Historical record** — Even if your backend or DB is replaced, the chain still has the memo; the evidence hash ties back to your stored evidence bundle.

---

## How to pitch the whole thing (Sentinel + Solana)

### One-liner

**“Sentinel is an end-to-end competition management platform: we do inspection, verification, live commentary, and coaching for robot competitions, and we anchor every inspection result on Solana so it’s tamper-proof and verifiable by anyone.”**

### Short pitch (30 sec)

- **Problem:** Robot competitions need fair, fast compliance checks and a way to prove results weren’t faked or changed later.
- **What we built:** Sentinel — one platform for inspecting bots (photos + AI), verifying results, running live commentary, and coaching. When a judge finalizes an inspection, we write a record to **Solana** (inspection ID, robot ID, pass/fail, evidence hash). That gives you a public, timestamped, immutable proof that “this bot was checked and this was the result.”
- **Why Solana:** Low cost, fast finality, simple Memo program — no custom smart contracts. Organizers and teams can verify any inspection on Solana Explorer; the evidence hash links the on-chain record to the actual photos and AI analysis we store.

### Bullet points for slides or deck

- **End-to-end platform:** Inspect → Verify → Commentary → Coach.
- **AI-powered inspection:** Photos + CV + Gemini → pass/fail against rules.
- **On-chain proof:** Every finalized inspection is written to Solana (Memo); tx link in Verify.
- **Evidence integrity:** Evidence bundle is hashed; the hash is on-chain so results are tied to the real evidence.
- **Use cases:** Compliance checks, appeals, sponsor/regulator transparency, historical record.

### If someone says “Why blockchain?”

- **“We need a neutral, append-only record that we don’t control.”** Our DB can be rebuilt or migrated; the chain stays. Judges and teams don’t have to trust our server alone.
- **“Why Solana?”** Cheap, fast, and we only need a memo (no custom program). Perfect for “write once, verify forever” inspection records.

---

## Technical summary (for devs / judges)

- **When:** On “Finalize Inspection” (after analysis and optional wallet sign).
- **What’s written:** Memo containing `inspectionId`, `robotId`, `result`, `evidenceHash` (and optionally encrypted).
- **Where:** Solana (devnet or mainnet via `SOLANA_RPC_URL`); Memo program.
- **What’s stored in our app:** Inspection record + `solana_tx` (signature); Verify page links to `explorer.solana.com/tx/<sig>`.
- **Config:** `SOLANA_RPC_URL`, `SOLANA_PRIVATE_KEY` in backend `.env`; optional `ENCRYPTION_KEY` for encrypted memos.
