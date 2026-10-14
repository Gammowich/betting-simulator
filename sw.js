// Service worker: appen åbner uden net. Kode og ikoner (faste navne med hash) tages fra lageret;
// model og kampprogram hentes altid nyt først, så man ikke ser gamle data, når der er net.
// tools/postbuild-sw.ts sætter versionen og de byggede filer ind efter vite build.
const CACHE = "betting-simulator-6b403a0fdf80";
const ASSETS = ["./assets/index-2VXB3baE.js", "./assets/index-BqGDf8a4.css"];
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./model.json", "./feed-demo.json", "./icons/icon-192.png", ...ASSETS];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  // cache: "reload" springer browserens HTTP-lager over (GitHub Pages sender max-age=600).
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" })))));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      // Kun vores egne gamle lagre: gammowich.github.io deler lager med Taktiktavle og de andre apps.
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("betting-simulator-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const networkFirst = async (req) => {
  const cache = await caches.open(CACHE);
  try {
    // no-cache: spørg altid serveren, så en ny model ikke venter på browserens HTTP-lager.
    const res = await fetch(req, { cache: "no-cache" });
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const hit = await cache.match(req, { ignoreSearch: true, ignoreVary: true });
    if (hit) return hit;
    throw new Error("offline og ikke gemt");
  }
};

const cacheFirst = async (req) => {
  const cache = await caches.open(CACHE);
  // ignoreVary: filerne hentes med crossorigin, og serveren svarer med Vary, så et præcist opslag fejler.
  const hit = await cache.match(req, { ignoreVary: true });
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
};

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.includes("/assets/") || url.pathname.includes("/icons/")) e.respondWith(cacheFirst(req));
  else e.respondWith(networkFirst(req));
});
