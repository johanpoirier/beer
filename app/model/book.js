export const FORMAT_REFLOWABLE = 'reflowable';
export const FORMAT_FIXED_LAYOUT = 'pre-paginated';

export default class Book {
  /**
   * @param data Blob object of the epub file
   * @param metadata The metadata extracted from opf file
   * @param spineItems The spine items extracted from opf file
   */
  constructor(hash, data, metadata, spineItems) {
    this._hash = hash;
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

  get hash() {
    return this._hash;
  }

  get metadata() {
    return this._metadata;
  }

  get format() {
    const metaLayout = this._metadata['meta'].find(data => data['_property'] === 'rendition:layout');
    if (metaLayout) {
      return metaLayout['__text'];
    }
    return FORMAT_REFLOWABLE;
  }

  get isReflowable() {
    return this.format === FORMAT_REFLOWABLE;
  }

  get isFixedLayout() {
    return this.format === FORMAT_FIXED_LAYOUT;
  }

  get spineItems() {
    return this._spineItems;
  }

  get data() {
    return this._data;
  }
}
