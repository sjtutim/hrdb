# Inno HeroBase Docker 部署指南

## 目录

- [环境要求](#环境要求)
- [快速部署](#快速部署)
- [配置说明](#配置说明)
- [命令参考](#命令参考)
- [数据库管理](#数据库管理)
- [故障排查](#故障排查)
- [生产环境建议](#生产环境建议)

---

## 环境要求

| 依赖 | 最低版本 | 说明 |
|------|----------|------|
| Docker | 20.10+ | 容器运行时 |
| Docker Compose | v2.0+ | 多容器编排（插件模式） |
| 磁盘空间 | 2GB+ | 镜像 + 数据库存储 |
| 内存 | 2GB+ | 推荐 4GB |

检查环境：
```bash
docker --version          # Docker version 20.10.x+
docker compose version    # Docker Compose version v2.x.x
```

---

## 快速部署

### 步骤 1：配置环境变量

```bash
# 复制示例配置
cp docker/.env.docker.example docker/.env.docker

# 编辑配置（必须修改的项已标注）
vim docker/.env.docker
```

**必须修改的配置项：**

```bash
# 1. 修改数据库密码（安全要求）
PG_PASSWORD=your-strong-password
DATABASE_URL=postgresql://hrdb:your-strong-password@postgres:5432/hrdb?schema=public

# 2. 修改 NextAuth 密钥（安全要求）
NEXTAUTH_SECRET=your-random-secret-key

# 3. 配置外部 MinIO（文件存储）
MINIO_ENDPOINT=10.10.3.237
MINIO_PORT=9000
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET=your-bucket-name

# 4. 配置 AI 服务（可选）
OPENAI_BASE_URL=https://api.minimaxi.com/v1
OPENAI_API_KEY=your-api-key
MODEL=MiniMax-M2.5
```

### 步骤 2：一键部署

```bash
# 构建镜像并启动所有服务
./docker/deploy.sh deploy
```

这个命令会自动：
1. 构建 app 和 migrate 镜像
2. 启动 PostgreSQL 数据库
3. 运行数据库迁移（创建表结构）
4. 启动应用服务

### 步骤 3：初始化数据

```bash
# 创建管理员用户和预设标签
./docker/deploy.sh seed
```

### 步骤 4：验证部署

```bash
# 查看服务状态
./docker/deploy.sh ps

# 查看日志
./docker/deploy.sh logs
```

**预期输出：**
```
NAME            IMAGE                STATUS                    PORTS
hrdb-app        hrdb/app:local       Up (healthy)              0.0.0.0:3000->3000/tcp
hrdb-postgres   postgres:16-alpine   Up (healthy)              0.0.0.0:5432->5432/tcp
```

### 步骤 5：访问系统

- **访问地址**: http://localhost:3000（或配置的 APP_PORT）
- **默认管理员**:
  - 邮箱: `xuhuayong@Inno.com`
  - 密码: `123456A`

---

## 配置说明

### 完整配置项

| 变量 | 默认值 | 说明 |
|------|--------|------|
| **应用配置** |||
| `NEXTAUTH_URL` | `http://localhost:3000` | 应用访问地址 |
| `NEXTAUTH_SECRET` | - | JWT 签名密钥（必须修改） |
| `APP_PORT` | `3000` | 应用暴露端口 |
| **数据库配置** |||
| `PG_HOST` | `postgres` | 数据库主机（容器内保持默认） |
| `PG_PORT` | `5432` | 数据库端口 |
| `PG_USER` | `hrdb` | 数据库用户名 |
| `PG_PASSWORD` | - | 数据库密码（必须修改） |
| `PG_DATABASE` | `hrdb` | 数据库名 |
| `DATABASE_URL` | - | Prisma 连接字符串 |
| **MinIO 配置** |||
| `MINIO_ENDPOINT` | - | MinIO 服务地址 |
| `MINIO_PORT` | `9000` | MinIO 端口 |
| `MINIO_ACCESS_KEY` | - | 访问密钥 |
| `MINIO_SECRET_KEY` | - | 私密密钥 |
| `MINIO_BUCKET` | - | 存储桶名称 |
| `MINIO_USE_SSL` | `false` | 是否使用 SSL |
| **AI 服务配置** |||
| `OPENAI_BASE_URL` | - | OpenAI 兼容 API 地址 |
| `OPENAI_API_KEY` | - | API 密钥 |
| `MODEL` | `MiniMax-M2.5` | 模型名称 |
| **镜像配置** |||
| `APP_IMAGE` | `hrdb/app:local` | 应用镜像标签 |
| `MIGRATE_IMAGE` | `hrdb/migrate:local` | 迁移镜像标签 |

### 端口冲突处理

如果本地 5432 端口被占用：

```bash
# 在 .env.docker 中设置
PG_PORT=5433
```

如果本地 3000 端口被占用：

```bash
# 在 .env.docker 中设置
APP_PORT=4005
NEXTAUTH_URL=http://localhost:4005
```

---

## 命令参考

### 部署命令

| 命令 | 说明 |
|------|------|
| `./docker/deploy.sh deploy` | 构建镜像并完整部署 |
| `./docker/deploy.sh deploy-reuse` | 复用现有镜像部署（更快） |
| `./docker/deploy.sh up` | 启动服务（复用镜像） |
| `./docker/deploy.sh build` | 仅构建镜像 |

### 数据库命令

| 命令 | 说明 |
|------|------|
| `./docker/deploy.sh migrate` | 运行数据库迁移 |
| `./docker/deploy.sh migrate-status` | 查看迁移状态（已应用/待应用） |
| `./docker/deploy.sh migrate-resolve <名称>` | 解除卡住的失败迁移（升级修复用） |
| `./docker/deploy.sh seed` | 初始化管理员和标签数据 |
| `./docker/deploy.sh export-baseline` | 导出当前数据库为基线 SQL |

### 运维命令

| 命令 | 说明 |
|------|------|
| `./docker/deploy.sh ps` | 查看服务状态 |
| `./docker/deploy.sh logs` | 查看实时日志 |
| `./docker/deploy.sh restart` | 重启应用服务 |
| `./docker/deploy.sh images` | 查看本地镜像 |
| `./docker/deploy.sh config` | 查看合并后的配置 |

### 停止命令

| 命令 | 说明 |
|------|------|
| `./docker/deploy.sh down` | 停止服务（保留数据卷） |
| `./docker/deploy.sh down-v` | 停止服务并删除数据卷（慎用） |

---

## 数据库管理

### 备份数据库

```bash
# 导出数据库
docker exec hrdb-postgres pg_dump -U hrdb hrdb > backup_$(date +%Y%m%d).sql

# 或导出为压缩格式
docker exec hrdb-postgres pg_dump -U hrdb -Fc hrdb > backup_$(date +%Y%m%d).dump
```

### 恢复数据库

```bash
# 从 SQL 文件恢复
docker exec -i hrdb-postgres psql -U hrdb hrdb < backup_20260218.sql

# 从 dump 文件恢复
docker exec -i hrdb-postgres pg_restore -U hrdb -d hrdb < backup_20260218.dump
```

### 连接数据库

```bash
# 进入 psql 交互环境
docker exec -it hrdb-postgres psql -U hrdb -d hrdb

# 执行单条 SQL
docker exec hrdb-postgres psql -U hrdb -d hrdb -c "SELECT COUNT(*) FROM \"User\";"
```

### 重置数据库

```bash
# 警告：会删除所有数据！
./docker/deploy.sh down-v    # 删除容器和数据卷
./docker/deploy.sh deploy    # 重新部署
./docker/deploy.sh seed      # 初始化数据
```

---

## 升级现有部署

> 适用于：服务器上已有正在运行的旧版本，需要升级到新版本（**保留现有数据**）。

### 标准升级流程

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 构建新镜像
./docker/deploy.sh build

# 3. 应用数据库迁移（不停服）
./docker/deploy.sh migrate

# 4. 重启应用服务
./docker/deploy.sh restart
```

### 迁移卡住时的修复流程

如果迁移失败（报错 `A migration failed to apply`），按以下步骤处理：

**第一步：查看迁移状态**

```bash
./docker/deploy.sh migrate-status
```

**第二步：解除卡住的失败迁移**

```bash
# 将失败的迁移标记为已应用（跳过执行，解除阻塞）
./docker/deploy.sh migrate-resolve 20260216_add_interviewer_id_to_interview_score
```

**第三步：重新运行迁移**

```bash
./docker/deploy.sh migrate
```

**第四步：重启服务**

```bash
./docker/deploy.sh restart
```

### 验证修复

```bash
# 确认服务正常
./docker/deploy.sh ps

# 查看应用日志（无报错即为成功）
./docker/deploy.sh logs
```

---

## 故障排查

### 常见问题

#### 1. 数据库连接失败

**症状**：应用启动后无法连接数据库

**检查**：
```bash
# 查看 postgres 容器状态
docker ps | grep hrdb-postgres

# 查看 postgres 日志
docker logs hrdb-postgres
```

**解决**：
- 确认 `DATABASE_URL` 中的密码与 `PG_PASSWORD` 一致
- 确认 `PG_HOST=postgres`（容器内通信）

#### 2. 端口被占用

**症状**：`bind: address already in use`

**解决**：
```bash
# 修改 .env.docker 中的端口
PG_PORT=5433
APP_PORT=4005
```

#### 3. 镜像构建失败

**症状**：npm install 或 npm run build 失败

**检查**：
```bash
# 查看详细构建日志
docker compose --env-file docker/.env.docker -f docker/docker-compose.yml build --no-cache app
```

**解决**：
- 确保 `package-lock.json` 存在且版本正确
- 检查网络连接（npm registry 访问）

#### 4. 迁移失败

**症状**：`prisma migrate deploy` 报错

**解决**：
```bash
# 查看迁移状态
docker exec hrdb-postgres psql -U hrdb -d hrdb -c "SELECT * FROM _prisma_migrations;"

# 如果迁移记录损坏，重置数据库
./docker/deploy.sh down-v
./docker/deploy.sh deploy
```

#### 5. MinIO 连接失败

**症状**：简历上传/下载失败

**检查**：
- 确认 MinIO 服务可访问
- 确认 Bucket 已创建
- 确认 Access Key 和 Secret Key 正确

```bash
# 测试 MinIO 连接（在应用容器内）
docker exec hrdb-app curl -I http://MINIO_ENDPOINT:9000
```

### 日志分析

```bash
# 查看应用日志
docker logs hrdb-app --tail 100

# 查看数据库日志
docker logs hrdb-postgres --tail 100

# 实时跟踪所有日志
./docker/deploy.sh logs
```

---

## 生产环境建议

### 安全加固

1. **修改默认密码**
   - 修改 `PG_PASSWORD` 为强密码
   - 修改 `NEXTAUTH_SECRET` 为随机字符串
   - 部署后立即修改管理员密码

2. **网络隔离**
   - 不要将数据库端口暴露到公网
   - 使用反向代理（Nginx）处理 HTTPS

3. **环境变量安全**
   - `.env.docker` 不要提交到 Git
   - 使用 Docker Secrets 或 Vault 管理敏感配置

### 性能优化

1. **数据库调优**
   ```yaml
   # docker-compose.yml 中添加
   postgres:
     command: postgres -c shared_buffers=256MB -c max_connections=100
   ```

2. **应用资源限制**
   ```yaml
   app:
     deploy:
       resources:
         limits:
           cpus: '2'
           memory: 2G
   ```

### 高可用部署

1. 使用外部 PostgreSQL（RDS/云数据库）
2. 使用外部 MinIO 集群
3. 多实例部署 + 负载均衡

### Nginx 反向代理示例

```nginx
server {
    listen 443 ssl http2;
    server_name herobase.example.com;

    ssl_certificate /etc/ssl/certs/herobase.crt;
    ssl_certificate_key /etc/ssl/private/herobase.key;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 架构说明

```
┌─────────────────────────────────────────────────────────────┐
│                        Docker Network                        │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   hrdb-app   │    │hrdb-postgres │    │   migrate    │  │
│  │  (Next.js)   │───▶│ (PostgreSQL) │◀───│  (Prisma)    │  │
│  │   :3000      │    │    :5432     │    │  (one-shot)  │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                   │                               │
└─────────│───────────────────│───────────────────────────────┘
          │                   │
          ▼                   ▼
    ┌──────────┐        ┌──────────┐
    │ External │        │  Volume  │
    │  MinIO   │        │ pg_data  │
    └──────────┘        └──────────┘
```

- **hrdb-app**: Next.js 应用，处理 HTTP 请求
- **hrdb-postgres**: PostgreSQL 数据库，持久化存储
- **migrate**: 一次性容器，运行数据库迁移
- **External MinIO**: 外部对象存储，存放简历文件

---

## 更新部署

```bash
# 拉取最新代码
git pull origin main

# 重新构建并部署
./docker/deploy.sh deploy

# 或仅更新应用（数据库无变化时）
./docker/deploy.sh build
./docker/deploy.sh restart
```
