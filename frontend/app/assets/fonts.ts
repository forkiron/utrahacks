/**
 * Central font configuration for the app.
 * All fonts are loaded here so they're easy to find and consistent after pull.
 *
 * Font files: next/font/google loads from Google at build time.
 * For local font files, add .woff2 to public/assets/fonts/ and switch to next/font/local.
 */
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";

export const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
});

export const fontClassNames = [
  geistSans.variable,
  geistMono.variable,
  playfair.variable,
].join(" ");
