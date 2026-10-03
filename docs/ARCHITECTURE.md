# Architecture Filario

## Objectif

Filario doit fonctionner avec le même cœur applicatif sur filario.fr et chez un utilisateur auto-hébergé.

Le code ne doit pas réserver une fonctionnalité essentielle de gestion de filament au Cloud.

## Monorepo cible

```text
filario/
├─ apps/
│  ├─ web/                 # Next.js
│  ├─ worker/              # jobs asynchrones
│  └─ mobile/              # Expo / React Native, plus tard
├─ packages/
│  ├─ api/                 # contrats API / OpenAPI
│  ├─ auth/                # Better Auth et politiques de sécurité
│  ├─ db/                  # Drizzle, schéma et migrations
│  ├─ backup/              # export/import .filario
│  ├─ update/              # validation des paquets de mise à jour
│  ├─ filament-catalog/    # catalogue externe et synchronisation
│  ├─ ui/                  # design system
│  └─ config/
├─ assets/
├─ docs/
└─ deploy/
   ├─ docker/
   └─ compose/
```

## Runtime

### Web

Next.js + React + TypeScript.

Responsabilités :

- interface utilisateur ;
- routes API ;
- authentification ;
- API publique ;
- administration ;
- import/export.

### PostgreSQL

PostgreSQL est la source de vérité.

Les entités métier utilisent des UUID afin d'éviter les collisions lors des imports et migrations entre instances.

### Worker

Les opérations longues ne doivent pas bloquer le processus web :

- synchronisation du catalogue ;
- export/import ;
- génération d'étiquettes ;
- notifications ;
- maintenance.

Le worker peut être colocalisé au début, puis séparé.

## Multi-tenant

L'unité principale de séparation est l'`Organization`.

Le même modèle doit convenir à :

- un utilisateur ;
- une famille ou un atelier ;
- un FabLab ;
- une ferme d'impression ;
- une entreprise.

## Entités principales

- User
- Organization
- Membership
- Session
- Passkey
- MFA
- Manufacturer
- Material
- Filament
- FilamentVariant
- Spool
- SpoolEvent
- SpoolWeight
- DryingEvent
- Location
- Printer
- PrinterSlot
- PrintJob
- PrintJobFilament
- Supplier
- Purchase
- PurchaseItem
- LabelTemplate
- ApiKey
- Webhook
- Notification
- AuditLog

## Catalogue externe

Les bases publiques ou communautaires sont synchronisées dans notre propre base.

Une valeur utilisateur ne doit jamais être écrasée automatiquement.

Chaque donnée technique pourra conserver :

- sa valeur ;
- sa source ;
- sa date de synchronisation ;
- un niveau de confiance ;
- un override utilisateur.

## API

Préfixe public cible :

```
/api/v1
```

Exemples :

```
GET    /api/v1/spools
POST   /api/v1/spools
GET    /api/v1/spools/:id
PATCH  /api/v1/spools/:id
POST   /api/v1/spools/:id/consume

GET    /api/v1/printers
POST   /api/v1/print-jobs
```

L'API publique sera documentée via OpenAPI.

## Compatibilité Cloud / Self-Hosted

Le schéma de données, les migrations et les contrats de sauvegarde sont communs.

Les différences doivent rester infrastructurelles :

- stockage local ou S3 ;
- SMTP ;
- domaine ;
- OAuth ;
- télémétrie opt-in ;
- facturation sur filario.fr.

Aucune donnée métier ne doit être enfermée dans une infrastructure propriétaire.
