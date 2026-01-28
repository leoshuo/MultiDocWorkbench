# CLAUDE.md — AI 助手开发指南

本文档为 AI 助手（如 Claude）提供关于 **Document Workspace（文档工作台）** 项目的完整开发指南。

---

## 项目概述

**Document Workspace** 是一个 AI 驱动的文档处理与经验沉淀平台，核心理念是"记住你处理文档的方式，自动帮你完成类似任务"。

- **版本**: 1.6.5
- **类型**: 全栈单体应用（前后端同仓库）
- **模块系统**: ES Modules (`"type": "module"`)
- **语言**: 中文界面，代码注释中英混合

### 核心功能

1. **智能大纲提取** — AI 分析文档结构，生成 1-5 级层级大纲
2. **经验沉淀（Precipitation）** — 记录文档处理操作步骤，形成可复用的 SOP
3. **一键回放（Replay）** — 自动执行已沉淀的文档处理流程，支持 LLM 和脚本两种模式
4. **双工作台设计** — 多文档处理工作台（用户端）+ 经验沉淀工作台（管理端）

---

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React | 18.3.1 |
| 构建工具 | Vite | 6.0.5 |
| 后端框架 | Express | 4.19.2 |
| 运行时 | Node.js | 20 (Alpine) |
| HTTP 客户端 | undici | 7.16.0 |
| 图标库 | lucide-react | 0.562.0 |
| 文档解析 | mammoth (DOCX), jspdf (PDF), docx (DOCX 生成) | — |
| AI 模型 | 通义千问 (Qwen) / OpenAI 兼容接口 | — |
| 部署 | Docker (多阶段构建) | — |
| 数据存储 | 文件系统 JSON 持久化 | — |

---

## 项目结构

