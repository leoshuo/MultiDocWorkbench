/**
 * 防抖和节流工具函数
 * 用于控制高频操作的执行频率
 */

/**
 * 防抖函数 - 延迟执行，重复调用会重置计时器
 * @param {Function} fn - 要执行的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 * @example
 * const debouncedSearch = debounce(search, 300);
 * input.addEventListener('input', debouncedSearch);
 */
export const debounce = (fn, delay = 300) => {
  let timer = null;
  const debounced = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
  debounced.cancel = () => {
    clearTimeout(timer);
    timer = null;
  };
  debounced.flush = (...args) => {
    clearTimeout(timer);
    timer = null;
    fn(...args);
  };
  return debounced;
};

/**
 * 节流函数 - 限制执行频率，确保一段时间内只执行一次
 * @param {Function} fn - 要执行的函数
 * @param {number} limit - 时间间隔（毫秒）
 * @returns {Function} 节流后的函数
 * @example
 * const throttledScroll = throttle(handleScroll, 100);
 * window.addEventListener('scroll', throttledScroll);
 */
export const throttle = (fn, limit = 300) => {
  let inThrottle = false;
  let lastArgs = null;
  
  const throttled = (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          fn(...lastArgs);
          lastArgs = null;
        }
      }, limit);
    } else {
      lastArgs = args;
    }
  };
  
  throttled.cancel = () => {
    inThrottle = false;
    lastArgs = null;
  };
  
  return throttled;
};

/**
 * 带取消功能的防抖（返回 Promise）
 * @param {Function} fn - 异步函数
 * @param {number} delay - 延迟时间
 * @returns {Object} { call, cancel }
 */
export const debouncedAsync = (fn, delay = 300) => {
  let timer = null;
  let rejectFn = null;

  const call = (...args) => {
    return new Promise((resolve, reject) => {
      if (timer) {
        clearTimeout(timer);
        if (rejectFn) {
          rejectFn(new Error('Debounced: cancelled by new call'));
        }
      }
      rejectFn = reject;
      timer = setTimeout(async () => {
        try {
          const result = await fn(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          timer = null;
          rejectFn = null;
        }
      }, delay);
    });
  };

  const cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (rejectFn) {
      rejectFn(new Error('Debounced: manually cancelled'));
      rejectFn = null;
    }
  };

  return { call, cancel };
};

/**
 * 只执行一次的函数
 * @param {Function} fn - 要执行的函数
 * @returns {Function} 只执行一次的函数
 */
export const once = (fn) => {
  let called = false;
  let result;
  return (...args) => {
    if (!called) {
      called = true;
      result = fn(...args);
    }
    return result;
  };
};

/**
 * 延迟执行
 * @param {number} ms - 延迟时间
 * @returns {Promise<void>}
 */
export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 可取消的延迟
 * @param {number} ms - 延迟时间
 * @returns {Object} { promise, cancel }
 */
export const cancellableDelay = (ms) => {
  let timeoutId;
  let rejectFn;
  
  const promise = new Promise((resolve, reject) => {
    rejectFn = reject;
    timeoutId = setTimeout(resolve, ms);
  });
  
  const cancel = () => {
    clearTimeout(timeoutId);
    rejectFn(new Error('Delay cancelled'));
  };
  
  return { promise, cancel };
};

/**
 * 限制并发数的执行器
 * @param {number} concurrency - 最大并发数
 * @returns {Function} 包装函数
 */
export const limitConcurrency = (concurrency = 1) => {
  const queue = [];
  let running = 0;

  const runNext = async () => {
    if (running >= concurrency || queue.length === 0) {
      return;
    }
    running++;
    const { fn, resolve, reject } = queue.shift();
    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      running--;
      runNext();
    }
  };

  return (fn) => {
    return new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      runNext();
    });
  };
};

/**
 * 请求空闲时执行（利用 requestIdleCallback）
 * @param {Function} fn - 要执行的函数
 * @param {Object} options - 选项
 * @returns {number} 任务 ID
 */
export const idleCallback = (fn, options = {}) => {
  if (typeof requestIdleCallback === 'function') {
    return requestIdleCallback(fn, options);
  }
  // 降级到 setTimeout
  return setTimeout(fn, options.timeout || 1);
};

/**
 * 取消空闲回调
 * @param {number} id - 任务 ID
 */
export const cancelIdleCallback = (id) => {
  if (typeof window !== 'undefined' && typeof window.cancelIdleCallback === 'function') {
    window.cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
};
