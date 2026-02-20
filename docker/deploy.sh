#!/usr/bin/env bash
set -euo pipefail

DOCKER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$DOCKER_DIR")"
COMPOSE_FILE="$DOCKER_DIR/docker-compose.yml"
ENV_FILE="$DOCKER_DIR/.env.docker"
DOCKER_BUILDKIT="${DOCKER_BUILDKIT:-1}"
COMPOSE_DOCKER_CLI_BUILD="${COMPOSE_DOCKER_CLI_BUILD:-1}"
RUN_MIGRATION="${RUN_MIGRATION:-1}"
DEPLOY_STATE_DIR="$DOCKER_DIR/.deploy-state"

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
PG_USER_VALUE="$(get_env PG_USER)"
PG_DATABASE_VALUE="$(get_env PG_DATABASE)"
PG_USER_VALUE="${PG_USER_VALUE:-hrdb}"
PG_DATABASE_VALUE="${PG_DATABASE_VALUE:-hrdb}"

hash_cmd() {
  if command -v sha256sum >/dev/null 2>&1; then
    echo "sha256sum"
  elif command -v shasum >/dev/null 2>&1; then
    echo "shasum -a 256"
  else
    return 1
  fi
}

current_migrations_hash() {
  local hcmd
  hcmd="$(hash_cmd)" || return 1

  (
    cd "$PROJECT_ROOT"
    find prisma/migrations -type f | LC_ALL=C sort | while IFS= read -r f; do
      printf '%s\n' "$f"
      cat "$f"
    done
  ) | eval "$hcmd" | awk '{print $1}'
}

migrate_hash_file() {
  local image_key
  image_key="$(echo "$MIGRATE_IMAGE" | tr '/:.' '___')"
  echo "$DEPLOY_STATE_DIR/migrate_${image_key}.hash"
}

check_migrate_image_stale() {
  # Return codes:
  # 0 -> stale, should rebuild migrate image
  # 1 -> fresh, no rebuild needed
  local hash_file current_hash previous_hash

  if [ ! -d "$PROJECT_ROOT/prisma/migrations" ]; then
    return 1
  fi

  current_hash="$(current_migrations_hash || true)"
  if [ -z "$current_hash" ]; then
    echo "[WARN] Unable to hash prisma/migrations, forcing migrate image rebuild for safety."
    return 0
  fi

  hash_file="$(migrate_hash_file)"
  if [ ! -f "$hash_file" ]; then
    echo "[INFO] No migration hash state found, rebuild migrate image once to initialize cache state."
    return 0
  fi

  previous_hash="$(cat "$hash_file")"
  if [ "$current_hash" != "$previous_hash" ]; then
    echo "[INFO] Detected prisma/migrations changes, migrate image will be rebuilt."
    return 0
  fi

  return 1
}

update_migrate_hash_state() {
  local current_hash hash_file

  current_hash="$(current_migrations_hash || true)"
  if [ -z "$current_hash" ]; then
    return 0
  fi

  mkdir -p "$DEPLOY_STATE_DIR"
  hash_file="$(migrate_hash_file)"
  printf '%s' "$current_hash" > "$hash_file"
}

build_images() {
  local targets=("$@")
  if [ "${#targets[@]}" -eq 0 ]; then
    targets=(app migrate)
  fi

  echo "[INFO] Building images with cache (incremental): ${targets[*]}"
  # 切换到 default builder（docker driver），复用主机 daemon 镜像缓存，无需 BuildKit 容器联网
  docker buildx use default 2>/dev/null || true
  DOCKER_BUILDKIT="$DOCKER_BUILDKIT" COMPOSE_DOCKER_CLI_BUILD="$COMPOSE_DOCKER_CLI_BUILD" compose build --parallel "${targets[@]}"

  if printf '%s\n' "${targets[@]}" | grep -qx "migrate"; then
    update_migrate_hash_state
  fi
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
  elif check_migrate_image_stale; then
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

run_doctor() {
  local all_ok=1
  local index_count duplicate_group_count

  start_postgres
  ensure_local_images

  echo "[INFO] Doctor: checking prisma migration status..."
  if compose run --rm migrate npx prisma migrate status; then
    echo "[OK] Prisma migration status check passed."
  else
    echo "[ERROR] Prisma migration status check failed."
    all_ok=0
  fi

  echo "[INFO] Doctor: checking unique index Candidate_name_resumeFileName_key..."
  index_count="$(
    compose exec -T postgres \
      psql -U "$PG_USER_VALUE" -d "$PG_DATABASE_VALUE" -At \
      -c "SELECT COUNT(1) FROM pg_indexes WHERE schemaname='public' AND tablename='Candidate' AND indexname='Candidate_name_resumeFileName_key';"
  )"

  if [ "$index_count" = "1" ]; then
    echo "[OK] Unique index exists: Candidate_name_resumeFileName_key"
  else
    echo "[ERROR] Missing unique index: Candidate_name_resumeFileName_key"
    all_ok=0
  fi

  echo "[INFO] Doctor: checking duplicate (name, resumeFileName) groups..."
  duplicate_group_count="$(
    compose exec -T postgres \
      psql -U "$PG_USER_VALUE" -d "$PG_DATABASE_VALUE" -At \
      -c "SELECT COUNT(*) FROM (SELECT 1 FROM \"Candidate\" WHERE \"resumeFileName\" IS NOT NULL GROUP BY \"name\", \"resumeFileName\" HAVING COUNT(*) > 1) t;"
  )"

  if [ "$duplicate_group_count" = "0" ]; then
    echo "[OK] No duplicate (name, resumeFileName) groups found."
  else
    echo "[ERROR] Found $duplicate_group_count duplicate (name, resumeFileName) groups."
    echo "[INFO] Top duplicate groups:"
    compose exec -T postgres \
      psql -U "$PG_USER_VALUE" -d "$PG_DATABASE_VALUE" \
      -c "SELECT \"name\", \"resumeFileName\", COUNT(*) AS cnt FROM \"Candidate\" WHERE \"resumeFileName\" IS NOT NULL GROUP BY \"name\", \"resumeFileName\" HAVING COUNT(*) > 1 ORDER BY cnt DESC, \"name\" ASC LIMIT 20;"
    all_ok=0
  fi

  if [ "$all_ok" = "1" ]; then
    echo "[INFO] Doctor finished: all checks passed."
  else
    echo "[ERROR] Doctor finished: issues found."
    return 1
  fi
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
  doctor)
    run_doctor
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
  doctor                 Check migration health, required unique index, and duplicate blockers
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
