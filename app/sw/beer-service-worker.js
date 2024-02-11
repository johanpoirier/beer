const config = {
  version: 'ninja-11',
  epubPattern: /___\/(\w+)\/(.*)$/,
  cachePattern: /\.(?:css|js|jpg|png|svg|ttf|woff|eot|otf|html|xhtml|mp3|m4a)$/,
  debug: true
};

const mimeTypeMap = {
  default: 'application/octet-stream',
  css: 'text/css',
  epub: 'application/epub+zip',
  gif: 'image/gif',
  htm: 'text/html',
  html: 'text/html',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  ncx: 'application/x-dtbncx+xml',
  opf: 'application/oebps-package+xml',
  png: 'image/png',
  svg: 'image/svg+xml',
  ttf: 'application/x-font-truetype',
  xhtml: 'application/xhtml+xml'
};

if (config.debug === false) {
  console.debug = function() {
  };
}

zip.configure({
  useWebWorkers: false
})

/**
 * On SW activation:
 *  - clean old cache entries
 *  - force clients claim
 */
self.addEventListener('activate', function(event) {
  function onActivate(version) {
    return caches.keys()
      .then(cacheKeys => {
        const oldCacheKeys = cacheKeys.filter(key => (key.indexOf(version) !== 0) && (key.indexOf('ebook') !== 0));
        const deletePromises = oldCacheKeys.map(oldKey => caches.delete(oldKey));
        return Promise.all(deletePromises);
      });
  }

  console.debug('[BEER-SW] Activate');
  event.waitUntil(onActivate(config.version).then(function() {
    console.debug(`[BEER-SW] Claiming clients for version ${config.version}`);
    self.clients.matchAll({ includeUncontrolled: true }).then(clients => console.debug('[BEER-SW] Clients', clients.map(c => c.url)));
    return self.clients.claim();
  }));
});

/**
 * On SW installation:
 *  - force immediate installation
 */
self.addEventListener('install', event => {
  console.debug('[BEER-SW] Installation');
  return event.waitUntil(self.skipWaiting());
});

/**
 * The only message received is the epub data with its URL
 */
self.addEventListener('message', event => {
  if (!self.epubs) {
    self.epubs = {};
  }

  self.epubs[event.data.hash] = {
    blob: event.data.blob,
    url: event.data.url,
    encryptedItems: []
  };
});

/**
 * Fetch event strategy:
 *  - fetch from cache first
 *  - then fetch from epub zipped data
 *  - add responses to cache
 *  - 404 response if no resource found
 */
self.addEventListener('fetch', event => {
  function shouldHandleFetch(event, opts) {
    const request = event.request;
    const url = new URL(request.url);
    const criteria = {
      matchesPathPattern: opts.epubPattern.test(url.pathname),
      isGETRequest: request.method === 'GET',
      isFromMyOrigin: url.origin === self.location.origin
    };
    const failingCriteria = Object.keys(criteria).filter(function(criteriaKey) {
      return !criteria[criteriaKey];
    });
    return !failingCriteria.length;
  }

  function onFetch(event, options) {
    const request = event.request;
    const epubFileMatch = request.url.match(options.epubPattern);

    if (epubFileMatch && epubFileMatch.length > 0) {
      const epubHash = epubFileMatch[1];
      const filePath = epubFileMatch[2];
      event.respondWith(
        fetchFromCache(request)
          .catch(() => getFileInEpub(epubHash, filePath))
          .then(response => addToCache(cacheName(epubHash), options, request, response))
          .catch(notFoundResponse())
      );
    }
  }

  if (shouldHandleFetch(event, config)) {
    onFetch(event, config);
  }
});

function getZipResponse(mimeType, arrayBuffer) {
  const init = {
    status: 200,
    statusText: 'OK',
    headers: {
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public',
      'Content-Type': mimeType,
      'Content-Length': arrayBuffer.byteLength
    }
  };
  return new Response(new Blob([arrayBuffer], { type: mimeType }), init);
}

function getZipFs(epubHash) {
  if (self.epubs[epubHash].zip) {
    return Promise.resolve(self.epubs[epubHash].zip)
  }
  else {
    self.epubs[epubHash].zip = new zip.fs.FS();
    if (self.epubs[epubHash].blob) {
      return self.epubs[epubHash].zip.importBlob(self.epubs[epubHash].blob);
    }
    else {
      return self.epubs[epubHash].zip.importHttpContent(self.epubs[epubHash].url, {
        preventHeadRequest: false,
        useRangeHeader: true,
      });
    }
  }
}

function getFileInEpub(epubHash, filePath) {
  console.debug(`[BEER-SW] fetching ${filePath} from the epub file`);
  return getZipFs(epubHash).then(() => {
    const entry = self.epubs[epubHash].zip.find(filePath)
    if (!entry) {
      return Promise.reject(`${filePath} not found in zip file`);
    }
    return entry.getUint8Array();
  }, () => {
    return Promise.reject("Cannot get zipfs for file");
  })
  .then(data => FileDecryptor.decrypt(self.epubs[epubHash], filePath, data))
  .then(data => getZipResponse(getMimeTypeFromFileExtension(filePath), data))
}

function getMimeTypeFromFileExtension(filePath) {
  const fileExtMatch = filePath.match(/\.(\w*)$/);
  if (fileExtMatch && fileExtMatch.length > 1) {
    return mimeTypeMap[fileExtMatch[1].toLowerCase()] || mimeTypeMap.default;
  }
  return mimeTypeMap.default;
}

function cacheName(hash) {
  return `ebook-${hash}`;
}

function addToCache(cacheKey, options, request, response) {
  if (response.ok && request.url.match(options.cachePattern)) {
    const copy = response.clone();
    caches.open(cacheKey).then(cache => {
      cache.put(request, copy).catch(console.warn);
    });
  }
  return response;
}

function fetchFromCache(request) {
  return caches.match(request).then(response => {
    if (response) {
      console.debug(`[BEER-SW] fetching ${request.url} from cache`);
      return response;
    }
    // eslint-disable-next-line prefer-promise-reject-errors
    return Promise.reject();
  });
}

function notFoundResponse(error) {
  return new Response(error, { status: 404 });
}
