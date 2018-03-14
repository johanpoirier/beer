const EpubCFI = function (cfiStr) {
  if (cfiStr) return this.parse(cfiStr);
};

const ELEMENT_NODE = 1;

EpubCFI.prototype.generateChapterComponent = function (_spineNodeIndex, _pos, id) {
  const pos = parseInt(_pos);
  const spineNodeIndex = (_spineNodeIndex + 1) * 2;
  let cfi = '/' + spineNodeIndex + '/';

  cfi += (pos + 1) * 2;

  if (id) cfi += "[" + id + ']';

  //cfi += "!";

  return cfi;
};

EpubCFI.prototype.generatePathComponent = function (steps) {
  return steps.map(function (part) {
    return (part.index + 1) * 2 + (part.id ? '[' + part.id + ']' : '');
  }).join('/');
};

EpubCFI.prototype.generateCfiFromElement = function (element, chapter) {
  const steps = this.pathTo(element);
  const path = this.generatePathComponent(steps);
  if (!path.length) {
    // Start of Chapter
    return 'epubcfi(' + chapter + "!/4/)";
  } else {
    // First Text Node
    return 'epubcfi(' + chapter + "!/" + path + "/1:0)";
  }
};

EpubCFI.prototype.pathTo = function (node) {
  const stack = [];
  let children;

  while (node && node.parentNode !== null && node.parentNode.nodeType != 9) {
    children = node.parentNode.children;

    stack.unshift({
      'id': node.id,
      // 'classList' : node.classList,
      'tagName': node.tagName,
      'index': children ? Array.prototype.indexOf.call(children, node) : 0
    });

    node = node.parentNode;
  }

  return stack;
};

EpubCFI.prototype.getChapterComponent = function (cfiStr) {
  const splitStr = cfiStr.split("!");
  return splitStr[0];
};

EpubCFI.prototype.getPathComponent = function (cfiStr) {
  const splitStr = cfiStr.split("!");
  const pathComponent = splitStr[1] ? splitStr[1].split(':') : '';

  return pathComponent[0];
};

EpubCFI.prototype.getCharacterOffsetComponent = function (cfiStr) {
  const splitStr = cfiStr.split(':');
  return splitStr[1] || '';
};

EpubCFI.prototype.parse = function (cfiStr) {
  const cfi = {};
  let chapSegment,
    chapterComponent,
    pathComponent,
    characterOffsetComponent,
    assertion,
    chapId,
    path,
    end,
    endInt,
    text;

  const parseStep = function (part) {
    let type, index, has_brackets, id;

    type = "element";
    index = parseInt(part) / 2 - 1;
    has_brackets = part.match(/\[(.*)\]/);
    if (has_brackets && has_brackets[1]) {
      id = has_brackets[1];
    }

    return {
      "type": type,
      'index': index,
      'id': id || false
    };
  };

  if (typeof cfiStr !== "string") {
    return { spinePos: -1 };
  }

  cfi.str = cfiStr;

  if (cfiStr.indexOf('epubcfi(') === 0 && cfiStr[cfiStr.length - 1] === ')') {
    // Remove intial epubcfi( and ending )
    cfiStr = cfiStr.slice(8, cfiStr.length - 1);
  }

  chapterComponent = this.getChapterComponent(cfiStr);
  pathComponent = this.getPathComponent(cfiStr) || '';
  characterOffsetComponent = this.getCharacterOffsetComponent(cfiStr);
  // Make sure this is a valid cfi or return
  if (!chapterComponent) {
    return { spinePos: -1 };
  }

  // Chapter segment is always the second one
  chapSegment = chapterComponent.split('/')[2] || '';
  if (!chapSegment) return { spinePos: -1 };

  cfi.spinePos = (parseInt(chapSegment) / 2 - 1 ) || 0;

  chapId = chapSegment.match(/\[(.*)\]/);

  cfi.spineId = chapId ? chapId[1] : false;

  if (pathComponent.indexOf(',') !== -1) {
    // Handle ranges -- not supported yet
    console.warn('CFI Ranges are not supported');
  }

  path = pathComponent.split('/');
  end = path.pop();

  cfi.steps = [];

  path.forEach(function (part) {
    let step;

    if (part) {
      step = parseStep(part);
      cfi.steps.push(step);
    }
  });

  //-- Check if END is a text node or element
  endInt = parseInt(end);
  if (!isNaN(endInt)) {

    if (endInt % 2 === 0) { // Even = is an element
      cfi.steps.push(parseStep(end));
    } else {
      cfi.steps.push({
        type: 'text',
        index: (endInt - 1 ) / 2
      });
    }

  }

  assertion = characterOffsetComponent.match(/\[(.*)\]/);
  if (assertion && assertion[1]) {
    cfi.characterOffset = parseInt(characterOffsetComponent.split('[')[0]);
    // We arent handling these assertions yet
    cfi.textLocationAssertion = assertion[1];
  } else {
    cfi.characterOffset = parseInt(characterOffsetComponent);
  }

  return cfi;
};

