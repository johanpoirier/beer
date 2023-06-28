import Base from './base';
import EventedMixin from '../mixin/evented';
import { debounce } from '../tools';

export default class Fixed extends EventedMixin(Base) {
  constructor(element, displayOptions) {
    super(...arguments);

    this._element.classList.add('fixed');
    window.addEventListener('resize', debounce(() => {
      fitContent.call(this, this._frames[0]);
    }, 100), false);

    this._frames = [];
  }

  display(book) {
    super.display(book);

    this._frameCount = 1;
    if (book.isSpreadAuto) {
      this._frameCount = 2;
    }

    for (let i = 0; i < this._frameCount; i++) {
      const frame = createFrame(i);
      this._frames.push(frame);
      this._element.appendChild(frame);
      frame.addEventListener('load', () => frameLoaded.call(this, frame));
    }

    this._currentSpineItemIndex = 0;
    displaySpines.call(this);
  }

  /**
   *
   */
  previous() {
    if (this._currentSpineItemIndex > this.frameCount) {
      this._currentSpineItemIndex -= this.frameCount;
    }
    displaySpines.call(this);
  }

  /**
   *
   */
  next() {
    this._currentSpineItemIndex += this.frameCount;
    displaySpines.call(this);
  }

  /**
   *
   */
  redraw() {
    this._frames.forEach(frame => {
      const html = frame.contentWindow.document.querySelector('html');

      frame.style.width = '0';
      html.style.transform = '';

      frame.style.width = `${Math.round(this._displayRatio * frame.contentDocument.body.scrollWidth)}px`;

      html.style['overflow-y'] = 'hidden';
      html.style['transform-origin'] = '0 0 0';
      html.style.transform = `scale(${this._displayRatio})`;

      frame.style.opacity = '1';
    });
  }

  get frameCount() {
    return this._frameCount;
  }
}

/**
 *
 * @param frame
 */
function frameLoaded(frame) {
  this.trigger('load', frame.contentDocument);
  fitContent.call(this, frame);
  frame.contentWindow.addEventListener('unload', () => { frame.style.opacity = '0'; return true; }, false);
}

/**
 *
 */
function displaySpines() {
  const spineDisplayPromises = [];

  let index = 0;
  this._frames.forEach(frame => {
    const spineItem = this._book.getSpineItem(this._currentSpineItemIndex + index);
    if (spineItem) {
      spineDisplayPromises.push(loadFrame(frame, this._book.hash, spineItem.href));
    }
    index++;
  });

  return Promise.all(spineDisplayPromises);
}

function createFrame(index) {
  const frame = document.createElement('iframe');
  frame.id = `beer-epub-frame-${index}`;
  frame.src = 'about:blank';

  return frame;
}

/**
 * @param frame
 * @param hash The book hash
 * @param href The relative URL to a .html file inside the epub
 */
function loadFrame(frame, hash, href) {
  return new Promise(resolve => {
    frame.style.opacity = '0';
    frame.setAttribute('src', `___/${hash}/${href}`);
    resolve(frame);
  });
}

function fitContent(frame) {
  const document = frame.contentWindow.document;
  const body = document.querySelector('body');

  this._displayRatio = frame.clientHeight / body.clientHeight;

  this.redraw(this);
}
