# Document Workspace v1.6.6 离线部署完全指南

> 版本: 1.6.6  
> 更新日期: 2026-01-24  
> 适用环境: 离线 Linux 服务器（CentOS/Ubuntu/麒麟/统信）

---

## 目录

1. [部署包准备](#一部署包准备)
2. [现场部署步骤](#二现场部署步骤)
3. [验证与访问](#三验证与访问)
4. [日常运维](#四日常运维)
5. [故障排查](#五故障排查)
6. [配置说明](#六配置说明)
7. [附录：离线安装Docker](#附录离线安装-docker)

---

## 一、部署包准备

### 1.1 部署包内容

部署包包含以下文件（已在开发环境生成）：

```
部署包/
├── document-workspace-1.6.6.tar    # Docker 镜像（~60MB）
├── docker-compose.yml               # 容器编排配置
├── data/                            # 预配置数据目录
└── deploy.sh                        # 一键部署脚本（可选）
```

### 1.2 镜像内置内容

Docker 镜像已包含：
- 前端应用（已构建）
- 后端服务
- 预配置数据（沉淀记录、大纲历史、按钮配置等）
- 完整文档

### 1.3 如何获取部署包

**方式一：从开发环境复制**
```
位置：C:\Users\leosh\Desktop\Cursor-WorkSpace\
文件：
  - document-workspace-1.6.6.tar
  - docker-compose.yml
  - data/ (整个目录)
  - deploy.sh
```

**方式二：从 GitHub 下载后重新构建**
```bash
git clone https://github.com/leoshuo/MultiDocWorkbench.git
cd MultiDocWorkbench
docker build -t document-workspace:1.6.6 .
docker save -o document-workspace-1.6.6.tar document-workspace:1.6.6
```

---

## 二、现场部署步骤

### 2.1 环境要求

| 项目 | 最低要求 | 推荐配置 |
|------|---------|---------|
| 操作系统 | CentOS 7+ / Ubuntu 18.04+ | CentOS 7.9 / Ubuntu 20.04 |
| Docker | 20.10+ | 最新稳定版 |
| Docker Compose | 1.29+ | 2.x |
| CPU | 2 核 | 4 核 |
| 内存 | 2 GB | 4 GB |
| 磁盘 | 5 GB | 20 GB |
| 端口 | 4300 | - |

### 2.2 检查 Docker 环境

```bash
# 检查 Docker 是否安装
docker --version
# 预期输出: Docker version 20.10.x 或更高

# 检查 Docker Compose
docker-compose --version
# 或（新版本）
docker compose version

# 检查 Docker 服务状态
sudo systemctl status docker

# 如果未运行，启动 Docker
sudo systemctl start docker
sudo systemctl enable docker
```

**如果 Docker 未安装**，请参考 [附录：离线安装 Docker](#附录离线安装-docker)

### 2.3 上传部署包

将部署包文件上传到服务器，例如：

```bash
# 方式一：U盘
mount /dev/sdb1 /mnt/usb
cp /mnt/usb/document-workspace-1.6.6.tar /tmp/
cp /mnt/usb/docker-compose.yml /tmp/
cp -r /mnt/usb/data /tmp/

# 方式二：SCP（如果有跳板机）
scp document-workspace-1.6.6.tar user@server:/tmp/
scp docker-compose.yml user@server:/tmp/
scp -r data user@server:/tmp/
```

### 2.4 加载 Docker 镜像

```bash
# 进入文件目录
cd /tmp

# 加载镜像（约需 30 秒）
docker load -i document-workspace-1.6.6.tar

# 验证镜像已加载
docker images | grep document-workspace
# 预期输出:
# document-workspace   1.6.6   xxxx   ~70MB
```

### 2.5 创建部署目录

```bash
# 创建应用目录
sudo mkdir -p /opt/document-workspace
cd /opt/document-workspace

# 复制配置文件
cp /tmp/docker-compose.yml .

# 创建数据目录（用于持久化，可选）
mkdir -p data

# 设置权限（容器使用 node 用户，UID=1000）
sudo chown -R 1000:1000 data
```

### 2.6 启动服务

```bash
cd /opt/document-workspace

# 启动容器（后台运行）
docker-compose up -d

# 查看启动状态
docker-compose ps

# 预期输出:
#       Name                    Command               State           Ports
# ---------------------------------------------------------------------------------
# document-workspace   node server.js               Up      0.0.0.0:4300->4300/tcp
```

### 2.7 查看启动日志

```bash
# 查看实时日志
docker-compose logs -f

# 预期看到:
# app  | Server running at http://0.0.0.0:4300
# app  | SERVE_DIST mode: serving static files from ./dist

# 按 Ctrl+C 退出日志查看
```

---

## 三、验证与访问

### 3.1 命令行验证

```bash
# 测试 API 是否正常
curl http://localhost:4300/api/docs

# 预期返回 JSON 数组，如：
# [{"id":"doc_xxx","name":"xxx.txt",...}]
# 或空数组 []
```

### 3.2 浏览器访问

打开浏览器，访问：
```
http://<服务器IP>:4300
```

例如：`http://192.168.1.100:4300`

### 3.3 防火墙配置

如果无法访问，检查防火墙：

**CentOS / RHEL：**
```bash
# 查看已开放端口
sudo firewall-cmd --list-ports

# 开放 4300 端口
sudo firewall-cmd --add-port=4300/tcp --permanent
sudo firewall-cmd --reload
```

**Ubuntu：**
```bash
sudo ufw allow 4300/tcp
sudo ufw reload
```

---

## 四、日常运维

### 4.1 常用命令

```bash
cd /opt/document-workspace

# 查看容器状态
docker-compose ps

# 查看日志（最近 100 行）
docker-compose logs --tail=100

# 实时查看日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 启动服务
docker-compose up -d

# 进入容器调试
docker exec -it document-workspace sh
```

### 4.2 数据备份

```bash
cd /opt/document-workspace

# 备份数据目录
tar -czvf backup-$(date +%Y%m%d-%H%M%S).tar.gz data/

# 备份到其他位置
cp backup-*.tar.gz /backup/
```

### 4.3 数据恢复

```bash
cd /opt/document-workspace

# 停止服务
docker-compose down

# 恢复数据
tar -xzvf backup-20260121-150000.tar.gz

# 重新启动
docker-compose up -d
```

### 4.4 更新版本

```bash
cd /opt/document-workspace

# 1. 备份当前数据
tar -czvf backup-before-update.tar.gz data/

# 2. 加载新版本镜像
docker load -i document-workspace-1.6.6.tar

# 3. 修改 docker-compose.yml 中的版本号
#    image: document-workspace:1.6.6

# 4. 重新启动
docker-compose down
docker-compose up -d
```

### 4.5 查看资源使用

```bash
# 查看容器资源使用情况
docker stats document-workspace

# 预期输出:
# CONTAINER           CPU %   MEM USAGE / LIMIT   MEM %
# document-workspace  0.5%    150MiB / 2GiB       7.5%
```

---

## 五、故障排查

### 5.1 容器无法启动

**检查日志：**
```bash
docker-compose logs --tail=50
```

**常见问题：**

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| `port is already allocated` | 端口被占用 | 修改端口或停止占用进程 |
| `no space left on device` | 磁盘空间不足 | 清理磁盘 |
| `permission denied` | 权限不足 | 使用 sudo 或修复权限 |

**端口被占用：**
```bash
# 查看 4300 端口占用
netstat -tlnp | grep 4300

# 停止占用进程
kill -9 <PID>

# 或修改端口（编辑 docker-compose.yml）
ports:
  - "8080:4300"  # 改为 8080 端口
```

### 5.2 无法访问页面

**检查步骤：**
```bash
# 1. 检查容器是否运行
docker ps | grep document-workspace

# 2. 检查端口监听
netstat -tlnp | grep 4300

# 3. 本地测试
curl http://localhost:4300

# 4. 检查防火墙
sudo firewall-cmd --list-ports
```

### 5.3 页面加载缓慢

```bash
# 检查容器资源
docker stats document-workspace

# 如果内存不足，增加限制（编辑 docker-compose.yml）
deploy:
  resources:
    limits:
      memory: 4G
```

### 5.4 数据丢失

**原因：** 未正确挂载数据卷

**解决：** 确保 docker-compose.yml 包含：
```yaml
volumes:
  - ./data:/app/data
```

---

## 六、配置说明

### 6.1 docker-compose.yml 完整配置

```yaml
version: "3.8"

services:
  app:
    image: document-workspace:1.6.6
    container_name: document-workspace
    restart: unless-stopped
    ports:
      - "4300:4300"
    environment:
      - PORT=4300
      - SERVE_DIST=1
      # AI 模型配置（可选）
      - QWEN_ENDPOINT=${QWEN_ENDPOINT:-}
      - QWEN_MODEL=${QWEN_MODEL:-qwen-plus}
      - QWEN_API_KEY=${QWEN_API_KEY:-}
    extra_hosts:
      - "host.docker.internal:host-gateway"
    volumes:
      - ./data:/app/data
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:4300/api/docs"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### 6.2 配置本地 AI 模型

如果有本地部署的大模型（如 ChatGLM、Qwen 等），创建 `.env` 文件：

> 注意：`.env` 为本地私密配置文件，请勿提交到 Git。

```bash
cd /opt/document-workspace

cat > .env << 'EOF'
# 本地模型 API 地址
QWEN_ENDPOINT=http://192.168.1.50:8080/v1/chat/completions

# 模型名称
QWEN_MODEL=chatglm3-6b

# API Key（如果需要）
QWEN_API_KEY=your-api-key
EOF

# 重启生效
docker-compose down
docker-compose up -d
```

### 6.3 修改端口

编辑 `docker-compose.yml`：
```yaml
ports:
  - "8080:4300"  # 外部端口:内部端口
```

### 6.4 数据持久化说明

| 挂载方式 | 效果 |
|---------|------|
| 不挂载 | 使用镜像内置数据，容器删除后数据丢失 |
| 挂载空目录 | 容器启动时会使用空数据 |
| 挂载有数据的目录 | 使用本地数据，覆盖镜像内置数据 |

**推荐做法：**
```bash
# 首次部署时，从容器复制数据到本地
docker cp document-workspace:/app/data ./data

# 然后挂载本地目录
# volumes:
#   - ./data:/app/data
```

---

## 附录：离线安装 Docker

### CentOS 7/8 / RHEL

**1. 在联网环境下载 RPM 包：**

访问：https://download.docker.com/linux/centos/7/x86_64/stable/Packages/

下载以下文件：
- containerd.io-1.6.x.rpm
- docker-ce-cli-24.x.rpm
- docker-ce-24.x.rpm
- docker-compose-plugin-2.x.rpm

**2. 复制到离线服务器并安装：**
```bash
cd /path/to/rpms
sudo yum localinstall -y *.rpm

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker

# 验证
docker --version
```

### Ubuntu / Debian

**1. 在联网环境下载 DEB 包：**

访问：https://download.docker.com/linux/ubuntu/dists/focal/pool/stable/amd64/

下载以下文件：
- containerd.io_1.6.x_amd64.deb
- docker-ce-cli_24.x_amd64.deb
- docker-ce_24.x_amd64.deb
- docker-compose-plugin_2.x_amd64.deb

**2. 复制到离线服务器并安装：**
```bash
cd /path/to/debs
sudo dpkg -i containerd.io_*.deb
sudo dpkg -i docker-ce-cli_*.deb
sudo dpkg -i docker-ce_*.deb
sudo dpkg -i docker-compose-plugin_*.deb

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker
```

### 麒麟/统信（国产系统）

通常兼容 CentOS 或 Ubuntu 的安装包，请根据系统基线选择对应方式。

---

## 快速参考卡片

```
┌──────────────────────────────────────────────────────────┐
│         Document Workspace v1.6.6 部署快速参考            │
├──────────────────────────────────────────────────────────┤
│ 加载镜像:  docker load -i document-workspace-1.6.6.tar   │
│ 启动服务:  docker-compose up -d                          │
│ 查看状态:  docker-compose ps                             │
│ 查看日志:  docker-compose logs -f                        │
│ 重启服务:  docker-compose restart                        │
│ 停止服务:  docker-compose down                           │
│ 访问地址:  http://<IP>:4300                              │
├──────────────────────────────────────────────────────────┤
│ 数据目录:  /opt/document-workspace/data                  │
│ 配置文件:  /opt/document-workspace/docker-compose.yml    │
└──────────────────────────────────────────────────────────┘
```

---

*Document Workspace v1.6.6 - 智能文档处理与经验沉淀平台*



