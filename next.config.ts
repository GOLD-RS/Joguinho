import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera um site 100% estático para publicar em qualquer hospedagem free
  // (GitHub Pages, Netlify, Cloudflare Pages...) sem servidor, banco nem API.
  output: "export",
  trailingSlash: true,
};

export default nextConfig;
