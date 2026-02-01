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
    <div className="space-y-6">
      <p className="text-zinc-400 text-sm">
        Review your {images.length} capture{images.length !== 1 ? "s" : ""}.
        Ready to analyze?
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((img) => (
          <img
            key={img.id}
            src={img.preview}
            alt=""
            className="w-full aspect-square object-cover rounded-lg border border-zinc-700"
          />
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium transition-colors"
        >
          Back
        </button>
        <button
          onClick={onAnalyze}
          className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-xl transition-colors"
        >
          Analyze
        </button>
      </div>
    </div>
  );
}
