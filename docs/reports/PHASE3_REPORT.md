# 阶段3报告：Multi工作台模块拆分

## 执行时间
2026-01-24

## 完成内容

### 1. 创建的模块文件

| 文件 | 行数 | 说明 |
|------|------|------|
| `src/multi/MultiConstants.js` | ~90 | UI_TEXT、存储键、面板配置、Mock数据 |
| `src/multi/MultiUtils.js` | ~240 | API请求、Replay解析、文件处理 |
| `src/multi/index.js` | ~10 | 统一导出入口 |

### 2. 模块内容说明

#### MultiConstants.js
- `UI_TEXT` - 13条UI文本常量
- `REPLAY_META_MARKER`, `SHARED_SCENE_KEY` - 存储键
- `DEFAULT_DISPATCH_SYSTEM_PROMPT` - 默认Prompt
- `DEFAULT_APP_BUTTONS` - 默认应用按钮
- `PANEL_IDS`, `DEFAULT_PANEL_VISIBILITY`, `DEFAULT_PANEL_POSITIONS` - 面板配置
- `MOCK_SOURCES`, `MOCK_MESSAGES`, `MOCK_NOTES` - Mock数据

#### MultiUtils.js
- `fetchJson()` - 通用JSON请求
- `extractReplayMeta()` - Replay元数据提取
- `parseSectionContent()` - Section内容解析
- `loadSharedScene()` - 共享场景加载
- `isDocxName()`, `loadMammoth()`, `readFileText()` - 文件处理
- `htmlToStructuredText()`, `parseDocxFileToStructuredText()` - 文档转换
- `formatDocSize()` - 格式化显示

### 3. 采用的策略

**与阶段2相同的渐进式迁移策略**：
- 原文件 `src/MultiDocWorkbench.jsx` 保持不变
- 模块文件已准备好，可在后续迭代中逐步迁移

## 验证状态
- [x] 模块文件创建成功
- [x] 语法检查通过
- [x] 原文件构建正常

## 后续迁移指南

当需要使用模块时，在 MultiDocWorkbench.jsx 顶部添加导入：

```javascript
import {
  UI_TEXT,
  REPLAY_META_MARKER,
  DEFAULT_APP_BUTTONS,
  // ... 其他常量
} from './multi/MultiConstants';

import {
  fetchJson,
  extractReplayMeta,
  // ... 其他工具函数
} from './multi/MultiUtils';
```

然后删除文件中对应的本地定义即可。

## 风险评估
- 风险等级：低
- 说明：采用渐进式策略，原文件未修改
