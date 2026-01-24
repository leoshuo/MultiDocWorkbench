/**
 * useAsync Hook
 * 提供异步操作的状态管理
 */
import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * 异步操作状态
 * @typedef {Object} AsyncState
 * @property {boolean} loading - 是否加载中
 * @property {*} data - 数据
 * @property {Error} error - 错误
 */

/**
 * 异步操作 Hook
 * @param {Function} asyncFn - 异步函数
 * @param {Object} options - 配置选项
 * @param {boolean} options.immediate - 是否立即执行
 * @param {*} options.initialData - 初始数据
 * @param {Function} options.onSuccess - 成功回调
 * @param {Function} options.onError - 错误回调
 * @returns {Object} { loading, data, error, execute, reset }
 */
export const useAsync = (asyncFn, options = {}) => {
  const {
    immediate = false,
    initialData = null,
    onSuccess = null,
    onError = null,
  } = options;

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(initialData);
  const [error, setError] = useState(null);
  
  // 用于追踪组件是否已卸载
  const mountedRef = useRef(true);
  // 用于取消请求
  const abortControllerRef = useRef(null);

  const execute = useCallback(async (...args) => {
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const result = await asyncFn(...args, { signal: abortControllerRef.current.signal });
      
      if (mountedRef.current) {
        setData(result);
        setLoading(false);
        if (typeof onSuccess === 'function') {
          onSuccess(result);
        }
      }
      
      return result;
    } catch (err) {
      if (err.name === 'AbortError') {
        // 请求被取消，不更新状态
        return;
      }
      
      if (mountedRef.current) {
        setError(err);
        setLoading(false);
        if (typeof onError === 'function') {
          onError(err);
        }
      }
      
      throw err;
    }
  }, [asyncFn, onSuccess, onError]);

  const reset = useCallback(() => {
    setLoading(false);
    setData(initialData);
    setError(null);
  }, [initialData]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // 组件卸载时标记
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // 立即执行
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    loading,
    data,
    error,
    execute,
    reset,
    cancel,
  };
};

/**
 * 带重试的异步操作 Hook
 * @param {Function} asyncFn - 异步函数
 * @param {Object} options - 配置选项
 * @param {number} options.maxRetries - 最大重试次数
 * @param {number} options.retryDelay - 重试延迟（毫秒）
 */
export const useAsyncRetry = (asyncFn, options = {}) => {
  const { maxRetries = 3, retryDelay = 1000, ...restOptions } = options;
  const [retryCount, setRetryCount] = useState(0);

  const wrappedFn = useCallback(async (...args) => {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await asyncFn(...args);
        setRetryCount(attempt);
        return result;
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          setRetryCount(attempt + 1);
          await new Promise(r => setTimeout(r, retryDelay * Math.pow(2, attempt)));
        }
      }
    }
    throw lastError;
  }, [asyncFn, maxRetries, retryDelay]);

  const asyncState = useAsync(wrappedFn, restOptions);

  return {
    ...asyncState,
    retryCount,
  };
};

export default useAsync;
