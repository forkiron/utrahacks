"use client";

import Link from "next/link";
import LandingFeatureVerify from "./components/landing/LandingFeatureVerify";
import LandingFeatureResult from "./components/landing/LandingFeatureResult";
import LandingFeatureDetail from "./components/landing/LandingFeatureDetail";
import LandingFeatureCommentary from "./components/landing/LandingFeatureCommentary";

function scrollToDemo() {
  document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" });
}

export default function Home() {
  return (
    <div className="relative min-h-screen text-slate-100 font-sans overflow-x-hidden selection:bg-blue-500/30">
      {/* Background: landing video + blur + dark overlay */}
      <div className="fixed inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover scale-105 filter-[blur(12px)_brightness(0.3)]"
          src="/landing.mov"
        />
        <div className="absolute inset-0 bg-black/35" aria-hidden />
      </div>

      {/* Navbar: Sentinel + Try now */}
      <header className="sticky top-0 left-0 right-0 z-50 bg-transparent backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-[cursive] text-white text-2xl tracking-tight">
            Sentinel
          </span>
          <Link
            href="/inspect"
            className="px-4 py-2 text-sm font-medium text-white border border-white/40 rounded-lg hover:bg-white/10 transition-all"
          >
            Try now
          </Link>
        </div>
      </header>

      {/* Hero - full viewport, only hero visible (no peaking) */}
      <main className="relative z-10 flex flex-col">
        <section className="min-h-screen flex flex-col items-center justify-start px-6 pt-24 pb-16">
          <div className="max-w-4xl mx-auto text-center w-full">
            <h1 className="font-serif text-5xl md:text-7xl font-medium italic text-white tracking-tight leading-[1.1] drop-shadow-sm">
              Robot compliance verification for competitions
            </h1>
            <p className="text-lg md:text-xl text-white/90 mt-6 max-w-2xl mx-auto leading-relaxed font-sans">
              Photo-based inspections with pass/fail and on-chain proof.
            </p>
            <Link
              href="/inspect"
              className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-white text-black font-medium rounded-none hover:bg-white/90 transition-colors"
            >
              Explore Sentinel
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 17 17 7M17 7h-6M17 7v6"
                />
              </svg>
            </Link>
          </div>
          <button
            type="button"
            onClick={scrollToDemo}
            className="shrink-0 mt-auto pt-8 text-white/70 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-full p-2"
            aria-label="Scroll to demo"
          >
            <svg
              className="w-6 h-6 animate-bounce"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </section>

        {/* Features grid — no heading/subtext */}
        <section
          id="demo"
          className="relative pt-24 pb-24 px-6"
        >
          <div className="w-full max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[680px]">
              {/* Verify — wider (7 cols) */}
              <div className="md:col-span-7 min-h-[360px] md:min-h-0 flex flex-col">
                <div className="relative rounded-2xl border border-white/15 bg-black/40 backdrop-blur-sm shadow-xl p-6 flex-1 flex flex-col min-h-0 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-tl from-cyan-500/15 via-transparent to-transparent pointer-events-none" />
                  <div className="relative z-10 flex-1 min-h-0 min-w-0 scale-[0.92] origin-top-left">
                    <div className="h-full w-full min-h-[320px]">
                      <LandingFeatureVerify />
                    </div>
                  </div>
                  <p className="relative z-10 text-zinc-500 text-sm mt-3 leading-relaxed px-1">
                    Verify Inspection. Look up inspections by ID and view recent verifications with on-chain proof.
                  </p>
                </div>
              </div>
              {/* Result — narrower (5 cols) */}
              <div className="md:col-span-5 min-h-[400px] md:min-h-0 flex flex-col">
                <div className="relative rounded-2xl border border-white/15 bg-black/40 backdrop-blur-sm shadow-xl p-6 flex-1 flex flex-col min-h-0 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/25 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-tr from-green-500/15 via-transparent to-transparent pointer-events-none" />
                  <div className="relative z-10 flex-1 min-h-0 min-w-0 scale-[0.92] origin-top-left">
                    <div className="h-full w-full min-h-[380px]">
                      <LandingFeatureResult />
                    </div>
                  </div>
                  <p className="relative z-10 text-zinc-500 text-sm mt-3 leading-relaxed px-1">
                    Inspection Result. See pass/fail outcome, evidence photos, and robot ID at a glance.
                  </p>
                </div>
              </div>
              {/* Detail — narrower (5 cols) */}
              <div className="md:col-span-5 min-h-[360px] md:min-h-0 flex flex-col">
                <div className="relative rounded-2xl border border-white/15 bg-black/40 backdrop-blur-sm shadow-xl p-6 flex-1 flex flex-col min-h-0 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-bl from-pink-500/15 via-transparent to-transparent pointer-events-none" />
                  <div className="relative z-10 flex-1 min-h-0 min-w-0 scale-[0.92] origin-top-left">
                    <div className="h-full w-full min-h-[320px]">
                      <LandingFeatureDetail />
                    </div>
                  </div>
                  <p className="relative z-10 text-zinc-500 text-sm mt-3 leading-relaxed px-1">
                    Inspection Detail. Robot ID, finalizer wallet, and detected components from the standard kit.
                  </p>
                </div>
              </div>
              {/* Commentary — wider (7 cols) */}
              <div className="md:col-span-7 min-h-[320px] md:min-h-0 flex flex-col">
                <div className="relative rounded-2xl border border-white/15 bg-black/40 backdrop-blur-sm shadow-xl p-6 flex-1 flex flex-col min-h-0 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tl from-amber-500/20 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/15 via-transparent to-transparent pointer-events-none" />
                  <div className="relative z-10 flex-1 min-h-0 min-w-0 scale-[0.92] origin-top-left">
                    <div className="h-full w-full min-h-[280px]">
                      <LandingFeatureCommentary />
                    </div>
                  </div>
                  <p className="relative z-10 text-zinc-500 text-sm mt-3 leading-relaxed px-1">
                    Live Commentary. Timestamped scene analysis and tags as the run plays.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
