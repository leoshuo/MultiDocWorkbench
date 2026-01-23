# 按钮可编辑方案

Document Workspace 1.6.3 按钮编辑功能说明

## 功能概述

系统支持对界面按钮进行可视化编辑，包括：
- 位置调整（拖拽移动）
- 尺寸调整（边缘拖拽）
- 样式编辑（颜色、字体等）
- 启用/禁用控制

## 编辑入口

### 经验沉淀工作台
1. 点击页面右上角"编辑布局"按钮
2. 进入编辑模式
3. 点击按钮进入样式编辑器

### 多文档处理工作台
1. 点击页面顶部铅笔图标
2. 进入编辑模式
3. 点击按钮进入样式编辑器

## 样式编辑器

### 可编辑属性
- **文本**: 按钮标签
- **字体大小**: 12-24px
- **字体粗细**: 400-700
- **文字颜色**: 颜色选择器
- **背景颜色**: 颜色选择器
- **边框颜色**: 颜色选择器
- **边框宽度**: 0-4px
- **圆角**: 0-12px

### 操作按钮
- **保存**: 应用样式修改
- **删除**: 删除当前按钮
- **关闭**: 取消编辑

## 相关组件

- `StyleEditor.jsx`: 样式编辑器组件
- `EditableButton.jsx`: 可编辑按钮组件
- `EditableButtonsContainer`: 按钮容器组件

## 数据结构

```javascript
{
  id: "btn_unique_id",
  label: "按钮名称",
  left: 20,
  top: 20,
  width: 100,
  height: 36,
  enabled: true,
  kind: "action",
  style: {
    fontSize: 14,
    fontWeight: 500,
    color: "#1e293b",
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderWidth: 1,
    borderRadius: 6
  }
}
```

## 相关文档

- 编辑模式: docs/editing/EDITING_MODE_COLLECTION.md
- 布局持久化: docs/persistence/BUTTONS_AND_LAYOUT_PERSISTENCE.md
- 项目总结: docs/PROJECT_REVIEW.md

