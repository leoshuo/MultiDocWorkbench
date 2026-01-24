/**
 * Replay 执行上下文
 * 保存执行过程中的状态，支持快照恢复和调试
 */

import { safeObject, safeArray, safeJsonStringify, safeJsonParse } from '../utils/safeOps';

/**
 * Replay 上下文类
 * 管理 Replay 执行过程中的状态和日志
 */
export class ReplayContext {
  constructor(initialState = {}) {
    this.state = {
      // 核心数据
      template: null,
      docs: [],
      deposits: [],
      
      // 当前执行状态
      currentDeposit: null,
      currentSection: null,
      currentIndex: -1,
      
      // 执行结果
      results: [],
      errors: [],
      
      // 变量存储（用于条件判断和数据传递）
      variables: {},
      
      // 配置
      config: {
        stopOnError: false,
        logLevel: 'info', // 'debug' | 'info' | 'warn' | 'error'
      },
      
      // 合并初始状态
      ...safeObject(initialState),
    };
    
    // 快照历史
    this.snapshots = [];
    
    // 执行日志
    this.logs = [];
    
    // 元数据
    this.meta = {
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      version: '1.0',
    };
  }

  // ========== 状态访问 ==========

  /**
   * 获取状态值
   * @param {string} key - 键名
   * @param {*} defaultValue - 默认值
   * @returns {*} 值
   */
  get(key, defaultValue = undefined) {
    return key in this.state ? this.state[key] : defaultValue;
  }

  /**
   * 设置状态值
   * @param {string} key - 键名
   * @param {*} value - 值
   * @returns {ReplayContext} this
   */
  set(key, value) {
    this.state[key] = value;
    this.meta.lastUpdated = Date.now();
    return this;
  }

  /**
   * 批量更新状态
   * @param {Object} updates - 更新对象
   * @returns {ReplayContext} this
   */
  update(updates) {
    Object.assign(this.state, safeObject(updates));
    this.meta.lastUpdated = Date.now();
    return this;
  }

  /**
   * 删除状态键
   * @param {string} key - 键名
   * @returns {ReplayContext} this
   */
  delete(key) {
    delete this.state[key];
    this.meta.lastUpdated = Date.now();
    return this;
  }

  // ========== 变量管理 ==========

  /**
   * 设置变量
   * @param {string} name - 变量名
   * @param {*} value - 值
   * @returns {ReplayContext} this
   */
  setVariable(name, value) {
    this.state.variables[name] = value;
    return this;
  }

  /**
   * 获取变量
   * @param {string} name - 变量名
   * @param {*} defaultValue - 默认值
   * @returns {*} 值
   */
  getVariable(name, defaultValue = undefined) {
    return name in this.state.variables ? this.state.variables[name] : defaultValue;
  }

  /**
   * 检查变量是否存在
   * @param {string} name - 变量名
   * @returns {boolean}
   */
  hasVariable(name) {
    return name in this.state.variables;
  }

  /**
   * 删除变量
   * @param {string} name - 变量名
   * @returns {ReplayContext} this
   */
  deleteVariable(name) {
    delete this.state.variables[name];
    return this;
  }

  /**
   * 清空所有变量
   * @returns {ReplayContext} this
   */
  clearVariables() {
    this.state.variables = {};
    return this;
  }

  // ========== 快照管理 ==========

  /**
   * 创建快照
   * @param {string} label - 快照标签
   * @returns {ReplayContext} this
   */
  snapshot(label = '') {
    this.snapshots.push({
      label,
      timestamp: Date.now(),
      state: safeJsonParse(safeJsonStringify(this.state), {}),
    });
    return this;
  }

