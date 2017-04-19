import serviceWorkerInstall from './sw/install';

serviceWorkerInstall().then(() => {
  console.log('service worker ready');
  openBook();
});

const frame = document.querySelector('#next-epub-frame');
const parser = new DOMParser();

function openBook() {
  "use strict";

  const epubContext = {
    url: '/epubs/l-odyssee.epub'
  };

  fetch(epubContext.url)
    .then(response => response.blob())
    .then(epubBlob => {
      sendEpubToSw(epubBlob);
      return JSZip.loadAsync(epubBlob);
    })
    .then(zip => {
      epubContext.zip = zip;
      return epubContext;
    })
    .then(getOpfContent)
    .then(getFirstSpineItemHref)
    .then(itemHref => {
      frame.setAttribute('src', `____/${itemHref}`);
    });
  }

function getFile(zip, path, format = 'string') {
  const zipFile = zip.file(path);
  if (!zipFile) {
    return Promise.reject(`file ${path} not found in zip`);
  }
  return zipFile.async(format);
}

function getBasePath(contentFilePath) {
  var result = contentFilePath.match(/^(\w*)\/\w*\.opf$/);
  if (result) {
    return result[1] + '/';
  }
  return '';
}

function getOpfFilePath(container) {
  return container.querySelector('rootfile').getAttribute('full-path');
}

function getOpfContent(epubContext) {
  return getFile(epubContext.zip, 'META-INF/container.xml')
    .then(containerXml => {
      const container = parser.parseFromString(containerXml.trim(), 'text/xml');

      epubContext.opfFilePath = getOpfFilePath(container);
      epubContext.basePath = getBasePath(epubContext.opfFilePath);

      return getFile(epubContext.zip, epubContext.opfFilePath);
    })
    .then(opfXml => {
      epubContext.opf = parser.parseFromString(opfXml.trim(), 'text/xml');
      return epubContext;
    });
}

function getFirstSpineItemHref(epubContext) {
  const items = epubContext.opf.querySelectorAll('spine > itemref');
  const randomItem = items[Math.round(Math.random() * items.length)];
  const item = epubContext.opf.querySelector(`item#${randomItem.getAttribute('idref')}`);
  return `${epubContext.basePath}${item.getAttribute('href')}`;
}

function sendEpubToSw(epub) {
  if (!navigator.serviceWorker.controller) {
    console.warn('no controller for service worker!');
    return;
  }
  navigator.serviceWorker.controller.postMessage(epub);
}
