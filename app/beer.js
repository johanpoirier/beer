import serviceWorkerInstall from './sw/install';
import forge from './lib/forge.sha1';
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
  static withBookUrl(url) {
    return sendBookUrlToSw(url).then(h => loadBook(h))
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

function loadBook(hash) {
  return getOpf(hash)
    .then(opf => Promise.all([opf, getEncryptionData(hash, opf)]))
    .then(([opf, encryptionData]) => new Book(hash, opf.metadata, opf.spineItems, encryptionData));
}

function getFile(hash, path, format = 'string') {
  return fetch(`/___/${hash}/${path}`).then((response) => {
    if (format === 'string') {
      return response.text()
    }
    else {
      return response.arrayBuffer()
    }
  });
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

function getOpf(hash) {
  const parser = new DOMParser();
  return getFile(hash, 'META-INF/container.xml')
    .then(containerXml => {
      const container = parser.parseFromString(containerXml.trim(), 'text/xml');
      const opfFilePath = getOpfFilePath(container);

      return Promise.all([getBasePath(opfFilePath), getFile(hash, opfFilePath)]);
    })
    .then(([basePath, opfXml]) => Opf.create(basePath, parser.parseFromString(opfXml.trim(), 'text/xml')));
}

function getEncryptionData(hash, opf) {
  const parser = new DOMParser();
  return getFile(hash, 'META-INF/encryption.xml')
    .then(encryptionXml => {
      const xmlDoc = parser.parseFromString(encryptionXml.trim(), 'text/xml');
      return Encryption.create(xmlDoc, opf);
    }, () => Encryption.empty());
}

function sendBookUrlToSw(url) {
  return new Promise(resolve => {
    const h = hashCode(url);
    navigator.serviceWorker.controller.postMessage({
      hash: hashCode(url),
      url: url,
    });
    resolve(h);
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
