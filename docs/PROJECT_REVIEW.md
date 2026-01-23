# Document Workspace 1.6.3 项目总结与评审文档

> 版本: 1.6.3  
> 更新日期: 2026-01-22  
> 文档类型: 项目Review文档

## v1.6.3 更新摘要（最新）

### 核心修复
- **修复 dispatch API 响应处理 Bug**: 应用端原来检查 `dispatchRes?.result`，但 API 返回的是 `{ summary, detail, edits, usedModel }`，导致 edits 从未被应用。现已正确处理 API 响应格式。
- **修复 insert_to_summary 输入获取逻辑**: 对于"扩写摘要"类操作，现在会从当前大纲获取目标标题的摘要作为输入，而不是只使用沉淀记录中的 inputs。
- **统一应用端与后管端 Replay 逻辑**: 确保所有按钮的 Replay 行为完全一致。

### 代码优化
- **删除冗余代码约1000行**: 删除未使用的 `executeLLMStep` 函数（约260行）、被禁用的 AI 智能 Replay 代码块（约400行）、大量多余空行
- **统一目标标题定位**: 支持 `targetIds` 和 `targetTitles` 双重匹配
- **清理代码风格**: 为各个 metaType 分支添加清晰的注释标记

### 技术改进
- dispatch 分支正确检查 `usedModel` 字段判断大模型是否使用
- insert_to_summary 分支支持从当前大纲动态获取输入内容
- 统一的 `resolveEditId` 逻辑支持 "ID=xxx" 格式和纯数字索引

---

## 一、项目背景

### 1.1 项目定位

Document Workspace 是一个基于 AI 的智能文档处理与经验沉淀平台，旨在帮助用户高效处理多类型文档，并将操作流程沉淀为可复现的自动化流程。

### 1.2 目标用户

| 用户类型 | 使用场景 |
|---------|---------|
| 普通用户 | 使用多文档处理工作台进行日常文档处理与AI对话 |
| 管理人员 | 使用经验沉淀工作台配置沉淀流程与按钮逻辑 |
| 运维人员 | 负责系统部署与维护 |

### 1.3 核心价值

1. **智能文档处理**: 支持多格式文档上传、AI辅助分析与内容提取
2. **经验沉淀**: 将人工操作流程录制为可复现的自动化脚本
3. **灵活配置**: 可视化布局编辑，按钮逻辑自定义
4. **离线部署**: 支持内网环境，可对接本地大模型

---

## 二、系统概览

### 2.1 双工作台设计

系统采用双工作台架构，通过顶部切换按钮无缝切换:

**多文档处理工作台 (前台用户端)**
- 面向普通用户的主要操作界面
- 提供文档上传、AI对话、内容生成等功能
- 支持预配置的写作按钮一键触发沉淀集Replay
- 三面板布局：来源面板、对话面板、Studio面板

**经验沉淀工作台 (后端管理端)**
- 面向管理人员的配置界面
- 支持大纲配置、沉淀配置、应用端按钮配置、自迭代配置
- 提供完整的沉淀管理与Replay功能
- 五面板布局：输入表单、文档列表、预览、处理、操作

### 2.2 数据共享机制

两个工作台共享以下数据:
- 上传的文档内容
- 沉淀记录与沉淀集
- 按钮配置与布局设置
- 大纲缓存（服务端内存）

所有数据持久化存储在 `data/` 目录，切换工作台不会丢失数据。

---

## 三、技术架构

### 3.1 整体架构

```
用户浏览器
    |
    | HTTP (5300/4300)
    v
+-------------------+
|   前端 (React)    |
|   - Vite 构建     |
|   - 组件化设计    |
+-------------------+
    |
    v
+-------------------+
|  后端 (Express)   |
|   - RESTful API   |
|   - AI 调用代理   |
+-------------------+
    |
    +-----> data/ (JSON持久化)
    |
    +-----> 千问模型服务 (可离线)
```

### 3.2 技术栈

| 层级 | 技术选型 | 版本 |
|------|---------|------|
| 前端框架 | React | 18.3.1 |
| 构建工具 | Vite | 6.0.5 |
| UI组件 | Lucide React | 0.562.0 |
| 文档解析 | Mammoth | 1.8.0 |
| 后端框架 | Express | 4.19.2 |
| HTTP客户端 | Undici | 7.16.0 |
| AI服务 | 千问兼容接口 | - |

### 3.3 目录结构