  /**
   * 恢复快照
   * @param {number|string} indexOrLabel - 快照索引或标签
   * @returns {boolean} 是否成功
   */
  restore(indexOrLabel = -1) {
    let snapshot;
    
    if (typeof indexOrLabel === 'string') {
      // 按标签查找
      snapshot = [...this.snapshots].reverse().find(s => s.label === indexOrLabel);
    } else {
      // 按索引查找
      const idx = indexOrLabel < 0 
        ? this.snapshots.length + indexOrLabel 
        : indexOrLabel;
      snapshot = this.snapshots[idx];
    }
    
    if (snapshot) {
      this.state = safeJsonParse(safeJsonStringify(snapshot.state), this.state);
      this.meta.lastUpdated = Date.now();
      this.log('info', `已恢复快照: ${snapshot.label || `#${this.snapshots.indexOf(snapshot)}`}`);
      return true;
    }
    
    this.log('warn', `未找到快照: ${indexOrLabel}`);
    return false;
  }

  /**
   * 获取快照列表
   * @returns {Array} 快照列表
   */
  getSnapshots() {
    return this.snapshots.map((s, i) => ({
      index: i,
      label: s.label,
      timestamp: s.timestamp,
    }));
  }

  /**
   * 清空快照
   * @returns {ReplayContext} this
   */
  clearSnapshots() {
    this.snapshots = [];
    return this;
  }

  // ========== 日志管理 ==========

  /**
   * 记录日志
   * @param {string} level - 日志级别
   * @param {string} message - 消息
   * @param {Object} data - 附加数据
   * @returns {ReplayContext} this
   */
  log(level, message, data = {}) {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevel = this.state.config?.logLevel || 'info';
    
    if (levels.indexOf(level) >= levels.indexOf(configLevel)) {
      this.logs.push({
        timestamp: Date.now(),
        level,
        message,
        data,
        deposit: this.state.currentDeposit?.id,
        section: this.state.currentSection?.id,
        index: this.state.currentIndex,
      });
    }
    return this;
  }

  /**
   * 记录调试信息
   */
  debug(message, data) {
    return this.log('debug', message, data);
  }

  /**
   * 记录一般信息
   */
  info(message, data) {
    return this.log('info', message, data);
  }

  /**
   * 记录警告
   */
  warn(message, data) {
    return this.log('warn', message, data);
  }

  /**
   * 记录错误
   */
  error(message, data) {
    return this.log('error', message, data);
  }

  /**
   * 获取日志
   * @param {Object} filter - 过滤条件
   * @returns {Array} 日志列表
   */
  getLogs(filter = {}) {
    let logs = this.logs;
    
    if (filter.level) {
      logs = logs.filter(l => l.level === filter.level);
    }
    if (filter.deposit) {
      logs = logs.filter(l => l.deposit === filter.deposit);
    }
    if (filter.section) {
      logs = logs.filter(l => l.section === filter.section);
    }
    if (filter.since) {
      logs = logs.filter(l => l.timestamp >= filter.since);
    }
    
    return logs;
  }

  /**
   * 清空日志
   * @returns {ReplayContext} this
   */
  clearLogs() {
    this.logs = [];
    return this;
  }

  // ========== 结果管理 ==========

  /**
   * 添加执行结果
   * @param {Object} result - 结果对象
   * @returns {ReplayContext} this
   */
  addResult(result) {
    this.state.results.push({
      timestamp: Date.now(),
      ...safeObject(result),
    });
    return this;
  }

  /**
   * 添加错误
   * @param {Error|string} error - 错误
   * @param {Object} context - 上下文
   * @returns {ReplayContext} this
   */
  addError(error, context = {}) {
    this.state.errors.push({
      timestamp: Date.now(),
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      deposit: this.state.currentDeposit?.id,
      section: this.state.currentSection?.id,
      index: this.state.currentIndex,
      ...context,
    });
    return this;
  }

  /**
   * 获取错误列表
   * @returns {Array}
   */
  getErrors() {
    return this.state.errors;
  }

  /**
   * 是否有错误
   * @returns {boolean}
   */
  hasErrors() {
    return this.state.errors.length > 0;
  }

  // ========== 导入导出 ==========

  /**
   * 导出上下文（用于调试或保存）
   * @returns {Object}
   */
  export() {
    return {
      state: safeJsonParse(safeJsonStringify(this.state), {}),
      snapshots: this.snapshots.length,
      logs: this.logs,
      meta: this.meta,
    };
  }

  /**
   * 从导出数据恢复
   * @param {Object} data - 导出的数据
   * @returns {ReplayContext} this
   */
  import(data) {
    const d = safeObject(data);
    if (d.state) {
      this.state = safeJsonParse(safeJsonStringify(d.state), this.state);
    }
    if (Array.isArray(d.logs)) {
      this.logs = d.logs;
    }
    if (d.meta) {
      this.meta = { ...this.meta, ...d.meta };
    }
    this.meta.lastUpdated = Date.now();
    return this;
  }

  /**
   * 重置上下文
   * @returns {ReplayContext} this
   */
  reset() {
    this.state = {
      template: null,
      docs: [],
      deposits: [],
      currentDeposit: null,
      currentSection: null,
      currentIndex: -1,
      results: [],
      errors: [],
      variables: {},
      config: this.state.config,
    };
    this.snapshots = [];
    this.logs = [];
    this.meta.lastUpdated = Date.now();
    return this;
  }
}

/**
 * 创建新的 Replay 上下文
 * @param {Object} initialState - 初始状态
 * @returns {ReplayContext}
 */
export const createReplayContext = (initialState = {}) => {
  return new ReplayContext(initialState);
};

export default ReplayContext;
