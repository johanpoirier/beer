export default class Base {

  constructor(element) {
    this._element = element;
  }

  display(book) {
    this._book = book;
  }

  displaySpine(spineItemIndex, position = 0) {
    this._currentSpineItemIndex = spineItemIndex;
    this._position = position;
  }

  previous() {

  }

  next() {

  }
}
