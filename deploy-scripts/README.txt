========================================
Document Workspace 1.6.4 部署包
========================================

【文件说明】

document-workspace-1.6.4.tar  - Docker 镜像文件
start.sh                       - 启动脚本
stop.sh                        - 停止脚本
restart.sh                     - 重启脚本
logs.sh                        - 查看日志
status.sh                      - 检查状态
.env.example                   - 环境配置示例
data/                          - 数据目录（自动创建）

【快速部署】

1. 给脚本添加执行权限：
   chmod +x *.sh

2. 启动服务：
   ./start.sh

3. 访问界面：
   http://服务器IP:4300

【配置千问模型】

1. 复制配置文件：
   cp .env.example .env

2. 编辑 .env，填入模型地址：
   vi .env

3. 重启服务：
   ./restart.sh

【常用命令】

启动：./start.sh
停止：./stop.sh
重启：./restart.sh
日志：./logs.sh
状态：./status.sh

【技术支持】

详细文档见 docs/OFFLINE_LINUX_DEPLOY.md

========================================
