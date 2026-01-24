/**
 * Replay 执行引擎
 * 核心执行逻辑，支持可扩展的执行器和钩子
 */

import { ReplayStatus, getActionConfig, inferActionType } from './replayConfig';
import { ReplayContext, createReplayContext } from './replayContext';
import { safeAsync, withRetry, withTimeout, safeArray, safeObject } from '../utils/safeOps';
import { validateDeposit, normalizeDepositSection } from '../validators/stateValidators';

/**
 * Replay 执行引擎类
 */
export class ReplayEngine {
  constructor(options = {}) {
    // 执行器注册表
    this.executors = {};
    
    // 钩子函数
    this.hooks = {
      beforeReplay: [],      // (deposit, context) => void
      afterReplay: [],       // (results, context) => void
      beforeSection: [],     // (section, index, context) => void | false (返回false跳过)
      afterSection: [],      // (result, context) => void
      onError: [],           // (error, section, context) => void
      onRetry: [],           // (attempt, maxRetries, error, section) => void
      onProgress: [],        // (current, total, section) => void
    };
    
    // 配置选项
    this.options = {
      stopOnError: false,        // 遇到错误是否停止
      retryOnFail: true,         // 失败是否重试
      maxRetries: 3,             // 最大重试次数
      retryDelay: 1000,          // 重试延迟（毫秒）
      backoff: 2,                // 退避倍数
      defaultTimeout: 60000,     // 默认超时（毫秒）
      parallelSections: false,   // 是否并行执行（预留）
      validateBeforeRun: true,   // 执行前验证
      createSnapshots: true,     // 是否自动创建快照
      ...options,
    };
    
    // 取消控制器
    this.abortController = null;
    
    // 运行状态
    this.isRunning = false;
  }

  // ========== 执行器管理 ==========

  /**
   * 注册执行器
   * @param {string} name - 执行器名称
   * @param {Function} executor - 执行器函数 (section, context, options) => Promise<any>
   * @returns {ReplayEngine} this
   */
  registerExecutor(name, executor) {
    if (typeof executor !== 'function') {
      throw new Error(`执行器必须是函数: ${name}`);
    }
    this.executors[name] = executor;
    return this;
  }

  /**
   * 批量注册执行器
   * @param {Object} executors - 执行器映射
   * @returns {ReplayEngine} this
   */
  registerExecutors(executors) {
    Object.entries(safeObject(executors)).forEach(([name, fn]) => {
      this.registerExecutor(name, fn);
    });
    return this;
  }

  /**
   * 获取执行器
   * @param {string} name - 执行器名称
   * @returns {Function|null}
   */
  getExecutor(name) {
    return this.executors[name] || null;
  }

  /**
   * 检查执行器是否存在
   * @param {string} name - 执行器名称
   * @returns {boolean}
   */
  hasExecutor(name) {
    return name in this.executors;
  }

  // ========== 钩子管理 ==========

  /**
   * 注册钩子
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消注册的函数
   */
  on(event, callback) {
    if (!this.hooks[event]) {
      console.warn(`未知的钩子事件: ${event}`);
      return () => {};
    }
    if (typeof callback !== 'function') {
      throw new Error('钩子回调必须是函数');
    }
    this.hooks[event].push(callback);
    
    // 返回取消注册函数
    return () => {
      this.hooks[event] = this.hooks[event].filter(cb => cb !== callback);
    };
  }

  /**
   * 触发钩子
   * @param {string} event - 事件名称
   * @param {...any} args - 参数
   * @returns {Promise<any[]>} 所有回调的返回值
   */
  async emit(event, ...args) {
    const callbacks = this.hooks[event] || [];
    const results = [];
    for (const cb of callbacks) {
      try {
        const result = await cb(...args);
        results.push(result);
      } catch (error) {
        console.warn(`钩子执行错误 [${event}]:`, error);
      }
    }
    return results;
  }

  // ========== 核心执行逻辑 ==========

