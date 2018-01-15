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
    this.spreads = book.setFixedSpines()
    this.spreads.forEach(spread => {
      createFrame.call(this, spread);
    });
    this._currentSpineIndex = 0;
    this._nextSpine = 0;
    displaySpines.call(this);
  }

  /**
   *
   */
  previous() {
    this._currentSpineIndex -= this._nextSpine;
    if (this._currentSpineIndex < 0) this._currentSpineIndex = 0;
    this._nextSpine = 0;
    displaySpines.call(this);
  }

  /**
   *
   */
  next() {
    this._currentSpineIndex += this._nextSpine;
    this._nextSpine = 0;
    displaySpines.call(this);
  }

  /**
   *
   */
  redraw() {
    for (let spread in this._frames) {
      const frame = this._frames[spread];
      const html = frame.contentWindow.document.querySelector('html');

      html.style['overflow'] = 'hidden';
      frame.style['transform-origin'] = '0 0 0';
      frame.style['transform'] = `scale(${this._displayRatio})`;
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

  /* spreads are sorted as 'center', 'left', 'right' */
  this.spreads.forEach(spread => {
    let spineItem = this._book.getSpineItem(this._currentSpineIndex+this._nextSpine);
    if (spineItem) {
      if (spread === spineItem.where) {
        spineDisplayPromises.push(loadFrame(this._frames[spineItem.where], this._book.hash, spineItem.href));
        this._nextSpine += 1;
      }
      else {
        spineDisplayPromises.push(clearFrame(this._frames[spread]));
      }
    }
    else {
      spineDisplayPromises.push(clearFrame(this._frames[spread]));
    }
  });
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

function clearFrame(frame) {
  return new Promise(resolve => {
    frame.style['opacity'] = '0';
    frame.setAttribute('src', 'about:blank');
    resolve(frame);
  });
}

function fitContent(frame) {
  const document = frame.contentWindow.document;
  const body = document.querySelector('body');

  this._displayRatio = Math.min(frame.parentElement.clientHeight / body.clientHeight, frame.parentElement.clientWidth / body.clientWidth);

  this.redraw(this);
}
