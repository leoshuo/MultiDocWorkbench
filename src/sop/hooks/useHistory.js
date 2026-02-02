/**
 * useHistory - 历史记录管理 Hook
 * 从 SOPWorkbench.jsx 迁移的历史记录相关状态和操作
 */
import { useState, useCallback } from 'react';

/**
 * 历史记录管理 Hook
 * @param {object} options - 配置选项
 * @param {Function} options.showToast - Toast 提示函数
 * @param {Function} options.api - API 调用函数
 * @returns {object} 历史记录状态和操作函数
 */
export const useHistory = ({ showToast, api } = {}) => {
  // ========== 历史状态 ==========
  const [outlineHistory, setOutlineHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // ========== 历史操作 ==========
  
  /**
   * 加载历史列表
   */
  const loadHistory = useCallback(async () => {
    if (!api) return [];
    setHistoryLoading(true);
    try {
      const data = await api('/api/outline-history');
      const list = Array.isArray(data) ? data : [];
      setOutlineHistory(list);
      return list;
    } catch (e) {
      console.error('[useHistory] 加载历史失败', e);
      return [];
    } finally {
      setHistoryLoading(false);
    }
  }, [api]);
  
  /**
   * 保存历史
   */
  const saveHistory = useCallback(async (historyItem) => {
    if (!api || !historyItem) return null;
    try {
      const res = await api('/api/outline-history', {
        method: 'POST',
        body: historyItem
      });
      if (res?.id) {
        setOutlineHistory((prev) => [res, ...prev.filter((h) => h.id !== res.id)]);
        showToast?.('历史已保存');
        return res;
      }
    } catch (e) {
      console.error('[useHistory] 保存历史失败', e);
      showToast?.('保存历史失败');
    }
    return null;
  }, [api, showToast]);
  
  /**
   * 删除历史
   */
  const deleteHistory = useCallback(async (historyId) => {
    if (!api || !historyId) return false;
    try {
      await api(`/api/outline-history/${historyId}`, { method: 'DELETE' });
      setOutlineHistory((prev) => prev.filter((h) => h.id !== historyId));
      showToast?.('历史已删除');
      return true;
    } catch (e) {
      console.error('[useHistory] 删除历史失败', e);
      showToast?.('删除历史失败');
      return false;
    }
  }, [api, showToast]);
  
  /**
   * 更新历史标题
   */
  const updateHistoryTitle = useCallback(async (historyId, newTitle) => {
    if (!api || !historyId || !newTitle) return false;
    try {
      const res = await api(`/api/outline-history/${historyId}`, {
        method: 'PATCH',
        body: { title: newTitle }
      });
      if (res?.id) {
        setOutlineHistory((prev) => prev.map((h) => h.id === historyId ? { ...h, title: newTitle } : h));
        showToast?.('标题已更新');
        return true;
      }
    } catch (e) {
      console.error('[useHistory] 更新标题失败', e);
      showToast?.('更新标题失败');
    }
    return false;
  }, [api, showToast]);
  
  /**
   * 获取历史项
   */
  const getHistoryItem = useCallback((historyId) => {
    return outlineHistory.find((h) => h.id === historyId) || null;
  }, [outlineHistory]);
  
  /**
   * 按标题查找历史
   */
  const findHistoryByTitle = useCallback((title) => {
    return outlineHistory.find((h) => (h.title || h.docName) === title) || null;
  }, [outlineHistory]);
  
  return {
    // 状态
    outlineHistory,
    setOutlineHistory,
    historyLoading,
    setHistoryLoading,
    
    // 操作
    loadHistory,
    saveHistory,
    deleteHistory,
    updateHistoryTitle,
    
    // 查询
    getHistoryItem,
    findHistoryByTitle,
  };
};

export default useHistory;
