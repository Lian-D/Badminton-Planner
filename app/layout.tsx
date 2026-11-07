import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { ShuttleIcon } from "@/components/ShuttleIcon";
import { MobileNav, Tabs } from "@/components/Tabs";
import { HeaderNav, MobileNavForAccount } from "@/components/HeaderNav";
import { CourtBackground } from "@/components/CourtBackground";

// SF Pro is used on Apple devices; Inter stands in elsewhere.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Badminton Planner",
  description: "Vote on court times, log court bookings and split the cost between players.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="relative min-h-full font-sans">
        <CourtBackground />
        <main className="mx-auto w-full max-w-6xl px-4 pb-32 pt-8 sm:px-6 sm:pb-12 sm:pt-12">
          <header className="mb-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <ShuttleIcon className="h-9 w-9" />
              <span className="font-display text-[28px] font-bold tracking-[-0.03em] sm:text-[34px]">Badminton Planner</span>
            </div>
            <Suspense fallback={<Tabs />}>
              <HeaderNav />
            </Suspense>
          </header>
          {children}
        </main>
        <Suspense fallback={<MobileNav />}>
          <MobileNavForAccount />
        </Suspense>
      </body>
    </html>
  );
}
