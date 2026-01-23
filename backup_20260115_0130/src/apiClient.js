// ========== P2: 前端 API 客户端增强 ==========
// 包括重试、超时、错误处理等

import { logger } from './security';

const DEFAULT_TIMEOUT = 30 * 1000; // 30 秒
const DEFAULT_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 秒

/**
 * 改进的 API 调用函数，包括重试和超时
 */
export const apiClient = {
  /**
   * 执行 API 请求，自动重试和超时控制
   * @param {string} path - API 路径
   * @param {Object} options - fetch 选项
   * @param {Object} retryConfig - 重试配置
   * @returns {Promise<any>} - API 响应
   */
  async call(path, options = {}, retryConfig = {}) {
    const {
      timeout = DEFAULT_TIMEOUT,
      retries = DEFAULT_RETRIES,
      delayMs = INITIAL_RETRY_DELAY,
    } = retryConfig;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        logger.debug('API', `请求: ${options.method || 'GET'} ${path} (尝试 ${attempt + 1}/${retries})`);

        // 创建超时 controller
        const controller = new AbortController();
        const timeoutHandle = setTimeout(() => controller.abort(), timeout);

        try {
          const response = await fetch(path, {
            headers: { 'Content-Type': 'application/json' },
            ...options,
            signal: controller.signal,
            body: options.body ? JSON.stringify(options.body) : undefined,
          });

          clearTimeout(timeoutHandle);

          if (!response.ok) {
            const text = await response.text();
            let errorMsg = text;
            try {
              const json = JSON.parse(text);
              errorMsg = json.error || text;
            } catch (_) {
              /* ignore */
            }
            throw new Error(errorMsg || '请求失败');
          }

          const ct = response.headers.get('content-type') || '';
          const data = ct.includes('application/json') ? await response.json() : await response.text();

          logger.debug('API', `成功: ${options.method || 'GET'} ${path}`);
          return data;
        } catch (err) {
          clearTimeout(timeoutHandle);
          throw err;
        }
      } catch (error) {
        const isLastAttempt = attempt === retries - 1;
        
        // 处理不同的错误类型
        if (error.name === 'AbortError') {
          logger.warn('API', `超时 (${timeout}ms): ${options.method || 'GET'} ${path}`);
          if (isLastAttempt) {
            throw new Error(`请求超时 (${timeout}ms)`);
          }
        } else if (isLastAttempt) {
          logger.error('API', `请求失败 (已达最大重试次数): ${options.method || 'GET'} ${path}`, error);
          throw error;
        } else {
          logger.warn('API', `请求失败，即将重试: ${options.method || 'GET'} ${path}`, error.message);
        }

        // 指数退避重试
        if (!isLastAttempt) {
          const delay = delayMs * Math.pow(2, attempt);
          logger.debug('API', `等待 ${delay}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  },

  /**
   * GET 请求快捷方法
   */
  get(path, retryConfig = {}) {
    return this.call(path, { method: 'GET' }, retryConfig);
  },

  /**
   * POST 请求快捷方法
   */
  post(path, body, retryConfig = {}) {
    return this.call(path, { method: 'POST', body }, retryConfig);
  },

  /**
   * PATCH 请求快捷方法
   */
  patch(path, body, retryConfig = {}) {
    return this.call(path, { method: 'PATCH', body }, retryConfig);
  },

  /**
   * DELETE 请求快捷方法
   */
  delete(path, retryConfig = {}) {
    return this.call(path, { method: 'DELETE' }, retryConfig);
  },
};

/**
 * 高阶函数：为任何异步函数添加重试能力
 */
export const withRetry = (asyncFn, options = {}) => {
  const {
    maxRetries = 3,
    delayMs = 1000,
    onRetry = () => {},
    shouldRetry = (err) => true, // 是否应该重试的判断函数
  } = options;

  return async (...args) => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await asyncFn(...args);
      } catch (error) {
        const isLastAttempt = attempt === maxRetries - 1;
        const shouldRetryThis = shouldRetry(error);

        if (isLastAttempt || !shouldRetryThis) {
          throw error;
        }

        const delay = delayMs * Math.pow(2, attempt);
        onRetry({ attempt, delay, error });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };
};

/**
 * 高阶函数：为任何异步函数添加超时
 */
export const withTimeout = (asyncFn, timeoutMs = 30000) => {
  return async (...args) => {
    return Promise.race([
      asyncFn(...args),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`操作超时 (${timeoutMs}ms)`)), timeoutMs)
      ),
    ]);
  };
};

/**
 * 高阶函数：为任何异步函数添加加载状态管理
 */
export const withLoadingState = (asyncFn, onLoadingChange = () => {}) => {
  return async (...args) => {
    try {
      onLoadingChange(true);
      return await asyncFn(...args);
    } finally {
      onLoadingChange(false);
    }
  };
};

/**
 * 并发请求管理
 */
export const concurrencyManager = (maxConcurrent = 5) => {
  let running = 0;
  const queue = [];

  return {
    async run(asyncFn) {
      // 如果并发数达到上限，等待
      while (running >= maxConcurrent) {
        await new Promise(resolve => queue.push(resolve));
      }

      running++;
      try {
        return await asyncFn();
      } finally {
        running--;
        const resolve = queue.shift();
        if (resolve) resolve();
      }
    },
  };
};

/**
 * 使用示例：
 * 
 * // 基础使用
 * const data = await apiClient.post('/api/docs', { name: 'Doc', content: 'Text' });
 * 
 * // 自定义重试配置
 * const data = await apiClient.post('/api/docs', body, {
 *   retries: 5,
 *   timeout: 60000,
 *   delayMs: 2000,
 * });
 * 
 * // 为自定义函数添加重试
 * const fetchWithRetry = withRetry(myAsyncFn, {
 *   maxRetries: 5,
 *   shouldRetry: (err) => err.status !== 404, // 404 不重试
 * });
 * 
 * // 组合使用
 * const robustFn = withTimeout(
 *   withRetry(myAsyncFn, { maxRetries: 3 }),
 *   30000
 * );
 */
