class Base {

  constructor(element, displayOptions) {
    this._element = element;
    this._displayRatio = 1;
    this._position = 0;
    this._displayOptions = displayOptions;
  }

  /**
   * Display the book in a HTML frame
   *
   * @param book
   */
  display(book) {
    this._book = book;
  }

  /**
   * Previous page
   */
  previous() {

  }

  /**
   * Next page
   */
  next() {

  }

  /**
   * Zoom in content
   */
  zoomIn() {
    this._displayOptions.ratio *= Base.ZOOM_SCALE_MULTIPLIER;
    this.redraw();
  }

  /**
   * Zoom out content
   */
  zoomOut() {
    this._displayOptions.ratio /= Base.ZOOM_SCALE_MULTIPLIER;
    this.redraw();
  }

  /**
   * Force redraw of frames
   */
  redraw() {

  }

  theme() {
    var theme = this._displayOptions.theme;
    if (theme === Base.AUTO_THEME) {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        theme = Base.NIGHT_THEME
      }
      else {
        theme = Base.LIGHT_THEME
      }
    }
    return theme
  }

  toggleTheme() {
    const theme = this.theme()
    if (theme == Base.LIGHT_THEME) {
      this.nightTheme()
    }
    else if (theme == Base.NIGHT_THEME) {
      this.ligthTheme()
    }
    else {
      this.autoTheme()
    }
  }
}

Base.ZOOM_SCALE_MULTIPLIER = 1.5;
Base.FONT_SCALE_MULTIPLIER = 1.1;
Base.DEFAULT_RATIO = 1;
Base.DEFAULT_MARGIN = 30;
Base.MARGIN_STEP = 10;
Base.LIGHT_THEME = 'light';
Base.NIGHT_THEME = 'night';
Base.AUTO_THEME = 'auto';
Base.DEFAULT_THEME = Base.AUTO_THEME;
Base.DEFAULT_COLUMN_COUNT = 2;

Base.COLOR_SET = {
  'light': {
    'color': '#000000',
    'background-color': '#ffffff'
  },
  'night': {
    'color': '#eeeeee',
    'background-color': '#1c1c1c'
  }
};

export default Base;
