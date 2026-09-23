import type { MetadataRoute } from "next";

// Manifest estático: em "output: export" o Next exige a rota force-static.
export const dynamic = "force-static";

// Caminhos relativos (sem barra inicial) para o manifest funcionar em
// qualquer raiz de hospedagem (GitHub Pages /Joguinho, Netlify em raiz...).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "flappy-aurora",
    name: "Flappy Aurora",
    short_name: "Flappy",
    description: "Flappy Aurora — combos, escudos, ímã, medalhas e ranking local. 100% offline.",
    start_url: ".",
    scope: ".",
    display: "standalone",
    orientation: "any",
    theme_color: "#0b1e3a",
    background_color: "#0b1e3a",
    icons: [
      { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
