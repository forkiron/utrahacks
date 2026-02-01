"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppNavbar from "../components/AppNavbar";

interface InspectionRecord {
  inspection_id: string;
  robot_id: string;
  result: "PASS" | "FAIL";
  evidence_hash: string;
  solana_tx?: string;
  solana_cluster?: string | null;
  encrypted_on_chain?: boolean;
  timestamp: number;
}

export default function VerifyLandingPage() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [list, setList] = useState<InspectionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    fetch(`${apiUrl}/api/inspect/list`)
      .then((r) => r.json())
      .then((data) => setList(Array.isArray(data) ? data : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (id.trim()) router.push(`/verify/${id.trim()}`);
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-zinc-100 font-sans">
      <AppNavbar />
      <main className="max-w-2xl mx-auto px-6 py-8 space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Verify Inspection</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Check if a bot is verified — view saved inspections or look up by ID
          </p>
        </div>

        {/* Look up by ID */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-3">
            Look up by ID
          </p>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="e.g. INS-2026-8296"
              className="flex-1 px-4 py-2.5 bg-black/30 border border-white/10 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20 text-sm"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-white text-zinc-950 font-semibold rounded-xl hover:bg-zinc-100 transition-colors text-sm"
            >
              Look up
            </button>
          </form>
        </div>

        {/* Saved inspections / verified bots list */}
        <div>
          <h2 className="text-sm font-semibold text-zinc-200 mb-3">
            Saved inspections
          </h2>
          <p className="text-xs text-zinc-500 mb-4">
            Bots that have been verified — check on-chain proof for each
          </p>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          ) : list.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-8 text-center text-zinc-500 text-sm">
              No inspections yet. Finalize one from Bot Security to see it here.
            </div>
          ) : (
            <ul className="space-y-3">
              {list.map((record) => {
                const isPass = record.result === "PASS";
                const date = new Date(record.timestamp * 1000).toLocaleString();
                const cluster =
                  record.solana_cluster !== undefined
                    ? (record.solana_cluster ?? "")
                    : (process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet");
                const explorerUrl = record.solana_tx
                  ? `https://explorer.solana.com/tx/${record.solana_tx}${cluster ? `?cluster=${cluster}` : ""}`
                  : null;
                return (
                  <li key={record.inspection_id}>
                    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 hover:bg-white/[0.07] transition-colors">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-mono font-semibold text-zinc-100">
                            {record.inspection_id}
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {record.robot_id} · {date}
                          </p>
                          <p
                            className={`inline-block mt-2 px-2.5 py-0.5 rounded-lg text-xs font-medium ${
                              isPass
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {record.result}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/verify/${record.inspection_id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-sm text-zinc-200 hover:text-white transition-colors"
                          >
                            View details
                          </Link>
                          {explorerUrl && (
                            <a
                              href={explorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-sm text-zinc-200 hover:text-white transition-colors"
                            >
                              Solana
                            </a>
                          )}
                        </div>
                      </div>
                      <p className="font-mono text-xs text-zinc-500 mt-3 truncate">
                        {record.evidence_hash}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
