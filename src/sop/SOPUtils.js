/**
 * SOP工作台工具函数
 * 包含API调用、文件处理、数据转换等通用函数
 */

import {
  LLM_BUTTONS_STORAGE_KEY,
  LLM_BUTTONS_MIGRATION_KEY,
  DEPOSITS_STORAGE_KEY,
  DEPOSITS_SEQ_STORAGE_KEY,
  DEFAULT_OUTLINE_BUTTON_PROMPT,
  DEFAULT_DISPATCH_SYSTEM_PROMPT,
  DEFAULT_FINAL_SYSTEM_PROMPT,
  DEFAULT_PRECIPITATION_MODE
} from './SOPConstants';

// ========== API请求函数 ==========

/**
 * 通用API请求函数
 * @param {string} path - 请求路径
 * @param {Object} options - 请求选项
 * @returns {Promise<any>} - 响应数据
 */
export async function api(path, options = {}) {
  const resp = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!resp.ok) {
    const text = await resp.text();
    let msg = text;
    try {
      msg = JSON.parse(text).error || text;
    } catch (_) {
      /* ignore */
    }
    throw new Error(msg || '请求失败');
  }

  const ct = resp.headers.get('content-type') || '';
  return ct.includes('application/json') ? resp.json() : resp.text();
}

// ========== 文件处理函数 ==========

/**
 * 读取文件文本内容
 * @param {File} file - 文件对象
 * @returns {Promise<string>} - 文件文本内容
 */
export function readFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.toString());
    reader.onerror = reject;
    reader.readAsText(file, 'utf-8');
  });
}

/**
 * 判断是否为docx文件
 * @param {string} name - 文件名
 * @returns {boolean}
 */
export const isDocxName = (name) => (name || '').toString().trim().toLowerCase().endsWith('.docx');

/**
 * 动态加载mammoth库
 * @returns {Promise<any>}
 */
export const loadMammoth = async () => {
  const mod = await import('mammoth/mammoth.browser');
  return mod?.default || mod;
};

/**
 * 将HTML转换为结构化文本
 * @param {string} html - HTML字符串
 * @returns {string} - 结构化文本
 */
export const htmlToStructuredText = (html) => {
  const raw = (html || '').toString();
  if (!raw.trim()) return '';

  let parsed;
  try {
    parsed = new DOMParser().parseFromString(raw, 'text/html');
  } catch (_) {
    return raw.replace(/<[^>]+>/g, ' ').replace(/\s+\n/g, '\n').trim();
  }

  const lines = [];
  const push = (s = '') => {
    const t = (s || '').toString().replace(/\s+/g, ' ').trim();
    if (!t) return;
    lines.push(t);
  };
  const pushBlank = () => {
    if (!lines.length) return;
    if (lines[lines.length - 1] !== '') lines.push('');
  };

  const walk = (node, listDepth = 0) => {
    if (!node) return;
    if (node.nodeType === 3) return; // text handled by element.textContent

    const el = node;
    if (!el.tagName) {
      Array.from(el.childNodes || []).forEach((c) => walk(c, listDepth));
      return;
    }

    const tag = el.tagName.toUpperCase();

    if (/^H[1-6]$/.test(tag)) {
      const lvl = Math.max(1, Math.min(6, Number(tag.slice(1)) || 1));
      const text = (el.textContent || '').toString().trim();
      if (text) push(`${'#'.repeat(lvl)} ${text}`);
      pushBlank();
      return;
    }

    if (tag === 'P') {
      const text = (el.textContent || '').toString().trim();
      if (text) push(text);
      pushBlank();
      return;
    }

    if (tag === 'LI') {
      const text = (el.textContent || '').toString().trim();
      if (text) push(`${'  '.repeat(Math.max(0, listDepth))}- ${text}`);
      return;
    }

    if (tag === 'UL' || tag === 'OL') {
      Array.from(el.children || []).forEach((c) => walk(c, listDepth + 1));
      pushBlank();
      return;
    }

    if (tag === 'BR') {
      pushBlank();
      return;
    }

    Array.from(el.childNodes || []).forEach((c) => walk(c, listDepth));
  };

  Array.from(parsed.body?.childNodes || []).forEach((c) => walk(c, 0));
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
};

/**
 * 解析docx文件为结构化文本
 * @param {File} file - docx文件
 * @returns {Promise<string>} - 结构化文本
 */
