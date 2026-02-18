#!/usr/bin/env bash
# 导出当前数据库作为首次部署的基线数据
# 生成的 SQL 文件会被 docker-compose 中的 postgres 在首次启动时自动加载
#
# 用法:
#   bash scripts/export-baseline.sh [.env文件路径]
#
# 示例:
#   bash scripts/export-baseline.sh           # 使用 .env
#   bash scripts/export-baseline.sh .env.local

set -euo pipefail

ENV_FILE="${1:-.env}"

if [ ! -f "$ENV_FILE" ]; then
  echo "[ERROR] 环境文件不存在: $ENV_FILE"
  exit 1
fi

# 从 .env 文件读取变量
get_env() {
  local key="$1"
  local default="${2:-}"
  local val
  val=$(grep -E "^${key}=" "$ENV_FILE" | head -n1 | cut -d= -f2-)
  # 展开简单的 ${VAR} 引用
  while [[ "$val" =~ \$\{([A-Z_]+)\} ]]; do
    local ref="${BASH_REMATCH[1]}"
    local ref_val
    ref_val=$(get_env "$ref" "")
    val="${val/\$\{$ref\}/$ref_val}"
  done
  echo "${val:-$default}"
}

PG_HOST=$(get_env PG_HOST "localhost")
PG_PORT=$(get_env PG_PORT "5432")
PG_USER=$(get_env PG_USER "hrdb")
PG_PASSWORD=$(get_env PG_PASSWORD "")
PG_DATABASE=$(get_env PG_DATABASE "hrdb")

OUTPUT_DIR="docker/init"
OUTPUT_FILE="$OUTPUT_DIR/01-baseline.sql"

mkdir -p "$OUTPUT_DIR"

echo "[INFO] 连接数据库: $PG_USER@$PG_HOST:$PG_PORT/$PG_DATABASE"
echo "[INFO] 导出完整数据库（结构 + 数据）到 $OUTPUT_FILE ..."

PGPASSWORD="$PG_PASSWORD" pg_dump \
  --host="$PG_HOST" \
  --port="$PG_PORT" \
  --username="$PG_USER" \
  --dbname="$PG_DATABASE" \
  --no-owner \
  --no-privileges \
  --no-tablespaces \
  --format=plain \
  --encoding=UTF8 \
  > "$OUTPUT_FILE"

LINE_COUNT=$(wc -l < "$OUTPUT_FILE")
FILE_SIZE=$(du -sh "$OUTPUT_FILE" | cut -f1)

echo "[OK] 导出完成: $OUTPUT_FILE ($FILE_SIZE, ${LINE_COUNT} 行)"
echo ""
echo "后续步骤:"
echo "  1. 将 docker/init/01-baseline.sql 随代码一起部署到目标服务器"
echo "  2. 首次运行: bash docker/deploy.sh deploy"
echo "     postgres 启动时会自动加载 01-baseline.sql，无需单独恢复数据"
echo "  3. 今后新增的 schema 变更仍通过 prisma migrate deploy 增量执行"
