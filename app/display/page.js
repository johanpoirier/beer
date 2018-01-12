import Base from './base';
import EventedMixin from '../mixin/evented';
import EpubCfi from '../lib/epubcfi';
import {debounce} from '../tools';

const COLUMN_GAP = 20;
const COLUMN_DEFAULT_COUNT = 2;

const epubCfi = new EpubCfi();

export default class Page extends EventedMixin(Base) {

  constructor(element) {
    super(...arguments);

    this._frame = createFrame();
    this._columnCount = COLUMN_DEFAULT_COUNT;
    this._element.classList.add('page');
    this._element.appendChild(this._frame);

    window.addEventListener('resize', debounce(() => {
      fitContent.call(this, this._frame, this._columnCount);
    }, 100), false);
  }

  display(book, cfi = null) {
    super.display(book);
    if (cfi) {
      displaySpineFromCfi.call(this, cfi);
      return;
    }
    displaySpine.call(this, 0);
  }

  zoomIn() {
    // Stop zoom if ratio is grater than 2
    if (this._displayRatio > 2) return;
    this._displayRatio *= Base.FONT_SCALE_MULTIPLIER;
    zoom.call(this, this._displayRatio);
  }

  zoomOut() {
    // Stop zoom if ratio is small than 2
    if (this._displayRatio < 0.5) return;
    this._displayRatio /= Base.FONT_SCALE_MULTIPLIER;
    zoom.call(this, this._displayRatio);
  }


  previous() {
    if (this._frame.contentWindow.scrollX <= 0) {
      previousSpine.call(this, 100);
      return;
    }
    this._frame.contentWindow.scrollBy(-1 * (this._contentHtml.clientWidth + COLUMN_GAP), 0);
    this._position = computePosition(this._currentSpineItemCfi, this._frame);
  }

  next() {
    if (this._frame.contentWindow.scrollX + this._contentHtml.clientWidth >= this._contentHtml.scrollWidth) {
      nextSpine.call(this);
      return;
    }
    this._frame.contentWindow.scrollBy(this._contentHtml.clientWidth + COLUMN_GAP, 0);
    this._position = computePosition(this._currentSpineItemCfi, this._frame);
  }
}

/**
 *
 * @returns {Element}
 */
function createFrame() {
  const frame = document.createElement('iframe');
  frame.id = 'beer-epub-frame';

  return frame;
}

/**
 *
 * @param spineItemIndex
 * @param position
 */
function displaySpine(spineItemIndex, position = 0) {
  this._currentSpineItemIndex = spineItemIndex;
  this._position = position;

  const spineItem = this._book.getSpineItem(spineItemIndex);
  this._currentSpineItemCfi = spineItem.cfi;

  if (!spineItem) {
    return Promise.resolve();
  }

  return loadFrame.call(this, spineItem.href).then(frame => {
    this._contentHtml = frame.contentDocument.querySelector('html');
    zoom.call(this, this._displayRatio);

    this._frame.contentWindow.scrollBy(Math.round(this._contentHtml.scrollWidth * position / 100), 0);

    frame.style['opacity'] = '1';

    computeCfi(this._currentSpineItemCfi, this._contentHtml);
  });
}

/**
 *
 * @param cfi
 */
function displaySpineFromCfi(cfi) {
  const cfiObject = epubCfi.parse(cfi);

  this._currentSpineItemIndex = cfiObject.spinePos;

  const spineItem = this._book.getSpineItem(this._currentSpineItemIndex);
  this._currentSpineItemCfi = spineItem.cfi;

  if (!spineItem) {
    return Promise.resolve();
  }

  return loadFrame.call(this, spineItem.href).then(frame => {
    this._contentHtml = frame.contentDocument.querySelector('html');

    const htmlQuery = epubCfi.generateQueryFromSteps(cfiObject.steps);
    const elementToDisplay = this._contentHtml.querySelector(htmlQuery);
    const position = 100 * elementToDisplay.getClientRects()[0].left / this._contentHtml.scrollWidth;

    this._frame.contentWindow.scrollBy(Math.round(this._contentHtml.scrollWidth * position / 100), 0);
    frame.style['opacity'] = '1';

    computeCfi(this._currentSpineItemCfi, this._contentHtml);
  });
}

/**
 * @param href The relative URL to a .html file inside the epub
 */
function loadFrame(href) {
  return new Promise(resolve => {
    this._frame.style['opacity'] = '0';
    this._frame.setAttribute('src', `___/${this._book.hash}/${href}`);

    const self = this;

    function frameOnLoad() {
      self.trigger('load', self._frame.contentDocument);
      self._frame.removeEventListener('load', frameOnLoad, true);

      fitContent.call(self, self._frame, self._columnCount);

      resolve(self._frame);
    }

    this._frame.addEventListener('load', frameOnLoad, true);
  });
}

/**
 * @param frame
 * @param columnCount
 */
function fitContent(frame, columnCount) {
  const html = frame.contentDocument.querySelector('html');
  html.style['column-count'] = columnCount;
  html.style['column-gap'] = `${COLUMN_GAP}px`;
  html.style['break-inside'] = 'avoid';
  html.style['height'] = `${frame.clientHeight}px`;
  html.style['overflow'] = 'hidden';

  // position is not quite good yet
  const rawScrollLeft = html.scrollWidth * this._position / 100;
  frame.contentWindow.scrollTo(rawScrollLeft - (rawScrollLeft % (html.clientWidth + (columnCount - 1) * COLUMN_GAP)), 0);
}

/**
 *
 */
function previousSpine(position = 0) {
  if (this._currentSpineItemIndex > 0) {
    this._currentSpineItemIndex -= 1;
    displaySpine.call(this, this._currentSpineItemIndex, position);
  }
}

/**
 *
 */
function nextSpine(position = 0) {
  if (this._currentSpineItemIndex < this._book.spineItemsCount - 1) {
    this._currentSpineItemIndex += 1;
    displaySpine.call(this, this._currentSpineItemIndex, position);
  }
}

/**
 *
 * @param cfiBase
 * @param frame
 * @returns {number}
 */
function computePosition(cfiBase, frame) {
  const displayHtml = frame.contentDocument.querySelector('html');
  const cfi = computeCfi(cfiBase, displayHtml);
  console.debug(epubCfi.parse(cfi));
  return 100 * frame.contentWindow.scrollX / displayHtml.scrollWidth;
}

/**
 *
 * @param cfiBase
 * @param content
 * @returns {*}
 */
function computeCfi(cfiBase, content) {
  const firstVisibleElement = Array.from(content.querySelectorAll('body > *')).reduce((first, current) => {
    if (first) return first;
    if (current.getClientRects()[0].right > 0) return current;
  }, false);

  return epubCfi.generateCfiFromElement(firstVisibleElement, cfiBase);
}

/**
 * Very simple solution to handle font size management
 * Could be useful to check out Readium-CSS from J.Panoz
 *
 * @param multiplier
 */
function zoom(multiplier) {
  this._frame.contentWindow.document.body.style['font-size'] = `${100 * multiplier}%`;
}
