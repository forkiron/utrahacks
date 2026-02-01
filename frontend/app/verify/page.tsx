"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppNavbar from "../components/AppNavbar";

export default function VerifyLandingPage() {
  const [id, setId] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (id.trim()) router.push(`/verify/${id.trim()}`);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <AppNavbar />
      <div className="flex flex-col items-center justify-center px-6 py-16">
      <h1 className="text-2xl font-bold">Verify Inspection</h1>
      <p className="text-zinc-500 text-sm mt-1">
        Enter Inspection ID to view results and on-chain proof
      </p>
      <form onSubmit={handleSubmit} className="mt-6 w-full max-w-sm">
        <input
          type="text"
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="e.g. INS-2026-0142"
          className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <button
          type="submit"
          className="w-full mt-3 py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-xl"
        >
          Look up
        </button>
      </form>
      </div>
    </div>
  );
}
