import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flappy Aurora",
  description: "Flappy Aurora — combos, escudos, câmera lenta e medalhas. Jogo 100% offline, sem servidor.",
  applicationName: "Flappy Aurora",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Flappy Aurora",
  },
  icons: [
    { rel: "icon", url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    { rel: "apple-touch-icon", url: "/icons/icon-192.png" },
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0b1e3a",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="overflow-hidden bg-[#0b1e3a] antialiased select-none">{children}</body>
    </html>
  );
}
