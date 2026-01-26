# Document Workspace 1.6.5

> 智能文档处理与经验沉淀平台

文档工作台是一个基于 AI 的文档处理系统，包含两个主要界面：

| 工作台 | 定位 | 主要功能 |
|--------|------|----------|
| **多文档处理工作台** | 前台用户端 | 用户交互界面、收集需求、展示结果 |
| **经验沉淀工作台** | 后端管理端 | 沉淀配置、目录配置、Replay 执行 |

### 架构设计
- **应用端**：只是用户交互界面，点击按钮后调用服务端 API
- **后管端**：配置沉淀集、配置文件目录、管理 Replay 逻辑
- **服务端**：执行 Replay、从配置目录自动加载文件、返回结果

两端数据全局共享：上传文档、沉淀记录、按钮配置、布局调整等都会持久化到 `data/`，切换工作台不会丢失数据。**文档一处上传，两边都生效**。

### v1.6.5 更新亮点
- **应用端与后管端完全一致**：应用端按钮点击直接调用服务端统一 Replay 执行器，结果100%一致
- **摘要位置精准写入**：支持写入指定位置的摘要（summaryIndex），不再始终写入第一个
- **场景与大纲持久化**：切换工作台不丢失大纲数据，服务重启自动恢复
- **大模型语义文档匹配**：LLM 模式支持语义匹配文档名和标题
- **完整离线部署支持**：ZIP 包含预构建 Docker 镜像，一键部署
- **应用端为默认首页**：访问根路径直接显示多文档处理工作台

## 快速开始

### 本地运行

```bash
# 1. 安装依赖
npm install

# 2. 启动后端（默认端口 4300）
npm run server

# 3. 启动前端（默认端口 5300）
npm run dev
```

浏览器访问：`http://localhost:5300/`

### Docker 部署（生产环境）

```bash
# 1. 构建镜像
docker build -t document-workspace:1.6.5 .

# 2. 导出镜像（用于离线环境）
docker save document-workspace:1.6.5 -o document-workspace-1.6.5.tar

# 3. 在目标服务器加载镜像
docker load -i document-workspace-1.6.5.tar

# 4. 运行容器
docker run -d \
  --name document-workspace \
  --restart unless-stopped \
  -p 4300:4300 \
  -v /opt/document-workspace/data:/app/data \
  document-workspace:1.6.5
```

**访问地址**：`http://服务器IP:4300`

> 生产环境只需要 **4300** 端口（包含前端和 API）。  
> 如需配置 AI 模型，添加 `-e QWEN_ENDPOINT="模型地址" -e QWEN_API_KEY="密钥"`。  
> 详细说明见 `docs/DOCKER_DEPLOY.md`。

## 核心功能

### 文档管理
- 支持 `.txt`、`.md`、`.docx` 格式
- 多文件批量上传
- 文档预览与管理

### 大纲抽取
- AI 智能分析文档结构
- 支持 1-5 级层级大纲
- 大纲历史存档与恢复
- **大纲缓存机制**：工作台切换和 Replay 时大纲保持不变

### 经验沉淀
- **Section 记录**：输入来源、动作执行、执行摘要、记录位置、复现方式
- **沉淀集管理**：多条沉淀组合为集合
- **双重 Replay 模式**：
  - 大模型沉淀：允许泛化适应
  - 脚本沉淀：严格精确复现

### 可视化编辑
- 面板拖拽布局
- 按钮样式自定义
- 配置持久化存储

## 技术栈

| 层级 | 技术选型 | 版本 |
|------|---------|------|
| 前端框架 | React | 18.3.1 |
| 构建工具 | Vite | 6.0.5 |
| UI图标 | Lucide React | 0.562.0 |
| 文档解析 | Mammoth | 1.8.0 |
| 后端框架 | Express | 4.19.2 |
| HTTP客户端 | Undici | 7.16.0 |
| AI服务 | 千问兼容接口 | - |

## 项目结构