EpubCFI.prototype.compare = function (cfiOne, cfiTwo) {
  if (typeof cfiOne === 'string') {
    cfiOne = new EpubCFI(cfiOne);
  }
  if (typeof cfiTwo === 'string') {
    cfiTwo = new EpubCFI(cfiTwo);
  }
  // Compare Spine Positions
  if (cfiOne.spinePos > cfiTwo.spinePos) {
    return 1;
  }
  if (cfiOne.spinePos < cfiTwo.spinePos) {
    return -1;
  }


  // Compare Each Step in the First item
  for (let i = 0; i < cfiOne.steps.length; i++) {
    if (!cfiTwo.steps[i]) {
      return 1;
    }
    if (cfiOne.steps[i].index > cfiTwo.steps[i].index) {
      return 1;
    }
    if (cfiOne.steps[i].index < cfiTwo.steps[i].index) {
      return -1;
    }
    // Otherwise continue checking
  }

  // All steps in First present in Second
  if (cfiOne.steps.length < cfiTwo.steps.length) {
    return -1;
  }

  // Compare the character offset of the text node
  if (cfiOne.characterOffset > cfiTwo.characterOffset) {
    return 1;
  }
  if (cfiOne.characterOffset < cfiTwo.characterOffset) {
    return -1;
  }

  // CFI's are equal
  return 0;
};

EpubCFI.prototype.generateCfiFromHref = function (href, book) {
  const uri = core.uri(href);
  const path = uri.path;
  const fragment = uri.fragment;
  const spinePos = book.spineIndexByURL[path];
  let loaded;
  const deferred = new RSVP.defer();
  const epubcfi = new EpubCFI();
  let spineItem;

  if (typeof spinePos !== 'undefined') {
    spineItem = book.spine[spinePos];
    loaded = book.loadXml(spineItem.url);
    loaded.then(function (doc) {
      const element = doc.getElementById(fragment);
      let cfi;
      cfi = epubcfi.generateCfiFromElement(element, spineItem.cfiBase);
      deferred.resolve(cfi);
    });
  }

  return deferred.promise;
};

EpubCFI.prototype.generateCfiFromTextNode = function (anchor, offset, base) {
  const parent = anchor.parentNode;
  const steps = this.pathTo(parent);
  const path = this.generatePathComponent(steps);
  const index = 1 + (2 * Array.prototype.indexOf.call(parent.childNodes, anchor));
  return 'epubcfi(' + base + '!/' + path + '/' + index + ':' + (offset || 0) + ')';
};

EpubCFI.prototype.generateCfiFromRangeAnchor = function (range, base) {
  const anchor = range.anchorNode;
  const offset = range.anchorOffset;
  return this.generateCfiFromTextNode(anchor, offset, base);
};

