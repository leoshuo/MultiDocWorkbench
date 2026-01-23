# 系统概览

Document Workspace 1.6.3 是一个基于 AI 的文档处理与经验沉淀平台。

## 系统定位

本系统提供两个工作台界面：

| 工作台 | 定位 | 主要功能 |
|--------|------|----------|
| **多文档处理工作台** | 前台用户端 | 文档上传、AI对话、一键写作 |
| **经验沉淀工作台** | 后端管理端 | 沉淀配置、流程编排、Replay管理 |

两端数据全局共享，切换工作台不会丢失数据。

## 核心能力

### 文档处理
- 多格式文档上传（txt、md、docx）
- 文档内容预览与管理
- AI 辅助文档分析
- 多文件批量上传
- AI 对话与指令执行

### 大纲管理
- AI 智能大纲抽取（支持1-5级层级）
- 大纲历史存档与恢复
- 大纲章节编辑
- **大纲缓存机制**：工作台切换时保持状态

### 运行缓存
- 对话消息缓存（工作台切换保持）
- 操作日志缓存（Replay/调度日志）
- 沉淀录制状态缓存

### 经验沉淀
- Section 记录：输入来源、动作执行、执行摘要、记录位置、复现方式
- 沉淀记录管理与编辑
- 沉淀集组织与 Replay 复现
- 双重 Replay 模式：大模型沉淀 / 脚本沉淀

### 布局编辑
- 可视化面板拖拽布局
- 按钮样式自定义
- 配置持久化存储
- 本地存储+服务端双重保障

## 技术架构

### 前端
- **框架**: React 18.3.1
- **构建工具**: Vite 6.0.5
- **UI图标**: Lucide React 0.562.0
- **文档解析**: Mammoth 1.8.0 (docx)

### 后端
- **框架**: Express 4.19.2
- **HTTP客户端**: Undici 7.16.0
- **AI 接口**: 千问兼容接口
- **数据存储**: JSON 文件 (`data/` 目录)

### 数据持久化

| 类别 | 文件 |
|------|------|
| 文档数据 | `data/docs.json` |
| 沉淀记录 | `data/precipitation-records.json` |
| 沉淀集 | `data/precipitation-groups.json` |
| 大纲历史 | `data/outline-history.json` |
| SOP布局 | `data/layout-config.json` |
| SOP按钮 | `data/button-config.json` |
| Multi布局 | `data/multi-layout-config.json` |
| Multi按钮 | `data/multi-button-config.json` |
| 应用端按钮 | `data/multi-app-buttons.json` |
| Multi面板可见性 | `data/multi-panel-visibility.json` |
| Replay目录配置 | `data/replay-config.json` |
| 内容块 | `data/content-blocks.json` |
| 已删除内容块 | `data/deleted-blocks.json` |
| 全局按钮 | `data/global-buttons.json` |
| 标题配置 | `data/header-titles.json` |
| 布局尺寸 | `data/layout-size.json` |
| LLM按钮 | `data/llm-buttons.json` |

## 工作台面板

### 多文档处理工作台

| 面板 | 功能 |
|------|------|
| 来源面板（Sources） | 文档上传与列表管理 |
| 对话面板（Chat） | AI对话与写作按钮 |
| Studio面板 | 笔记与输出内容 |

### 经验沉淀工作台

| 面板 | 功能 |
|------|------|
| 输入表单面板 | 回放目录选择 |
| 文档列表面板 | 文档管理 |
| 预览面板 | 文档内容预览 |
| 处理面板 | 大纲配置、沉淀配置、应用端按钮配置 |
| 操作面板 | 指令调度 |

## 部署方式

### 本地开发
```bash
npm install
npm run dev      # 前端 (5300)
npm run server   # 后端 (4300)
```

### Docker 部署
```bash
docker build -t document-workspace:1.6.3 .
docker run -d -p 4300:4300 \
  -e QWEN_ENDPOINT="<模型地址>" \
  -e QWEN_API_KEY="<密钥>" \
  -e SERVE_DIST=1 \
  -v /opt/data:/app/data \
  document-workspace:1.6.3
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| PORT | 后端端口 | 4300 |
| QWEN_ENDPOINT | 千问API地址 | dashscope官方 |
| QWEN_API_KEY | API密钥 | (可选，未配置时AI功能返回模拟数据) |
| QWEN_MODEL / AI_MODEL_NAME | 模型名称 | qwen-plus |
| SERVE_DIST | 服务静态文件 | false |

## 相关文档

| 文档 | 说明 |
|------|------|
| `README.md` | 项目入口 |
| `docs/PROJECT_REVIEW.md` | 项目总结 |
| `docs/USER_MANUAL.md` | 用户手册 |
| `docs/SOP_DEPOSIT_GUIDE.md` | 沉淀指南 |
| `docs/DOCKER_DEPLOY.md` | 部署指南 |
| `docs/quickstart/QUICK_REFERENCE.md` | 快速参考 |
| `docs/overview/ARCHITECTURE_DIAGRAM.md` | 架构图示 |

