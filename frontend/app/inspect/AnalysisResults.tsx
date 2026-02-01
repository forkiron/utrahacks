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
    <div className="space-y-6">
      <div
        className={`rounded-xl p-6 ${
          isPass
            ? "bg-emerald-500/20 border border-emerald-500/50"
            : "bg-red-500/20 border border-red-500/50"
        }`}
      >
        <p className="text-sm font-medium text-zinc-400">Result</p>
        <p
          className={`text-3xl font-bold ${
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

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <p className="text-sm font-medium text-zinc-400 mb-3">
          Detected components
        </p>
        <div className="space-y-2">
          {components.map((c, i) => (
            <div
              key={i}
              className="flex justify-between items-center py-2 border-b border-zinc-800 last:border-0"
            >
              <span className="font-medium">{c.name}</span>
              <span className="text-zinc-500 text-sm">
                {c.type} × {c.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <p className="text-sm font-medium text-zinc-400 mb-2">Robot ID</p>
        <input
          type="text"
          value={robotId}
          onChange={(e) => setRobotId(e.target.value)}
          placeholder="e.g. TEAM17-BOT-A"
          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium transition-colors"
        >
          Back
        </button>
        <button
          onClick={onFinalize}
          className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-xl transition-colors"
        >
          Finalize Inspection
        </button>
      </div>
    </div>
  );
}
