self.importScripts('jszip.js');

const config = {
  version: 'suzuki-2',
  epubPattern: /___\/\w+\/(.*)$/,
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
  ncx: 'application/x-dtbncx+xml',
  opf: 'application/oebps-package+xml',
  png: 'image/png',
  svg: 'image/svg+xml',
  xhtml: 'application/xhtml+xml'
};

if (config.debug === false) {
  console.debug = function () {};
}

/**
 * On SW activation:
 *  - clean old cache entries
 *  - force clients claim
 */
self.addEventListener('activate', function (event) {
  function onActivate(version) {
    return caches.keys()
      .then(cacheKeys => {
        const oldCacheKeys = cacheKeys.filter(key => (key.indexOf(version) !== 0) && (key.indexOf('ebook') !== 0));
        const deletePromises = oldCacheKeys.map(oldKey => caches.delete(oldKey));
        return Promise.all(deletePromises);
      });
  }

  event.waitUntil(onActivate(config.version).then(function() {
    console.debug(`[BEER-SW] Claiming clients for version ${config.version}`);
    return self.clients.claim();
  }));
});

/**
 * On SW installation:
 *  - force immediate installation
 */
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));

/**
 * The only message received is the epub data with its URL
 */
self.addEventListener('message', event => {
  self.epubBlob = event.data.blob;
  self.epubHash = event.data.hash;
  self.epubZip = null;
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
    const failingCriteria = Object.keys(criteria).filter(function (criteriaKey) {
      return !criteria[criteriaKey];
    });
    return !failingCriteria.length;
  }

  function onFetch(event, options) {
    const request = event.request;
    const fileMatch = request.url.match(options.epubPattern);

    if (fileMatch && fileMatch.length > 0) {
      const filePath = fileMatch[1];
      event.respondWith(
        fetchFromCache(request)
          .catch(() => getFileInEpub(filePath))
          .then(response => addToCache(cacheName(self.epubHash), options, request, response))
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

function getEpubZip() {
  if (self.epubZip) {
    return Promise.resolve(self.epubZip);
  }
  return JSZip.loadAsync(self.epubBlob).then(zip => {
    self.epubZip = zip;
    return zip;
  });
}

function getFileInEpub(filePath) {
  console.debug(`[BEER-SW] fetching ${filePath} from the epub file`);
  return getEpubZip()
    .then(zip => {
      const zipFile = zip.file(filePath);
      if (!zipFile) {
        throw new Exception(`${filePath} not found in zip file`);
      }
      return zipFile.async('arraybuffer');
    })
    .then(data => getZipResponse(getMimeTypeFromFileExtension(filePath), data));
}

function getMimeTypeFromFileExtension(filePath) {
  var fileExtMatch = filePath.match(/\.(\w*)$/);
  if (fileExtMatch && fileExtMatch.length > 1) {
    return mimeTypeMap[fileExtMatch[1]] || mimeTypeMap.default;
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
      cache.put(request, copy);
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
    return Promise.reject();
  });
}

function notFoundResponse(error) {
  return new Response(error, { status: 404 });
}
