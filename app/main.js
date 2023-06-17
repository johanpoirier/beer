import Beer from './beer';

const container = document.querySelector('main');

// List of epubs:
// - Ali-Baba-ipad-V4.0.epub
// - l-odyssee.epub
// - asterix.epub
// - timote.epub
// - 9782824704043_jim-lindien.epub

// 9783423441117.epub
Beer.init()
  .then(() => Beer.withBook('/epubs/moby-dick.epub'), console.error)
  .then(reader => {
    const displayOptions = {
      mode: 'page',
      theme: 'auto',
      columnCount: 1,
      margin: 100,
      ratio: 1.2
    };
    const display = reader.displayBook(container, displayOptions);

    // listen to events in main page frame
    listenToKeyboard(document, display);

    // listen to events in reader frame
    display.on('load', displayDocument => listenToKeyboard(displayDocument, display));
  });


function listenToKeyboard(element, display) {
  element.addEventListener('keydown', event => {
    if (event.defaultPrevented) {
      return;
    }

    switch (event.key) {
      case 'ArrowLeft':
        display.previous();
        break;
      case 'ArrowRight':
        display.next();
        break;
      case 'ArrowUp':
        display.zoomIn();
        break;
      case 'ArrowDown':
        display.zoomOut();
        break;
      case '1':
        display.oneColumn();
        break;
      case '2':
        display.twoColumns();
        break;
      case 'M':
        display.marginUp();
        break;
      case 'm':
        display.marginDown();
        break;
      case 't':
        display.toggleTheme();
        break;
      case 'a':
          display.autoTheme();
          break;
    }
  }, true);
}