```
document-workspace/
├── src/                          # 前端源码
│   ├── App.jsx                   # 应用入口（工作台切换逻辑）
│   ├── SOPWorkbench.jsx          # 经验沉淀工作台（大型单文件）
│   ├── MultiDocWorkbench.jsx     # 多文档处理工作台
│   ├── PanelComponents.jsx       # SOP面板组件
│   ├── MultiPanelComponents.jsx  # Multi面板组件
│   ├── EditablePanel.jsx         # 可编辑面板
│   ├── EditableButton.jsx        # 可编辑按钮
│   ├── EditableContentBlock.jsx  # 可编辑内容块
│   ├── StyleEditor.jsx           # 样式编辑器
│   ├── GlobalButton.jsx          # 全局按钮
│   ├── RecycleBin.jsx            # 回收站
│   ├── ButtonLogicEditor.jsx     # 按钮逻辑编辑器
│   ├── DocumentPreviewModal.jsx  # 文档预览模态框
│   ├── PrecipitationPanel.jsx    # 沉淀面板
│   ├── apiClient.js              # API客户端
│   ├── appState.js               # 应用状态管理
│   ├── buttonManager.js          # 按钮管理
│   ├── layoutManager.js          # 布局管理
│   ├── layoutEditor.js           # 布局编辑器
│   ├── config.js                 # 配置文件
│   └── security.js               # 安全模块
├── server.js                     # 后端主服务
├── server_multi.js               # 多文档工作台路由
├── server_utils.js               # 服务端工具函数
├── data/                         # 数据持久化
├── docs/                         # 项目文档
├── dist/                         # 构建输出
├── package.json                  # 项目配置
├── Dockerfile                    # Docker构建
└── docker-compose.yml            # Docker Compose
```

---

## 四、核心功能

### 4.1 文档管理

**支持格式**
- 纯文本: .txt, .md
- Office文档: .docx (通过Mammoth解析)

**核心能力**
- 多文件批量上传
- 文档内容预览
- 文档列表管理
- 文档删除与清空
- 同名文档自动覆盖

**输入验证**
- 文档名称长度限制: 255字符
- 文档内容大小限制: 10MB

### 4.2 大纲抽取与应用

**AI大纲抽取**
- 调用千问模型自动分析文档结构
- 生成层级化大纲(支持1-5级)
- 提取章节标题与摘要
- 支持自定义提示词

**大纲历史管理**
- 大纲存档与命名
- 历史大纲恢复
- 大纲编辑与调整
- 大纲删除

**大纲缓存机制**
- 大纲在工作台切换时保持不变
- 大纲在Replay时保持不变
- 仅server重启时清空缓存
- 支持手动清空缓存

### 4.3 经验沉淀系统

**Section（沉淀步骤）**

每条Section包含5个核心字段:
1. **输入来源**: 操作的输入数据来源
2. **动作执行**: 执行的具体动作
3. **执行摘要**: 执行结果摘要
4. **记录位置**: 输出写入位置（使用标题而非序号）
5. **复现方式**: 特殊按钮的复现策略

**沉淀记录**
- 由多个Section组成
- 支持重命名、编辑、排序
- 支持拖拽调整顺序
- 编辑后自动编译为Replay Meta

**沉淀集**
- 将多条沉淀记录组合为沉淀集
- 支持增删改与排序
- 可关联到前台按钮

**Replay机制**
- **大模型沉淀**: 允许泛化，适应不同场景；内容不一致时使用相同prompt执行动作
- **脚本沉淀**: 严格一致，精确复现；不一致直接pass并报错
- **执行状态**:
  - 沉淀级: `done` / `partial done` / `fail`
  - Section级: `done` / `pass` / `fail`
  - `pass` 表示模型做了泛化妥协但仍完成该步骤

**沉淀记录优化**
- 只记录按钮操作（不记录编辑框内容）
- 记录位置使用标题而非序号

### 4.4 可视化布局编辑

**编辑能力**
- 面板拖拽移动
- 面板尺寸调整
- 面板显示/隐藏
- 按钮样式编辑
- 标题文本编辑

**持久化**
- 布局配置自动保存
- 支持重置为默认
- 本地存储+服务端双重保障

### 4.5 按钮配置系统

**经验沉淀工作台按钮**
- 大纲抽取、填入摘要、执行指令等
- 支持自定义Prompt
- 可配置启用/禁用
- 支持按钮逻辑AI生成

