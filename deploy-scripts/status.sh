#!/bin/bash
echo "=========================================="
echo "  Document Workspace 状态检查"
echo "=========================================="

# 检查容器状态
if docker ps | grep -q "document-workspace"; then
    echo "✓ 容器运行中"
    echo ""
    docker ps --filter "name=document-workspace" --format "table {{.Status}}\t{{.Ports}}"
else
    echo "✗ 容器未运行"
    echo ""
    if docker ps -a | grep -q "document-workspace"; then
        echo "容器存在但已停止，运行 ./start.sh 启动"
    else
        echo "容器不存在，运行 ./start.sh 创建并启动"
    fi
    exit 1
fi

echo ""

# 检查 API 状态
echo "检查 API 状态..."
if curl -s --max-time 5 http://localhost:4300/api/docs > /dev/null; then
    echo "✓ API 正常响应"
else
    echo "✗ API 无响应"
fi

echo ""

# 检查 AI 配置
echo "AI 配置状态："
curl -s http://localhost:4300/api/config/status 2>/dev/null || echo "无法获取"

echo ""
echo "=========================================="
IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
echo "访问地址：http://${IP}:4300"
echo "=========================================="
