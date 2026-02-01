import crypto from "crypto";
import sharp from "sharp";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { runObjectDetection } from "./cvLayer.js";

export interface CommentaryResult {
  text: string;
  tags: string[];
  source: "mock" | "gemini";
  action?: string;
  confidence?: number;
  latencyMs?: number;
}

export interface CommentaryContext {
  allowGemini: boolean;
  lastCommentaryHash?: string;
}

const GEMINI_TIMEOUT_MS = 12000;
const VALID_ACTIONS = new Set([
  "stable",
  "drifting_left",
  "drifting_right",
  "approaching_obstacle",
  "line_lost",
  "line_weak",
  "climbing",
  "stuck",
  "recovery",
  "unknown",
]);

const GEMINI_PROMPT = `You are a sports commentator for a robotics run. Look at the image and describe what the robot is doing in one short sentence (9-16 words). Vary your line based on what you see: line position, obstacles, speed, etc. Do not repeat the same generic phrase.

Return exactly one JSON object with these keys only:
- "action": one of stable, drifting_left, drifting_right, approaching_obstacle, line_lost, line_weak, climbing, stuck, recovery, unknown
- "commentary": your one-sentence comment (e.g. "Looks like they're drifting left — tighten that turn." or "Nice and steady through this section.")
- "confidence": number between 0.0 and 1.0
- "tags": array of 0-3 short strings (e.g. "line", "obstacle", "curve")

Example format: {"action":"stable","commentary":"Smooth and centered through here.","confidence":0.85,"tags":["line"]}

Output only the JSON object, no other text or markdown.`;

let genAISingleton: GoogleGenerativeAI | null = null;
let modelSingleton: ReturnType<GoogleGenerativeAI["getGenerativeModel"]> | null = null;

function getModel(apiKey: string) {
  if (!modelSingleton) {
    genAISingleton = new GoogleGenerativeAI(apiKey);
    modelSingleton = genAISingleton.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 256,
      },
    });
  }
  return modelSingleton;
}

const geminiCache = new Map<string, { text: string; action: string; tags: string[]; confidence: number }>();
const CACHE_MAX = 100;

function getImageCacheKey(imageBuffer: Buffer): string {
  return crypto.createHash("sha256").update(imageBuffer).digest("hex");
}

function pruneGeminiCache() {
  if (geminiCache.size <= CACHE_MAX) return;
  const first = geminiCache.keys().next().value;
  if (first) geminiCache.delete(first);
}

const REPHRASE_BY_ACTION: Record<string, string[]> = {
  stable: ["Smooth and centered through here.", "Steady run, no drama.", "Holding the line nicely."],
  drifting_left: ["Looks like they're drifting left — tighten that turn.", "Left pull — small correction needed."],
  drifting_right: ["Drifting right — stay centered.", "Right bias — ease it back."],
  approaching_obstacle: ["Looks like an obstacle — careful steering.", "Something in the way — slow it down."],
  line_lost: ["Lost the line — but they're fighting back.", "Line's gone — recovery mode."],
  line_weak: ["Line looks faint — slow down and find it.", "Tracking's shaky — stay patient."],
  climbing: ["Still climbing… steady.", "Working their way up."],
  stuck: ["Looks stuck — can they get free?", "Oh, stuck… but they're trying."],
  recovery: ["Recovering — nice save.", "Fighting back into control."],
  unknown: ["Unclear from here — we'll see.", "Looks like they're adjusting."],
};

const GENERIC_LINES = [
  "Smooth and centered through this section.",
  "Steady run here, nice control.",
  "Holding the line, looks good.",
  "Clean and smooth — no drama.",
];

const DRIFT_LEFT_LINES = [
  "Looks like they're drifting left — tighten that turn.",
  "Drifting left, small correction needed.",
  "Left pull — stay centered.",
];

const DRIFT_RIGHT_LINES = [
  "Drifting right — ease it back.",
  "Right bias showing — correct and hold.",
  "Sliding right — tighten that turn.",
];

const LINE_WEAK_LINES = [
  "Line looks faint — slow down and find it.",
  "Tracking seems shaky — stay patient.",
  "Line's weak here — easy does it.",
];

const OBSTACLE_LINES = [
  "Looks like an obstacle — careful steering.",
  "Something in the way — slow it down.",
  "Obstacle ahead — stay centered.",
];

const STRUGGLE_CLIMB_LINES = [
  "Still climbing… steady as they go.",
  "Working their way up — looks tough.",
  "Climbing — slow and controlled.",
];

