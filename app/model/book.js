export default class Book {

  /**
   * @param data Blob object of the epub file
   * @param metadata The metadata extracted from opf file
   * @param spineItems The spine items extracted from opf file
   */
  constructor(data, metadata, spineItems) {
    this._data = data;
    this._metadata = metadata;
    this._spineItems = spineItems;
  }

  getSpineItem(index) {
    return this._spineItems[index];
  }

  get spineItemsCount() {
    return this.spineItems.length;
  }

  get firstSpineItem() {
    return this.getSpineItem(0);
  }

  get metadata() {
    return this._metadata;
  }

  get format() {
    return this._metadata['meta'].find(data => data['_property'] === 'rendition:layout')['__text'];
  }

  get spineItems() {
    return this._spineItems;
  }

  get data() {
    return this._data;
  }
}
