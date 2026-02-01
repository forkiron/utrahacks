"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/coach", label: "Commentary" },
  { href: "/inspect", label: "Bot Security" },
  { href: "/verify", label: "Verify" },
] as const;

function isBotSecurityActive(pathname: string) {
  return pathname.startsWith("/inspect") || pathname.startsWith("/verify");
}

export default function AppNavbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/20 bg-black/95 backdrop-blur font-sans">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="font-[cursive] text-white text-2xl tracking-tight hover:text-white/90 transition-colors"
        >
          Sentinel
        </Link>
        <nav className="flex items-center gap-1">
          {navLinks.map(({ href, label }) => {
            const isActive =
              href === "/coach"
                ? pathname.startsWith("/coach")
                : href === "/verify"
                  ? pathname.startsWith("/verify")
                  : isBotSecurityActive(pathname);
            return (
              <Link
                key={href}
                href={href}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
