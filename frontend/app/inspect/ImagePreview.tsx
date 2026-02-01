"use client";

import type { CapturedImage } from "./page";

interface ImagePreviewProps {
  images: CapturedImage[];
  onBack: () => void;
  onAnalyze: () => void;
}

export default function ImagePreview({
  images,
  onBack,
  onAnalyze,
}: ImagePreviewProps) {
  return (
    <div className="space-y-6 font-sans">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Review your {images.length} capture{images.length !== 1 ? "s" : ""}. Ready to analyze?
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((img) => (
          <img
            key={img.id}
            src={img.preview}
            alt=""
            className="w-full aspect-square object-cover rounded-xl border border-white/20"
          />
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl font-medium text-sm transition-colors"
        >
          Back
        </button>
        <button
          onClick={onAnalyze}
          className="flex-1 py-3 bg-white text-zinc-950 font-semibold rounded-xl hover:bg-zinc-100 transition-colors text-sm"
        >
          Analyze
        </button>
      </div>
    </div>
  );
}
