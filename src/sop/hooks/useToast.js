/**
 * useToast Hook
 * 提供统一的 Toast 提示消息管理
 */
import { useState, useCallback, useRef } from 'react';

/**
 * Toast 提示消息 Hook
 * @param {Object} options - 配置选项
 * @param {number} options.duration - 默认显示时长（毫秒）
 * @returns {Object} { toast, showToast, hideToast }
 */
export const useToast = (options = {}) => {
  const { duration: defaultDuration = 3000 } = options;
  
  const [toast, setToast] = useState('');
  const timerRef = useRef(null);

  const hideToast = useCallback(() => {
    setToast('');
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const showToast = useCallback((message, duration = defaultDuration) => {
    // 清除之前的定时器
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    setToast(message);
    
    // 自动隐藏
    if (duration > 0) {
      timerRef.current = setTimeout(() => {
        setToast('');
        timerRef.current = null;
      }, duration);
    }
  }, [defaultDuration]);

  return {
    toast,
    showToast,
    hideToast,
  };
};

export default useToast;
