# 项目索引

Document Workspace 1.6.3 项目文件与文档索引

## 快速入口

### 本地开发
```bash
npm install          # 安装依赖
npm run server       # 启动后端 (4300)
npm run dev          # 启动前端 (5300)
```
访问：`http://localhost:5300`

### Docker 生产部署
```bash
docker build -t document-workspace:1.6.3 .                    # 构建镜像
docker save document-workspace:1.6.3 -o dw-1.6.3.tar         # 导出（离线用）
docker load -i dw-1.6.3.tar                                   # 加载镜像
docker run -d --name dw -p 4300:4300 document-workspace:1.6.3 # 启动
```
访问：`http://服务器IP:4300`（生产环境只需 4300 端口）

### 工作台入口
- **多文档处理工作台**：默认首页（应用端）
- **经验沉淀工作台**：点击右上角「切换后台管理工作台」进入（后管端）

## 核心文档

| 文档 | 说明 |
|------|------|
| `docs/USER_MANUAL.md` | 完整用户手册 |
| `docs/SOP_DEPOSIT_GUIDE.md` | 沉淀与 Replay 指南 |
| `docs/DOCKER_DEPLOY.md` | 离线部署指南 |
| `docs/quickstart/QUICK_REFERENCE.md` | 快速参考 |
| `docs/PROJECT_REVIEW.md` | 项目总结 |

## 技术文档

| 文档 | 说明 |
|------|------|
| `docs/overview/SYSTEM_OVERVIEW.md` | 系统概述 |
| `docs/overview/ARCHITECTURE_DIAGRAM.md` | 架构图示 |
| `README.md` | 项目说明 |

## API 端点概览

### 文档管理
| 端点 | 说明 |
|------|------|
| `GET /api/docs` | 获取文档列表 |
| `POST /api/docs` | 创建/更新文档 |
| `DELETE /api/docs/:id` | 删除文档 |
| `PATCH /api/docs/:id` | 更新文档内容 |

### 经验沉淀工作台
| 端点 | 说明 |
|------|------|
| `/api/layout` | 布局配置 |
| `/api/buttons` | 按钮配置 |
| `/api/scene` | 场景管理 |
| `/api/scene/:id/section/:sectionId` | 章节内容更新 |
| `/api/scene/:id/section/:sectionId/generate` | 章节生成 |
| `/api/scene/:id/section/:sectionId/improve` | 章节优化 |
| `/api/scene/:id/apply-template` | 应用模板 |
| `/api/template` | 默认模板 |
| `/api/template/auto` | AI 大纲抽取 |
| `/api/dispatch` | 指令调度 |
| `/api/prompt/optimize` | 提示词优化 |
| `/api/replay/file-selector` | 文件匹配规则 |
| `/api/final/generate` | 最终文档生成 |
| `/api/config/*` | 配置管理 |
| `/api/outline/cache` | 大纲缓存 |
| `/api/ai/chat` | 通用对话 |
| `/api/ai/replay-analyze` | Replay 意图分析 |

### 多文档工作台
| 端点 | 说明 |
|------|------|
| `/api/multi/layout` | 布局配置 |
| `/api/multi/buttons` | 按钮配置 |
| `/api/multi/panels` | 面板可见性 |
| `/api/multi/app-buttons` | 应用端按钮 |
| `/api/multi/precipitation/*` | 沉淀管理 |
| `/api/multi/outlines` | 大纲历史 |
| `/api/multi/button-logic` | 按钮逻辑 |
| `/api/multi/replay/*` | Replay 执行与目录配置 |

## 环境配置

`.env` 文件支持:
| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 后端端口 | 4300 |
| `QWEN_ENDPOINT` | 千问 API 地址 | - |
| `QWEN_API_KEY` | API 密钥 | (可选) |
| `QWEN_MODEL` / `AI_MODEL_NAME` | 模型名称 | qwen-plus |
| `SERVE_DIST` | 服务静态文件 | false |

> `QWEN_API_KEY` 也支持命令行 `--api-key=...` 或运行时 `POST /api/config/api-key` 设置。

## 项目结构

```
├── src/                    # 前端源码
│   ├── App.jsx            # 主入口
│   ├── SOPWorkbench.jsx   # 经验沉淀工作台
│   ├── MultiDocWorkbench.jsx # 多文档工作台
│   ├── PanelComponents.jsx   # SOP 面板组件
│   ├── MultiPanelComponents.jsx # Multi 面板组件
│   └── ...
├── server.js              # 主服务器
├── server_multi.js        # 多文档路由
├── data/                  # 数据持久化
├── docs/                  # 文档
└── dist/                  # 构建产物
```

## 数据文件

| 文件 | 说明 |
|------|------|
| `data/docs.json` | 文档数据 |
| `data/layout-config.json` | SOP 布局 |
| `data/button-config.json` | SOP 按钮 |
| `data/multi-layout-config.json` | Multi 布局 |
| `data/multi-button-config.json` | Multi 按钮 |
| `data/multi-panel-visibility.json` | 面板可见性 |
| `data/multi-app-buttons.json` | 应用端按钮 |
| `data/precipitation-records.json` | 沉淀记录 |
| `data/precipitation-groups.json` | 沉淀集 |
| `data/outline-history.json` | 大纲历史 |
| `data/replay-config.json` | Replay 目录配置 |
| `data/content-blocks.json` | 内容块配置 |
| `data/deleted-blocks.json` | 已删除内容块 |
| `data/global-buttons.json` | 全局按钮 |
| `data/header-titles.json` | 标题配置 |
| `data/layout-size.json` | 布局尺寸 |
| `data/llm-buttons.json` | LLM 按钮配置 |

