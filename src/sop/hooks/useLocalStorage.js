/**
 * useLocalStorage Hook
 * 提供与 localStorage 同步的状态管理
 */
import { useState, useCallback, useEffect } from 'react';
import { safeJsonParse, safeJsonStringify } from '../utils/safeOps';

/**
 * LocalStorage 状态同步 Hook
 * @param {string} key - 存储键名
 * @param {*} initialValue - 初始值
 * @param {Object} options - 配置选项
 * @param {Function} options.serializer - 自定义序列化函数
 * @param {Function} options.deserializer - 自定义反序列化函数
 * @returns {Array} [value, setValue, remove]
 */
export const useLocalStorage = (key, initialValue, options = {}) => {
  const {
    serializer = safeJsonStringify,
    deserializer = (str) => safeJsonParse(str, initialValue),
  } = options;

  // 初始化状态
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item !== null ? deserializer(item) : initialValue;
    } catch (error) {
      console.warn(`[useLocalStorage] Error reading "${key}":`, error);
      return initialValue;
    }
  });

  // 设置值
  const setValue = useCallback((value) => {
    try {
      // 支持函数式更新
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, serializer(valueToStore));
      }
    } catch (error) {
      console.warn(`[useLocalStorage] Error setting "${key}":`, error);
    }
  }, [key, serializer, storedValue]);

  // 移除值
  const remove = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn(`[useLocalStorage] Error removing "${key}":`, error);
    }
  }, [key, initialValue]);

  // 监听其他标签页的变化
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === key && e.newValue !== null) {
        setStoredValue(deserializer(e.newValue));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, deserializer]);

  return [storedValue, setValue, remove];
};

export default useLocalStorage;
