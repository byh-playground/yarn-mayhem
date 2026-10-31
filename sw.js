// bloom-gamekit pwa가 생성한 파일입니다. 직접 고치지 말고 생성 스크립트를 다시 실행하세요.
(function serviceWorker(config) {
  const SCOPE = self.registration.scope;
  const PREFIX = `bloom-pwa:${new URL(SCOPE).pathname}:`;
  const CACHE = PREFIX + config.version;
  const RUNTIME = PREFIX + "gamekit";
  const GAMEKIT = new RegExp(config.gamekit);
  self.addEventListener("install", (event) => {
    event.waitUntil(
      caches.open(CACHE).then(
        (cache) => cache.addAll(
          config.precache.map(
            (url) => GAMEKIT.test(url) ? new Request(url, { mode: "cors" }) : new Request(url, { cache: "reload" })
          )
        )
      )
    );
  });
  self.addEventListener("activate", (event) => {
    event.waitUntil(
      caches.keys().then(
        (keys) => Promise.all(
          keys.filter((key) => key.startsWith(PREFIX) && key !== CACHE && key !== RUNTIME).map((key) => caches.delete(key))
        )
      ).then(() => self.clients.claim())
    );
  });
  self.addEventListener("message", (event) => {
    if (event.data?.type === config.activateMessage) {
      self.skipWaiting();
    }
  });
  async function sameOrigin(request) {
    const STORE = await caches.open(CACHE);
    const NAVIGATE = request.mode === "navigate";
    let response = await STORE.match(request, { ignoreSearch: NAVIGATE });
    const ADDRESS = new URL(request.url);
    if (!response && NAVIGATE && ADDRESS.pathname.endsWith("/")) {
      response = await STORE.match(new URL("index.html", ADDRESS).href);
    }
    return response ?? fetch(request);
  }
  async function gamekit(request) {
    const CACHED = await caches.match(request);
    if (CACHED) {
      return CACHED;
    }
    const RESPONSE = await fetch(request);
    if (RESPONSE.ok) {
      const STORE = await caches.open(RUNTIME);
      await STORE.put(request, RESPONSE.clone());
    }
    return RESPONSE;
  }
  self.addEventListener("fetch", (event) => {
    const REQUEST = event.request;
    if (REQUEST.method !== "GET") {
      return;
    }
    if (new URL(REQUEST.url).origin === self.location.origin) {
      event.respondWith(sameOrigin(REQUEST));
    } else if (GAMEKIT.test(REQUEST.url)) {
      event.respondWith(gamekit(REQUEST));
    }
  });
})({
    "version": "12ef6715ec5b2293",
    "activateMessage": "bloom-pwa:activate",
    "gamekit": "^https:\\/\\/cdn\\.jsdelivr\\.net\\/gh\\/byh-playground\\/bloom-gamekit@[0-9a-f]{40}\\/[A-Za-z0-9._/-]+$",
    "precache": [
        "assets/active-theme/manifest.json",
        "assets/active-theme/needle.svg",
        "assets/active-theme/rift-hole.svg",
        "assets/active-theme/rift-pulse.svg",
        "assets/active-theme/yarn-body.svg",
        "assets/active-theme/yarn-face.svg",
        "assets/active-theme/yarn-progress.svg",
        "index.html",
        "manifest.webmanifest",
        "pwa/apple-touch-icon.png",
        "pwa/icon-192.png",
        "pwa/icon-512.png",
        "pwa/maskable-512.png",
        "src/main.js",
        "src/showcase.js",
        "src/styles/main.css",
        "src/visual/matrix.js",
        "https://cdn.jsdelivr.net/gh/byh-playground/bloom-gamekit@fcd3a02db452b2e469898b05aa797d754a89fb76/scenario.js"
    ]
});
