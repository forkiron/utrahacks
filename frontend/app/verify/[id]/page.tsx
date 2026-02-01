"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AppNavbar from "../../components/AppNavbar";

interface InspectionRecord {
  inspection_id: string;
  robot_id: string;
  result: "PASS" | "FAIL";
  violations: string[];
  components: { type: string; name: string; count: number }[];
  evidence_hash: string;
  judge_wallet?: string;
  solana_tx?: string;
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
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500/50 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center px-6">
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
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

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-sm font-medium text-zinc-400 mb-2">Robot ID</p>
          <p className="font-mono">{record.robot_id}</p>
        </div>

        {record.judge_wallet && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-sm font-medium text-zinc-400 mb-2">
              Finalized by
            </p>
            <p className="font-mono text-xs break-all">{record.judge_wallet}</p>
          </div>
        )}

        {record.violations.length > 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-sm font-medium text-zinc-400 mb-2">Violations</p>
            <ul className="space-y-1 text-red-400">
              {record.violations.map((v, i) => (
                <li key={i}>• {v}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
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

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-sm font-medium text-zinc-400 mb-2">
            On-chain proof
          </p>
          <p className="font-mono text-xs break-all text-zinc-500">
            {record.evidence_hash}
          </p>
          {record.solana_tx && (
            <a
              href={`https://explorer.solana.com/tx/${record.solana_tx}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:underline text-sm mt-2 block"
            >
              View transaction on Solana Explorer →
            </a>
          )}
        </div>
      </main>
    </div>
  );
}
