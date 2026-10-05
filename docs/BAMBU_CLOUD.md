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

# Télémétrie Bambu Cloud

Filario 0.2.1 ajoute un worker MQTT dédié pour les comptes Bambu Cloud connectés.

## Architecture

Le conteneur `bambu-worker` :

1. charge les comptes Bambu connectés depuis PostgreSQL ;
2. déchiffre le token avec `AUTH_SECRET` ;
3. récupère l'identifiant utilisateur cloud Bambu ;
4. ouvre une connexion TLS au broker MQTT cloud ;
5. s'abonne uniquement à `device/<serial>/report` pour chaque imprimante ;
6. demande un snapshot `pushall` à la connexion puis au maximum toutes les 5 minutes ;
7. fusionne les mises à jour différentielles reçues ;
8. persiste la télémétrie dans `bambu_devices.telemetry`.

Le `pushall` ne modifie pas la machine : il demande uniquement un snapshot complet de son état.

## Données affichées

Selon le modèle et le firmware :

- température buse et cible ;
- température plateau et cible ;
- température chambre ;
- état d'impression ;
- progression ;
- temps restant (minutes) ;
- couche actuelle / total ;
- nom du job ;
- signal Wi-Fi ;
- AMS, matière, couleur et pourcentage restant.

Les imprimantes P1/A1 peuvent envoyer des messages MQTT partiels. Filario conserve donc le dernier état
complet et fusionne chaque delta avant de l'afficher.

## Fréquence

Les rapports Bambu peuvent arriver plusieurs fois par seconde pendant une impression. Filario regroupe
les écritures et persiste au maximum environ une fois toutes les 1,2 seconde par machine.

La page Imprimantes interroge l'API Filario toutes les 4 secondes lorsque l'onglet est visible.

## Dépannage

Vérifier le worker :

```bash
docker compose ps bambu-worker
docker compose logs --tail=100 bambu-worker
```

Après une nouvelle connexion Bambu, le worker détecte automatiquement le compte et les machines sans
redémarrage manuel.
