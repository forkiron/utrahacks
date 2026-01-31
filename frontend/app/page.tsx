import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col items-center justify-center px-6">
      <h1 className="text-4xl font-bold tracking-tight text-center">
        Robot Inspection
      </h1>
      <p className="text-zinc-400 mt-2 text-center max-w-md">
        AI-powered compliance verification for robotics competitions. Detect
        components, run rules, write to Solana.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 mt-8">
        <Link
          href="/inspect"
          className="px-8 py-4 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-xl transition-colors text-center"
        >
          Start Inspection
        </Link>
        <Link
          href="/verify"
          className="px-8 py-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium transition-colors text-center"
        >
          Verify Inspection
        </Link>
      </div>
    </div>
  );
}
