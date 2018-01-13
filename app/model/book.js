class Book {
  /**
   * @param hash The SHA-1 hash of the file name
   * @param data Blob object of the epub file
   * @param metadata The metadata extracted from opf file
   * @param spineItems The spine items extracted from opf file
   * @param encryptionData The encryption data (items and algorithms)
   */
  constructor(hash, data, metadata, spineItems, encryptionData) {
    this._hash = hash;
    this._data = data;
    this._metadata = metadata;
    this._spineItems = spineItems;
    this._encryptionData = encryptionData;

    this._format = extractFormat(metadata);
    this._spread = extractRenditionDefaultSpread(metadata);
    this._orientation = extractRenditionDefaultOrientation(metadata);
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

  get data() {
    return this._data;
  }

  get encryptionData() {
    return this._encryptionData;
  }
}

Book.FORMAT_REFLOWABLE = 'reflowable';
Book.FORMAT_FIXED_LAYOUT = 'pre-paginated';

/**
 * Specifies the intended Reading System synthetic spread behavior
 * The rendition:spread property may also be specified locally on the
 * Package Document spine itemref element, and will, in this case,
 * override the global value for the given spine item.
 * (Refer to Specifying name-value pairs on the spine itemref element
 * for syntactical rules.)
 *
 * for this Publication or spine item :
 *   - One page on "none"
 *   - else 2 pages "both"
 *   - else 1 page on landscape if portrait is set else 2 pages
 *   - else 1 page on portrait if landscape is set else 2 pages
 *   - no behavior define set our own
 */

/**
 * Reading Systems must not incorporate this spine item in a synthetic spread.
 */
Book.RENDITION_SPREAD_NONE = 'none';
/**
 * No explicit synthetic spread behavior is defined. Reading Systems may use
 * synthetic spreads in specific or all device orientations as part of a
 * display area utilization optimization process.
 */
Book.RENDITION_SPREAD_AUTO = 'auto';
/**
 * Reading Systems should incorporate this spine item in a synthetic spread
 * regardless of device orientation.
 */
Book.RENDITION_SPREAD_BOTH = 'both';
/*
 * Reading Systems should incorporate this spine item in a synthetic spread
 * only when the device is in portrait orientation.
 */
Book.RENDITION_SPREAD_PORTRAIT = 'portrait';
/**
 * Reading Systems should incorporate this spine item in a synthetic spread
 * only when the device is in landscape orientation.
 */
Book.RENDITION_SPREAD_LANDSCAPE = 'landscape';



/**
 * Specifies which orientation(s) the Author intends for the given Publication
 * or spine item to be rendered in.
 * The rendition:orientation property may also be specified locally
 * on the Package Document spine itemref element, and will, in this case,
 * override the global value for the given spine item.
 * (Refer to Specifying name-value pairs on the spine itemref element
 * for syntactical rules specific to local specification.)
 */   

/**
 * The given spine item is intended for landscape rendering.
 */
Book.RENDITION_ORIENTATION_LANDSCAPE = 'landscape';

/**
 * The given spine item is intended for portrait rendering.
 */
Book.RENDITION_ORIENTATION_PORTRAIT = 'portrait';

/**
 * The given spine item is not orientation constrained.
 */
Book.RENDITION_ORIENTATION_AUTO = 'auto';


export default Book;

function extractFormat(metadata) {
  const metaLayout = metadata['meta'].find(data => data['_property'] === 'rendition:layout');
  if (metaLayout) {
    return metaLayout['__text'];
  }
  return Book.FORMAT_REFLOWABLE;
}

function extractRenditionDefaultSpread(metadata) {
  const metaRenditionSpread = metadata['meta'].find(data => data['_property'] === 'rendition:spread');
  if (metaRenditionSpread) {
    return metaRenditionSpread['__text'];
  }
  return Book.RENDITION_SPREAD_AUTO;
}

function extractRenditionDefaultOrientation(metadata) {
  const metaRenditionSpread = metadata['meta'].find(data => data['_property'] === 'rendition:orientation');
  if (metaRenditionSpread) {
    return metaRenditionSpread['__text'];
  }
  return Book.RENDITION_ORIENTATION_AUTO;;
}
