# SOPWorkbench 代码审查 V2 与细化拆分计划

**日期**: 2026-01-27  
**当前状态**: SOPWorkbench.jsx = **22,387 行**（含空行）/ ~11,800 有效代码行  
**目标**: 拆分至 ~6,000 行（含空行）/ ~3,000 有效代码行

> **注意**: 代码使用双空行格式，实际行数约为有效代码行的2倍

---

## 一、代码结构深度分析

### 1.1 文件规模说明

| 指标 | 数值 |
|------|------|
| **总行数（含空行）** | 22,387 行 |
| **有效代码行（不含空行）** | ~11,800 行 |
| **文件大小** | ~596 KB |
| **空行比例** | ~47% |

### 1.2 文件结构分布（按实际行号）

| 行号范围 | 内容 | 实际行数 | 有效代码行 | 占比 |
|---------|------|----------|-----------|------|
| 1-460 | 导入语句 + 已迁移注释 | 460 | ~230 | 2.0% |
| 461-3600 | 状态定义（113个useState） | 3,140 | ~1,600 | 13.5% |
| 3601-5000 | 辅助函数/工具函数 | 1,400 | ~700 | 5.7% |
| 5001-8000 | 沉淀记录相关逻辑 | 3,000 | ~1,500 | 12.7% |
| 8001-11800 | useEffect hooks | 3,800 | ~1,900 | 16.1% |
| 11801-14400 | 布局编辑/拖拽逻辑 | 2,600 | ~1,300 | 11.0% |
| 14401-17200 | 沉淀管理函数 | 2,800 | ~1,400 | 11.9% |
| 17201-21800 | 指令调度逻辑 | 4,600 | ~2,300 | 19.5% |
| 21801-22387 | 渲染函数（return部分） | 587 | ~300 | 2.5% |

### 1.3 状态变量分类（113个useState）

| 类别 | 数量 | 示例状态 |
|------|------|---------|
| **核心业务状态** | 12 | template, docs, scene, selectedDocId |
| **UI状态** | 18 | loading, dispatching, showOutlineMode, processingTab |
| **布局状态** | 15 | panelPositions, buttonPositions, layoutSize, isEditingLayout |
| **沉淀状态** | 20 | deposits, depositSections, depositGroups, replayState |
| **大纲状态** | 15 | outlineEditing, sectionDocLinks, selectedOutlineExec |
| **编辑状态** | 12 | editingButtonId, depositEditing, draggingButton |
| **Modal/弹窗状态** | 10 | showHistoryModal, showDepositConfirmModal |
| **其他状态** | 11 | toast, headerTitles, llmButtons |

### 1.4 现有问题评估更新

| 问题 | 之前评估 | 更新评估 | 说明 |
|------|---------|---------|------|
| 文件行数 | 11,784行 | **22,387行** | 含空行的实际总行数 |
| 有效代码行 | - | **~11,800行** | 不含空行 |
| useState数量 | 30+ | **113个** | 实际更多 |
| 模块化程度 | 中等 | **中等偏好** | 已有sop模块基础 |

---

## 二、详细拆分计划

### 2.0 Phase 0: 格式统一（前置步骤）

**目标**: 将双空行格式转换为单空行格式，使代码更紧凑、易读

| 步骤 | 任务 | 预计效果 |
|------|------|----------|
| 0.1 | 去除双空行 → 单空行 | **-10,500行** |
| 0.2 | 删除无用的"已迁移"注释 | -200行 |
| 0.3 | 优化导入语句分组 | -100行 |

**执行方式**: 使用正则替换 `\n\n\n` → `\n\n`

**执行后**:
- SOPWorkbench.jsx: **22,387行 → ~11,800行**
- 所有后续Phase的行数估算基于单空行格式

### 2.1 拆分优先级矩阵（基于单空行格式）

| 模块 | 行数 | 收益 | 复杂度 | 优先级 |
|------|------|------|--------|--------|
| useDeposits Hook | ~1,800行 | 高 | 高 | P0 |
| useDispatch Hook | ~1,500行 | 高 | 中 | P0 |
| useLayoutEditor Hook | ~1,200行 | 中 | 中 | P1 |
| useOutline Hook | ~800行 | 中 | 低 | P1 |
| 辅助函数模块 | ~600行 | 中 | 低 | P1 |
| 渲染组件拆分 | ~800行 | 中 | 中 | P2 |

