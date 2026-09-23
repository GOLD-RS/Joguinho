// Registra o service worker (100% offline).
// Só em produção — em dev o Next reinicia a cada mudança e o cache do SW
// atrapalharia o hot reload.
export function registerSW() {
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV !== "production") return;
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    // Relativo: o mesmo build funciona em raiz (Netlify) ou em
    // subpasta (GitHub Pages /Joguinho/), porque o sw.js é copiado
    // para a raiz do out/ junto com as páginas.
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
