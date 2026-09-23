import type { NextConfig } from "next";

// PAGES_BASE é usado pelo CI do GitHub Pages para assinar os assets
// com a subpasta correta (ex.: /Joguinho). Em build local (sem a var),
// gera o site de raiz, utilizável em qualquer hospedagem estática.
const pagesBase = process.env.PAGES_BASE;

const nextConfig: NextConfig = {
  // Gera um site 100% estático para publicar em qualquer hospedagem free
  // (GitHub Pages, Netlify, Cloudflare Pages...) sem servidor, banco nem API.
  output: "export",
  ...(pagesBase ? { basePath: pagesBase } : {}),
};

export default nextConfig;