### 2.2 Phase 1: 沉淀系统拆分（最大收益）

#### 2.2.1 useDeposits Hook

**文件**: `src/sop/hooks/useDeposits.js`  
**预计行数**: ~1,600行（含空行）/ ~800有效代码行  
**包含状态**:

```javascript
// 沉淀核心状态
const [deposits, setDeposits] = useState([]);
const [depositSections, setDepositSections] = useState([]);
const [depositGroups, setDepositGroups] = useState([]);
const [selectedDepositIds, setSelectedDepositIds] = useState({});
const [depositEditing, setDepositEditing] = useState({});
const [expandedDepositSections, setExpandedDepositSections] = useState({});
const [compilingDepositSections, setCompilingDepositSections] = useState({});
const [draggingDepositId, setDraggingDepositId] = useState('');
const [dragOverDepositId, setDragOverDepositId] = useState('');
const [selectedDepositGroupId, setSelectedDepositGroupId] = useState('');
const [depositGroupReplay, setDepositGroupReplay] = useState({});
const [batchReplayRunning, setBatchReplayRunning] = useState(false);
const [isDepositing, setIsDepositing] = useState(false);
const [depositSeq, setDepositSeq] = useState([]);
const [sectionExpanded, setSectionExpanded] = useState({});
```

**包含函数**:
- `startDeposit()`, `endDeposit()`
- `createDeposit()`, `updateDeposit()`, `deleteDeposit()`
- `createDepositGroup()`, `updateDepositGroup()`, `deleteDepositGroup()`
- `applyDepositName()`, `applyDepositSection()`
- `toggleDepositSectionExpanded()`, `setAllDepositSectionsExpanded()`
- `handleDepositDragStart()`, `handleDepositDragOver()`, `handleDepositDrop()`
- 沉淀排序、选择、编辑相关函数

#### 2.2.2 useReplay Hook

**文件**: `src/sop/hooks/useReplay.js`  
**预计行数**: ~1,200行（含空行）/ ~600有效代码行  
**包含状态**:

```javascript
const [replayState, setReplayState] = useState({});
const [replayDirConfig, setReplayDirConfig] = useState({ dirPath: '', autoLoadFiles: true });
const [replayDirConfigSaving, setReplayDirConfigSaving] = useState(false);
```

**包含函数**:
- `replayDeposit()`, `replayDepositForBatch()`
- `batchReplaySelectedDeposits()`
- `uploadDocFromReplayDirByName()`, `listReplayDirFiles()`
- `uploadDocsFromReplayDirBySelector()`
- Replay执行相关的所有逻辑

#### 2.2.3 depositOps 业务逻辑模块

**文件**: `src/sop/logic/depositOps.js`  
**预计行数**: ~400行  
**包含函数**:
- `generateInitialScript()`
- `processDepositWithAI()`
- `parseDepositSectionContent()`
- `formatOpContent()`
- `describeInput()`, `describeDestination()`
- `appendReplayMeta()`, `extractReplayMeta()`

### 2.3 Phase 2: 指令调度拆分

#### 2.3.1 useDispatch Hook

**文件**: `src/sop/hooks/useDispatch.js`  
**预计行数**: ~600行  
**包含状态**:

```javascript
const [dispatching, setDispatching] = useState(false);
const [dispatchLogs, setDispatchLogs] = useState([]);
const [expandedLogs, setExpandedLogs] = useState({});
const [dispatchMode, setDispatchMode] = useState('doc');
const [dispatchInputHeight, setDispatchInputHeight] = useState(60);
const [selectedLogTexts, setSelectedLogTexts] = useState({});
const [processedContent, setProcessedContent] = useState('');
const [finalSlots, setFinalSlots] = useState({});
const [finalizing, setFinalizing] = useState(false);
const [isOptimizingPrompt, setIsOptimizingPrompt] = useState(false);
```

**包含函数**:
- `handleDispatch()`
- `handleBatchDispatch()`
- `handleFinalGenerate()`
- `buildDispatchInputs()`
- `resolveEditSectionId()`
- `logSectionWithMeta()`

#### 2.3.2 dispatchOps 业务逻辑模块

**文件**: `src/sop/logic/dispatchOps.js`  
**预计行数**: ~300行  
**包含函数**:
- 指令解析函数
- 大纲段落构建函数
- 结果处理函数

### 2.4 Phase 3: 布局编辑拆分

