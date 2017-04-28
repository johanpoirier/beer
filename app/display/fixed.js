import Base from './base';
import EventedMixin from '../mixin/evented';

export default class Fixed extends EventedMixin(Base) {

  constructor(element) {
    super(...arguments);

    this._element.classList.add('fixed');
    window.addEventListener('resize', debounce(() => {
      fitContent.call(this, this._frames[0]);
    }, 100), false);

    this._frames = [];
    for (let i = 0; i < 2; i++) {
      const frame = createFrame(i);
      this._frames.push(frame);
      this._element.appendChild(frame);
    }
  }

  display(book) {
    super.display(book);

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
      frame.style['width'] = `${Math.round(this._displayRatio * frame.contentDocument.body.clientWidth)}px`;

      const html = frame.contentWindow.document.querySelector('html');
      html.style['overflow-y'] = 'hidden';
      html.style['transform-origin'] = '0 0 0';
      html.style['transform'] = `scale(${this._displayRatio})`;
    });
  }

  get frameCount() {
    return this._frames.length;
  }
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
      spineDisplayPromises.push(loadFrame.call(this, frame, spineItem.href).then(frame => {
        fitContent.call(this, frame);
        frame.style['opacity'] = '1';
      }));
    }
    index++;
  });

  return Promise.all(spineDisplayPromises);
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
  this.redraw(this);
}


function debounce(func, wait, immediate) {
  var timeout;
  return function () {
    var context = this, args = arguments;
    var later = function () {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}
