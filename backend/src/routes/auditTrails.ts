import { Router } from "express";
import multer from "multer";
import crypto from "crypto";
import { createRateLimiter } from "../services/rateLimit.js";
import {
  insertAuditTrail,
  updateAuditTrail,
  getAuditTrail,
  listAuditTrailsByRunId,
} from "../services/db.js";
import { transcribeAudio } from "../services/audioProvider.js";
import type { AuditTrailSourceType } from "../types.js";

const router = Router();

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const MAX_TEXT_CHARS = 1000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

const rateLimit = createRateLimiter({ windowMs: 60_000, max: 30 });

const allowedSourceTypes: AuditTrailSourceType[] = [
  "judge_audio",
  "team_audio",
  "coach_audio",
  "uploaded_video_audio",
];

function isValidSourceType(value: string): value is AuditTrailSourceType {
  return allowedSourceTypes.includes(value as AuditTrailSourceType);
}

function parseTags(input: unknown): string[] | undefined {
  if (Array.isArray(input)) {
    return input.filter((t) => typeof t === "string");
  }
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return undefined;
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((t) => typeof t === "string");
      }
    } catch {
      return trimmed.split(",").map((t) => t.trim()).filter(Boolean);
    }
  }
  return undefined;
}

function decodeBase64Audio(
  audioBase64: string,
  mimeType?: string
): { buffer: Buffer; mimeType: string } {
  const cleaned = audioBase64.includes(",") ? audioBase64.split(",")[1] : audioBase64;
  const buffer = Buffer.from(cleaned, "base64");
  const inferredMime = audioBase64.startsWith("data:") ? audioBase64.slice(5, audioBase64.indexOf(";")) : "";
  return { buffer, mimeType: mimeType || inferredMime || "audio/wav" };
}

router.post("/transcribe", rateLimit, upload.single("audio"), async (req, res) => {
  let auditTrailId: string | undefined;
  try {
    const body = req.body as Record<string, unknown>;
    const runId = typeof body.runId === "string" ? body.runId.trim() : "";
    const sourceTypeRaw = typeof body.sourceType === "string" ? body.sourceType.trim() : "";
    const language = typeof body.language === "string" ? body.language.trim() : undefined;
    const tags = parseTags(body.tags);

    if (!runId) {
      return res.status(400).json({ error: "runId is required" });
    }
    if (!sourceTypeRaw || !isValidSourceType(sourceTypeRaw)) {
      return res.status(400).json({ error: "Invalid sourceType" });
    }
    const sourceType = sourceTypeRaw as AuditTrailSourceType;

    let audioBuffer: Buffer | undefined;
    let mimeType = "audio/wav";

    if (req.file?.buffer) {
      audioBuffer = req.file.buffer;
      mimeType = req.file.mimetype || mimeType;
    } else if (typeof body.audioBase64 === "string") {
      const decoded = decodeBase64Audio(body.audioBase64, typeof body.mimeType === "string" ? body.mimeType : undefined);
      audioBuffer = decoded.buffer;
      mimeType = decoded.mimeType;
    }

    if (!audioBuffer) {
      return res.status(400).json({ error: "Audio is required" });
    }
    if (audioBuffer.length > MAX_UPLOAD_BYTES) {
      return res.status(413).json({ error: "Audio exceeds 15MB limit" });
    }

    const sha256 = crypto.createHash("sha256").update(audioBuffer).digest("hex");

    const auditTrail = await insertAuditTrail({
      runId,
      sourceType,
      status: "processing",
      language,
      transcriptText: undefined,
      transcriptSegments: undefined,
      confidence: undefined,
      mock: false,
      tags,
      media: {
        mimeType,
        sizeBytes: audioBuffer.length,
        sha256,
      },
    });

    auditTrailId = auditTrail._id;

    const result = await transcribeAudio({
      audioBuffer,
      mimeType,
      language,
    });

    const updated = await updateAuditTrail(auditTrailId!, {
      status: "done",
      transcriptText: result.text,
      transcriptSegments: result.segments,
      confidence: result.confidence,
      mock: result.mock,
    });

    if (!updated) {
      return res.status(500).json({ error: "Failed to update audit trail" });
    }

    if (result.text.length > MAX_TEXT_CHARS) {
      updated.transcriptText = result.text.slice(0, MAX_TEXT_CHARS);
    }

    res.json({
      auditTrailId: updated._id,
      status: updated.status,
      transcriptText: updated.transcriptText,
      transcriptSegments: updated.transcriptSegments,
      confidence: updated.confidence,
      mock: updated.mock,
    });
  } catch (err) {
    if (auditTrailId) {
      await updateAuditTrail(auditTrailId, {
        status: "failed",
        error: (err as Error).message || "Transcription failed",
      });
    }
    res.status(500).json({ error: "Transcription failed" });
  }
});

router.get("/:id", rateLimit, async (req, res) => {
  const id = req.params.id;
  const doc = await getAuditTrail(id);
  if (!doc) {
    return res.status(404).json({ error: "Audit trail not found" });
  }
  res.json(doc);
});

router.get("/", rateLimit, async (req, res) => {
  const runId = typeof req.query.runId === "string" ? req.query.runId.trim() : "";
  if (!runId) {
    return res.status(400).json({ error: "runId query param is required" });
  }
  const docs = await listAuditTrailsByRunId(runId);
  res.json(docs);
});

export default router;
