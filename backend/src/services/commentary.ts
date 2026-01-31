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

const GEMINI_PROMPT = `You are an Olympic-style robotics commentator.
Given a single frame from a robotics run, return JSON only:
{
  "action": "short phrase of what robot is doing",
  "commentary": "ONE sentence, 12–18 words, energetic but grounded, includes micro-advice if possible",
  "confidence": 0.0-1.0,
  "tags": ["turning","approaching_obstacle","stable","drifting","line_lost","recovery",...]
}
If uncertain, use "looks like" or "seems". Include micro-advice when possible ("slow down", "tighten turn", "hold center"). Do NOT invent details you cannot see. Return JSON only.`;

const GENERIC_LINES = [
  "Holding steady—nice control through this stretch.",
  "Careful here—small adjustments will keep you centered.",
  "Smooth segment—holding a consistent line and pace.",
  "Controlled movement—nice balance and steady correction.",
];

const DRIFT_LEFT_LINES = [
  "Drifting left - tighten the turn to recover.",
  "Left pull detected - ease a correction back to center.",
];

const DRIFT_RIGHT_LINES = [
  "Drifting right - smooth correction back to center.",
  "Right bias showing - guide it gently toward the line.",
];

const LINE_WEAK_LINES = [
  "Line looks faint - slow down and re-center to keep tracking.",
  "Tracking is shaky - small corrections should regain the path.",
];

const OBSTACLE_LINES = [
  "Approaching an obstacle - steady pace and clean clearance.",
  "Obstacle ahead - slow and steady to avoid contact.",
];

function sanitizeCommentary(text: string): string {
  const clean = text.replace(/\s+/g, " ").replace(/["]+/g, "").trim();
  const firstSentence = clean.split(/(?<=[.!?])\s+/)[0] ?? clean;
  const words = firstSentence.split(/\s+/);
  if (words.length <= 18) return firstSentence;
  return words.slice(0, 18).join(" ").replace(/[.!?]$/, "") + ".";
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

  return {
    mean,
    variance,
    leftMean,
    rightMean,
    topMean,
    bottomMean,
  };
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

async function generateMockCommentary(
  imageBuffer: Buffer,
  lastCommentaryHash?: string
): Promise<Omit<CommentaryResult, "source">> {
  const detections = await runObjectDetection([imageBuffer]);
  const tags = Array.from(new Set(detections.map((d) => d.label)));
  const hash = crypto.createHash("sha256").update(imageBuffer).digest("hex");
  const stats = await getFrameStats(imageBuffer);

  let action = "steady";
  let line: string;
  const obstacleLike = tags.some(
    (l) => l === "lidar" || l === "sensor" || l === "camera"
  );

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
    action = "turning";
    line = "Quick adjustment—stay centered and keep the turns smooth.";
  } else {
    action = "stable";
    line = pickLineAvoidingHash(GENERIC_LINES, hash, lastCommentaryHash);
  }

  return {
    text: sanitizeCommentary(line),
    tags,
    action,
    confidence: 0.55,
  };
}

async function generateGeminiCommentary(
  imageBuffer: Buffer,
  apiKey: string
): Promise<Omit<CommentaryResult, "source">> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const imagePart = {
    inlineData: {
      data: imageBuffer.toString("base64"),
      mimeType: "image/jpeg",
    },
  };

  const result = await model.generateContent([GEMINI_PROMPT, imagePart]);
  const rawText = result.response.text();
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      text: sanitizeCommentary("Holding steady—nice control through this stretch."),
      tags: [],
      action: "steady",
      confidence: 0.5,
    };
  }

  let parsed: {
    action?: string;
    commentary?: string;
    confidence?: number;
    tags?: string[];
  };
  try {
    parsed = JSON.parse(jsonMatch[0]) as typeof parsed;
  } catch {
    return {
      text: sanitizeCommentary("Maintaining pace—steady control."),
      tags: [],
      action: "steady",
      confidence: 0.5,
    };
  }

  return {
    text: sanitizeCommentary(
      parsed.commentary ?? "Maintaining pace—steady control."
    ),
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    action: parsed.action,
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.6,
  };
}

export async function generateCommentary(
  imageBuffer: Buffer,
  context?: CommentaryContext
): Promise<CommentaryResult> {
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  const allowGemini =
    Boolean(context?.allowGemini) && Boolean(apiKey);
  const lastHash = context?.lastCommentaryHash;

  const t0 = Date.now();

  if (!allowGemini) {
    const mock = await generateMockCommentary(imageBuffer, lastHash);
    return {
      ...mock,
      source: "mock",
      latencyMs: Date.now() - t0,
    };
  }

  try {
    const gemini = await generateGeminiCommentary(imageBuffer, apiKey);
    return {
      ...gemini,
      source: "gemini",
      latencyMs: Date.now() - t0,
    };
  } catch (err) {
    console.error("Gemini commentary error, falling back to mock:", err);
    const mock = await generateMockCommentary(imageBuffer, lastHash);
    return {
      ...mock,
      source: "mock",
      latencyMs: Date.now() - t0,
    };
  }
}

