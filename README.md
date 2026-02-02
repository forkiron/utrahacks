# UtraHacks · Robot Inspection

AI-powered compliance verification for robotics competitions. Judges capture photos, the system detects components via CV + Gemini, runs deterministic rules, and writes results to Solana.

## Features

- **Inspection flow**: Capture 3–5 photos → Analyze (CV + Gemini) → Pass/Fail → Finalize on Solana
- **CV layer**: Object detection (motor, camera, lidar, control board, battery, sensor) with mock/heuristic for demo; swap in YOLOv8 for production
- **Gemini**: Component identification from cropped images
- **Rule engine**: Deterministic anti-cheat (e.g. max 2 motors, no cameras)
- **Evidence packaging**: Hashed bundle for trust
- **Solana**: Memo program for immutable inspection records
- **Verification dashboard**: Look up any inspection by ID

## Structure

```
├── frontend/
│   ├── app/
│   │   ├── inspect/        # Inspection flow
│   │   │   ├── CameraCapture.tsx
│   │   │   ├── ImagePreview.tsx
│   │   │   ├── AnalysisResults.tsx
│   │   │   └── FinalizeInspection.tsx
│   │   └── verify/         # Verification dashboard
│   └── ...
├── backend/
│   └── src/
│       ├── routes/inspect.ts
│       ├── services/
│       │   ├── cvLayer.ts      # Object detection
│       │   ├── gemini.ts       # Component decoding
│       │   ├── ruleEngine.ts   # Rule evaluation
│       │   ├── evidence.ts     # Evidence hashing
│       │   ├── solana.ts       # On-chain write
│       │   └── store.ts        # In-memory records
│       └── ...
└── package.json
```

## What you need to do

### 1. Install (one-time)

```bash
cd utrahacks
npm install
```

```bash
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

### 2. Solana on-chain setup (required for finalize)

Finalize writes the inspection memo to Solana. You **must** set these in `backend/.env`:

- **SOLANA_RPC_URL** – RPC endpoint (devnet or mainnet).
- **SOLANA_PRIVATE_KEY** – Base58 secret key of the wallet that pays for the tx.

**Steps:**

1. **Get an RPC URL** (pick one):
   - **Public devnet** (free, rate-limited):  
     `SOLANA_RPC_URL=https://api.devnet.solana.com`
   - **Helius / QuickNode / other** (free tier): sign up, create a devnet endpoint, copy the HTTPS URL.

2. **Get a keypair and private key (base58):**
   - **Option A – Solana CLI**
     ```bash
     # Install: https://docs.solana.com/cli/install-solana-cli-tools
     solana-keygen new
     # Copy the "Secret Key" (base58 string)
     solana airdrop 2   # devnet only; get SOL for fees
     ```
   - **Option B – Node one-liner** (from repo root, backend has deps):
     ```bash
     cd backend && node -e "const k=require('@solana/web3.js').Keypair.generate(); const b=require('bs58'); console.log('Private key (base58):', b.encode(k.secretKey)); console.log('Address (airdrop SOL here):', k.publicKey.toBase58());"
     ```
     Copy the private key into `SOLANA_PRIVATE_KEY`. On devnet, airdrop SOL to the printed address: `solana airdrop 2 <ADDRESS>` or use a faucet.

   Put the **base58 secret key** (one long string, no brackets) in:
   ```bash
   SOLANA_PRIVATE_KEY=your_base58_secret_key_here
   ```

3. **Edit `backend/.env`:**
   ```bash
   SOLANA_RPC_URL=https://api.devnet.solana.com
   SOLANA_PRIVATE_KEY=your_base58_secret_key_here
   ```

4. **Restart the backend** after changing `.env`.

If either var is missing or the on-chain write fails, finalize will return an error and tell you to check Solana config.

### 3. Run the app (every time)

**Terminal 1 – backend**

```bash
npm run dev:backend
```

**Terminal 2 – frontend**

```bash
npm run dev:frontend
```

Open **http://localhost:3000** → **Bot Security** or **Commentary**.

### 4. Use the checker flow (Bot Security)

1. Go to **Bot Security** (or `/inspect`).
2. **Start camera** or upload images → take 3–5 snapshots.
3. **Continue** → **Analyze** (constraints → PASS/FAIL).
4. Enter **Robot ID** → **Finalize Inspection** (writes memo to Solana, stores images).
5. Open **/verify/<inspection_id>** to see result, images, and Solana tx link.

---

## Setup (reference)

- **frontend/.env.local**: `NEXT_PUBLIC_API_URL=http://localhost:4000`
- **backend/.env**:
  - **SOLANA_RPC_URL** + **SOLANA_PRIVATE_KEY** – **required** for finalize (on-chain write).
  - `GEMINI_API_KEY` – optional; real component detection (else mock).
  - `ENCRYPTION_KEY` – optional; encrypt on-chain memo (32+ chars or 64 hex).
  - `DEMO_MODE=true` – finalize without wallet signature (default).

## Development

```bash
# Terminal 1 – Frontend
npm run dev:frontend

# Terminal 2 – Backend
npm run dev:backend
```

Open [http://localhost:3000](http://localhost:3000) → Start Inspection.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:frontend` | Next.js dev server |
| `npm run dev:backend` | Express + hot reload |
| `npm run build:frontend` | Build Next.js |
| `npm run build:backend` | Compile backend |
| `npm run build` | Build all |
# utrahacks
