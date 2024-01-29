# BEst Epub Reader

BEER is an ePub reader prototype, based on recent javascript technologies:
* Service workers: to get ePub content directly
* Modules
* Arrow functions


## Before start

You need to have
* A working node/npm env

## Start Beer

You can start beer with the webpack dev server :

```
#beer> npm install
#beer> npm run dev 
...
```

This command build distrib and start it into the HTTPs webpack server.

To allow the service worker to be loaded, you need to add the webpack localhost certificate (automatically generated) into your system (or browser) trust store.
You can download the certificate from you browser (on the left side of the URL bar, most of the time).