**多文档工作台按钮（应用端按钮配置）**
- 默认提供: 日报合并写作、竞品分析报告、自定义写作
- 可关联沉淀集（支持多选）
- **配置加载**: 每次载入页面时从 `data/multi-app-buttons.json` 刷新最新沉淀集配置
- **保存生效**: 点击保存后对应用端立即生效
- **Replay触发**: 点击生效的按钮 = 触发该按钮下勾选的沉淀集进行Replay

---

## 五、API接口

### 5.1 文档API

| 端点 | 方法 | 说明 |
|------|------|------|
| /api/docs | GET | 获取文档列表 |
| /api/docs | POST | 创建/更新文档（同名覆盖） |
| /api/docs/:id | DELETE | 删除文档 |
| /api/docs/:id | PATCH | 更新文档内容 |

### 5.2 场景与模板API

| 端点 | 方法 | 说明 |
|------|------|------|
| /api/scene | POST | 创建场景 |
| /api/scene/:id | GET/PATCH | 获取/更新场景 |
| /api/scene/:id/section/:sectionId | PATCH | 更新章节内容 |
| /api/scene/:id/section/:sectionId/generate | POST | 生成章节内容 |
| /api/scene/:id/section/:sectionId/improve | POST | 优化章节内容 |
| /api/scene/:id/apply-template | POST | 应用模板 |
| /api/template | GET | 获取默认模板 |
| /api/template/auto | POST | AI大纲抽取 |
| /api/prompt/optimize | POST | 提示词优化 |
| /api/replay/file-selector | POST | 文件匹配规则 |
| /api/final/generate | POST | 最终文档生成 |
| /api/dispatch | POST | 指令调度 |

### 5.3 配置与缓存API

| 端点 | 方法 | 说明 |
|------|------|------|
| /api/layout | GET/POST | SOP布局配置 |
| /api/buttons | GET/POST | SOP按钮配置 |
| /api/config/all | GET | 获取全部配置 |
| /api/config/save | POST | 保存配置 |
| /api/config/status | GET | AI配置状态 |
| /api/config/api-key | POST | 运行时设置API Key |
| /api/outline/cache | GET/POST/DELETE | 大纲缓存 |
| /api/chat/cache | GET/POST | 对话缓存 |
| /api/dispatch/logs/cache | GET/POST | 操作日志缓存 |
| /api/deposit/state/cache | GET/POST | 沉淀录制状态缓存 |

### 5.4 AI API

| 端点 | 方法 | 说明 |
|------|------|------|
| /api/ai/chat | POST | 通用对话 |
| /api/ai/replay-analyze | POST | Replay意图分析 |

### 5.5 多文档工作台API

| 端点 | 方法 | 说明 |
|------|------|------|
| /api/multi/layout | GET/POST | 布局配置 |
| /api/multi/layout/reset | POST | 重置布局 |
| /api/multi/buttons | GET/POST | 按钮配置 |
| /api/multi/buttons/reset | POST | 重置按钮 |
| /api/multi/panels | GET/POST | 面板可见性 |
| /api/multi/app-buttons | GET/POST | 应用端按钮 |
| /api/multi/precipitation/records | GET/POST | 沉淀记录 |
| /api/multi/precipitation/records/:id | PATCH/DELETE | 更新/删除沉淀记录 |
| /api/multi/precipitation/records/order | POST | 更新沉淀顺序 |
| /api/multi/precipitation/records/:id/sections/:sectionId/compile | POST | 编译沉淀步骤 |
| /api/multi/precipitation/groups | GET/POST | 沉淀集 |
| /api/multi/precipitation/groups/:id | PATCH/DELETE | 更新/删除沉淀集 |
| /api/multi/precipitation/intent | POST | Replay意图分析 |
| /api/multi/outlines | GET/POST | 大纲历史 |
| /api/multi/outlines/:id | PATCH/DELETE | 更新/删除大纲 |
| /api/multi/button-logic | POST | 按钮逻辑生成 |
| /api/multi/replay/config | GET/POST | Replay目录配置 |
| /api/multi/replay/execute | POST | 执行沉淀集Replay |

## 六、部署方案

### 6.1 本地开发

```bash
# 安装依赖
npm install

# 启动后端 (端口4300)
npm run server

# 启动前端 (端口5300)
npm run dev
```

### 6.2 Docker部署

```bash
# 构建镜像
docker build -t document-workspace:1.6.3 .

# 运行容器
docker run -d \
  --name document-workspace \
  -p 4300:4300 \
  -e QWEN_ENDPOINT="<模型地址>" \
  -e QWEN_API_KEY="<API密钥>" \
  -e SERVE_DIST=1 \
  -v /opt/data:/app/data \
  document-workspace:1.6.3
```

