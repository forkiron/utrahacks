import { spawn } from "child_process";
import { writeFileSync, unlinkSync, existsSync } from "fs";
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
import { saveInspection, getInspection } from "../services/store.js";
import type { GeminiComponent } from "../types.js";

const router = Router();
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

router.post("/finalize", upload.none(), async (req, res) => {
  try {
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
    } = req.body;

    const demoBypass = process.env.DEMO_MODE === "true" && demo_mode === true;

    if (!demoBypass) {
      if (!wallet_address || !signature || !signed_message) {
        return res
          .status(401)
          .json({
            error: "Wallet signature required. Connect wallet and sign.",
          });
      }

      if (!verifyWalletSignature(signed_message, signature, wallet_address)) {
        return res
          .status(401)
          .json({ error: "Invalid signature. Please sign again." });
      }
    }

    const judgeWallet = demoBypass ? "demo-placeholder" : wallet_address;

    const imageHash = image_hash ?? "0x0";
    const analysisHash =
      analysis_hash ?? hashObject({ components, result, violations });

    const inspectionId = `INS-2026-${String(
      Math.floor(Math.random() * 10000)
    ).padStart(4, "0")}`;
    const bundle = createEvidenceBundle(
      inspectionId,
      robotId ?? "UNKNOWN",
      result ?? "PASS",
      Array.isArray(violations) ? violations : [],
      (Array.isArray(components) ? components : []) as GeminiComponent[],
      imageHash,
      analysisHash
    );
    const evidenceHash = getBundleHash(bundle);

    const { txSignature: solanaTxSig, encrypted: encryptedOnChain } =
      await writeInspectionToChain(
        inspectionId,
        robotId ?? "UNKNOWN",
        result ?? "PASS",
        evidenceHash,
        process.env.SOLANA_RPC_URL ?? "",
        process.env.SOLANA_PRIVATE_KEY
      );

    const record = {
      inspection_id: inspectionId,
      robot_id: robotId ?? "UNKNOWN",
      result: result ?? "PASS",
      violations: Array.isArray(violations) ? violations : [],
      components: (Array.isArray(components)
        ? components
        : []) as GeminiComponent[],
      evidence_hash: evidenceHash,
      judge_wallet: judgeWallet,
      solana_tx: solanaTxSig ?? undefined,
      encrypted_on_chain: encryptedOnChain,
      timestamp: Math.floor(Date.now() / 1000),
    };
    saveInspection(record);

    res.json({
      inspection_id: inspectionId,
      evidence_hash: evidenceHash,
      solana_tx: solanaTxSig,
      encrypted_on_chain: encryptedOnChain,
      qr_data: `https://inspect.utrahacks.dev/verify/${inspectionId}`,
    });
  } catch (err) {
    console.error("Finalize error:", err);
    res.status(500).json({ error: "Finalization failed" });
  }
});

router.get("/verify/:id", (req, res) => {
  const record = getInspection(req.params.id);
  if (!record) {
    return res.status(404).json({ error: "Inspection not found" });
  }
  res.json(record);
});

export default router;
