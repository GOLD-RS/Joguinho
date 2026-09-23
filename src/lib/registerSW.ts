// Registra o service worker (100% offline).
// Só em produção — em dev o Next reinicia a cada mudança e o cache do SW
// atrapalharia o hot reload.
//
// Registro direto (sem esperar o evento `load`): num build estático o
// efeito do React pode rodar depois que `load` já disparou, e nesse caso
// um listener no `load` nunca executa e o SW não registra.
export function registerSW() {
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV !== "production") return;
  if (!("serviceWorker" in navigator)) return;

  // Relativo: o mesmo build funciona em raiz (Netlify) ou em subpasta
  // (GitHub Pages /Joguinho/), porque o sw.js é copiado para a raiz do
  // out/ junto com as páginas — e o worker é raiz-agnóstico.
  const url = new URL("sw.js", window.location.href);
  navigator.serviceWorker.register(url).catch(() => {});
}
