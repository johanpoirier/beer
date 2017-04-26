import serviceWorkerInstall from './sw/install';
import Opf from './model/opf';
import Book from './model/book';
import Scroll from './display/scroll';
import Page from './display/page';
import Fixed from './display/fixed';

export default class Next {

  /**
   * @param book A Book
   */
  constructor(book) {
    this._book = book;
  }

  /**
   * Create new Next reader that will load a book from the url
   *
   * @param url The URL of the epub
   * @returns Promise that resolves with the Next reader
   */
  static withBook(url) {
    return Promise.all([serviceWorkerInstall(), loadBook(url)])
      .then(([registration, book]) => {
        // service worker is ready, we send it the epub Blob
        sendEpubToSw(book.data);

        return new Next(book);
      });
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

    let readerDisplay;
    if (this._displayOptions.mode === 'scroll') {
      readerDisplay = new Scroll(htmlElement);
    } else if (this._displayOptions.mode === 'fixed') {
      readerDisplay = new Fixed(htmlElement);
    } else {
      readerDisplay = new Page(htmlElement);
    }
    readerDisplay.display(this._book);

    return readerDisplay;
  }
}

function loadBook(url) {
  return fetch(url)
    .then(response => response.blob())
    .then(blob => Promise.all([blob, JSZip.loadAsync(blob).then(getOpf)]))
    .then(([blob, opf]) => new Book(blob, opf.metadata, opf.spineItems));
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

function sendEpubToSw(epub) {
  if (!navigator.serviceWorker.controller) {
    console.warn('no controller for service worker!');
    return;
  }
  navigator.serviceWorker.controller.postMessage(epub);
}

function getDefaultDisplayOptions() {
  return {
    mode: 'page'
  };
}
