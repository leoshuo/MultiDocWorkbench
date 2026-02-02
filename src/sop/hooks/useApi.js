/**
 * useApi - API 操作 Hook
 * 封装常用的 API 调用函数
 */
import { useCallback } from 'react';
import { api } from '../SOPUtils';

/**
 * API 操作 Hook
 * @param {object} options - 配置选项
 * @param {Function} options.showToast - Toast 提示函数
 * @returns {object} API 操作函数
 */
export const useApi = ({ showToast } = {}) => {
  
  /**
   * 刷新文档列表
   */
  const refreshDocs = useCallback(async () => {
    try {
      const data = await api('/api/docs');
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error('[useApi] 刷新文档失败', e);
      return [];
    }
  }, []);
  
  /**
   * 刷新场景数据
   */
  const refreshScene = useCallback(async (sceneId) => {
    if (!sceneId) return null;
    try {
      const data = await api(`/api/scene/${sceneId}`);
      return data?.scene || null;
    } catch (e) {
      console.error('[useApi] 刷新场景失败', e);
      return null;
    }
  }, []);
  
  /**
   * 保存布局配置
   */
  const saveLayout = useCallback(async (layout) => {
    try {
      const res = await api('/api/layout', { method: 'POST', body: { layout } });
      if (res?.ok !== false) {
        showToast?.('布局已保存');
        return true;
      }
    } catch (e) {
      console.error('[useApi] 保存布局失败', e);
    }
    showToast?.('保存布局失败');
    return false;
  }, [showToast]);
  
  /**
   * 保存按钮配置
   */
  const saveButtons = useCallback(async (buttons) => {
    try {
      const res = await api('/api/buttons', { method: 'POST', body: { buttons } });
      if (res?.ok !== false) {
        showToast?.('按钮配置已保存');
        return true;
      }
    } catch (e) {
      console.error('[useApi] 保存按钮失败', e);
    }
    showToast?.('保存按钮配置失败');
    return false;
  }, [showToast]);
  
  /**
   * 获取大纲缓存
   */
  const getOutlineCache = useCallback(async () => {
    try {
      const res = await api('/api/outline/cache');
      return res?.template || null;
    } catch (e) {
      console.error('[useApi] 获取大纲缓存失败', e);
      return null;
    }
  }, []);
  
  /**
   * 保存大纲缓存
   */
  const saveOutlineCache = useCallback(async (template) => {
    try {
      await api('/api/outline/cache', { method: 'POST', body: { template } });
      return true;
    } catch (e) {
      console.error('[useApi] 保存大纲缓存失败', e);
      return false;
    }
  }, []);
  
  /**
   * 获取历史大纲列表
   */
  const getOutlineHistory = useCallback(async () => {
    try {
      const data = await api('/api/multi/outlines');
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error('[useApi] 获取历史大纲失败', e);
      return [];
    }
  }, []);
  
  /**
   * 保存历史大纲
   */
  const saveOutlineHistory = useCallback(async (historyItem) => {
    try {
      await api('/api/multi/outlines', { method: 'POST', body: historyItem });
      return true;
    } catch (e) {
      console.error('[useApi] 保存历史大纲失败', e);
      return false;
    }
  }, []);
  
  /**
   * 获取沉淀集列表
   */
  const getDepositGroups = useCallback(async () => {
    try {
      const data = await api('/api/multi/precipitation/groups');
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error('[useApi] 获取沉淀集失败', e);
      return [];
    }
  }, []);
  
  /**
   * 获取沉淀记录列表
   */
  const getDepositRecords = useCallback(async () => {
    try {
      const data = await api('/api/multi/precipitation/records');
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error('[useApi] 获取沉淀记录失败', e);
      return [];
    }
  }, []);
  
  /**
   * 保存沉淀记录
   */
  const saveDepositRecord = useCallback(async (record) => {
    try {
      const res = await api('/api/multi/precipitation/records', { 
        method: 'POST', 
        body: record 
      });
      return res || null;
    } catch (e) {
      console.error('[useApi] 保存沉淀记录失败', e);
      return null;
    }
  }, []);
  
  /**
   * 更新沉淀记录
   */
  const updateDepositRecord = useCallback(async (recordId, updates) => {
    try {
      const res = await api(`/api/multi/precipitation/records/${recordId}`, { 
        method: 'PUT', 
        body: updates 
      });
      return res || null;
    } catch (e) {
      console.error('[useApi] 更新沉淀记录失败', e);
      return null;
    }
  }, []);
  
  /**
   * 删除沉淀记录
   */
  const deleteDepositRecord = useCallback(async (recordId) => {
    try {
      await api(`/api/multi/precipitation/records/${recordId}`, { method: 'DELETE' });
      return true;
    } catch (e) {
      console.error('[useApi] 删除沉淀记录失败', e);
      return false;
    }
  }, []);
  
  /**
   * 获取 Replay 目录配置
   */
  const getReplayConfig = useCallback(async () => {
    try {
      const res = await api('/api/multi/replay/config');
      return res || { dirPath: '', autoLoadFiles: true };
    } catch (e) {
      console.error('[useApi] 获取 Replay 配置失败', e);
      return { dirPath: '', autoLoadFiles: true };
    }
  }, []);
  
  /**
   * 保存 Replay 目录配置
   */
  const saveReplayConfig = useCallback(async (config) => {
    try {
      const res = await api('/api/multi/replay/config', { 
        method: 'POST', 
        body: config 
      });
      if (res?.ok !== false) {
        showToast?.('Replay 配置已保存');
        return true;
      }
    } catch (e) {
      console.error('[useApi] 保存 Replay 配置失败', e);
    }
    showToast?.('保存 Replay 配置失败');
    return false;
  }, [showToast]);
  
  return {
    // 文档相关
    refreshDocs,
    
    // 场景相关
    refreshScene,
    
    // 布局相关
    saveLayout,
    saveButtons,
    
    // 大纲相关
    getOutlineCache,
    saveOutlineCache,
    getOutlineHistory,
    saveOutlineHistory,
    
    // 沉淀相关
    getDepositGroups,
    getDepositRecords,
    saveDepositRecord,
    updateDepositRecord,
    deleteDepositRecord,
    
    // Replay 相关
    getReplayConfig,
    saveReplayConfig,
  };
};

export default useApi;
