#!/bin/bash

# Document Workspace 1.6.4 启动脚本

echo "=========================================="
echo "  Document Workspace 1.6.4 部署脚本"
echo "=========================================="

# 加载环境变量
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "已加载 .env 配置"
fi

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
    IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
    echo ""
    echo "=========================================="
    echo "  部署成功！"
    echo "=========================================="
    echo ""
    echo "访问地址：http://${IP}:4300"
    echo ""
    echo "如需配置千问模型，请编辑 .env 文件并运行：./restart.sh"
    echo ""
else
    echo "启动失败，请查看日志：docker logs document-workspace"
fi
