/**
 * useOutline - 大纲管理 Hook
 * 从 SOPWorkbench.jsx 迁移的大纲相关状态和操作
 */
import { useState, useCallback } from 'react';

/**
 * 大纲管理 Hook
 * @param {object} options - 配置选项
 * @param {Function} options.showToast - Toast 提示函数
 * @param {Function} options.api - API 调用函数
 * @returns {object} 大纲状态和操作函数
 */
export const useOutline = ({ showToast, api } = {}) => {
  // ========== 核心状态 ==========
  const [template, setTemplate] = useState(null);
  const [outlineHistory, setOutlineHistory] = useState([]);
  
  // ========== 编辑状态 ==========
  const [outlineEditing, setOutlineEditing] = useState({});
  const [sectionDocLinks, setSectionDocLinks] = useState({}); // sectionId -> docId[]
  const [sectionDocPick, setSectionDocPick] = useState({}); // sectionId -> bool (是否正在选择文档)
  const [selectedOutlineExec, setSelectedOutlineExec] = useState({}); // sectionId -> bool
  const [sectionDocDone, setSectionDocDone] = useState({}); // sectionId -> bool
  const [summaryExpanded, setSummaryExpanded] = useState({}); // sectionId -> bool
  const [selectedSummaries, setSelectedSummaries] = useState({}); // sectionId||sumIdx -> bool
  const [sectionCollapsed, setSectionCollapsed] = useState({}); // sectionId -> bool
  const [sectionMergeType, setSectionMergeType] = useState({}); // sectionId -> 'paragraph'|'sentence'
  
  // ========== 编辑操作 ==========
  
  /**
   * 开始编辑大纲字段
   */
  const startEditOutline = useCallback((id, field, value, sumIdx = null) => {
    const key = sumIdx !== null ? `${id}||${field}||${sumIdx}` : `${id}||${field}`;
    setOutlineEditing((prev) => ({ ...prev, [key]: value }));
  }, []);
  
  /**
   * 取消编辑大纲字段
   */
  const cancelEditOutline = useCallback((id, field, sumIdx = null) => {
    const key = sumIdx !== null ? `${id}||${field}||${sumIdx}` : `${id}||${field}`;
    setOutlineEditing((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);
  
  /**
   * 获取编辑中的值
   */
  const getEditingValue = useCallback((id, field, sumIdx = null) => {
    const key = sumIdx !== null ? `${id}||${field}||${sumIdx}` : `${id}||${field}`;
    return outlineEditing[key];
  }, [outlineEditing]);
  
  /**
   * 检查是否正在编辑
   */
  const isEditing = useCallback((id, field, sumIdx = null) => {
    const key = sumIdx !== null ? `${id}||${field}||${sumIdx}` : `${id}||${field}`;
    return key in outlineEditing;
  }, [outlineEditing]);
  
  // ========== 选择操作 ==========
  
  /**
   * 切换 section 选中状态
   */
  const toggleSectionSelected = useCallback((sectionId, selected) => {
    setSelectedOutlineExec((prev) => {
      if (selected) {
        return { ...prev, [sectionId]: true };
      }
      const next = { ...prev };
      delete next[sectionId];
      return next;
    });
  }, []);
  
  /**
   * 获取选中的 section IDs
   */
  const getSelectedSectionIds = useCallback(() => {
    return Object.keys(selectedOutlineExec || {}).filter((k) => selectedOutlineExec[k]);
  }, [selectedOutlineExec]);
  
  /**
   * 清除所有选中
   */
  const clearSectionSelection = useCallback(() => {
    setSelectedOutlineExec({});
  }, []);
  
  // ========== 折叠操作 ==========
  
  /**
   * 切换 section 折叠状态
   */
  const toggleSectionCollapsed = useCallback((sectionId) => {
    setSectionCollapsed((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  }, []);
  
  /**
   * 检查 section 是否折叠
   */
  const isSectionCollapsed = useCallback((sectionId) => {
    return !!sectionCollapsed[sectionId];
  }, [sectionCollapsed]);
  
  // ========== 摘要合并 ==========
  
  /**
   * 设置 section 的合并类型
   */
  const selectSectionMergeType = useCallback((sectionId, mergeType) => {
    setSectionMergeType((prev) => ({
      ...prev,
      [sectionId]: mergeType
    }));
  }, []);
  
  /**
   * 获取 section 的合并类型
   * 默认使用句子拼接（sentence），将多个摘要首尾相连形成连续文本
   */
  const getSectionMergeType = useCallback((sectionId) => {
    return sectionMergeType[sectionId] || 'sentence';
  }, [sectionMergeType]);
  
  // ========== 模板操作 ==========
  
  /**
   * 更新模板 sections
   */
  const updateTemplateSections = useCallback((updater) => {
    setTemplate((prev) => {
      if (!prev) return prev;
      const nextSections = typeof updater === 'function' 
        ? updater(prev.sections || [])
        : updater;
      return { ...prev, sections: nextSections };
    });
  }, []);
  
  /**
   * 添加历史记录
   */
  const addToHistory = useCallback((templateSnapshot) => {
    setOutlineHistory((prev) => {
      const next = [...prev, templateSnapshot];
      // 最多保留 50 条历史
      if (next.length > 50) {
        return next.slice(-50);
      }
      return next;
    });
  }, []);
  
  return {
    // 状态
    template,
    setTemplate,
    outlineHistory,
    setOutlineHistory,
    outlineEditing,
    setOutlineEditing,
    sectionDocLinks,
    setSectionDocLinks,
    sectionDocPick,
    setSectionDocPick,
    selectedOutlineExec,
    setSelectedOutlineExec,
    sectionDocDone,
    setSectionDocDone,
    summaryExpanded,
    setSummaryExpanded,
    selectedSummaries,
    setSelectedSummaries,
    sectionCollapsed,
    setSectionCollapsed,
    sectionMergeType,
    setSectionMergeType,
    
    // 编辑操作
    startEditOutline,
    cancelEditOutline,
    getEditingValue,
    isEditing,
    
    // 选择操作
    toggleSectionSelected,
    getSelectedSectionIds,
    clearSectionSelection,
    
    // 折叠操作
    toggleSectionCollapsed,
    isSectionCollapsed,
    
    // 摘要合并
    selectSectionMergeType,
    getSectionMergeType,
    
    // 模板操作
    updateTemplateSections,
    addToHistory,
  };
};

export default useOutline;
