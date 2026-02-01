import type { Metadata } from "next";
import { fontClassNames } from "./assets/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Robot Inspection - UtraHacks",
  description: "AI-powered compliance verification for robotics competitions",
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

