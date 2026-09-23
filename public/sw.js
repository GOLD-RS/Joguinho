/* Service worker do Flappy Aurora — app 100% offline.
 *
 * Estratégia:
 * - app shell (página + ícones + sw): pré-cacheado no install;
 * - chunks _next/static (hash imutável): cache-first (nunca mudam por nome);
 * - navegação (HTML): network-first com fallback pro shell cacheado —
 *   assim cada deploy chega online, e offline abre a última versão.
 *
 * O worker é raiz-agnóstico: registrado com URL relativa, funciona em
 * /, /Joguinho/ (GitHub Pages) ou em qualquer subpasta.
 */
const VERSION = "fa-v1";
const CACHE = "flappy-aurora-" + VERSION;

const shell = ["./", "./sw.js", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png"];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => Promise.all(shell.map((u) => c.add(new URL(u, self.location.href)))))
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const p = url.pathname;

  // Chunks com hash no nome: imutaveis -> cache-first.
  if (p.includes("/_next/static/") || p.includes("/manifest.webmanifest")) {
    e.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res);
        return res;
      })()
    );
    return;
  }

  // Ícones (sem hash): network-first, fallback no cache.
  if (p.includes("/icons/")) {
    e.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch {
          const hit = await cache.match(req);
          if (hit) return hit;
          throw new Error("offline");
        }
      })()
    );
    return;
  }

  // Navegação (HTML): network-first, fallback pro shell cacheado.
  if (req.mode === "navigate") {
    e.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch {
          const hit = await cache.match(req);
          if (hit) return hit;
          const home = await cache.match(new URL("./", self.location.href));
          if (home) return home;
          return new Response("Sem internet", { status: 503, statusText: "offline" });
        }
      })()
    );
    return;
  }

  // Demais GETs: network-first, fallback no cache.
  e.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch {
        const hit = await cache.match(req);
        if (hit) return hit;
        throw new Error("offline");
      }
    })()
  );
});
