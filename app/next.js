import serviceWorkerInstall from './sw/install';
import Opf from './model/opf';
import Book from './model/book';

serviceWorkerInstall().then(() => console.log('service worker ready'));

const parser = new DOMParser();

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

class Next {

  constructor(book) {
    this.book = book;
  }

  static withBook(url) {
    return fetch(url)
      .then(response => response.blob())
      .then(epubBlob => {
        sendEpubToSw(epubBlob);
        return JSZip.loadAsync(epubBlob);
      })
      .then(getOpf)
      .then(opf => new Next(new Book(opf.metadata, opf.spineItems)));
  }

  displayBook(frameElement) {
    this.frameElement = frameElement;

    const firstItem = this.book.getFirstSpineItem();
    this.frameElement.setAttribute('src', `____/${firstItem.href}`);
  }
}

export default Next;
