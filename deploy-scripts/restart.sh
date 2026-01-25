#!/bin/bash

# 加载环境变量
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "已加载 .env 配置"
fi

echo "重启 Document Workspace..."

# 停止并删除旧容器
docker stop document-workspace 2>/dev/null
docker rm document-workspace 2>/dev/null

# 启动新容器
docker run -d \
  --name document-workspace \
  --restart unless-stopped \
  -p 4300:4300 \
  -v $(pwd)/data:/app/data \
  -e QWEN_ENDPOINT="${QWEN_ENDPOINT:-}" \
  -e QWEN_MODEL="${QWEN_MODEL:-qwen-plus}" \
  -e QWEN_API_KEY="${QWEN_API_KEY:-}" \
  document-workspace:1.6.4

sleep 2
IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
echo "已重启。"
echo "访问地址：http://${IP}:4300"
