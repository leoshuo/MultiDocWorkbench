/**
 * useDispatch - 指令调度管理 Hook
 * 从 SOPWorkbench.jsx 迁移的指令调度相关状态和操作
 */
import { useState, useCallback } from 'react';

/**
 * 指令调度管理 Hook
 * @param {object} options - 配置选项
 * @param {Function} options.showToast - Toast 提示函数
 * @returns {object} 调度状态和操作函数
 */
export const useDispatch = ({ showToast } = {}) => {
  // ========== 调度状态 ==========
  const [dispatching, setDispatching] = useState(false);
  const [dispatchLogs, setDispatchLogs] = useState([]);
  const [dispatchMode, setDispatchMode] = useState('doc'); // 'doc' | 'result'
  
  const [dispatchInputHeight, setDispatchInputHeight] = useState(() => {
    try {
      const saved = localStorage.getItem('dispatch_input_height');
      if (saved) {
        const h = parseInt(saved, 10);
        if (h >= 60 && h <= 600) return h;
      }
    } catch (_) { /* ignore */ }
    return 80;
  });
  
  // ========== 日志操作 ==========
  
  /**
   * 添加调度日志
   */
  const addDispatchLog = useCallback((log) => {
    setDispatchLogs((prev) => [...prev, {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      ...log
    }]);
  }, []);
  
  /**
   * 清空调度日志
   */
  const clearDispatchLogs = useCallback(() => {
    setDispatchLogs([]);
  }, []);
  
  /**
   * 获取最近的日志
   */
  const getRecentLogs = useCallback((count = 10) => {
    return dispatchLogs.slice(-count);
  }, [dispatchLogs]);
  
  // ========== 高度调整 ==========
  
  /**
   * 更新输入框高度并持久化
   */
  const updateDispatchInputHeight = useCallback((height) => {
    const h = Math.max(60, Math.min(600, height));
    setDispatchInputHeight(h);
    try {
      localStorage.setItem('dispatch_input_height', String(h));
    } catch (_) { /* ignore */ }
  }, []);
  
  // ========== 模式切换 ==========
  
  /**
   * 切换调度模式
   */
  const toggleDispatchMode = useCallback(() => {
    setDispatchMode((prev) => prev === 'doc' ? 'result' : 'doc');
  }, []);
  
  return {
    // 状态
    dispatching,
    setDispatching,
    dispatchLogs,
    setDispatchLogs,
    dispatchMode,
    setDispatchMode,
    dispatchInputHeight,
    setDispatchInputHeight,
    
    // 日志操作
    addDispatchLog,
    clearDispatchLogs,
    getRecentLogs,
    
    // 高度调整
    updateDispatchInputHeight,
    
    // 模式切换
    toggleDispatchMode,
  };
};

export default useDispatch;