```
document-workspace/
├── src/                          # 前端源码
│   ├── App.jsx                   # 应用入口（工作台切换）
│   ├── SOPWorkbench.jsx          # 经验沉淀工作台
│   ├── MultiDocWorkbench.jsx     # 多文档处理工作台
│   ├── PanelComponents.jsx       # SOP 面板组件
│   ├── MultiPanelComponents.jsx  # Multi 面板组件
│   ├── EditablePanel.jsx         # 可编辑面板
│   ├── EditableButton.jsx        # 可编辑按钮
│   ├── StyleEditor.jsx           # 样式编辑器
│   └── apiClient.js              # API 客户端
├── server.js                     # 后端主服务
├── server_multi.js               # 多文档工作台路由
├── server_utils.js               # 服务端工具函数
├── data/                         # 数据持久化目录
├── docs/                         # 项目文档
├── dist/                         # 构建输出
├── Dockerfile                    # Docker 构建文件
└── docker-compose.yml            # Docker Compose 配置
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 后端端口 | 4300 |
| `QWEN_ENDPOINT` | 千问/兼容接口地址 | dashscope 官方地址 |
| `QWEN_API_KEY` | 模型调用密钥 | (可选，未配置时AI功能返回模拟数据) |
| `AI_MODEL_NAME` / `QWEN_MODEL` | 模型名称 | qwen-plus |
| `SERVE_DIST` | 是否服务静态文件 | false |

> `QWEN_API_KEY` 还支持命令行 `--api-key=...` 或运行时 `POST /api/config/api-key` 设置；不知道的项可留空，现场变更方式见 `docs/DOCKER_DEPLOY.md`。
> 注意：`.env` 仅用于本地/部署环境，勿提交到 Git；如已泄露请及时更换密钥。

## 核心文档

| 文档 | 说明 |
|------|------|
| **docs/PROJECT_REVIEW.md** | 项目总结与评审（推荐首读） |
| docs/USER_MANUAL.md | 用户操作手册 |
| docs/SOP_DEPOSIT_GUIDE.md | 沉淀与 Replay 指南 |
| docs/DOCKER_DEPLOY.md | 离线部署指南 |
| docs/quickstart/QUICK_REFERENCE.md | 快速参考 |
| docs/overview/SYSTEM_OVERVIEW.md | 系统概览 |
| docs/overview/ARCHITECTURE_DIAGRAM.md | 架构图示 |

## API 概览

### 文档 API
- `GET /api/docs` - 获取文档列表
- `POST /api/docs` - 创建/更新文档
- `DELETE /api/docs/:id` - 删除文档
- `PATCH /api/docs/:id` - 更新文档内容

### 场景与模板 API
- `POST /api/scene` - 创建场景
- `GET/PATCH /api/scene/:id` - 获取/更新场景
- `PATCH /api/scene/:id/section/:sectionId` - 更新章节内容
- `POST /api/scene/:id/section/:sectionId/generate` - 生成章节内容
- `POST /api/scene/:id/section/:sectionId/improve` - 优化章节内容
- `POST /api/scene/:id/apply-template` - 应用模板
- `GET /api/template` - 获取默认模板
- `POST /api/template/auto` - AI 大纲抽取
- `POST /api/dispatch` - 执行指令调度
- `POST /api/prompt/optimize` - 提示词优化
- `POST /api/replay/file-selector` - 生成文件匹配规则
- `POST /api/final/generate` - 生成最终文档

### 布局与配置 API
- `GET/POST /api/layout` - SOP 布局配置
- `GET/POST /api/buttons` - SOP 按钮配置
- `GET /api/config/all` - 获取全部配置
- `POST /api/config/save` - 保存配置
- `GET /api/config/status` - 获取 AI 配置状态
- `POST /api/config/api-key` - 运行时设置 API Key

### 多文档工作台 API
- `/api/multi/layout` - 布局配置
- `/api/multi/buttons` - 按钮配置
- `/api/multi/panels` - 面板可见性
- `/api/multi/app-buttons` - 应用端按钮
- `/api/multi/precipitation/records` - 沉淀记录
- `/api/multi/precipitation/groups` - 沉淀集
- `/api/multi/outlines` - 大纲历史

### Replay 执行 API（核心）
- `GET /api/multi/replay/config` - 获取 Replay 目录配置
- `POST /api/multi/replay/config` - 保存 Replay 目录配置
- `POST /api/multi/replay/execute` - **执行沉淀集 Replay**（服务端自动加载文件）

### 缓存与 AI API
- `GET /api/outline/cache` - 获取缓存大纲
- `POST /api/outline/cache` - 更新缓存大纲
- `DELETE /api/outline/cache` - 清空缓存大纲
- `GET/POST /api/chat/cache` - 对话缓存
- `GET/POST /api/dispatch/logs/cache` - 操作日志缓存
- `GET/POST /api/deposit/state/cache` - 沉淀录制状态缓存
- `POST /api/ai/chat` - 通用 AI 对话
- `POST /api/ai/replay-analyze` - Replay 意图分析

## 数据持久化

所有数据存储在 `data/` 目录：

| 文件 | 说明 |
|------|------|
| docs.json | 文档数据 |
| layout-config.json | SOP 布局配置 |
| button-config.json | SOP 按钮配置 |
| multi-layout-config.json | Multi 布局配置 |
| multi-button-config.json | Multi 按钮配置 |
| multi-panel-visibility.json | Multi 面板可见性 |
| multi-app-buttons.json | 应用端按钮配置 |
| precipitation-records.json | 沉淀记录 |
| precipitation-groups.json | 沉淀集 |
| outline-history.json | 大纲历史 |
| replay-config.json | Replay 目录配置 |
| content-blocks.json | 内容块配置 |
| deleted-blocks.json | 已删除内容块 |
| global-buttons.json | 全局按钮配置 |
| header-titles.json | 标题配置 |
| layout-size.json | 布局尺寸 |
| llm-buttons.json | LLM 按钮配置 |

## 许可证

私有项目

---

*Document Workspace 1.6.5 - 智能文档处理与经验沉淀平台*

