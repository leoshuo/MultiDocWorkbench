# 可拖拽面板功能集合

Document Workspace 1.6.3 支持完整的可拖拽面板系统。

## 核心特性

### 1. 面板拖拽
- 所有面板支持自由拖拽移动
- 拖拽时显示位置指示器
- 释放后自动保存位置

### 2. 面板缩放
- 支持四边和四角缩放
- 最小尺寸限制保护
- 缩放时实时预览

### 3. 编辑模式
- 点击"编辑布局"进入编辑模式
- 编辑模式下显示拖拽手柄和缩放控件
- 退出编辑自动保存配置

## 相关组件

- `EditablePanel.jsx`: 可编辑面板容器
- `DraggablePanel.jsx`: 可拖拽面板基础组件
- `LayoutEditContainer`: 布局编辑容器

## 数据持久化

面板位置和尺寸配置持久化到：
- `data/layout-config.json`（经验沉淀工作台）
- `data/multi-layout-config.json`（多文档处理工作台）

## 详细文档

- `docs/USER_MANUAL.md`
- `docs/SOP_DEPOSIT_GUIDE.md`
- `docs/DOCKER_DEPLOY.md`

