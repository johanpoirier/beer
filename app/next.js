import serviceWorkerInstall from './sw/install';

serviceWorkerInstall().then(() => console.log('service worker ready'));