```
MultiDocWorkbench/
├── server.js                  # 主后端服务（Express，端口 4300）
├── server_multi.js            # 多文档工作台专用路由
├── server_utils.js            # 后端工具函数（AI 调用、文件 I/O、日志）
├── update-handler.js          # 更新处理逻辑
├── vite.config.js             # Vite 配置（开发端口 5300，API 代理到 4300）
├── package.json               # 依赖和脚本
├── Dockerfile                 # Docker 多阶段构建
├── docker-compose.yml         # Docker Compose 编排
├── postcss.config.js          # PostCSS 配置（空）
├── .env                       # 环境变量（不入库）
│
├── src/                       # 前端源码
│   ├── main.jsx               # React 入口
│   ├── App.jsx                # 应用根组件（工作台切换器）
│   ├── MultiDocWorkbench.jsx  # 多文档处理工作台（~5500 行）
│   ├── SOPWorkbench.jsx       # 经验沉淀工作台（~22800 行，最大组件）
│   │
│   ├── multi/                 # 多文档工作台模块
│   │   ├── MultiConstants.js  #   常量、面板配置
│   │   └── MultiUtils.js     #   工具函数（fetch、文件解析）
│   │
│   ├── sop/                   # SOP 工作台模块
│   │   ├── SOPConstants.js    #   常量、存储键名
│   │   ├── SOPUtils.js        #   工具函数（~16850 行）
│   │   ├── SOPHistory.jsx     #   历史/撤销管理
│   │   ├── SOPModals.jsx      #   模态框组件
│   │   ├── SOPToolbar.jsx     #   工具栏
│   │   ├── hooks/             #   自定义 Hook
│   │   │   ├── useAsync.js    #     异步操作状态管理
│   │   │   ├── useToast.js    #     Toast 通知
│   │   │   └── useLocalStorage.js # localStorage 同步
│   │   ├── modals/            #   模态框组件
│   │   ├── panels/            #   面板组件
│   │   │   ├── AppButtonsConfigPanel.jsx
│   │   │   ├── GlobalButtonsConfigPanel.jsx
│   │   │   ├── DepositPanels.jsx
│   │   │   └── OutlineNode.jsx
│   │   ├── replay/            #   回放引擎
│   │   │   ├── replayEngine.js #    核心引擎（插件化执行器 + Hook 系统）
│   │   │   ├── replayContext.js
│   │   │   └── replayConfig.js
│   │   ├── utils/             #   安全操作工具
│   │   │   ├── safeOps.js     #     空安全、类型转换
│   │   │   └── throttle.js    #     节流/防抖
│   │   └── validators/        #   状态校验
│   │       └── stateValidators.js
│   │
│   ├── shared/                # 共享组件
│   │   └── ErrorBoundary.jsx  #   错误边界 + HOC
│   │
│   ├── PanelComponents.jsx    # SOP 面板内容组件
│   ├── MultiPanelComponents.jsx # 多文档面板组件
│   ├── EditablePanel.jsx      # 可编辑面板容器
│   ├── EditableButton.jsx     # 可编辑按钮（6 种类型样式）
│   ├── EditableContentBlock.jsx # 可编辑内容块
│   ├── DraggablePanel.jsx     # 可拖拽/缩放面板
│   ├── GlobalButton.jsx       # 全局按钮
│   ├── RecycleBin.jsx         # 回收站
│   ├── DocumentPreviewModal.jsx # 文档预览模态框
│   ├── StyleEditor.jsx        # 样式编辑器
│   ├── ButtonLogicEditor.jsx  # 按钮逻辑编辑器
│   ├── PrecipitationPanel.jsx # 沉淀面板
│   │
│   ├── appState.js            # 状态管理（useReducer 模式）
│   ├── apiClient.js           # API 客户端（重试、超时、并发控制）
│   ├── config.js              # API 配置和端点映射
│   ├── security.js            # 安全工具（XSS 防护、输入校验、URL 消毒）
│   ├── layoutManager.js       # 布局模式管理
│   ├── layoutEditor.js        # 布局配置持久化
│   ├── buttonManager.js       # 按钮配置管理
│   │
│   ├── style.css              # 主样式（CSS 变量设计系统）
│   ├── draggable-panel.css    # 拖拽面板样式
│   └── fonts.css              # 字体定义（中文字体优先）
│
├── data/                      # 持久化数据目录（JSON 文件）
│   ├── docs.json              #   文档数据
│   ├── scenes-cache.json      #   场景缓存
│   ├── layout-config.json     #   SOP 布局配置
│   ├── button-config.json     #   SOP 按钮配置
│   ├── multi-layout-config.json #  多文档布局配置
│   ├── multi-button-config.json #  多文档按钮配置
│   ├── precipitation-records.json # 沉淀记录
│   ├── precipitation-groups.json #  沉淀分组
│   ├── outline-cache.json     #   大纲缓存
│   ├── outline-history.json   #   大纲历史
│   ├── replay-config.json     #   回放配置
│   ├── global-buttons.json    #   全局按钮配置
│   ├── llm-buttons.json       #   LLM 按钮配置
│   ├── content-blocks.json    #   内容块配置
│   └── ...                    #   其他配置文件
│
├── docs/                      # 项目文档（55+ 个 Markdown 文件）
│   ├── PROJECT_REVIEW.md      #   项目综述（推荐入口）
│   ├── USER_MANUAL.md         #   用户操作手册
│   ├── SOP_DEPOSIT_GUIDE.md   #   沉淀与回放指南
│   ├── DOCKER_DEPLOY.md       #   Docker 部署指南
│   ├── PRODUCT_INTRODUCTION.md #  产品介绍
│   ├── overview/              #   系统架构文档
│   ├── quickstart/            #   快速参考
│   ├── persistence/           #   持久化文档
│   ├── guides/                #   迁移和实施指南
│   └── reports/               #   阶段报告
│
├── deploy-scripts/            # 部署脚本（start/stop/restart/status/logs）
├── scripts/                   # 构建和安装脚本
├── tools/                     # Python 工具脚本
├── test/                      # 测试文档（用于演示）
└── dist/                      # 前端构建产物
```

---

## 常用命令

### 开发环境

```bash
# 安装依赖
npm install

# 启动后端服务（端口 4300）
npm run server

# 启动前端开发服务器（端口 5300，自动代理 API 到 4300）
npm run dev

# 构建前端生产版本
npm run build

# 预览构建产物
npm run preview
```

