import Base from './base';
import EventedMixin from '../mixin/evented';

const ZOOM_SCALE_MULTIPLIER = 1.5;

export default class Fixed extends EventedMixin(Base) {

  constructor(element) {
    super(...arguments);

    this._element.classList.add('fixed');

    this._frames = [];
    for (let i = 0; i < 2; i++) {
      const frame = createFrame(i);
      this._frames.push(frame);
      this._element.appendChild(frame);
    }
  }

  get frameCount() {
    return this._frames.length;
  }

  display(book) {
    super.display(book);

    this._currentSpineItemIndex = 0;
    this.displaySpines();
  }

  /**
   *
   */
  previous() {
    if (this._currentSpineItemIndex > this.frameCount) {
      this._currentSpineItemIndex -= this.frameCount;
    }
    this.displaySpines();
  }

  /**
   *
   */
  next() {
    this._currentSpineItemIndex += this.frameCount;
    this.displaySpines();
  }

  /**
   *
   * @param spineItemIndex
   */
  displaySpines() {
    const spineDisplayPromises = [];

    let index = 0;
    this._frames.forEach(frame => {
      const spineItem = this._book.getSpineItem(this._currentSpineItemIndex + index);
      if (spineItem) {
        spineDisplayPromises.push(loadFrame.call(this, frame, spineItem.href).then(frame => {
          fitContent.call(this, frame);
          frame.style['opacity'] = '1';
        }));
      }
      index++;
    });

    return Promise.all(spineDisplayPromises);
  }
}

function createFrame(index) {
  const frame = document.createElement('iframe');
  frame.id = `next-epub-frame-${index}`;
  frame.setAttribute('sandbox', 'allow-same-origin allow-scripts');

  return frame;
}

/**
 * @param frame
 * @param href The relative URL to a .html file inside the epub
 */
function loadFrame(frame, href) {
  return new Promise(resolve => {
    frame.style['opacity'] = '0';
    frame.setAttribute('src', `____/${href}`);

    const self = this;

    function frameOnLoad() {
      self.trigger('load', frame.contentWindow.document);
      frame.removeEventListener('load', frameOnLoad, true);
      resolve(frame);
    }

    frame.addEventListener('load', frameOnLoad, true);
  });
}

function fitContent(frame) {
  const document = frame.contentWindow.document;
  const body = document.querySelector('body');

  this._displayRatio = frame.clientHeight / body.clientHeight;
  redrawFrames.call(this);
}

function redrawFrames() {
  this._frames.forEach(frame => {
    frame.style['height'] = `${Math.round(this._displayRatio * frame.contentDocument.body.clientHeight)}px`;

    const html = frame.contentWindow.document.querySelector('html');
    html.style['overflow-y'] = 'hidden';
    html.style['transform-origin'] = '0 0 0';
    html.style['transform'] = `scale(${this._displayRatio})`;
  });
}
