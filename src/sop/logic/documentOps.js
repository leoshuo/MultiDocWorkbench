/**
 * documentOps.js - 文档操作相关纯函数
 * 从 SOPWorkbench.jsx 迁移的独立逻辑函数
 */

/**
 * 深拷贝对象
 * @param {any} obj - 要拷贝的对象
 * @returns {any} 拷贝后的对象
 */
export const deepClone = (obj) => {
  try {
    return structuredClone(obj);
  } catch (_) {
    return JSON.parse(JSON.stringify(obj));
  }
};

/**
 * 标准化文档选择器配置
 * @param {object} selector - 原始选择器对象
 * @returns {object} 标准化后的选择器
 */
export const normalizeDocSelector = (selector) => {
  const s = selector && typeof selector === 'object' ? selector : {};
  const kind = s.kind === 'regex' ? 'regex' : 'keywords';
  const mode = s.mode === 'multi' ? 'multi' : 'single';
  const pick = s.pick === 'first' ? 'first' : 'newest';
  const extension = (s.extension || '').toString().trim();
  const keywords = Array.isArray(s.keywords)
    ? s.keywords.map((k) => (k || '').toString()).filter(Boolean)
    : [];
  const pattern = (s.pattern || '').toString();
  const flags = (s.flags || 'i').toString() || 'i';
  const description = (s.description || '').toString();
  return { kind, mode, pick, extension, keywords, pattern, flags, description };
};

/**
 * 根据选择器匹配文件名
 * @param {string} name - 文件名
 * @param {object} selector - 选择器配置
 * @returns {boolean} 是否匹配
 */
export const matchFileNameBySelector = (name, selector) => {
  const s = normalizeDocSelector(selector);
  const rawName = (name || '').toString();
  if (!rawName) return false;
  const lowered = rawName.toLowerCase();
  
  // 检查扩展名
  if (s.extension && !lowered.endsWith(s.extension.toLowerCase())) return false;
  
  // 正则匹配模式
  if (s.kind === 'regex') {
    if (!s.pattern.trim()) return false;
    try {
      const re = new RegExp(s.pattern, s.flags || 'i');
      return re.test(rawName);
    } catch (_) {
      return false;
    }
  }
  
  // 关键词匹配模式
  if (!s.keywords.length) return true;
  return s.keywords.every((k) => lowered.includes((k || '').toString().toLowerCase()));
};

/**
 * 标准化沉淀组对象
 * @param {object} g - 沉淀组对象
 * @returns {object|null} 标准化后的沉淀组
 */
export const normalizeDepositGroup = (g) => {
  if (!g) return null;
  const id = typeof g.id === 'string' && g.id.trim() ? g.id.trim() : `group_${Date.now()}`;
  const name = typeof g.name === 'string' && g.name.trim() ? g.name.trim() : id;
  const depositIds = Array.isArray(g.depositIds)
    ? Array.from(new Set(g.depositIds.filter(Boolean)))
    : [];
  const createdAt = typeof g.createdAt === 'number' ? g.createdAt : Date.now();
  return { ...g, id, name, depositIds, createdAt };
};

/**
 * 重新排序沉淀列表（拖拽排序）
 * @param {Array} list - 沉淀列表
 * @param {string} sourceId - 源项ID
 * @param {string} targetId - 目标项ID
 * @returns {Array} 排序后的列表
 */
export const reorderDepositList = (list, sourceId, targetId) => {
  const next = [...(list || [])];
  const fromIdx = next.findIndex((d) => d.id === sourceId);
  const toIdx = next.findIndex((d) => d.id === targetId);
  if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return list;
  const [moved] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, moved);
  return next;
};

/**
 * 移动沉淀到指定索引位置
 * @param {Array} list - 沉淀列表
 * @param {string} depositId - 沉淀ID
 * @param {number} targetIndex - 目标索引
 * @returns {Array} 移动后的列表
 */
export const moveDepositToIndex = (list, depositId, targetIndex) => {
  const next = [...(list || [])];
  const fromIdx = next.findIndex((d) => d.id === depositId);
  if (fromIdx === -1) return list;
  const bounded = Math.max(0, Math.min(targetIndex, next.length - 1));
  const [moved] = next.splice(fromIdx, 1);
  next.splice(bounded, 0, moved);
  return next;
};

/**
 * 根据名称在文档列表中查找文档ID
 * @param {string} name - 文档名称
 * @param {Array} list - 文档列表
 * @returns {string|null} 文档ID或null
 */
export const findDocIdByNameInList = (name, list) => {
  const key = (name || '').toString().trim().toLowerCase();
  if (!key) return null;
  const d = (list || []).find((x) => (x?.name || '').toString().trim().toLowerCase() === key);
  return d?.id || null;
};

/**
 * 判断是否需要严格的 Replay 元数据
 * @param {object} meta - 元数据对象
 * @param {string} action - 操作类型
 * @returns {boolean} 是否需要严格模式
 */
export const strictReplayRequired = (meta, action) => {
  if (meta && typeof meta === 'object') return false;
  const a = (action || '').toString();
  if (a === '输入指令') return false;
  if (a === '编辑标题' || a === '编辑摘要' || a === '删除摘要') return false;
  if (a === '添加文档') return false;
  return true;
};

/**
 * 等待一个 UI tick（用于确保 React 状态更新）
 * @returns {Promise<void>}
 */
export const waitUiTick = () => new Promise((r) => setTimeout(r, 0));