### 6.3 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| PORT | 后端端口 | 4300 |
| QWEN_ENDPOINT | 千问API地址 | dashscope官方 |
| QWEN_API_KEY | API密钥 | (可选，未配置时AI功能返回模拟数据) |
| QWEN_MODEL / AI_MODEL_NAME | 模型名称 | qwen-plus |
| SERVE_DIST | 是否服务静态文件 | false |

> API Key 也可通过命令行 `--api-key=...` 或运行时 `POST /api/config/api-key` 设置。

---

## 七、数据持久化

### 7.1 数据文件

| 文件 | 说明 |
|------|------|
| data/docs.json | 文档数据 |
| data/layout-config.json | SOP布局配置 |
| data/button-config.json | SOP按钮配置 |
| data/multi-layout-config.json | Multi布局配置 |
| data/multi-button-config.json | Multi按钮配置 |
| data/multi-panel-visibility.json | Multi面板可见性 |
| data/multi-app-buttons.json | 应用端按钮配置 |
| data/precipitation-records.json | 沉淀记录 |
| data/precipitation-groups.json | 沉淀集 |
| data/outline-history.json | 大纲历史 |
| data/replay-config.json | Replay目录配置 |
| data/content-blocks.json | 内容块配置 |
| data/deleted-blocks.json | 已删除内容块 |
| data/global-buttons.json | 全局按钮 |
| data/header-titles.json | 标题配置 |
| data/layout-size.json | 布局尺寸 |
| data/llm-buttons.json | LLM按钮配置 |

### 7.2 数据备份

建议定期备份 `data/` 目录:

```bash
# 手动备份
cp -r data/ backup_$(date +%Y%m%d)/

# Docker卷挂载自动持久化
-v /opt/document-workspace/data:/app/data
```

---

## 八、安全性

### 8.1 输入验证

- 文档名称长度限制 (255字符)
- 文档内容大小限制 (10MB)
- API请求超时控制 (120秒)

### 8.2 内存管理

- 最大文档数量限制 (1000)
- 最大场景数量限制 (500)
- 场景自动过期清理 (24小时)

### 8.3 API重试机制

- 默认重试3次
- 指数退避延迟 (1s, 2s, 4s)
- 超时自动中断

### 8.4 错误处理

- 全局未捕获异常处理
- API调用失败降级返回
- 数据检查失败的备用处理

---

## 九、文档清单

| 文档路径 | 说明 |
|----------|------|
| README.md | 项目主入口文档 |
| docs/PROJECT_REVIEW.md | 项目总结与评审 |
| docs/USER_MANUAL.md | 用户操作手册 |
| docs/SOP_DEPOSIT_GUIDE.md | 沉淀与Replay指南 |
| docs/DOCKER_DEPLOY.md | Docker部署指南 |
| docs/quickstart/QUICK_REFERENCE.md | 快速参考 |
| docs/overview/SYSTEM_OVERVIEW.md | 系统概览 |
| docs/overview/ARCHITECTURE_DIAGRAM.md | 架构图示 |
| docs/overview/PROJECT_INDEX.md | 项目索引 |
| docs/draggable/DRAGGABLE_COLLECTION.md | 拖拽功能 |
| docs/editing/EDITING_MODE_COLLECTION.md | 编辑模式 |
| docs/visual/VISUAL_LAYOUT_COLLECTION.md | 可视化布局 |

---

## 十、总结

### 10.1 项目亮点

1. **双工作台设计**: 满足不同角色的使用需求
2. **经验沉淀机制**: 将操作流程转化为可复现的自动化
3. **可视化配置**: 拖拽式布局编辑，所见即所得
4. **离线支持**: 可对接本地大模型，满足内网环境
5. **数据持久化**: 完整的配置与数据保存机制
6. **大纲缓存**: 工作台切换时保持大纲状态

### 10.2 技术特点

1. **组件化架构**: React组件高度模块化
2. **RESTful API**: 规范的接口设计
3. **JSON存储**: 轻量级数据持久化
4. **容器化部署**: 支持Docker一键部署
5. **AI集成**: 支持千问兼容接口

### 10.3 适用场景

- 企业文档处理与分析
- 知识库构建与管理
- 流程自动化与沉淀
- AI辅助写作与生成
- 多文档合并与分析

---

*Document Workspace 1.6.3 - 智能文档处理与经验沉淀平台*


