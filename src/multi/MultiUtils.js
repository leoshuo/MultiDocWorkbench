/**
 * Multi工作台工具函数
 * 包含API调用、文件处理、Replay解析等
 */

import { REPLAY_META_MARKER, SHARED_SCENE_KEY } from './MultiConstants';

// ========== API请求函数 ==========

/**
 * 通用JSON请求函数
 * @param {string} url - 请求URL
 * @param {Object} options - 请求选项
 * @returns {Promise<any>}
 */
export const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '请求失败');
    let errMsg = errText;
    try {
      const parsed = JSON.parse(errText);
      if (parsed?.error) errMsg = parsed.error;
    } catch (_) {
      /* ignore */
    }
    throw new Error(errMsg);
  }

  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
};

// ========== Replay解析函数 ==========

/**
 * 提取Replay元数据
 * @param {string} content - 内容字符串
 * @returns {Object|null}
 */
export const extractReplayMeta = (content) => {
  const raw = (content || '').toString();
  const idx = raw.indexOf(REPLAY_META_MARKER);
  if (idx === -1) return null;

  const json = raw.slice(idx + REPLAY_META_MARKER.length).trim();
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_) {
    return null;
  }
};

/**
 * 按前缀查找行
 * @param {Array<string>} lines - 行数组
 * @param {Array<string>} prefixes - 前缀数组
 * @returns {string|undefined}
 */
export const pickLineByPrefix = (lines, prefixes) =>
  lines.find((line) => prefixes.some((prefix) => line.startsWith(prefix)));

/**
 * 去除行前缀
 * @param {string} line - 行内容
 * @param {Array<string>} prefixes - 前缀数组
 * @returns {string}
 */
export const stripLinePrefix = (line, prefixes) => {
  if (!line) return '';
  const found = prefixes.find((prefix) => line.startsWith(prefix));
  if (!found) return line.trim();
  return line.slice(found.length).replace(/^[:\uff1a]/, '').trim();
};

/**
 * 解析Section内容
 * @param {string} content - 内容字符串
 * @returns {Object}
 */
export const parseSectionContent = (content) => {
  const raw = (content || '').toString();
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const inputLine = pickLineByPrefix(lines, ['输入来源', '输入来源：', '输入：']);
  const actionLine = pickLineByPrefix(lines, ['动作执行', '动作执行：', '动作：']);
  const summaryLine = pickLineByPrefix(lines, ['执行摘要', '执行摘要：', '摘要：', '输出摘要：']);
  const locationLine = pickLineByPrefix(lines, ['记录位置', '记录位置：', '位置：']);

  return { inputLine, actionLine, summaryLine, locationLine };
};

// ========== 场景管理函数 ==========

/**
 * 加载共享场景
 * @returns {Promise<Object|null>}
 */
export const loadSharedScene = async () => {
  try {
    const sceneId = localStorage.getItem(SHARED_SCENE_KEY);
    if (!sceneId) return null;

    const res = await fetchJson(`/api/scene/${sceneId}`);
    return res?.scene || null;
  } catch (_) {
    return null;
  }
};

// ========== 文件处理函数 ==========

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
 * 读取文件文本内容
 * @param {File} file - 文件对象
 * @returns {Promise<string>}
 */
export const readFileText = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result?.toString() || '');
    reader.onerror = reject;
    reader.readAsText(file, 'utf-8');
  });

/**
 * 将HTML转换为结构化文本
 * @param {string} html - HTML字符串
 * @returns {string}
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
    if (node.nodeType === 3) return;

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
 * @returns {Promise<string>}
 */
export const parseDocxFileToStructuredText = async (file) => {
  const buf = await file.arrayBuffer();
  const mammoth = await loadMammoth();
  const res = await mammoth.convertToHtml({ arrayBuffer: buf });
  const html = (res?.value || '').toString();
  const structured = htmlToStructuredText(html);
  return structured.trim() ? structured : '';
};

/**
 * 格式化文档大小显示
 * @param {string} content - 内容字符串
 * @returns {string}
 */
export const formatDocSize = (content) => {
  const len = (content || '').length;
  if (len < 1000) return `${len} 字符`;
  if (len < 10000) return `${(len / 1000).toFixed(1)}K 字符`;
  return `${(len / 1000).toFixed(0)}K 字符`;
};
