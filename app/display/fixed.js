import Base from './base';
import EventedMixin from '../mixin/evented';
import { debounce } from '../tools';

export default class Fixed extends EventedMixin(Base) {

  constructor(element) {
    super(...arguments);

    this._element.classList.add('fixed');
    window.addEventListener('resize', debounce(() => {
      fitContent.call(this, this._frames[0]);
    }, 100), false);

    this._frames = {};
  }

  display(book) {
    super.display(book);

    /* start to fix layout for each spine */
    book.setFixedSpines().forEach(spread => {
      createFrame.call(this, spread);
    });

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
    for (let spread in this._frames) {
      const frame = this._frames[spread];
      const html = frame.contentWindow.document.querySelector('html');

      frame.style['width'] = '0';
      html.style['transform'] = '';

      frame.style['width'] = `${Math.round(this._displayRatio * frame.contentDocument.body.scrollWidth)}px`;

      html.style['overflow-y'] = 'hidden';
      html.style['transform-origin'] = '0 0 0';
      html.style['transform'] = `scale(${this._displayRatio})`;

      frame.style['opacity'] = '1';
    }
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
  frame.contentWindow.addEventListener('unload', () => frame.style['opacity'] = '0', false);
}

/**
 *
 */
function displaySpines() {
  const spineDisplayPromises = [];
  let spineItem = this._book.getSpineItem(this._currentSpineItemIndex);

  if (spineItem) {
    spineDisplayPromises.push(loadFrame(this._frames[spineItem.where], this._book.hash, spineItem.href));
    if (this._book.needMoreItem(this._currentSpineItemIndex)) {
      spineItem = this._book.getSpineItem(this._currentSpineItemIndex + 1);
      if (spineItem) {
        spineDisplayPromises.push(loadFrame(this._frames[spineItem.where], this._book.hash, spineItem.href));
      }
    }
  }
  return Promise.all(spineDisplayPromises);
}

function createFrame(where) {
  /* create container */
  const container = document.createElement('div');
  container.classList.add('container');
  container.classList.add(where);

  const frame = document.createElement('iframe');
  frame.id = `beer-epub-frame-${where}`;
  frame.src = 'about:blank';
  frame.addEventListener('load', () => frameLoaded.call(this, frame));
  
  container.appendChild(frame);
  this._element.appendChild(container);

  this._frames[where] = frame;
  return frame;
}

function enableContainer(where) {
  const container = this._element.querySelector(`div.container${where}`);
  container.style['display'] = 'flex';
}
function disableContainer(where) {
  const container = this._element.querySelector(`div.container${where}`);
  container.style['display'] = 'none';
}

/**
 * @param frame
 * @param hash The book hash
 * @param href The relative URL to a .html file inside the epub
 */
function loadFrame(frame, hash, href) {
  return new Promise(resolve => {
    frame.style['opacity'] = '0';
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
