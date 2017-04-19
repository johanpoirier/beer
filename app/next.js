import serviceWorkerInstall from './sw/install';
import Opf from './opf';

const parser = new DOMParser();

function openBook(url) {
  "use strict";

  const epubContext = {};

  fetch(url)
    .then(response => response.blob())
    .then(epubBlob => {
      sendEpubToSw(epubBlob);
      return JSZip.loadAsync(epubBlob);
    })
    .then(zip => {
      epubContext.zip = zip;
      return epubContext;
    })
    .then(getOpf)
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

function getOpf(context) {
  return getFile(context.zip, 'META-INF/container.xml')
    .then(containerXml => {
      const container = parser.parseFromString(containerXml.trim(), 'text/xml');

      context.opfFilePath = getOpfFilePath(container);
      context.basePath = getBasePath(context.opfFilePath);

      return Promise.all([getBasePath(context.opfFilePath), getFile(context.zip, context.opfFilePath)]);
    })
    .then(([basePath, opfXml]) => Opf.create(basePath, parser.parseFromString(opfXml.trim(), 'text/xml')));
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

function Next() {

  const frame = document.querySelector('#next-epub-frame');

  this.currentSpine = 0;

  this.openBook = url => {
    const epubContext = {};

    fetch(url)
      .then(response => response.blob())
      .then(epubBlob => {
        sendEpubToSw(epubBlob);
        return JSZip.loadAsync(epubBlob);
      })
      .then(zip => {
        this.zip = zip;
        epubContext.zip = zip;
        return epubContext;
      })
      .then(getOpf)
      .then(opf => {
        this.opf = opf;
        this.openSpine(opf.getSpineItem(1))
      });
  };

  this.openSpine = item => {
    frame.setAttribute('src', `____/${item._href}`);
  };

  this.openNextSpine = () => {
    this.currentSpine++;
    this.openSpine(this.opf.getSpineItem(this.currentSpine));
  };

  serviceWorkerInstall().then(() => console.log('service worker ready'));
}

export default Next;
