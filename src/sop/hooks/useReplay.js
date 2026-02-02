/**
 * useReplay - Replay 执行管理 Hook
 * 从 SOPWorkbench.jsx 迁移的 Replay 相关状态和操作
 */
import { useState, useCallback } from 'react';

/**
 * Replay 执行管理 Hook
 * @param {object} options - 配置选项
 * @param {Function} options.showToast - Toast 提示函数
 * @param {Function} options.api - API 调用函数
 * @returns {object} Replay 状态和操作函数
 */
export const useReplay = ({ showToast, api } = {}) => {
  // ========== Replay 状态 ==========
  // depositId -> {running, bySection:{[sectionId]:{status,message,replayMode}}}
  const [replayState, setReplayState] = useState({});
  
  // Replay 目录配置
  const [replayDirConfig, setReplayDirConfig] = useState({ 
    dirPath: '', 
    autoLoadFiles: true 
  });
  const [replayDirConfigSaving, setReplayDirConfigSaving] = useState(false);
  
  // ========== 状态管理函数 ==========
  
  /**
   * 设置单个 section 的 Replay 状态
   */
  const setReplaySectionStatus = useCallback((depositId, sectionId, status, message, replayMode = null) => {
    setReplayState((prev) => ({
      ...prev,
      [depositId]: {
        ...(prev?.[depositId] || {}),
        bySection: {
          ...(prev?.[depositId]?.bySection || {}),
          [sectionId]: { 
            status, 
            message: message || '',
            replayMode: replayMode || prev?.[depositId]?.bySection?.[sectionId]?.replayMode || null
          }
        }
      }
    }));
  }, []);
  
  /**
   * 设置整个 deposit 的运行状态
   */
  const setDepositReplayRunning = useCallback((depositId, running) => {
    setReplayState((prev) => ({
      ...prev,
      [depositId]: {
        ...(prev?.[depositId] || {}),
        running
      }
    }));
  }, []);
  
  /**
   * 清除 deposit 的 Replay 状态
   */
  const clearDepositReplayState = useCallback((depositId) => {
    setReplayState((prev) => {
      const next = { ...prev };
      delete next[depositId];
      return next;
    });
  }, []);
  
  /**
   * 获取 deposit 的 Replay 状态汇总
   */
  const getDepositReplayStatus = useCallback((deposit) => {
    const bySection = replayState?.[deposit?.id]?.bySection || {};
    const statuses = (deposit?.sections || [])
      .map((s) => bySection?.[s.id]?.status)
      .filter(Boolean);
    
    if (!statuses.length) return '';
    
    // 完全成功
    if (statuses.every((s) => s === 'done')) return 'done';
    // 完全失败
    if (statuses.every((s) => s === 'fail')) return 'fail';
    // 完全跳过
    if (statuses.every((s) => s === 'pass')) return 'pass';
    
    // 混合状态
    const hasDone = statuses.some((s) => s === 'done');
    const hasPass = statuses.some((s) => s === 'pass');
    const hasFail = statuses.some((s) => s === 'fail');
    
    if (hasDone && !hasFail) return 'partial done';
    if (hasPass && !hasFail && !hasDone) return 'pass';
    
    return 'partial done';
  }, [replayState]);
  
  /**
   * 获取 deposit 的 Replay 失败原因
   */
  const getDepositReplayReason = useCallback((deposit) => {
    const bySection = replayState?.[deposit?.id]?.bySection || {};
    const issues = (deposit?.sections || [])
      .map((s) => {
        const state = bySection?.[s.id];
        if (!state || state.status === 'done' || state.status === 'running') return null;
        const title = (s.action || s.id || '未命名').toString();
        const msg = (state.message || '').toString().trim();
        return msg ? `${title}：${state.status} - ${msg}` : `${title}：${state.status}`;
      })
      .filter(Boolean);
    
    if (!issues.length) return '';
    if (issues.length <= 3) return issues.join('、');
    return `${issues.slice(0, 3).join('、')} 等 ${issues.length} 项`;
  }, [replayState]);
  
  /**
   * 检查 deposit 是否正在运行
   */
  const isDepositReplayRunning = useCallback((depositId) => {
    return !!replayState?.[depositId]?.running;
  }, [replayState]);
  
  /**
   * 获取 section 的 Replay 状态
   */
  const getSectionReplayStatus = useCallback((depositId, sectionId) => {
    return replayState?.[depositId]?.bySection?.[sectionId] || null;
  }, [replayState]);
  
  // ========== Replay 目录配置 ==========
  
  /**
   * 加载 Replay 目录配置
   */
  const loadReplayDirConfig = useCallback(async () => {
    if (!api) return null;
    try {
      const res = await api('/api/multi/replay/config');
      if (res && !res.error) {
        setReplayDirConfig({
          dirPath: res.dirPath || '',
          autoLoadFiles: res.autoLoadFiles !== false
        });
        return res;
      }
    } catch (e) {
      console.error('[useReplay] 加载 Replay 配置失败', e);
    }
    return null;
  }, [api]);
  
  /**
   * 保存 Replay 目录配置
   */
  const saveReplayDirConfig = useCallback(async (config) => {
    if (!api) return false;
    setReplayDirConfigSaving(true);
    try {
      const res = await api('/api/multi/replay/config', {
        method: 'POST',
        body: config
      });
      if (res && !res.error) {
        setReplayDirConfig(config);
        showToast?.('Replay 目录配置已保存');
        return true;
      }
      showToast?.('保存失败: ' + (res?.error || '未知错误'));
    } catch (e) {
      console.error('[useReplay] 保存 Replay 配置失败', e);
      showToast?.('保存失败');
    } finally {
      setReplayDirConfigSaving(false);
    }
    return false;
  }, [api, showToast]);
  
  return {
    // 状态
    replayState,
    setReplayState,
    replayDirConfig,
    setReplayDirConfig,
    replayDirConfigSaving,
    setReplayDirConfigSaving,
    
    // 状态管理
    setReplaySectionStatus,
    setDepositReplayRunning,
    clearDepositReplayState,
    getDepositReplayStatus,
    getDepositReplayReason,
    isDepositReplayRunning,
    getSectionReplayStatus,
    
    // 配置管理
    loadReplayDirConfig,
    saveReplayDirConfig,
  };
};

export default useReplay;
