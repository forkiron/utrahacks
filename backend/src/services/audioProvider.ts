import crypto from "crypto";
import { getVoiceProfileById } from "./voiceProfiles.js";
import type { TranscriptSegment } from "../types.js";

const TTS_MODEL_ID = "eleven_multilingual_v2";
const STT_MODEL_ID = "scribe_v1";
const SFX_OUTPUT_FORMAT = "mp3_44100_128";

function getApiKey(): string {
  return process.env.ELEVENLABS_API_KEY ?? "";
}

function getDefaultVoiceId(): string {
  return process.env.ELEVENLABS_VOICE_ID ?? "";
}

function hasApiKey(): boolean {
  return Boolean(getApiKey());
}

function buildSilenceWavBase64(durationSec = 1): string {
  const sampleRate = 16000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const numSamples = Math.max(1, Math.floor(sampleRate * durationSec));
  const dataSize = numSamples * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer.toString("base64");
}

function buildMockTranscript(audioBuffer: Buffer, language?: string) {
  const hash = crypto.createHash("sha256").update(audioBuffer).digest("hex").slice(0, 10);
  const baseText = `[MOCK TRANSCRIPT] ${language ? `[${language}] ` : ""}Audio ${hash}: This is a mock transcript for demo use.`;
  const words = baseText.split(" ");
  const segments: TranscriptSegment[] = [];
  const chunkSize = Math.max(1, Math.ceil(words.length / 3));
  const totalMs = 3000;
  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    const idx = Math.floor(i / chunkSize);
    const startMs = idx * Math.floor(totalMs / 3);
    const endMs = Math.min(totalMs, startMs + Math.floor(totalMs / 3));
    segments.push({ startMs, endMs, text: chunk });
  }
  return {
    text: baseText,
    segments,
    confidence: 0.62,
  };
}

function buildSegmentsFromWords(words: Array<{ start?: number; end?: number; word?: string }> | undefined, text: string): TranscriptSegment[] {
  if (!words || words.length === 0) {
    return [{ startMs: 0, endMs: Math.min(1000, text.length * 30), text }];
  }
  const segments: TranscriptSegment[] = [];
  const chunkSize = 6;
  for (let i = 0; i < words.length; i += chunkSize) {
    const slice = words.slice(i, i + chunkSize);
    const start = slice[0]?.start ?? 0;
    const end = slice[slice.length - 1]?.end ?? start + 0.5;
    const segmentText = slice.map((w) => w.word ?? "").join(" ").trim();
    segments.push({
      startMs: Math.floor(start * 1000),
      endMs: Math.floor(end * 1000),
      text: segmentText,
    });
  }
  return segments;
}

async function bufferFromResponse(response: { arrayBuffer: () => Promise<ArrayBuffer> }): Promise<Buffer> {
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function transcribeAudio(input: {
  audioBuffer: Buffer;
  mimeType: string;
  language?: string;
}): Promise<{ text: string; segments: TranscriptSegment[]; confidence?: number; mock: boolean }> {
  if (!hasApiKey()) {
    const mock = buildMockTranscript(input.audioBuffer, input.language);
    return { ...mock, mock: true };
  }

  try {
    const FormDataCtor = (globalThis as any).FormData;
    const BlobCtor = (globalThis as any).Blob;
    const form = new FormDataCtor();
    const blob = new BlobCtor([input.audioBuffer], {
      type: input.mimeType || "audio/wav",
    });
    form.append("file", blob, "audio");
    form.append("model_id", STT_MODEL_ID);
    if (input.language) {
      form.append("language_code", input.language);
    }

    const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "xi-api-key": getApiKey(),
      },
      body: form,
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs STT error: ${response.status}`);
    }

    const data = (await response.json()) as {
      text?: string;
      words?: Array<{ start?: number; end?: number; word?: string }>;
      language_probability?: number;
    };

    const text = data.text ?? "";
    const segments = buildSegmentsFromWords(data.words, text);
    return {
      text,
      segments,
      confidence: typeof data.language_probability === "number" ? data.language_probability : undefined,
      mock: false,
    };
  } catch {
    const mock = buildMockTranscript(input.audioBuffer, input.language);
    return { ...mock, mock: true };
  }
}

export async function tts(input: {
  text: string;
  voiceProfile: string;
  language?: string;
}): Promise<{ audioBase64: string; mimeType: string; mock: boolean }> {
  if (!hasApiKey()) {
    return {
      audioBase64: buildSilenceWavBase64(1),
      mimeType: "audio/wav",
      mock: true,
    };
  }

  const profile = getVoiceProfileById(input.voiceProfile);
  const voiceId = profile?.elevenLabsVoiceId || getDefaultVoiceId();
  if (!voiceId) {
    return {
      audioBase64: buildSilenceWavBase64(1),
      mimeType: "audio/wav",
      mock: true,
    };
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${SFX_OUTPUT_FORMAT}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
          "xi-api-key": getApiKey(),
        },
        body: JSON.stringify({
          text: input.text,
          model_id: TTS_MODEL_ID,
          voice_settings: { stability: 0.4, similarity_boost: 0.7 },
          language_code: input.language,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs TTS error: ${response.status}`);
    }

    const buffer = await bufferFromResponse(response);
    return {
      audioBase64: buffer.toString("base64"),
      mimeType: "audio/mpeg",
      mock: false,
    };
  } catch {
    return {
      audioBase64: buildSilenceWavBase64(1),
      mimeType: "audio/wav",
      mock: true,
    };
  }
}

