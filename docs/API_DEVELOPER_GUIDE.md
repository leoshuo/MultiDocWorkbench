# Agentic Workspace 开发迭代指南

> 面向工程/算法同学的技术文档，帮助你快速上手并继续迭代本产品

---

## 一、项目概览

### 1.1 项目定位

**一句话**：操作录制 + 自动重放的文档处理平台

**核心能力**：
- 录制用户操作序列（沉淀）
- 在新文档上智能重放（Replay）
- 支持大模型语义匹配 + 脚本精确执行双模式

### 1.2 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React | 18.3 |
| 构建工具 | Vite | 6.0 |
| 后端框架 | Express | 4.19 |
| AI服务 | 通义千问（DashScope） | OpenAI兼容接口 |
| 数据存储 | JSON文件 | 无数据库 |
| 文档解析 | Mammoth | 1.8（docx解析） |

### 1.3 快速启动

```bash
# 安装依赖
npm install

# 启动前端开发服务器（端口5173）
npm run dev

# 启动后端服务（端口4300）
npm run server

# 或者一起启动
# 终端1: npm run dev
# 终端2: QWEN_API_KEY=你的key npm run server

# 构建生产版本
npm run build
```

---

## 二、项目结构

```
├── server.js              # 主后端服务（API入口）
├── server_multi.js        # 多文档工作台路由
├── server_utils.js        # 后端工具函数
├── src/
│   ├── main.jsx           # 前端入口
│   ├── App.jsx            # 应用根组件
│   ├── SOPWorkbench.jsx   # 主工作台组件（核心，17000+行）
│   ├── MultiDocWorkbench.jsx  # 多文档处理工作台
│   ├── apiClient.js       # 前端API客户端
│   ├── sop/               # 沉淀/Replay核心模块 ⭐
│   │   ├── hooks/         # React Hooks
│   │   ├── logic/         # 纯函数业务逻辑
│   │   ├── replay/        # Replay执行引擎
│   │   ├── panels/        # 面板组件
│   │   ├── modals/        # 弹窗组件
│   │   ├── validators/    # 状态验证器
│   │   └── utils/         # 工具函数
│   ├── multi/             # 多文档工作台模块
│   └── shared/            # 共享组件
├── data/                  # 数据存储目录（JSON文件）
├── docs/                  # 文档目录
└── dist/                  # 构建输出
```

---

## 三、核心模块详解

### 3.1 沉淀模块 (`src/sop/`)

这是整个产品的核心，负责操作录制和重放。

#### 目录结构

```
src/sop/
├── hooks/                 # 状态管理Hooks
│   ├── useDeposits.js     # 沉淀记录管理
│   ├── useDepositGroups.js # 沉淀集管理
│   ├── useReplay.js       # Replay执行状态
│   ├── useOutline.js      # 大纲管理
│   ├── useDocuments.js    # 文档管理
│   ├── useDispatch.js     # 指令执行
│   └── useScene.js        # 场景状态
├── logic/                 # 纯函数逻辑
│   ├── depositOps.js      # 沉淀操作函数 ⭐
│   └── documentOps.js     # 文档操作函数
├── replay/                # Replay引擎 ⭐
│   ├── replayEngine.js    # 执行引擎类
│   ├── replayConfig.js    # 动作配置注册表
│   └── replayContext.js   # 执行上下文
├── panels/                # 功能面板
│   ├── DepositListPanel.jsx    # 沉淀列表
│   ├── AppButtonsConfigPanel.jsx # 按钮配置
│   └── GlobalButtonsConfigPanel.jsx
├── SOPConstants.js        # 常量定义
└── SOPUtils.js            # 工具函数
```

#### 3.1.1 沉淀操作 (`logic/depositOps.js`)

**关键函数**：

```javascript
// 截断文本
clipText(text, max = 600)

// 附加Replay元数据到文本
appendReplayMeta(text, meta)  

// 从文本中提取Replay元数据
extractReplayMeta(content)

// 描述输入来源（生成可读文本）
describeInput(input)

// 描述目标位置
describeDestination(dest)

// 格式化操作内容（生成沉淀记录文本）
formatOpContent(meta, extraLines)

// 解析沉淀内容
parseDepositSectionContent(content)

// 获取Section执行需求
getSectionRequirements(section)

// 生成初始脚本
generateInitialScript(sections)
```

**使用场景**：
- 录制时调用 `formatOpContent()` 生成沉淀记录
- Replay时调用 `parseDepositSectionContent()` 解析记录
- 调用 `extractReplayMeta()` 获取脚本执行参数

#### 3.1.2 Replay引擎 (`replay/replayEngine.js`)

