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

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment variables:**
   ```bash
   cp frontend/.env.example frontend/.env.local
   cp backend/.env.example backend/.env
   ```

   - **frontend/.env.local**: `NEXT_PUBLIC_API_URL=http://localhost:4000`
   - **backend/.env**:
     - `GEMINI_API_KEY` – for component identification (optional; falls back to mock)
     - `SOLANA_RPC_URL` + `SOLANA_PRIVATE_KEY` – for on-chain writes (optional)

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
