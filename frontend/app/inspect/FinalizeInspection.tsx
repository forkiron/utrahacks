"use client";

import { useState } from "react";
import type { AnalysisResult, CapturedImage } from "./page";
import ProofVisualization from "../components/ProofVisualization";

interface FinalizeInspectionProps {
  robotId: string;
  analysis: AnalysisResult;
  images: CapturedImage[];
  onDone: () => void;
}

export default function FinalizeInspection({
  robotId,
  analysis,
  images,
  onDone,
}: FinalizeInspectionProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    inspection_id: string;
    evidence_hash: string;
    solana_tx: string | null;
    encrypted_on_chain?: boolean;
    image_count?: number;
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
        demo_mode: true,
      };

      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
      const formData = new FormData();
      formData.append("payload", JSON.stringify(payload));
      images.forEach((img, i) => {
        formData.append("images", img.blob, `image-${i}.jpg`);
      });

      const res = await fetch(`${apiUrl}/api/inspect/finalize`, {
        method: "POST",
        body: formData,
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
      <div className="space-y-6 font-sans">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-8 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Inspection finalized</p>
          <p className="text-xl font-mono font-semibold mt-2 text-zinc-100">
            {result.inspection_id}
          </p>
          <p className="text-xs text-zinc-500 mt-4">
            Verification: /verify/{result.inspection_id}
          </p>
        </div>

        <ProofVisualization
          evidenceHash={result.evidence_hash}
          solanaTx={result.solana_tx}
          encryptedOnChain={result.encrypted_on_chain}
          inspectionId={result.inspection_id}
        />

        <button
          onClick={onDone}
          className="w-full py-3 bg-white text-zinc-950 font-semibold rounded-xl hover:bg-zinc-100 transition-colors text-sm"
        >
          New Inspection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Finalize this inspection to create an immutable on-chain record.
      </p>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-white/10 p-4 text-red-400 text-sm backdrop-blur">
          {error}
        </div>
      )}

      <button
        onClick={handleFinalize}
        disabled={loading}
        className="w-full py-4 bg-white text-zinc-950 font-semibold rounded-xl hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
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