function sanitizeCommentary(text: string): string {
  const clean = text.replace(/\s+/g, " ").replace(/["]+/g, "").trim();
  const firstSentence = (clean.split(/(?<=[.!?])\s+/)[0] ?? clean).trim();
  const words = firstSentence.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "Steady run.";
  const out = words.length <= 16 ? firstSentence : words.slice(0, 16).join(" ");
  const trimmed = out.replace(/\s+$/, "").trim();
  return /[.!?]$/.test(trimmed) ? trimmed : trimmed + ".";
}

async function getFrameStats(buffer: Buffer) {
  const resized = await sharp(buffer)
    .resize(32, 18, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer();

  const totalPixels = 32 * 18;
  let sum = 0;
  let sumSq = 0;
  let leftSum = 0;
  let rightSum = 0;
  let topSum = 0;
  let bottomSum = 0;

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 3;
    const r = resized[idx] ?? 0;
    const g = resized[idx + 1] ?? 0;
    const b = resized[idx + 2] ?? 0;
    const gray = (r + g + b) / 3;
    sum += gray;
    sumSq += gray * gray;
    const x = i % 32;
    const y = Math.floor(i / 32);
    if (x < 16) leftSum += gray;
    else rightSum += gray;
    if (y < 9) topSum += gray;
    else bottomSum += gray;
  }

  const mean = sum / totalPixels;
  const variance = sumSq / totalPixels - mean * mean;
  const leftMean = leftSum / (16 * 18);
  const rightMean = rightSum / (16 * 18);
  const topMean = topSum / (32 * 9);
  const bottomMean = bottomSum / (32 * 9);

  return { mean, variance, leftMean, rightMean, topMean, bottomMean };
}

function pickLineAvoidingHash(
  options: string[],
  seed: string,
  avoidHash?: string
): string {
  for (let i = 0; i < options.length; i++) {
    const line = options[(parseInt(seed.slice(0, 8), 16) + i) % options.length];
    if (!avoidHash || crypto.createHash("sha256").update(line).digest("hex") !== avoidHash) {
      return line ?? options[0];
    }
  }
  return options[0] ?? "";
}

function rephraseForDuplicate(action: string, seed: string): string {
  const bank = REPHRASE_BY_ACTION[action] ?? REPHRASE_BY_ACTION.unknown;
  const n = parseInt(seed.slice(0, 8), 16);
  return bank[n % bank.length] ?? bank[0];
}

async function generateMockCommentary(
  imageBuffer: Buffer,
  lastCommentaryHash?: string
): Promise<Omit<CommentaryResult, "source">> {
  const detections = await runObjectDetection([imageBuffer]);
  const tags = Array.from(new Set(detections.map((d) => d.label)));
  const hash = crypto.createHash("sha256").update(imageBuffer).digest("hex");
  const stats = await getFrameStats(imageBuffer);
  const obstacleLike = tags.some((l) => l === "lidar" || l === "sensor" || l === "camera");

  let action = "stable";
  let line: string;

  if (stats.bottomMean < 60) {
    action = "line_weak";
    line = pickLineAvoidingHash(LINE_WEAK_LINES, hash, lastCommentaryHash);
  } else if (stats.leftMean + 12 < stats.rightMean) {
    action = "drifting_left";
    line = pickLineAvoidingHash(DRIFT_LEFT_LINES, hash, lastCommentaryHash);
  } else if (stats.rightMean + 12 < stats.leftMean) {
    action = "drifting_right";
    line = pickLineAvoidingHash(DRIFT_RIGHT_LINES, hash, lastCommentaryHash);
  } else if (obstacleLike || stats.variance > 1200) {
    action = "approaching_obstacle";
    line = pickLineAvoidingHash(OBSTACLE_LINES, hash, lastCommentaryHash);
  } else if (stats.variance > 900) {
    action = "climbing";
    line = pickLineAvoidingHash(STRUGGLE_CLIMB_LINES, hash, lastCommentaryHash);
  } else {
    line = pickLineAvoidingHash(GENERIC_LINES, hash, lastCommentaryHash);
  }

  return {
    text: sanitizeCommentary(line),
    tags,
    action,
    confidence: 0.55,
  };
}

type GeminiParsed = {
  action?: string;
  commentary?: string;
  comment?: string;
  text?: string;
  confidence?: number;
  tags?: string[];
};

function parseGeminiJson(rawText: string): {
  action: string;
  commentary: string;
  confidence: number;
  tags: string[];
} | null {
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  let parsed: GeminiParsed | null = null;
  try {
    parsed = JSON.parse(trimmed) as GeminiParsed;
  } catch {
    const block = trimmed.match(/\{[\s\S]*\}/);
    if (block) {
      try {
        parsed = JSON.parse(block[0]) as GeminiParsed;
      } catch {
        // Not JSON; if it looks like a single commentary line, use it
        if (!trimmed.includes("{") && trimmed.length > 10 && trimmed.length < 200) {
          return {
            action: "unknown",
            commentary: trimmed,
            confidence: 0.6,
            tags: [],
          };
        }
        return null;
      }
    }
  }

  if (!parsed) return null;
  const commentary =
    typeof parsed.commentary === "string"
      ? parsed.commentary
      : typeof parsed.comment === "string"
        ? parsed.comment
        : typeof parsed.text === "string"
          ? parsed.text
          : null;
  if (!commentary) return null;

  const action = VALID_ACTIONS.has(String(parsed.action)) ? String(parsed.action) : "unknown";
  const conf = parsed.confidence;
  const confidence = typeof conf === "number" ? Math.max(0, Math.min(1, conf)) : 0.6;
  const tags = Array.isArray(parsed.tags) ? (parsed.tags as unknown[]).filter((t: unknown) => typeof t === "string") as string[] : [];
  return {
    action,
    commentary,
    confidence,
    tags,
  };
}

async function generateGeminiCommentary(
  imageBuffer: Buffer,
  apiKey: string,
  lastCommentaryHash?: string
): Promise<Omit<CommentaryResult, "source">> {
  const cacheKey = getImageCacheKey(imageBuffer);
  const cached = geminiCache.get(cacheKey);
  if (cached) {
    const textHash = crypto.createHash("sha256").update(cached.text).digest("hex");
    const finalText =
      lastCommentaryHash && textHash === lastCommentaryHash
        ? rephraseForDuplicate(cached.action, cacheKey)
        : cached.text;
    return {
      text: sanitizeCommentary(finalText),
      tags: cached.tags,
      action: cached.action,
      confidence: cached.confidence,
    };
  }

  const model = getModel(apiKey);
  const resizedForGemini = await sharp(imageBuffer)
    .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
  const imagePart = {
    inlineData: {
      data: resizedForGemini.toString("base64"),
      mimeType: "image/jpeg",
    },
  };

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Gemini timeout")), GEMINI_TIMEOUT_MS);
  });

  let rawText: string;
  try {
    const result = await Promise.race([
      model.generateContent([GEMINI_PROMPT, imagePart]).then((r) => r.response.text() ?? ""),
      timeoutPromise,
    ]);
    rawText = (result as string)?.trim() ?? "";
  } catch (err) {
    throw err;
  }

  const parsed = parseGeminiJson(rawText);
  if (!parsed) {
    return {
      text: sanitizeCommentary("Looks like steady running — we'll see."),
      tags: [],
      action: "unknown",
      confidence: 0.5,
    };
  }

  const text = sanitizeCommentary(parsed.commentary);
  const textHash = crypto.createHash("sha256").update(text).digest("hex");
  const finalText =
    lastCommentaryHash && textHash === lastCommentaryHash
      ? rephraseForDuplicate(parsed.action, cacheKey)
      : text;

  geminiCache.set(cacheKey, {
    text,
    action: parsed.action,
    tags: parsed.tags,
    confidence: parsed.confidence,
  });
  pruneGeminiCache();

  return {
    text: sanitizeCommentary(finalText),
    tags: parsed.tags,
    action: parsed.action,
    confidence: parsed.confidence,
  };
}

export async function generateCommentary(
  imageBuffer: Buffer,
  context?: CommentaryContext
): Promise<CommentaryResult> {
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  const allowGemini = Boolean(context?.allowGemini) && Boolean(apiKey);
  const lastHash = context?.lastCommentaryHash;
  const t0 = Date.now();

  if (!allowGemini) {
    const mock = await generateMockCommentary(imageBuffer, lastHash);
    return { ...mock, source: "mock", latencyMs: Date.now() - t0 };
  }

  try {
    const gemini = await generateGeminiCommentary(imageBuffer, apiKey, lastHash);
    return { ...gemini, source: "gemini", latencyMs: Date.now() - t0 };
  } catch (err) {
    console.error("Gemini commentary error, falling back to mock:", err);
    const mock = await generateMockCommentary(imageBuffer, lastHash);
    return { ...mock, source: "mock", latencyMs: Date.now() - t0 };
  }
}
