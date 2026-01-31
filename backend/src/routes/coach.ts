import { Router } from "express";
import multer from "multer";
import crypto from "crypto";
import { generateCommentary } from "../services/commentary.js";
import { tts } from "../services/elevenlabs.js";

const router = Router();
const GEMINI_COOLDOWN_MS = 5000;

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
    const allowGemini =
      process.env.GEMINI_API_KEY &&
      now - state.lastGeminiCall >= GEMINI_COOLDOWN_MS;

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
      },
    });
  } catch (err) {
    console.error("Coach frame error:", err);
    res.status(500).json({ error: "Frame analysis failed" });
  }
});

router.post("/tts", async (req, res) => {
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
      return res.status(400).json({ error: "ElevenLabs not configured" });
    }
    console.error("TTS error:", err);
    res.status(500).json({ error: "TTS failed" });
  }
});

export default router;
