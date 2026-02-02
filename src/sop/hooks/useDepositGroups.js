/**
 * useDepositGroups - 沉淀组管理 Hook
 * 从 SOPWorkbench.jsx 迁移的沉淀组相关状态和操作
 */
import { useState, useCallback } from 'react';

/**
 * 沉淀组管理 Hook
 * @param {object} options - 配置选项
 * @param {Function} options.showToast - Toast 提示函数
 * @param {Function} options.api - API 调用函数
 * @returns {object} 沉淀组状态和操作函数
 */
export const useDepositGroups = ({ showToast, api } = {}) => {
  // ========== 沉淀组状态 ==========
  const [depositGroups, setDepositGroups] = useState([]);
  const [selectedDepositGroupId, setSelectedDepositGroupId] = useState('');
  const [depositGroupReplay, setDepositGroupReplay] = useState({});
  const [batchReplayRunning, setBatchReplayRunning] = useState(false);
  
  // ========== 加载操作 ==========
  
  /**
   * 加载沉淀组列表
   */
  const loadDepositGroups = useCallback(async (silent = false) => {
    if (!api) return [];
    try {
      const data = await api('/api/multi/precipitation/groups');
      const list = Array.isArray(data) ? data : [];
      setDepositGroups(list);
      return list;
    } catch (e) {
      console.error('[useDepositGroups] 加载沉淀组失败', e);
      if (!silent) showToast?.('加载沉淀组失败');
      return [];
    }
  }, [api, showToast]);
  
  // ========== CRUD 操作 ==========
  
  /**
   * 创建沉淀组
   */
  const createDepositGroup = useCallback(async (name, depositIds = []) => {
    if (!api || !name) return null;
    try {
      const res = await api('/api/multi/precipitation/groups', {
        method: 'POST',
        body: { name, depositIds }
      });
      if (res?.id) {
        setDepositGroups((prev) => [...prev, res]);
        showToast?.('沉淀组已创建');
        return res;
      }
    } catch (e) {
      console.error('[useDepositGroups] 创建沉淀组失败', e);
      showToast?.('创建沉淀组失败');
    }
    return null;
  }, [api, showToast]);
  
  /**
   * 更新沉淀组
   */
  const updateDepositGroup = useCallback(async (groupId, patch, successMsg) => {
    if (!api || !groupId) return false;
    try {
      const res = await api(`/api/multi/precipitation/groups/${groupId}`, {
        method: 'PATCH',
        body: patch
      });
      if (res?.id) {
        setDepositGroups((prev) => prev.map((g) => g.id === groupId ? res : g));
        if (successMsg) showToast?.(successMsg);
        return true;
      }
    } catch (e) {
      console.error('[useDepositGroups] 更新沉淀组失败', e);
      showToast?.('更新沉淀组失败');
    }
    return false;
  }, [api, showToast]);
  
  /**
   * 重命名沉淀组
   */
  const renameDepositGroup = useCallback(async (groupId, newName) => {
    return updateDepositGroup(groupId, { name: newName }, '沉淀组已重命名');
  }, [updateDepositGroup]);
  
  /**
   * 删除沉淀组
   */
  const deleteDepositGroup = useCallback(async (groupId) => {
    if (!api || !groupId) return false;
    try {
      await api(`/api/multi/precipitation/groups/${groupId}`, { method: 'DELETE' });
      setDepositGroups((prev) => prev.filter((g) => g.id !== groupId));
      if (selectedDepositGroupId === groupId) {
        setSelectedDepositGroupId('');
      }
      showToast?.('沉淀组已删除');
      return true;
    } catch (e) {
      console.error('[useDepositGroups] 删除沉淀组失败', e);
      showToast?.('删除沉淀组失败');
      return false;
    }
  }, [api, selectedDepositGroupId, showToast]);
  
  // ========== 选择操作 ==========
  
  /**
   * 选择沉淀组
   */
  const selectDepositGroup = useCallback((groupId) => {
    setSelectedDepositGroupId(groupId);
  }, []);
  
  /**
   * 获取当前选中的沉淀组
   */
  const getSelectedGroup = useCallback(() => {
    return depositGroups.find((g) => g.id === selectedDepositGroupId) || null;
  }, [depositGroups, selectedDepositGroupId]);
  
  // ========== Replay 状态 ==========
  
  /**
   * 设置沉淀组 Replay 状态
   */
  const setGroupReplayStatus = useCallback((groupId, status) => {
    setDepositGroupReplay((prev) => ({ ...prev, [groupId]: status }));
  }, []);
  
  /**
   * 清除沉淀组 Replay 状态
   */
  const clearGroupReplayStatus = useCallback((groupId) => {
    setDepositGroupReplay((prev) => {
      const next = { ...prev };
      delete next[groupId];
      return next;
    });
  }, []);
  
  /**
   * 获取沉淀组 Replay 状态
   */
  const getGroupReplayStatus = useCallback((groupId) => {
    return depositGroupReplay[groupId] || null;
  }, [depositGroupReplay]);
  
  return {
    // 状态
    depositGroups,
    setDepositGroups,
    selectedDepositGroupId,
    setSelectedDepositGroupId,
    depositGroupReplay,
    setDepositGroupReplay,
    batchReplayRunning,
    setBatchReplayRunning,
    
    // 加载操作
    loadDepositGroups,
    
    // CRUD 操作
    createDepositGroup,
    updateDepositGroup,
    renameDepositGroup,
    deleteDepositGroup,
    
    // 选择操作
    selectDepositGroup,
    getSelectedGroup,
    
    // Replay 状态
    setGroupReplayStatus,
    clearGroupReplayStatus,
    getGroupReplayStatus,
  };
};

export default useDepositGroups;
