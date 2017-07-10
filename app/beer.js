import serviceWorkerInstall from './sw/install';
import Opf from './model/opf';
import Book from './model/book';
import Scroll from './display/scroll';
import Page from './display/page';
import Fixed from './display/fixed';

export default class Beer {

  /**
   * @param book A Book
   */
  constructor(book) {
    this._book = book;
  }

  /**
   * Create new BEER reader that will load a book from the url
   *
   * @param url The URL of the epub
   * @returns Promise that resolves with the BEER reader
   */
  static withBook(url) {
    return Promise.all([serviceWorkerInstall(), loadBook(url)])
      .then(([registration, book]) => sendEbookWhenServiceWorkerReady(registration, book))
      .then(book => new Beer(book));
  }

  get book() {
    return this._book;
  }

  get displayOptions() {
    return this._displayOptions;
  }

  /**
   * Display loaded book on a HTML element
   *
   * @param htmlElement a HTML element
   * @param displayOptions
   */
  displayBook(htmlElement, displayOptions = false) {
    if (!htmlElement) {
      throw new Error('container HTML element not found');
    }

    this._displayOptions = displayOptions || getDefaultDisplayOptions();

    if (this._book.isFixedLayout) {
      this._displayOptions.mode = 'fixed';
    }

    let readerDisplay;
    if (this._displayOptions.mode === 'scroll') {
      readerDisplay = new Scroll(htmlElement);
    } else if (this._displayOptions.mode === 'fixed') {
      readerDisplay = new Fixed(htmlElement);
    } else {
      readerDisplay = new Page(htmlElement);
    }
    readerDisplay.display(this._book, this._displayOptions.cfi || null);

    return readerDisplay;
  }
}

function loadBook(url) {
  return fetch(url)
    .then(response => response.blob())
    .then(blob => Promise.all([blob, JSZip.loadAsync(blob).then(getOpf)]))
    .then(([blob, opf]) => new Book(hashCode(url), blob, opf.metadata, opf.spineItems));
}

function getFile(zip, path, format = 'string') {
  const zipFile = zip.file(path);
  if (!zipFile) {
    return Promise.reject(`file ${path} not found in zip`);
  }
  return zipFile.async(format);
}

function getBasePath(contentFilePath) {
  const result = contentFilePath.match(/^(\w*)\/\w*\.opf$/);
  if (result) {
    return result[1] + '/';
  }
  return '';
}

function getOpfFilePath(container) {
  return container.querySelector('rootfile').getAttribute('full-path');
}

function getOpf(zip) {
  const parser = new DOMParser();
  return getFile(zip, 'META-INF/container.xml')
    .then(containerXml => {

      const container = parser.parseFromString(containerXml.trim(), 'text/xml');
      const opfFilePath = getOpfFilePath(container);

      return Promise.all([getBasePath(opfFilePath), getFile(zip, opfFilePath)]);
    })
    .then(([basePath, opfXml]) => Opf.create(basePath, parser.parseFromString(opfXml.trim(), 'text/xml')));
}

function sendEpubToSw(book) {
  return new Promise(resolve => {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        hash: book.hash,
        blob: book.data
      });
    } else {
      console.warn('no controller for service worker!');
    }

    resolve(book);
  });
}

function getDefaultDisplayOptions() {
  return {
    mode: 'page'
  };
}

function hashCode(string) {
  let hash = 0, i, chr;
  if (string.length === 0) return hash;
  for (i = 0; i < string.length; i++) {
    chr = string.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

function sendEbookWhenServiceWorkerReady(registration, book) {
  if (registration.active !== null && registration.active.state === 'activated') {
    registration.onupdatefound = () => onServiceWorkerUpdate(registration, book);
    return sendEpubToSw(book);
  }

  return new Promise(resolve => {
    registration.onupdatefound = () => onServiceWorkerUpdate(registration, book, resolve);
  });
}

function onServiceWorkerUpdate(registration, book, callback) {
    const installingWorker = registration.installing;

    installingWorker.onstatechange = () => {
      if (installingWorker.state === 'activated' && navigator.serviceWorker.controller) {
        console.debug(`[BEER-SW] worker updated and activated`);
        if (callback) {
          return sendEpubToSw(book).then(callback);
        }
        return sendEpubToSw(book);
      }
    }
}