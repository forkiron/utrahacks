import { Router } from "express";
import multer from "multer";
import crypto from "crypto";
import { generateCommentary } from "../services/commentary.js";
import { tts } from "../services/elevenlabs.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post("/commentary", upload.single("frame"), async (req, res) => {
  try {
    const file = req.file;
    if (!file?.buffer) {
      return res.status(400).json({ error: "No frame provided" });
    }

    const t = Number.parseFloat(req.body.t ?? "0");
    const result = await generateCommentary(file.buffer);

    res.json({
      id: `cmt_${crypto.randomUUID()}`,
      t: Number.isFinite(t) ? t : 0,
      text: result.text,
      meta: {
        source: result.source,
        tags: result.tags,
        action: result.action,
        confidence: result.confidence,
      },
    });
  } catch (err) {
    console.error("Commentary error:", err);
    res.status(500).json({ error: "Commentary failed" });
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
