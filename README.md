# Next Reader

Next Reader est un prototype de liseuse d'ePub.

Ce lecteur est basé sur des technologies javascript récentes :
* les services workers : pour aller chercher les ressources dans l'epub directement
* les modules
* les arrow functions


## Prérequis

* Node.js
* Un serveur web avec un certificat HTTPS (on peut utiliser l'image docker sinon)


## Utiliser l'image Docker

```
cd docker
./build.sh
./run.sh
```

Faire pointer ensuite le domaine next.local vers l'IP donné par le script `run.sh`.
Les services workers ne fonctionnent qu'en HTTPS, il faudra donc récupérer le certificat généré depuis l'image docker, l'ajouter au système et l'approuver par défaut.
