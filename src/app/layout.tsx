import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/firebase/authContext";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Vimora - Private GPU-Accelerated Bulk Media Converter",
  description:
    "Convert, compress, and normalize video and audio files locally on your device using GPU hardware acceleration. No uploads. 100% private. Blazingly fast.",
  keywords: [
    "media converter",
    "video converter",
    "audio converter",
    "FFmpeg",
    "GPU converter",
    "bulk converter",
    "private converter"
  ],
  openGraph: {
    title: "Vimora: Private GPU-Accelerated Bulk Media Converter",
    description:
      "Convert media at GPU speed, privately. No uploads. Built for content creators and video teams.",
    type: "website",
    images: [{ url: "/logo.png", width: 766, height: 667, alt: "Vimora" }],
  },
  icons: {
    icon: "/favicon-32x32.png",
    apple: "/logo-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />

      </head>
      <body className="antialiased min-h-screen">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}