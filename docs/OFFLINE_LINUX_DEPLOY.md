# Document Workspace 1.6.6 Linux 离线部署指南

> 版本: 1.6.6  
> 更新日期: 2026-01-24  
> 适用场景: 内网环境、无互联网访问的 Linux 服务器

---

## 目录

1. [概述](#1-概述)
2. [准备工作](#2-准备工作)
3. [在开发机上打包](#3-在开发机上打包)
4. [传输到目标服务器](#4-传输到目标服务器)
5. [在目标服务器上安装](#5-在目标服务器上安装)
6. [验证安装](#6-验证安装)
7. [配置说明](#7-配置说明)
8. [常见问题](#8-常见问题)
9. [维护指南](#9-维护指南)

---

## 1. 概述

### 1.1 什么是离线部署？

离线部署是指在**没有互联网连接**的环境下安装和运行软件。本指南将帮助你：

1. 在有网络的开发机上打包所有必要文件
2. 将打包好的文件传输到离线服务器
3. 在离线服务器上安装并运行 Document Workspace

### 1.2 离线包包含内容

| 内容 | 说明 |
|------|------|
| Docker 镜像 | 完整的应用程序镜像（约 200MB） |
| data/ | 预配置数据（沉淀记录、按钮配置等） |
| docs/ | 完整操作文档 |
| test/ | 测试文档示例 |
| dist/ | 前端静态文件（备用） |
| docker-compose.yml | Docker 编排配置 |
| install.sh | 一键安装脚本 |

---

## 2. 准备工作

### 2.1 开发机要求（用于打包）

| 项目 | 要求 |
|------|------|
| 操作系统 | Windows 10/11 或 Linux/macOS |
| Docker | Docker Desktop 已安装并运行 |
| Node.js | 18.x 或更高版本 |
| 磁盘空间 | 至少 2GB 可用空间 |

### 2.2 目标服务器要求（用于运行）

| 项目 | 要求 |
|------|------|
| 操作系统 | CentOS 7+、Ubuntu 18.04+、Debian 10+ |
| Docker | 已安装（见下方安装说明） |
| Docker Compose | 已安装 |
| CPU | 2 核以上 |
| 内存 | 2GB 以上 |
| 磁盘 | 5GB 以上可用空间 |

### 2.3 目标服务器预装 Docker（如未安装）

如果目标服务器还没有 Docker，需要**先在有网络时安装**，或使用离线安装包：

**CentOS 7/8 在线安装：**
```bash
# 安装 Docker
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker

# 验证安装
docker --version
docker compose version
```

**Ubuntu 20.04/22.04 在线安装：**
```bash
# 安装 Docker
sudo apt-get update
sudo apt-get install -y docker.io docker-compose

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker

# 验证安装
docker --version
docker-compose --version
```

---

## 3. 在开发机上打包

### 3.1 方式一：使用打包脚本（推荐）

**Windows PowerShell：**
```powershell
# 进入项目目录
cd C:\Users\leosh\Desktop\Cursor-WorkSpace

# 运行打包脚本
.\scripts\pack-offline.ps1
```

脚本会自动执行：
1. 构建前端静态文件
2. 构建 Docker 镜像
3. 导出镜像到 tar 文件
4. 打包所有必要文件
5. 生成 `document-workspace-1.6.6-offline.tar.gz`

### 3.2 方式二：手动打包

如果脚本不可用，可以手动执行以下步骤：

```powershell
# 1. 构建前端
npm run build

# 2. 构建 Docker 镜像
docker build -t document-workspace:1.6.6 .

# 3. 导出镜像
docker save document-workspace:1.6.6 -o document-workspace-1.6.6.tar

# 4. 创建离线包目录
mkdir document-workspace-1.6.6-offline
copy document-workspace-1.6.6.tar document-workspace-1.6.6-offline\
copy docker-compose.yml document-workspace-1.6.6-offline\
copy README.md document-workspace-1.6.6-offline\
xcopy /E /I data document-workspace-1.6.6-offline\data
xcopy /E /I docs document-workspace-1.6.6-offline\docs
xcopy /E /I test document-workspace-1.6.6-offline\test
xcopy /E /I dist document-workspace-1.6.6-offline\dist
copy scripts\install.sh document-workspace-1.6.6-offline\

# 5. 压缩
tar -czvf document-workspace-1.6.6-offline.tar.gz document-workspace-1.6.6-offline
```

### 3.3 打包输出

打包完成后，你会得到一个文件：

```
document-workspace-1.6.6-offline.tar.gz  （约 200-300 MB）
```

---

## 4. 传输到目标服务器

### 4.1 方式一：U盘/移动硬盘

1. 将 `document-workspace-1.6.6-offline.tar.gz` 复制到 U 盘
2. 在目标服务器上挂载 U 盘
3. 复制文件到服务器目录

```bash
# 挂载 U 盘（假设是 /dev/sdb1）
sudo mount /dev/sdb1 /mnt/usb

# 复制文件
cp /mnt/usb/document-workspace-1.6.6-offline.tar.gz /home/user/

# 卸载 U 盘
sudo umount /mnt/usb
```

### 4.2 方式二：SCP/SFTP（如果有临时网络）

```bash
# 从开发机执行
scp document-workspace-1.6.6-offline.tar.gz user@192.168.1.100:/home/user/
```

### 4.3 方式三：光盘刻录

对于高安全环境，可以将文件刻录到光盘传输。

---

## 5. 在目标服务器上安装

### 5.1 一键安装（推荐）

```bash
# 1. 解压离线包
tar -xzvf document-workspace-1.6.6-offline.tar.gz

# 2. 进入目录
cd document-workspace-1.6.6-offline

# 3. 添加执行权限
chmod +x install.sh

# 4. 执行安装
./install.sh
```

安装脚本会自动：
- 检查 Docker 和 Docker Compose
- 导入 Docker 镜像
- 配置目录权限
- 启动服务

### 5.2 手动安装

如果一键安装脚本不可用：

```bash
# 1. 解压
tar -xzvf document-workspace-1.6.6-offline.tar.gz
cd document-workspace-1.6.6-offline

# 2. 导入 Docker 镜像
docker load -i document-workspace-1.6.6.tar

# 3. 验证镜像已导入
docker images | grep document-workspace

# 4. 启动服务
docker-compose up -d

# 5. 查看运行状态
docker-compose ps
```

---

## 6. 验证安装

### 6.1 检查服务状态

```bash
# 查看容器状态
docker-compose ps

# 期望输出：
# NAME                  STATUS    PORTS
# document-workspace    Up        0.0.0.0:4300->4300/tcp
```

### 6.2 查看服务日志

```bash
docker-compose logs -f
```

正常启动日志示例：
```
document-workspace | Server running on http://0.0.0.0:4300
document-workspace | SERVE_DIST=1, serving static files from ./dist
document-workspace | Loaded 5 docs, 3 precipitation records
```

### 6.3 访问应用

打开浏览器，访问：

```
http://<服务器IP>:4300
```

例如：`http://192.168.1.100:4300`

### 6.4 功能验证清单

| 功能 | 验证方法 |
|------|----------|
| 页面加载 | 访问首页，确认页面正常显示 |
| 工作台切换 | 点击"切换后台管理工作台"按钮 |
| 文档上传 | 上传一个 txt 或 docx 文件 |
| 大纲显示 | 在后管界面查看大纲配置 |
| 沉淀列表 | 在沉淀配置中查看预配置的沉淀 |

---

## 7. 配置说明

### 7.1 环境变量

创建 `.env` 文件（可选）：

```bash
cp .env.example .env
nano .env
```

可配置项：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| PORT | 4300 | 服务端口 |
| QWEN_ENDPOINT | (空) | 大模型 API 地址 |
| QWEN_MODEL | qwen-plus | 大模型名称 |
| QWEN_API_KEY | (空) | 大模型 API Key |

### 7.2 端口修改

如果需要修改端口，编辑 `docker-compose.yml`：

```yaml
ports:
  - "8080:4300"  # 将 8080 改为你需要的端口
```

然后重启服务：
```bash
docker-compose down
docker-compose up -d
```

### 7.3 数据持久化

所有数据存储在 `./data` 目录：

| 文件 | 内容 |
|------|------|
| docs.json | 上传的文档 |
| precipitation-records.json | 沉淀记录 |
| button-config.json | 按钮配置 |
| layout-config.json | 布局配置 |
| outline-cache.json | 大纲缓存 |
| scenes-cache.json | 场景缓存 |

**备份数据：**
```bash
tar -czvf data-backup-$(date +%Y%m%d).tar.gz data/
```

---

## 8. 常见问题

### Q1: Docker 镜像导入失败

**错误信息：**
```
Error processing tar file: ...
```

**解决方案：**
1. 确认磁盘空间充足（至少 2GB）
2. 检查文件是否完整传输（对比 MD5）
3. 尝试重新传输文件

### Q2: 端口被占用

**错误信息：**
```
Error starting container: port 4300 already in use
```

**解决方案：**
```bash
# 查看端口占用
netstat -tlnp | grep 4300

# 修改 docker-compose.yml 使用其他端口
ports:
  - "4301:4300"
```

### Q3: 权限不足

**错误信息：**
```
Permission denied
```

**解决方案：**
```bash
# 使用 sudo 运行
sudo docker-compose up -d

# 或将当前用户加入 docker 组
sudo usermod -aG docker $USER
# 然后重新登录
```

### Q4: 页面无法访问

**排查步骤：**
```bash
# 1. 检查容器状态
docker-compose ps

# 2. 查看日志
docker-compose logs

# 3. 检查防火墙
sudo firewall-cmd --list-ports
sudo firewall-cmd --add-port=4300/tcp --permanent
sudo firewall-cmd --reload
```

### Q5: 容器启动后立即退出

**排查步骤：**
```bash
# 查看退出日志
docker-compose logs

# 常见原因：
# - 配置文件格式错误
# - 缺少必要文件
```

---

## 9. 维护指南

### 9.1 日常操作命令

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f

# 查看状态
docker-compose ps

# 进入容器
docker exec -it document-workspace sh
```

### 9.2 更新版本

1. 获取新版本离线包
2. 停止当前服务：`docker-compose down`
3. 备份数据：`cp -r data data-backup`
4. 解压新版本并导入镜像
5. 启动服务：`docker-compose up -d`

### 9.3 日志管理

```bash
# 查看实时日志
docker-compose logs -f

# 查看最近 100 行
docker-compose logs --tail=100

# 导出日志到文件
docker-compose logs > app.log 2>&1
```

### 9.4 性能监控

```bash
# 查看容器资源使用
docker stats document-workspace

# 查看磁盘使用
du -sh data/
```

---

## 附录：文件清单

离线包内容：

```
document-workspace-1.6.6-offline/
├── document-workspace-1.6.6.tar    # Docker 镜像文件
├── docker-compose.yml              # Docker 编排配置
├── install.sh                      # 一键安装脚本
├── .env.example                    # 环境变量模板
├── README.md                       # 项目说明
├── data/                           # 数据目录
│   ├── docs.json                   # 文档数据
│   ├── precipitation-records.json  # 沉淀记录
│   ├── button-config.json          # 按钮配置
│   ├── layout-config.json          # 布局配置
│   └── ...
├── docs/                           # 文档目录
│   ├── PROJECT_REVIEW.md           # 项目总结
│   ├── USER_MANUAL.md              # 用户手册
│   ├── SOP_DEPOSIT_GUIDE.md        # 沉淀指南
│   └── ...
├── test/                           # 测试文档
│   └── 测试文档/                   # 示例文档
└── dist/                           # 前端静态文件（备用）
    ├── index.html
    └── assets/
```

---

**技术支持联系方式：** [请填写]

**文档版本：** 1.6.6  
**最后更新：** 2026-01-24
