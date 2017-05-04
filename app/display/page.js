import Base from './base';
import EventedMixin from '../mixin/evented';
import { debounce } from '../tools';

const COLUMN_GAP = 20;

export default class Page extends EventedMixin(Base) {

  constructor(element) {
    super(...arguments);

    this._frame = createFrame();

    this._element.classList.add('page');
    this._element.appendChild(this._frame);

    window.addEventListener('resize', debounce(() => {
      fitContent(this._frame);
    }, 100), false);
  }

  display(book) {
    super.display(book);
    displaySpine.call(this, 0);
  }

  previous() {
    if (this._contentHtml.scrollLeft === 0) {
      previousSpine.call(this, 100);
    }
    this._frame.contentWindow.scrollBy(-1 * (this._contentHtml.clientWidth + COLUMN_GAP), 0);
  }

  next() {
    if (this._contentHtml.scrollLeft + this._contentHtml.clientWidth === this._contentHtml.scrollWidth) {
      nextSpine.call(this);
    }
    this._frame.contentWindow.scrollBy(this._contentHtml.clientWidth + COLUMN_GAP, 0);
  }
}

/**
 *
 * @returns {Element}
 */
function createFrame() {
  const frame = document.createElement('iframe');
  frame.id = 'next-epub-frame';
  frame.setAttribute('sandbox', 'allow-same-origin allow-scripts');

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

  if (!spineItem) {
    return Promise.resolve();
  }

  return loadFrame.call(this, spineItem.href).then(frame => {
    this._contentHtml = frame.contentDocument.querySelector('html');
    this._frame.contentWindow.scrollBy(Math.round(this._contentHtml.scrollWidth * position / 100), 0);
    frame.style['opacity'] = '1';
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

      fitContent(self._frame);

      resolve(self._frame);
    }

    this._frame.addEventListener('load', frameOnLoad, true);
  });
}

/**
 * @param frame
 */
function fitContent(frame) {
  const html = frame.contentDocument.querySelector('html');
  html.style['column-count'] = '2';
  html.style['column-gap'] = `${COLUMN_GAP}px`;
  html.style['break-inside'] = 'avoid';
  html.style['height'] = `${frame.clientHeight}px`;
  html.style['overflow'] = 'hidden';
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
