import { loadConfig, saveConfig, removeConfig } from './utils/configManager';

// 默认面板配置 (5个面板)
const DEFAULT_PANELS = {
  'input-form-panel': {
    id: 'input-form-panel',
    name: '输入素材',
    defaultPosition: { left: 20, top: 20, width: 600, height: 180 },
  },
  'document-list-panel': {
    id: 'document-list-panel',
    name: '文档列表',
    defaultPosition: { left: 20, top: 216, width: 600, height: 180 },
  },
  'preview-panel': {
    id: 'preview-panel',
    name: '内容预览',
    defaultPosition: { left: 20, top: 412, width: 600, height: 360 },
  },
  'processing-panel': {
    id: 'processing-panel',
    name: '文档处理',
    defaultPosition: { left: 636, top: 20, width: 550, height: 376 },
  },
  'operations-panel': {
    id: 'operations-panel',
    name: '操作调度',
    defaultPosition: { left: 636, top: 412, width: 550, height: 360 },
  },
};

// 导出默认面板配置
export { DEFAULT_PANELS };

// 默认布局配置（向后兼容）
export const DEFAULT_LAYOUT = Object.keys(DEFAULT_PANELS).reduce((acc, key) => {
  acc[key] = DEFAULT_PANELS[key].defaultPosition;
  return acc;
}, {});

const LAYOUT_STORAGE_KEY = 'app-layout-config';

// 布局配置验证器
const validateLayout = (config) => {
  if (!config || typeof config !== 'object') return false;
  // 确保所有必要的面板都存在
  const requiredPanels = Object.keys(DEFAULT_PANELS);
  return requiredPanels.every(panelId => config[panelId]);
};

// 加载布局配置
export function loadLayoutConfig() {
  const config = loadConfig(LAYOUT_STORAGE_KEY, DEFAULT_LAYOUT, validateLayout);
  // 确保所有必要的面板都存在
  return { ...DEFAULT_LAYOUT, ...config };
}

// 保存布局配置
export function saveLayoutConfig(config) {
  return saveConfig(LAYOUT_STORAGE_KEY, config, validateLayout);
}

// 重置为默认布局
export function resetLayoutConfig() {
  removeConfig(LAYOUT_STORAGE_KEY);
  return DEFAULT_LAYOUT;
}

export default {
  loadLayoutConfig,
  saveLayoutConfig,
  resetLayoutConfig,
  DEFAULT_LAYOUT,
  DEFAULT_PANELS,
};
