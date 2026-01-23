# 实现报告

Document Workspace 1.6.3 技术实现报告

## 架构设计

### 前端架构
```
React 18 + Vite
├── App.jsx (主入口，工作台切换)
├── SOPWorkbench.jsx (经验沉淀工作台)
│   ├── PanelComponents.jsx (面板组件)
│   ├── EditablePanel.jsx (可编辑面板)
│   ├── EditableButton.jsx (可编辑按钮)
│   └── StyleEditor.jsx (样式编辑器)
└── MultiDocWorkbench.jsx (多文档工作台)
    └── MultiPanelComponents.jsx (面板组件)
```

### 后端架构
```
Express.js
├── server.js (主服务)
│   ├── 文档 API (/api/docs)
│   ├── 场景 API (/api/scene)
│   ├── 模板与生成 API (/api/template, /api/template/auto)
│   ├── 提示词优化 (/api/prompt/optimize)
│   ├── 文件规则生成 (/api/replay/file-selector)
│   ├── 调度 API (/api/dispatch)
│   ├── 最终生成 (/api/final/generate)
│   ├── 配置 API (/api/config/*)
│   ├── 缓存 API (/api/outline/cache, /api/chat/cache, /api/dispatch/logs/cache, /api/deposit/state/cache)
│   └── AI API (/api/ai/*)
└── server_multi.js (多文档工作台路由)
    ├── 布局 API (/api/multi/layout)
    ├── 按钮 API (/api/multi/buttons)
    ├── 面板 API (/api/multi/panels)
    ├── 沉淀 API (/api/multi/precipitation)
    ├── 大纲 API (/api/multi/outlines)
    └── Replay API (/api/multi/replay/*)
```

## 核心模块实现

### 1. AI 调用模块

#### fetchWithRetry - 带重试的 HTTP 请求
```javascript
async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
}
```

### 2. 文档处理模块

#### 支持格式
- `.txt` - 纯文本
- `.md` - Markdown
- `.docx` - Word 文档（使用 mammoth 解析）

#### 输入验证
- 文档名称最大 255 字符
- 文档内容最大 10MB
- 文档数量上限 1000

### 3. 沉淀管理模块

#### Section 结构
```json
{
  "inputSource": "输入来源",
  "action": "动作执行",
  "summary": "执行摘要",
  "outputPosition": "记录位置",
  "replayMethod": "复现方式",
  "required": {
    "inputSource": true,
    "action": true,
    "summary": false,
    "outputPosition": true
  }
}
```

#### 沉淀模式
- **大模型沉淀**：允许泛化，适应不同场景
- **脚本沉淀**：严格一致，精确复现

### 4. 布局管理模块

#### 持久化
- SOP：`layout-config.json`、`button-config.json`
- Multi：`multi-layout-config.json`、`multi-button-config.json`
- 面板可见性：`multi-panel-visibility.json`

### 5. 大纲缓存模块

#### 缓存机制
- 存储在服务端内存
- 工作台切换时保持
- Replay 时保持
- 服务重启时清空

#### API
| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/outline/cache` | 获取缓存 |
| POST | `/api/outline/cache` | 更新缓存 |
| DELETE | `/api/outline/cache` | 清空缓存 |

## 数据持久化

### 存储方式
- JSON 文件存储
- 同步读写（小数据量）
- 自动创建默认文件

### 数据文件
| 文件 | 说明 |
|------|------|
| `docs.json` | 文档数据 |
| `precipitation-records.json` | 沉淀记录 |
| `precipitation-groups.json` | 沉淀集 |
| `layout-config.json` | SOP 布局配置 |
| `button-config.json` | SOP 按钮配置 |
| `multi-layout-config.json` | Multi 布局配置 |
| `multi-button-config.json` | Multi 按钮配置 |
| `multi-panel-visibility.json` | Multi 面板可见性 |
| `multi-app-buttons.json` | 应用端按钮配置 |
| `outline-history.json` | 大纲历史 |
| `replay-config.json` | Replay 目录配置 |

## 内存管理

### 场景管理
- 最大场景数量 500
- 超出时自动清理最旧场景
- 场景过期清理（24 小时）

### 缓存管理
- 大纲缓存单例
- 对话/日志/沉淀状态缓存
- 服务重启清空

## 安全实现

### 输入验证
- 文件名长度限制
- 内容大小限制
- 请求超时控制

### 错误处理
- 统一错误响应格式
- 全局未捕获异常处理
- 详细日志记录

## 性能优化

### 前端
- Vite 热更新
- 组件懒加载
- 状态管理优化

### 后端
- API 重试机制
- 缓存机制
- 内存管理

