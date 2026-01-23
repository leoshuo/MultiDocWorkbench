# 布局持久化修复说明

Document Workspace 1.6.3 布局持久化机制

## 持久化流程

### 保存流程
1. 用户在编辑模式下调整布局
2. 点击"保存"按钮
3. 前端调用 POST API 保存配置
4. 后端写入 JSON 文件
5. 同时保存到 localStorage 作为备份

### 加载流程
1. 页面初始化
2. 调用 GET API 获取服务端配置
3. 若服务端无数据，读取 localStorage
4. 若均无数据，使用默认配置
5. 应用配置到界面

## API 端点

### 经验沉淀工作台
- `GET /api/layout` - 获取布局
- `POST /api/layout` - 保存布局
- `GET /api/buttons` - 获取按钮配置
- `POST /api/buttons` - 保存按钮配置

### 多文档处理工作台
- `GET /api/multi/layout` - 获取布局
- `POST /api/multi/layout` - 保存布局
- `POST /api/multi/layout/reset` - 重置布局
- `GET /api/multi/buttons` - 获取按钮配置
- `POST /api/multi/buttons` - 保存按钮配置
- `POST /api/multi/buttons/reset` - 重置按钮配置
- `GET /api/multi/panels` - 获取面板可见性
- `POST /api/multi/panels` - 保存面板可见性

## 数据文件

| 文件 | 说明 |
|------|------|
| data/layout-config.json | SOP布局配置 |
| data/button-config.json | SOP按钮配置 |
| data/multi-layout-config.json | Multi布局配置 |
| data/multi-button-config.json | Multi按钮配置 |
| data/multi-panel-visibility.json | Multi面板可见性 |

## 故障恢复

### 配置丢失
1. 检查 `data/` 目录文件是否存在
2. 检查文件权限
3. 尝试重置为默认配置

### 配置损坏
1. 删除对应的 JSON 文件
2. 重启服务
3. 系统将使用默认配置

### 备份恢复
1. 从备份目录复制 JSON 文件
2. 覆盖 `data/` 目录下对应文件
3. 重启服务

## 相关文档

- 持久化方案: docs/persistence/BUTTONS_AND_LAYOUT_PERSISTENCE.md
- 项目总结: docs/PROJECT_REVIEW.md

