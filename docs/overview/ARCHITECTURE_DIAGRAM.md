# 架构图示

Document Workspace 1.6.3 系统架构

## 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户浏览器                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              前端应用 (React + Vite)                     │   │
│  │  ┌─────────────────┐  ┌─────────────────────────────┐   │   │
│  │  │ 多文档处理工作台  │  │   经验沉淀工作台             │   │   │
│  │  │ (MultiDoc)      │  │   (SOPWorkbench)           │   │   │
│  │  │                 │  │                            │   │   │
│  │  │ - 来源面板       │  │   - 输入表单面板            │   │   │
│  │  │ - 对话面板       │  │   - 文档列表面板            │   │   │
│  │  │ - Studio面板    │  │   - 预览面板               │   │   │
│  │  │                 │  │   - 处理面板               │   │   │
│  │  │                 │  │   - 操作面板               │   │   │
│  │  └─────────────────┘  └─────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTP (开发 5300 / 生产 4300)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    后端服务 (Express)                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   API 路由层                             │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐    │   │
│  │  │ /api/docs   │ │ /api/scene  │ │ /api/multi/*    │    │   │
│  │  │ 文档管理     │ │ 场景管理     │ │ 多文档工作台    │    │   │
│  │  └─────────────┘ └─────────────┘ └─────────────────┘    │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐    │   │
│  │  │ /api/layout │ │ /api/buttons│ │ /api/template   │    │   │
│  │  │ 布局配置     │ │ 按钮配置     │ │ 模板管理        │    │   │
│  │  └─────────────┘ └─────────────┘ └─────────────────┘    │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐    │   │
│  │  │/api/outline │ │/api/dispatch│ │ /api/config     │    │   │
│  │  │ 大纲缓存     │ │ 指令调度     │ │ 配置管理        │    │   │
│  │  └─────────────┘ └─────────────┘ └─────────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                │                                │
│  ┌─────────────────────────────▼───────────────────────────┐   │
│  │                    业务逻辑层                            │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐    │   │
│  │  │ AI 调用模块  │ │ 文档处理模块 │ │ 沉淀管理模块     │    │   │
│  │  │ callQwen*   │ │ 上传/解析   │ │ 记录/回放       │    │   │
│  │  └─────────────┘ └─────────────┘ └─────────────────┘    │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐    │   │
│  │  │ 大纲缓存模块 │ │ 内存管理模块 │ │ 重试机制模块     │    │   │
│  │  │ 工作台共享   │ │ 场景清理    │ │ 指数退避        │    │   │
│  │  └─────────────┘ └─────────────┘ └─────────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                │                                │
└────────────────────────────────┼────────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
┌───────────────┐      ┌─────────────────┐      ┌───────────────┐
│   data/ 目录   │      │   模型服务       │      │   .env 配置   │
│               │      │   (千问兼容)     │      │               │
│ - docs.json             │      │                 │      │ QWEN_ENDPOINT │
│ - layout-config.json    │      │ QWEN_ENDPOINT   │      │ QWEN_API_KEY  │
│ - button-config.json    │      │ 可本地部署       │      │ QWEN_MODEL    │
│ - multi-*.json          │      └─────────────────┘      └───────────────┘
│ - *.json                │
└───────────────┘
```

## 数据流图

```
┌──────────┐   上传文档    ┌──────────┐
│  用户端   │ -----------> │  后端    │
│          │              │          │
│ 多文档   │ <----------- │ 解析存储  │
│ 工作台   │   返回文档列表  │          │
└──────────┘              └────┬─────┘
     │                           │
     │ 点击写作按钮               │ 读取文档内容
     │                           │
     ▼                           ▼
┌──────────┐  调用大纲API  ┌──────────┐
│  触发    │ -----------> │  AI服务  │
│  沉淀集  │              │  千问    │
│  Replay  │ <----------- │          │
└──────────┘   返回处理结果  └──────────┘
```

## 大纲缓存流程

```
┌──────────────┐                    ┌──────────────┐
│ 经验沉淀工作台 │                    │ 多文档工作台  │
│              │                    │              │
│  生成大纲    │                    │  触发Replay  │
│      │      │                    │      │      │
└──────┼──────┘                    └──────┼──────┘
       │                                  │
       │ POST /api/outline/cache          │ GET /api/outline/cache
       │                                  │
       ▼                                  ▼
┌─────────────────────────────────────────────────┐
│              服务端大纲缓存                       │
│              (cachedOutlineTemplate)            │
│                                                 │
│  - 工作台切换时保持                              │
│  - Replay时保持                                 │
│  - server重启时清空                             │
│  - 支持手动清空 DELETE /api/outline/cache       │
└─────────────────────────────────────────────────┘
```

## 组件关系图

```
App.jsx
├── SOPWorkbench.jsx (经验沉淀工作台, 大型单文件)
│   ├── PanelComponents.jsx
│   │   ├── InputFormPanelContent
│   │   ├── DocumentListPanelContent
│   │   ├── ContentPreviewPanelContent
│   │   ├── ProcessingPanelContent
│   │   │   ├── OutlineView
│   │   │   ├── RecordsView
│   │   │   └── ConfigView
│   │   └── OperationsPanelContent
│   ├── EditablePanel.jsx
│   │   └── LayoutEditContainer
│   ├── EditableButton.jsx
│   │   └── EditableButtonsContainer
│   ├── EditableContentBlock.jsx
│   ├── StyleEditor.jsx
│   │   └── StyleEditorOverlay
│   ├── GlobalButton.jsx
│   ├── RecycleBin.jsx
│   ├── ButtonLogicEditor.jsx
│   ├── DocumentPreviewModal.jsx
│   └── PrecipitationPanel.jsx
│
└── MultiDocWorkbench.jsx (多文档处理工作台)
    ├── MultiPanelComponents.jsx
    │   ├── SourcesPanel
    │   ├── ChatPanel
    │   └── StudioPanel
    ├── EditablePanel.jsx
    │   └── EditableLayoutPanel
    ├── EditableButton.jsx
    └── StyleEditor.jsx
```

## 服务端架构

`
server.js (主服务)
├── 文档 API (/api/docs)
│   ├── GET    - 获取文档列表
│   ├── POST   - 创建/更新文档
│   ├── DELETE - 删除文档
│   └── PATCH  - 更新文档
├── 场景 API (/api/scene)
│   ├── POST   - 创建场景
│   ├── GET    - 获取场景
│   ├── PATCH  - 更新场景
│   ├── PATCH /section/:sectionId - 更新章节
│   ├── POST /section/:sectionId/generate - 生成章节
│   ├── POST /section/:sectionId/improve - 优化章节
│   └── POST apply-template - 应用模板
├── 模板与生成 API
│   ├── GET /api/template
│   ├── POST /api/template/auto
│   ├── POST /api/prompt/optimize
│   ├── POST /api/replay/file-selector
│   └── POST /api/final/generate
├── 调度 API (/api/dispatch)
├── 配置 API (/api/config/*)
├── 布局 API (/api/layout)
├── 按钮 API (/api/buttons)
├── 缓存 API (/api/outline/cache, /api/chat/cache, /api/dispatch/logs/cache, /api/deposit/state/cache)
├── AI API (/api/ai/chat, /api/ai/replay-analyze)
└── server_multi.js (多文档工作台路由)
    ├── 布局 API (/api/multi/layout)
    ├── 按钮 API (/api/multi/buttons)
    ├── 面板 API (/api/multi/panels)
    ├── 应用端按钮 API (/api/multi/app-buttons)
    ├── 沉淀 API (/api/multi/precipitation/*)
    │   ├── records - 沉淀记录
    │   ├── groups  - 沉淀集
    │   └── intent  - Replay意图分析
    ├── 大纲 API (/api/multi/outlines)
    ├── Replay API (/api/multi/replay/*)
    └── 按钮逻辑 API (/api/multi/button-logic)
`

## 数据持久化结构

```
data/
├── docs.json                    # 文档数据
├── layout-config.json           # SOP布局配置
├── button-config.json           # SOP按钮配置
├── multi-layout-config.json     # Multi布局配置
├── multi-button-config.json     # Multi按钮配置
├── multi-panel-visibility.json  # Multi面板可见性
├── multi-app-buttons.json       # 应用端按钮配置
├── precipitation-records.json   # 沉淀记录
├── precipitation-groups.json    # 沉淀集
├── outline-history.json         # 大纲历史
├── replay-config.json           # Replay目录配置
├── content-blocks.json          # 内容块配置
├── deleted-blocks.json          # 已删除内容块
├── global-buttons.json          # 全局按钮
├── header-titles.json           # 标题配置
├── layout-size.json             # 布局尺寸
└── llm-buttons.json             # LLM按钮配置
```

## 说明

- 前台与后端共用 `data/` 目录下的数据
- AI 模型服务可指向本地离线部署的千问模型
- 所有配置支持环境变量覆盖
- 大纲缓存在服务端内存中，重启会清空
- 两个工作台通过 App.jsx 的状态切换




