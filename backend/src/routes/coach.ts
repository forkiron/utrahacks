import { Router } from "express";
import multer from "multer";
import crypto from "crypto";
import { generateCommentary } from "../services/commentary.js";
import { tts, isElevenLabsConfigured } from "../services/elevenlabs.js";

const router = Router();
const GEMINI_COOLDOWN_MS = 5000;

/** Pre-run track intro script (exact text). */
const TRACK_INTRO_SCRIPT = `WE'RE SEEING THE 2026 ROBOT BIATHLON TRACK FOR THE FIRST TIME, and it's a BEAST.
Two brutal zones: first, an obstacle course with two punishing obstructions. Then there's the shooting range, where our fearsome robots must nail a shot to the outer blue ring.
THIS TRACK IS SCARY — we wish everyone good luck!`;

interface SessionState {
  lastGeminiCall: number;
  lastCommentaryHash: string;
  lastTags: string[];
}

const sessionStore = new Map<string, SessionState>();

function getOrCreateSession(sessionId: string): SessionState {
  let state = sessionStore.get(sessionId);
  if (!state) {
    state = {
      lastGeminiCall: 0,
      lastCommentaryHash: "",
      lastTags: [],
    };
    sessionStore.set(sessionId, state);
  }
  return state;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

/** Pre-run track intro: returns script text only (no ElevenLabs required). */
router.get("/intro", (_req, res) => {
  res.json({ text: TRACK_INTRO_SCRIPT });
});

/** Pre-run track intro as audio (uses ElevenLabs; cached). Returns 501 if ElevenLabs not configured. */
router.get("/intro/audio", async (_req, res) => {
  if (!isElevenLabsConfigured()) {
    return res.status(501).json({
      error: "ElevenLabs not configured",
      message: "Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID to enable intro audio.",
    });
  }
  try {
    const audio = await tts(TRACK_INTRO_SCRIPT);
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(audio);
  } catch (err) {
    console.error("Intro audio error:", err);
    res.status(500).json({ error: "Intro audio failed" });
  }
});

/** Live coach: analyze frame, return commentary. Rate-limit Gemini to 1 call per 5s per session. */
router.post("/frame", upload.single("image"), async (req, res) => {
  try {
    const file = req.file;
    if (!file?.buffer) {
      return res.status(400).json({ error: "No frame provided" });
    }

    const t = Number.parseInt(String(req.body.t ?? "0"), 10);
    const sessionId = typeof req.body.sessionId === "string" ? req.body.sessionId : "";
    const state = getOrCreateSession(sessionId || crypto.randomUUID());
    const now = Date.now();
    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
    const offCooldown = now - state.lastGeminiCall >= GEMINI_COOLDOWN_MS;
    const allowGemini = hasGeminiKey && offCooldown;
    const geminiDisabledReason = !hasGeminiKey
      ? "missing_api_key"
      : !offCooldown
        ? "cooldown"
        : null;

    const result = await generateCommentary(file.buffer, {
      allowGemini: Boolean(allowGemini),
      lastCommentaryHash: state.lastCommentaryHash || undefined,
    });

    if (result.source === "gemini") {
      state.lastGeminiCall = now;
    }
    state.lastCommentaryHash = crypto
      .createHash("sha256")
      .update(result.text)
      .digest("hex");
    state.lastTags = result.tags ?? [];

    const eventId = `evt_${crypto.randomUUID()}`;
    res.json({
      eventId,
      t: Number.isFinite(t) ? t : 0,
      text: result.text,
      meta: {
        source: result.source,
        latencyMs: result.latencyMs ?? 0,
        tags: result.tags,
        geminiAllowed: allowGemini,
        geminiDisabledReason,
      },
    });
  } catch (err) {
    console.error("Coach frame error:", err);
    res.status(500).json({ error: "Frame analysis failed" });
  }
});

router.post("/tts", async (req, res) => {
  if (!isElevenLabsConfigured()) {
    return res.status(501).json({
      error: "ElevenLabs not configured",
      message: "Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID to enable TTS.",
    });
  }
  try {
    const { text } = req.body as { text?: string };
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required" });
    }

    const audio = await tts(text);
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(audio);
  } catch (err) {
    const code = (err as Error & { code?: string }).code;
    if (code === "ELEVENLABS_NOT_CONFIGURED") {
      return res.status(501).json({
        error: "ElevenLabs not configured",
        message: "Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID to enable TTS.",
      });
    }
    console.error("TTS error:", err);
    res.status(500).json({ error: "TTS failed" });
  }
});

export default router;
