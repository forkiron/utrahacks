"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import LandingFeatureVerify from "./components/landing/LandingFeatureVerify";
import LandingFeatureResult from "./components/landing/LandingFeatureResult";
import LandingFeatureDetail from "./components/landing/LandingFeatureDetail";
import LandingFeatureCommentary from "./components/landing/LandingFeatureCommentary";

function scrollToDemo() {
  document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" });
}

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const stagger = {
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
  hidden: {},
};

const cardItem = {
  hidden: { opacity: 0, y: 40, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export default function Home() {
  return (
    <motion.div
      className="relative min-h-screen text-slate-100 font-sans overflow-x-hidden selection:bg-blue-500/30"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* Background: landing video + blur + dark overlay */}
      <motion.div
        className="fixed inset-0 z-0"
        initial={{ scale: 1.05, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      >
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover scale-105 filter-[blur(12px)_brightness(0.3)]"
          src="/landing.mov"
        />
        <motion.div
          className="absolute inset-0 bg-black/35"
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        />
      </motion.div>

      {/* Navbar: Sentinel + Try now */}
      <motion.header
        className="sticky top-0 left-0 right-0 z-50 bg-transparent backdrop-blur-md"
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <motion.span
              className="flex items-center gap-2"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Image
                src="/unnamed.jpg"
                alt="Sentinel"
                width={36}
                height={36}
                className="h-9 w-9 rounded-full object-cover shrink-0"
              />
              <span className="font-[cursive] text-white text-2xl tracking-tight">
                Sentinel
              </span>
            </motion.span>
          </Link>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
            <Link
              href="/inspect"
              className="px-4 py-2 text-sm font-medium text-white border border-white/40 rounded-lg hover:bg-white/10 transition-colors inline-block"
            >
              Try now
            </Link>
          </motion.div>
        </div>
      </motion.header>

      {/* Hero */}
      <main className="relative z-10 flex flex-col">
        <section className="min-h-screen flex flex-col items-center justify-start px-6 pt-24 pb-16">
          <motion.div
            className="max-w-4xl mx-auto text-center w-full"
            variants={stagger}
            initial="hidden"
            animate="visible"
          >
            <motion.h1
              className="font-serif text-5xl md:text-7xl font-medium italic text-white tracking-tight leading-[1.1] drop-shadow-sm"
              variants={fadeUp}
            >
              All-in-one management for robot competitions
            </motion.h1>
            <motion.p
              className="text-lg md:text-xl text-white/90 mt-6 max-w-2xl mx-auto leading-relaxed font-sans"
              variants={fadeUp}
            >
              Inspect, verify, live commentary, and coaching—with on-chain proof.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/inspect"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-medium rounded-none hover:bg-white/90 transition-colors"
                >
                  Explore Sentinel
                  <motion.svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                    initial={{ x: 0 }}
                    whileHover={{ x: 4, y: -4 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 17 17 7M17 7h-6M17 7v6"
                    />
                  </motion.svg>
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>

          <motion.button
            type="button"
            onClick={scrollToDemo}
            className="shrink-0 mt-auto pt-8 text-white/70 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-full p-2"
            aria-label="Scroll to demo"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
            whileHover={{ scale: 1.15, y: 4 }}
            whileTap={{ scale: 0.9 }}
          >
            <motion.svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              animate={{ y: [0, 6, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </motion.svg>
          </motion.button>
        </section>

        {/* Features grid */}
        <motion.section
          id="demo"
          className="relative pt-24 pb-24 px-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <div className="w-full max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[680px]">
              {/* Verify — wider (7 cols) */}
              <motion.div
                className="md:col-span-7 min-h-[360px] md:min-h-0 flex flex-col"
                variants={cardItem}
              >
                <motion.div
                  className="relative rounded-2xl border border-white/15 bg-black/40 backdrop-blur-sm shadow-xl p-6 flex-1 flex flex-col min-h-0 overflow-hidden"
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                >
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
                </motion.div>
              </motion.div>
              {/* Result — narrower (5 cols) */}
              <motion.div
                className="md:col-span-5 min-h-[400px] md:min-h-0 flex flex-col"
                variants={cardItem}
              >
                <motion.div
                  className="relative rounded-2xl border border-white/15 bg-black/40 backdrop-blur-sm shadow-xl p-6 flex-1 flex flex-col min-h-0 overflow-hidden"
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                >
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
                </motion.div>
              </motion.div>
              {/* Detail — narrower (5 cols) */}
              <motion.div
                className="md:col-span-5 min-h-[360px] md:min-h-0 flex flex-col"
                variants={cardItem}
              >
                <motion.div
                  className="relative rounded-2xl border border-white/15 bg-black/40 backdrop-blur-sm shadow-xl p-6 flex-1 flex flex-col min-h-0 overflow-hidden"
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                >
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
                </motion.div>
              </motion.div>
              {/* Commentary — wider (7 cols) */}
              <motion.div
                className="md:col-span-7 min-h-[320px] md:min-h-0 flex flex-col"
                variants={cardItem}
              >
                <motion.div
                  className="relative rounded-2xl border border-white/15 bg-black/40 backdrop-blur-sm shadow-xl p-6 flex-1 flex flex-col min-h-0 overflow-hidden"
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                >
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
                </motion.div>
              </motion.div>
            </div>
          </div>
        </motion.section>
      </main>
    </motion.div>
  );
}
