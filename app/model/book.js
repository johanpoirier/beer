class Book {
  /**
   * @param hash The SHA-1 hash of the file name
   * @param data Blob object of the epub file
   * @param metadata The metadata extracted from opf file
   * @param spineItems The spine items extracted from opf file
   * @param encryptionData The encryption data (items and algorithms)
   */
  constructor(hash, metadata, spineItems, encryptionData) {
    this._hash = hash;
    this._metadata = metadata;
    this._spineItems = spineItems;
    this._encryptionData = encryptionData;

    this._format = extractFormat(metadata);
    this._spread = extractRenditionSpread(metadata);
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

  get isReflowable() {
    return this._format === Book.FORMAT_REFLOWABLE;
  }

  get isFixedLayout() {
    return this._format === Book.FORMAT_FIXED_LAYOUT;
  }

  get isNoSpread() {
    return this._spread === Book.RENDITION_SPREAD_NONE;
  }

  get isSpreadAuto() {
    return this._spread === Book.RENDITION_SPREAD_AUTO;
  }

  get spineItems() {
    return this._spineItems;
  }

  get encryptionData() {
    return this._encryptionData;
  }
}

Book.FORMAT_REFLOWABLE = 'reflowable';
Book.FORMAT_FIXED_LAYOUT = 'pre-paginated';

Book.RENDITION_SPREAD_NONE = 'none';
Book.RENDITION_SPREAD_AUTO = 'auto';

export default Book;

function extractFormat(metadata) {
  const metaLayout = metadata.meta.find(data => data._property === 'rendition:layout');
  if (metaLayout) {
    return metaLayout.__text;
  }
  return Book.FORMAT_REFLOWABLE;
}

function extractRenditionSpread(metadata) {
  const metaRenditionSpread = metadata.meta.find(data => data._property === 'rendition:spread');
  if (metaRenditionSpread) {
    return metaRenditionSpread.__text;
  }
  return Book.RENDITION_SPREAD_AUTO;
}
