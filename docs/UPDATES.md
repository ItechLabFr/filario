# Mises à jour des instances auto-hébergées

## Objectif

Un administrateur doit pouvoir mettre à jour Filario depuis l'interface en déposant un paquet ZIP officiel.

Une archive ZIP arbitraire ne doit jamais être exécutée.

## Paquet

Exemple :

```
filario-update-0.8.2.zip
```

Structure cible :

```text
manifest.json
signature.ed25519
checksums.sha256
release/
  ...
migrations/
  ...
```

## Manifeste

Il décrit notamment :

- version cible ;
- version minimale compatible ;
- version maximale compatible si nécessaire ;
- version du schéma ;
- migrations incluses ;
- checksums ;
- date de publication ;
- identifiant de build.

## Signature

Les releases officielles sont signées avec une clé de publication Filario.

L'instance n'embarque que la clé publique.

Avant installation :

1. vérifier la signature ;
2. vérifier les checksums ;
3. vérifier la compatibilité ;
4. vérifier l'espace disque ;
5. créer une sauvegarde ;
6. seulement ensuite autoriser l'installation.

## Updater séparé

Le processus web ne doit pas écraser son propre code en cours d'exécution.

Flux recommandé :

```text
Admin UI
   |
   | upload ZIP
   v
staging directory
   |
   v
Filario Updater
   |-- verify signature
   |-- verify checksums
   |-- create backup
   |-- enter maintenance mode
   |-- apply release
   |-- run migrations
   |-- health check
   '-- switch / restart
```

## Docker

Pour Docker, la release peut contenir un manifeste d'images immuables.

L'updater :

1. valide le paquet ;
2. charge ou récupère les images attendues ;
3. crée la sauvegarde ;
4. met à jour les services ;
5. applique les migrations ;
6. vérifie le healthcheck.

Le ZIP ne doit pas permettre d'injecter des commandes shell arbitraires.

## Installation classique

Pour une installation non-Docker :

```text
/releases/0.8.1/
/releases/0.8.2/
/current -> /releases/0.8.2/
```

Le déploiement se fait dans un nouveau répertoire, puis le lien `current` bascule après validation.

## Rollback

Avant une migration non rétrocompatible, la sauvegarde est obligatoire.

Si le healthcheck échoue :

- revenir à la release précédente si le schéma le permet ;
- sinon restaurer la sauvegarde ;
- conserver les logs.

## Interface

`Administration → Système → Mises à jour`

Fonctions :

- version actuelle ;
- historique ;
- téléversement ZIP ;
- validation avant installation ;
- aperçu des changements ;
- sauvegarde automatique ;
- progression ;
- journal ;
- rollback lorsque possible.