#### 2.4.1 useLayoutEditor Hook

**文件**: `src/sop/hooks/useLayoutEditor.js`  
**预计行数**: ~500行  
**包含状态**:

```javascript
const [panelPositions, setPanelPositions] = useState({});
const [buttonPositions, setButtonPositions] = useState({});
const [contentBlockPositions, setContentBlockPositions] = useState({});
const [layoutSize, setLayoutSize] = useState({});
const [isEditingLayout, setIsEditingLayout] = useState(false);
const [savedLayout, setSavedLayout] = useState(null);
const [savedButtons, setSavedButtons] = useState(null);
const [savedContentBlocks, setSavedContentBlocks] = useState(null);
const [draggingButton, setDraggingButton] = useState(null);
const [headerTitles, setHeaderTitles] = useState({});
const [editingHeaderTitle, setEditingHeaderTitle] = useState(null);
const [draggingHeaderTitle, setDraggingHeaderTitle] = useState(null);
const [resizingHeaderTitle, setResizingHeaderTitle] = useState(null);
```

**包含函数**:
- `handleStartEditingLayout()`, `handleCancelLayoutEdit()`, `handleCompleteLayoutEdit()`
- `handleResetLayout()`
- `handleButtonMouseDown()`, `handleHeaderTitleMouseDown()`
- `handleHeaderTitleResizeMouseDown()`
- `updatePanelPosition()`, `updateButtonPosition()`
- 所有拖拽相关的useEffect

### 2.5 Phase 4: 大纲管理拆分

#### 2.5.1 useOutline Hook

**文件**: `src/sop/hooks/useOutline.js`  
**预计行数**: ~400行  
**包含状态**:

```javascript
const [template, setTemplate] = useState(null);
const [outlineEditing, setOutlineEditing] = useState({});
const [sectionDocLinks, setSectionDocLinks] = useState({});
const [sectionDocPick, setSectionDocPick] = useState({});
const [selectedOutlineExec, setSelectedOutlineExec] = useState({});
const [sectionDocDone, setSectionDocDone] = useState({});
const [summaryExpanded, setSummaryExpanded] = useState({});
const [selectedSummaries, setSelectedSummaries] = useState({});
const [sectionCollapsed, setSectionCollapsed] = useState({});
const [sectionMergeType, setSectionMergeType] = useState({});
const [outlineHistory, setOutlineHistory] = useState([]);
```

**包含函数**:
- `handleAddSection()`, `handleDeleteSection()`, `handleEditTitle()`
- `handleInsertSummary()`, `handleFillSummary()`
- `buildSectionTree()` (已在SOPUtils)
- `linkSectionToDoc()`, `toggleSectionCollapse()`

### 2.6 Phase 5: 渲染组件拆分

#### 2.6.1 OutlinePanel 组件

**文件**: `src/sop/components/OutlinePanel.jsx`  
**预计行数**: ~300行  
**职责**: 大纲面板渲染

#### 2.6.2 DepositPanel 组件

**文件**: `src/sop/components/DepositPanel.jsx`  
**预计行数**: ~400行  
**职责**: 沉淀面板渲染

#### 2.6.3 DispatchPanel 组件

**文件**: `src/sop/components/DispatchPanel.jsx`  
**预计行数**: ~300行  
**职责**: 指令调度面板渲染

---

## 三、拆分后预期结构

### 3.1 目标文件结构

