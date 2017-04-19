'use strict';

function getRegistration() {
  if (!('serviceWorker' in navigator)) {
    return Promise.reject(new Error('Service workers aren\'t supported in this browser.'));
  }
  return navigator.serviceWorker.register('./service-worker.js');
}

export default getRegistration;
