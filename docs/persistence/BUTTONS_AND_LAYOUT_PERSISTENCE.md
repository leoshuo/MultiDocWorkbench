# 按钮与布局持久化方案

Document Workspace 1.6.3 数据持久化说明

## 持久化架构

系统采用双重持久化策略：
1. **本地存储 (localStorage)**: 前端即时保存
2. **服务端存储 (JSON文件)**: 后端持久化

## 布局配置持久化

### 经验沉淀工作台
- 存储路径: `data/layout-config.json`
- API端点: `GET/POST /api/layout`
- 包含内容: 面板位置、尺寸

### 多文档处理工作台
- 存储路径: `data/multi-layout-config.json`
- API端点: `GET/POST /api/multi/layout`
- 包含内容: 面板位置、尺寸、标题、可见性

### 面板可见性（多文档处理工作台）
- 存储路径: `data/multi-panel-visibility.json`
- API端点: `GET/POST /api/multi/panels`
- 包含内容: 面板显示/隐藏状态

## 按钮配置持久化

### 经验沉淀工作台
- 存储路径: `data/button-config.json`
- API端点: `GET/POST /api/buttons`
- 包含内容: 按钮位置、样式、启用状态

### 多文档处理工作台
- 存储路径: `data/multi-button-config.json`
- API端点: `GET/POST /api/multi/buttons`
- 包含内容: 按钮位置、样式、类型

### 应用端按钮
- 存储路径: `data/multi-app-buttons.json`
- API端点: `GET/POST /api/multi/app-buttons`
- 包含内容: 按钮标签、关联沉淀集

## 数据格式

### 布局配置示例
```json
{
  "layoutSize": { "width": 1680, "height": 1050 },
  "panelPositions": {
    "sources-panel": { "left": 20, "top": 40, "width": 320, "height": 900 }
  },
  "panelTitles": {
    "sources-panel": "来源"
  },
  "panelVisibility": {
    "sources-panel": true
  }
}
```

### 按钮配置示例
```json
{
  "panel-id": [
    {
      "id": "btn_1",
      "label": "按钮名称",
      "left": 20,
      "top": 20,
      "width": 100,
      "height": 36,
      "enabled": true,
      "kind": "action",
      "style": {
        "fontSize": 14,
        "color": "#1e293b",
        "backgroundColor": "#ffffff"
      }
    }
  ]
}
```

## 保存时机

1. **编辑模式退出时**: 点击保存按钮
2. **配置变更时**: 自动保存到localStorage
3. **页面刷新前**: 同步到服务端

## 恢复机制

1. 页面加载时优先读取服务端配置
2. 服务端无数据时使用localStorage
3. 均无数据时使用默认配置

## 相关文档

- 用户手册: docs/USER_MANUAL.md
- 项目总结: docs/PROJECT_REVIEW.md

