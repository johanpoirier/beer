import Beer from './beer';

const container = document.querySelector('main');

// List of epubs:
// - Ali-Baba-ipad-V4.0.epub
// - l-odyssee.epub
// - asterix.epub
// - timote.epub

Beer.withBook('/epubs/asterix.epub')
  .then(reader => {
    const display = reader.displayBook(container);

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
    }
  }, true);
}
