/**
 * useLlmButtons - LLM 按钮管理 Hook
 * 从 SOPWorkbench.jsx 迁移的 LLM 按钮相关状态和操作
 */
import { useState, useCallback } from 'react';
import { loadLlmButtonsFromStorage, defaultLlmButtons } from '../SOPUtils';

const LLM_BUTTONS_STORAGE_KEY = 'llm_buttons_v2';

/**
 * LLM 按钮管理 Hook
 * @param {object} options - 配置选项
 * @param {Function} options.showToast - Toast 提示函数
 * @returns {object} LLM 按钮状态和操作函数
 */
export const useLlmButtons = ({ showToast } = {}) => {
  // ========== 按钮状态 ==========
  const [llmButtons, setLlmButtons] = useState(() => loadLlmButtonsFromStorage());
  const [buttonDraft, setButtonDraft] = useState(null);
  const [editingButtonId, setEditingButtonId] = useState(null);
  
  // ========== 持久化 ==========
  
  /**
   * 保存按钮到 localStorage
   */
  const persistButtons = useCallback((buttons) => {
    try {
      localStorage.setItem(LLM_BUTTONS_STORAGE_KEY, JSON.stringify(buttons || []));
    } catch (_) { /* ignore */ }
  }, []);
  
  // ========== 按钮编辑 ==========
  
  /**
   * 开始编辑按钮
   */
  const startEditButton = useCallback((btn) => {
    setEditingButtonId(btn.id);
    setButtonDraft({ ...btn });
  }, []);
  
  /**
   * 取消编辑按钮
   */
  const cancelEditButton = useCallback(() => {
    setEditingButtonId(null);
    setButtonDraft(null);
  }, []);
  
  /**
   * 保存按钮草稿
   */
  const saveButtonDraft = useCallback(() => {
    if (!buttonDraft || !editingButtonId) return false;
    
    setLlmButtons((prev) => {
      const next = prev.map((b) => b.id === editingButtonId ? { ...buttonDraft } : b);
      persistButtons(next);
      return next;
    });
    
    setEditingButtonId(null);
    setButtonDraft(null);
    showToast?.('按钮配置已保存');
    return true;
  }, [buttonDraft, editingButtonId, persistButtons, showToast]);
  
  /**
   * 更新草稿字段
   */
  const updateDraftField = useCallback((field, value) => {
    setButtonDraft((prev) => prev ? { ...prev, [field]: value } : null);
  }, []);
  
  // ========== 按钮管理 ==========
  
  /**
   * 添加新按钮
   */
  const addButton = useCallback((buttonData) => {
    const newButton = {
      id: `btn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      label: '新按钮',
      kind: 'custom',
      enabled: true,
      systemPrompt: '',
      userPrompt: '',
      ioRules: [],
      ...buttonData
    };
    
    setLlmButtons((prev) => {
      const next = [...prev, newButton];
      persistButtons(next);
      return next;
    });
    
    return newButton;
  }, [persistButtons]);
  
  /**
   * 删除按钮
   */
  const deleteButton = useCallback((buttonId) => {
    setLlmButtons((prev) => {
      const next = prev.filter((b) => b.id !== buttonId);
      persistButtons(next);
      return next;
    });
    showToast?.('按钮已删除');
  }, [persistButtons, showToast]);
  
  /**
   * 切换按钮启用状态
   */
  const toggleButtonEnabled = useCallback((buttonId, enabled) => {
    setLlmButtons((prev) => {
      const next = prev.map((b) => b.id === buttonId ? { ...b, enabled } : b);
      persistButtons(next);
      return next;
    });
  }, [persistButtons]);
  
  /**
   * 重置为默认按钮
   */
  const resetToDefaults = useCallback(() => {
    const defaults = defaultLlmButtons();
    setLlmButtons(defaults);
    persistButtons(defaults);
    showToast?.('已重置为默认配置');
  }, [persistButtons, showToast]);
  
  // ========== IO 规则操作 ==========
  
  /**
   * 添加 IO 规则到草稿
   */
  const addIoRuleToDraft = useCallback(() => {
    if (!buttonDraft) return;
    const newRule = {
      id: `io_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      enabled: true,
      inputSource: '',
      inputMatch: '',
      outputTarget: '',
      outputAction: 'replace'
    };
    setButtonDraft((prev) => ({
      ...prev,
      ioRules: [...(prev.ioRules || []), newRule]
    }));
  }, [buttonDraft]);
  
  /**
   * 更新 IO 规则
   */
  const updateIoRuleInDraft = useCallback((ruleId, patch) => {
    setButtonDraft((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        ioRules: (prev.ioRules || []).map((r) => r.id === ruleId ? { ...r, ...patch } : r)
      };
    });
  }, []);
  
  /**
   * 删除 IO 规则
   */
  const deleteIoRuleFromDraft = useCallback((ruleId) => {
    setButtonDraft((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        ioRules: (prev.ioRules || []).filter((r) => r.id !== ruleId)
      };
    });
  }, []);
  
  // ========== 查询 ==========
  
  /**
   * 获取调度按钮配置
   */
  const getDispatchButton = useCallback(() => {
    return llmButtons.find((b) => b.kind === 'dispatch') || null;
  }, [llmButtons]);
  
  /**
   * 获取最终生成按钮配置
   */
  const getFinalGenerateButton = useCallback(() => {
    return llmButtons.find((b) => b.kind === 'final_generate') || null;
  }, [llmButtons]);
  
  /**
   * 获取启用的按钮列表
   */
  const getEnabledButtons = useCallback(() => {
    return llmButtons.filter((b) => b.enabled !== false);
  }, [llmButtons]);
  
  return {
    // 状态
    llmButtons,
    setLlmButtons,
    buttonDraft,
    setButtonDraft,
    editingButtonId,
    setEditingButtonId,
    
    // 持久化
    persistButtons,
    
    // 编辑操作
    startEditButton,
    cancelEditButton,
    saveButtonDraft,
    updateDraftField,
    
    // 按钮管理
    addButton,
    deleteButton,
    toggleButtonEnabled,
    resetToDefaults,
    
    // IO 规则操作
    addIoRuleToDraft,
    updateIoRuleInDraft,
    deleteIoRuleFromDraft,
    
    // 查询
    getDispatchButton,
    getFinalGenerateButton,
    getEnabledButtons,
  };
};

export default useLlmButtons;
