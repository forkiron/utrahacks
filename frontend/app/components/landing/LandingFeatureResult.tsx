"use client";

import Link from "next/link";

export default function LandingFeatureResult() {
  return (
    <div className="rounded-lg border border-white/20 bg-black shadow-sm p-5 h-full flex flex-col">
      {/* Result card */}
      <div className="rounded-xl p-6 bg-emerald-500/10 border border-emerald-500/30 mb-4">
        <p className="text-sm text-zinc-400">Result</p>
        <p className="text-3xl font-bold text-emerald-400 mt-1">PASS</p>
        <p className="text-zinc-500 text-sm mt-1">INS-2026-5966</p>
        <p className="text-zinc-500 text-sm">2/1/2026, 3:59:25 AM</p>
      </div>

      {/* Robot ID */}
      <div className="rounded-lg border border-white/20 bg-black/60 p-4">
        <p className="text-sm font-medium text-zinc-400 mb-2">Robot ID</p>
        <p className="font-mono text-white">TEAM84</p>
      </div>

      <Link
        href="/verify"
        className="mt-4 text-center text-sm text-zinc-400 hover:text-white transition-colors"
      >
        View inspection →
      </Link>
    </div>
  );
}
