/* global self, caches, fetch, Response, URL, crypto, indexedDB */

const CACHE_VERSION = "campushub-pwa-v16";
const RUNTIME_CACHE_NAME = `campushub-runtime-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline";
const STATIC_CACHE_URLS = [
  "/",
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/logo.png",
];
const QUEUE_DB = "campushub-background-sync";
const QUEUE_STORE = "requests";
const SYNC_TAG = "campushub-sync-queue";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(STATIC_CACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key !== CACHE_VERSION && key !== RUNTIME_CACHE_NAME,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method === "GET") {
    if (request.mode === "navigate") {
      event.respondWith(networkFirstNavigation(request));
      return;
    }

    if (
      url.origin === self.location.origin &&
      !url.pathname.startsWith("/api/")
    ) {
      event.respondWith(staleWhileRevalidate(request));
      return;
    }
  }

  if (
    url.origin === self.location.origin &&
    url.pathname.startsWith("/api/") &&
    ["POST", "PUT", "PATCH", "DELETE"].includes(request.method)
  ) {
    event.respondWith(networkWithBackgroundQueue(request));
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(replayQueuedRequests());
  }
});

self.addEventListener("push", (event) => {
  const payload = readPushPayload(event);
  const title = payload.title || "CampusHub";
  const options = {
    body: payload.body || payload.description || "You have a new CampusHub notification.",
    icon: "/logo.png",
    badge: "/logo.png",
    tag: payload.tag || "campushub-notification",
    renotify: Boolean(payload.renotify),
    data: {
      url: payload.url || "/dashboard",
      type: payload.type || "announcement",
      entityId: payload.entityId || null,
      entityType: payload.entityType || null,
      metadata: payload.metadata || {},
    },
    actions: [
      {
        action: "open",
        title: "Open CampusHub",
      },
      {
        action: "dismiss",
        title: "Dismiss",
      },
    ],
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      broadcastToClients({
        type: "CAMPUSHUB_PUSH_RECEIVED",
        payload: {
          title,
          body: options.body,
          url: options.data.url,
          type: options.data.type,
          metadata: options.data.metadata,
        },
      }),
    ]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") {
    return;
  }

  const targetUrl = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const matchingClient = clients.find((client) =>
          client.url.includes(targetUrl),
        );

        if (matchingClient) {
          return matchingClient.focus();
        }

        return self.clients.openWindow(targetUrl);
      }),
  );
});

async function broadcastToClients(message) {
  const clients = await self.clients.matchAll({
    includeUncontrolled: true,
    type: "window",
  });

  clients.forEach((client) => client.postMessage(message));
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_VERSION);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || caches.match(OFFLINE_URL);
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE_NAME);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || network;
}

async function networkWithBackgroundQueue(request) {
  try {
    return await fetch(request.clone());
  } catch {
    await queueRequest(request);
    await registerBackgroundSync();

    return new Response(
      JSON.stringify({
        data: null,
        error: {
          code: "OFFLINE_QUEUED",
          message:
            "You are offline. This request was queued and will sync automatically.",
        },
      }),
      {
        status: 202,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

async function queueRequest(request) {
  const body = await request.clone().text();
  const headers = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const db = await openQueueDb();
  const tx = db.transaction(QUEUE_STORE, "readwrite");
  tx.objectStore(QUEUE_STORE).add({
    id: crypto.randomUUID(),
    url: request.url,
    method: request.method,
    headers,
    body,
    createdAt: Date.now(),
  });

  await transactionDone(tx);
}

async function registerBackgroundSync() {
  if ("sync" in self.registration) {
    await self.registration.sync.register(SYNC_TAG);
  }
}

async function replayQueuedRequests() {
  const db = await openQueueDb();
  const queued = await getQueuedRequests(db);

  for (const item of queued) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body || undefined,
        credentials: "include",
      });

      if (response.ok || response.status < 500) {
        await deleteQueuedRequest(db, item.id);
      }
    } catch {
      break;
    }
  }
}

function openQueueDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(QUEUE_DB, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(QUEUE_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getQueuedRequests(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readonly");
    const request = tx.objectStore(QUEUE_STORE).getAll();

    request.onsuccess = () =>
      resolve(request.result.sort((a, b) => a.createdAt - b.createdAt));
    request.onerror = () => reject(request.error);
  });
}

function deleteQueuedRequest(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readwrite");
    const request = tx.objectStore(QUEUE_STORE).delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function readPushPayload(event) {
  if (!event.data) {
    return {};
  }

  try {
    return event.data.json();
  } catch {
    return {
      body: event.data.text(),
    };
  }
}