**核心类 `ReplayEngine`**：

```javascript
const engine = new ReplayEngine({
  stopOnError: false,      // 遇错是否停止
  retryOnFail: true,       // 失败是否重试
  maxRetries: 3,           // 最大重试次数
  retryDelay: 1000,        // 重试延迟(ms)
  backoff: 2,              // 退避倍数
  defaultTimeout: 60000,   // 超时时间(ms)
});

// 注册执行器
engine.registerExecutor('insert_to_summary', async (section, context) => {
  // 执行逻辑
  return { success: true, data: ... };
});

// 注册钩子
engine.on('beforeSection', (section, index, context) => {
  console.log(`执行步骤 ${index}: ${section.action}`);
});

engine.on('onError', (error, section, context) => {
  console.error('执行失败:', error);
});

// 执行Replay
const results = await engine.replayDeposit(deposit, {
  docs: [...],
  outline: {...},
});
```

**支持的钩子**：
- `beforeReplay` - Replay开始前
- `afterReplay` - Replay完成后
- `beforeSection` - 每步执行前（返回false可跳过）
- `afterSection` - 每步执行后
- `onError` - 执行出错
- `onRetry` - 重试时
- `onProgress` - 进度更新

#### 3.1.3 动作配置 (`replay/replayConfig.js`)

**已注册的动作类型**：

| 动作 | 说明 | 分类 |
|------|------|------|
| `outline_extract` | 从文档提取大纲 | OUTLINE |
| `add_section` | 添加大纲章节 | OUTLINE |
| `insert_to_summary` | 填入摘要 | OUTLINE |
| `dispatch_execute` | 执行AI指令 | DISPATCH |
| `add_doc` | 添加文档 | DOCUMENT |
| `delete_doc` | 删除文档 | DOCUMENT |
| `link_doc_to_section` | 关联文档到章节 | DOCUMENT |
| `create_deposit` | 创建沉淀 | DEPOSIT |

**添加新动作类型**：

```javascript
// 在 replayConfig.js 中添加
export const REPLAY_ACTIONS = {
  // ... 已有动作
  
  // 新增动作
  my_new_action: {
    name: 'my_new_action',
    category: ActionCategory.CUSTOM,
    executor: 'myNewActionExecutor',
    requiredFields: ['param1', 'param2'],
    optionalFields: ['param3'],
    canRetry: true,
    timeout: 30000,
    priority: 10,
  },
};
```

### 3.2 后端服务 (`server.js`)

#### 3.2.1 主要API分组

| 路由前缀 | 功能 |
|----------|------|
| `/api/docs` | 文档CRUD |
| `/api/scene` | 场景管理 |
| `/api/dispatch` | AI指令执行 |
| `/api/replay/*` | Replay相关 |
| `/api/ai/*` | AI服务封装 |
| `/api/config/*` | 配置管理 |
| `/api/outline/*` | 大纲缓存 |
| `/api/multi/*` | 多文档工作台（见server_multi.js） |

#### 3.2.2 AI调用封装

```javascript
// 通用AI调用（带重试）
const result = await fetchWithRetry(QWEN_ENDPOINT, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${QWEN_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: QWEN_MODEL,
    messages: [...],
    temperature: 0.7
  })
}, retryTimes);

// 关键变量
QWEN_ENDPOINT  // API端点
QWEN_MODEL     // 模型名称（默认qwen-plus）
QWEN_API_KEY   // API密钥
```

#### 3.2.3 数据持久化

所有数据存储在 `data/` 目录的JSON文件中：

| 文件 | 内容 |
|------|------|
| `docs.json` | 文档列表 |
| `scenes-cache.json` | 场景缓存 |
| `outline-cache.json` | 大纲缓存 |
| `precipitation-records.json` | 沉淀记录 |
| `precipitation-groups.json` | 沉淀集 |
| `layout-config.json` | 布局配置 |
| `button-config.json` | 按钮配置 |
| `llm-buttons.json` | AI按钮配置 |

---

## 四、常见开发场景

### 4.1 添加新的Replay动作类型

**步骤**：

1. **定义动作配置** (`src/sop/replay/replayConfig.js`)

```javascript
export const REPLAY_ACTIONS = {
  // 新增
  extract_table: {
    name: 'extract_table',
    category: ActionCategory.DOCUMENT,
    executor: 'extractTableExecutor',
    requiredFields: ['docId'],
    optionalFields: ['format'],
    canRetry: true,
    timeout: 30000,
  },
};
```

2. **实现执行器** (在使用的地方注册)

