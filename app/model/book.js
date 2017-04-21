export default class Book {

  constructor(metadata, spineItems) {
    this.metadata = metadata;
    this.spineItems = spineItems;
  }

  getSpineItem(index) {
    return this.spineItems[index];
  }

  getFirstSpineItem() {
    return this.getSpineItem(0);
  }
}
