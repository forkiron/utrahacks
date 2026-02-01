"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AppNavbar from "../../components/AppNavbar";
import ProofVisualization from "../../components/ProofVisualization";

interface InspectionRecord {
  inspection_id: string;
  robot_id: string;
  result: "PASS" | "FAIL";
  violations: string[];
  components: { type: string; name: string; count: number }[];
  evidence_hash: string;
  judge_wallet?: string;
  solana_tx?: string;
  solana_cluster?: string | null;
  encrypted_on_chain?: boolean;
  /** Number of stored evidence images (0..image_count-1). */
  image_count?: number;
  timestamp: number;
}

export default function VerifyPage() {
  const params = useParams();
  const id = params.id as string;
  const [record, setRecord] = useState<InspectionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    fetch(`${apiUrl}/api/inspect/verify/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setRecord(data);
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500/50 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 flex flex-col items-center justify-center px-6">
        <p className="text-red-400 text-lg">
          {error ?? "Inspection not found"}
        </p>
        <Link href="/" className="mt-4 text-amber-400 hover:underline">
          ← Back to home
        </Link>
      </div>
    );
  }

  const isPass = record.result === "PASS";
  const date = new Date(record.timestamp * 1000).toLocaleString();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const imageCount = record.image_count ?? 0;

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans">
      <AppNavbar />

      <main className="max-w-xl mx-auto px-6 py-8 space-y-6">
        <div
          className={`rounded-xl p-6 ${
            isPass
              ? "bg-emerald-500/20 border border-emerald-500/50"
              : "bg-red-500/20 border border-red-500/50"
          }`}
        >
          <p className="text-sm text-zinc-400">Result</p>
          <p
            className={`text-3xl font-bold ${
              isPass ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {record.result}
          </p>
          <p className="text-zinc-500 text-sm mt-1">{record.inspection_id}</p>
          <p className="text-zinc-500 text-sm">{date}</p>
        </div>

        {imageCount > 0 && (
          <div className="rounded-lg border border-white/20 bg-black shadow-sm p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-3">
              Inspection images
            </p>
            <p className="text-sm text-zinc-400 mb-3">
              Photos used for this check (camera → constraints → pass/fail).
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: imageCount }, (_, i) => (
                <a
                  key={i}
                  href={`${apiUrl}/api/inspect/evidence/${record.inspection_id}/${i}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl border border-white/20 overflow-hidden bg-black/30 aspect-square"
                >
                  <img
                    src={`${apiUrl}/api/inspect/evidence/${record.inspection_id}/${i}`}
                    alt={`Evidence ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-lg border border-white/20 bg-black p-4">
          <p className="text-sm font-medium text-zinc-400 mb-2">Robot ID</p>
          <p className="font-mono">{record.robot_id}</p>
        </div>

        {record.judge_wallet && (
          <div className="rounded-lg border border-white/20 bg-black p-4">
            <p className="text-sm font-medium text-zinc-400 mb-2">
              Finalized by
            </p>
            <p className="font-mono text-xs break-all">{record.judge_wallet}</p>
          </div>
        )}

        {record.violations.length > 0 && (
          <div className="rounded-lg border border-white/20 bg-black p-4">
            <p className="text-sm font-medium text-zinc-400 mb-2">Violations</p>
            <ul className="space-y-1 text-red-400">
              {record.violations.map((v, i) => (
                <li key={i}>• {v}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-lg border border-white/20 bg-black p-4">
          <p className="text-sm font-medium text-zinc-400 mb-3">Components</p>
          <div className="space-y-2">
            {record.components.map((c, i) => (
              <div
                key={i}
                className="flex justify-between py-2 border-b border-zinc-800 last:border-0"
              >
                <span>{c.name}</span>
                <span className="text-zinc-500">
                  {c.type} × {c.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        <ProofVisualization
          evidenceHash={record.evidence_hash}
          solanaTx={record.solana_tx}
          solanaCluster={record.solana_cluster}
          encryptedOnChain={record.encrypted_on_chain}
          inspectionId={record.inspection_id}
          compact
        />
      </main>
    </div>
  );
}
