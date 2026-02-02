# 调试踩坑经验总结

> 本文档记录了在 Document-WorkSpace 项目开发过程中遇到的各种问题和解决方案，供后续开发参考。

---

## 目录

1. [代码位置陷阱](#1-代码位置陷阱)
2. [多视图/多组件渲染问题](#2-多视图多组件渲染问题)
3. [前后端服务管理](#3-前后端服务管理)
4. [浏览器缓存问题](#4-浏览器缓存问题)
5. [正则表达式一致性](#5-正则表达式一致性)
6. [调试技巧](#6-调试技巧)

---

## 1. 代码位置陷阱

### 问题描述
在大型组件文件（如 `SOPWorkbench.jsx` 超过 18000 行）中，可能存在**被禁用的旧代码**，而实际功能由**其他组件**处理。

### 实际案例
```jsx
// SOPWorkbench.jsx 第 14206 行
// 这段代码被 {false && ...} 禁用，永远不会执行！
{false && depositViewMode === 'deposits' && deposits.map((dep, idx) => {
  // ... 旧的沉淀列表渲染代码
})}

// 实际渲染由独立组件处理
{depositViewMode === 'deposits' && renderDepositListPanel(false)}
```

### 解决方案
1. **搜索实际渲染入口**：使用 `grep` 搜索组件名或关键函数
2. **检查条件渲染**：注意 `{false && ...}` 或 `{/* 已废弃 */}` 等标记
3. **追踪组件引用**：从 UI 入口追踪到实际渲染组件

### 检查清单
- [ ] 确认修改的代码块没有被条件禁用
- [ ] 确认修改的是实际被调用的组件
- [ ] 检查是否有"已废弃"、"旧代码"等注释

---

## 2. 多视图/多组件渲染问题

### 问题描述
同一功能可能在**多个地方**渲染，例如：
- 普通列表视图
- 布局编辑模式
- 不同的面板/标签页

### 实际案例
`sectionExpanded`（展开详情）在 `SOPWorkbench.jsx` 中有**3个渲染位置**：
- 第 14589 行：沉淀列表（被禁用）
- 第 16596 行：布局模式
- 第 17989 行：第三视图

但实际使用的是 `DepositListPanel.jsx` 第 564 行！

### 解决方案
```bash
# 搜索所有渲染位置
grep -n "sectionExpanded\[" src/**/*.jsx

# 结果示例：
# src/SOPWorkbench.jsx:14589
# src/SOPWorkbench.jsx:16596
# src/SOPWorkbench.jsx:17989
# src/sop/panels/DepositListPanel.jsx:564  ← 实际位置！
```

### 检查清单
- [ ] 搜索所有使用该状态/变量的位置
- [ ] 确认当前 UI 对应的是哪个渲染路径
- [ ] 在正确的组件中进行修改

---

## 3. 前后端服务管理

### 问题3.1：端口被占用

#### 症状
```
Error: listen EADDRINUSE: address already in use 0.0.0.0:4300
```

#### 解决方案（Windows PowerShell）
```powershell
# 1. 查找占用端口的进程
netstat -ano | findstr :4300

# 输出示例：TCP 0.0.0.0:4300 LISTENING 11108

# 2. 终止进程
taskkill /F /PID 11108

# 3. 重新启动服务器
npm run server
```

### 问题3.2：后端服务器未运行

#### 症状
- API 调用失败（如类别不持久化）
- 控制台显示 `fetch` 错误
- 无痕浏览器数据丢失

#### 解决方案
```powershell
# 确保后端服务器运行
npm run server  # 端口 4300

# 同时运行前端开发服务器
npm run dev     # 端口 5300
```

### 检查清单
- [ ] 后端服务器（4300）是否运行
- [ ] 前端开发服务器（5300）是否运行
- [ ] 终端是否有错误信息

---

## 4. 浏览器缓存问题

### 问题描述
修改代码后，浏览器可能仍然加载旧版本，导致：
- UI 没有更新
- 新功能不生效
- 测试标记不显示

### 解决方案

#### 方法1：硬刷新
```
Windows/Linux: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

#### 方法2：禁用缓存
1. 打开开发者工具（F12）
2. 切换到 Network 标签
3. 勾选 "Disable cache"
4. 保持开发者工具打开状态刷新页面

#### 方法3：使用无痕模式
- 无痕模式不共享常规模式的缓存
- 但注意：无痕模式的 localStorage 也是隔离的

#### 方法4：清除 Vite 缓存
```powershell
# 删除 node_modules/.vite 目录
Remove-Item -Recurse -Force node_modules/.vite

# 重启开发服务器
npm run dev
```

### 检查清单
- [ ] 检查 Vite 终端是否显示 HMR 更新
- [ ] 使用硬刷新（Ctrl+Shift+R）
- [ ] 检查开发者工具 Network 中是否加载了最新文件

---

## 5. 正则表达式一致性

### 问题描述
不同组件中提取同一字段时，使用了**不同的正则表达式**，导致：
- 某些地方能提取到数据
- 某些地方提取失败

### 实际案例
```javascript
// DepositConfirmModal.jsx 中的正则（正确）
const regex = /【输出格式】\s*([\s\S]*?)(?=【[^输]|\n\n\n|===|$)/;

// SOPWorkbench.jsx 中的正则（错误/简化版）
const regex = /【输出格式】([^【]*)/;  // 无法处理多行内容
```

### 解决方案
1. **统一正则定义**：将正则抽取到公共工具函数
2. **复制粘贴验证**：从工作正常的地方复制正则
3. **编写单元测试**：确保正则在各种情况下都能正确匹配

### 推荐做法
```javascript
// utils/extractors.js
export const extractField = (text, fieldName) => {
  if (!text) return '';
  // 统一的正则模式
  const regex = new RegExp(
    `【${fieldName}】\\s*([\\s\\S]*?)(?=【[^${fieldName.charAt(0)}]|\\n\\n\\n|===|$)`
  );
  const match = text.match(regex);
  return match ? match[1].trim() : '';
};
```

### 检查清单
- [ ] 相同功能的正则是否一致
- [ ] 是否考虑了多行内容
- [ ] 是否处理了边界情况

---

## 6. 调试技巧

### 技巧1：添加可视化测试标记

当不确定代码是否被执行时，添加**显眼的视觉标记**：

```jsx
{/* 测试标记 - 确认后删除 */}
<div style={{ 
  background: '#ff00ff', 
  color: '#fff', 
  padding: 8, 
  fontSize: 12, 
  fontWeight: 'bold', 
  border: '3px solid #000' 
}}>
  💜 测试标记 - 如果看到此消息说明代码已执行
</div>
```

### 技巧2：控制台日志定位

添加带**唯一标识**的日志，方便在控制台中搜索：

```javascript
console.log('[DepositListPanel][Section展开]', {
  depId: dep.id,
  sectionId: s.id,
  hasOutputFormat: !!outputFormat,
  hasCalcFormula: !!calculationFormula
});
```

### 技巧3：检查 HMR 更新

修改代码后，检查 Vite 终端输出：

```
22:55:13 [vite] (client) hmr update /src/sop/panels/DepositListPanel.jsx
```

如果没有 HMR 更新，可能是：
- 文件保存失败
- 语法错误导致编译失败
- 修改的文件不在监视范围内

### 技巧4：逐步缩小范围

1. 先确认**组件是否被渲染**（添加测试标记）
2. 再确认**数据是否存在**（打印日志）
3. 最后确认**逻辑是否正确**（单步调试）

---

## 快速参考卡片

### 常用命令
```powershell
# 启动服务
npm run dev      # 前端 (5300)
npm run server   # 后端 (4300)

# 释放端口
netstat -ano | findstr :4300
taskkill /F /PID <PID>

# 搜索代码
grep -rn "关键词" src/
```

### 调试流程
```
1. 确认服务器运行 → 2. 硬刷新页面 → 3. 检查控制台 → 4. 添加测试标记 → 5. 定位正确组件
```

### 常见错误速查
| 症状 | 可能原因 | 解决方案 |
|------|----------|----------|
| UI 不更新 | 浏览器缓存 | Ctrl+Shift+R |
| API 失败 | 后端未运行 | npm run server |
| 端口占用 | 进程残留 | taskkill /F /PID |
| 数据提取失败 | 正则不一致 | 统一正则定义 |
| 代码不执行 | 条件禁用 | 检查 {false && ...} |

---

## 更新日志

| 日期 | 更新内容 |
|------|----------|
| 2026-01-30 | 初始版本，记录 SOPWorkbench 调试经验 |

---

*文档维护：Document-WorkSpace 开发团队*
