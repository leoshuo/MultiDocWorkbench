# SOPWorkbench 模块化与增强设计计划 v2

**日期**: 2026-01-24  
**目标**: 将 SOPWorkbench.jsx 从 22,284 行精简至 ~13,000 行，同时增强鲁棒性、容错性和 Replay 灵活性

---

## 一、模块化拆分计划

### Phase 1: 自定义 Hooks 拆分（优先级：高）

| Hook | 包含状态/逻辑 | 目标文件 | 预计行数 |
|------|--------------|----------|----------|
| `useOutline` | template, outlineEditing, sectionDocLinks, buildSectionTree, 大纲操作 | `sop/hooks/useOutline.js` | ~800 |
| `useDeposits` | deposits, depositGroups, replayState, 沉淀CRUD操作 | `sop/hooks/useDeposits.js` | ~600 |
| `useLayoutEditor` | panelPositions, buttonPositions, 拖拽逻辑 | `sop/hooks/useLayoutEditor.js` | ~500 |
| `useDocuments` | docs, selectedDocId, 文档加载/预览 | `sop/hooks/useDocuments.js` | ~400 |
| `useProcessing` | dispatching, dispatchLogs, LLM调用 | `sop/hooks/useProcessing.js` | ~400 |
| `useHistory` | outlineHistory, 历史记录管理 | `sop/hooks/useHistory.js` | ~300 |

### Phase 2: 业务逻辑模块拆分（优先级：中）

| 模块 | 功能 | 目标文件 |
|------|------|----------|
| OutlineOps | 大纲节点增删改查、层级调整 | `sop/logic/outlineOps.js` |
| DepositOps | 沉淀记录创建、编辑、删除 | `sop/logic/depositOps.js` |
| ReplayEngine | Replay 执行引擎（见第三章） | `sop/logic/replayEngine.js` |
| DispatchOps | 执行指令、结果处理 | `sop/logic/dispatchOps.js` |

### Phase 3: 组件拆分（优先级：低）

| 组件 | 功能 | 目标文件 |
|------|------|----------|
| ProcessingTabBar | Tab切换栏 | `sop/panels/ProcessingTabBar.jsx` |
| DepositConfirmModal | 沉淀确认弹窗 | `sop/modals/DepositConfirmModal.jsx` |
| DepositSectionItem | 沉淀章节渲染 | `sop/panels/DepositSectionItem.jsx` |
| BackofficeConfigModal | 后台配置 | `sop/modals/BackofficeConfigModal.jsx` |

---

## 二、鲁棒性与容错性设计

### 2.1 统一错误边界

```javascript
// src/sop/errors/ErrorBoundary.jsx
export class SOPErrorBoundary extends React.Component {
  state = { hasError: false, error: null, errorInfo: null };
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    // 上报错误日志
    console.error('[SOP Error]', error, errorInfo);
    // 可选：发送到服务端
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onRetry={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}
```

### 2.2 安全的状态操作工具

```javascript
// src/sop/utils/safeOps.js

/**
 * 安全获取嵌套属性
 */
export const safeGet = (obj, path, defaultValue = undefined) => {
  try {
    return path.split('.').reduce((o, k) => (o || {})[k], obj) ?? defaultValue;
  } catch {
    return defaultValue;
  }
};

/**
 * 安全的数组操作
 */
export const safeArray = (arr) => (Array.isArray(arr) ? arr : []);

/**
 * 安全的对象操作
 */
export const safeObject = (obj) => (obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {});

/**
 * 安全的 JSON 解析
 */
export const safeJsonParse = (str, fallback = null) => {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
};

/**
 * 安全的异步操作包装
 */
export const safeAsync = async (fn, fallback = null, onError = null) => {
  try {
    return await fn();
  } catch (error) {
    onError?.(error);
    console.warn('[SafeAsync]', error.message);
    return fallback;
  }
};

/**
 * 带重试的异步操作
 */
export const withRetry = async (fn, { maxRetries = 3, delay = 1000, backoff = 2 } = {}) => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, delay * Math.pow(backoff, i)));
      }
    }
  }
  throw lastError;
};
```

### 2.3 状态验证器

