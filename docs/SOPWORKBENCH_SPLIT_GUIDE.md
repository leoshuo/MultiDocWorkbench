# SOPWorkbench 模块化拆分实施指南

**版本**: v1.0  
**日期**: 2026-01-27  
**目标**: 将SOPWorkbench.jsx从11,784行拆分至~3,500行

---

## 一、拆分策略概览

### 1.1 拆分原则

1. **按功能领域拆分**: 大纲、沉淀、文档、布局等
2. **状态与逻辑分离**: Hooks管理状态，logic模块处理业务逻辑
3. **渐进式重构**: 每次拆分一个模块，确保功能正常
4. **向后兼容**: 保持API接口不变，内部实现重构

### 1.2 拆分顺序

```
Phase 0: 基础设施 (1-2天)
  ↓
Phase 1: 自定义Hooks (3-4天)
  ├─ useOutline (最大，优先)
  ├─ useDeposits
  ├─ useLayoutEditor
  ├─ useDocuments
  ├─ useProcessing
  └─ useHistory
  ↓
Phase 2: 业务逻辑 (2-3天)
  ├─ outlineOps
  ├─ depositOps
  ├─ dispatchOps
  └─ documentOps
  ↓
Phase 3: 组件拆分 (2-3天)
  ↓
Phase 4: Replay执行器 (1-2天)
```

---

## 二、Phase 0: 基础设施完善

### 2.1 增强ErrorBoundary

**文件**: `src/sop/errors/ErrorBoundary.jsx`

```javascript
import React from 'react';
import { safeString } from '../utils/safeOps';

export class SOPErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    return { 
      hasError: true, 
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[SOP ErrorBoundary] 捕获错误:', error);
    console.error('[SOP ErrorBoundary] 组件堆栈:', errorInfo?.componentStack);
    
    this.setState({ errorInfo });
    
    // 错误上报（可选）
    if (this.props.onError) {
      this.props.onError(error, errorInfo, this.state.errorId);
    }
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null 
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>❌ 发生错误</h2>
          <p>错误ID: {this.state.errorId}</p>
          <p>{safeString(this.state.error?.message, '未知错误')}</p>
          <button onClick={this.handleRetry}>重试</button>
          <button onClick={() => window.location.reload()}>刷新页面</button>
          {process.env.NODE_ENV === 'development' && (
            <details style={{ marginTop: '20px', textAlign: 'left' }}>
              <summary>错误详情（开发模式）</summary>
              <pre>{this.state.error?.stack}</pre>
              <pre>{this.state.errorInfo?.componentStack}</pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 2.2 错误类型定义

**文件**: `src/sop/errors/errorTypes.js`

```javascript
/**
 * SOP错误类型定义
 */

export const ErrorCodes = {
  // 大纲相关
  OUTLINE_INVALID: 'OUTLINE_INVALID',
  OUTLINE_NOT_FOUND: 'OUTLINE_NOT_FOUND',
  SECTION_INVALID: 'SECTION_INVALID',
  
  // 沉淀相关
  DEPOSIT_INVALID: 'DEPOSIT_INVALID',
  DEPOSIT_NOT_FOUND: 'DEPOSIT_NOT_FOUND',
  
  // 文档相关
  DOC_UPLOAD_FAILED: 'DOC_UPLOAD_FAILED',
  DOC_PARSE_FAILED: 'DOC_PARSE_FAILED',
  
  // 调度相关
  DISPATCH_FAILED: 'DISPATCH_FAILED',
  LLM_CALL_FAILED: 'LLM_CALL_FAILED',
  
  // 通用
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
};

export class SOPError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'SOPError';
    this.code = code;
    this.details = details;
    this.timestamp = Date.now();
  }
}

export const createError = (code, message, details) => {
  return new SOPError(code, message, details);
};
```

### 2.3 格式化工具

**文件**: `src/sop/utils/formatters.js`

```javascript
import { safeString, safeNumber } from './safeOps';

/**
 * 格式化文件大小
 */
export const formatFileSize = (bytes) => {
  const size = safeNumber(bytes, 0);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
};

/**
 * 格式化时间戳
 */
export const formatTimestamp = (timestamp, format = 'YYYY-MM-DD HH:mm:ss') => {
  const ts = safeNumber(timestamp, Date.now());
  const date = new Date(ts);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
};

/**
 * 格式化相对时间
 */
