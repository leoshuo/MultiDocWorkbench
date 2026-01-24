/**
 * Multi工作台常量定义
 * 包含UI文本、默认配置、Mock数据等
 */

// ========== UI文本常量 ==========
export const UI_TEXT = {
  t1: "拖动",
  t2: "样式设置",
  t3: "切换后台管理工作台",
  t4: "编辑工作台布局",
  t5: "重置",
  t6: "取消",
  t7: "保存",
  t8: "隐藏",
  t9: "已隐藏面板",
  t10: "收起",
  t11: "暂无隐藏面板",
  t12: "恢复",
  t13: "页面渲染失败，请刷新"
};

// ========== 存储键常量 ==========
export const REPLAY_META_MARKER = '__REPLAY_META__';
export const SHARED_SCENE_KEY = 'shared_scene_id';

// ========== 默认Prompt ==========
export const DEFAULT_DISPATCH_SYSTEM_PROMPT = `
请输出JSON：
- summary: 简要摘要
- detail: 详细说明
- edits: [{sectionId, field:'title'|'summary', content}]
只输出JSON。
`.trim();

// ========== 默认应用按钮 ==========
export const DEFAULT_APP_BUTTONS = [
  { id: 'app_btn_daily_merge', label: '日报合并写作（主任版）', groupIds: [] },
  { id: 'app_btn_competitor_report', label: '竞品分析报告写作', groupIds: [] },
  { id: 'app_btn_custom_write', label: '自定义写作', groupIds: [] }
];

// ========== 面板配置 ==========
export const PANEL_IDS = {
  SOURCES: 'sources-panel',
  CHAT: 'chat-panel',
  STUDIO: 'studio-panel'
};

export const DEFAULT_PANEL_VISIBILITY = {
  'sources-panel': true,
  'chat-panel': true,
  'studio-panel': true
};

export const DEFAULT_PANEL_POSITIONS = {
  'sources-panel': { left: 20, top: 40, width: 320, height: 900 },
  'chat-panel': { left: 360, top: 40, width: 800, height: 900 },
  'studio-panel': { left: 1180, top: 40, width: 460, height: 900 }
};

export const LEGACY_PANEL_MAP = {
  'sources-panel': ['来源', '来源列表', '资源'],
  'chat-panel': ['对话', '聊天', '会话'],
  'studio-panel': ['Studio', '工作室', '编辑']
};

// ========== Mock数据 ==========
export const MOCK_SOURCES = [];

export const MOCK_MESSAGES = [
  {
    id: '1',
    role: 'assistant',
    content: '您好！我已经阅读了这些文档。您可以问我任何关于产品需求或用户反馈的问题。'
  }
];

export const MOCK_NOTES = [
  {
    id: '1',
    title: '核心需求',
    content: '用户主要关注移动端的易用性和响应速度。'
  }
];
