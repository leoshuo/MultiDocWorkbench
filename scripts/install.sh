#!/bin/bash
# ============================================================
# Document Workspace 1.6.5 Linux 离线安装脚本
# ============================================================
# 用途：在离线 Linux 服务器上安装 Document Workspace
# 前提：目标服务器已安装 Docker 和 Docker Compose
# ============================================================

set -e

VERSION="1.6.5"
IMAGE_NAME="document-workspace"
IMAGE_FILE="document-workspace-${VERSION}.tar"

echo "============================================"
echo "  Document Workspace ${VERSION} 离线安装"
echo "============================================"

# 检查 Docker
echo ""
echo "[1/5] 检查 Docker..."
if ! command -v docker &> /dev/null; then
    echo "错误: Docker 未安装"
    echo "请先安装 Docker: https://docs.docker.com/engine/install/"
    exit 1
fi
docker --version
echo "Docker 检查通过 ✓"

# 检查 Docker Compose
echo ""
echo "[2/5] 检查 Docker Compose..."
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    echo "错误: Docker Compose 未安装"
    echo "请先安装 Docker Compose"
    exit 1
fi
echo "Docker Compose 检查通过 ✓ (使用: $COMPOSE_CMD)"

# 检查镜像文件
echo ""
echo "[3/5] 检查镜像文件..."
if [ ! -f "$IMAGE_FILE" ]; then
    echo "错误: 镜像文件 $IMAGE_FILE 不存在"
    exit 1
fi
echo "镜像文件存在 ✓"

# 导入 Docker 镜像
echo ""
echo "[4/5] 导入 Docker 镜像 (可能需要几分钟)..."
docker load -i "$IMAGE_FILE"
echo "镜像导入完成 ✓"

# 创建 .env 文件（如果不存在）
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "已创建 .env 配置文件"
    fi
fi

# 设置目录权限
echo ""
echo "[5/5] 设置目录权限..."
chmod -R 755 data 2>/dev/null || true
chmod -R 755 test 2>/dev/null || true

# 启动服务
echo ""
echo "============================================"
echo "  启动服务"
echo "============================================"
echo ""
echo "正在启动 Document Workspace..."
$COMPOSE_CMD up -d

# 等待服务启动
echo ""
echo "等待服务启动..."
sleep 5

# 检查服务状态
echo ""
echo "============================================"
echo "  安装完成!"
echo "============================================"
echo ""

# 获取服务器 IP
SERVER_IP=$(hostname -I | awk '{print $1}')

echo "服务状态:"
$COMPOSE_CMD ps
echo ""
echo "访问地址: http://${SERVER_IP}:4300"
echo ""
echo "常用命令:"
echo "  查看日志: $COMPOSE_CMD logs -f"
echo "  停止服务: $COMPOSE_CMD down"
echo "  重启服务: $COMPOSE_CMD restart"
echo "  查看状态: $COMPOSE_CMD ps"
echo ""
echo "数据目录: ./data (所有配置和沉淀记录)"
echo "测试文档: ./test (示例测试文档)"
echo ""
