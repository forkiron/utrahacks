"use client";

import {
  useRef,
  useState,
  useCallback,
  useLayoutEffect,
  useEffect,
} from "react";
import type { CapturedImage } from "./page";

const DETECT_INTERVAL_MS = 600;
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const detectIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
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
            const res = await fetch(`${API_URL}/api/inspect/detect`, {
              method: "POST",
              body: form,
            });
            if (!res.ok) {
              resolve();
              return;
            }
            const data = await res.json();
            setLiveDetections(data.detections ?? []);
          } catch {
            setLiveDetections([]);
          }
          resolve();
        },
        "image/jpeg",
        0.85
      );
    });
  }, [stream]);

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
    detectIntervalRef.current = setInterval(runDetection, DETECT_INTERVAL_MS);
    return () => {
      if (detectIntervalRef.current) {
        clearInterval(detectIntervalRef.current);
        detectIntervalRef.current = null;
      }
      setDetecting(false);
    };
  }, [stream, runDetection]);

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
    const ctx = overlay.getContext("2d");
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
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);
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
  }, []);

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
    <div className="space-y-6">
      <div
        ref={containerRef}
        className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden aspect-video flex items-center justify-center relative"
      >
        {!stream && (
          <div className="text-center p-8">
            <button
              onClick={startCamera}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-lg transition-colors"
            >
              Start Camera
            </button>
            <p className="text-zinc-500 text-sm mt-4">
              Live detection runs when camera is on. Snapshot only when you want
              to capture.
            </p>
            <label className="mt-2 inline-block px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg cursor-pointer text-sm">
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
            {detecting && (
              <span className="text-xs text-amber-400/90 bg-zinc-900/80 px-2 py-1 rounded">
                Detecting components…
              </span>
            )}
            <button
              onClick={capture}
              className="w-16 h-16 rounded-full bg-white/90 border-4 border-zinc-800 hover:scale-105 transition-transform"
              title="Snapshot (capture this frame)"
            />
            <span className="text-xs text-zinc-400">Snapshot</span>
          </div>
        )}
      </div>

      {captured.length > 0 && (
        <div>
          <p className="text-sm text-zinc-400 mb-2">
            {captured.length} snapshot{captured.length !== 1 ? "s" : ""} (3–5
            recommended)
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {captured.map((img) => (
              <div key={img.id} className="relative shrink-0">
                <img
                  src={img.preview}
                  alt=""
                  className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
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
          <label className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-center cursor-pointer text-sm">
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
          className="w-full py-2 text-zinc-400 hover:text-zinc-300 text-sm"
        >
          Stop camera
        </button>
      )}

      {captured.length >= 1 && (
        <button
          onClick={handleComplete}
          className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-xl transition-colors"
        >
          Continue with {captured.length} image
          {captured.length !== 1 ? "s" : ""}
        </button>
      )}
    </div>
  );
}