EpubCFI.prototype.generateCfiFromRange = function (range, base) {
  let start, startElement, startSteps, startPath, startOffset, startIndex;
  let end, endElement, endSteps, endPath, endOffset, endIndex;

  start = range.startContainer;

  if (start.nodeType === 3) { // text node
    startElement = start.parentNode;
    //startIndex = 1 + (2 * Array.prototype.indexOf.call(startElement.childNodes, start));
    startIndex = 1 + (2 * core.indexOfTextNode(start));
    startSteps = this.pathTo(startElement);
  } else if (range.collapsed) {
    return this.generateCfiFromElement(start, base); // single element
  } else {
    startSteps = this.pathTo(start);
  }

  startPath = this.generatePathComponent(startSteps);
  startOffset = range.startOffset;

  if (!range.collapsed) {
    end = range.endContainer;

    if (end.nodeType === 3) { // text node
      endElement = end.parentNode;
      // endIndex = 1 + (2 * Array.prototype.indexOf.call(endElement.childNodes, end));
      endIndex = 1 + (2 * core.indexOfTextNode(end));

      endSteps = this.pathTo(endElement);
    } else {
      endSteps = this.pathTo(end);
    }

    endPath = this.generatePathComponent(endSteps);
    endOffset = range.endOffset;

    // Remove steps present in startPath
    endPath = endPath.replace(startPath, '');

    if (endPath.length) {
      endPath = endPath + '/';
    }

    return 'epubcfi(' + base + '!/' + startPath + '/' + startIndex + ':' + startOffset + ',' + endPath + endIndex + ':' + endOffset + ')';

  } else {
    return 'epubcfi(' + base + '!/' + startPath + '/' + startIndex + ':' + startOffset + ')';
  }
};

EpubCFI.prototype.generateXpathFromSteps = function (steps) {
  const xpath = [".", "*"];

  steps.forEach(function (step) {
    const position = step.index + 1;

    if (step.id) {
      xpath.push("*[position()=" + position + " and @id='" + step.id + "']");
    } else if (step.type === 'text') {
      xpath.push("text()[" + position + ']');
    } else {
      xpath.push("*[" + position + ']');
    }
  });

  return xpath.join('/');
};

EpubCFI.prototype.generateQueryFromSteps = function (steps) {
  const query = ['html'];

  steps.forEach(function (step) {
    const position = step.index + 1;

    if (step.id) {
      query.push("#" + step.id);
    } else if (step.type === 'text') {
      // unsupported in querySelector
      // query.push("text()[" + position + ']');
    } else {
      query.push("*:nth-child(" + position + ")");
    }
  });

  return query.join('>');
};

EpubCFI.prototype.generateRangeFromCfi = function (cfi, _doc) {
  const doc = _doc || document;
  let range = doc.createRange();
  let lastStep;
  let xpath;
  let startContainer;
  let textLength;
  let query;
  let startContainerParent;

  if (typeof cfi === 'string') {
    cfi = this.parse(cfi);
  }

  // check spinePos
  if (cfi.spinePos === -1) {
    // Not a valid CFI
    return false;
  }

  // Get the terminal step
  lastStep = cfi.steps[cfi.steps.length - 1];

  if (typeof document.evaluate != 'undefined') {
    xpath = this.generateXpathFromSteps(cfi.steps);
    startContainer = doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
  } else {
    // Get the query string
    query = this.generateQueryFromSteps(cfi.steps);
    // Find the containing element
    startContainerParent = doc.querySelector(query);
    // Find the text node within that element
    if (startContainerParent && lastStep.type === 'text') {
      startContainer = startContainerParent.childNodes[lastStep.index];
    }
  }

  if (!startContainer) {
    return null;
  }

  if (startContainer && cfi.characterOffset >= 0) {
    textLength = startContainer.length;

    if (cfi.characterOffset < textLength) {
      range.setStart(startContainer, cfi.characterOffset);
      range.setEnd(startContainer, textLength);
    } else {
      console.debug('offset greater than length:', cfi.characterOffset, textLength);
      range.setStart(startContainer, textLength - 1);
      range.setEnd(startContainer, textLength);
    }
  } else if (startContainer) {
    range.selectNode(startContainer);
  }
  // doc.defaultView.getSelection().addRange(range);
  return range;
};

EpubCFI.prototype.isCfiString = function (target) {
  return typeof target === 'string' && target.indexOf('epubcfi(') === 0;
};

EpubCFI.prototype.indexOfElement = function(node) {
  const parent = node.parentNode;
  const children = parent.childNodes;
  let sib;
  let index = -1;
  for (let i = 0; i < children.length; i++) {
    sib = children[i];
    if (sib.nodeType === ELEMENT_NODE) {
      index++;
    }
    if (sib === node) break;
  }

  return index;
};

export default EpubCFI;