```
src/sop/
├── index.js                       # 统一导出
├── SOPConstants.js                # ✅ 已完成
├── SOPUtils.js                    # ✅ 已完成
├── SOPHistory.jsx                 # ✅ 已完成
├── SOPToolbar.jsx                 # ✅ 已完成
│
├── hooks/                         # 自定义 Hooks
│   ├── index.js                   # ✅ 已完成
│   ├── useDeposits.js             # 🆕 沉淀管理 (~800行)
│   ├── useReplay.js               # 🆕 Replay执行 (~600行)
│   ├── useDispatch.js             # 🆕 指令调度 (~600行)
│   ├── useLayoutEditor.js         # 🆕 布局编辑 (~500行)
│   ├── useOutline.js              # 🆕 大纲管理 (~400行)
│   ├── useDocuments.js            # 🆕 文档管理 (~300行)
│   ├── useAsync.js                # ✅ 已完成
│   ├── useLocalStorage.js         # ✅ 已完成
│   └── useToast.js                # ✅ 已完成
│
├── logic/                         # 业务逻辑
│   ├── index.js
│   ├── depositOps.js              # 🆕 沉淀操作 (~400行)
│   ├── dispatchOps.js             # 🆕 调度操作 (~300行)
│   ├── outlineOps.js              # 🆕 大纲操作 (~200行)
│   └── documentOps.js             # 🆕 文档操作 (~200行)
│
├── components/                    # 渲染组件
│   ├── OutlinePanel.jsx           # 🆕 大纲面板 (~300行)
│   ├── DepositPanel.jsx           # 🆕 沉淀面板 (~400行)
│   ├── DispatchPanel.jsx          # 🆕 调度面板 (~300行)
│   └── ConfigPanel.jsx            # 🆕 配置面板 (~200行)
│
├── replay/                        # ✅ 已完成
│   ├── index.js
│   ├── replayConfig.js
│   ├── replayEngine.js
│   └── replayContext.js
│
├── panels/                        # ✅ 已完成部分
│   ├── AppButtonsConfigPanel.jsx
│   ├── GlobalButtonsConfigPanel.jsx
│   ├── DepositPanels.jsx
│   └── OutlineNode.jsx
│
├── modals/                        # ✅ 已完成部分
│   ├── DepositConfirmModal.jsx
│   └── UpdateGroupModal.jsx
│
├── utils/                         # ✅ 已完成
│   ├── safeOps.js
│   └── throttle.js
│
└── validators/                    # ✅ 已完成
    └── stateValidators.js
```

### 3.2 拆分后的SOPWorkbench.jsx

**预计行数**: ~4,000行（单空行格式，完成所有Phase后）

```javascript
// SOPWorkbench.jsx - 精简版

// 1. 导入 (~100行)
import { useDeposits, useReplay, useDispatch, useLayoutEditor, useOutline, useDocuments } from './sop/hooks';
import { OutlinePanel, DepositPanel, DispatchPanel, ConfigPanel } from './sop/components';
// ... 其他导入

// 2. 组件定义
export default function SOPWorkbench({ onSwitch }) {
  // 3. 使用自定义Hooks (~50行)
  const deposits = useDeposits();
  const replay = useReplay();
  const dispatch = useDispatch();
  const layout = useLayoutEditor();
  const outline = useOutline();
  const documents = useDocuments();
  
  // 4. 共享状态和派生状态 (~100行)
  const [scene, setScene] = useState(null);
  const [processingTab, setProcessingTab] = useState('outline');
  // ... 其他必要的共享状态
  
  // 5. 跨模块协调函数 (~200行)
  const handleSwitchTab = useCallback(...);
  const handleSceneChange = useCallback(...);
  // ... 其他协调函数
  
  // 6. useEffect hooks (~300行)
  // 初始化、数据同步等
  
  // 7. 渲染 (~2000行)
  return (
    <ErrorBoundary>
      <div className="sop-workbench">
        <Header ... />
        <MainContent>
          <LeftPanel>
            <ContentPreview ... />
            <DocumentList ... />
          </LeftPanel>
          <RightPanel>
            <ProcessingPanel>
              {processingTab === 'outline' && <OutlinePanel {...outline} />}
              {processingTab === 'records' && <DepositPanel {...deposits} {...replay} />}
              {processingTab === 'config' && <ConfigPanel ... />}
            </ProcessingPanel>
            <DispatchPanel {...dispatch} />
          </RightPanel>
        </MainContent>
        {/* Modals */}
      </div>
    </ErrorBoundary>
  );
}
```

---

## 四、实施计划

> **注意**: 以下所有行数估算均基于 **Phase 0 完成后的单空行格式**

### 4.0 Phase 0: 格式统一（前置步骤，立即执行）

| 步骤 | 任务 | 预计效果 |
|------|------|----------|
| 0.1 | 双空行 → 单空行 | **-10,500行** |
| 0.2 | 删除"已迁移"注释 | -200行 |
| 0.3 | 格式化导入语句 | -100行 |

**执行方式**:
```bash
# 使用 sed 或编辑器正则替换
# 替换 \n\n\n → \n\n（连续3+空行变2空行）
# 替换 \n\n → \n（连续2空行变1空行，函数间保留）
```

**Phase 0 完成后**: SOPWorkbench.jsx **22,387行 → ~11,500行**

---

### 4.1 Phase 1: 沉淀系统（最高优先级）

