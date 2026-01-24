/**
 * 状态验证器
 * 用于验证和规范化数据结构，确保数据完整性
 */

import { safeArray, safeObject, safeString, safeNumber } from '../utils/safeOps';

// ========== 验证结果类型 ==========

/**
 * 创建验证结果
 * @param {boolean} valid - 是否有效
 * @param {Array} errors - 错误列表
 * @param {Array} warnings - 警告列表
 * @returns {Object} 验证结果
 */
const createValidationResult = (valid, errors = [], warnings = []) => ({
  valid,
  errors,
  warnings,
  hasErrors: errors.length > 0,
  hasWarnings: warnings.length > 0,
});

// ========== 沉淀记录验证 ==========

/**
 * 验证沉淀记录结构
 * @param {Object} deposit - 沉淀记录
 * @returns {Object} 验证结果 { valid, errors, warnings }
 */
export const validateDeposit = (deposit) => {
  const errors = [];
  const warnings = [];

  if (!deposit || typeof deposit !== 'object') {
    errors.push('沉淀记录必须是对象');
    return createValidationResult(false, errors);
  }

  // 必填字段验证
  if (!deposit.id) {
    errors.push('缺少必填字段: id');
  }
  if (!deposit.name && deposit.name !== '') {
    warnings.push('建议填写 name 字段');
  }

  // 类型验证
  if (deposit.sections && !Array.isArray(deposit.sections)) {
    errors.push('sections 必须是数组');
  }

  if (deposit.createdAt && typeof deposit.createdAt !== 'number') {
    warnings.push('createdAt 应该是时间戳数字');
  }

  if (deposit.precipitationMode && 
      !['llm', 'script'].includes(deposit.precipitationMode)) {
    warnings.push('precipitationMode 应该是 "llm" 或 "script"');
  }

  return createValidationResult(errors.length === 0, errors, warnings);
};

/**
 * 验证沉淀章节结构
 * @param {Object} section - 章节
 * @returns {Object} 验证结果
 */
export const validateDepositSection = (section) => {
  const errors = [];
  const warnings = [];

  if (!section || typeof section !== 'object') {
    errors.push('章节必须是对象');
    return createValidationResult(false, errors);
  }

  if (!section.id) {
    errors.push('章节缺少 id');
  }

  if (!section.action && section.action !== '') {
    warnings.push('建议填写 action 字段');
  }

  if (section.requirements && typeof section.requirements !== 'object') {
    errors.push('requirements 必须是对象');
  }

  return createValidationResult(errors.length === 0, errors, warnings);
};

/**
 * 验证大纲章节结构
 * @param {Object} section - 章节
 * @returns {Object} 验证结果
 */
export const validateOutlineSection = (section) => {
  const errors = [];
  const warnings = [];

  if (!section || typeof section !== 'object') {
    errors.push('章节必须是对象');
    return createValidationResult(false, errors);
  }

  if (!section.id) {
    errors.push('章节缺少 id');
  }

  if (!section.title && section.title !== '') {
    warnings.push('建议填写 title 字段');
  }

  if (section.level !== undefined) {
    const level = Number(section.level);
    if (!Number.isInteger(level) || level < 1 || level > 4) {
      errors.push('level 必须是 1-4 之间的整数');
    }
  }

  return createValidationResult(errors.length === 0, errors, warnings);
};

/**
 * 验证沉淀集结构
 * @param {Object} group - 沉淀集
 * @returns {Object} 验证结果
 */
export const validateDepositGroup = (group) => {
  const errors = [];
  const warnings = [];

  if (!group || typeof group !== 'object') {
    errors.push('沉淀集必须是对象');
    return createValidationResult(false, errors);
  }

  if (!group.id) {
    errors.push('缺少必填字段: id');
  }

  if (!group.name) {
    warnings.push('建议填写 name 字段');
  }

  if (group.depositIds && !Array.isArray(group.depositIds)) {
    errors.push('depositIds 必须是数组');
  }

  return createValidationResult(errors.length === 0, errors, warnings);
};

// ========== 数据规范化 ==========

/**
 * 规范化沉淀记录，填充缺失字段
 * @param {Object} deposit - 原始沉淀记录
 * @returns {Object} 规范化后的沉淀记录
 */
