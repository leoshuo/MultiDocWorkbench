/**
 * Replay 配置驱动架构
 * 定义操作类型注册表，支持动态扩展
 */

// ========== Replay 状态枚举 ==========

export const ReplayStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILED: 'failed',
  SKIPPED: 'skipped',
  CANCELLED: 'cancelled',
  RETRY: 'retry',
};

// ========== 操作类别 ==========

export const ActionCategory = {
  OUTLINE: 'outline',
  DISPATCH: 'dispatch',
  DOCUMENT: 'document',
  DEPOSIT: 'deposit',
  SYSTEM: 'system',
};

// ========== Replay 操作类型注册表 ==========

/**
 * 操作类型配置
 * @typedef {Object} ActionConfig
 * @property {string} name - 操作名称
 * @property {string} category - 操作类别
 * @property {string} executor - 执行器名称
 * @property {string[]} requiredFields - 必填字段
 * @property {string[]} optionalFields - 可选字段
 * @property {boolean} canRetry - 是否可重试
 * @property {number} timeout - 超时时间（毫秒）
 * @property {number} priority - 执行优先级（数字越小优先级越高）
 */

const REPLAY_ACTIONS = {
  // ========== 大纲操作 ==========
  outline_extract: {
    name: '大纲抽取',
    category: ActionCategory.OUTLINE,
    executor: 'outlineExtractExecutor',
    requiredFields: ['docContent'],
    optionalFields: ['docId', 'docName', 'existingOutline', 'prompt'],
    canRetry: true,
    timeout: 120000,
    priority: 1,
  },

  add_section: {
    name: '新增标题',
    category: ActionCategory.OUTLINE,
    executor: 'addSectionExecutor',
    requiredFields: ['title'],
    optionalFields: ['level', 'position', 'parentId', 'summary', 'hint'],
    canRetry: true,
    timeout: 5000,
    priority: 2,
  },

  delete_section: {
    name: '删除标题',
    category: ActionCategory.OUTLINE,
    executor: 'deleteSectionExecutor',
    requiredFields: ['sectionId'],
    optionalFields: ['reason'],
    canRetry: true,
    timeout: 5000,
    priority: 2,
  },

  edit_title: {
    name: '编辑标题',
    category: ActionCategory.OUTLINE,
    executor: 'editTitleExecutor',
    requiredFields: ['sectionId', 'newTitle'],
    optionalFields: ['newLevel'],
    canRetry: true,
    timeout: 5000,
    priority: 3,
  },

  edit_summary: {
    name: '编辑摘要',
    category: ActionCategory.OUTLINE,
    executor: 'editSummaryExecutor',
    requiredFields: ['sectionId', 'newSummary'],
    optionalFields: ['mode'], // 'replace' | 'append'
    canRetry: true,
    timeout: 5000,
    priority: 3,
  },

  insert_to_summary: {
    name: '插入摘要',
    category: ActionCategory.OUTLINE,
    executor: 'insertSummaryExecutor',
    requiredFields: ['sectionId', 'content'],
    optionalFields: ['mode', 'source'],
    canRetry: true,
    timeout: 10000,
    priority: 3,
  },

  // ========== 执行指令操作 ==========
  dispatch_execute: {
    name: '执行指令',
    category: ActionCategory.DISPATCH,
    executor: 'dispatchExecutor',
    requiredFields: ['prompt'],
    optionalFields: ['targetSections', 'systemPrompt', 'context', 'model'],
    canRetry: true,
    timeout: 180000,
    priority: 1,
  },

  batch_modify: {
    name: '批量修改',
    category: ActionCategory.DISPATCH,
    executor: 'batchModifyExecutor',
    requiredFields: ['sectionIds', 'operation'],
    optionalFields: ['content', 'mode'],
    canRetry: true,
    timeout: 60000,
    priority: 2,
  },

  // ========== 文档操作 ==========
  add_doc: {
    name: '添加文档',
    category: ActionCategory.DOCUMENT,
    executor: 'addDocExecutor',
    requiredFields: ['docName', 'docContent'],
    optionalFields: ['docType', 'metadata'],
    canRetry: true,
    timeout: 30000,
    priority: 1,
  },

  delete_doc: {
    name: '删除文档',
    category: ActionCategory.DOCUMENT,
    executor: 'deleteDocExecutor',
    requiredFields: ['docId'],
    optionalFields: ['reason'],
    canRetry: false, // 删除操作不可重试
    timeout: 5000,
    priority: 2,
  },

  link_doc_to_section: {
    name: '关联文档',
    category: ActionCategory.DOCUMENT,
    executor: 'linkDocExecutor',
    requiredFields: ['docId', 'sectionId'],
    optionalFields: [],
    canRetry: true,
    timeout: 5000,
    priority: 3,
  },

  // ========== 沉淀操作 ==========
  create_deposit: {
    name: '创建沉淀',
    category: ActionCategory.DEPOSIT,
    executor: 'createDepositExecutor',
    requiredFields: ['name'],
    optionalFields: ['mode', 'sections'],
    canRetry: true,
    timeout: 10000,
    priority: 1,
  },

  update_deposit: {
    name: '更新沉淀',
    category: ActionCategory.DEPOSIT,
    executor: 'updateDepositExecutor',
    requiredFields: ['depositId'],
    optionalFields: ['name', 'sections', 'mode'],
    canRetry: true,
    timeout: 10000,
    priority: 2,
  },

  // ========== 系统操作 ==========
  restore_history: {
    name: '恢复历史',
    category: ActionCategory.SYSTEM,
    executor: 'restoreHistoryExecutor',
    requiredFields: ['historyId'],
    optionalFields: ['sections'],
    canRetry: true,
    timeout: 30000,
    priority: 1,
  },

  save_history: {
    name: '保存历史',
    category: ActionCategory.SYSTEM,
    executor: 'saveHistoryExecutor',
    requiredFields: [],
    optionalFields: ['name', 'description'],
    canRetry: true,
    timeout: 10000,
    priority: 2,
  },
};