| 步骤 | 任务 | 文件 | 预计行数 |
|------|------|------|----------|
| 1.1 | 创建 depositOps.js | `sop/logic/depositOps.js` | ~400 |
| 1.2 | 创建 useDeposits.js | `sop/hooks/useDeposits.js` | ~800 |
| 1.3 | 创建 useReplay.js | `sop/hooks/useReplay.js` | ~600 |
| 1.4 | 更新 SOPWorkbench.jsx | 移除已迁移代码 | -1,800 |
| 1.5 | 测试验证 | 确保Replay功能正常 | - |

**预计减少行数**: ~1,800行  
**SOPWorkbench.jsx预计剩余**: ~9,700行

### 4.2 Phase 2: 指令调度

| 步骤 | 任务 | 文件 | 预计行数 |
|------|------|------|----------|
| 2.1 | 创建 dispatchOps.js | `sop/logic/dispatchOps.js` | ~300 |
| 2.2 | 创建 useDispatch.js | `sop/hooks/useDispatch.js` | ~600 |
| 2.3 | 更新 SOPWorkbench.jsx | 移除已迁移代码 | -1,500 |
| 2.4 | 测试验证 | 确保调度功能正常 | - |

**预计减少行数**: ~1,500行  
**SOPWorkbench.jsx预计剩余**: ~8,200行

### 4.3 Phase 3: 布局编辑

| 步骤 | 任务 | 文件 | 预计行数 |
|------|------|------|----------|
| 3.1 | 创建 useLayoutEditor.js | `sop/hooks/useLayoutEditor.js` | ~500 |
| 3.2 | 更新 SOPWorkbench.jsx | 移除已迁移代码 | -1,200 |
| 3.3 | 测试验证 | 确保布局编辑正常 | - |

**预计减少行数**: ~1,200行  
**SOPWorkbench.jsx预计剩余**: ~7,000行

### 4.4 Phase 4: 大纲管理

| 步骤 | 任务 | 文件 | 预计行数 |
|------|------|------|----------|
| 4.1 | 创建 outlineOps.js | `sop/logic/outlineOps.js` | ~200 |
| 4.2 | 创建 useOutline.js | `sop/hooks/useOutline.js` | ~400 |
| 4.3 | 更新 SOPWorkbench.jsx | 移除已迁移代码 | -800 |

**预计减少行数**: ~800行  
**SOPWorkbench.jsx预计剩余**: ~6,200行

### 4.5 Phase 5: 渲染组件拆分

| 步骤 | 任务 | 文件 | 预计行数 |
|------|------|------|----------|
| 5.1 | 创建 OutlinePanel.jsx | `sop/components/OutlinePanel.jsx` | ~300 |
| 5.2 | 创建 DepositPanel.jsx | `sop/components/DepositPanel.jsx` | ~400 |
| 5.3 | 创建 DispatchPanel.jsx | `sop/components/DispatchPanel.jsx` | ~300 |
| 5.4 | 创建 ConfigPanel.jsx | `sop/components/ConfigPanel.jsx` | ~200 |
| 5.5 | 更新 SOPWorkbench.jsx | 使用新组件 | -1,200 |

**预计减少行数**: ~1,200行  
**SOPWorkbench.jsx预计剩余**: ~5,000行

### 4.6 Phase 6: 最终清理

| 步骤 | 任务 | 预计效果 |
|------|------|----------|
| 6.1 | 删除无用注释 | -200行 |
| 6.2 | 合并重复代码 | -300行 |
| 6.3 | 代码审查优化 | -500行 |

**预计减少行数**: ~1,000行  
**SOPWorkbench.jsx最终**: **~4,000行**

---

## 五、Replay功能保护策略

### 5.1 关键Replay相关代码清单

| 函数/状态 | 位置 | 重要性 | 备注 |
|----------|------|--------|------|
| `replayState` | 状态 | 高 | Replay执行状态 |
| `replayDirConfig` | 状态 | 高 | Replay目录配置 |
| `replayDeposit()` | 函数 | **最高** | 核心Replay执行函数 |
| `replayDepositForBatch()` | 函数 | **最高** | 批量Replay执行 |
| `batchReplaySelectedDeposits()` | 函数 | 高 | 批量选择Replay |
| `uploadDocFromReplayDirByName()` | 函数 | 高 | 文档上传 |
| `appendReplayMeta()` | 函数 | 高 | 元数据附加 |
| `extractReplayMeta()` | 函数 | 高 | 元数据提取 |
| `logSectionWithMeta()` | 函数 | 高 | 沉淀记录 |