```javascript
// src/sop/validators/stateValidators.js

/**
 * 验证沉淀记录结构
 */
export const validateDeposit = (deposit) => {
  const errors = [];
  if (!deposit?.id) errors.push('缺少 id');
  if (!deposit?.name) errors.push('缺少 name');
  if (!Array.isArray(deposit?.sections)) errors.push('sections 必须是数组');
  return { valid: errors.length === 0, errors };
};

/**
 * 验证大纲章节结构
 */
export const validateSection = (section) => {
  const errors = [];
  if (!section?.id) errors.push('缺少 id');
  if (!section?.title && section?.title !== '') errors.push('缺少 title');
  if (section?.level && (section.level < 1 || section.level > 4)) {
    errors.push('level 必须在 1-4 之间');
  }
  return { valid: errors.length === 0, errors };
};

/**
 * 修复并标准化沉淀记录
 */
export const normalizeDeposit = (deposit) => ({
  id: deposit?.id || `deposit_${Date.now()}`,
  name: deposit?.name || '未命名沉淀',
  createdAt: deposit?.createdAt || Date.now(),
  precipitationMode: deposit?.precipitationMode || 'llm',
  sections: safeArray(deposit?.sections).map(normalizeDepositSection),
});

/**
 * 修复并标准化沉淀章节
 */
export const normalizeDepositSection = (sec) => ({
  id: sec?.id || `dsec_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  action: sec?.action || '',
  content: sec?.content || '',
  requirements: {
    inputSource: sec?.requirements?.inputSource || '',
    actionExecution: sec?.requirements?.actionExecution || '',
    executionSummary: sec?.requirements?.executionSummary || '',
    recordLocation: sec?.requirements?.recordLocation || '',
  },
});
```

### 2.4 防抖与节流工具

```javascript
// src/sop/utils/throttle.js

/**
 * 防抖函数
 */
