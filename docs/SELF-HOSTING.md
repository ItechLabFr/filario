# Auto-hébergement

## Objectif

Une instance Filario auto-hébergée doit être exploitable sans connexion obligatoire à filario.fr.

## Déploiement recommandé

Docker Compose.

Services cibles :

```text
filario-web
filario-worker
postgres
redis        # optionnel au début
```

Les médias peuvent être stockés :

- sur un volume local ;
- sur un stockage S3-compatible.

## Installation cible

À terme :

```bash
git clone https://github.com/ItechLabFr/filario.git
cd filario
cp .env.example .env
docker compose up -d
```

Une distribution par releases GitHub avec fichiers Compose prêts à l'emploi sera aussi fournie.

## Configuration minimale

```env
FILARIO_URL=https://filario.example.com
DATABASE_URL=postgresql://...
AUTH_SECRET=...
STORAGE_DRIVER=local
STORAGE_PATH=/data/uploads
```

Puis selon les besoins :

```env
REDIS_URL=
SMTP_HOST=
SMTP_USER=
SMTP_PASSWORD=
S3_ENDPOINT=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=
```

## Première installation

1. écran de configuration ;
2. vérification de la base ;
3. création du premier administrateur ;
4. configuration du domaine ;
5. choix du stockage ;
6. configuration e-mail optionnelle ;
7. fin de l'installation.

## Sauvegardes

L'administration doit permettre :

- export portable `.filario` ;
- sauvegarde de récupération ;
- planification future ;
- téléchargement manuel.

Les volumes Docker seuls ne constituent pas une stratégie de sauvegarde.

## Cloud

Filario Cloud utilise le même cœur applicatif.

Les extensions Cloud peuvent couvrir :

- facturation ;
- quotas ;
- infrastructure mutualisée ;
- e-mail transactionnel.

Elles ne doivent jamais rendre les données incompatibles avec une instance self-hosted.
