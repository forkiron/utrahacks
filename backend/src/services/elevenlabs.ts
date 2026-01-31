import crypto from "crypto";

const CACHE_LIMIT = 200;
const audioCache = new Map<string, Buffer>();

function getCacheKey(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function pruneCache() {
  if (audioCache.size <= CACHE_LIMIT) return;
  const oldestKey = audioCache.keys().next().value as string | undefined;
  if (oldestKey) {
    audioCache.delete(oldestKey);
  }
}

export async function tts(text: string): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY ?? "";
  const voiceId = process.env.ELEVENLABS_VOICE_ID ?? "";

  if (!apiKey || !voiceId) {
    const err = new Error("ELEVENLABS_NOT_CONFIGURED");
    (err as Error & { code?: string }).code = "ELEVENLABS_NOT_CONFIGURED";
    throw err;
  }

  const cleanText = text.trim();
  const cacheKey = getCacheKey(cleanText);
  const cached = audioCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: cleanText,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.7,
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`ElevenLabs error: ${response.status} ${errText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  audioCache.set(cacheKey, buffer);
  pruneCache();
  return buffer;
}
