"use client";

import Link from "next/link";

const MOCK_ENTRIES = [
  {
    inspection_id: "INS-2026-5836",
    robot_id: "TEAM84",
    date: "2/1/2026, 4:10:00 AM",
    result: "PASS" as const,
    evidence_hash: "0x53f2a6fa04a4cce9f3c42a2c589fa3446f084b0f282630962dc1ae29acc50df2",
  },
  {
    inspection_id: "INS-2026-3638",
    robot_id: "UNKNOWN",
    date: "2/1/2026, 4:09:33 AM",
    result: "PASS" as const,
    evidence_hash: "0x8a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef12",
  },
];

export default function LandingFeatureVerify() {
  return (
    <div className="rounded-lg border border-white/20 bg-black shadow-sm p-5 h-full flex flex-col">
      <div className="text-center mb-5">
        <h2 className="text-2xl font-bold text-white">Verify Inspection</h2>
        <p className="text-zinc-500 text-sm mt-1">
          Check if a bot is verified — view saved inspections or look up by ID
        </p>
      </div>

      <div className="rounded-lg border border-white/20 bg-black/40 shadow-sm p-4 mb-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-3">
          Look up by ID
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            placeholder="e.g. INS-2026-8296"
            className="flex-1 px-4 py-2.5 bg-black/30 border border-white/20 rounded-xl text-zinc-400 placeholder:text-zinc-600 text-sm"
          />
          <span className="px-4 py-2.5 bg-white text-zinc-950 font-semibold rounded-xl text-sm inline-flex items-center">
            Look up
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <h3 className="text-sm font-semibold text-zinc-200 mb-2">
          Recent verifications
        </h3>
        <p className="text-xs text-zinc-500 mb-3">
          Bots that have been verified — check on-chain proof for each
        </p>
        <ul className="space-y-3">
          {MOCK_ENTRIES.map((record) => (
            <li key={record.inspection_id}>
              <div className="rounded-lg border border-white/20 bg-black/60 shadow-sm p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono font-semibold text-zinc-100">
                      {record.inspection_id}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {record.robot_id} · {record.date}
                    </p>
                    <span className="inline-block mt-2 px-2.5 py-0.5 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-400">
                      {record.result}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-sm text-zinc-200">
                      View details
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-sm text-zinc-200">
                      Solana
                    </span>
                  </div>
                </div>
                <p className="font-mono text-xs text-zinc-500 mt-3 break-all">
                  {record.evidence_hash}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <Link
        href="/verify"
        className="mt-4 text-center text-sm text-zinc-400 hover:text-white transition-colors"
      >
        Open Verify →
      </Link>
    </div>
  );
}
