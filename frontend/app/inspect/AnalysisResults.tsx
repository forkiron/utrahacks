"use client";

import type { AnalysisResult, CapturedImage } from "./page";

interface AnalysisResultsProps {
  analysis: AnalysisResult;
  images: CapturedImage[];
  onBack: () => void;
  onFinalize: () => void;
  robotId: string;
  setRobotId: (v: string) => void;
}

export default function AnalysisResults({
  analysis,
  onBack,
  onFinalize,
  robotId,
  setRobotId,
}: AnalysisResultsProps) {
  const { result, components, detections } = analysis;
  const isPass = result.status === "PASS";

  return (
    <div className="space-y-6 font-sans">
      <div
        className={`rounded-lg p-6 shadow-sm border ${
          isPass
            ? "bg-emerald-500/10 border-emerald-500/30"
            : "bg-red-500/10 border-red-500/30"
        }`}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Result</p>
        <p
          className={`text-2xl font-semibold mt-1 ${
            isPass ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {result.status}
        </p>
        {result.violations.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-zinc-300">
            {result.violations.map((v, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="text-red-400">•</span> {v}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-white/20 bg-black shadow-sm p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-3">
          Detected components
        </p>
        <div className="space-y-2">
          {components.map((c, i) => (
            <div
              key={i}
              className="flex justify-between items-center py-2.5 border-b border-white/5 last:border-0 text-sm"
            >
              <span className="font-medium text-zinc-200">{c.name}</span>
              <span className="text-zinc-500">
                {c.type} × {c.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-white/20 bg-black shadow-sm p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-2">Robot ID</p>
        <input
          type="text"
          value={robotId}
          onChange={(e) => setRobotId(e.target.value)}
          placeholder="e.g. TEAM17-BOT-A"
          className="w-full px-4 py-2.5 bg-black/30 border border-white/20 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20 font-sans text-sm"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl font-medium text-sm transition-colors font-sans"
        >
          Back
        </button>
        <button
          onClick={onFinalize}
          className="flex-1 py-3 bg-white text-zinc-950 font-semibold rounded-xl hover:bg-zinc-100 transition-colors text-sm font-sans"
        >
          Finalize Inspection
        </button>
      </div>
    </div>
  );
}
