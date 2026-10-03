# Filario

<p align="center">
  <img src="./assets/brand/filario-logo-light.svg" alt="Filario" width="420">
</p>

**Filario** est une plateforme moderne de gestion de filaments pour l'impression 3D.

Le projet est conçu autour de deux modes de déploiement compatibles :

- **Filario Cloud** — service hébergé sur [filario.fr](https://filario.fr)
- **Filario Self-Hosted** — installation autonome sur le serveur de l'utilisateur

> Principe fondateur : **les données appartiennent à l'utilisateur**.

Un utilisateur de Filario Cloud doit pouvoir exporter son espace et le restaurer facilement sur une instance auto-hébergée, et inversement.

## Vision

Filario doit devenir le centre de contrôle du filament :

- inventaire de bobines ;
- marques, gammes, matériaux, couleurs et variantes ;
- poids initial et restant ;
- QR codes et NFC à terme ;
- emplacements et dryboxes ;
- imprimantes et slots multi-filaments ;
- impressions et consommation ;
- coûts et achats ;
- profils de température et séchage ;
- historique complet ;
- statistiques ;
- utilisateurs, équipes et rôles ;
- MFA TOTP, codes de récupération et passkeys ;
- API et intégrations ;
- import/export complet ;
- auto-hébergement simple ;
- mise à jour d'une instance via paquet ZIP signé.

## Principes produit

1. **Self-hosting first** — aucune fonction essentielle ne doit dépendre de Filario Cloud.
2. **Cloud sans verrouillage** — les données doivent pouvoir quitter filario.fr.
3. **Portable by design** — format d'export versionné et documenté.
4. **API first** — les intégrations utilisent des contrats stables et documentés.
5. **Sécurité par défaut** — MFA, audit, permissions et sauvegardes.
6. **Pas d'IA gadget** — l'application doit être excellente sans assistant conversationnel.
7. **Rapide et sobre** — interface claire, dense, accessible, claire/sombre.

## Stack cible

- TypeScript
- Next.js / React
- PostgreSQL
- Drizzle ORM
- Better Auth
- Redis si nécessaire pour jobs/cache
- stockage S3-compatible ou local
- Docker
- OpenAPI
- React Native / Expo à terme

## Documentation

- [Architecture](./docs/ARCHITECTURE.md)
- [Produit](./docs/PRODUCT.md)
- [Portabilité & sauvegardes](./docs/PORTABILITY.md)
- [Auto-hébergement](./docs/SELF-HOSTING.md)
- [Mises à jour ZIP](./docs/UPDATES.md)
- [Sécurité](./docs/SECURITY.md)

## Format d'export

Filario utilisera un format portable `.filario`, techniquement une archive ZIP versionnée.

Elle contiendra notamment :

- manifeste ;
- données métier ;
- réglages ;
- médias ;
- checksums ;
- informations de migration.

Les secrets sensibles ne seront jamais exportés en clair.

## État du projet

Filario est en phase initiale de conception et de mise en place de l'architecture.

Le choix définitif de licence open source sera pris avant la première version publique stable.