export const formatRelativeTime = (timestamp) => {
  const ts = safeNumber(timestamp, Date.now());
  const now = Date.now();
  const diff = now - ts;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}天前`;
  if (hours > 0) return `${hours}小时前`;
  if (minutes > 0) return `${minutes}分钟前`;
  return '刚刚';
};

/**
 * 截断文本
 */
export const truncateText = (text, maxLength = 50, suffix = '...') => {
  const str = safeString(text, '');
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + suffix;
};
```

---

## 三、Phase 1: 自定义Hooks拆分

### 3.1 useOutline Hook

**文件**: `src/sop/hooks/useOutline.js`

**步骤1**: 识别相关状态和函数

从SOPWorkbench.jsx中提取：
- 状态: `template`, `outlineEditing`, `sectionDocLinks`, `sectionDocPick`, `selectedOutlineExec`, `sectionCollapsed`, `sectionMergeType`
- 函数: `buildSectionTree`, `addSection`, `deleteSection`, `updateSection`, 等

**步骤2**: 创建Hook文件

```javascript
import { useState, useCallback, useMemo } from 'react';
import { safeArray, safeObject, safeString } from '../utils/safeOps';
import { buildSectionTree } from '../SOPUtils';
import * as outlineOps from '../logic/outlineOps';

/**
 * 大纲管理Hook
 * 管理大纲状态和操作
 */
export function useOutline(initialTemplate = null) {
  // ========== 状态定义 ==========
  const [template, setTemplate] = useState(initialTemplate);
  const [outlineEditing, setOutlineEditing] = useState({});
  const [sectionDocLinks, setSectionDocLinks] = useState({});
  const [sectionDocPick, setSectionDocPick] = useState({});
  const [selectedOutlineExec, setSelectedOutlineExec] = useState({});
  const [sectionCollapsed, setSectionCollapsed] = useState({});
  const [sectionMergeType, setSectionMergeType] = useState({});

  // ========== 计算属性 ==========
  const sectionTree = useMemo(() => {
    if (!template || !Array.isArray(template.sections)) {
      return [];
    }
    return buildSectionTree(template.sections);
  }, [template]);

  // ========== 操作方法 ==========
  const addSection = useCallback((parentId, title, level = 1) => {
    setTemplate(prev => {
      if (!prev) return prev;
      const newSection = outlineOps.createSection(title, level, parentId);
      return {
        ...prev,
        sections: [...safeArray(prev.sections), newSection]
      };
    });
  }, []);

  const deleteSection = useCallback((sectionId) => {
    setTemplate(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: safeArray(prev.sections).filter(s => s.id !== sectionId)
      };
    });
  }, []);

  const updateSection = useCallback((sectionId, updates) => {
    setTemplate(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: safeArray(prev.sections).map(s => 
          s.id === sectionId ? { ...s, ...updates } : s
        )
      };
    });
  }, []);

  const linkSectionToDoc = useCallback((sectionId, docId) => {
    setSectionDocLinks(prev => ({
      ...prev,
      [sectionId]: [...safeArray(prev[sectionId]), docId]
    }));
  }, []);

  const toggleSectionCollapse = useCallback((sectionId) => {
    setSectionCollapsed(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  }, []);

  // ========== 返回值 ==========
  return {
    // 状态
    template,
    setTemplate,
    outlineEditing,
    setOutlineEditing,
    sectionDocLinks,
    setSectionDocLinks,
    sectionDocPick,
    setSectionDocPick,
    selectedOutlineExec,
    setSelectedOutlineExec,
    sectionCollapsed,
    setSectionCollapsed,
    sectionMergeType,
    setSectionMergeType,
    
    // 计算属性
    sectionTree,
    
    // 方法
    addSection,
    deleteSection,
    updateSection,
    linkSectionToDoc,
    toggleSectionCollapse,
  };
}
```

**步骤3**: 在SOPWorkbench.jsx中使用

```javascript
// 替换原来的状态定义
// const [template, setTemplate] = useState(null);
// const [outlineEditing, setOutlineEditing] = useState({});
// ... 其他状态

// 改为：
import { useOutline } from './sop/hooks/useOutline';

export default function SOPWorkbench({ onSwitch }) {
  const outline = useOutline();
  
  // 使用 outline.template 替代 template
  // 使用 outline.addSection 替代原来的函数
  // ...
}
```

### 3.2 useDeposits Hook

**文件**: `src/sop/hooks/useDeposits.js`

