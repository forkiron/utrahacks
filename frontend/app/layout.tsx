import type { Metadata } from "next";
import { fontClassNames } from "./assets/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sentinel — End-to-End Competition Management Platform",
  description: "Sentinel: end-to-end competition management—inspect, verify, live commentary, and coaching with on-chain proof.",
  icons: {
    icon: "/unnamed.jpg",
  },
  openGraph: {
    title: "Sentinel — End-to-End Competition Management Platform",
    description: "End-to-end competition management—inspect, verify, commentary, and coaching with on-chain proof.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${fontClassNames} antialiased`}>
        <div className="content">{children}</div>
      </body>
    </html>
  );
}

