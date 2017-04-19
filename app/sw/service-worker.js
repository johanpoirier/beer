self.importScripts('jszip.js');

const config = {
  version: 'CURRENT_VERSION',
  epubPattern: /____\/(.*)$/
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

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
self.addEventListener('message', event => self.epub = event.data);

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

  function onFetch(event) {
    const request = event.request;
    const fileMatch = request.url.match(config.epubPattern);
    if (fileMatch && fileMatch.length > 0) {
      const filePath = fileMatch[1];
      event.respondWith(getFileInEpub(filePath));
    }
  }

  if (shouldHandleFetch(event, config)) {
    console.info('\u2663 Fetching in epub', event.request.url);
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

function getEpubBlob() {
  return Promise.resolve(self.epub);
}

function getFileInEpub(filePath) {
  return getEpubBlob()
    .then(function (blob) { return JSZip.loadAsync(blob); })
    .then(function (zip) {
      const zipFile = zip.file(filePath);
      if (!zipFile) {
        throw new Exception(`${filePath} not found in zip file`);
      }
      return zipFile.async('arraybuffer');
    })
    .then(function(data) { return getZipResponse(getMimeTypeFromFileExtension(filePath), data); })
    .catch(function(error) { return new Response(error, { status: 404 }); });
}

function getMimeTypeFromFileExtension(filePath) {
  var fileExtMatch = filePath.match(/\.(\w*)$/);
  if (fileExtMatch && fileExtMatch.length > 1) {
    return mimeTypeMap[fileExtMatch[1]] || mimeTypeMap.default;
  }
  return mimeTypeMap.default;
}