export const normalizeDeposit = (deposit) => {
  const d = safeObject(deposit);
  return {
    id: d.id || `deposit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: safeString(d.name, '未命名沉淀'),
    createdAt: safeNumber(d.createdAt, Date.now()),
    precipitationMode: d.precipitationMode === 'script' ? 'script' : 'llm',
    sections: safeArray(d.sections).map(normalizeDepositSection),
  };
};

/**
 * 规范化沉淀章节
 * @param {Object} section - 原始章节
 * @returns {Object} 规范化后的章节
 */
export const normalizeDepositSection = (section) => {
  const s = safeObject(section);
  const req = safeObject(s.requirements);
  
  return {
    id: s.id || `dsec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    action: safeString(s.action, ''),
    content: safeString(s.content, ''),
    requirements: {
      inputSource: safeString(req.inputSource, 'optional'),
      actionExecution: safeString(req.actionExecution, 'optional'),
      executionSummary: safeString(req.executionSummary, 'optional'),
      recordLocation: safeString(req.recordLocation, 'optional'),
    },
    // 保留其他自定义字段
    ...Object.fromEntries(
      Object.entries(s).filter(
        ([key]) => !['id', 'action', 'content', 'requirements'].includes(key)
      )
    ),
  };
};

/**
 * 规范化大纲章节
 * @param {Object} section - 原始章节
 * @returns {Object} 规范化后的章节
 */
export const normalizeOutlineSection = (section) => {
  const s = safeObject(section);
  return {
    id: s.id || `sec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: safeString(s.title, ''),
    summary: safeString(s.summary, ''),
    hint: safeString(s.hint, ''),
    level: Math.min(4, Math.max(1, safeNumber(s.level, 1))),
  };
};

/**
 * 规范化沉淀集
 * @param {Object} group - 原始沉淀集
 * @returns {Object} 规范化后的沉淀集
 */
export const normalizeDepositGroup = (group) => {
  const g = safeObject(group);
  return {
    id: g.id || `group_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: safeString(g.name, '未命名沉淀集'),
    depositIds: safeArray(g.depositIds).filter((id) => typeof id === 'string'),
    createdAt: safeNumber(g.createdAt, Date.now()),
  };
};

// ========== 批量验证 ==========

/**
 * 批量验证沉淀记录
 * @param {Array} deposits - 沉淀记录数组
 * @returns {Object} 验证结果
 */
export const validateDeposits = (deposits) => {
  const arr = safeArray(deposits);
  const errors = [];
  const warnings = [];
  const validItems = [];
  const invalidItems = [];

  arr.forEach((deposit, index) => {
    const result = validateDeposit(deposit);
    if (result.valid) {
      validItems.push(deposit);
    } else {
      invalidItems.push({ index, deposit, errors: result.errors });
      errors.push(`[${index}] ${result.errors.join(', ')}`);
    }
    if (result.warnings.length > 0) {
      warnings.push(`[${index}] ${result.warnings.join(', ')}`);
    }
  });

  return {
    valid: invalidItems.length === 0,
    errors,
    warnings,
    validItems,
    invalidItems,
    total: arr.length,
    validCount: validItems.length,
    invalidCount: invalidItems.length,
  };
};

/**
 * 验证并修复沉淀记录数组
 * @param {Array} deposits - 沉淀记录数组
 * @returns {Array} 修复后的数组
 */
export const sanitizeDeposits = (deposits) => {
  return safeArray(deposits)
    .filter((d) => d && typeof d === 'object' && d.id)
    .map(normalizeDeposit);
};

// ========== 类型检查工具 ==========

/**
 * 检查是否为有效的沉淀ID
 * @param {*} id - ID
 * @returns {boolean}
 */
export const isValidDepositId = (id) => {
  return typeof id === 'string' && id.length > 0;
};

/**
 * 检查是否为有效的章节ID
 * @param {*} id - ID
 * @returns {boolean}
 */
export const isValidSectionId = (id) => {
  return typeof id === 'string' && id.length > 0;
};

/**
 * 检查沉淀模式是否有效
 * @param {*} mode - 模式
 * @returns {boolean}
 */
export const isValidPrecipitationMode = (mode) => {
  return mode === 'llm' || mode === 'script';
};
