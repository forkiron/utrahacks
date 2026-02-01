import Link from "next/link";

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

      {/* Navbar: Sentinel + feature links */}
      <header className="sticky top-0 left-0 right-0 z-50 bg-transparent backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="font-[cursive] text-white text-2xl tracking-tight hover:text-white/90 transition-colors"
          >
            Sentinel
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/coach"
              className="px-4 py-2 text-sm font-medium text-white/90 hover:text-white border border-transparent hover:border-white/30 rounded-lg hover:bg-white/5 transition-all"
            >
              Commentary
            </Link>
            <Link
              href="/inspect"
              className="px-4 py-2 text-sm font-medium text-white border border-white/40 rounded-lg hover:bg-white/10 transition-all"
            >
              Bot Security
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero - judging & analysis for robotics */}
      <main className="relative z-10 pt-32 pb-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-serif text-5xl md:text-7xl font-medium italic text-white tracking-tight leading-[1.1] drop-shadow-sm">
            AI-powered judging and analysis for robotics
          </h1>
          <p className="text-lg md:text-xl text-white/90 mt-6 max-w-2xl mx-auto leading-relaxed font-sans">
            Inspect and verify robots in minutes, not months.
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

        {/* Demo section: Placeholder dashboard - aligned with header */}
        <section
          id="demo"
          className="relative min-h-[90vh] flex items-end justify-center pt-32 pb-20"
        >
          <div className="w-full max-w-6xl mx-auto px-6">
            <div className="rounded-xl border border-white/20 overflow-hidden shadow-2xl bg-white/5 backdrop-blur">
              {/* Dashboard header */}
              <div className="border-b border-white/10 px-6 py-4 flex items-center gap-2">
                <span className="text-white/60 text-sm font-medium">
                  Dashboard
                </span>
              </div>
              {/* Dashboard content - placeholder grid */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[400px]">
                <div className="rounded-lg border border-white/10 bg-white/5 h-32" />
                <div className="rounded-lg border border-white/10 bg-white/5 h-32" />
                <div className="rounded-lg border border-white/10 bg-white/5 h-32" />
                <div className="rounded-lg border border-white/10 bg-white/5 h-48 md:col-span-2" />
                <div className="rounded-lg border border-white/10 bg-white/5 h-48" />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
