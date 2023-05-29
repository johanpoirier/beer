# BEst Epub Reader

BEER is an ePub reader prototype, based on recent javascript technologies:
* Service workers: to get ePub content directly
* Modules
* Arrow functions


## Before start

You need to have
* A working node/npm env
* A local HTTPS webserver (if you don't have one, you can use the docker)

## Docker

### Build docker image

```
#> cd docker
#docker> ./build.sh
...
```

This command build the docker image, and print the public certificate to add in the trust store.
The public certificate must be like this :

```
-----BEGIN CERTIFICATE-----
MIIELzCCAxegAw....
....
-----END CERTIFICATE-----
```

According to your system (Linux, Windows, Mac), you have to add this certificate into the trust store in order to be able to run Beer in HTTPS. This is mandatory to make service worker working.

### Run the docker image

```
#> cd docker
#docker> ./run.sh
Running docker container
....
```

This docker container expose `80` and `443` ports to your local machine.

## Start Beer

To make HTTPS and nginx happy, you have to configure you local hosts file (mainly `/etc/hosts`) to add beer.local domain name:

```
127.0.0.1 beer.local
```

Now you can use your favorite browser (which supports service workers) on the beer.local URL.