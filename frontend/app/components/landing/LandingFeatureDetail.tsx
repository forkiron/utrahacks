"use client";

import Link from "next/link";

const MOCK_COMPONENTS = [
  { name: "Breadboard", type: "breadboard", count: 1 },
  { name: "DC Motor Drive", type: "dc_motor_drive", count: 1 },
  { name: "Ultrasonic Sensor", type: "ultrasonic_sensor", count: 1 },
  { name: "9V Battery", type: "battery", count: 1 },
  { name: "Arduino Wire", type: "wire", count: 1 },
  { name: "Laser Cut Base", type: "laser_cut_base", count: 1 },
];

export default function LandingFeatureDetail() {
  return (
    <div className="rounded-lg border border-white/20 bg-black shadow-sm p-5 h-full flex flex-col">
      <div className="rounded-lg border border-white/20 bg-black/60 p-4 mb-4">
        <p className="text-sm font-medium text-zinc-400 mb-2">Robot ID</p>
        <p className="font-mono text-white">TEAM84</p>
      </div>

      <div className="rounded-lg border border-white/20 bg-black/60 p-4 mb-4">
        <p className="text-sm font-medium text-zinc-400 mb-2">Finalized by</p>
        <p className="font-mono text-xs text-white">Utrahacks Wallet</p>
      </div>

      <div className="rounded-lg border border-white/20 bg-black/60 p-4 flex-1 min-h-0">
        <p className="text-sm font-medium text-zinc-400 mb-3">Components</p>
        <div className="space-y-0">
          {MOCK_COMPONENTS.map((c, i) => (
            <div
              key={i}
              className="flex justify-between items-center py-2.5 border-b border-zinc-800 last:border-0 text-sm"
            >
              <span className="text-zinc-200">{c.name}</span>
              <span className="text-zinc-500">
                {c.type} × {c.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Link
        href="/verify"
        className="mt-4 text-center text-sm text-zinc-400 hover:text-white transition-colors"
      >
        View details →
      </Link>
    </div>
  );
}