// ========== 配置访问函数 ==========

/**
 * 获取操作配置
 * @param {string} actionType - 操作类型
 * @returns {ActionConfig|null} 配置对象或 null
 */
export const getActionConfig = (actionType) => {
  return REPLAY_ACTIONS[actionType] || null;
};

/**
 * 获取所有操作类型
 * @returns {string[]} 操作类型列表
 */
export const getAllActionTypes = () => {
  return Object.keys(REPLAY_ACTIONS);
};

/**
 * 获取指定类别的操作
 * @param {string} category - 操作类别
 * @returns {Object} 该类别的操作配置
 */
export const getActionsByCategory = (category) => {
  return Object.fromEntries(
    Object.entries(REPLAY_ACTIONS).filter(
      ([, config]) => config.category === category
    )
  );
};

/**
 * 检查操作类型是否存在
 * @param {string} actionType - 操作类型
 * @returns {boolean}
 */
export const hasActionType = (actionType) => {
  return actionType in REPLAY_ACTIONS;
};

/**
 * 注册自定义操作类型
 * @param {string} actionType - 操作类型
 * @param {ActionConfig} config - 配置
 */
export const registerAction = (actionType, config) => {
  if (!actionType || typeof actionType !== 'string') {
    throw new Error('操作类型必须是非空字符串');
  }
  if (!config || typeof config !== 'object') {
    throw new Error('配置必须是对象');
  }
  if (!config.name || !config.executor) {
    throw new Error('配置必须包含 name 和 executor');
  }
  REPLAY_ACTIONS[actionType] = {
    category: ActionCategory.SYSTEM,
    requiredFields: [],
    optionalFields: [],
    canRetry: true,
    timeout: 30000,
    priority: 10,
    ...config,
  };
};

/**
 * 取消注册操作类型
 * @param {string} actionType - 操作类型
 * @returns {boolean} 是否成功取消
 */
export const unregisterAction = (actionType) => {
  if (actionType in REPLAY_ACTIONS) {
    delete REPLAY_ACTIONS[actionType];
    return true;
  }
  return false;
};

// ========== 操作类型推断 ==========

/**
 * 根据章节内容推断操作类型
 * @param {Object} section - 沉淀章节
 * @returns {string} 推断的操作类型
 */
export const inferActionType = (section) => {
  if (!section || typeof section !== 'object') {
    return 'unknown';
  }

  const action = (section.action || '').toLowerCase();
  const actionExec = (section.requirements?.actionExecution || '').toLowerCase();
  const combined = `${action} ${actionExec}`;

  // 精确匹配已知操作类型
  for (const actionType of Object.keys(REPLAY_ACTIONS)) {
    if (combined.includes(actionType.replace(/_/g, ' ')) ||
        combined.includes(actionType)) {
      return actionType;
    }
  }

  // 关键词推断
  if (combined.includes('大纲') || combined.includes('outline') || combined.includes('抽取')) {
    return 'outline_extract';
  }
  if (combined.includes('新增标题') || combined.includes('add section') || combined.includes('添加标题')) {
    return 'add_section';
  }
  if (combined.includes('删除标题') || combined.includes('delete section') || combined.includes('移除标题')) {
    return 'delete_section';
  }
  if (combined.includes('编辑标题') || combined.includes('edit title') || combined.includes('修改标题')) {
    return 'edit_title';
  }
  if (combined.includes('编辑摘要') || combined.includes('edit summary') || combined.includes('修改摘要')) {
    return 'edit_summary';
  }
  if (combined.includes('插入摘要') || combined.includes('insert summary') || combined.includes('填入摘要')) {
    return 'insert_to_summary';
  }
  if (combined.includes('执行指令') || combined.includes('dispatch') || combined.includes('调度')) {
    return 'dispatch_execute';
  }
  if (combined.includes('批量') || combined.includes('batch')) {
    return 'batch_modify';
  }
  if (combined.includes('添加文档') || combined.includes('add doc') || combined.includes('上传')) {
    return 'add_doc';
  }
  if (combined.includes('删除文档') || combined.includes('delete doc')) {
    return 'delete_doc';
  }
  if (combined.includes('关联') || combined.includes('link')) {
    return 'link_doc_to_section';
  }
  if (combined.includes('恢复') || combined.includes('restore')) {
    return 'restore_history';
  }
  if (combined.includes('保存历史') || combined.includes('save history')) {
    return 'save_history';
  }

  return 'unknown';
};

// ========== 默认配置导出 ==========

export default REPLAY_ACTIONS;