export const parseDocxFileToStructuredText = async (file) => {
  const buf = await file.arrayBuffer();
  const mammoth = await loadMammoth();
  const res = await mammoth.convertToHtml({ arrayBuffer: buf });
  const html = (res?.value || '').toString();
  const structured = htmlToStructuredText(html);
  return structured.trim() ? structured : '';
};

// ========== 文本处理函数 ==========

/**
 * 修复乱码文本
 * @param {any} value - 输入值
 * @returns {any} - 修复后的值
 */
export const fixMojibake = (value) => {
  if (typeof value !== 'string') return value;
  if (!/[\u00C0-\u00FF]/.test(value)) return value;
  const bytes = Uint8Array.from(value, (ch) => ch.charCodeAt(0) & 0xff);
  const decoded = new TextDecoder('utf-8').decode(bytes);
  return /[\u4e00-\u9fff]/.test(decoded) ? decoded : value;
};

/**
 * 判断是否为乱码文本
 * @param {any} value - 输入值
 * @returns {boolean}
 */
export const isGarbledText = (value) =>
  typeof value === 'string' && (/\uFFFD/.test(value) || /\?{2,}/.test(value));

/**
 * 清理文本
 * @param {any} value - 输入值
 * @param {string} fallback - 默认值
 * @returns {string}
 */
export const sanitizeText = (value, fallback = '') => {
  if (value === null || value === undefined) return fallback;
  const fixed = fixMojibake((value || '').toString());
  const trimmed = fixed.trim();
  if (!trimmed || isGarbledText(trimmed)) return fallback;
  return trimmed;
};

/**
 * 标准化按钮文本
 * @param {Object} btn - 按钮对象
 * @returns {Object}
 */
export const normalizeButtonText = (btn) => {
  if (!btn || typeof btn !== 'object') return btn;
  const next = { ...btn };
  if (typeof next.label === 'string') next.label = sanitizeText(next.label, '');
  if (typeof next.prompt === 'string') next.prompt = sanitizeText(next.prompt, '');
  if (typeof next.title === 'string') next.title = sanitizeText(next.title, '');
  return next;
};

// ========== 文档处理函数 ==========

/**
 * 文档去重（保留最后一个）
 * @param {Array} list - 文档列表
 * @returns {Array}
 */
export function uniqueDocsByIdKeepLast(list) {
  const seen = new Set();
  const out = [];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const d = list[i];
    if (!d?.id || seen.has(d.id)) continue;
    seen.add(d.id);
    out.unshift(d);
  }
  return out;
}

/**
 * 合并文档到列表前端
 * @param {Array} prevDocs - 原文档列表
 * @param {Array} docsToUpsert - 要合并的文档
 * @returns {Array}
 */
export function upsertDocsToFront(prevDocs, docsToUpsert) {
  const unique = uniqueDocsByIdKeepLast(docsToUpsert || []);
  const ids = new Set(unique.map((d) => d.id));
  const rest = (prevDocs || []).filter((d) => !ids.has(d.id));
  return [...unique, ...rest];
}

/**
 * 构建大纲树结构
 * @param {Array} sections - 章节列表
 * @returns {Array}
 */
export function buildSectionTree(sections) {
  const roots = [];
  const stack = [];

  (sections || []).forEach((sec) => {
    const rawLevel = Number(sec?.level) || 1;
    const level = Math.max(1, Math.min(4, rawLevel));
    const node = { section: sec, level, children: [] };

    while (stack.length && stack[stack.length - 1].level >= level) stack.pop();

    if (!stack.length) roots.push(node);
    else stack[stack.length - 1].node.children.push(node);

    stack.push({ level, node });
  });

  return roots;
}

// ========== IndexedDB操作 ==========

/**
 * 打开Handle数据库
 * @returns {Promise<IDBDatabase>}
 */
