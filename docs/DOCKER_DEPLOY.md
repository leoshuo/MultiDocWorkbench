# 离线部署指南（Docker / Linux）

版本：1.6.4  
更新日期：2026-01-25

> 本项目支持离线部署。Docker 镜像包含前端、后端和文档，开箱即用。

---

## 快速开始（3 步部署）

### 第 1 步：在开发机构建镜像

```bash
# 进入项目目录
cd document-workspace

# 构建镜像
docker build -t document-workspace:1.6.4 .

# 导出镜像为 tar 包（用于离线传输）
docker save document-workspace:1.6.4 -o document-workspace-1.6.3.tar
```

### 第 2 步：在目标服务器加载镜像

```bash
# 将 tar 包传输到目标服务器后，加载镜像
docker load -i document-workspace-1.6.3.tar
```

### 第 3 步：启动容器

```bash
# 创建数据目录
mkdir -p /opt/document-workspace/data

# 启动容器
docker run -d \
  --name document-workspace \
  --restart unless-stopped \
  -p 4300:4300 \
  -v /opt/document-workspace/data:/app/data \
  document-workspace:1.6.4
```

### 第 4 步：访问界面

打开浏览器访问：
```
http://<服务器IP>:4300
```

- **多文档处理工作台**：默认首页（应用端）
- **经验沉淀工作台**：点击右上角「切换后台管理工作台」进入（后管端）

---

## 完整配置说明

### 使用 docker-compose（推荐）

创建 `docker-compose.yml` 文件：

```yaml
version: "3.8"

services:
  app:
    image: document-workspace:1.6.4
    container_name: document-workspace
    restart: unless-stopped
    ports:
      - "4300:4300"
    environment:
      - PORT=4300
      - SERVE_DIST=1
      # 以下为 AI 模型配置（可选）
      - QWEN_ENDPOINT=${QWEN_ENDPOINT:-}
      - QWEN_MODEL=${QWEN_MODEL:-qwen-plus}
      - QWEN_API_KEY=${QWEN_API_KEY:-}
    volumes:
      - ./data:/app/data
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:4300/api/docs"]
      interval: 30s
      timeout: 10s
      retries: 3
```

启动命令：
```bash
docker-compose up -d
```

### 配置 AI 模型（可选）

如果离线环境有本地千问模型，在启动命令中添加环境变量：

```bash
docker run -d \
  --name document-workspace \
  --restart unless-stopped \
  -p 4300:4300 \
  -e QWEN_ENDPOINT="http://你的模型服务地址/v1/chat/completions" \
  -e QWEN_MODEL="qwen-plus" \
  -e QWEN_API_KEY="你的API密钥" \
  -v /opt/document-workspace/data:/app/data \
  document-workspace:1.6.4
```

**说明**：
- 如果本地模型不需要鉴权，可不设置 `QWEN_API_KEY`
- 没有配置 AI 时，系统仍可正常使用，AI 相关功能会返回占位数据

---

## 端口说明

| 端口 | 用途 | 环境 |
|------|------|------|
| 4300 | 完整应用（前端 + API） | **生产环境（Docker）** |
| 5300 | Vite 开发服务器 | 仅开发环境 |

**重要**：生产环境只需要 **4300** 端口，不需要 5300。

---

## 常用运维命令

```bash
# 查看容器状态
docker ps

# 查看日志
docker logs document-workspace

# 实时查看日志
docker logs -f document-workspace

# 重启容器
docker restart document-workspace

# 停止并删除容器
docker stop document-workspace && docker rm document-workspace

# 进入容器调试
docker exec -it document-workspace sh
```

---

## 数据持久化

数据保存在 `/app/data` 目录，通过 `-v` 参数映射到宿主机：

```bash
-v /opt/document-workspace/data:/app/data
```

主要数据文件：
- `docs.json` - 文档数据
- `precipitation-records.json` - 沉淀记录
- `precipitation-groups.json` - 沉淀集
- `outline-history.json` - 大纲历史
- `*-config.json` - 各类配置

**备份**：直接备份宿主机的数据目录即可。

---

## 常见问题

### 1. 无法访问 4300 端口

检查：
```bash
# 确认容器运行中
docker ps | grep document-workspace

# 检查端口监听
netstat -tlnp | grep 4300

# 检查防火墙
firewall-cmd --list-ports  # CentOS/RHEL
ufw status                 # Ubuntu
```

解决：
```bash
# 开放端口（CentOS/RHEL）
firewall-cmd --add-port=4300/tcp --permanent
firewall-cmd --reload

# 开放端口（Ubuntu）
ufw allow 4300
```

### 2. 容器启动失败

查看日志：
```bash
docker logs document-workspace
```

常见原因：
- 端口被占用：更换端口 `-p 8080:4300`
- 数据目录权限：`chmod 777 /opt/document-workspace/data`

### 3. AI 功能不可用

检查：
- 确认 `QWEN_ENDPOINT` 地址在容器内可达
- 如果是内网模型，可能需要 `--network host` 参数

```bash
docker run -d \
  --name document-workspace \
  --network host \
  -e PORT=4300 \
  -e QWEN_ENDPOINT="http://内网模型地址/v1/chat/completions" \
  -v /opt/document-workspace/data:/app/data \
  document-workspace:1.6.4
```

### 4. 页面显示空白

可能原因：前端文件未正确构建

检查：
```bash
docker exec -it document-workspace ls -la /app/dist
```

应该看到 `index.html` 和 `assets/` 目录。

---

## 升级指南

1. 停止旧容器
```bash
docker stop document-workspace
docker rm document-workspace
```

2. 加载新镜像
```bash
docker load -i document-workspace-新版本.tar
```

3. 启动新容器（数据目录保持不变）
```bash
docker run -d \
  --name document-workspace \
  --restart unless-stopped \
  -p 4300:4300 \
  -v /opt/document-workspace/data:/app/data \
  document-workspace:新版本
```

---

## 技术支持

如遇问题，请提供以下信息：
1. `docker logs document-workspace` 的输出
2. 浏览器控制台的错误信息
3. 服务器操作系统版本


