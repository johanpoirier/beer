"use strict";

import SpineItem from './spine-item';
import X2JS from '../xml2json';

const x2js = new X2JS();

export default class Opf {

  static create(basePath, xmlDoc) {
    const opf = new Opf();

    opf.metadata = x2js.xml2json(xmlDoc.querySelector('metadata'));

    const spineItemsRefs = x2js.xml2json(xmlDoc.querySelector('spine')).itemref.map(item => item['_idref']);
    opf.spineItems = x2js.xml2json(xmlDoc.querySelector('manifest')).item.filter(item => spineItemsRefs.indexOf(item['_id']) >= 0).map(SpineItem.fromXml);

    opf.spineItems.forEach(spineItem => spineItem.href = `${basePath}${spineItem.href}`);

    return opf;
  }

}
