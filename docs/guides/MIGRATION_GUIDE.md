# 迁移指南（1.6.3）

## 变更要点
- 引入“前台用户端 / 后端管理端”双工作台
- 新增沉淀集与应用端按钮配置
- 模式顺序调整为：大纲配置 -> 沉淀配置 -> 应用端按钮配置 -> 自迭代配置
- 数据持久化统一写入 `data/`
- 新增 AI Key 运行时配置（`POST /api/config/api-key`）
- 新增缓存接口（outline/chat/logs/deposit）
- 新增数据文件：`multi-panel-visibility.json`、`replay-config.json`、`content-blocks.json`、`deleted-blocks.json`、`global-buttons.json`、`header-titles.json`、`layout-size.json`、`llm-buttons.json`

## 迁移步骤
1. 备份旧版本 `data/`
2. 覆盖新版本代码
3. 复制旧 `data/` 到新版本同名目录
4. 启动后端与前端

如遇字段缺失，保持为空并在现场修改（见 `docs/DOCKER_DEPLOY.md`）。