```javascript
engine.registerExecutor('extractTableExecutor', async (section, context) => {
  const { docId, format } = section.params || {};
  const doc = context.docs.find(d => d.id === docId);
  
  // 执行逻辑...
  const tables = extractTablesFromDoc(doc.content);
  
  return {
    success: true,
    data: tables,
    message: `提取了${tables.length}个表格`
  };
});
```

3. **添加动作推断规则** (`replayConfig.js` 的 `inferActionType`)

```javascript
export const inferActionType = (section) => {
  const content = (section.content || '').toLowerCase();
  
  // 新增规则
  if (content.includes('提取表格') || content.includes('extract table')) {
    return 'extract_table';
  }
  
  // ... 其他规则
};
```

### 4.2 添加新的API接口

**步骤**：

1. **在 `server.js` 添加路由**

```javascript
// 示例：添加表格提取API
app.post('/api/extract/table', async (req, res) => {
  try {
    const { docId, format } = req.body;
    
    // 参数验证
    if (!docId) {
      return res.status(400).json({ error: 'docId 必须提供' });
    }
    
    // 业务逻辑
    const doc = docs.find(d => d.id === docId);
    if (!doc) {
      return res.status(404).json({ error: '文档不存在' });
    }
    
    const tables = await extractTables(doc.content, format);
    
    res.json({ tables, count: tables.length });
  } catch (err) {
    logger.error('EXTRACT_TABLE', '提取表格失败', err);
    res.status(500).json({ error: err.message });
  }
});
```

2. **在前端添加API调用** (`src/apiClient.js`)

```javascript
export const extractTable = async (docId, format = 'json') => {
  const res = await fetch(`${API_BASE}/extract/table`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ docId, format })
  });
  return res.json();
};
```

### 4.3 添加新的Hook

**步骤**：

1. **创建Hook文件** (`src/sop/hooks/useMyFeature.js`)

```javascript
import { useState, useCallback } from 'react';
import { useToast } from './useToast';

export const useMyFeature = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  
  const doSomething = useCallback(async (params) => {
    setLoading(true);
    try {
      const result = await fetch('/api/my-feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      }).then(r => r.json());
      
      setData(result);
      showToast('操作成功', 'success');
      return result;
    } catch (err) {
      showToast(`操作失败: ${err.message}`, 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showToast]);
  
  return { data, loading, doSomething };
};
```

2. **在 `src/sop/hooks/index.js` 导出**

```javascript
export * from './useMyFeature';
```

### 4.4 修改沉淀记录格式

沉淀记录的核心格式在 `depositOps.js` 的 `formatOpContent` 函数中定义：

```javascript
export const formatOpContent = (meta, extraLines = []) => {
  const lines = [];
  
  // 操作概述
  if (meta.operation) lines.push(`【操作】${meta.operation}`);
  
  // 输入来源
  if (meta.input) lines.push(`【来源】${describeInput(meta.input)}`);
  
  // 目标位置
  if (meta.destination) lines.push(`【目标】${describeDestination(meta.destination)}`);
  
  // 执行结果
  if (meta.result) lines.push(`【结果】${meta.result}`);
  
  // 添加新字段示例
  if (meta.formula) lines.push(`【公式】${meta.formula}`);
  if (meta.aiGuidance) lines.push(`【AI指导】${meta.aiGuidance}`);
  
  // 附加行
  extraLines.forEach(line => lines.push(line));
  
  return lines.join('\n');
};
```

### 4.5 接入新的AI模型

**方式一：替换通义千问**

修改环境变量或启动参数：

```bash
# 使用其他OpenAI兼容接口
QWEN_ENDPOINT=https://your-api-endpoint/v1/chat/completions
QWEN_MODEL=your-model-name
QWEN_API_KEY=your-api-key
```

**方式二：添加多模型支持**

在 `server.js` 中扩展：

```javascript
// 模型配置
const MODEL_CONFIGS = {
  qwen: {
    endpoint: process.env.QWEN_ENDPOINT,
    model: process.env.QWEN_MODEL,
    apiKey: process.env.QWEN_API_KEY,
  },
  gpt: {
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4',
    apiKey: process.env.OPENAI_API_KEY,
  },
  // 添加更多模型...
};

// 通用调用函数
async function callModel(modelType, messages, options = {}) {
  const config = MODEL_CONFIGS[modelType];
  if (!config) throw new Error(`不支持的模型: ${modelType}`);
  
  return fetchWithRetry(config.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      ...options
    })
  });
}
```

---

## 五、核心数据结构

### 5.1 沉淀记录 (Deposit)

