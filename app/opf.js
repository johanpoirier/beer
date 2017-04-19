"use strict";

import X2JS from './xml2json';

const x2js = new X2JS();

function Opf(basePath) {
  this.basePath = basePath;

  this.getSpineItem = function(index) {
    const itemId = this.spineItems[index]['_idref'];
    return this.items.find(it => it['_id'] === itemId);
  };

  this.getFirstSpineItem = function() {
    return this.getSpineItem(0);
  };
}

Opf.create = (basePath, xmlDoc) => {
  const opf = new Opf(basePath);

  opf.metadata = x2js.xml2json(xmlDoc.querySelector('metadata'));
  opf.spineItems = x2js.xml2json(xmlDoc.querySelector('spine')).itemref;
  opf.items = x2js.xml2json(xmlDoc.querySelector('manifest')).item;

  opf.items.forEach(item => item._href = `${basePath}${item._href}`);

  return opf;
};

export default Opf;
