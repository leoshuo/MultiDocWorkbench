# 交付报告

Document Workspace 1.6.3 版本交付报告

## 交付日期
2026-01-23

## 交付内容

### 源代码
| 目录/文件 | 说明 |
|----------|------|
| `src/` | 前端 React 源码 |
| `server.js` | 后端主服务 |
| `server_multi.js` | 多文档工作台路由 |
| `server_utils.js` | 服务器工具函数 |
| `package.json` | 项目配置与依赖 |
| `vite.config.js` | Vite 构建配置 |

### 构建产物
| 目录/文件 | 说明 |
|----------|------|
| `dist/` | 前端构建产物 |
| `dist/index.html` | 入口 HTML |
| `dist/assets/` | 静态资源 |

### 配置文件
| 文件 | 说明 |
|------|------|
| `.env` | 环境变量配置（可选） |
| `Dockerfile` | Docker 构建文件 |
| `docker-compose.yml` | Docker Compose 配置 |

### 数据目录
| 文件 | 说明 |
|------|------|
| `data/docs.json` | 文档数据 |
| `data/layout-config.json` | SOP 布局配置 |
| `data/button-config.json` | SOP 按钮配置 |
| `data/multi-layout-config.json` | Multi 布局配置 |
| `data/multi-button-config.json` | Multi 按钮配置 |
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

### 文档
| 文档 | 说明 |
|------|------|
| `README.md` | 项目说明 |
| `docs/USER_MANUAL.md` | 用户手册 |
| `docs/SOP_DEPOSIT_GUIDE.md` | 沉淀指南 |
| `docs/DOCKER_DEPLOY.md` | 部署指南 |
| `docs/PROJECT_REVIEW.md` | 项目总结 |
| `docs/overview/` | 技术概述文档 |
| `docs/quickstart/` | 快速入门文档 |
| `docs/reports/` | 报告文档 |

## 部署要求

### 运行环境
- Node.js 18+（本地开发）
- npm 9+

### 外部依赖
- 千问兼容 AI 服务（可选）

### 端口
| 端口 | 说明 |
|------|------|
| 4300 | 后端 API 服务 / 生产环境前端 |
| 5300 | 前端开发服务 / Vite 预览 |

## 部署步骤

### 开发环境
```bash
npm install
npm run server
npm run dev
```

### 生产环境
```bash
npm install
npm run build
SERVE_DIST=1 npm run server
```

### Docker 环境
```bash
docker build -t document-workspace:1.6.3 .
docker run -d -p 4300:4300 \
  -e QWEN_ENDPOINT="<模型地址>" \
  -e QWEN_API_KEY="<API密钥>" \
  -e SERVE_DIST=1 \
  -v /path/to/data:/app/data \
  document-workspace:1.6.3
```

## 验收项

- [x] 多文档处理工作台正常运行
- [x] 经验沉淀工作台正常运行
- [x] 文档上传与解析正常
- [x] AI 调用正常（或回退逻辑正常）
- [x] 沉淀录制与回放正常
- [x] 布局编辑与持久化正常
- [x] Docker 部署正常

## 联系方式

如有问题，请参考文档或联系开发团队。