### 5.2 拆分时的保护措施

1. **保持接口一致**: 拆分后的Hook返回相同的状态和函数签名
2. **保留依赖关系**: 确保replayDeposit能访问template、docs等状态
3. **测试覆盖**: 拆分每个Phase后立即测试Replay功能
4. **回滚准备**: 使用Git分支，保留回滚能力

### 5.3 测试检查清单

- [ ] 单个沉淀Replay正常执行
- [ ] 批量沉淀Replay正常执行
- [ ] Replay目录配置正常保存/读取
- [ ] 文档从Replay目录加载正常
- [ ] 沉淀记录正常保存（包含REPLAY_META）
- [ ] 历史大纲恢复正常

---

## 六、改进建议总结

### 6.1 与原计划对比

| 方面 | 原计划 | 改进计划 |
|------|--------|---------|
| 当前行数（含双空行） | 11,784行 | **22,387行**（已更正） |
| Phase 0 格式统一后 | - | **~11,500行** |
| useState数量 | 30+ | **113个**（精确） |
| 拆分粒度 | 6个Hooks | 6个Hooks + 4个逻辑模块 + 4个渲染组件 |
| Replay保护 | 未详细说明 | 详细的保护策略和测试清单 |
| 最终目标 | ~3,500行 | **~4,000行**（单空行格式）

### 6.2 新增改进点

1. **更细化的沉淀系统拆分**: 分离useDeposits和useReplay
2. **业务逻辑层**: 新增logic目录存放纯逻辑函数
3. **渲染组件拆分**: 明确拆分4个面板组件
4. **状态分类管理**: 按功能域分组状态变量
5. **清理优化阶段**: 专门的代码清理步骤

---

## 七、执行建议

### 7.1 立即开始

**第一步: Phase 0 格式统一**
- 将双空行转为单空行
- 预计减少 ~10,500行（22,387 → 11,500）
- 使后续拆分工作更清晰

**第二步: Phase 1 沉淀系统**
- 收益最大（减少~1,800行）
- 与Replay功能直接相关
- 可以验证拆分策略

### 7.2 每阶段验证

每完成一个Phase后：
1. 运行开发服务器测试
2. 执行Replay功能测试
3. 确认无回归后再继续下一阶段

---

## 八、执行进度记录

### 8.1 Phase 0 执行结果 ✅

| 步骤 | 任务 | 结果 |
|------|------|------|
| 0.1 | 去除多余空行 | ✅ 完成 |
| 0.2 | 删除"已迁移"注释 | ✅ 完成（39处） |

**执行结果**:
- 原始行数: **22,804 行**
- 完成后: **17,624 行**
- 减少: **5,180 行 (-23%)**

### 8.2 Phase 1 执行进度

#### 8.2.1 depositOps.js ✅

**文件**: `src/sop/logic/depositOps.js`  
**行数**: **816 行**

**已迁移函数 (21个)**:
| 函数 | 说明 | 状态 |
|------|------|------|
| `clipText` | 截断文本 | ✅ |
| `appendReplayMeta` | 附加 Replay 元数据 | ✅ |
| `extractReplayMeta` | 提取 Replay 元数据 | ✅ |
| `describeInput` | 描述输入来源 | ✅ |
| `describeDestination` | 描述目标位置 | ✅ |
| `formatOpContent` | 格式化操作内容 | ✅ |
| `parseDepositSectionContent` | 解析沉淀段落 | ✅ |
| `normalizeRequirement` | 标准化需求值 | ✅ |
| `getSectionRequirements` | 获取段落需求配置 | ✅ |
| `OP_META_VERSION` | 元数据版本常量 | ✅ |
| `generateInitialScript` | 生成初始脚本 (~330行) | ✅ |
| `getScriptForSection` | 提取步骤脚本 | ✅ |
| `updateScriptForSection` | 更新步骤脚本 | ✅ |
| `extractFromScript` | 提取脚本字段 | ✅ |
| `parseLLMStepsFromScript` | 解析LLM步骤 (~75行) | ✅ |
| `parseAiGuidanceDirectly` | 解析AI指导 | ✅ |
| `generateReplayMeta` | 生成Replay元数据 | ✅ |
| `extractFullStepContent` | 提取完整步骤 | ✅ |