  /**
   * 执行单个沉淀的 Replay
   * @param {Object} deposit - 沉淀记录
   * @param {ReplayContext|Object} contextOrState - 上下文或初始状态
   * @returns {Promise<Object>} 执行结果
   */
  async replayDeposit(deposit, contextOrState = {}) {
    // 创建或使用上下文
    const context = contextOrState instanceof ReplayContext
      ? contextOrState
      : createReplayContext(contextOrState);
    
    // 验证沉淀记录
    if (this.options.validateBeforeRun) {
      const { valid, errors } = validateDeposit(deposit);
      if (!valid) {
        context.error('沉淀记录验证失败', { errors });
        return {
          depositId: deposit?.id,
          status: ReplayStatus.FAILED,
          error: `验证失败: ${errors.join(', ')}`,
          sections: [],
          startTime: Date.now(),
          endTime: Date.now(),
        };
      }
    }

    // 初始化
    this.abortController = new AbortController();
    this.isRunning = true;
    
    const results = {
      depositId: deposit.id,
      status: ReplayStatus.RUNNING,
      sections: [],
      startTime: Date.now(),
      endTime: null,
      error: null,
    };

    // 更新上下文
    context.update({
      currentDeposit: deposit,
      currentIndex: -1,
    });
    
    // 创建开始快照
    if (this.options.createSnapshots) {
      context.snapshot('replay_start');
    }

    try {
      // 触发开始钩子
      await this.emit('beforeReplay', deposit, context);
      context.info(`开始执行沉淀 Replay: ${deposit.name || deposit.id}`);

      const sections = safeArray(deposit.sections);
      
      // 逐个执行章节
      for (let i = 0; i < sections.length; i++) {
        // 检查是否被取消
        if (this.abortController.signal.aborted) {
          context.warn('Replay 被取消');
          results.status = ReplayStatus.CANCELLED;
          break;
        }

        // 规范化章节
        const section = normalizeDepositSection(sections[i]);
        context.update({
          currentSection: section,
          currentIndex: i,
        });

        // 触发进度钩子
        await this.emit('onProgress', i + 1, sections.length, section);

        // 执行章节
        const sectionResult = await this.replaySection(section, context, i);
        results.sections.push(sectionResult);

        // 处理失败
        if (sectionResult.status === ReplayStatus.FAILED) {
          context.addError(sectionResult.error, { sectionId: section.id });
          
          if (this.options.stopOnError) {
            context.error('由于错误停止执行', { sectionId: section.id });
            results.status = ReplayStatus.FAILED;
            results.error = sectionResult.error;
            break;
          }
        }
      }

      // 确定最终状态
      if (results.status === ReplayStatus.RUNNING) {
        const hasFailure = results.sections.some(s => s.status === ReplayStatus.FAILED);
        const allSkipped = results.sections.every(s => s.status === ReplayStatus.SKIPPED);
        
        if (allSkipped) {
          results.status = ReplayStatus.SKIPPED;
        } else if (hasFailure) {
          results.status = this.options.stopOnError ? ReplayStatus.FAILED : ReplayStatus.SUCCESS;
        } else {
          results.status = ReplayStatus.SUCCESS;
        }
      }

      // 触发完成钩子
      await this.emit('afterReplay', results, context);
      context.info(`沉淀 Replay 完成: ${results.status}`);

    } catch (error) {
      results.status = ReplayStatus.FAILED;
      results.error = error.message;
      context.error('Replay 执行异常', { error: error.message });
      await this.emit('onError', error, null, context);
    } finally {
      results.endTime = Date.now();
      this.isRunning = false;
      
      // 创建结束快照
      if (this.options.createSnapshots) {
        context.snapshot('replay_end');
      }
      
      // 添加结果到上下文
      context.addResult(results);
    }

    return results;
  }

  /**
   * 执行单个章节
   * @param {Object} section - 章节
   * @param {ReplayContext} context - 上下文
   * @param {number} index - 索引
   * @returns {Promise<Object>} 执行结果
   */
  async replaySection(section, context, index) {
    const result = {
      sectionId: section.id,
      index,
      actionType: 'unknown',
      status: ReplayStatus.RUNNING,
      startTime: Date.now(),
      endTime: null,
      retries: 0,
      output: null,
      error: null,
    };

    try {
      // 触发章节开始钩子（可以返回 false 跳过）
      const hookResults = await this.emit('beforeSection', section, index, context);
      if (hookResults.includes(false)) {
        context.info(`章节被钩子跳过: ${section.id}`);
        result.status = ReplayStatus.SKIPPED;
        result.error = '被钩子跳过';
        return result;
      }

      // 推断操作类型
      const actionType = inferActionType(section);
      result.actionType = actionType;
      context.debug(`推断操作类型: ${actionType}`, { sectionId: section.id });

      // 获取操作配置
      const actionConfig = getActionConfig(actionType);
      if (!actionConfig) {
        context.warn(`未知操作类型，跳过: ${actionType}`, { sectionId: section.id });
        result.status = ReplayStatus.SKIPPED;
        result.error = `未知操作类型: ${actionType}`;
        return result;
      }

      // 获取执行器
      const executor = this.getExecutor(actionConfig.executor);
      if (!executor) {
        context.warn(`未注册执行器，跳过: ${actionConfig.executor}`, { sectionId: section.id });
        result.status = ReplayStatus.SKIPPED;
        result.error = `未注册执行器: ${actionConfig.executor}`;
        return result;
      }

      // 验证必填字段
      const missingFields = this.validateRequiredFields(section, actionConfig.requiredFields);
      if (missingFields.length > 0) {
        context.warn(`缺少必填字段: ${missingFields.join(', ')}`, { sectionId: section.id });
        // 不直接失败，让执行器自己处理
      }

      // 执行函数
      const execOptions = {
        signal: this.abortController.signal,
        timeout: actionConfig.timeout || this.options.defaultTimeout,
        actionConfig,
      };

      const execFn = async () => {
        return await withTimeout(
          executor(section, context, execOptions),
          execOptions.timeout,
          `执行超时 (${execOptions.timeout}ms)`
        );
      };

      // 是否带重试
      if (this.options.retryOnFail && actionConfig.canRetry) {
        result.output = await withRetry(execFn, {
          maxRetries: this.options.maxRetries,
          delay: this.options.retryDelay,
          backoff: this.options.backoff,
          onRetry: (attempt, max, error) => {
            result.retries = attempt;
            context.warn(`重试 ${attempt}/${max}: ${error.message}`, { sectionId: section.id });
            this.emit('onRetry', attempt, max, error, section);
          },
        });
      } else {
        result.output = await execFn();
      }

      result.status = ReplayStatus.SUCCESS;
      context.info(`章节执行成功: ${section.id}`, { actionType });

    } catch (error) {
      result.status = ReplayStatus.FAILED;
      result.error = error.message;
      context.error(`章节执行失败: ${section.id}`, { error: error.message });
      await this.emit('onError', error, section, context);
    } finally {
      result.endTime = Date.now();
      await this.emit('afterSection', result, context);
    }

    return result;
  }

