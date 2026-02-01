"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const CAPTURE_INTERVAL_MS = 5000;
const HASH_SIZE = 16;
const HASH_DIFF_THRESHOLD = 20;
const AUDIO_QUEUE_LIMIT = 3;

interface CommentaryEvent {
  id: string;
  t: number;
  text: string;
  meta?: {
    source: "mock" | "gemini";
    tags?: string[];
    action?: string;
    confidence?: number;
  };
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function computeHashFromImageData(data: Uint8ClampedArray) {
  let sum = 0;
  const grays = new Array<number>(HASH_SIZE * HASH_SIZE);
  for (let i = 0; i < HASH_SIZE * HASH_SIZE; i++) {
    const idx = i * 4;
    const r = data[idx] ?? 0;
    const g = data[idx + 1] ?? 0;
    const b = data[idx + 2] ?? 0;
    const gray = (r + g + b) / 3;
    grays[i] = gray;
    sum += gray;
  }
  const mean = sum / grays.length;
  return grays.map((v) => (v > mean ? "1" : "0")).join("");
}

function hammingDistance(a: string, b: string) {
  if (a.length !== b.length) return Number.MAX_SAFE_INTEGER;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) diff += 1;
  }
  return diff;
}

export default function LiveCoachPlayer() {
  const apiUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
    []
  );
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [events, setEvents] = useState<CommentaryEvent[]>([]);
  const [liveEnabled, setLiveEnabled] = useState(true);
  const [status, setStatus] = useState<string>("");
  const [ttsAvailable, setTtsAvailable] = useState(true);
  const [currentLabel, setCurrentLabel] = useState<string>("");
  const [geminiAvailable, setGeminiAvailable] = useState<boolean | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hashCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef<number | null>(null);
  const lastHashRef = useRef<string | null>(null);
  const pendingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const playingRef = useRef(false);

  const playNext = () => {
    if (playingRef.current) return;
    const next = audioQueueRef.current.shift();
    if (!next || !audioRef.current) return;
    const audio = audioRef.current;
    audio.src = next;
    playingRef.current = true;
    audio
      .play()
      .catch(() => {
        playingRef.current = false;
      });
  };

  const enqueueAudio = (url: string) => {
    if (audioQueueRef.current.length >= AUDIO_QUEUE_LIMIT) {
      URL.revokeObjectURL(url);
      return;
    }
    audioQueueRef.current.push(url);
    if (!playingRef.current) {
      playNext();
    }
  };

  useEffect(() => {
    audioRef.current = new Audio();
    const audio = audioRef.current;
    const onEnded = () => {
      if (audio.src) {
        URL.revokeObjectURL(audio.src);
        audio.removeAttribute("src");
      }
      playingRef.current = false;
      playNext();
    };
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("ended", onEnded);
      audio.pause();
    };
  }, []);

  useEffect(() => {
    if (!liveEnabled) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(() => {
      captureFrame();
    }, CAPTURE_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [liveEnabled]);

  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  const resetSession = () => {
    setEvents([]);
    setStatus("");
    setCurrentLabel("");
    setGeminiAvailable(null);
    lastHashRef.current = null;
    audioQueueRef.current = [];
    playingRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const captureFrame = async () => {
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    const hashCanvas = hashCanvasRef.current;
    if (!video || !canvas || !hashCanvas) return;
    if (video.paused || video.ended) return;
    if (!liveEnabled || pendingRef.current) return;
    if (!video.videoWidth || !video.videoHeight) return;

    pendingRef.current = true;
    try {
      const scale = Math.min(1, 640 / video.videoWidth);
      const width = Math.max(1, Math.round(video.videoWidth * scale));
      const height = Math.max(1, Math.round(video.videoHeight * scale));
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, width, height);

      hashCanvas.width = HASH_SIZE;
      hashCanvas.height = HASH_SIZE;
      const hctx = hashCanvas.getContext("2d");
      if (!hctx) return;
      hctx.drawImage(canvas, 0, 0, HASH_SIZE, HASH_SIZE);
      const imageData = hctx.getImageData(0, 0, HASH_SIZE, HASH_SIZE);
      const hash = computeHashFromImageData(imageData.data);
      if (lastHashRef.current) {
        const diff = hammingDistance(lastHashRef.current, hash);
        if (diff < HASH_DIFF_THRESHOLD) {
          lastHashRef.current = hash;
          return;
        }
      }
      lastHashRef.current = hash;

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.7)
      );
      if (!blob) return;

      const formData = new FormData();
      formData.append("frame", blob, `frame-${Date.now()}.jpg`);
      formData.append("t", video.currentTime.toFixed(2));

      const res = await fetch(`${apiUrl}/api/coach/commentary`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        setStatus("Commentary service unavailable.");
        return;
      }
      const data = (await res.json()) as CommentaryEvent;
      setEvents((prev) => [...prev, data]);
      if (data.meta?.source) {
        setGeminiAvailable(data.meta.source === "gemini");
      }
      if (data.meta?.action) {
        setCurrentLabel(data.meta.action.replace(/_/g, " "));
      } else if (data.meta?.tags?.length) {
        setCurrentLabel(data.meta.tags.join(", "));
      }

      if (ttsAvailable) {
        const ttsRes = await fetch(`${apiUrl}/api/coach/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: data.text }),
        });
        if (ttsRes.ok) {
          const audioBlob = await ttsRes.blob();
          const url = URL.createObjectURL(audioBlob);
          enqueueAudio(url);
        } else if (ttsRes.status === 400) {
          const err = await ttsRes.json();
          if (err?.error?.toLowerCase().includes("elevenlabs")) {
            setTtsAvailable(false);
            setStatus("ElevenLabs not configured. Text-only commentary.");
          }
        } else {
          setStatus("Audio unavailable. Commentary will remain text-only.");
        }
      }
    } catch (err) {
      console.error(err);
      setStatus("Capture failed. Check backend connection.");
    } finally {
      pendingRef.current = false;
    }
  };

  const onFileChange = (file: File | null) => {
    if (!file) return;
    resetSession();
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
  };

  const geminiDisabled = geminiAvailable === false;

  return (
    <div className="space-y-6 font-sans">
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
        <div className="flex flex-col gap-4">
          <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Upload run video (mp4/webm)
          </label>
          <input
            type="file"
            accept="video/mp4,video/webm"
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
            className="text-sm text-zinc-300 file:mr-4 file:rounded-xl file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-zinc-950 hover:file:bg-zinc-100"
          />
          <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={liveEnabled}
                onChange={(e) => setLiveEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 accent-white"
              />
              Live commentary
            </label>
            {geminiDisabled && (
              <span className="rounded-lg bg-white/5 border border-white/5 px-3 py-1 text-xs text-zinc-500">
                Gemini disabled (mock mode)
              </span>
            )}
            {!ttsAvailable && (
              <span className="rounded-lg bg-white/5 border border-white/5 px-3 py-1 text-xs text-zinc-500">
                ElevenLabs not configured
              </span>
            )}
            {currentLabel && (
              <span className="rounded-lg bg-white/10 border border-white/5 px-3 py-1 text-xs text-zinc-200">
                {currentLabel}
              </span>
            )}
          </div>
          {status && <p className="text-sm text-zinc-300">{status}</p>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              className="w-full rounded-xl border border-white/10 bg-black"
              onPlay={() => setStatus("")}
            />
          ) : (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/30 text-sm text-zinc-500">
              Upload a run video to start live commentary.
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
          <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-3">
            Commentary timeline
          </h2>
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
            {events.length === 0 && (
              <p className="text-sm text-zinc-500">
                Commentary will appear every ~5 seconds while the video plays.
              </p>
            )}
            {events.map((evt) => (
              <div
                key={evt.id}
                className="rounded-xl border border-white/5 bg-black/30 p-3"
              >
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>{formatTime(evt.t)}</span>
                  <span className="uppercase tracking-wide">
                    {evt.meta?.source ?? "mock"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-zinc-200">{evt.text}</p>
                {evt.meta?.tags?.length ? (
                  <p className="mt-2 text-xs text-zinc-500">
                    {evt.meta.tags.join(", ")}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <canvas ref={captureCanvasRef} className="hidden" />
      <canvas ref={hashCanvasRef} className="hidden" />
    </div>
  );
}
