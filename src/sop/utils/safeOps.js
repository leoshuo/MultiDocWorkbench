/**
 * 安全操作工具函数
 * 提供防御性编程工具，减少运行时错误
 */

/**
 * 安全获取嵌套属性，避免 Cannot read property of undefined 错误
 * @param {Object} obj - 源对象
 * @param {string} path - 属性路径，如 'a.b.c'
 * @param {*} defaultValue - 默认值
 * @returns {*} 属性值或默认值
 * @example
 * safeGet({ a: { b: 1 } }, 'a.b') // => 1
 * safeGet({ a: { b: 1 } }, 'a.c.d', 0) // => 0
 */
export const safeGet = (obj, path, defaultValue = undefined) => {
  if (obj == null || typeof path !== 'string') {
    return defaultValue;
  }
  try {
    const result = path.split('.').reduce((o, k) => (o || {})[k], obj);
    return result !== undefined ? result : defaultValue;
  } catch {
    return defaultValue;
  }
};

/**
 * 安全的数组操作，确保返回数组
 * @param {*} arr - 输入值
 * @returns {Array} 数组
 * @example
 * safeArray(null) // => []
 * safeArray([1, 2]) // => [1, 2]
 * safeArray('test') // => []
 */
export const safeArray = (arr) => (Array.isArray(arr) ? arr : []);

/**
 * 安全的对象操作，确保返回对象
 * @param {*} obj - 输入值
 * @returns {Object} 对象
 * @example
 * safeObject(null) // => {}
 * safeObject({ a: 1 }) // => { a: 1 }
 * safeObject([1, 2]) // => {}
 */
export const safeObject = (obj) =>
  obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {};

/**
 * 安全的字符串操作
 * @param {*} str - 输入值
 * @param {string} fallback - 默认值
 * @returns {string} 字符串
 */
export const safeString = (str, fallback = '') =>
  typeof str === 'string' ? str : fallback;

/**
 * 安全的数字操作
 * @param {*} num - 输入值
 * @param {number} fallback - 默认值
 * @returns {number} 数字
 */
export const safeNumber = (num, fallback = 0) => {
  const parsed = Number(num);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * 安全的 JSON 解析
 * @param {string} str - JSON 字符串
 * @param {*} fallback - 解析失败时的默认值
 * @returns {*} 解析结果或默认值
 * @example
 * safeJsonParse('{"a":1}') // => { a: 1 }
 * safeJsonParse('invalid', {}) // => {}
 */
export const safeJsonParse = (str, fallback = null) => {
  if (typeof str !== 'string') {
    return fallback;
  }
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
};

/**
 * 安全的 JSON 序列化
 * @param {*} obj - 要序列化的对象
 * @param {string} fallback - 失败时的默认值
 * @returns {string} JSON 字符串
 */
export const safeJsonStringify = (obj, fallback = '{}') => {
  try {
    return JSON.stringify(obj);
  } catch {
    return fallback;
  }
};

/**
 * 安全的异步操作包装
 * @param {Function} fn - 异步函数
 * @param {*} fallback - 错误时的默认值
 * @param {Function} onError - 错误回调
 * @returns {Promise<*>} 结果或默认值
 * @example
 * const data = await safeAsync(() => fetchData(), [], console.error);
 */
export const safeAsync = async (fn, fallback = null, onError = null) => {
  try {
    return await fn();
  } catch (error) {
    if (typeof onError === 'function') {
      onError(error);
    } else {
      console.warn('[safeAsync]', error.message || error);
    }
    return fallback;
  }
};

/**
 * 带重试的异步操作
 * @param {Function} fn - 异步函数
 * @param {Object} options - 配置选项
 * @param {number} options.maxRetries - 最大重试次数
 * @param {number} options.delay - 初始延迟（毫秒）
 * @param {number} options.backoff - 退避倍数
 * @param {Function} options.onRetry - 重试回调
 * @returns {Promise<*>} 结果
 * @example
 * const data = await withRetry(() => fetch(url), { maxRetries: 3 });
 */
export const withRetry = async (
  fn,
  { maxRetries = 3, delay = 1000, backoff = 2, onRetry = null } = {}
) => {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        const waitTime = delay * Math.pow(backoff, attempt);
        if (typeof onRetry === 'function') {
          onRetry(attempt + 1, maxRetries, error);
        }
        await new Promise((r) => setTimeout(r, waitTime));
      }
    }
  }
  throw lastError;
};

/**
 * 带超时的 Promise
 * @param {Promise} promise - 原始 Promise
 * @param {number} ms - 超时时间（毫秒）
 * @param {string} message - 超时错误消息
 * @returns {Promise<*>} 结果
 */
export const withTimeout = (promise, ms, message = '操作超时') => {
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]);
};

/**
 * 安全地调用函数
 * @param {Function} fn - 要调用的函数
 * @param {*} fallback - 失败时的默认值
 * @param {...*} args - 函数参数
 * @returns {*} 结果或默认值
 */
export const safeCall = (fn, fallback = undefined, ...args) => {
  if (typeof fn !== 'function') {
    return fallback;
  }
  try {
    return fn(...args);
  } catch {
    return fallback;
  }
};

/**
 * 确保值在指定范围内
 * @param {number} value - 输入值
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {number} 限制后的值
 */
export const clamp = (value, min, max) => {
  const num = safeNumber(value, min);
  return Math.min(Math.max(num, min), max);
};

/**
 * 安全地访问数组元素
 * @param {Array} arr - 数组
 * @param {number} index - 索引
 * @param {*} fallback - 默认值
 * @returns {*} 元素或默认值
 */
export const safeArrayGet = (arr, index, fallback = undefined) => {
  const array = safeArray(arr);
  const idx = safeNumber(index, -1);
  if (idx < 0 || idx >= array.length) {
    return fallback;
  }
  return array[idx];
};

/**
 * 安全地映射数组
 * @param {Array} arr - 数组
 * @param {Function} fn - 映射函数
 * @param {*} fallback - 单项失败时的默认值
 * @returns {Array} 映射后的数组
 */
export const safeMap = (arr, fn, fallback = null) => {
  return safeArray(arr).map((item, index) => {
    try {
      return fn(item, index);
    } catch {
      return fallback;
    }
  });
};

/**
 * 安全地过滤数组
 * @param {Array} arr - 数组
 * @param {Function} fn - 过滤函数
 * @returns {Array} 过滤后的数组
 */
export const safeFilter = (arr, fn) => {
  return safeArray(arr).filter((item, index) => {
    try {
      return fn(item, index);
    } catch {
      return false;
    }
  });
};

/**
 * 创建安全的状态更新器（用于 React setState）
 * @param {Function} updater - 更新函数
 * @param {*} fallback - 失败时返回原状态
 * @returns {Function} 安全的更新函数
 */
export const safeUpdater = (updater, fallback = null) => (prevState) => {
  try {
    const result = updater(prevState);
    return result !== undefined ? result : prevState;
  } catch (error) {
    console.warn('[safeUpdater]', error.message || error);
    return fallback !== null ? fallback : prevState;
  }
};
