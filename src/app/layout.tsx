import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flappy Aurora",
  description: "Flappy Aurora — combos, escudos, câmera lenta e ranking global.",
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
