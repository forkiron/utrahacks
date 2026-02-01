"use client";

import {
  useRef,
  useState,
  useCallback,
  useLayoutEffect,
  useEffect,
} from "react";
import type { CapturedImage } from "./page";

const DETECT_INTERVAL_MS = 3000;

export interface FeedFilters {
  contrast: number;
  bw: boolean;
  backgroundBlur: boolean;
}

function applyFeedFilters(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  filters: FeedFilters
): void {
  if (filters.contrast === 1 && !filters.bw) return;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  if (filters.contrast !== 1) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.max(0, Math.min(255, (data[i] - 128) * filters.contrast + 128));
      data[i + 1] = Math.max(0, Math.min(255, (data[i + 1] - 128) * filters.contrast + 128));
      data[i + 2] = Math.max(0, Math.min(255, (data[i + 2] - 128) * filters.contrast + 128));
    }
  }
  if (filters.bw) {
    for (let i = 0; i < data.length; i += 4) {
      const g = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) | 0;
      data[i] = data[i + 1] = data[i + 2] = Math.max(0, Math.min(255, g));
    }
  }
  ctx.putImageData(imageData, 0, 0);
}
const DETECT_INTERVAL_YOLO_MS = 2000;
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface LiveDetection {
  label: string;
  confidence: number;
  bbox: [number, number, number, number];
}

interface CameraCaptureProps {
  onComplete: (images: CapturedImage[]) => void;
}