export function openHandleDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('doc_workspace_handles', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * 从IndexedDB获取值
 * @param {string} key - 键名
 * @returns {Promise<any>}
 */
export async function idbGet(key) {
  const db = await openHandleDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readonly');
    const store = tx.objectStore('kv');
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

/**
 * 向IndexedDB设置值
 * @param {string} key - 键名
 * @param {any} value - 值
 * @returns {Promise<boolean>}
 */
export async function idbSet(key, value) {
  const db = await openHandleDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite');
    const store = tx.objectStore('kv');
    const req = store.put(value, key);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

/**
 * 从IndexedDB删除值
 * @param {string} key - 键名
 * @returns {Promise<boolean>}
 */
export async function idbDel(key) {
  const db = await openHandleDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite');
    const store = tx.objectStore('kv');
    const req = store.delete(key);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

// ========== 配置处理函数 ==========

/**
 * 标准化沉淀模式
 * @param {any} value - 输入值
 * @returns {string}
 */
export const normalizePrecipitationMode = (value) => value === 'script' ? 'script' : 'llm';

/**
 * 标准化IO行配置
 * @param {Array} io - IO配置
 * @param {Object} fallback - 默认配置
 * @returns {Array}
 */
export function normalizeIoRows(io, fallback) {
  const fallbackDataSource = fallback?.dataSource === 'selected_doc' ? 'selected_doc' : 'preview';
  const fallbackOutputTarget = fallback?.outputTarget === 'title' ? 'title' : 'summary';

  const rows = Array.isArray(io) ? io : null;
  if (!rows) {
    // Migration from older schema
    return [
      {
        id: 'io_migrated_1',
        enabled: true,
        dataSource: fallbackDataSource,
        output: 'titles',
        target: 'title'
      },
      {
        id: 'io_migrated_2',
        enabled: true,
        dataSource: fallbackDataSource,
        output: 'summaries',
        target: fallbackOutputTarget
      }
    ];
  }

  const normalized = rows
    .map((r, idx) => {
      const id = typeof r?.id === 'string' && r.id.trim() ? r.id.trim() : `io_${idx + 1}`;
      const enabled = r?.enabled !== false;
      const dataSource = r?.dataSource === 'selected_doc' ? 'selected_doc' : 'preview';
      const output = r?.output === 'summaries' ? 'summaries' : 'titles';
      const target = r?.target === 'title' ? 'title' : 'summary';
      return { id, enabled, dataSource, output, target };
    })
    .filter((r) => r.id);

  return normalized.length ? normalized : normalizeIoRows(null, fallback);
}

// ========== 按钮配置函数 ==========

/**
 * 获取默认LLM按钮配置
 * @returns {Array}
 */
export function defaultLlmButtons() {
  return [
    {
      id: 'btn_outline_extract',
      kind: 'outline_extract',
      label: '全文大纲抽取',
      enabled: true,
      precipitationMode: 'llm',
      prompt: DEFAULT_OUTLINE_BUTTON_PROMPT,
      dataSource: 'preview',
      outputTarget: 'summary',
      io: [
        { id: 'io_default_1', enabled: true, dataSource: 'preview', output: 'titles', target: 'title' },
        { id: 'io_default_2', enabled: true, dataSource: 'preview', output: 'summaries', target: 'summary' }
      ]
    },
    {
      id: 'btn_outline_slot_1',
      kind: 'outline_action',
      label: '',
      enabled: false,
      precipitationMode: 'llm',
      prompt: DEFAULT_DISPATCH_SYSTEM_PROMPT,
      io: [{ id: 'io_outline_slot_1', enabled: true, dataSource: 'preview', output: 'summaries', target: 'summary' }]
    },
    {
      id: 'btn_outline_slot_2',
      kind: 'outline_action',
      label: '',
      enabled: false,
      precipitationMode: 'llm',
      prompt: DEFAULT_DISPATCH_SYSTEM_PROMPT,
      io: [{ id: 'io_outline_slot_2', enabled: true, dataSource: 'preview', output: 'summaries', target: 'summary' }]
    },
    {
      id: 'btn_outline_slot_3',
      kind: 'outline_action',
      label: '',
      enabled: false,
      precipitationMode: 'llm',
      prompt: DEFAULT_DISPATCH_SYSTEM_PROMPT,
      io: [{ id: 'io_outline_slot_3', enabled: true, dataSource: 'preview', output: 'summaries', target: 'summary' }]
    },
    {
      id: 'btn_dispatch',
      kind: 'dispatch',
      label: '执行指令',
      enabled: true,
      precipitationMode: 'llm',
      prompt: DEFAULT_DISPATCH_SYSTEM_PROMPT,
      io: [{ id: 'io_dispatch_1', enabled: true, dataSource: 'preview', output: 'summaries', target: 'summary' }]
    },
    {
      id: 'btn_final_generate',
      kind: 'final_generate',
      label: '最终文档生成',
      enabled: true,
      precipitationMode: 'llm',
      prompt: DEFAULT_FINAL_SYSTEM_PROMPT,
      io: [{ id: 'io_final_1', enabled: true, dataSource: 'preview', output: 'summaries', target: 'summary' }]
    }
  ];
}

/**
 * 从存储加载LLM按钮配置
 * @returns {Array}
 */
export function loadLlmButtonsFromStorage() {
  try {
    const raw = localStorage.getItem(LLM_BUTTONS_STORAGE_KEY);
    if (!raw) return defaultLlmButtons();

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultLlmButtons();

    const normalized = parsed
      .map((b, idx) => {
        const id = typeof b?.id === 'string' && b.id.trim() ? b.id.trim() : `btn_${idx + 1}`;
        const kind =
          b?.kind === 'dispatch' || b?.kind === 'final_generate' || b?.kind === 'outline_extract' || b?.kind === 'outline_action'
            ? b.kind
            : 'outline_extract';
        const label = typeof b?.label === 'string' ? b.label : '';
        const enabled = !!b?.enabled;
        const dataSource = b?.dataSource === 'selected_doc' ? 'selected_doc' : 'preview';
        const promptDefault =
          kind === 'dispatch'
            ? DEFAULT_DISPATCH_SYSTEM_PROMPT
            : kind === 'final_generate'
              ? DEFAULT_FINAL_SYSTEM_PROMPT
              : kind === 'outline_action'
                ? DEFAULT_DISPATCH_SYSTEM_PROMPT
                : DEFAULT_OUTLINE_BUTTON_PROMPT;
        const prompt = typeof b?.prompt === 'string' ? b.prompt : promptDefault;
        const outputTarget = b?.outputTarget === 'title' ? 'title' : 'summary';
        const io = normalizeIoRows(b?.io, { dataSource, outputTarget });
        const precipitationMode = normalizePrecipitationMode(b?.precipitationMode);
        return { id, kind, label, enabled, prompt, io, precipitationMode };
      })
      .filter((b) => b.id);

    const defaults = defaultLlmButtons();
    const migrated = localStorage.getItem(LLM_BUTTONS_MIGRATION_KEY) === '1';
    const merged = [...normalized];
    const toAdd = migrated ? defaults.filter((d) => d.kind === 'outline_action') : defaults;

    toAdd.forEach((d) => {
      if (!merged.some((b) => b.id === d.id)) merged.push(d);
    });

    if (!migrated) {
      try {
        localStorage.setItem(LLM_BUTTONS_MIGRATION_KEY, '1');
        localStorage.setItem(LLM_BUTTONS_STORAGE_KEY, JSON.stringify(merged));
      } catch (_) {
        /* ignore */
      }
    }

    return merged.length ? merged : defaults;
  } catch (_) {
    return defaultLlmButtons();
  }
}

/**
 * 从存储加载沉淀记录
 * @returns {Array}
 */
export function loadDepositsFromStorage() {
  try {
    const raw = localStorage.getItem(DEPOSITS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((d) => ({
        id: typeof d?.id === 'string' && d.id.trim() ? d.id.trim() : `沉淀_${Date.now()}`,
        name: typeof d?.name === 'string' && d.name.trim() ? fixMojibake(d.name).trim() : undefined,
        createdAt: typeof d?.createdAt === 'number' ? d.createdAt : Date.now(),
        precipitationMode: normalizePrecipitationMode(d?.precipitationMode),
        sections: Array.isArray(d?.sections)
          ? d.sections.map((s) => ({
              ...s,
              action: fixMojibake(s?.action),
              content: fixMojibake(s?.content),
              summary: fixMojibake(s?.summary),
              hint: fixMojibake(s?.hint)
            }))
          : []
      }))
      .filter((d) => d.id);
  } catch (_) {
    return [];
  }
}

/**
 * 从存储加载沉淀序列号
 * @returns {number}
 */
export function loadDepositsSeqFromStorage() {
  try {
    const raw = localStorage.getItem(DEPOSITS_SEQ_STORAGE_KEY);
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch (_) {
    return 0;
  }
}