### Docker 部署

```bash
# 构建镜像
docker build -t document-workspace:1.6.5 .

# 使用 Docker Compose 启动
docker-compose up -d

# 或直接运行
docker run -d --name document-workspace \
  -p 4300:4300 \
  -v ./data:/app/data \
  -e QWEN_API_KEY="your_key" \
  document-workspace:1.6.5
```

### 注意事项

- **没有测试框架**：项目未配置 Jest 或其他测试工具，无 `npm test` 命令
- **没有 Lint 工具**：未配置 ESLint 或 Prettier
- **没有 CI/CD**：无自动化流水线

---

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `PORT` | 后端服务端口 | `4300` |
| `SERVE_DIST` | 是否由后端提供前端静态文件 | `false`（开发）/ `1`（Docker） |
| `QWEN_API_KEY` | 通义千问 API 密钥 | — |
| `QWEN_MODEL` | 使用的模型名称 | `qwen-plus` |
| `QWEN_ENDPOINT` | AI 接口地址 | `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions` |
| `AI_MODEL_NAME` | 替代模型指定 | — |
| `NODE_ENV` | 运行环境 | — |
| `DEBUG` | 启用调试日志 | — |

API 密钥支持 5 种配置方式（优先级从高到低）：
1. 命令行参数：`node server.js --api-key=xxx`
2. `.env` 文件
3. 环境变量
4. 运行时 API：`POST /api/config/api-key`
5. 启动时交互输入（TTY）

---

## 架构设计

### 双工作台架构

```
App.jsx（工作台切换器，useState 控制）
├── MultiDocWorkbench（多文档处理工作台 — 用户端）
│   ├── SourcesPanel（文档源面板）
│   ├── ChatPanel（对话面板）
│   └── StudioPanel（编辑面板）
└── SOPWorkbench（经验沉淀工作台 — 管理端）
    ├── 面板系统（可拖拽、可编辑）
    ├── 大纲树（OutlineNode）
    ├── 沉淀记录管理
    └── 回放引擎
```

**路由**：无 react-router，通过 `activeWorkbench` state 切换（`'multi'` / `'sop'`）。

### 状态管理

采用 **useReducer 模式**（类 Redux，未使用 Redux 库），定义在 `src/appState.js`：

```javascript
{
  data: { template, docs, scene, deposits },    // 核心数据
  ui: { loading, dispatching, finalizing, toast }, // UI 状态
  editing: { selectedDocId, docDraft, ... },     // 编辑状态
  replay: { dirHandle, dirName, running, ... },  // 回放状态
  outline: { selectedOutlineExec, ... },         // 大纲状态
  llmConfig: { llmButtons, dispatchLogs, ... },  // LLM 配置
  preview: { selection, hasSelection },          // 预览状态
  misc: { depositSeq, selectedDepositIds, ... }  // 杂项
}
```

30+ 个 Action Types，通过 `useAppState()` Hook 提供便捷访问。

### 数据持久化

- **后端**：JSON 文件存储在 `/data/` 目录，通过 `readJsonFile()` / `writeJsonFile()` 操作
- **前端**：localStorage 存储面板位置和布局配置，IndexedDB (`idbGet`/`idbSet`) 存储较大数据
- **无数据库**：不使用 MySQL/PostgreSQL/MongoDB 等数据库

### API 架构

- **主路由**（`server.js`）：文档管理、场景管理、模板、AI 调用、缓存、配置
- **多文档路由**（`server_multi.js`）：挂载在 `/api/multi/`，处理布局、按钮、沉淀记录、回放
- **请求限制**：JSON body 最大 12MB
- **CORS**：已启用

### AI 集成

- 通过 `callAI()` 函数统一调用（`server_utils.js`）
- 支持 OpenAI 兼容接口（DashScope / 本地部署）
- **降级策略**：无 API 密钥时返回 mock 数据或使用简单关键词匹配
- **超时**：120 秒，**重试**：3 次，指数退避

---

## 主要 API 端点