export default function CameraCapture({ onComplete }: CameraCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [captured, setCaptured] = useState<CapturedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [liveDetections, setLiveDetections] = useState<LiveDetection[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [useYoloWheel, setUseYoloWheel] = useState(false);
  const [minConfidence, setMinConfidence] = useState(0.08);
  const [filters, setFilters] = useState<FeedFilters>({
    contrast: 1.2,
    bw: false,
    backgroundBlur: false,
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const feedCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const detectIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef<number | null>(null);
  const liveDetectionsRef = useRef<LiveDetection[]>([]);
  liveDetectionsRef.current = liveDetections;

  useLayoutEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(console.error);
    }
  }, [stream]);

  // Live detection loop: send current frame to backend and draw bboxes
  const runDetection = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !stream) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    applyFeedFilters(ctx, w, h, filters);
    return new Promise<void>((resolve) => {
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            resolve();
            return;
          }
          try {
            const form = new FormData();
            form.append("image", blob, "frame.jpg");
            const endpoint = useYoloWheel
              ? `${API_URL}/api/inspect/detect-wheel?conf=${encodeURIComponent(minConfidence)}`
              : `${API_URL}/api/inspect/detect`;
            const res = await fetch(endpoint, {
              method: "POST",
              body: form,
            });
            if (!res.ok) {
              resolve();
              return;
            }
            const data = await res.json();
            const raw = (data.detections ?? []) as LiveDetection[];
            const filtered = useYoloWheel
              ? raw.filter((d) => (d.confidence ?? 0) >= minConfidence)
              : raw;
            setLiveDetections(filtered);
          } catch {
            setLiveDetections([]);
          }
          resolve();
        },
        "image/jpeg",
        0.85
      );
    });
  }, [stream, useYoloWheel, minConfidence, filters]);

  // Start/stop detection interval when stream is on/off
  useEffect(() => {
    if (!stream) {
      if (detectIntervalRef.current) {
        clearInterval(detectIntervalRef.current);
        detectIntervalRef.current = null;
      }
      setLiveDetections([]);
      setDetecting(false);
      return;
    }
    setDetecting(true);
    runDetection(); // run once immediately
    const interval = useYoloWheel ? DETECT_INTERVAL_YOLO_MS : DETECT_INTERVAL_MS;
    detectIntervalRef.current = setInterval(runDetection, interval);
    return () => {
      if (detectIntervalRef.current) {
        clearInterval(detectIntervalRef.current);
        detectIntervalRef.current = null;
      }
      setDetecting(false);
    };
  }, [stream, runDetection, useYoloWheel, minConfidence]);

  // Live feed canvas: draw video + filters; optional blur bg and keep detections sharp
  useEffect(() => {
    const video = videoRef.current;
    const feedCanvas = feedCanvasRef.current;
    const container = containerRef.current;
    if (!stream || !video || !feedCanvas || !container) return;

    let off: HTMLCanvasElement | null = null;
    let blurCanvas: HTMLCanvasElement | null = null;
    const BLUR_PX = 18;

    const tick = () => {
      if (!video.videoWidth || !video.videoHeight) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      if (!cw || !ch) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      if (!off || off.width !== vw || off.height !== vh) {
        off = document.createElement("canvas");
        off.width = vw;
        off.height = vh;
      }
      const offCtx = off.getContext("2d", { willReadFrequently: true });
      if (!offCtx) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      offCtx.drawImage(video, 0, 0);
      applyFeedFilters(offCtx, vw, vh, filters);
      feedCanvas.width = cw;
      feedCanvas.height = ch;
      const scale = Math.max(cw / vw, ch / vh);
      const offsetX = (cw - scale * vw) / 2;
      const offsetY = (ch - scale * vh) / 2;
      const fctx = feedCanvas.getContext("2d", { willReadFrequently: true });
      if (!fctx) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      if (filters.backgroundBlur) {
        if (!blurCanvas || blurCanvas.width !== vw || blurCanvas.height !== vh) {
          blurCanvas = document.createElement("canvas");
          blurCanvas.width = vw;
          blurCanvas.height = vh;
        }
        const bctx = blurCanvas.getContext("2d", { willReadFrequently: true });
        if (bctx) {
          bctx.filter = `blur(${BLUR_PX}px)`;
          bctx.drawImage(off, 0, 0);
          bctx.filter = "none";
        }
        fctx.drawImage(blurCanvas, 0, 0, vw, vh, offsetX, offsetY, scale * vw, scale * vh);
        const dets = liveDetectionsRef.current;
        dets.forEach((d) => {
          if (!d.bbox || d.bbox.length < 4) return;
          const [x, y, w, h] = d.bbox;
          const pad = 8;
          const sx = Math.max(0, x - pad);
          const sy = Math.max(0, y - pad);
          const sw = Math.min(vw - sx, w + pad * 2);
          const sh = Math.min(vh - sy, h + pad * 2);
          if (sw <= 0 || sh <= 0) return;
          fctx.drawImage(
            off,
            sx, sy, sw, sh,
            offsetX + sx * scale, offsetY + sy * scale, sw * scale, sh * scale
          );
        });
      } else {
        fctx.drawImage(off, 0, 0, vw, vh, offsetX, offsetY, scale * vw, scale * vh);
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [stream, filters]);

  // Draw bounding boxes on overlay canvas (object-cover scale)
  useEffect(() => {
    const overlay = overlayRef.current;
    const video = videoRef.current;
    const container = containerRef.current;
    if (!overlay || !container || !stream) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (!cw || !ch) return;
    overlay.width = cw;
    overlay.height = ch;
    const ctx = overlay.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.clearRect(0, 0, cw, ch);

    if (!video || liveDetections.length === 0) return;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return;
    const scale = Math.max(cw / vw, ch / vh);
    const offsetX = (cw - scale * vw) / 2;
    const offsetY = (ch - scale * vh) / 2;

    liveDetections.forEach((d) => {
      if (!d.bbox || d.bbox.length < 4) return;
      const [x, y, w, h] = d.bbox;
      const dx = offsetX + x * scale;
      const dy = offsetY + y * scale;
      const dw = w * scale;
      const dh = h * scale;

      ctx.strokeStyle = "rgba(251, 191, 36, 0.95)";
      ctx.lineWidth = 3;
      ctx.strokeRect(dx, dy, dw, dh);

      const label = `${d.label} ${Math.round((d.confidence ?? 0) * 100)}%`;
      ctx.font = "bold 14px system-ui, sans-serif";
      const metrics = ctx.measureText(label);
      const tw = metrics.width + 8;
      const th = 20;
      ctx.fillStyle = "rgba(251, 191, 36, 0.95)";
      ctx.fillRect(dx, dy - th, tw, th);
      ctx.fillStyle = "#18181b";
      ctx.fillText(label, dx + 4, dy - 6);
    });
  }, [liveDetections, stream]);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const s = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      setStream(s);
    } catch (e) {
      console.error("Camera error:", e);
      setError("Camera access denied. Use file upload instead.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
  }, [stream]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    applyFeedFilters(ctx, w, h, filters);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        setCaptured((prev) => [
          ...prev,
          { blob, preview: url, id: crypto.randomUUID() },
        ]);
      },
      "image/jpeg",
      0.9
    );
  }, [filters]);

  const removeImage = (id: string) => {
    setCaptured((prev) => prev.filter((i) => i.id !== id));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file);
      setCaptured((prev) => [
        ...prev,
        { blob: file, preview: url, id: crypto.randomUUID() },
      ]);
    });
    e.target.value = "";
  };

  const handleComplete = () => {
    stopCamera();
    onComplete(captured);
  };

  return (
    <div className="space-y-6 font-sans">
      <div
        ref={containerRef}
        className="rounded-lg border border-white/10 bg-black shadow-sm overflow-hidden aspect-video flex items-center justify-center relative"
      >
        {!stream && (
          <div className="text-center p-8">
            <button
              onClick={startCamera}
              className="px-6 py-3 bg-white text-zinc-950 font-semibold rounded-xl hover:bg-zinc-100 transition-colors text-sm"
            >
              Start Camera
            </button>
            <p className="text-zinc-500 text-sm mt-4">
              Live detection runs when camera is on. Snapshot only when you want
              to capture.
            </p>
            <label className="mt-2 inline-block px-6 py-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl cursor-pointer text-sm">
              Upload from device
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
            {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
          </div>
        )}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover ${
            stream ? "block" : "hidden"
          }`}
          style={stream ? { opacity: 0, position: "absolute", pointerEvents: "none" } : undefined}
        />
        <canvas
          ref={feedCanvasRef}
          className={`absolute inset-0 w-full h-full pointer-events-none ${
            stream ? "block" : "hidden"
          }`}
          style={{ objectFit: "cover" }}
        />
        <canvas
          ref={overlayRef}
          className={`absolute inset-0 w-full h-full pointer-events-none ${
            stream ? "block" : "hidden"
          }`}
          style={{ objectFit: "cover" }}
        />
        {stream && (
          <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-2 z-10">
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs bg-black/40 backdrop-blur px-3 py-1.5 rounded-lg border border-white/5">
              <span className="text-zinc-500 shrink-0">Filters:</span>
              <label className="flex items-center gap-1.5 text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.contrast > 1}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, contrast: e.target.checked ? 1.3 : 1 }))
                  }
                  className="rounded border-zinc-500"
                />
                Contrast
              </label>
              <label className="flex items-center gap-1.5 text-zinc-300 cursor-pointer" title="Blur background, keep detected objects sharp">
                <input
                  type="checkbox"
                  checked={filters.backgroundBlur}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, backgroundBlur: e.target.checked }))
                  }
                  className="rounded border-zinc-500"
                />
                Blur bg
              </label>
              <label className="flex items-center gap-1.5 text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.bw}
                  onChange={(e) => setFilters((f) => ({ ...f, bw: e.target.checked }))}
                  className="rounded border-zinc-500"
                />
                B&W
              </label>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <label className="flex items-center gap-2 text-xs text-zinc-300 bg-black/40 backdrop-blur px-3 py-1.5 rounded-lg border border-white/5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useYoloWheel}
                  onChange={(e) => setUseYoloWheel(e.target.checked)}
                  className="rounded border-zinc-500"
                />
                Wheel (YOLO) — live test
              </label>
              {useYoloWheel && (
                <label className="flex items-center gap-2 text-xs text-zinc-400 bg-black/40 backdrop-blur px-3 py-1.5 rounded-lg border border-white/5 w-full max-w-[220px]" title="Lower = more boxes (5–15% is fine for demo)">
                  <span className="shrink-0">Min conf:</span>
                  <input
                    type="range"
                    min={0.01}
                    max={0.9}
                    step={0.01}
                    value={minConfidence}
                    onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                    className="flex-1 h-2 accent-amber-500"
                  />
                  <span className="shrink-0 w-8 text-right">{Math.round(minConfidence * 100)}%</span>
                </label>
              )}
            </div>
            {detecting && (
              <span className="text-xs text-zinc-200 bg-black/40 backdrop-blur px-2 py-1 rounded-lg border border-white/5">
                {useYoloWheel ? "Detecting wheels…" : "Detecting components…"}
              </span>
            )}
            <button
              onClick={capture}
              className="w-16 h-16 rounded-full bg-white border-2 border-white/20 hover:scale-105 transition-transform shadow-lg"
              title="Snapshot (capture this frame)"
            />
            <span className="text-xs text-zinc-400">Snapshot</span>
          </div>
        )}
      </div>

      {captured.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-black shadow-sm p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-2">
            {captured.length} snapshot{captured.length !== 1 ? "s" : ""} (3–5
            recommended)
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {captured.map((img) => (
              <div key={img.id} className="relative shrink-0">
                <img
                  src={img.preview}
                  alt=""
                  className="w-20 h-20 object-cover rounded-lg border border-white/10"
                />
                <button
                  onClick={() => removeImage(img.id)}
                  className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full text-white text-sm leading-none"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!stream && captured.length > 0 && (
        <div className="flex gap-2">
          <label className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-center cursor-pointer text-sm font-sans">
            Add more images
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>
      )}

      {stream && (
        <button
          onClick={stopCamera}
          className="w-full py-2 text-zinc-500 hover:text-zinc-300 text-sm font-sans"
        >
          Stop camera
        </button>
      )}

      {captured.length >= 1 && (
        <button
          onClick={handleComplete}
          className="w-full py-4 bg-white text-zinc-950 font-semibold rounded-xl hover:bg-zinc-100 transition-colors text-sm font-sans"
        >
          Continue with {captured.length} image
          {captured.length !== 1 ? "s" : ""}
        </button>
      )}
    </div>
  );
}
