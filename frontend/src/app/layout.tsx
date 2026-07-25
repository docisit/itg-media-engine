import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";

const inter = Inter({ subsets: ["latin"] });

// 1. App Identity & SEO Metadata
export const metadata: Metadata = {
  title: "IN the GAME with DOC Show - Media Portal",
  description: "Secure broadcast portal for Coaches, Athletes, and IN the GAME with DOC.",
  generator: "Next.js 16.1.2",
  applicationName: "DOC Portal",
  referrer: "origin-when-cross-origin",
  keywords: ["Area Sports", "High School Football", "Live Streaming", "Coaching", "Sports Talk", "Athlete Scouting"],
  authors: [{ name: "DOC DiD iT", url: "https://yourdomain.com" }],
  creator: "DOC Donnie OConnor",
  publisher: "IN the GAME with DOC Media",
  manifest: "/manifest.json", 
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "IN the GAME with DOC Sports Portal",
  },
};

// 2. Mobile Display & Theme Settings
export const viewport: Viewport = {
  themeColor: "#2563eb", // Matches your blue-600
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Prevents auto-zoom on mobile inputs
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}