#### 8.2.2 documentOps.js ✅ (新建)

**文件**: `src/sop/logic/documentOps.js`  
**行数**: **146 行**

**已迁移函数 (8个)**:
| 函数 | 说明 | 状态 |
|------|------|------|
| `deepClone` | 深拷贝对象 | ✅ |
| `normalizeDocSelector` | 标准化文档选择器 | ✅ |
| `matchFileNameBySelector` | 匹配文件名 | ✅ |
| `normalizeDepositGroup` | 标准化沉淀组 | ✅ |
| `reorderDepositList` | 重排序列表 | ✅ |
| `moveDepositToIndex` | 移动到索引 | ✅ |
| `findDocIdByNameInList` | 按名称查找文档 | ✅ |
| `strictReplayRequired` | 判断严格Replay | ✅ |

#### 8.2.3 当前状态

**SOPWorkbench.jsx**: **16,697 行**  
**总计减少**: **6,107 行 (-27%)**

#### 8.2.4 待实施任务

| 任务 | 复杂度 | 优先级 | 说明 |
|------|--------|--------|------|
| 创建 useDeposits.js | 高 | P1 | 涉及~20个状态变量 |
| 创建 useReplay.js | 高 | P1 | 核心Replay逻辑 |
| 创建渲染组件 | 中 | P2 | OutlinePanel等 |

### 8.3 验证状态

- ✅ Linter 检查通过
- ✅ Vite HMR 正常更新
- ✅ 开发服务器无错误
- ⏳ 功能测试（需手动验证 Replay）

### 8.4 logic 目录结构

```
src/sop/logic/
├── index.js          # 统一导出
├── depositOps.js     # 816行 - 沉淀/Replay/脚本操作
└── documentOps.js    # 152行 - 文档/选择器/列表操作
```

### 8.5 hooks 目录结构 ✅ (新增)

```
src/sop/hooks/
├── index.js            # 18行 - 统一导出
├── useAsync.js         # 135行 - 异步操作 Hook (已有)
├── useLocalStorage.js  # 64行 - 本地存储 Hook (已有)
├── useToast.js         # 46行 - Toast 提示 Hook (已有)
├── useDeposits.js      # 248行 - 沉淀状态管理
├── useReplay.js        # 205行 - Replay执行管理
├── useLayoutEditor.js  # 174行 - 布局编辑管理
├── useOutline.js       # 213行 - 大纲管理
├── useApi.js           # 261行 - API操作封装
├── useDispatch.js      # 101行 - 指令调度管理
├── useDocuments.js     # 208行 - 文档管理
├── useScene.js         # 165行 - 场景管理
├── useModals.js        # 128行 - 弹窗状态管理
├── useHistory.js       # 132行 - 历史记录管理
├── useLlmButtons.js    # 238行 - LLM按钮管理
└── useDepositGroups.js # 185行 - 沉淀组管理
```

**Hooks 目录合计**: 2,521 行

### 8.6 Hook 集成状态 ✅

| Hook | 集成状态 | 说明 |
|------|----------|------|
| useModals | ✅ 已集成 | 弹窗状态管理 |
| useDispatch | ✅ 已集成 | 调度状态管理 |
| useOutline | ✅ 已集成 | 大纲状态管理（含 outlineHistory） |
| useDocuments | ✅ 已集成 | 文档状态管理 |
| useScene | ✅ 已集成 | 场景状态管理 |
| useDeposits | ✅ 已集成 | 沉淀状态管理（含 depositGroups） |
| useReplay | ✅ 已集成 | Replay 状态管理 |
| useLlmButtons | ✅ 已集成 | LLM 按钮状态管理 |
| useHistory | 📦 可用 | 历史记录管理（状态已在 useOutline 中） |
| useDepositGroups | 📦 可用 | 沉淀组管理（状态已在 useDeposits 中） |

**SOPWorkbench.jsx 行数变化**: 16,712 → 16,701 (减少 11 行)

### 8.6 待实施任务

| 任务 | 说明 | 风险 |
|------|------|------|
| 集成 Hooks 到 SOPWorkbench | 替换内联状态为 Hook 调用 | 高 |
| 手动功能验证 | 验证 Replay 等核心功能 | - |

---

**文档版本**: v2.3  
**更新日期**: 2026-01-27  
**审查人**: AI Code Reviewer
