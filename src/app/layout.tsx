import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={dmSans.variable}>
      <head>
        <meta charSet="utf-8" />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
