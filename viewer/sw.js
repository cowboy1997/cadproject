self.CACHE_NAME = "RealiHubResourceCache";
self.db = {
  read: (key) => {
    return new Promise((resolve, reject) => {
      caches
        .match(new Request(`https://realibox/${encodeURIComponent(key)}`))
        .then(async function (res) {
          if (res.ok && res.status === 200) {
            const blob = await res.blob();
            if (blob.length > 0) {
              resolve(res);
            } else {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        })
        .catch(() => {
          resolve(null);
        });
    });
  },
  write: (key, value) => {
    return new Promise((resolve, reject) => {
      caches
        .open(CACHE_NAME)
        .then(function (cache) {
          cache.put(new Request(`https://realibox/${encodeURIComponent(key)}`), value);
          resolve();
        })
        .catch(() => {
          reject();
        });
    });
  },
};

const enableNavigationPreload = async () => {
  if (self.registration.navigationPreload) {
    // Enable navigation preloads!
    await self.registration.navigationPreload.enable();
  }
};

self.addEventListener("activate", (event) => {
  event.waitUntil(enableNavigationPreload());
});

const cachelist = [];

self.addEventListener("install", async function (installEvent) {
  // self.skipWaiting();
  installEvent.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(cachelist);
    }),
  );
});

self.addEventListener("fetch", async (event) => {
  // 忽略 上传文件接口
  if (event.request.url.includes("/incremental/push/task-submit")) {
    // 忽略该请求，不做任何处理
    return;
  }
  event.respondWith(fetchHandle(event.request));
});

const downloadResources = ["/save_by_md5"];

const fetchHandle = async (request) => {
  let key = "";
  const downloadResource = downloadResources.find((url) => request.url.indexOf(url) !== -1);
  if (downloadResource && request.method === "GET") {
    // download
    const url = new URL(request.url);
    key = url.searchParams.get("md5");
    if (key) {
      key = downloadResource + key;
    } else if (url.pathname) {
      key = downloadResource + url.pathname;
    }
  }
  if (key) {
    // 读取缓存数据
    // Todo 如果是ishotproject、gltf、hdr要清理掉上一个缓存，可以通过postMessage进行通信处理优化
    const cachedResponse = await db.read(key);
    if (cachedResponse) {
      return cachedResponse;
    }

    return fetch(request).then(async (fetchedResponse) => {
      await db.write(key, fetchedResponse.clone());
      // Return the network response
      return fetchedResponse;
    });
  }
  return fetch(request);
};
