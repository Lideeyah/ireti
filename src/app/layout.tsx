import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { getRunState } from "@/server/demoRun";
import { DEMO_STEPS } from "@/lib/demo/script";
import { DemoDirector } from "@/components/demo/DemoDirector";

const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Ìrètí — SME lending infrastructure",
  description: "Consolidated financial view, structured credit assessment and auditable lending workflow for SME credit.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // A guided run, if one is in progress, drives the app from a fixed control bar.
  const run = await getRunState();
  const active = run && run.step <= DEMO_STEPS.length ? run : null;
  return (
    <html lang="en" className={dmSans.variable}>
      <head>
        <meta charSet="utf-8" />
      </head>
      <body className="min-h-screen">
        {children}
        {active && <DemoDirector initialStep={active.step} pace={active.pace} />}
      </body>
    </html>
  );
}
