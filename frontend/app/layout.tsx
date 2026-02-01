import type { Metadata } from "next";
import { fontClassNames } from "./assets/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sentinel — All-in-One Robot Competition Management",
  description: "Sentinel: inspect, verify, live commentary, and coaching for robot competitions—with on-chain proof.",
  icons: {
    icon: "/unnamed.jpg",
  },
  openGraph: {
    title: "Sentinel — All-in-One Robot Competition Management",
    description: "Inspect, verify, commentary, and coaching for robot competitions—with on-chain proof.",
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

