#!/usr/bin/env bash
set -euo pipefail

DOCKER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$DOCKER_DIR/docker-compose.yml"
ENV_FILE="$DOCKER_DIR/.env.docker"

if [ ! -f "$ENV_FILE" ]; then
  echo "[ERROR] Missing $ENV_FILE"
  echo "Run: cp $DOCKER_DIR/.env.docker.example $ENV_FILE"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "[ERROR] docker is not installed"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "[ERROR] docker compose plugin is not available"
  exit 1
fi

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

get_env() {
  local key="$1"
  awk -F= -v k="$key" '$1 == k {print substr($0, index($0,$2)); exit}' "$ENV_FILE"
}

APP_IMAGE="$(get_env APP_IMAGE)"
MIGRATE_IMAGE="$(get_env MIGRATE_IMAGE)"
APP_IMAGE="${APP_IMAGE:-hrdb/app:local}"
MIGRATE_IMAGE="${MIGRATE_IMAGE:-hrdb/migrate:local}"

build_images() {
  echo "[INFO] Building images with cache (incremental)..."
  compose build app migrate
}

ensure_local_images() {
  local missing=0
  if ! docker image inspect "$APP_IMAGE" >/dev/null 2>&1; then
    echo "[INFO] Local app image not found: $APP_IMAGE"
    missing=1
  fi

  if ! docker image inspect "$MIGRATE_IMAGE" >/dev/null 2>&1; then
    echo "[INFO] Local migrate image not found: $MIGRATE_IMAGE"
    missing=1
  fi

  if [ "$missing" -eq 1 ]; then
    build_images
  else
    echo "[INFO] Reusing local images: $APP_IMAGE, $MIGRATE_IMAGE"
  fi
}

run_migration() {
  echo "[INFO] Running Prisma migrations..."
  compose run --rm migrate
}

run_seed() {
  echo "[INFO] Running database seed..."
  compose run --rm migrate npx prisma db seed
}

start_stack() {
  echo "[INFO] Starting postgres..."
  compose up -d postgres

  run_migration

  echo "[INFO] Starting app..."
  compose up -d app
}

export_baseline() {
  local env_file="${2:-.env}"
  echo "[INFO] 导出当前数据库为首次部署基线..."
  bash "$(dirname "$DOCKER_DIR")/scripts/export-baseline.sh" "$env_file"
}

cmd="${1:-help}"

case "$cmd" in
  export-baseline)
    export_baseline "$@"
    ;;
  build)
    build_images
    ;;
  up)
    ensure_local_images
    start_stack
    ;;
  deploy)
    build_images
    start_stack
    ;;
  deploy-reuse)
    ensure_local_images
    start_stack
    ;;
  migrate)
    compose up -d postgres
    ensure_local_images
    run_migration
    ;;
  seed)
    compose up -d postgres
    sleep 3
    run_seed
    ;;
  ps)
    compose ps
    ;;
  logs)
    compose logs -f --tail=200 app postgres
    ;;
  down)
    compose down
    ;;
  down-v)
    compose down -v
    ;;
  restart)
    compose restart app
    ;;
  images)
    echo "[INFO] Local images (matching hrdb/* or configured tags):"
    docker images --format 'table {{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.CreatedSince}}\t{{.Size}}' | {
      head -n 1
      grep -E "^hrdb/|^${APP_IMAGE%:*}[[:space:]]|^${MIGRATE_IMAGE%:*}[[:space:]]" || true
    }
    ;;
  config)
    compose config
    ;;
  help|*)
    cat <<USAGE
Usage: $0 <command>

Commands:
  export-baseline [ENV]  从当前数据库导出基线 SQL（含数据）到 docker/init/01-baseline.sql
                         ENV 默认为 .env，首次部署前在开发机上运行
  build                  Build app + migrate images (uses Docker layer cache)
  up                     Reuse local images when available, then start postgres -> migrate -> app
  deploy                 Always build latest images, then start postgres -> migrate -> app
  deploy-reuse           Try reusing local images; build only if image is missing
  migrate                Start postgres and run migration once
  seed                   Run database seed (create admin user and tags)
  ps                     Show services status
  logs                   Follow app/postgres logs
  restart                Restart app service
  down                   Stop and remove services (keep DB volume)
  down-v                 Stop and remove services + DB volume
  images                 Show reusable local images
  config                 Render merged compose config
USAGE
    ;;
esac
