# 可视化布局功能集合

Document Workspace 1.6.3 提供完整的可视化布局编辑系统。

## 布局系统架构

### 布局容器
- `LayoutEditContainer`: 布局编辑主容器
- 支持自定义画布尺寸
- 提供缩放和滚动功能

### 面板系统
- 支持多面板自由布局
- 面板位置/尺寸独立控制
- 面板可见性管理

## 多文档处理工作台布局

### 默认面板
1. **来源面板** (sources-panel)
   - 位置: 左侧
   - 功能: 文档上传与管理

2. **对话面板** (chat-panel)
   - 位置: 中间
   - 功能: AI对话与指令执行

3. **Studio面板** (studio-panel)
   - 位置: 右侧
   - 功能: 笔记与输出管理

## 经验沉淀工作台布局

### 默认面板
1. **输入面板** (input-form-panel)
2. **文档列表面板** (document-list-panel)
3. **预览面板** (preview-panel)
4. **处理面板** (processing-panel)
5. **操作面板** (operations-panel)

## 布局配置持久化

配置存储位置：
- 本地存储: `localStorage`
- 服务端: `data/*.json`

## 相关API

- `GET /api/layout`: 获取布局配置
- `POST /api/layout`: 保存布局配置
- `GET /api/multi/layout`: 获取多文档工作台布局
- `POST /api/multi/layout`: 保存多文档工作台布局
- `GET /api/multi/panels`: 获取面板可见性
- `POST /api/multi/panels`: 保存面板可见性

## 详细文档

- `docs/USER_MANUAL.md`
- `docs/SOP_DEPOSIT_GUIDE.md`
- `docs/DOCKER_DEPLOY.md`

