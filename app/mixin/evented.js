const EventedMixin = (superclass) => class extends superclass {

  constructor() {
    super(...arguments);
    this._events = {};
  }

  on(event, callback) {
    this._events[event] = this._events[event] || [];
    this._events[event].push(callback);
  }

  off(event, callback) {
    if (event in this._events === false) {
      return;
    }
    this._events[event].splice(this._events[event].indexOf(callback), 1);
  }

  trigger(event) {
    if (event in this._events === false) return;
    for (let i = 0; i < this._events[event].length; i++) {
      this._events[event][i].apply(this, Array.from(arguments).slice(1));
    }
  }
};

export default EventedMixin;