```typescript
interface Deposit {
  id: string;              // 唯一ID
  title: string;           // 沉淀标题
  createdAt: string;       // 创建时间
  sections: Section[];     // 步骤列表
}

interface Section {
  id: string;              // 步骤ID
  action: string;          // 动作类型
  content: string;         // 沉淀内容（可读文本）
  replayMeta?: {           // Replay元数据
    docId?: string;
    docName?: string;
    sectionId?: string;
    sectionTitle?: string;
    // ... 其他精确参数
  };
  status?: 'pending' | 'pass' | 'fail' | 'skipped';
}
```

### 5.2 沉淀集 (DepositGroup)

```typescript
interface DepositGroup {
  id: string;              // 唯一ID
  name: string;            // 名称
  depositIds: string[];    // 包含的沉淀ID列表
  createdAt: string;
}
```

### 5.3 场景 (Scene)

```typescript
interface Scene {
  id: string;
  docIds: string[];        // 关联的文档ID
  sectionDocLinks: {       // 章节-文档关联
    [sectionId: string]: string[];  // docIds
  };
  template: OutlineTemplate;
  sections: {
    [sectionId: string]: {
      id: string;
      title: string;
      content: string;     // 摘要内容
      status: 'empty' | 'filled';
    }
  };
}
```

### 5.4 大纲模板 (OutlineTemplate)

```typescript
interface OutlineTemplate {
  sections: OutlineSection[];
}

interface OutlineSection {
  id: string;
  title: string;
  level: number;           // 1-5级标题
  parentId?: string;       // 父节点ID
}
```

---

## 六、调试技巧

### 6.1 后端日志

```javascript
// 使用内置logger
logger.info('CATEGORY', '消息');
logger.error('CATEGORY', '错误消息', error);

// 查看AI调用详情
console.log('[DEBUG] AI调用:', { messages, response });
```

### 6.2 前端调试

```javascript
// 在Hook中添加调试
useEffect(() => {
  console.log('[Deposits] 状态更新:', deposits);
}, [deposits]);

// 使用React DevTools查看组件状态
```

### 6.3 Replay调试

```javascript
// 注册调试钩子
engine.on('beforeSection', (section, index) => {
  console.log(`[Replay] 执行步骤 ${index}:`, section);
});

engine.on('afterSection', (result) => {
  console.log('[Replay] 步骤结果:', result);
});

engine.on('onError', (error, section) => {
  console.error('[Replay] 执行失败:', { error, section });
});
```

---

## 七、部署相关

### 7.1 Docker部署

```dockerfile
# Dockerfile已配置好
docker build -t agentic-workspace:1.6.5 .
docker run -d -p 4300:4300 -e QWEN_API_KEY="your-key" agentic-workspace:1.6.5
```

### 7.2 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | 4300 |
| `QWEN_API_KEY` | AI服务密钥 | 无（必需） |
| `QWEN_MODEL` | 模型名称 | qwen-plus |
| `QWEN_ENDPOINT` | API端点 | DashScope |

### 7.3 私有化部署

支持接入本地私有模型，只需修改 `QWEN_ENDPOINT` 指向本地服务：

```bash
QWEN_ENDPOINT=http://localhost:8000/v1/chat/completions
QWEN_MODEL=local-model
QWEN_API_KEY=local-key
```

---

## 八、代码规范

### 8.1 文件命名

- React组件：`PascalCase.jsx`（如 `DepositListPanel.jsx`）
- Hook：`useCamelCase.js`（如 `useDeposits.js`）
- 工具函数：`camelCase.js`（如 `depositOps.js`）
- 常量：`UPPER_CASE`（如 `SOPConstants.js`）

### 8.2 代码组织

- Hook只管理状态，不包含UI逻辑
- 纯函数放在 `logic/` 目录
- 组件按功能分目录（panels、modals、components）

### 8.3 注释规范

```javascript
/**
 * 函数描述
 * @param {string} param1 - 参数1说明
 * @param {object} param2 - 参数2说明
 * @returns {Promise<Result>} 返回值说明
 */
export const myFunction = async (param1, param2) => {
  // 实现
};
```

---

## 九、常见问题

### Q1: AI功能不工作？

检查 `QWEN_API_KEY` 是否配置，调用 `GET /api/config/status` 确认。

### Q2: 沉淀记录丢失？

检查 `data/precipitation-records.json` 文件是否存在且格式正确。

### Q3: Replay执行失败？

1. 检查沉淀记录的 `replayMeta` 是否完整
2. 查看后端日志定位具体错误
3. 使用调试钩子追踪执行过程

### Q4: 如何查看完整的请求/响应？

在 `server.js` 添加日志中间件：

```javascript
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`, req.body);
  next();
});
```

---

*文档版本：1.6.5*
