import { Router } from "express";
import multer from "multer";
import { createRateLimiter } from "../services/rateLimit.js";
import { insertAudioJob, updateAudioJob } from "../services/db.js";
import { tts, sfx, dub } from "../services/audioProvider.js";
import { isValidVoiceProfile } from "../services/voiceProfiles.js";

const router = Router();

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const MAX_TEXT_CHARS = 1000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

const rateLimit = createRateLimiter({ windowMs: 60_000, max: 30 });

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

router.post("/tts", rateLimit, async (req, res) => {
  let jobId: string | undefined;
  try {
    const body = req.body as Record<string, unknown>;
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const voiceProfile = typeof body.voiceProfile === "string" ? body.voiceProfile.trim() : "";
    const language = typeof body.language === "string" ? body.language.trim() : undefined;
    const tags = parseTags(body.tags);
    const runId = typeof body.runId === "string" ? body.runId.trim() : undefined;

    if (!text) {
      return res.status(400).json({ error: "text is required" });
    }
    if (text.length > MAX_TEXT_CHARS) {
      return res.status(400).json({ error: "text exceeds 1000 characters" });
    }
    if (!voiceProfile || !isValidVoiceProfile(voiceProfile)) {
      return res.status(400).json({ error: "Invalid voiceProfile" });
    }

    const job = await insertAudioJob({
      jobType: "tts",
      status: "processing",
      language,
      voiceProfile,
      inputText: text,
      inputMeta: runId ? { runId } : undefined,
      output: undefined,
      mock: false,
      tags,
    });
    jobId = job._id;

    const result = await tts({ text, voiceProfile, language });
    const updated = await updateAudioJob(jobId!, {
      status: "done",
      output: { audioBase64: result.audioBase64, mimeType: result.mimeType },
      mock: result.mock,
    });

    if (!updated) {
      return res.status(500).json({ error: "Failed to update audio job" });
    }

    res.json({
      jobId: updated._id,
      status: updated.status,
      audioBase64: updated.output?.audioBase64,
      mimeType: updated.output?.mimeType,
      mock: updated.mock,
    });
  } catch (err) {
    if (jobId) {
      await updateAudioJob(jobId, {
        status: "failed",
        error: (err as Error).message || "TTS failed",
      });
    }
    res.status(500).json({ error: "TTS failed" });
  }
});

router.post("/sfx", rateLimit, async (req, res) => {
  let jobId: string | undefined;
  try {
    const body = req.body as Record<string, unknown>;
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const durationSec =
      typeof body.durationSec === "number"
        ? body.durationSec
        : typeof body.durationSec === "string"
          ? Number(body.durationSec)
          : undefined;
    const tags = parseTags(body.tags);
    const runId = typeof body.runId === "string" ? body.runId.trim() : undefined;

    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }
    if (prompt.length > MAX_TEXT_CHARS) {
      return res.status(400).json({ error: "prompt exceeds 1000 characters" });
    }

    const clampedDuration =
      typeof durationSec === "number" && Number.isFinite(durationSec)
        ? Math.min(10, Math.max(0.5, durationSec))
        : undefined;

    const job = await insertAudioJob({
      jobType: "sfx",
      status: "processing",
      inputText: prompt,
      inputMeta: { durationSec: clampedDuration, runId },
      output: undefined,
      mock: false,
      tags,
    });
    jobId = job._id;

    const result = await sfx({ prompt, durationSec: clampedDuration });
    const updated = await updateAudioJob(jobId!, {
      status: "done",
      output: { audioBase64: result.audioBase64, mimeType: result.mimeType },
      mock: result.mock,
    });

    if (!updated) {
      return res.status(500).json({ error: "Failed to update audio job" });
    }

    res.json({
      jobId: updated._id,
      status: updated.status,
      audioBase64: updated.output?.audioBase64,
      mimeType: updated.output?.mimeType,
      mock: updated.mock,
    });
  } catch (err) {
    if (jobId) {
      await updateAudioJob(jobId, {
        status: "failed",
        error: (err as Error).message || "SFX failed",
      });
    }
    res.status(500).json({ error: "SFX failed" });
  }
});

router.post("/dub", rateLimit, upload.single("audio"), async (req, res) => {
  let jobId: string | undefined;
  try {
    const body = req.body as Record<string, unknown>;
    const sourceLang = typeof body.sourceLang === "string" ? body.sourceLang.trim() : "";
    const targetLang = typeof body.targetLang === "string" ? body.targetLang.trim() : "";
    const voiceProfile = typeof body.voiceProfile === "string" ? body.voiceProfile.trim() : undefined;
    const tags = parseTags(body.tags);
    const runId = typeof body.runId === "string" ? body.runId.trim() : undefined;

    if (!targetLang) {
      return res.status(400).json({ error: "targetLang is required" });
    }
    if (voiceProfile && !isValidVoiceProfile(voiceProfile)) {
      return res.status(400).json({ error: "Invalid voiceProfile" });
    }

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
      return res.status(400).json({ error: "audio is required" });
    }
    if (audioBuffer.length > MAX_UPLOAD_BYTES) {
      return res.status(413).json({ error: "Audio exceeds 15MB limit" });
    }

    const job = await insertAudioJob({
      jobType: "dub",
      status: "processing",
      language: targetLang,
      voiceProfile,
      inputMeta: {
        sourceLang: sourceLang || "auto",
        targetLang,
        runId,
      },
      output: undefined,
      mock: false,
      tags,
    });
    jobId = job._id;

    const result = await dub({
      audioBuffer,
      mimeType,
      sourceLang: sourceLang || "auto",
      targetLang,
      voiceProfile,
    });

    const updated = await updateAudioJob(jobId!, {
      status: "done",
      output: { audioBase64: result.audioBase64, mimeType: result.mimeType },
      mock: result.mock,
    });

    if (!updated) {
      return res.status(500).json({ error: "Failed to update audio job" });
    }

    res.json({
      jobId: updated._id,
      status: updated.status,
      audioBase64: updated.output?.audioBase64,
      mimeType: updated.output?.mimeType,
      mock: updated.mock,
    });
  } catch (err) {
    if (jobId) {
      await updateAudioJob(jobId, {
        status: "failed",
        error: (err as Error).message || "Dubbing failed",
      });
    }
    res.status(500).json({ error: "Dubbing failed" });
  }
});

export default router;
