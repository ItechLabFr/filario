#!/bin/sh
set -eu

UPDATE_DIR="${UPDATE_DIR:-/updates}"
COMPOSE_FILE="${COMPOSE_FILE:-/opt/filario/docker-compose.yml}"
POLL_SECONDS="${POLL_SECONDS:-5}"

mkdir -p "$UPDATE_DIR"

write_status() {
  state="$1"
  version="$2"
  message="$3"
  now="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  tmp="$UPDATE_DIR/status.json.tmp"
  jq -n     --arg state "$state"     --arg version "$version"     --arg message "$message"     --arg updatedAt "$now"     '{state:$state,version:$version,message:$message,updatedAt:$updatedAt}' > "$tmp"
  mv "$tmp" "$UPDATE_DIR/status.json"
}

while true; do
  if [ ! -f "$UPDATE_DIR/pending.json" ]; then
    sleep "$POLL_SECONDS"
    continue
  fi

  version="$(jq -r '.version // empty' "$UPDATE_DIR/pending.json")"
  image="$(jq -r '.image // empty' "$UPDATE_DIR/pending.json")"

  if [ -z "$version" ] || [ -z "$image" ]; then
    write_status "failed" "$version" "Requête de mise à jour invalide."
    rm -f "$UPDATE_DIR/pending.json"
    continue
  fi

  case "$image" in
    ghcr.io/itechlabfr/filario@sha256:*) ;;
    *)
      write_status "failed" "$version" "Image refusée par la politique Filario."
      rm -f "$UPDATE_DIR/pending.json"
      continue
      ;;
  esac

  digest="${image##*@sha256:}"
  if ! echo "$digest" | grep -Eq '^[a-f0-9]{64}$'; then
    write_status "failed" "$version" "Digest d'image invalide."
    rm -f "$UPDATE_DIR/pending.json"
    continue
  fi

  write_status "backing_up" "$version" "Sauvegarde PostgreSQL avant mise à jour."

  backup="$UPDATE_DIR/pre-update-${version}.dump"
  if ! docker compose -f "$COMPOSE_FILE" exec -T postgres     pg_dump -U filario -d filario -Fc > "$backup"; then
    write_status "failed" "$version" "La sauvegarde PostgreSQL a échoué."
    rm -f "$UPDATE_DIR/pending.json"
    continue
  fi

  current_container="$(docker compose -f "$COMPOSE_FILE" ps -q filario || true)"
  old_image=""
  if [ -n "$current_container" ]; then
    old_image="$(docker inspect --format '{{.Image}}' "$current_container" 2>/dev/null || true)"
  fi

  write_status "pulling" "$version" "Téléchargement de l'image signée."
  if ! docker pull "$image"; then
    write_status "failed" "$version" "Téléchargement de l'image impossible."
    rm -f "$UPDATE_DIR/pending.json"
    continue
  fi

  docker tag "$image" filario:managed

  write_status "installing" "$version" "Redémarrage de Filario et migrations."
  if ! docker compose -f "$COMPOSE_FILE" up -d --no-build filario; then
    if [ -n "$old_image" ]; then
      docker tag "$old_image" filario:managed || true
      docker compose -f "$COMPOSE_FILE" up -d --no-build filario || true
    fi
    write_status "failed" "$version" "Le redémarrage a échoué. Ancienne image restaurée si possible."
    rm -f "$UPDATE_DIR/pending.json"
    continue
  fi

  healthy="false"
  attempts=0
  while [ "$attempts" -lt 36 ]; do
    container="$(docker compose -f "$COMPOSE_FILE" ps -q filario || true)"
    if [ -n "$container" ]; then
      health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container" 2>/dev/null || true)"
      if [ "$health" = "healthy" ]; then
        healthy="true"
        break
      fi
      if [ "$health" = "unhealthy" ] || [ "$health" = "exited" ]; then
        break
      fi
    fi
    attempts=$((attempts + 1))
    sleep 5
  done

  if [ "$healthy" != "true" ]; then
    if [ -n "$old_image" ]; then
      docker tag "$old_image" filario:managed || true
      docker compose -f "$COMPOSE_FILE" up -d --no-build filario || true
    fi
    write_status "failed" "$version" "Healthcheck en échec. Image précédente restaurée ; sauvegarde DB conservée."
    rm -f "$UPDATE_DIR/pending.json"
    continue
  fi

  write_status "completed" "$version" "Mise à jour terminée avec succès."
  rm -f "$UPDATE_DIR/pending.json"
done