```javascript
import { useState, useCallback, useEffect } from 'react';
import { safeArray, safeObject } from '../utils/safeOps';
import { loadDepositsFromStorage, loadDepositsSeqFromStorage } from '../SOPUtils';
import { validateDeposit, normalizeDeposit } from '../validators/stateValidators';
import * as depositOps from '../logic/depositOps';

/**
 * 沉淀管理Hook
 */
export function useDeposits() {
  const [deposits, setDeposits] = useState([]);
  const [depositGroups, setDepositGroups] = useState([]);
  const [selectedDepositId, setSelectedDepositId] = useState(null);
  const [replayState, setReplayState] = useState(null);
  const [isDepositing, setIsDepositing] = useState(false);

  // 从存储加载
  useEffect(() => {
    const loaded = loadDepositsFromStorage();
    if (loaded && loaded.length > 0) {
      setDeposits(loaded);
    }
    
    const groups = loadDepositsSeqFromStorage();
    if (groups && groups.length > 0) {
      setDepositGroups(groups);
    }
  }, []);

  const createDeposit = useCallback((name, sections = []) => {
    const deposit = depositOps.createDeposit(name, sections);
    setDeposits(prev => [...prev, deposit]);
    return deposit;
  }, []);

  const updateDeposit = useCallback((depositId, updates) => {
    setDeposits(prev => prev.map(d => 
      d.id === depositId ? { ...d, ...updates } : d
    ));
  }, []);

  const deleteDeposit = useCallback((depositId) => {
    setDeposits(prev => prev.filter(d => d.id !== depositId));
    // 同时从分组中移除
    setDepositGroups(prev => prev.map(g => ({
      ...g,
      depositIds: safeArray(g.depositIds).filter(id => id !== depositId)
    })));
  }, []);

  const createGroup = useCallback((name, depositIds = []) => {
    const group = depositOps.createGroup(name, depositIds);
    setDepositGroups(prev => [...prev, group]);
    return group;
  }, []);

  return {
    // 状态
    deposits,
    setDeposits,
    depositGroups,
    setDepositGroups,
    selectedDepositId,
    setSelectedDepositId,
    replayState,
    setReplayState,
    isDepositing,
    setIsDepositing,
    
    // 方法
    createDeposit,
    updateDeposit,
    deleteDeposit,
    createGroup,
  };
}
```

### 3.3 useLayoutEditor Hook

**文件**: `src/sop/hooks/useLayoutEditor.js`

```javascript
import { useState, useCallback, useEffect } from 'react';
import { safeJsonParse, safeObject } from '../utils/safeOps';
import { loadLayoutConfig, saveLayoutConfig } from '../../layoutEditor';

/**
 * 布局编辑Hook
 */
export function useLayoutEditor() {
  const [panelPositions, setPanelPositions] = useState(() => {
    const saved = loadLayoutConfig();
    return saved || DEFAULT_LAYOUT;
  });

  const [buttonPositions, setButtonPositions] = useState(() => {
    try {
      const saved = localStorage.getItem('layout_button_positions');
      return saved ? safeJsonParse(saved, {}) : {};
    } catch {
      return {};
    }
  });

  const [isEditingLayout, setIsEditingLayout] = useState(false);

  // 保存到localStorage
  useEffect(() => {
    if (panelPositions) {
      saveLayoutConfig(panelPositions);
    }
  }, [panelPositions]);

  useEffect(() => {
    if (buttonPositions) {
      try {
        localStorage.setItem('layout_button_positions', JSON.stringify(buttonPositions));
      } catch (e) {
        console.warn('保存按钮位置失败:', e);
      }
    }
  }, [buttonPositions]);

  const updatePanelPosition = useCallback((panelId, position) => {
    setPanelPositions(prev => ({
      ...prev,
      [panelId]: { ...safeObject(prev[panelId]), ...position }
    }));
  }, []);

  const updateButtonPosition = useCallback((buttonId, position) => {
    setButtonPositions(prev => ({
      ...prev,
      [buttonId]: { ...safeObject(prev[buttonId]), ...position }
    }));
  }, []);

  const resetLayout = useCallback(() => {
    setPanelPositions(DEFAULT_LAYOUT);
    setButtonPositions({});
  }, []);

  return {
    panelPositions,
    setPanelPositions,
    buttonPositions,
    setButtonPositions,
    isEditingLayout,
    setIsEditingLayout,
    updatePanelPosition,
    updateButtonPosition,
    resetLayout,
  };
}
```