  /**
   * 验证必填字段
   * @param {Object} section - 章节
   * @param {string[]} requiredFields - 必填字段列表
   * @returns {string[]} 缺失的字段
   */
  validateRequiredFields(section, requiredFields) {
    const missing = [];
    for (const field of safeArray(requiredFields)) {
      const value = section[field] ?? section.requirements?.[field];
      if (value === undefined || value === null || value === '') {
        missing.push(field);
      }
    }
    return missing;
  }

  // ========== 控制方法 ==========

  /**
   * 取消执行
   */
  cancel() {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * 是否正在运行
   * @returns {boolean}
   */
  getIsRunning() {
    return this.isRunning;
  }

  /**
   * 重置引擎
   */
  reset() {
    this.cancel();
    this.isRunning = false;
    this.abortController = null;
  }
}

// ========== 工厂函数 ==========

/**
 * 创建 Replay 引擎实例
 * @param {Object} options - 配置选项
 * @returns {ReplayEngine}
 */
export const createReplayEngine = (options = {}) => {
  return new ReplayEngine(options);
};

/**
 * 创建带默认执行器的引擎
 * @param {Object} options - 配置选项
 * @param {Object} executorDeps - 执行器依赖（如 API 函数等）
 * @returns {ReplayEngine}
 */
export const createDefaultReplayEngine = (options = {}, executorDeps = {}) => {
  const engine = new ReplayEngine(options);
  
  // 注册占位执行器（实际实现需要传入依赖）
  engine.registerExecutor('outlineExtractExecutor', async (section, context, opts) => {
    context.info('执行大纲抽取（占位）');
    return { success: true, placeholder: true };
  });
  
  engine.registerExecutor('addSectionExecutor', async (section, context, opts) => {
    context.info('执行新增标题（占位）');
    return { success: true, placeholder: true };
  });
  
  engine.registerExecutor('deleteSectionExecutor', async (section, context, opts) => {
    context.info('执行删除标题（占位）');
    return { success: true, placeholder: true };
  });
  
  engine.registerExecutor('editTitleExecutor', async (section, context, opts) => {
    context.info('执行编辑标题（占位）');
    return { success: true, placeholder: true };
  });
  
  engine.registerExecutor('editSummaryExecutor', async (section, context, opts) => {
    context.info('执行编辑摘要（占位）');
    return { success: true, placeholder: true };
  });
  
  engine.registerExecutor('insertSummaryExecutor', async (section, context, opts) => {
    context.info('执行插入摘要（占位）');
    return { success: true, placeholder: true };
  });
  
  engine.registerExecutor('dispatchExecutor', async (section, context, opts) => {
    context.info('执行指令调度（占位）');
    return { success: true, placeholder: true };
  });
  
  engine.registerExecutor('batchModifyExecutor', async (section, context, opts) => {
    context.info('执行批量修改（占位）');
    return { success: true, placeholder: true };
  });
  
  engine.registerExecutor('addDocExecutor', async (section, context, opts) => {
    context.info('执行添加文档（占位）');
    return { success: true, placeholder: true };
  });
  
  engine.registerExecutor('deleteDocExecutor', async (section, context, opts) => {
    context.info('执行删除文档（占位）');
    return { success: true, placeholder: true };
  });
  
  engine.registerExecutor('linkDocExecutor', async (section, context, opts) => {
    context.info('执行关联文档（占位）');
    return { success: true, placeholder: true };
  });
  
  engine.registerExecutor('createDepositExecutor', async (section, context, opts) => {
    context.info('执行创建沉淀（占位）');
    return { success: true, placeholder: true };
  });
  
  engine.registerExecutor('updateDepositExecutor', async (section, context, opts) => {
    context.info('执行更新沉淀（占位）');
    return { success: true, placeholder: true };
  });
  
  engine.registerExecutor('restoreHistoryExecutor', async (section, context, opts) => {
    context.info('执行恢复历史（占位）');
    return { success: true, placeholder: true };
  });
  
  engine.registerExecutor('saveHistoryExecutor', async (section, context, opts) => {
    context.info('执行保存历史（占位）');
    return { success: true, placeholder: true };
  });
  
  return engine;
};

export default ReplayEngine;
