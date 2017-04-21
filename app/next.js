import serviceWorkerInstall from './sw/install';
import Opf from './model/opf';
import Book from './model/book';

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

  get displayElement() {
    return this._frameElement.contentWindow.document;
  }

  get displayOptions() {
    return this._displayOptions;
  }

  /**
   * Display loaded book on a HTML element
   *
   * @param frameElement a HTML element
   * @param displayOptions
   */
  displayBook(frameElement, displayOptions = false) {
    this._frameElement = frameElement;
    if (!frameElement) {
      throw new Error('frame element not found');
    }

    this._displayOptions = displayOptions || getDefaultDisplayOptions();

    this._currentSpineItemIndex = 0;
    this.displaySpine(this._currentSpineItemIndex);
  }

  /**
   *
   * @param spineItemIndex
   */
  displaySpine(spineItemIndex) {
    this._currentSpineItemIndex = spineItemIndex;
    const spineItem = this._book.getSpineItem(this._currentSpineItemIndex);
    this._frameElement.setAttribute('src', `____/${spineItem.href}`);
  }

  /**
   *
   */
  displayNextSpine() {
    if (this._currentSpineItemIndex >= this._book.spineItemsCount - 1) {
      return;
    }
    this._currentSpineItemIndex += 1;
    this.displaySpine(this._currentSpineItemIndex);
  }

  /**
   *
   */
  displayPreviousSpine() {
    if (this._currentSpineItemIndex <= 0) {
      return;
    }
    this._currentSpineItemIndex -= 1;
    this.displaySpine(this._currentSpineItemIndex);
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
    mode: 'scroll'
  };
}
