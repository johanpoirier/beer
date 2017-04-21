import Next from './next';

const frame = document.querySelector('#next-epub-frame');

// List of epubs:
// - Ali-Baba-ipad-V4.0.epub
// - l-odyssee.epub
// - asterix.epub
// - timote.epub

Next.withBook('/epubs/timote.epub')
  .then(reader => {
    reader.displayBook(frame);

    frame.onload = () => {
      listenToKeyboard(document, reader);
      listenToKeyboard(reader.displayElement, reader);
    }
  });

function listenToKeyboard(element, reader) {
  element.addEventListener('keydown', event => {
    if (event.defaultPrevented) {
      return;
    }

    switch (event.key) {
      case "ArrowLeft":
        reader.displayPreviousSpine();
        break;
      case "ArrowRight":
        reader.displayNextSpine();
        break;
    }

    event.preventDefault();
  }, true);
}
