import Base from './base';
import EventedMixin from '../mixin/evented';

export default class Scroll extends EventedMixin(Base) {

  constructor(element) {
    super(...arguments);

    this._element = element;
    this._element.innerHTML = '<iframe id="next-epub-frame" src="about:blank" sandbox="allow-same-origin allow-scripts"></iframe>';
    this._frame = this._element.querySelector('iframe');

    this._frame.onload = () => {
      this.trigger('load', this._frame.contentWindow.document);
      fitContent.call(this);
    };
  }

  display(book) {
    this._book = book;
    this.displaySpine();
  }

  /**
   *
   * @param spineItemIndex
   */
  displaySpine(spineItemIndex = 0) {
    this._currentSpineItemIndex = spineItemIndex;
    const spineItem = this._book.getSpineItem(this._currentSpineItemIndex);
    this._frame.style['opacity'] = '0';
    this._frame.setAttribute('src', `____/${spineItem.href}`);
  }

  /**
   *
   */
  nextSpine() {
    if (this._currentSpineItemIndex >= this._book.spineItemsCount - 1) {
      return;
    }
    this._currentSpineItemIndex += 1;
    this.displaySpine(this._currentSpineItemIndex);
  }

  /**
   *
   */
  previousSpine() {
    if (this._currentSpineItemIndex <= 0) {
      return;
    }
    this._currentSpineItemIndex -= 1;
    this.displaySpine(this._currentSpineItemIndex);
  }

  /**
   *
   */
  zoomIn() {
    this._displayRatio *= 1.5;
    updateRatio.call(this);
  }

  /**
   *
   */
  zoomOut() {
    this._displayRatio *= 0.75;
    updateRatio.call(this);
  }
}

function fitContent() {
  const document = this._frame.contentWindow.document;
  const body = document.querySelector('body');

  fitContentToHeight.call(this, body);
  this._frame.style['opacity'] = '1';
}

function fitContentToWidth(body) {
  this._displayRatio = this._frame.clientWidth / body.clientWidth;
  updateRatio.call(this);
}

function fitContentToHeight(body) {
  this._displayRatio = this._frame.clientHeight / body.clientHeight;
  updateRatio.call(this);

  this._frame.style['padding-left'] = `${Math.round((this._frame.clientWidth - (body.clientWidth * this._displayRatio)) / 2)}px`;
}

function updateRatio() {
  const document = this._frame.contentWindow.document;
  const html = document.querySelector('html');

  html.style['overflow-x'] = 'hidden';
  html.style['transform'] = `scale(${this._displayRatio})`;
  html.style['transform-origin'] = '0 0 0';
}
