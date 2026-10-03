# Portabilité et sauvegardes

## Principe

Un utilisateur doit pouvoir quitter Filario Cloud et restaurer son espace sur une instance auto-hébergée sans reconstruire son inventaire.

Le sens inverse doit également être possible.

## Format .filario

Une sauvegarde portable est une archive ZIP portant l'extension :

```
atelier-2026-10-03.filario
```

Structure cible :

```text
manifest.json
data/
  organizations.jsonl
  memberships.jsonl
  manufacturers.jsonl
  materials.jsonl
  filaments.jsonl
  variants.jsonl
  spools.jsonl
  spool-events.jsonl
  locations.jsonl
  printers.jsonl
  print-jobs.jsonl
  purchases.jsonl
  label-templates.jsonl
settings/
  organization.json
media/
  ...
checksums.sha256
```

## Pourquoi JSONL

Le format logique doit rester indépendant du schéma SQL exact.

JSONL permet :

- streaming de gros exports ;
- lecture partielle ;
- import robuste ;
- migrations de format ;
- compatibilité entre versions.

Un `pg_dump` pourra être proposé séparément pour la reprise après sinistre, mais il ne sera pas le format principal de migration entre instances.

## Manifeste

Exemple :

```json
{
  "format": "filario-backup",
  "formatVersion": 1,
  "appVersion": "0.1.0",
  "createdAt": "2026-10-03T20:00:00Z",
  "source": {
    "type": "cloud",
    "instanceId": "..."
  },
  "organizationId": "...",
  "encryption": {
    "enabled": true,
    "algorithm": "..."
  }
}
```

## Intégrité

Chaque archive contient des checksums SHA-256.

L'import refuse une archive altérée ou incomplète.

## Chiffrement

Les exports complets doivent pouvoir être chiffrés avec une phrase secrète choisie par l'utilisateur.

Aucun secret sensible ne doit être écrit en clair.

## Comptes et authentification

### Données portables

- profils utilisateurs ;
- adresses e-mail ;
- appartenances ;
- rôles ;
- préférences ;
- données métier ;
- historique d'audit selon les droits d'export.

### Mots de passe

La migration directe des hashes augmente fortement la sensibilité de l'archive.

Le mode standard doit privilégier une procédure de réactivation du compte sur la nouvelle instance.

### TOTP / MFA

Les secrets TOTP sont hautement sensibles.

Ils ne peuvent être inclus que dans un mode de migration explicitement sécurisé et chiffré.

Le mode standard peut exiger le réenrôlement MFA.

### Passkeys

Les passkeys WebAuthn sont liées au RP ID, généralement le domaine.

Une passkey créée sur `filario.fr` ne doit pas être considérée comme portable vers `filario.example.com`.

Après migration de domaine, une nouvelle passkey devra être enregistrée.

## Import

Étapes :

1. lire et valider le manifeste ;
2. vérifier les checksums ;
3. vérifier la compatibilité ;
4. afficher un aperçu ;
5. détecter les collisions ;
6. importer en transaction ;
7. migrer le format si nécessaire ;
8. produire un rapport final.

L'import ne doit jamais laisser silencieusement une base partiellement migrée.

## Interface Cloud

Chemin prévu :

`Paramètres → Données → Exporter mes données`

Aucun ticket support ne doit être nécessaire pour récupérer ses données.
