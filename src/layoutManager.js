/**
 * 布局管理工具
 * 支持固定布局和自由拖动模式的切换
 */

/**
 * 获取布局模式
 */
export function getLayoutMode() {
  try {
    return (
      localStorage.getItem('layout_mode') || 'fixed' // 'fixed' 或 'draggable'
    );
  } catch (_) {
    return 'fixed';
  }
}

/**
 * 设置布局模式
 */
export function setLayoutMode(mode) {
  try {
    localStorage.setItem('layout_mode', mode);
  } catch (_) {
    // 忽略 localStorage 错误
  }
}

/**
 * 切换布局模式
 */
export function toggleLayoutMode() {
  const current = getLayoutMode();
  const next = current === 'fixed' ? 'draggable' : 'fixed';
  setLayoutMode(next);
  return next;
}

/**
 * 重置所有面板位置
 */
export function resetPanelPositions() {
  const keys = Object.keys(localStorage);
  keys.forEach((key) => {
    if (key.startsWith('panel-')) {
      localStorage.removeItem(key);
    }
  });
}

/**
 * 面板配置预设
 */
export const PANEL_PRESETS = {
  // 默认预设 - 左中右布局
  default: {
    input: { x: 0, y: 100, width: 350, height: 700 },
    preview: { x: 370, y: 100, width: 400, height: 700 },
    processing: { x: 790, y: 100, width: 600, height: 700 },
    operations: { x: 370, y: 820, width: 1020, height: 300 },
  },

  // 堆栈预设 - 重叠布局
  stacked: {
    input: { x: 50, y: 150, width: 400, height: 600 },
    preview: { x: 150, y: 200, width: 400, height: 600 },
    processing: { x: 250, y: 250, width: 500, height: 600 },
    operations: { x: 350, y: 300, width: 600, height: 400 },
  },

  // 标签页预设 - 分离布局
  tabs: {
    input: { x: 100, y: 150, width: 800, height: 700 },
    preview: { x: 100, y: 150, width: 800, height: 700 },
    processing: { x: 100, y: 150, width: 800, height: 700 },
    operations: { x: 100, y: 150, width: 800, height: 700 },
  },
};

/**
 * 应用预设布局
 */
export function applyPreset(presetName) {
  const preset = PANEL_PRESETS[presetName];
  if (!preset) return;

  Object.entries(preset).forEach(([panelId, config]) => {
    localStorage.setItem(`panel-${panelId}`, JSON.stringify(config));
  });
}
