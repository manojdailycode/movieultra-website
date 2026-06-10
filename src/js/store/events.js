'use strict';

class StoreEvents {
  constructor() {
    this.listeners = {};
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error('[MovieUltra] Event listener failed:', event, e);
        }
      });
    }
  }
}

export const storeEvents = new StoreEvents();