---

## 四、Phase 2: 业务逻辑模块

### 4.1 outlineOps.js

**文件**: `src/sop/logic/outlineOps.js`

```javascript
import { safeArray, safeObject, safeString, safeNumber } from '../utils/safeOps';
import { randomUUID } from '../../utils/id';

/**
 * 创建新章节
 */
export function createSection(title, level = 1, parentId = null) {
  return {
    id: randomUUID(),
    title: safeString(title, ''),
    summary: '',
    hint: '',
    level: Math.min(4, Math.max(1, safeNumber(level, 1))),
    parentId: parentId || null,
    createdAt: Date.now(),
  };
}

/**
 * 查找章节
 */
export function findSectionById(sections, sectionId) {
  return safeArray(sections).find(s => s.id === sectionId);
}

/**
 * 获取章节路径（从根到当前）
 */
export function getSectionPath(sections, sectionId) {
  const path = [];
  let current = findSectionById(sections, sectionId);
  
  while (current) {
    path.unshift(current);
    current = current.parentId 
      ? findSectionById(sections, current.parentId)
      : null;
  }
  
  return path;
}

/**
 * 获取子章节
 */
export function getChildSections(sections, parentId) {
  return safeArray(sections).filter(s => s.parentId === parentId);
}

/**
 * 验证章节树
 */
export function validateSectionTree(sections) {
  const errors = [];
  const sectionIds = new Set();
  
  safeArray(sections).forEach((section, index) => {
    if (!section.id) {
      errors.push(`[${index}] 缺少id`);
      return;
    }
    
    if (sectionIds.has(section.id)) {
      errors.push(`[${index}] 重复的id: ${section.id}`);
    }
    sectionIds.add(section.id);
    
    if (section.parentId && !findSectionById(sections, section.parentId)) {
      errors.push(`[${index}] 父章节不存在: ${section.parentId}`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
```

### 4.2 depositOps.js

**文件**: `src/sop/logic/depositOps.js`

```javascript
import { safeArray, safeString } from '../utils/safeOps';
import { validateDeposit, normalizeDeposit } from '../validators/stateValidators';
import { randomUUID } from '../../utils/id';

/**
 * 创建沉淀记录
 */
export function createDeposit(name, sections = []) {
  const deposit = {
    id: randomUUID(),
    name: safeString(name, '未命名沉淀'),
    sections: safeArray(sections),
    createdAt: Date.now(),
    precipitationMode: 'llm',
  };
  
  return normalizeDeposit(deposit);
}

/**
 * 创建沉淀分组
 */
export function createGroup(name, depositIds = []) {
  return {
    id: randomUUID(),
    name: safeString(name, '未命名分组'),
    depositIds: safeArray(depositIds),
    createdAt: Date.now(),
  };
}
```

---

## 五、实施检查清单

### 5.1 拆分前准备

- [ ] 备份当前代码
- [ ] 创建feature分支
- [ ] 运行现有测试（如有）
- [ ] 记录当前功能状态

### 5.2 拆分过程

- [ ] 创建新文件
- [ ] 提取相关代码
- [ ] 更新导入/导出
- [ ] 更新SOPWorkbench.jsx
- [ ] 测试功能是否正常

### 5.3 拆分后验证

- [ ] 功能测试（所有功能正常）
- [ ] 性能测试（无明显下降）
- [ ] 代码审查
- [ ] 更新文档

---

## 六、常见问题

### Q1: 如何确保拆分后功能不变？

**A**: 
1. 每次只拆分一个模块
2. 拆分后立即测试相关功能
3. 保留原代码注释，便于对比
4. 使用Git分支，可随时回滚

### Q2: 如何处理状态依赖？

**A**: 
1. 将共享状态提升到父组件
2. 使用Context API（如需要）
3. 通过props传递状态更新函数

### Q3: 如何测试新模块？

**A**: 
1. 为每个Hook编写单元测试
2. 使用React Testing Library测试组件
3. 集成测试验证完整流程

---

## 七、参考资源

- [React Hooks最佳实践](https://react.dev/reference/react)
- [代码重构技巧](https://refactoring.guru/refactoring)
- [模块化设计原则](https://en.wikipedia.org/wiki/Modular_programming)

---

**文档版本**: v1.0  
**最后更新**: 2026-01-27