export const debounce = (fn, delay = 300) => {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

/**
 * 节流函数
 */
export const throttle = (fn, limit = 300) => {
  let inThrottle = false;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * 带取消的防抖
 */
export const debounceCancellable = (fn, delay = 300) => {
  let timer = null;
  const debounced = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
};
```

---

## 三、Replay 引擎重构设计

### 3.1 Replay 配置驱动架构

```javascript
// src/sop/replay/replayConfig.js

/**
 * Replay 操作类型注册表
 * 支持动态扩展新操作类型
 */
export const REPLAY_ACTIONS = {
  // 大纲操作
  outline_extract: {
    name: '大纲抽取',
    category: 'outline',
    executor: 'outlineExtractExecutor',
    requiredFields: ['docId', 'docContent'],
    optionalFields: ['existingOutline'],
    canRetry: true,
    timeout: 60000,
  },
  
  add_section: {
    name: '新增标题',
    category: 'outline',
    executor: 'addSectionExecutor',
    requiredFields: ['title', 'level', 'position'],
    optionalFields: ['summary', 'parentId'],
    canRetry: true,
    timeout: 5000,
  },
  
  delete_section: {
    name: '删除标题',
    category: 'outline',
    executor: 'deleteSectionExecutor',
    requiredFields: ['sectionId'],
    optionalFields: [],
    canRetry: true,
    timeout: 5000,
  },
  
  edit_title: {
    name: '编辑标题',
    category: 'outline',
    executor: 'editTitleExecutor',
    requiredFields: ['sectionId', 'newTitle'],
    optionalFields: ['newLevel'],
    canRetry: true,
    timeout: 5000,
  },
  
  insert_to_summary: {
    name: '插入摘要',
    category: 'outline',
    executor: 'insertSummaryExecutor',
    requiredFields: ['sectionId', 'content'],
    optionalFields: ['mode'], // 'append' | 'replace'
    canRetry: true,
    timeout: 10000,
  },
  
  // 执行指令操作
  dispatch_execute: {
    name: '执行指令',
    category: 'dispatch',
    executor: 'dispatchExecutor',
    requiredFields: ['prompt', 'targetSections'],
    optionalFields: ['systemPrompt', 'context'],
    canRetry: true,
    timeout: 120000,
  },
  
  // 文档操作
  add_doc: {
    name: '添加文档',
    category: 'document',
    executor: 'addDocExecutor',
    requiredFields: ['docName', 'docContent'],
    optionalFields: ['docType'],
    canRetry: true,
    timeout: 30000,
  },
  
  delete_doc: {
    name: '删除文档',
    category: 'document',
    executor: 'deleteDocExecutor',
    requiredFields: ['docId'],
    optionalFields: [],
    canRetry: false,
    timeout: 5000,
  },
};

/**
 * 获取操作配置
 */
export const getActionConfig = (actionType) => {
  return REPLAY_ACTIONS[actionType] || null;
};

/**
 * 注册自定义操作
 */
export const registerAction = (actionType, config) => {
  REPLAY_ACTIONS[actionType] = config;
};
```

### 3.2 Replay 执行引擎

```javascript
// src/sop/replay/replayEngine.js

import { REPLAY_ACTIONS, getActionConfig } from './replayConfig';
import { safeAsync, withRetry } from '../utils/safeOps';
import { validateDeposit, normalizeDepositSection } from '../validators/stateValidators';

/**
 * Replay 执行状态
 */
export const ReplayStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILED: 'failed',
  SKIPPED: 'skipped',
  CANCELLED: 'cancelled',
};

/**
 * Replay 执行引擎
 */
export class ReplayEngine {
  constructor(options = {}) {
    this.executors = {};
    this.hooks = {
      beforeReplay: [],
      afterReplay: [],
      onSectionStart: [],
      onSectionEnd: [],
      onError: [],
    };
    this.options = {
      stopOnError: false,        // 遇到错误是否停止
      retryOnFail: true,         // 失败是否重试
      maxRetries: 3,             // 最大重试次数
      retryDelay: 1000,          // 重试延迟
      parallelSections: false,   // 是否并行执行章节
      ...options,
    };
    this.abortController = null;
  }

  /**
   * 注册执行器
   */
  registerExecutor(name, executor) {
    this.executors[name] = executor;
  }

  /**
   * 注册钩子
   */
  on(event, callback) {
    if (this.hooks[event]) {
      this.hooks[event].push(callback);
    }
    return () => {
      this.hooks[event] = this.hooks[event].filter(cb => cb !== callback);
    };
  }

  /**
   * 触发钩子
   */
  async emit(event, ...args) {
    for (const cb of this.hooks[event] || []) {
      await cb(...args);
    }
  }

  /**
   * 执行单个沉淀的 Replay
   */
  async replayDeposit(deposit, context = {}) {
    const { valid, errors } = validateDeposit(deposit);
    if (!valid) {
      console.error('[ReplayEngine] 无效的沉淀记录:', errors);
      return { success: false, error: `验证失败: ${errors.join(', ')}` };
    }

    this.abortController = new AbortController();
    const results = {
      depositId: deposit.id,
      status: ReplayStatus.RUNNING,
      sections: [],
      startTime: Date.now(),
      endTime: null,
    };

    try {
      await this.emit('beforeReplay', deposit, context);

      for (let i = 0; i < deposit.sections.length; i++) {
        if (this.abortController.signal.aborted) {
          results.status = ReplayStatus.CANCELLED;
          break;
        }

        const section = normalizeDepositSection(deposit.sections[i]);
        const sectionResult = await this.replaySection(section, context, i);
        results.sections.push(sectionResult);

        if (sectionResult.status === ReplayStatus.FAILED && this.options.stopOnError) {
          results.status = ReplayStatus.FAILED;
          break;
        }
      }

      if (results.status === ReplayStatus.RUNNING) {
        const allSuccess = results.sections.every(s => s.status === ReplayStatus.SUCCESS);
        results.status = allSuccess ? ReplayStatus.SUCCESS : ReplayStatus.FAILED;
      }

      await this.emit('afterReplay', results, context);
    } catch (error) {
      results.status = ReplayStatus.FAILED;
      results.error = error.message;
      await this.emit('onError', error, deposit, context);
    }

    results.endTime = Date.now();
    return results;
  }

  /**
   * 执行单个章节的 Replay
   */
  async replaySection(section, context, index) {
    const result = {
      sectionId: section.id,
      index,
      status: ReplayStatus.RUNNING,
      startTime: Date.now(),
      endTime: null,
      retries: 0,
      error: null,
    };

    try {
      await this.emit('onSectionStart', section, index, context);

      // 解析操作类型
      const actionType = this.parseActionType(section);
      const actionConfig = getActionConfig(actionType);

      if (!actionConfig) {
        result.status = ReplayStatus.SKIPPED;
        result.error = `未知操作类型: ${actionType}`;
        return result;
      }

      // 获取执行器
      const executor = this.executors[actionConfig.executor];
      if (!executor) {
        result.status = ReplayStatus.SKIPPED;
        result.error = `未注册执行器: ${actionConfig.executor}`;
        return result;
      }

      // 验证必填字段
      const missingFields = this.validateRequiredFields(section, actionConfig.requiredFields);
      if (missingFields.length > 0) {
        result.status = ReplayStatus.FAILED;
        result.error = `缺少必填字段: ${missingFields.join(', ')}`;
        return result;
      }

      // 执行（带重试）
      const execFn = () => executor(section, context, {
        signal: this.abortController.signal,
        timeout: actionConfig.timeout,
      });

      if (this.options.retryOnFail && actionConfig.canRetry) {
        const execResult = await withRetry(execFn, {
          maxRetries: this.options.maxRetries,
          delay: this.options.retryDelay,
        });
        result.output = execResult;
        result.status = ReplayStatus.SUCCESS;
      } else {
        result.output = await execFn();
        result.status = ReplayStatus.SUCCESS;
      }
    } catch (error) {
      result.status = ReplayStatus.FAILED;
      result.error = error.message;
      await this.emit('onError', error, section, context);
    }

    result.endTime = Date.now();
    await this.emit('onSectionEnd', result, context);
    return result;
  }

  /**
   * 解析操作类型
   */
  parseActionType(section) {
    // 优先从 requirements.actionExecution 解析
    const actionExec = section.requirements?.actionExecution || '';
    
    // 匹配已知操作类型
    for (const actionType of Object.keys(REPLAY_ACTIONS)) {
      if (actionExec.includes(actionType) || section.action?.includes(actionType)) {
        return actionType;
      }
    }
    
    // 通过关键词推断
    const action = (section.action || '').toLowerCase();
    if (action.includes('大纲') || action.includes('outline')) return 'outline_extract';
    if (action.includes('新增标题') || action.includes('add section')) return 'add_section';
    if (action.includes('删除标题') || action.includes('delete section')) return 'delete_section';
    if (action.includes('执行指令') || action.includes('dispatch')) return 'dispatch_execute';
    if (action.includes('添加文档') || action.includes('add doc')) return 'add_doc';
    
    return 'unknown';
  }

  /**
   * 验证必填字段
   */
  validateRequiredFields(section, requiredFields) {
    const missing = [];
    for (const field of requiredFields) {
      const value = section[field] || section.requirements?.[field];
      if (value === undefined || value === null || value === '') {
        missing.push(field);
      }
    }
    return missing;
  }

  /**
   * 取消执行
   */
  cancel() {
    if (this.abortController) {
      this.abortController.abort();
    }
  }
}

/**
 * 创建默认引擎实例
 */
export const createReplayEngine = (options = {}) => {
  const engine = new ReplayEngine(options);
  
  // 注册默认执行器（占位，实际实现在各模块中）
  engine.registerExecutor('outlineExtractExecutor', async (section, ctx) => {
    // 实现大纲抽取逻辑
    console.log('[Replay] outline_extract', section);
  });
  
  engine.registerExecutor('addSectionExecutor', async (section, ctx) => {
    // 实现新增标题逻辑
    console.log('[Replay] add_section', section);
  });
  
  engine.registerExecutor('dispatchExecutor', async (section, ctx) => {
    // 实现执行指令逻辑
    console.log('[Replay] dispatch_execute', section);
  });
  
  return engine;
};
```

### 3.3 Replay 上下文管理

```javascript
// src/sop/replay/replayContext.js

/**
 * Replay 执行上下文
 * 保存执行过程中的状态，便于恢复和调试
 */
export class ReplayContext {
  constructor(initialState = {}) {
    this.state = {
      template: null,
      docs: [],
      currentDeposit: null,
      currentSection: null,
      executionLog: [],
      variables: {},
      ...initialState,
    };
    this.snapshots = [];
  }

  /**
   * 获取状态值
   */
  get(key) {
    return this.state[key];
  }

  /**
   * 设置状态值
   */
  set(key, value) {
    this.state[key] = value;
    return this;
  }

  /**
   * 更新多个状态
   */
  update(updates) {
    Object.assign(this.state, updates);
    return this;
  }

  /**
   * 创建快照
   */
  snapshot(label = '') {
    this.snapshots.push({
      label,
      timestamp: Date.now(),
      state: JSON.parse(JSON.stringify(this.state)),
    });
    return this;
  }

  /**
   * 恢复快照
   */
  restore(index = -1) {
    const snapshot = index < 0 
      ? this.snapshots[this.snapshots.length + index]
      : this.snapshots[index];
    if (snapshot) {
      this.state = JSON.parse(JSON.stringify(snapshot.state));
    }
    return this;
  }

  /**
   * 记录执行日志
   */
  log(message, data = {}) {
    this.state.executionLog.push({
      timestamp: Date.now(),
      message,
      data,
    });
    return this;
  }

  /**
   * 设置变量（用于条件判断）
   */
  setVariable(name, value) {
    this.state.variables[name] = value;
    return this;
  }

  /**
   * 获取变量
   */
  getVariable(name, defaultValue = undefined) {
    return this.state.variables[name] ?? defaultValue;
  }

  /**
   * 导出状态（用于调试）
   */
  export() {
    return {
      state: this.state,
      snapshots: this.snapshots,
    };
  }
}
```

---

## 四、实施优先级与时间线

### 优先级排序

| 优先级 | 任务 | 预计收益 | 复杂度 |
|--------|------|----------|--------|
| P0 | 安全工具函数 (safeOps) | 立即减少运行时错误 | 低 |
| P0 | 状态验证器 | 防止无效数据 | 低 |
| P1 | Replay 引擎重构 | 提高可维护性和扩展性 | 中 |
| P1 | useDeposits Hook | 减少约 600 行 | 中 |
| P1 | useOutline Hook | 减少约 800 行 | 中 |
| P2 | useLayoutEditor Hook | 减少约 500 行 | 中 |
| P2 | useDocuments Hook | 减少约 400 行 | 低 |
| P3 | 剩余组件拆分 | 减少约 1500 行 | 低 |

### 建议实施顺序

```
Phase 0: 基础设施（1-2天）
├── safeOps.js 安全操作工具
├── stateValidators.js 状态验证器
├── ErrorBoundary.jsx 错误边界
└── throttle.js 防抖节流

Phase 1: Replay 引擎（2-3天）
├── replayConfig.js 配置驱动
├── replayEngine.js 执行引擎
├── replayContext.js 上下文管理
└── 集成到 SOPWorkbench

Phase 2: 自定义 Hooks（3-4天）
├── useDeposits.js
├── useOutline.js
├── useLayoutEditor.js
└── useDocuments.js

Phase 3: 组件拆分（2天）
├── 剩余 Modal 组件
└── 剩余 Panel 组件
```

---

## 五、预期效果

| 指标 | 当前 | 目标 | 改进 |
|------|------|------|------|
| SOPWorkbench.jsx 行数 | 22,284 | ~13,000 | -42% |
| 运行时错误率 | - | 减少 50%+ | 安全函数 + 验证器 |
| Replay 可配置性 | 低 | 高 | 配置驱动架构 |
| 新增操作类型 | 需改代码 | 仅需配置 | 注册表模式 |
| 单元测试覆盖 | 低 | 高 | 模块独立可测 |

---

## 六、文件结构规划

```
src/sop/
├── index.js                    # 统一导出
├── SOPConstants.js             # ✅ 已完成
├── SOPUtils.js                 # ✅ 已完成
├── SOPHistory.jsx              # ✅ 已完成
├── SOPToolbar.jsx              # ✅ 已完成
│
├── hooks/                      # 自定义 Hooks
│   ├── index.js
│   ├── useOutline.js
│   ├── useDeposits.js
│   ├── useLayoutEditor.js
│   ├── useDocuments.js
│   ├── useProcessing.js
│   └── useHistory.js
│
├── logic/                      # 业务逻辑
│   ├── index.js
│   ├── outlineOps.js
│   ├── depositOps.js
│   └── dispatchOps.js
│
├── replay/                     # Replay 系统
│   ├── index.js
│   ├── replayConfig.js
│   ├── replayEngine.js
│   ├── replayContext.js
│   └── executors/
│       ├── outlineExecutors.js
│       ├── dispatchExecutors.js
│       └── documentExecutors.js
│
├── utils/                      # 工具函数
│   ├── safeOps.js
│   ├── throttle.js
│   └── formatters.js
│
├── validators/                 # 验证器
│   ├── stateValidators.js
│   └── configValidators.js
│
├── errors/                     # 错误处理
│   ├── ErrorBoundary.jsx
│   └── errorTypes.js
│
├── panels/                     # ✅ 已完成部分
│   ├── index.js
│   ├── AppButtonsConfigPanel.jsx
│   ├── GlobalButtonsConfigPanel.jsx
│   ├── DepositPanels.jsx
│   └── OutlineNode.jsx
│
└── modals/                     # Modal 组件
    ├── DepositConfirmModal.jsx
    ├── UpdateGroupModal.jsx
    └── BackofficeConfigModal.jsx
```

---

*计划版本: v2.0*  
*更新日期: 2026-01-24*
