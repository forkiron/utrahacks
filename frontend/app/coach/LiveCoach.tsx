"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const CHECK_INTERVAL_MS = 1000;
const MIN_SEND_INTERVAL_MS = 5000;
const MIN_SPEAK_INTERVAL_MS = 3000;
const AUDIO_QUEUE_LIMIT = 3;
const HASH_SIZE = 16;
const PIXEL_DIFF_THRESHOLD = 0.08;

interface CommentaryEvent {
  eventId: string;
  t: number;
  text: string;
  meta?: {
    source: "mock" | "gemini";
    latencyMs?: number;
    tags?: string[];
  };
}

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function computeFrameChangeScore(
  data: Uint8ClampedArray,
  prev: Uint8ClampedArray | null
): number {
  if (!prev || data.length !== prev.length) return 1;
  let diff = 0;
  const step = 4;
  for (let i = 0; i < data.length; i += step) {
    const r = Math.abs((data[i] ?? 0) - (prev[i] ?? 0));
    const g = Math.abs((data[i + 1] ?? 0) - (prev[i + 1] ?? 0));
    const b = Math.abs((data[i + 2] ?? 0) - (prev[i + 2] ?? 0));
    diff += (r + g + b) / (3 * 255);
  }
  return diff / (data.length / step);
}