export async function sfx(input: {
  prompt: string;
  durationSec?: number;
}): Promise<{ audioBase64: string; mimeType: string; mock: boolean }> {
  if (!hasApiKey()) {
    return {
      audioBase64: buildSilenceWavBase64(1),
      mimeType: "audio/wav",
      mock: true,
    };
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/sound-generation?output_format=${SFX_OUTPUT_FORMAT}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
          "xi-api-key": getApiKey(),
        },
        body: JSON.stringify({
          text: input.prompt,
          duration_seconds: input.durationSec ?? 3,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs SFX error: ${response.status}`);
    }

    const buffer = await bufferFromResponse(response);
    return {
      audioBase64: buffer.toString("base64"),
      mimeType: "audio/mpeg",
      mock: false,
    };
  } catch {
    return {
      audioBase64: buildSilenceWavBase64(1),
      mimeType: "audio/wav",
      mock: true,
    };
  }
}

export async function dub(input: {
  audioBuffer: Buffer;
  mimeType: string;
  sourceLang: string;
  targetLang: string;
  voiceProfile?: string;
}): Promise<{ audioBase64: string; mimeType: string; mock: boolean }> {
  if (!hasApiKey()) {
    return {
      audioBase64: buildSilenceWavBase64(1),
      mimeType: "audio/wav",
      mock: true,
    };
  }

  try {
    const FormDataCtor = (globalThis as any).FormData;
    const BlobCtor = (globalThis as any).Blob;
    const form = new FormDataCtor();
    const blob = new BlobCtor([input.audioBuffer], {
      type: input.mimeType || "audio/wav",
    });
    form.append("file", blob, "audio");
    form.append("name", `utrahacks-dub-${Date.now()}`);
    form.append("source_lang", input.sourceLang || "auto");
    form.append("target_lang", input.targetLang);
    form.append("mode", "automatic");

    const createResponse = await fetch("https://api.elevenlabs.io/v1/dubbing", {
      method: "POST",
      headers: {
        "xi-api-key": getApiKey(),
      },
      body: form,
    });

    if (!createResponse.ok) {
      throw new Error(`ElevenLabs dub create error: ${createResponse.status}`);
    }

    const createData = (await createResponse.json()) as { dubbing_id?: string };
    const dubbingId = createData.dubbing_id;
    if (!dubbingId) {
      throw new Error("Missing dubbing_id");
    }

    let status = "dubbing";
    for (let i = 0; i < 3; i += 1) {
      const statusResponse = await fetch(`https://api.elevenlabs.io/v1/dubbing/${dubbingId}`, {
        method: "GET",
        headers: {
          "xi-api-key": getApiKey(),
        },
      });
      if (statusResponse.ok) {
        const statusData = (await statusResponse.json()) as { status?: string };
        status = statusData.status ?? status;
        if (status === "dubbed") break;
        if (status === "failed") {
          throw new Error("Dubbing failed");
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    if (status !== "dubbed") {
      throw new Error("Dubbing not ready");
    }

    const audioResponse = await fetch(
      `https://api.elevenlabs.io/v1/dubbing/${dubbingId}/audio/${input.targetLang}`,
      {
        method: "GET",
        headers: {
          Accept: "audio/mpeg",
          "xi-api-key": getApiKey(),
        },
      }
    );

    if (!audioResponse.ok) {
      throw new Error(`ElevenLabs dub audio error: ${audioResponse.status}`);
    }

    const buffer = await bufferFromResponse(audioResponse);
    return {
      audioBase64: buffer.toString("base64"),
      mimeType: "audio/mpeg",
      mock: false,
    };
  } catch {
    return {
      audioBase64: buildSilenceWavBase64(1),
      mimeType: "audio/wav",
      mock: true,
    };
  }
}
