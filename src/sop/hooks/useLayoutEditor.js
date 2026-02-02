/**
 * useLayoutEditor - 布局编辑管理 Hook
 * 从 SOPWorkbench.jsx 迁移的布局编辑相关状态和操作
 */
import { useState, useCallback, useRef } from 'react';
import { loadLayoutConfig, saveLayoutConfig, resetLayoutConfig } from '../../layoutEditor';
import { loadButtonConfig, saveButtonConfig, resetButtonConfig, DEFAULT_BUTTON_CONFIG } from '../../buttonManager';

/**
 * 布局编辑管理 Hook
 * @param {object} options - 配置选项
 * @param {Function} options.showToast - Toast 提示函数
 * @returns {object} 布局状态和操作函数
 */
export const useLayoutEditor = ({ showToast } = {}) => {
  // ========== 布局状态 ==========
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  
  const [panelPositions, setPanelPositions] = useState(() => {
    try {
      const saved = loadLayoutConfig();
      if (saved && typeof saved === 'object') return saved;
    } catch (_) { /* ignore */ }
    return {};
  });
  
  const [buttonPositions, setButtonPositions] = useState(() => {
    try {
      const saved = loadButtonConfig();
      if (saved && typeof saved === 'object') return saved;
    } catch (_) { /* ignore */ }
    return { ...DEFAULT_BUTTON_CONFIG };
  });
  
  const [savedLayout, setSavedLayout] = useState(null);
  const [savedButtons, setSavedButtons] = useState(null);
  const [savedContentBlocks, setSavedContentBlocks] = useState(null);
  const [draggingButton, setDraggingButton] = useState(null);
  
  // Header 标题相关
  const [headerTitles, setHeaderTitles] = useState(() => {
    try {
      const saved = loadLayoutConfig();
      return saved?.headerTitles || {};
    } catch (_) {
      return {};
    }
  });
  const [editingHeaderTitle, setEditingHeaderTitle] = useState(null);
  const [draggingHeaderTitle, setDraggingHeaderTitle] = useState(null);
  const [resizingHeaderTitle, setResizingHeaderTitle] = useState(null);
  
  // ========== 布局操作 ==========
  
  /**
   * 开始编辑布局
   */
  const handleStartEditingLayout = useCallback(() => {
    setSavedLayout({ ...panelPositions });
    setSavedButtons({ ...buttonPositions });
    setIsEditingLayout(true);
  }, [panelPositions, buttonPositions]);
  
  /**
   * 取消布局编辑
   */
  const handleCancelLayoutEdit = useCallback(() => {
    if (savedLayout) setPanelPositions(savedLayout);
    if (savedButtons) setButtonPositions(savedButtons);
    setSavedLayout(null);
    setSavedButtons(null);
    setSavedContentBlocks(null);
    setIsEditingLayout(false);
  }, [savedLayout, savedButtons]);
  
  /**
   * 完成布局编辑
   */
  const handleCompleteLayoutEdit = useCallback(() => {
    try {
      saveLayoutConfig(panelPositions);
      saveButtonConfig(buttonPositions);
      showToast?.('布局已保存');
    } catch (e) {
      console.error('保存布局失败', e);
      showToast?.('保存布局失败');
    }
    setSavedLayout(null);
    setSavedButtons(null);
    setSavedContentBlocks(null);
    setIsEditingLayout(false);
  }, [panelPositions, buttonPositions, showToast]);
  
  /**
   * 重置布局
   */
  const handleResetLayout = useCallback(() => {
    try {
      resetLayoutConfig();
      resetButtonConfig();
      setPanelPositions({});
      setButtonPositions({ ...DEFAULT_BUTTON_CONFIG });
      setHeaderTitles({});
      showToast?.('布局已重置');
    } catch (e) {
      console.error('重置布局失败', e);
    }
  }, [showToast]);
  
  /**
   * 更新面板位置
   */
  const updatePanelPosition = useCallback((panelId, position) => {
    setPanelPositions((prev) => ({
      ...prev,
      [panelId]: { ...(prev[panelId] || {}), ...position }
    }));
  }, []);
  
  /**
   * 更新按钮位置
   */
  const updateButtonPosition = useCallback((panelId, buttons) => {
    setButtonPositions((prev) => ({
      ...prev,
      [panelId]: buttons
    }));
  }, []);
  
  /**
   * 更新 Header 标题
   */
  const updateHeaderTitle = useCallback((titleKey, config) => {
    setHeaderTitles((prev) => ({
      ...prev,
      [titleKey]: { ...(prev[titleKey] || {}), ...config }
    }));
  }, []);
  
  return {
    // 状态
    isEditingLayout,
    setIsEditingLayout,
    panelPositions,
    setPanelPositions,
    buttonPositions,
    setButtonPositions,
    savedLayout,
    setSavedLayout,
    savedButtons,
    setSavedButtons,
    savedContentBlocks,
    setSavedContentBlocks,
    draggingButton,
    setDraggingButton,
    headerTitles,
    setHeaderTitles,
    editingHeaderTitle,
    setEditingHeaderTitle,
    draggingHeaderTitle,
    setDraggingHeaderTitle,
    resizingHeaderTitle,
    setResizingHeaderTitle,
    
    // 操作
    handleStartEditingLayout,
    handleCancelLayoutEdit,
    handleCompleteLayoutEdit,
    handleResetLayout,
    updatePanelPosition,
    updateButtonPosition,
    updateHeaderTitle,
  };
};

export default useLayoutEditor;
