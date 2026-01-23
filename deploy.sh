#!/bin/bash

set -e

echo "=========================================="
echo " Document Workspace v1.6.1 离线部署脚本"
echo "=========================================="

IMAGE_FILE="document-workspace-1.6.1.tar"
DEPLOY_DIR="/opt/document-workspace"

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "[错误] Docker 未安装，请先安装 Docker"
    exit 1
fi

echo "[1/5] 检查镜像文件..."
if [ -f "document-workspace-1.6.1.tar.gz" ]; then
    echo "      解压镜像文件..."
    gunzip document-workspace-1.6.1.tar.gz
fi

if [ ! -f "$IMAGE_FILE" ]; then
    echo "[错误] 未找到镜像文件: $IMAGE_FILE"
    exit 1
fi

echo "[2/5] 加载 Docker 镜像..."
docker load -i $IMAGE_FILE

echo "[3/5] 创建部署目录..."
sudo mkdir -p $DEPLOY_DIR
cd $DEPLOY_DIR

# 复制配置文件
if [ -f "$OLDPWD/docker-compose.yml" ]; then
    cp $OLDPWD/docker-compose.yml .
fi

# 创建数据目录
mkdir -p data
sudo chown -R 1000:1000 data

echo "[4/5] 启动服务..."
docker-compose up -d

echo "[5/5] 等待服务启动..."
sleep 5

echo ""
echo "=========================================="
if curl -s http://localhost:4300/api/docs > /dev/null 2>&1; then
    echo " ✅ 部署成功!"
    echo ""
    echo " 访问地址: http://localhost:4300"
    IP=$(hostname -I | awk '{print $1}')
    echo " 或: http://$IP:4300"
else
    echo " ⏳ 服务启动中，请稍后访问"
    echo " 地址: http://localhost:4300"
fi
echo "=========================================="
