#!/usr/bin/env bash
set -euo pipefail

DOCKER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$DOCKER_DIR/docker-compose.yml"
ENV_FILE="$DOCKER_DIR/.env.docker"
DOCKER_BUILDKIT="${DOCKER_BUILDKIT:-1}"
COMPOSE_DOCKER_CLI_BUILD="${COMPOSE_DOCKER_CLI_BUILD:-1}"
RUN_MIGRATION="${RUN_MIGRATION:-1}"

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
  local targets=("$@")
  if [ "${#targets[@]}" -eq 0 ]; then
    targets=(app migrate)
  fi

  echo "[INFO] Building images with cache (incremental): ${targets[*]}"
  # 切换到 default builder（docker driver），复用主机 daemon 镜像缓存，无需 BuildKit 容器联网
  docker buildx use default 2>/dev/null || true
  DOCKER_BUILDKIT="$DOCKER_BUILDKIT" COMPOSE_DOCKER_CLI_BUILD="$COMPOSE_DOCKER_CLI_BUILD" compose build --parallel "${targets[@]}"
}

ensure_local_images() {
  local missing_targets=()

  if ! docker image inspect "$APP_IMAGE" >/dev/null 2>&1; then
    echo "[INFO] Local app image not found: $APP_IMAGE"
    missing_targets+=(app)
  fi

  if ! docker image inspect "$MIGRATE_IMAGE" >/dev/null 2>&1; then
    echo "[INFO] Local migrate image not found: $MIGRATE_IMAGE"
    missing_targets+=(migrate)
  fi

  if [ "${#missing_targets[@]}" -gt 0 ]; then
    build_images "${missing_targets[@]}"
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

run_migrate_status() {
  echo "[INFO] Checking Prisma migration status..."
  compose run --rm migrate npx prisma migrate status
}

run_migrate_resolve() {
  local migration_name="$1"
  echo "[INFO] Resolving stuck migration: $migration_name"
  compose run --rm migrate npx prisma migrate resolve --applied "$migration_name"
}

start_postgres() {
  echo "[INFO] Starting postgres..."
  if compose up -d --wait postgres >/dev/null 2>&1; then
    echo "[INFO] Postgres is healthy"
  else
    # fallback for older compose versions without --wait
    compose up -d postgres
  fi
}

start_stack() {
  start_postgres

  if [ "$RUN_MIGRATION" = "1" ]; then
    run_migration
  else
    echo "[INFO] Skipping migration (RUN_MIGRATION=$RUN_MIGRATION)"
  fi

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
    start_postgres
    ensure_local_images
    run_migration
    ;;
  seed)
    start_postgres
    ensure_local_images
    run_seed
    ;;
  migrate-status)
    start_postgres
    ensure_local_images
    run_migrate_status
    ;;
  migrate-resolve)
    MIGRATION_NAME="${2:-}"
    if [ -z "$MIGRATION_NAME" ]; then
      echo "[ERROR] Usage: $0 migrate-resolve <migration_name>"
      echo "  Example: $0 migrate-resolve 20260216_add_interviewer_id_to_interview_score"
      exit 1
    fi
    start_postgres
    ensure_local_images
    run_migrate_resolve "$MIGRATION_NAME"
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
                         Set RUN_MIGRATION=0 to skip migration for faster restart
  deploy                 Always build latest images, then start postgres -> migrate -> app
  deploy-reuse           Try reusing local images; build only if image is missing
  migrate                Start postgres and run migration once
  migrate-status         Show pending/applied migration status
  migrate-resolve NAME   Mark a stuck/failed migration as applied (unblocks prisma)
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
