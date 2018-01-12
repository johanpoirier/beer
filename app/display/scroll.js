import Base from './base';
import EventedMixin from '../mixin/evented';

const ZOOM_SCALE_MULTIPLIER = 1.5;

export default class Scroll extends EventedMixin(Base) {

  constructor(element) {
    super(...arguments);

    this._element.classList.add('scroll');
    this._element.addEventListener('scroll', onScroll.bind(this));

    this._frames = [];
  }

  display(book) {
    super.display(book);

    this._currentSpineItemIndex = -1;

    displayNextSpine.call(this).then(displayNextSpine.bind(this));
  }

  /**
   *
   */
  previous() {
    this._element.scrollBy(0, Math.round(-1 * this._element.clientHeight * 0.95));
  }

  /**
   *
   */
  next() {
    if (this._element.scrollTop > this._element.scrollHeight - 2 * this._element.clientHeight) {
      displayNextSpine.call(this);
    }
    this._element.scrollBy(0, Math.round(this._element.clientHeight * 0.95));
  }

  /**
   * Zoom in just multiply display ratio by FONT_SCALE_MULTIPLIER
   */
  zoomIn() {
    // Stop zoom if ratio is grater than 2
    if (this._displayRatio > 2) return;
    this._displayRatio *= Base.FONT_SCALE_MULTIPLIER;
    zoom.call(this, this._displayRatio);
    this.redraw();
  }

  /**
   * Zoom out just divise display ratio by FONT_SCALE_MULTIPLIER
   */
  zoomOut() {
    // Stop zoom if ratio is small than 2
    if (this._displayRatio < 0.5) return;
    this._displayRatio /= Base.FONT_SCALE_MULTIPLIER;
    zoom.call(this, this._displayRatio);
    this.redraw();
  }

  /**
   *
   */
  redraw() {
    this._frames.forEach(frame => {
      const document = frame.contentWindow.document;
      const html = document.querySelector('html');

      frame.style['height'] = `${document.body.clientHeight + 100}px`;

      html.style['overflow-x'] = 'hidden';
      html.style['transform-origin'] = '0 0 0';
    });
  }
}

/**
 *
 * @param spineItemIndex
 */
function displayNextSpine() {
  this._currentSpineItemIndex += 1;
  const spineItem = this._book.getSpineItem(this._currentSpineItemIndex);

  if (!spineItem) {
    return Promise.resolve();
  }

  const frameId = `beer-epub-frame-${this._currentSpineItemIndex}`;
  const frame = document.createElement('iframe');
  frame.id = frameId;
  frame.setAttribute('sandbox', 'allow-same-origin allow-scripts');
  this._element.appendChild(frame);

  return loadFrame.call(this, frame, spineItem.href).then(frame => {
    zoomFrame.call(this, frame, this._displayRatio);
    frame.style['opacity'] = '1';
    frame.style['height'] = `${frame.contentWindow.document.body.clientHeight + 50}px`;
    frame.contentWindow.document.body.style['overflow'] = 'hidden';

    this._frames.push(frame);

  });
}

/**
 * @param href The relative URL to a .html file inside the epub
 */
function loadFrame(frame, href) {
  return new Promise(resolve => {
    frame.style['opacity'] = '0';
    frame.setAttribute('src', `___/${this._book.hash}/${href}`);

    const self = this;

    function frameOnLoad() {
      self.trigger('load', frame.contentWindow.document);
      frame.removeEventListener('load', frameOnLoad, true);
      resolve(frame);
    }

    frame.addEventListener('load', frameOnLoad, true);
  });
}

function zoomFrame(frame, multiplier) {
  frame.contentWindow.document.body.style['font-size'] = `${100 * multiplier}%`;
}

function onScroll() {
  if (this._element.scrollTop > this._element.scrollHeight - 2 * this._element.clientHeight) {
    displayNextSpine.call(this);
  }
}

function zoom(multiplier) {
  if (multiplier == 1) return;
  this._frames.forEach(frame => {
    zoomFrame(frame, multiplier);
  });
}
