import serviceWorkerInstall from './sw/install';
import forge from './lib/forge.sha1';
import JSZip from '../node_modules/jszip/dist/jszip.js';
import Opf from './model/opf';
import Book from './model/book';
import Encryption from './model/encryption';
import Scroll from './display/scroll';
import Page from './display/page';
import Fixed from './display/fixed';
import Base from './display/base';

export default class Beer {
  /**
   * @param book A Book
   */
  constructor(book) {
    this._book = book;
  }

  static init() {
    return new Promise((resolve, reject) => {
      serviceWorkerInstall()
        .then(registration => {
          // registration.onupdatefound = () => onServiceWorkerUpdate(registration); // should do something with that

          if (navigator.serviceWorker.controller !== null) {
            return resolve();
          }

          navigator.serviceWorker.oncontrollerchange = function() {
            this.controller.onstatechange = function() {
              if (this.state === 'activated') {
                window.location.reload(); // SW do not control the page immediately in FF :(
                resolve();
              }
            };
          };
        })
        .catch(reject);
    });
  }

  /**
   * Create new BEER reader that will load a book from the url
   *
   * @param url The URL of the epub
   * @returns Promise that resolves with the BEER reader
   */
  static withBook(url) {
    return loadBook(url)
      .then(sendEpubToSw)
      .then(book => new Beer(book))
      .catch(console.error);
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
    const defaultOptions = getDefaultDisplayOptions();
    this._displayOptions = Object.assign(defaultOptions, displayOptions);

    if (this._book.isFixedLayout) {
      this._displayOptions.mode = 'fixed';
    }

    let readerDisplay;
    if (this._displayOptions.mode === 'scroll') {
      readerDisplay = new Scroll(htmlElement, this._displayOptions);
    } else if (this._displayOptions.mode === 'fixed') {
      readerDisplay = new Fixed(htmlElement, this._displayOptions);
    } else {
      readerDisplay = new Page(htmlElement, this._displayOptions);
    }

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => e.matches && readerDisplay._displayOptions.theme === Base.AUTO_THEME && readerDisplay.autoTheme());
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => e.matches && readerDisplay._displayOptions.theme === Base.AUTO_THEME && readerDisplay.autoTheme());

    readerDisplay.display(this._book, this._displayOptions.cfi || null);

    return readerDisplay;
  }
}

function loadBook(url) {
  return fetch(url)
    .then(response => response.blob())
    .then(blob => Promise.all([blob, JSZip.loadAsync(blob)]))
    .then(([blob, zip]) => Promise.all([blob, zip, getOpf(zip)]))
    .then(([blob, zip, opf]) => Promise.all([blob, opf, getEncryptionData(zip, opf)]))
    .then(([blob, opf, encryptionData]) => new Book(hashCode(url), blob, opf.metadata, opf.spineItems, encryptionData));
}

function getFile(zip, path, format = 'string') {
  const zipFile = zip.file(path);
  if (!zipFile) {
    // eslint-disable-next-line prefer-promise-reject-errors
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

function getEncryptionData(zip, opf) {
  const parser = new DOMParser();
  return getFile(zip, 'META-INF/encryption.xml')
    .then(encryptionXml => {
      const xmlDoc = parser.parseFromString(encryptionXml.trim(), 'text/xml');
      return Encryption.create(xmlDoc, opf);
    }, () => Encryption.empty());
}

function sendEpubToSw(book) {
  return new Promise(resolve => {
    navigator.serviceWorker.controller.postMessage({
      hash: book.hash,
      blob: book.data,
      encryptedItems: book.encryptionData.encryptedItems
    });

    resolve(book);
  });
}

function getDefaultDisplayOptions() {
  return {
    mode: 'page',
    columnCount: Base.DEFAULT_COLUMN_COUNT,
    margin: Base.DEFAULT_MARGIN,
    theme: Base.AUTO_THEME,
    ratio: Base.DEFAULT_RATIO
  };
}

function hashCode(string) {
  const md = forge.md.sha1.create();
  md.update(string, 'utf8');
  return md.digest().toHex();
}
