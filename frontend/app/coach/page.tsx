"use client";

import AppNavbar from "../components/AppNavbar";
import LiveCoach from "./LiveCoach";

export default function CoachPage() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-zinc-100 font-sans">
      <AppNavbar />

      <main className="max-w-5xl mx-auto px-6 py-8">
        <LiveCoach />
      </main>
    </div>
  );
}

