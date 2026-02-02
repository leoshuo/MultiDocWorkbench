/**
 * 按钮配置管理工具
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
    { id: 'btn_proc_config', label: '应用端按钮配置', left: 12, top: 12, width: 120, height: 36, enabled: true, kind: 'tab_config' },
    { id: 'btn_proc_extract', label: '文本摘录', left: 144, top: 12, width: 100, height: 36, enabled: true, kind: 'text_snippet' },
    { id: 'btn_proc_outline', label: '大纲提取', left: 256, top: 12, width: 100, height: 36, enabled: true, kind: 'outline_extract' },
  ],
  'processing-tabs': [
    { id: 'btn_tab_outline', label: '大纲配置', left: 12, top: 6, width: 96, height: 32, enabled: true, kind: 'tab_outline', style: { fontSize: 16, fontWeight: 600 } },
    { id: 'btn_tab_records', label: '沉淀配置', left: 128, top: 6, width: 96, height: 32, enabled: true, kind: 'tab_records', style: { fontSize: 16, fontWeight: 600 } },
    { id: 'btn_tab_config', label: '应用端按钮配置', left: 244, top: 6, width: 140, height: 32, enabled: true, kind: 'tab_config', style: { fontSize: 16, fontWeight: 600 } },
    { id: 'btn_tab_strategy', label: '自迭代配置', left: 404, top: 6, width: 110, height: 32, enabled: true, kind: 'tab_strategy', style: { fontSize: 16, fontWeight: 600 } },
  ],
  'processing-records-toolbar': [
    // 沉淀列表模式 - 所有按钮在同一行
    { id: 'btn_records_batch_replay', label: '批量 Replay', left: 12, top: 8, width: 100, height: 28, enabled: true, kind: 'batch_replay', style: { fontSize: 12 } },
    { id: 'btn_records_select_all', label: '全选', left: 122, top: 8, width: 64, height: 28, enabled: true, kind: 'select_all', style: { fontSize: 12 } },
    { id: 'btn_records_delete_selected', label: '删除选中', left: 196, top: 8, width: 88, height: 28, enabled: true, kind: 'delete_selected', style: { fontSize: 12 } },
    { id: 'btn_records_clear_selection', label: '清空选择', left: 294, top: 8, width: 88, height: 28, enabled: true, kind: 'clear_selection', style: { fontSize: 12 } },
    { id: 'btn_group_new', label: '新建沉淀集', left: 392, top: 8, width: 100, height: 28, enabled: true, kind: 'group_new', style: { fontSize: 12 } },
    { id: 'btn_group_update', label: '更新沉淀集', left: 502, top: 8, width: 100, height: 28, enabled: true, kind: 'group_update', style: { fontSize: 12 } },
    { id: 'btn_category_new', label: '新建归类', left: 612, top: 8, width: 88, height: 28, enabled: true, kind: 'category_new', style: { fontSize: 12 } },
    { id: 'btn_category_assign', label: '更新沉淀归类', left: 710, top: 8, width: 100, height: 28, enabled: true, kind: 'category_assign', style: { fontSize: 12 } },
    { id: 'btn_category_remove', label: '解除已有归类', left: 820, top: 8, width: 100, height: 28, enabled: true, kind: 'category_remove', style: { fontSize: 12 } },
    // 沉淀集列表模式 - 沉淀集管理
    { id: 'btn_group_rename', label: '重命名', left: 12, top: 8, width: 80, height: 28, enabled: true, kind: 'group_rename', style: { fontSize: 12 } },
    { id: 'btn_group_delete', label: '删除', left: 102, top: 8, width: 72, height: 28, enabled: true, kind: 'group_delete', style: { fontSize: 12 } },
    { id: 'btn_group_replay', label: 'Replay', left: 184, top: 8, width: 80, height: 28, enabled: true, kind: 'group_replay', style: { fontSize: 12 } },
  ],
  'operations-panel': [
    { id: 'btn_ops_clear', label: '清除记录', left: 12, top: 12, width: 100, height: 36, enabled: true, kind: 'clear_records' },
    { id: 'btn_ops_execute', label: '执行指令', left: 124, top: 12, width: 100, height: 36, enabled: true, kind: 'dispatch' },
  ],
  'input-form-panel': [],
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
 * 从服务端加载按钮配置
 */
export async function loadButtonConfigFromServer() {
  try {
    const res = await fetch('/api/buttons');
    if (res.ok) {
      const data = await res.json();
      if (data?.buttons && validateButtonConfig(data.buttons)) {
        // 同时保存到 localStorage 作为缓存
        saveConfig(BUTTON_CONFIG_STORAGE_KEY, data.buttons, validateButtonConfig);
        return data.buttons;
      }
    }
  } catch (e) {
    console.warn('[ButtonManager] 从服务端加载按钮配置失败，使用本地缓存', e);
  }
  // 回退到 localStorage
  return loadConfig(BUTTON_CONFIG_STORAGE_KEY, null, validateButtonConfig);
}

/**
 * 从 localStorage 加载按钮配置（同步版本）
 */
export function loadButtonConfig() {
  return loadConfig(BUTTON_CONFIG_STORAGE_KEY, null, validateButtonConfig);
}

/**
 * 保存按钮配置（同时保存到服务端和 localStorage）
 */
export async function saveButtonConfig(config) {
  // 先保存到 localStorage 作为即时缓存
  saveConfig(BUTTON_CONFIG_STORAGE_KEY, config, validateButtonConfig);
  
  // 然后同步到服务端持久化
  try {
    const res = await fetch('/api/buttons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buttons: config })
    });
    if (!res.ok) {
      console.error('[ButtonManager] 保存按钮配置到服务端失败');
      return false;
    }
    console.log('[ButtonManager] 按钮配置已保存到服务端');
    return true;
  } catch (e) {
    console.error('[ButtonManager] 保存按钮配置到服务端失败', e);
    return false;
  }
}

/**
 * 重置为默认按钮配置
 */
export async function resetButtonConfig() {
  const config = JSON.parse(JSON.stringify(DEFAULT_BUTTON_CONFIG));
  await saveButtonConfig(config);
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
  const btnIndex = buttons.findIndex((b) => b.id === buttonId);
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
  updated[panelId] = config[panelId].filter((b) => b.id !== buttonId);
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
