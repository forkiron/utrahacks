"use client";

import { useState } from "react";
import type { AnalysisResult, CapturedImage } from "./page";

interface FinalizeInspectionProps {
  robotId: string;
  analysis: AnalysisResult;
  images: CapturedImage[];
  onDone: () => void;
}

export default function FinalizeInspection({
  robotId,
  analysis,
  onDone,
}: FinalizeInspectionProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    inspection_id: string;
    evidence_hash: string;
    solana_tx: string | null;
    qr_data: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFinalize = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        robotId: robotId || "UNKNOWN",
        components: analysis.components,
        result: analysis.result.status,
        violations: analysis.result.violations,
        image_hash: analysis.image_hash,
        analysis_hash: analysis.analysis_hash,
        nonce: Date.now(),
      };

      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
      const res = await fetch(`${apiUrl}/api/inspect/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          demo_mode: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Finalization failed");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="space-y-6 text-center">
        <div className="rounded-xl border border-emerald-500/50 bg-emerald-500/10 p-8">
          <p className="text-emerald-400 font-semibold text-lg">
            Inspection finalized
          </p>
          <p className="text-2xl font-mono font-bold mt-2 text-zinc-100">
            {result.inspection_id}
          </p>
          <p className="text-sm text-zinc-500 mt-1">
            Evidence hash: {result.evidence_hash.slice(0, 18)}…
          </p>
          {result.solana_tx && (
            <a
              href={`https://explorer.solana.com/tx/${result.solana_tx}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:underline text-sm mt-2 block"
            >
              View on Solana Explorer →
            </a>
          )}
          <p className="text-xs text-zinc-500 mt-4">
            Verification: /verify/{result.inspection_id}
          </p>
        </div>

        <button
          onClick={onDone}
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-xl"
        >
          New Inspection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-zinc-400 text-sm">
        Finalize this inspection to create an immutable on-chain record.
      </p>

      {error && (
        <div className="rounded-lg bg-red-500/20 border border-red-500/50 p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleFinalize}
        disabled={loading}
        className="w-full py-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-semibold rounded-xl transition-colors"
      >
        {loading ? "Finalizing…" : "Finalize Inspection"}
      </button>

      <button
        onClick={onDone}
        className="w-full py-2 text-zinc-500 hover:text-zinc-400 text-sm"
      >
        Cancel
      </button>
    </div>
  );
}
