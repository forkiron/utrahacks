"use client";

import LiveCoach from "./LiveCoach";

export default function CoachPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <header className="border-b border-zinc-800 bg-zinc-900/50 px-6 py-4">
        <h1 className="text-xl font-bold tracking-tight">
          Live Coach — UtraHacks
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Real-time webcam commentary with optional voice
        </p>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <LiveCoach />
      </main>
    </div>
  );
}

