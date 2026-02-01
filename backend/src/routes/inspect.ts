import { spawn } from "child_process";
import { writeFileSync, unlinkSync, existsSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { Router } from "express";
import multer from "multer";
import { runObjectDetection } from "../services/cvLayer.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
// backend/src/routes -> backend/src -> backend -> repo root (3 levels)
const PROJECT_ROOT = resolve(__dirname, "..", "..", "..");
/** Stored inspection images: backend/data/inspections/<inspection_id>/0.jpg, 1.jpg, ... */
const DATA_DIR = resolve(__dirname, "..", "..", "data", "inspections");
import { decodeComponents } from "../services/gemini.js";
import { evaluateRules } from "../services/ruleEngine.js";
import {
  createEvidenceBundle,
  hashBuffer,
  hashObject,
  getBundleHash,
} from "../services/evidence.js";
import { writeInspectionToChain } from "../services/solana.js";
import { verifyWalletSignature } from "../services/auth.js";
import { saveInspection, getInspection, getAllInspections } from "../services/store.js";
import type { GeminiComponent } from "../types.js";

const router = Router();

/** Derive Solana cluster from RPC URL for explorer links (devnet tx needs ?cluster=devnet). */
function getSolanaCluster(): string | null {
  const rpc = (process.env.SOLANA_RPC_URL ?? "").toLowerCase();
  if (rpc.includes("devnet")) return "devnet";
  if (rpc.includes("testnet")) return "testnet";
  return null; // mainnet = default, no param needed
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

/** Lightweight endpoint for live detection overlay: returns bbox + label only (no Gemini). */
router.post("/detect", upload.single("image"), async (req, res) => {
  try {
    const file = req.file;
    if (!file?.buffer) {
      return res.status(400).json({ error: "No image provided" });
    }
    const detections = await runObjectDetection([file.buffer]);
    res.json({
      detections: detections.map((d) => ({
        label: d.label,
        confidence: d.confidence,
        bbox: d.bbox,
      })),
    });
  } catch (err) {
    console.error("Detect error:", err);
    res.status(500).json({ error: "Detection failed" });
  }
});

/** Live wheel detection using trained YOLO model (scripts/run_wheel_detect.py). */
router.post("/detect-wheel", upload.single("image"), async (req, res) => {
  let tempPath: string | null = null;
  try {
    const file = req.file;
    if (!file?.buffer) {
      return res.status(400).json({ error: "No image provided" });
    }
    tempPath = join(tmpdir(), `wheel-${Date.now()}.jpg`);
    writeFileSync(tempPath, file.buffer);
    const scriptPath = join(PROJECT_ROOT, "scripts", "run_wheel_detect.py");
    const modelPath = join(PROJECT_ROOT, "runs", "detect", "wheel", "weights", "best.pt");
    if (!existsSync(scriptPath) || !existsSync(modelPath)) {
      return res.status(503).json({
        error: "Wheel model not found. Run: python scripts/train_wheel.py",
        detections: [],
      });
    }
    const confParam = req.query.conf != null ? Number(req.query.conf) : 0.08;
    const conf = Math.max(0.01, Math.min(0.95, Number.isFinite(confParam) ? confParam : 0.08));
    const detections = await new Promise<Array<{ label: string; confidence: number; bbox: number[] }>>((resolve, reject) => {
      const proc = spawn("python3", [scriptPath, tempPath!, modelPath, "--conf", String(conf)], {
        cwd: PROJECT_ROOT,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdout = "";
      let stderr = "";
      proc.stdout?.on("data", (d) => { stdout += d; });
      proc.stderr?.on("data", (d) => { stderr += d; });
      proc.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(stderr || "Python script failed"));
          return;
        }
        try {
          resolve(JSON.parse(stdout.trim()) as Array<{ label: string; confidence: number; bbox: number[] }>);
        } catch {
          resolve([]);
        }
      });
      proc.on("error", reject);
    });
    res.json({ detections });
  } catch (err) {
    console.error("Detect-wheel error:", err);
    res.status(500).json({ error: "Wheel detection failed", detections: [] });
  } finally {
    if (tempPath && existsSync(tempPath)) {
      try {
        unlinkSync(tempPath);
      } catch {}
    }
  }
});

router.post("/analyze", upload.array("images", 10), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files?.length) {
      return res.status(400).json({ error: "No images provided" });
    }

    const buffers = files.map((f) => f.buffer);
    const imageHash = hashBuffer(Buffer.concat(buffers));

    const detections = await runObjectDetection(buffers);
    const components = await decodeComponents(
      detections,
      process.env.GEMINI_API_KEY ?? ""
    );
    const ruleResult = evaluateRules(components);
    const analysisHash = hashObject({ components, ruleResult });

    res.json({
      detections: detections.map((d) => ({
        label: d.label,
        confidence: d.confidence,
        bbox: d.bbox,
      })),
      components,
      result: ruleResult,
      image_hash: imageHash,
      analysis_hash: analysisHash,
    });
  } catch (err) {
    console.error("Analyze error:", err);
    res.status(500).json({ error: "Analysis failed" });
  }
});

