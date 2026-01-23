// ========== P3: 前端安全工具 ==========
// 包括 XSS 防护、输入验证、数据清理等

/**
 * P3: XSS 防护 - 转义 HTML 字符
 * @param {string} text - 需要转义的文本
 * @returns {string} - 已转义的文本
 */
export const escapeHtml = (text) => {
  if (typeof text !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

/**
 * 安全的文本渲染（已转义）
 * @param {string} text - 文本
 * @param {number} maxLength - 最大长度
 * @returns {string} - 已转义并截断的文本
 */
export const sanitizeText = (text, maxLength = 200) => {
  const trimmed = typeof text === 'string' ? text.slice(0, maxLength) : '';
  return escapeHtml(trimmed);
};

/**
 * P1: 前端输入验证
 */
export const validateInput = {
  /**
   * 验证文档名称
   */
  docName: (name) => {
    if (!name || typeof name !== 'string') return '文档名不能为空';
    if (name.trim().length === 0) return '文档名不能为空';
    if (name.length > 255) return '文档名长度不能超过 255 字符';
    return null; // 验证通过
  },

  /**
   * 验证文档内容
   */
  docContent: (content) => {
    if (!content || typeof content !== 'string') return '内容不能为空';
    const sizeInMB = Buffer.byteLength(content, 'utf8') / (1024 * 1024);
    if (sizeInMB > 10) return `内容大小不能超过 10MB（当前: ${sizeInMB.toFixed(2)}MB）`;
    return null; // 验证通过
  },

  /**
   * 验证沉淀名称
   */
  depositName: (name) => {
    if (!name || typeof name !== 'string') return '沉淀名不能为空';
    if (name.trim().length === 0) return '沉淀名不能为空';
    if (name.length > 100) return '沉淀名长度不能超过 100 字符';
    return null;
  },

  /**
   * 验证提示词
   */
  prompt: (prompt) => {
    if (!prompt || typeof prompt !== 'string') return '提示词不能为空';
    if (prompt.trim().length < 10) return '提示词长度至少 10 个字符';
    if (prompt.length > 5000) return '提示词长度不能超过 5000 字符';
    return null;
  },
};

/**
 * P3: 防止 XSS - 安全的文本属性设置
 * @param {HTMLElement} element - DOM 元素
 * @param {string} text - 要设置的文本
 */
export const setSafeText = (element, text) => {
  if (!element) return;
  element.textContent = text;
};

/**
 * P3: 防止 XSS - 安全的 HTML 属性设置
 * @param {HTMLElement} element - DOM 元素
 * @param {string} attrName - 属性名
 * @param {string} value - 属性值
 */
export const setSafeAttribute = (element, attrName, value) => {
  if (!element) return;
  
  // 禁止设置危险的事件处理器
  const dangerousAttrs = ['onload', 'onerror', 'onmouseover', 'onclick', 'onchange'];
  if (dangerousAttrs.includes(attrName.toLowerCase())) {
    console.warn(`警告：尝试设置危险属性 ${attrName}`);
    return;
  }
  
  element.setAttribute(attrName, value);
};

/**
 * 数据清理工具
 */
export const sanitize = {
  /**
   * 清理 JSON 输出，移除潜在的危险内容
   */
  jsonOutput: (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    
    const cleaned = { ...obj };
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    
    dangerousKeys.forEach(key => {
      delete cleaned[key];
    });
    
    return cleaned;
  },

  /**
   * 清理 URL，防止 javascript: 等协议
   */
  url: (url) => {
    if (!url || typeof url !== 'string') return '';
    
    const trimmed = url.trim().toLowerCase();
    
    // 禁止 javascript:, data:, vbscript: 等协议
    if (trimmed.startsWith('javascript:') || 
        trimmed.startsWith('data:') || 
        trimmed.startsWith('vbscript:')) {
      return '';
    }
    
    return url;
  },
};

/**
 * 缓存和性能优化
 */
export const cacheUtils = {
  /**
   * 创建一个简单的 LRU 缓存
   */
  createLRUCache: (maxSize = 100) => {
    const cache = new Map();
    
    return {
      get: (key) => cache.get(key),
      
      set: (key, value) => {
        // 如果 key 已存在，先删除以重新排序
        if (cache.has(key)) {
          cache.delete(key);
        }
        
        // 如果缓存满了，删除最旧的项
        if (cache.size >= maxSize) {
          const oldestKey = cache.keys().next().value;
          cache.delete(oldestKey);
        }
        
        cache.set(key, value);
      },
      
      has: (key) => cache.has(key),
      clear: () => cache.clear(),
      size: () => cache.size,
    };
  },

  /**
   * 防抖函数
   */
  debounce: (func, wait = 300) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  /**
   * 节流函数
   */
  throttle: (func, limit = 1000) => {
    let lastCall = 0;
    return (...args) => {
      const now = Date.now();
      if (now - lastCall >= limit) {
        lastCall = now;
        func(...args);
      }
    };
  },
};

/**
 * 错误处理和重试
 */
export const errorUtils = {
  /**
   * 带重试的 API 调用
   */
  apiWithRetry: async (apiCall, maxRetries = 3, delayMs = 1000) => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        if (attempt === maxRetries - 1) throw error;
        
        const delay = delayMs * Math.pow(2, attempt); // 指数退避
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  },

  /**
   * 安全的异步操作（处理组件卸载）
   */
  createAsyncFn: () => {
    let isMounted = true;
    
    return {
      cancel: () => { isMounted = false; },
      execute: async (asyncFn) => {
        const result = await asyncFn();
        if (!isMounted) return null;
        return result;
      },
    };
  },
};

/**
 * 日志工具
 */
export const logger = {
  info: (tag, message, data) => {
    console.log(`[${new Date().toISOString()}] [INFO] ${tag}: ${message}`, data || '');
  },

  warn: (tag, message, data) => {
    console.warn(`[${new Date().toISOString()}] [WARN] ${tag}: ${message}`, data || '');
  },

  error: (tag, message, error) => {
    console.error(`[${new Date().toISOString()}] [ERROR] ${tag}: ${message}`, error || '');
  },

  debug: (tag, message, data) => {
    if (process.env.DEBUG) {
      console.debug(`[${new Date().toISOString()}] [DEBUG] ${tag}: ${message}`, data || '');
    }
  },
};
