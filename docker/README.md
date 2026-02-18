# Docker 部署指南

## 快速部署（3 步）

### 步骤 1：配置环境变量

```bash
cp docker/.env.docker.example docker/.env.docker
vim docker/.env.docker  # 修改 MinIO 配置
```

> 注意：`PG_HOST=postgres` 保持不变，`MINIO_*` 改为你的外部 MinIO 地址

### 步骤 2：一键部署

```bash
./docker/deploy.sh deploy
```

### 步骤 3：验证服务

```bash
./docker/deploy.sh ps      # 查看状态
./docker/deploy.sh logs    # 查看日志
```

---

## 常用命令

| 命令 | 说明 |
|------|------|
| `./docker/deploy.sh deploy` | 构建并启动 |
| `./docker/deploy.sh deploy-reuse` | 跳过构建，复用已有镜像 |
| `./docker/deploy.sh images` | 查看本地可用镜像 |
| `./docker/deploy.sh restart` | 重启服务 |
| `./docker/deploy.sh down` | 停止服务（保留数据） |
| `./docker/deploy.sh down-v` | 停止服务（删除数据） |
