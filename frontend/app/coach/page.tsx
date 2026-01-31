"use client";

import LiveCoachPlayer from "./LiveCoachPlayer";

export default function CoachPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <header className="border-b border-zinc-800 bg-zinc-900/50 px-6 py-4">
        <h1 className="text-xl font-bold tracking-tight">
          Coach / Commentary Â· UtraHacks
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Live commentary playback for robotics runs
        </p>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <LiveCoachPlayer />
      </main>
    </div>
  );
}
