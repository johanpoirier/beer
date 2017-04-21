import Next from './next';

const frame = document.querySelector('#next-epub-frame');

Next.withBook('/epubs/l-odyssee.epub')
  .then(reader => reader.displayBook(frame));
