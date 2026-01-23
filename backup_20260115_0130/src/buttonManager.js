/**
 * 按钮配置管理工具库
 * 管理四个模块中所有按钮的位置、大小和样式
 */

import { loadConfig, saveConfig, createValidator } from './utils/configManager';

const BUTTON_CONFIG_STORAGE_KEY = 'app-button-config';

/**
 * 默认按钮配置
 * 结构：panelId -> [{ id, label, left, top, width, height, enabled, kind, ... }]
 */
export const DEFAULT_BUTTON_CONFIG = {
  'document-list-panel': [
    { id: 'btn_list_delete', label: '删除', left: 12, top: 12, width: 80, height: 36, enabled: true, kind: 'delete_selected' },
    { id: 'btn_list_select_all', label: '全选', left: 104, top: 12, width: 80, height: 36, enabled: true, kind: 'select_all' },
  ],
  'preview-panel': [
    { id: 'btn_preview_view_doc', label: '查看文档', left: 12, top: 12, width: 100, height: 36, enabled: true, kind: 'view_doc' },
    { id: 'btn_preview_summarize', label: '填入摘要', left: 124, top: 12, width: 100, height: 36, enabled: true, kind: 'fill_summary' },
  ],
  'processing-panel': [
    { id: 'btn_proc_config', label: '个性化配置', left: 12, top: 12, width: 120, height: 36, enabled: true, kind: 'tab_config' },
    { id: 'btn_proc_extract', label: '文本摘录', left: 144, top: 12, width: 100, height: 36, enabled: true, kind: 'text_snippet' },
    { id: 'btn_proc_outline', label: '大纲提取', left: 256, top: 12, width: 100, height: 36, enabled: true, kind: 'outline_extract' },
  ],
  'operations-panel': [
    { id: 'btn_ops_clear', label: '清除记录', left: 12, top: 12, width: 100, height: 36, enabled: true, kind: 'clear_records' },
    { id: 'btn_ops_execute', label: '执行指令', left: 124, top: 12, width: 100, height: 36, enabled: true, kind: 'dispatch' },
  ],
};

/**
 * 验证按钮配置的有效性
 */
export const validateButtonConfig = createValidator((config) => {
  if (!config || typeof config !== 'object') return false;

  const requiredPanels = ['document-list-panel', 'preview-panel', 'processing-panel', 'operations-panel'];
  for (const panelId of requiredPanels) {
    if (!config[panelId]) return false;
    if (!Array.isArray(config[panelId])) return false;
  }

  return true;
});

/**
 * 从 localStorage 加载按钮配置
 */
export function loadButtonConfig() {
  return loadConfig(BUTTON_CONFIG_STORAGE_KEY, null, validateButtonConfig);
}

/**
 * 保存按钮配置到 localStorage
 */
export function saveButtonConfig(config) {
  return saveConfig(BUTTON_CONFIG_STORAGE_KEY, config, validateButtonConfig);
}

/**
 * 重置为默认按钮配置
 */
export function resetButtonConfig() {
  const config = JSON.parse(JSON.stringify(DEFAULT_BUTTON_CONFIG));
  saveButtonConfig(config);
  return config;
}

/**
 * 获取特定面板的按钮配置
 */
export function getPanelButtonConfig(panelId, fullConfig) {
  return (fullConfig && fullConfig[panelId]) || (DEFAULT_BUTTON_CONFIG[panelId] || []);
}

/**
 * 更新按钮配置中的某个按钮
 */
export function updateButtonInConfig(config, panelId, buttonId, updates) {
  if (!config[panelId]) return config;

  const buttons = config[panelId];
  const btnIndex = buttons.findIndex(b => b.id === buttonId);
  if (btnIndex === -1) return config;

  const updated = { ...config };
  updated[panelId] = [...buttons];
  updated[panelId][btnIndex] = { ...buttons[btnIndex], ...updates };

  return updated;
}

/**
 * 添加按钮到配置
 */
export function addButtonToConfig(config, panelId, button) {
  if (!config[panelId]) return config;

  const updated = { ...config };
  updated[panelId] = [...config[panelId], button];
  return updated;
}

/**
 * 从配置中移除按钮
 */
export function removeButtonFromConfig(config, panelId, buttonId) {
  if (!config[panelId]) return config;

  const updated = { ...config };
  updated[panelId] = config[panelId].filter(b => b.id !== buttonId);
  return updated;
}

/**
 * 获取按钮在 DOM 中的样式对象
 */
export function getButtonStyle(button) {
  return {
    position: 'absolute',
    left: `${button.left}px`,
    top: `${button.top}px`,
    width: `${button.width}px`,
    height: `${button.height}px`,
    minWidth: 'auto',
  };
}

/**
 * 生成唯一的按钮 ID
 */
export function generateButtonId(panelId) {
  return `btn_${panelId}_${Date.now()}`;
}