### 文档管理
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/docs` | 创建/更新文档（去重） |
| GET | `/api/docs` | 获取文档列表 |
| DELETE | `/api/docs/:id` | 删除文档 |
| PATCH | `/api/docs/:id` | 更新文档内容 |

### 场景和模板
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/scene` | 创建场景 |
| GET | `/api/scene/:id` | 获取场景 |
| PATCH | `/api/scene/:id` | 更新场景 |
| POST | `/api/template/auto` | AI 自动生成大纲模板 |

### AI 功能
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/ai/chat` | AI 对话 |
| POST | `/api/ai/replay-analyze` | 回放意图分析 |
| POST | `/api/prompt/optimize` | Prompt 优化 |
| POST | `/api/dispatch` | 内容分发 |
| POST | `/api/final/generate` | 生成最终文档 |

### 多文档工作台（`/api/multi/`）
| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | `/api/multi/layout` | 布局配置 |
| GET/POST | `/api/multi/buttons` | 按钮配置 |
| GET/POST | `/api/multi/panels` | 面板可见性 |
| CRUD | `/api/multi/precipitation/records` | 沉淀记录 |
| CRUD | `/api/multi/precipitation/groups` | 沉淀分组 |
| CRUD | `/api/multi/outlines` | 大纲管理 |
| POST | `/api/multi/replay/execute` | 执行回放 |
| GET/POST | `/api/multi/replay/config` | 回放目录配置 |

### 配置管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/config/all` | 加载所有配置文件 |
| POST | `/api/config/save` | 批量保存配置 |
| GET | `/api/config/status` | 系统状态 |
| POST | `/api/config/api-key` | 运行时设置 API 密钥 |

---

## 代码规范与约定

### 前端规范

1. **组件文件**：使用 PascalCase 命名（如 `EditablePanel.jsx`）
2. **工具文件**：使用 camelCase 命名（如 `apiClient.js`）
3. **常量文件**：以模块名开头 + Constants（如 `SOPConstants.js`、`MultiConstants.js`）
4. **CSS**：使用 CSS 变量设计系统（定义在 `style.css` 的 `:root` 中），不使用 CSS-in-JS 或 Tailwind
5. **图标**：统一使用 `lucide-react`
6. **字体**：中文字体优先（Noto Sans SC → PingFang SC → Microsoft YaHei）
7. **状态管理**：全局状态用 `useReducer`（`appState.js`），局部状态用 `useState`
8. **错误处理**：使用 `ErrorBoundary` 组件包裹关键区域

### 后端规范

1. **路由组织**：主路由在 `server.js`，多文档专用路由在 `server_multi.js`
2. **错误响应**：HTTP 400（校验失败）、404（资源不存在）、500（内部错误），错误信息为中文
3. **输入校验**：文档名最长 255 字符，内容最大 10MB，文档上限 1000 个
4. **日志**：使用 `logger.info()` / `logger.error()` / `logger.debug()`（带时间戳）
5. **AI 调用**：统一通过 `callAI()` 或 `fetchWithRetry()` 并附带超时和重试
6. **数据文件**：存放在 `data/` 目录，JSON 格式

### 安全规范

- `security.js` 提供 XSS 防护（`escapeHtml`、`setSafeText`、`setSafeAttribute`）
- 输入校验（`validateInput.docName`、`validateInput.docContent` 等）
- JSON 消毒（移除 `__proto__`、`constructor`、`prototype`）
- URL 消毒（阻止 `javascript:`、`data:`、`vbscript:` 协议）
- 后端全局异常捕获：`unhandledRejection` 和 `uncaughtException`
- **无认证/授权**：系统设计为内网/可信环境部署，无用户登录和权限管理

---

## 关键设计模式

| 模式 | 使用位置 | 说明 |
|------|----------|------|
| Reducer 模式 | `appState.js` | 类 Redux 状态管理 |
| 自定义 Hook | `sop/hooks/` | `useAsync`、`useToast`、`useLocalStorage` |
| 高阶函数 | `apiClient.js` | `withRetry`、`withTimeout`、`withLoadingState` |
| 工厂/插件模式 | `replayEngine.js` | 可插拔执行器 + Hook 系统 |
| 错误边界 | `ErrorBoundary.jsx` | React 错误捕获 + HOC 包装器 |
| 安全操作 | `safeOps.js` | `safeGet`、`safeArray`、`safeJsonParse` 等空安全工具 |
| LRU 缓存 | `security.js` | `createLRUCache` 用于前端缓存 |
| 指数退避重试 | `apiClient.js`、`server_utils.js` | 网络请求自动重试 |

