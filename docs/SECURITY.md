# Sécurité

## Authentification

Filario prévoit :

- e-mail + mot de passe ;
- MFA TOTP ;
- QR d'enrôlement MFA généré localement ;
- codes de récupération ;
- passkeys WebAuthn ;
- OAuth optionnel.

## Sessions

L'utilisateur peut consulter et révoquer ses sessions.

Les actions sensibles peuvent exiger une authentification récente.

## Autorisations

Rôles initiaux :

- Owner
- Admin
- Manager
- Member
- Viewer

Les permissions sont vérifiées côté serveur.

## Secrets

Jamais de secret dans :

- Git ;
- logs ;
- exports non chiffrés ;
- QR externes ;
- réponses API inutiles.

## QR de bobines

Le QR d'une bobine contient uniquement un identifiant opaque ou une URL avec identifiant non séquentiel.

Une ressource privée exige toujours les droits appropriés.

## API

Les clés API sont :

- hachées côté serveur ;
- préfixées pour identification ;
- limitées par scopes ;
- révocables ;
- auditées.

## Audit

Événements à journaliser :

- connexion ;
- échec MFA ;
- changement MFA ;
- changement de mot de passe ;
- création/révocation de clé API ;
- import/export ;
- modification des rôles ;
- mise à jour système ;
- restauration de sauvegarde.

## Mises à jour

Un ZIP est traité comme hostile tant que sa signature n'est pas validée.

Aucun script arbitraire issu de l'archive ne doit être exécuté directement.

Voir [UPDATES.md](./UPDATES.md).