export default function LiveCoach() {
  const apiUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
    []
  );
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [started, setStarted] = useState(false);
  const [commentaryOn, setCommentaryOn] = useState(true);
  const [events, setEvents] = useState<CommentaryEvent[]>([]);
  const [status, setStatus] = useState("");
  const [geminiEnabled, setGeminiEnabled] = useState<boolean | null>(null);
  const [elevenLabsEnabled, setElevenLabsEnabled] = useState<boolean | null>(null);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hashCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sessionIdRef = useRef<string>("");
  const sessionStartRef = useRef<number>(0);
  const lastSentRef = useRef<number>(0);
  const lastFrameDataRef = useRef<Uint8ClampedArray | null>(null);
  const pendingRef = useRef(false);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const playingRef = useRef(false);
  const lastSpokenRef = useRef<number>(0);

  const playNext = useCallback(() => {
    if (playingRef.current) return;
    const next = audioQueueRef.current.shift();
    if (!next || !audioRef.current) return;
    const now = Date.now();
    const sinceLast = now - lastSpokenRef.current;
    if (sinceLast < MIN_SPEAK_INTERVAL_MS && lastSpokenRef.current > 0) {
      audioQueueRef.current.unshift(next);
      const delay = MIN_SPEAK_INTERVAL_MS - sinceLast;
      setTimeout(playNext, delay);
      return;
    }
    const audio = audioRef.current;
    audio.src = next;
    playingRef.current = true;
    lastSpokenRef.current = Date.now();
    audio.play().catch(() => {
      playingRef.current = false;
    });
  }, []);

  const enqueueAudio = useCallback(
    (url: string) => {
      const now = Date.now();
      const elapsed = now - lastSpokenRef.current;
      if (playingRef.current && elapsed < MIN_SPEAK_INTERVAL_MS) {
        if (audioQueueRef.current.length >= AUDIO_QUEUE_LIMIT) {
          const dropped = audioQueueRef.current.shift();
          if (dropped) URL.revokeObjectURL(dropped);
        }
        audioQueueRef.current.push(url);
        return;
      }
      if (!playingRef.current && audioQueueRef.current.length === 0) {
        audioQueueRef.current.push(url);
        playNext();
        return;
      }
      if (audioQueueRef.current.length >= AUDIO_QUEUE_LIMIT) {
        const dropped = audioQueueRef.current.shift();
        if (dropped) URL.revokeObjectURL(dropped);
      }
      audioQueueRef.current.push(url);
      if (!playingRef.current) playNext();
    },
    [playNext]
  );

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
  }, [playNext]);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(console.error);
    }
  }, [stream]);

  const captureAndMaybeSend = useCallback(async () => {
    const video = videoRef.current;
    const captureCanvas = captureCanvasRef.current;
    const hashCanvas = hashCanvasRef.current;
    if (!video || !captureCanvas || !hashCanvas || !started || !stream) return;
    if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;
    if (!commentaryOn || pendingRef.current) return;

    const now = Date.now();
    const elapsed = now - lastSentRef.current;
    if (elapsed < MIN_SEND_INTERVAL_MS) return;

    const scale = Math.min(1, 640 / video.videoWidth);
    const w = Math.max(1, Math.round(video.videoWidth * scale));
    const h = Math.max(1, Math.round(video.videoHeight * scale));
    captureCanvas.width = w;
    captureCanvas.height = h;
    const ctx = captureCanvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);

    hashCanvas.width = HASH_SIZE;
    hashCanvas.height = HASH_SIZE;
    const hctx = hashCanvas.getContext("2d");
    if (!hctx) return;
    hctx.drawImage(captureCanvas, 0, 0, HASH_SIZE, HASH_SIZE);
    const imageData = hctx.getImageData(0, 0, HASH_SIZE, HASH_SIZE);
    const changeScore = computeFrameChangeScore(
      imageData.data,
      lastFrameDataRef.current
    );
    lastFrameDataRef.current = imageData.data.slice();

    if (changeScore < PIXEL_DIFF_THRESHOLD) return;

    lastSentRef.current = now;
    pendingRef.current = true;

    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        captureCanvas.toBlob(resolve, "image/jpeg", 0.7)
      );
      if (!blob) {
        pendingRef.current = false;
        return;
      }

      const formData = new FormData();
      formData.append("image", blob, "frame.jpg");
      formData.append("t", String(now - sessionStartRef.current));
      formData.append("sessionId", sessionIdRef.current);

      const res = await fetch(`${apiUrl}/api/coach/frame`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        setStatus("Frame analysis failed.");
        pendingRef.current = false;
        return;
      }

      const data = (await res.json()) as CommentaryEvent;
      setEvents((prev) => [...prev, data]);
      setGeminiEnabled(data.meta?.source === "gemini");
      if (data.meta?.latencyMs != null) setLastLatencyMs(data.meta.latencyMs);
      setStatus("");

      if (elevenLabsEnabled !== false) {
        const ttsRes = await fetch(`${apiUrl}/api/coach/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: data.text }),
        });
        if (ttsRes.ok) {
          setElevenLabsEnabled(true);
          const audioBlob = await ttsRes.blob();
          const url = URL.createObjectURL(audioBlob);
          enqueueAudio(url);
        } else if (ttsRes.status === 400 || ttsRes.status === 501) {
          setElevenLabsEnabled(false);
          setStatus("ElevenLabs not configured. Text-only commentary.");
        }
      }
    } catch (err) {
      console.error(err);
      setStatus("Backend unavailable. Check connection.");
    } finally {
      pendingRef.current = false;
    }
  }, [
    started,
    stream,
    commentaryOn,
    apiUrl,
    elevenLabsEnabled,
    enqueueAudio,
  ]);

  useEffect(() => {
    if (!started || !commentaryOn) {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      return;
    }
    checkIntervalRef.current = setInterval(
      captureAndMaybeSend,
      CHECK_INTERVAL_MS
    );
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [started, commentaryOn, captureAndMaybeSend]);

  const handleStart = useCallback(async () => {
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      setStream(media);
      sessionIdRef.current = crypto.randomUUID();
      sessionStartRef.current = Date.now();
      lastSentRef.current = 0;
      lastFrameDataRef.current = null;
      setStarted(true);
      setEvents([]);
      setStatus("");
      setGeminiEnabled(null);
      setLastLatencyMs(null);

      try {
        const introRes = await fetch(`${apiUrl}/api/coach/intro/audio`, {
          method: "GET",
        });
        if (introRes.ok) {
          const introBlob = await introRes.blob();
          const introUrl = URL.createObjectURL(introBlob);
          audioQueueRef.current.unshift(introUrl);
          if (!playingRef.current) playNext();
        } else if (introRes.status === 501) {
          setElevenLabsEnabled(false);
        }
      } catch {
        // Intro audio optional; continue without it
      }
    } catch (err) {
      console.error(err);
      setStatus("Could not access webcam. Check permissions.");
    }
  }, [apiUrl, playNext]);

  const handleStop = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setStarted(false);
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    audioQueueRef.current.forEach((url) => URL.revokeObjectURL(url));
    audioQueueRef.current = [];
  }, [stream]);

  return (
    <div className="space-y-6 font-sans">
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={started ? handleStop : handleStart}
              className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-100 disabled:opacity-50 transition-colors"
            >
              {started ? "Stop" : "Start"}
            </button>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={commentaryOn}
                onChange={(e) => setCommentaryOn(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 accent-white"
                disabled={!started}
              />
              Commentary On
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
            {geminiEnabled === true && (
              <span className="rounded-lg bg-white/10 border border-white/5 px-3 py-1 text-xs text-zinc-200">
                Gemini enabled
              </span>
            )}
            {geminiEnabled === false && (
              <span className="rounded-lg bg-white/5 border border-white/5 px-3 py-1 text-xs text-zinc-500">
                Gemini disabled (mock)
              </span>
            )}
            {elevenLabsEnabled === false && (
              <span className="rounded-lg bg-white/5 border border-white/5 px-3 py-1 text-xs text-zinc-400">
                ElevenLabs disabled
              </span>
            )}
            {lastLatencyMs != null && (
              <span className="rounded-lg bg-white/5 border border-white/5 px-3 py-1 text-xs text-zinc-500">
                Last latency: {lastLatencyMs}ms
              </span>
            )}
            <span className="rounded-lg bg-white/5 border border-white/5 px-3 py-1 text-xs text-zinc-500">
              Capture interval: {MIN_SEND_INTERVAL_MS / 1000}s
            </span>
          </div>
          {status && (
            <p className="text-sm text-zinc-300">{status}</p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Webcam preview
          </h2>
          {started && stream ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full rounded-xl border border-white/10 bg-black aspect-video object-cover"
            />
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/30 text-sm text-zinc-500">
              Click Start to open your webcam.
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Commentary
          </h2>
          <div className="max-h-[420px] space-y-3 overflow-y-auto pr-2">
            {events.length === 0 && (
              <p className="text-sm text-zinc-500">
                Commentary appears here when the scene changes (about every 5s).
              </p>
            )}
            {events.map((evt) => (
              <div
                key={evt.eventId}
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

      <canvas ref={captureCanvasRef} className="hidden" aria-hidden />
      <canvas ref={hashCanvasRef} className="hidden" aria-hidden />
    </div>
  );
}
