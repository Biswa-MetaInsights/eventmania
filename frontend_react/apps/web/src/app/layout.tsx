import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { QueryProvider } from "@/providers/query-provider";
import "@/lib/api-config";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "EventMind — Discover Events & Communities",
  description:
    "AI-powered platform to discover events, communities, and experiences near you.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-outfit)]">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}