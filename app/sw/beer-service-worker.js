self.importScripts('jszip.js');

const config = {
  version: 'CURRENT_VERSION',
  epubPattern: /____\/(.*)$/,
  cachePattern: /\.(?:css|js|jpg|png|ttf|woff|eot|otf)$/
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

self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('install', event => {
  function onInstall(event, opts) {
    return caches.delete(cacheName('epub', opts));
  }

  event.waitUntil(onInstall(event, config).then(() => self.skipWaiting()));
});

self.addEventListener('message', event => {
  self.epub = event.data;
  caches.delete(cacheName('epub', config));
});

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

  function onFetch(event, opts) {
    const request = event.request;
    const fileMatch = request.url.match(opts.epubPattern);

    if (fileMatch && fileMatch.length > 0) {
      const filePath = fileMatch[1];
      event.respondWith(
        fetchFromCache(request)
          .catch(() => getFileInEpub(request.url, filePath))
          .then(response => addToCache(cacheName('epub', opts), opts, request, response))
      );
    }
  }

  if (shouldHandleFetch(event, config)) {
    onFetch(event, config);
  }
});

function getZipResponse(url, mimeType, arrayBuffer) {
  const init = {
    status: 200,
    statusText: 'OK',
    headers: {
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public',
      'Content-Type': mimeType,
      'Content-Length': arrayBuffer.byteLength
    },
    type: 'basic',
    url: url
  };
  return new Response(new Blob([arrayBuffer], { type: mimeType }), init);
}

function getEpubBlob() {
  return Promise.resolve(self.epub);
}

function getFileInEpub(url, filePath) {
  console.debug(`fetching ${filePath} from the epub file`);
  return getEpubBlob()
    .then(function (blob) { return JSZip.loadAsync(blob); })
    .then(function (zip) {
      const zipFile = zip.file(filePath);
      if (!zipFile) {
        throw new Exception(`${filePath} not found in zip file`);
      }
      return zipFile.async('arraybuffer');
    })
    .then(function(data) { return getZipResponse(url, getMimeTypeFromFileExtension(filePath), data); })
    .catch(function(error) { return new Response(error, { status: 404 }); });
}

function getMimeTypeFromFileExtension(filePath) {
  var fileExtMatch = filePath.match(/\.(\w*)$/);
  if (fileExtMatch && fileExtMatch.length > 1) {
    return mimeTypeMap[fileExtMatch[1]] || mimeTypeMap.default;
  }
  return mimeTypeMap.default;
}

function cacheName(key, opts) {
  return `${opts.version}-${key}`;
}

function addToCache(cacheKey, opts, request, response) {
  if (response.ok && request.url.match(opts.cachePattern)) {
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
      console.debug(`fetching ${request.url} from cache`);
      return response;
    }
    return Promise.reject();
  });
}

function offlineResponse() {
  return new Response();
}
