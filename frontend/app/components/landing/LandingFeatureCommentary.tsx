"use client";

import Link from "next/link";

const MOCK_ENTRIES = [
  { time: "0:00", text: "Track analysis and introduction", tags: null },
  { time: "0:01", text: "Left pull — stay centered.", tags: "dc_motor, arduino_uno" },
  { time: "0:07", text: "Something in the way — slow it down.", tags: "dc_motor, arduino_uno" },
  { time: "0:12", text: "Obstacle ahead — stay centered.", tags: "dc_motor, arduino_uno" },
];

export default function LandingFeatureCommentary() {
  return (
    <div className="rounded-lg border border-white/20 bg-black shadow-sm p-5 h-full flex flex-col">
      <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-4">
        Commentary
      </h2>
      <div className="space-y-3 flex-1 min-h-0 overflow-y-auto pr-1">
        {MOCK_ENTRIES.map((entry, i) => (
          <div
            key={i}
            className="rounded-lg border border-white/20 bg-black/60 p-3"
          >
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>{entry.time}</span>
            </div>
            <p className="mt-2 text-sm font-medium text-zinc-200">{entry.text}</p>
            {entry.tags && (
              <p className="mt-2 text-xs text-zinc-500">{entry.tags}</p>
            )}
          </div>
        ))}
      </div>

      <Link
        href="/coach"
        className="mt-4 text-center text-sm text-zinc-400 hover:text-white transition-colors"
      >
        Open Commentary →
      </Link>
    </div>
  );
}