---

## 开发注意事项

### 启动开发环境

需要同时运行前端和后端两个进程：
```bash
# 终端 1：后端
npm run server

# 终端 2：前端（Vite 开发服务器会代理 /api 到后端）
npm run dev
```

浏览器访问 `http://localhost:5300`

### 修改后端代码

- 修改 `server.js`、`server_multi.js` 或 `server_utils.js` 后需重启后端进程
- 后端无热重载（未配置 nodemon）

### 修改前端代码

- Vite 提供 HMR（热模块替换），保存文件后自动更新
- 注意 `SOPWorkbench.jsx`（~22800 行）和 `SOPUtils.js`（~16850 行）是超大文件，修改时注意定位

### 数据文件

- `data/` 目录下的 JSON 文件是运行时数据，修改需谨慎
- Docker 部署时通过 volume 挂载持久化
- 重启服务不会丢失数据（从文件加载）

### 构建生产版本

```bash
npm run build          # 构建前端到 dist/
SERVE_DIST=1 npm run server  # 后端同时提供前端静态文件
```

生产环境仅需端口 4300，后端同时负责 API 和静态文件服务。

---

## 后端常量配置

```javascript
MAX_DOCS = 1000              // 最大文档数量
MAX_SCENES = 500             // 最大场景数量
MAX_DOC_NAME_LENGTH = 255    // 文档名最大长度
MAX_CONTENT_SIZE = 10MB      // 内容最大体积
MAX_SCENE_AGE = 24 hours     // 场景最大存活时间
API_TIMEOUT = 120000         // AI API 超时（120 秒）
API_RETRY_TIMES = 3          // AI API 重试次数
API_RETRY_DELAY = 1000       // 重试初始延迟（指数退避）
```

---

## 前端 CSS 变量（设计系统）

```css
--surface-bg        /* 页面背景（渐变色） */
--card-bg           /* 卡片背景（白色） */
--primary-accent    /* 主强调色 #1a73e8 */
--secondary-accent  /* 辅助强调色 #e8f0fe */
--text-primary      /* 主文字色 #202124 */
--text-secondary    /* 辅助文字色 #5f6368 */
--success-color     /* 成功色 #1e8e3e */
--warning-color     /* 警告色 #e37400 */
--border-light      /* 边框色 #dadce0 */
--radius-lg/md/sm   /* 圆角 20px/16px/12px */
--shadow-sm/hover/float /* 阴影层级 */
```

---

## 文件大小参考

| 文件 | 大小 | 说明 |
|------|------|------|
| `SOPWorkbench.jsx` | ~609 KB | 最大前端组件，经验沉淀工作台全部逻辑 |
| `SOPUtils.js` | ~16850 行 | SOP 工具函数集 |
| `MultiDocWorkbench.jsx` | ~150 KB | 多文档工作台主组件 |
| `server.js` | ~137 KB | 主后端服务 |
| `server_multi.js` | ~60 KB | 多文档路由 |
| `StyleEditor.jsx` | ~29 KB | 样式编辑器 |
| `PanelComponents.jsx` | ~21 KB | 面板组件库 |

编辑大文件时建议精确定位行号，避免全量读取。

---

## 已知限制

- **无测试框架**：未配置 Jest 或其他测试工具
- **无 Lint/Format 工具**：未配置 ESLint 或 Prettier
- **无 CI/CD**：无自动化流水线
- **无认证授权**：适用于内网或可信环境
- **文件存储**：JSON 文件持久化，不适合高并发场景
- **大组件**：SOPWorkbench.jsx 和 SOPUtils.js 为超大单文件，需注意可维护性
- **错误信息**：后端错误信息为硬编码中文，不支持国际化
