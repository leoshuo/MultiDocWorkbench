# Document Workspace 1.6.4 离线 Linux 部署指南（小白版）

> 本文档面向无 Docker 经验的用户，手把手教你在 **离线 Linux 环境** 部署本产品。

---

## 目录

1. [准备工作（开发机）](#1-准备工作开发机)
2. [构建 Docker 镜像](#2-构建-docker-镜像)
3. [导出镜像和文件](#3-导出镜像和文件)
4. [传输到离线服务器](#4-传输到离线服务器)
5. [在离线服务器部署](#5-在离线服务器部署)
6. [配置千问大模型](#6-配置千问大模型)
7. [验证部署](#7-验证部署)
8. [常用运维命令](#8-常用运维命令)
9. [常见问题](#9-常见问题)

---

## 1. 准备工作（开发机）

### 1.1 开发机需要

- **操作系统**：Windows/Mac/Linux 均可
- **已安装软件**：
  - Node.js 18+（用于构建前端）
  - Docker Desktop（用于构建镜像）
- **网络**：可联网（用于下载依赖）

### 1.2 获取项目代码

确保你有完整的项目代码，目录结构如下：

```
document-workspace/
├── src/                  # 前端源码
├── server.js             # 后端主服务
├── server_multi.js       # 多文档路由
├── server_utils.js       # 工具函数
├── data/                 # 数据目录（会被持久化）
├── docs/                 # 文档
├── Dockerfile            # Docker 构建文件
├── docker-compose.yml    # Docker Compose 配置
├── package.json          # 项目依赖
└── ...
```

---

## 2. 构建 Docker 镜像

### 2.1 打开终端

- **Windows**：打开 PowerShell 或 CMD
- **Mac/Linux**：打开 Terminal

### 2.2 进入项目目录

```bash
cd C:\Users\你的用户名\Desktop\Cursor-WorkSpace
# 或
cd /path/to/document-workspace
```

### 2.3 确保 Docker 正在运行

```bash
docker --version
# 应显示类似：Docker version 24.x.x
```

### 2.4 构建镜像

```bash
docker build -t document-workspace:1.6.4 .
```

**说明**：
- `-t document-workspace:1.6.4`：给镜像命名和打标签
- `.`：使用当前目录的 Dockerfile
- 构建过程约 2-5 分钟，取决于网络速度

### 2.5 验证构建成功

```bash
docker images | grep document-workspace
```

应显示类似：
```
document-workspace   1.6.4   abc123def456   1 minute ago   300MB
```

---

## 3. 导出镜像和文件

### 3.1 导出 Docker 镜像

```bash
docker save document-workspace:1.6.4 -o document-workspace-1.6.4.tar
```

这会在当前目录生成 `document-workspace-1.6.4.tar` 文件（约 300-500MB）。

### 3.2 准备部署文件包

创建一个部署文件夹，包含以下内容：

```bash
# Windows (PowerShell)
mkdir deploy-package
copy document-workspace-1.6.4.tar deploy-package\
copy docker-compose.yml deploy-package\
copy -r data deploy-package\
copy -r docs deploy-package\
copy README.md deploy-package\

# Linux/Mac
mkdir deploy-package
cp document-workspace-1.6.4.tar deploy-package/
cp docker-compose.yml deploy-package/
cp -r data deploy-package/
cp -r docs deploy-package/
cp README.md deploy-package/
```

### 3.3 创建启动脚本

在 `deploy-package` 目录创建 `start.sh`：

```bash
#!/bin/bash

# Document Workspace 1.6.4 启动脚本

echo "=========================================="
echo "  Document Workspace 1.6.4 部署脚本"
echo "=========================================="

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "错误：未检测到 Docker，请先安装 Docker"
    exit 1
fi

# 加载镜像（如果还没加载）
if ! docker images | grep -q "document-workspace.*1.6.4"; then
    echo "正在加载 Docker 镜像..."
    docker load -i document-workspace-1.6.4.tar
    echo "镜像加载完成！"
else
    echo "镜像已存在，跳过加载。"
fi

# 停止并删除旧容器（如果存在）
if docker ps -a | grep -q "document-workspace"; then
    echo "停止并删除旧容器..."
    docker stop document-workspace 2>/dev/null
    docker rm document-workspace 2>/dev/null
fi

# 创建数据目录
mkdir -p ./data

# 启动容器
echo "正在启动容器..."
docker run -d \
  --name document-workspace \
  --restart unless-stopped \
  -p 4300:4300 \
  -v $(pwd)/data:/app/data \
  -e QWEN_ENDPOINT="${QWEN_ENDPOINT:-}" \
  -e QWEN_MODEL="${QWEN_MODEL:-qwen-plus}" \
  -e QWEN_API_KEY="${QWEN_API_KEY:-}" \
  document-workspace:1.6.4

# 检查启动状态
sleep 3
if docker ps | grep -q "document-workspace"; then
    echo ""
    echo "=========================================="
    echo "  部署成功！"
    echo "=========================================="
    echo ""
    echo "访问地址：http://$(hostname -I | awk '{print $1}'):4300"
    echo ""
    echo "如需配置千问模型，请编辑 .env 文件并重启：./restart.sh"
    echo ""
else
    echo "启动失败，请查看日志：docker logs document-workspace"
fi
```

创建 `stop.sh`：

```bash
#!/bin/bash
echo "停止 Document Workspace..."
docker stop document-workspace
echo "已停止。"
```

创建 `restart.sh`：

```bash
#!/bin/bash
echo "重启 Document Workspace..."
docker restart document-workspace
echo "已重启。"
echo "访问地址：http://$(hostname -I | awk '{print $1}'):4300"
```

创建 `logs.sh`：

```bash
#!/bin/bash
docker logs -f document-workspace
```

创建 `.env` 示例文件：

```bash
# 千问模型配置（根据现场情况修改）
QWEN_ENDPOINT=http://你的千问模型地址/v1/chat/completions
QWEN_MODEL=qwen-plus
QWEN_API_KEY=你的API密钥（如果需要）
```

### 3.4 最终部署包结构

```
deploy-package/
├── document-workspace-1.6.4.tar   # Docker 镜像（核心）
├── docker-compose.yml              # Docker Compose 配置
├── data/                           # 初始数据（可选）
├── docs/                           # 文档
├── README.md                       # 说明文档
├── start.sh                        # 启动脚本
├── stop.sh                         # 停止脚本
├── restart.sh                      # 重启脚本
├── logs.sh                         # 查看日志
└── .env                            # 环境变量配置
```

### 3.5 压缩打包

```bash
# Linux/Mac
tar -czvf document-workspace-1.6.4-deploy.tar.gz deploy-package/

# Windows (使用 7-Zip 或其他工具)
```

---

## 4. 传输到离线服务器

### 4.1 传输方式选择

| 方式 | 适用场景 |
|------|----------|
| U盘/移动硬盘 | 文件较大，网络不通 |
| SCP/SFTP | 有跳板机或部分网络 |
| 光盘 | 特殊安全要求环境 |

### 4.2 使用 SCP 传输（如果可用）

```bash
# 从开发机传输到服务器
scp document-workspace-1.6.4-deploy.tar.gz user@服务器IP:/home/user/
```

### 4.3 使用 U 盘传输

1. 将 `document-workspace-1.6.4-deploy.tar.gz` 复制到 U 盘
2. 在服务器上挂载 U 盘
3. 复制文件到服务器

```bash
# 挂载 U 盘（通常自动挂载到 /media 或 /mnt）
mount /dev/sdb1 /mnt/usb

# 复制文件
cp /mnt/usb/document-workspace-1.6.4-deploy.tar.gz /home/user/

# 卸载 U 盘
umount /mnt/usb
```

---

## 5. 在离线服务器部署

### 5.1 服务器要求

| 项目 | 最低要求 | 推荐配置 |
|------|----------|----------|
| 操作系统 | CentOS 7+ / Ubuntu 18.04+ | CentOS 8 / Ubuntu 22.04 |
| CPU | 2 核 | 4 核 |
| 内存 | 4 GB | 8 GB |
| 硬盘 | 10 GB | 50 GB |
| Docker | 20.10+ | 24.x |

### 5.2 检查 Docker 是否已安装

```bash
docker --version
```

如果未安装，需要先离线安装 Docker（见附录）。

### 5.3 解压部署包

```bash
# 进入用户目录
cd /home/user

# 解压
tar -xzvf document-workspace-1.6.4-deploy.tar.gz

# 进入部署目录
cd deploy-package
```

### 5.4 设置脚本权限

```bash
chmod +x start.sh stop.sh restart.sh logs.sh
```

### 5.5 加载 Docker 镜像

```bash
docker load -i document-workspace-1.6.4.tar
```

输出类似：
```
Loaded image: document-workspace:1.6.4
```

### 5.6 启动服务

**方式一：使用启动脚本（推荐）**

```bash
./start.sh
```

**方式二：手动启动**

```bash
# 创建数据目录
mkdir -p ./data

# 启动容器
docker run -d \
  --name document-workspace \
  --restart unless-stopped \
  -p 4300:4300 \
  -v $(pwd)/data:/app/data \
  document-workspace:1.6.4
```

### 5.7 检查运行状态

```bash
docker ps
```

应显示：
```
CONTAINER ID   IMAGE                        STATUS        PORTS
xxxxxxxxxxxx   document-workspace:1.6.4     Up 1 minute   0.0.0.0:4300->4300/tcp
```

---

## 6. 配置千问大模型

### 6.1 确认现场模型信息

你需要从现场获取以下信息：

| 信息 | 示例 | 说明 |
|------|------|------|
| 模型接口地址 | `http://192.168.1.100:8000/v1/chat/completions` | 千问 API 地址 |
| 模型名称 | `qwen-plus` 或 `qwen-max` | 使用的模型版本 |
| API 密钥 | `sk-xxxxxxxxx` | 如果需要认证 |

### 6.2 配置环境变量

**方式一：编辑 .env 文件**

```bash
vi .env
```

内容：
```bash
QWEN_ENDPOINT=http://192.168.1.100:8000/v1/chat/completions
QWEN_MODEL=qwen-plus
QWEN_API_KEY=你的密钥（如果不需要认证可留空）
```

然后重启：
```bash
./stop.sh
source .env && ./start.sh
```

**方式二：直接在启动命令中配置**

```bash
docker stop document-workspace
docker rm document-workspace

docker run -d \
  --name document-workspace \
  --restart unless-stopped \
  -p 4300:4300 \
  -e QWEN_ENDPOINT="http://192.168.1.100:8000/v1/chat/completions" \
  -e QWEN_MODEL="qwen-plus" \
  -e QWEN_API_KEY="你的密钥" \
  -v $(pwd)/data:/app/data \
  document-workspace:1.6.4
```

**方式三：运行时通过 API 设置**

启动后，调用接口设置：
```bash
curl -X POST http://localhost:4300/api/config/api-key \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "你的密钥"}'
```

### 6.3 特殊网络配置

如果千问模型在宿主机上运行，需要让容器访问宿主机：

```bash
docker run -d \
  --name document-workspace \
  --restart unless-stopped \
  -p 4300:4300 \
  --add-host=host.docker.internal:host-gateway \
  -e QWEN_ENDPOINT="http://host.docker.internal:8000/v1/chat/completions" \
  -v $(pwd)/data:/app/data \
  document-workspace:1.6.4
```

或者使用 host 网络模式：

```bash
docker run -d \
  --name document-workspace \
  --restart unless-stopped \
  --network host \
  -e PORT=4300 \
  -e QWEN_ENDPOINT="http://127.0.0.1:8000/v1/chat/completions" \
  -v $(pwd)/data:/app/data \
  document-workspace:1.6.4
```

---

## 7. 验证部署

### 7.1 检查服务状态

```bash
# 查看容器状态
docker ps

# 查看容器日志
docker logs document-workspace

# 查看最近 100 行日志
docker logs --tail 100 document-workspace
```

### 7.2 访问界面

打开浏览器访问：
```
http://服务器IP:4300
```

### 7.3 验证功能

| 验证项 | 操作 | 预期结果 |
|--------|------|----------|
| 界面加载 | 访问首页 | 显示"多文档处理工作台" |
| 工作台切换 | 点击右上角"切换工作台" | 切换到"经验沉淀工作台" |
| 文档上传 | 上传 txt 文件 | 文件出现在文档列表 |
| AI 功能 | 点击"大纲抽取" | 返回 AI 生成的大纲（需配置模型） |

### 7.4 测试 AI 配置

```bash
# 检查 AI 配置状态
curl http://localhost:4300/api/config/status
```

返回示例：
```json
{
  "hasApiKey": true,
  "endpoint": "http://192.168.1.100:8000/v1/chat/completions",
  "model": "qwen-plus"
}
```

---

## 8. 常用运维命令

### 8.1 容器管理

```bash
# 查看运行中的容器
docker ps

# 查看所有容器（包括已停止）
docker ps -a

# 启动容器
docker start document-workspace

# 停止容器
docker stop document-workspace

# 重启容器
docker restart document-workspace

# 删除容器
docker rm document-workspace

# 进入容器内部调试
docker exec -it document-workspace sh
```

### 8.2 日志查看

```bash
# 查看全部日志
docker logs document-workspace

# 实时查看日志
docker logs -f document-workspace

# 查看最近 100 行
docker logs --tail 100 document-workspace

# 查看最近 1 小时的日志
docker logs --since 1h document-workspace
```

### 8.3 数据备份

```bash
# 备份数据目录
cp -r ./data ./data_backup_$(date +%Y%m%d)

# 或打包备份
tar -czvf data_backup_$(date +%Y%m%d).tar.gz ./data
```

### 8.4 更新版本

```bash
# 1. 停止旧容器
docker stop document-workspace
docker rm document-workspace

# 2. 加载新镜像
docker load -i document-workspace-新版本.tar

# 3. 启动新容器（数据目录不变）
docker run -d \
  --name document-workspace \
  --restart unless-stopped \
  -p 4300:4300 \
  -v $(pwd)/data:/app/data \
  document-workspace:新版本
```

---

## 9. 常见问题

### Q1: 端口 4300 被占用

**解决**：更换端口

```bash
docker run -d \
  --name document-workspace \
  -p 8080:4300 \
  -v $(pwd)/data:/app/data \
  document-workspace:1.6.4
```

然后访问 `http://服务器IP:8080`

### Q2: 防火墙阻止访问

**CentOS/RHEL**：
```bash
firewall-cmd --add-port=4300/tcp --permanent
firewall-cmd --reload
```

**Ubuntu**：
```bash
ufw allow 4300
```

### Q3: 容器启动后立即退出

**查看日志**：
```bash
docker logs document-workspace
```

**常见原因**：
- 端口被占用
- 数据目录权限问题

**解决**：
```bash
chmod 777 ./data
```

### Q4: AI 功能返回错误

**检查模型连接**：
```bash
# 进入容器测试
docker exec -it document-workspace sh

# 测试网络连通性
wget -q --spider http://模型地址/v1/models && echo "连接成功" || echo "连接失败"
```

**检查配置**：
```bash
curl http://localhost:4300/api/config/status
```

### Q5: 页面显示空白

**检查前端文件**：
```bash
docker exec -it document-workspace ls -la /app/dist
```

应该看到 `index.html` 和 `assets/` 目录。

### Q6: 数据丢失

**原因**：未挂载数据卷

**解决**：确保启动命令包含 `-v $(pwd)/data:/app/data`

---

## 附录：离线安装 Docker

如果服务器没有 Docker，需要先离线安装。

### CentOS 7/8

1. 在有网络的机器下载 Docker 离线包：
```bash
# 下载地址
https://download.docker.com/linux/centos/7/x86_64/stable/Packages/
```

2. 需要下载的包：
   - `containerd.io-xxx.rpm`
   - `docker-ce-xxx.rpm`
   - `docker-ce-cli-xxx.rpm`

3. 传输到离线服务器后安装：
```bash
yum localinstall -y containerd.io-*.rpm docker-ce-cli-*.rpm docker-ce-*.rpm
```

4. 启动 Docker：
```bash
systemctl start docker
systemctl enable docker
```

### Ubuntu

1. 下载 deb 包：
```bash
# 下载地址
https://download.docker.com/linux/ubuntu/dists/
```

2. 安装：
```bash
dpkg -i containerd.io_*.deb docker-ce-cli_*.deb docker-ce_*.deb
```

3. 启动：
```bash
systemctl start docker
systemctl enable docker
```

---

## 快速参考卡片

```
┌─────────────────────────────────────────────────────────┐
│           Document Workspace 1.6.4 快速参考              │
├─────────────────────────────────────────────────────────┤
│ 访问地址：http://服务器IP:4300                           │
├─────────────────────────────────────────────────────────┤
│ 常用命令：                                               │
│   启动：./start.sh 或 docker start document-workspace   │
│   停止：./stop.sh 或 docker stop document-workspace     │
│   重启：./restart.sh 或 docker restart document-workspace│
│   日志：./logs.sh 或 docker logs -f document-workspace  │
├─────────────────────────────────────────────────────────┤
│ 数据目录：./data （自动持久化）                          │
├─────────────────────────────────────────────────────────┤
│ AI 配置：                                                │
│   方式1：编辑 .env 文件后重启                            │
│   方式2：POST /api/config/api-key                       │
├─────────────────────────────────────────────────────────┤
│ 技术支持：查看 docs/ 目录下的文档                        │
└─────────────────────────────────────────────────────────┘
```

---

*Document Workspace 1.6.4 - 智能文档处理与经验沉淀平台*