router.post(
  "/finalize",
  upload.fields([{ name: "images", maxCount: 10 }]),
  async (req, res) => {
    try {
      const files = req.files as { payload?: Express.Multer.File[]; images?: Express.Multer.File[] } | undefined;
      const images = files?.images ?? [];
      let payload: Record<string, unknown>;
      try {
        const payloadRaw = (req.body as { payload?: string }).payload ?? req.body;
        if (typeof payloadRaw === "string") {
          payload = JSON.parse(payloadRaw) as Record<string, unknown>;
        } else {
          payload = payloadRaw as Record<string, unknown>;
        }
      } catch {
        return res.status(400).json({ error: "Invalid payload. Send JSON as payload field or body." });
      }

      const {
        robotId,
        components,
        result,
        violations,
        image_hash,
        analysis_hash,
        wallet_address,
        signature,
        signed_message,
        demo_mode,
      } = payload;

      const demoBypass = process.env.DEMO_MODE === "true" && demo_mode === true;

      if (!demoBypass) {
        if (!wallet_address || !signature || !signed_message) {
          return res
            .status(401)
            .json({
              error: "Wallet signature required. Connect wallet and sign.",
            });
        }

        if (!verifyWalletSignature(String(signed_message), String(signature), String(wallet_address))) {
          return res
            .status(401)
            .json({ error: "Invalid signature. Please sign again." });
      }
    }

    const judgeWallet = demoBypass ? "demo-placeholder" : String(payload.wallet_address ?? "");

    const imageHash = (payload.image_hash as string) ?? "0x0";
    const analysisHash =
      (payload.analysis_hash as string) ?? hashObject({ components: payload.components, result: payload.result, violations: payload.violations });

    const inspectionId = `INS-2026-${String(
      Math.floor(Math.random() * 10000)
    ).padStart(4, "0")}`;

    // Store evidence images alongside inspection
    const imageCount = images.length;
    if (imageCount > 0) {
      const inspectionDir = join(DATA_DIR, inspectionId);
      mkdirSync(inspectionDir, { recursive: true });
      images.forEach((file, i) => {
        if (file.buffer) {
          writeFileSync(join(inspectionDir, `${i}.jpg`), file.buffer);
        }
      });
    }

    const bundle = createEvidenceBundle(
      inspectionId,
      String(payload.robotId ?? "UNKNOWN"),
      (payload.result as "PASS" | "FAIL") ?? "PASS",
      Array.isArray(payload.violations) ? payload.violations : [],
      (Array.isArray(payload.components) ? payload.components : []) as GeminiComponent[],
      imageHash,
      analysisHash
    );
    const evidenceHash = getBundleHash(bundle);

    // Solana on-chain write is required
    const solanaRpc = process.env.SOLANA_RPC_URL?.trim();
    const solanaKey = process.env.SOLANA_PRIVATE_KEY?.trim();
    if (!solanaRpc || !solanaKey) {
      return res.status(503).json({
        error: "Solana not configured. Set SOLANA_RPC_URL and SOLANA_PRIVATE_KEY in backend/.env (see README).",
      });
    }

    const { txSignature: solanaTxSig, encrypted: encryptedOnChain } =
      await writeInspectionToChain(
        inspectionId,
        String(payload.robotId ?? "UNKNOWN"),
        (payload.result as "PASS" | "FAIL") ?? "PASS",
        evidenceHash,
        solanaRpc,
        solanaKey
      );

    if (!solanaTxSig) {
      return res.status(503).json({
        error: "On-chain write failed. Check SOLANA_RPC_URL, SOLANA_PRIVATE_KEY, and RPC/network.",
      });
    }

    const record = {
      inspection_id: inspectionId,
      robot_id: String(payload.robotId ?? "UNKNOWN"),
      result: (payload.result as "PASS" | "FAIL") ?? "PASS",
      violations: Array.isArray(payload.violations) ? payload.violations : [],
      components: (Array.isArray(payload.components)
        ? payload.components
        : []) as GeminiComponent[],
      evidence_hash: evidenceHash,
      judge_wallet: judgeWallet,
      solana_tx: solanaTxSig ?? undefined,
      encrypted_on_chain: encryptedOnChain,
      image_count: imageCount,
      timestamp: Math.floor(Date.now() / 1000),
    };
    saveInspection(record);

    res.json({
      inspection_id: inspectionId,
      evidence_hash: evidenceHash,
      solana_tx: solanaTxSig,
      encrypted_on_chain: encryptedOnChain,
      image_count: imageCount,
      qr_data: `https://inspect.utrahacks.dev/verify/${inspectionId}`,
    });
  } catch (err) {
    console.error("Finalize error:", err);
    res.status(500).json({ error: "Finalization failed" });
  }
});

/** Config for frontend (Solana cluster for explorer links). */
router.get("/config", (req, res) => {
  res.json({ solana_cluster: getSolanaCluster() });
});

/** List all saved inspections (newest first) for bot security tracking / verified list. */
router.get("/list", (req, res) => {
  const list = getAllInspections();
  const cluster = getSolanaCluster();
  const augmented = list.map((r) => ({ ...r, solana_cluster: cluster }));
  res.json(augmented);
});

router.get("/verify/:id", (req, res) => {
  const record = getInspection(req.params.id);
  if (!record) {
    return res.status(404).json({ error: "Inspection not found" });
  }
  const cluster = getSolanaCluster();
  res.json({ ...record, solana_cluster: cluster });
});

/** Serve stored evidence image for an inspection (0-indexed). */
router.get("/evidence/:inspectionId/:index", (req, res) => {
  const { inspectionId, index } = req.params;
  const i = parseInt(index, 10);
  if (!inspectionId || !Number.isFinite(i) || i < 0) {
    return res.status(400).send("Invalid inspection id or index");
  }
  const record = getInspection(inspectionId);
  if (!record) {
    return res.status(404).send("Inspection not found");
  }
  const count = record.image_count ?? 0;
  if (i >= count) {
    return res.status(404).send("Image not found");
  }
  const path = join(DATA_DIR, inspectionId, `${i}.jpg`);
  if (!existsSync(path)) {
    return res.status(404).send("Image file not found");
  }
  const buf = readFileSync(path);
  res.setHeader("Content-Type", "image/jpeg");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(buf);
});

export default router;
