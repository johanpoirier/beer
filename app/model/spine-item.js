export default class SpineItem {
  constructor(id, href, mediaType) {
    this.id = id;
    this.href = href;
    this.mediaType = mediaType;
  }

  static fromXml(xml) {
    return new SpineItem(xml._id, xml._href, xml['_media-type']);
  }
}
