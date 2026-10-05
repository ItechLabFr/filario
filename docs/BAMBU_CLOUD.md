# Bambu Cloud dans Filario

> Statut : **Beta / non officiel**.

Filario peut connecter un compte Bambu Lab sans demander le mot de passe : l'utilisateur saisit son
adresse e-mail, Bambu Lab envoie un code à six chiffres, puis Filario échange ce code contre un jeton
de session.

## Sécurité

- le mot de passe Bambu n'est jamais demandé ni stocké ;
- le jeton est chiffré au repos avec AES-256-GCM ;
- la clé de chiffrement est dérivée de `AUTH_SECRET` ;
- les champs sensibles renvoyés avec les appareils (access codes, tokens, secrets) sont retirés avant
  stockage des métadonnées ;
- la première version est en lecture seule.

## Synchronisation

Après connexion, Filario interroge les appareils liés au compte et crée/met à jour les imprimantes de
l'atelier avec `integration_type = bambu-cloud`.

La synchronisation peut être relancée depuis **Intégrations**.

## Caméra

Bambu Handy / Bambu Studio utilisent un Live View P2P. Bambu Lab indique que le flux est direct entre
l'appareil et l'imprimante lorsque possible, avec relais serveur uniquement si nécessaire.

Le chemin cloud repose actuellement sur un protocole/bibliothèque propriétaire P2P. Filario n'embarque
donc pas de lecteur cloud dans la Beta. L'objectif est d'ajouter un bridge vidéo séparé lorsque ce
chemin peut être distribué et maintenu proprement.

Les flux locaux des imprimantes en Developer Mode sont une autre possibilité, mais ils ne sont pas
nécessaires à la connexion Bambu Cloud.

## Limites

Les endpoints cloud utilisés par la Beta ne constituent pas une API publique officiellement garantie
par Bambu Lab. Ils peuvent évoluer. Les opérations sensibles (démarrage d'impression, mouvement,
températures, AMS, calibration) restent volontairement désactivées dans Filario Beta.

Pour une intégration commerciale durable, la voie cible reste l'intégration partenaire officielle
Bambu Lab.
