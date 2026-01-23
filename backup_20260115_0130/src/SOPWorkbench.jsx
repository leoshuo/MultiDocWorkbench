import { useEffect, useRef, useState } from 'react';
import './style.css';
import './fonts.css';
import { loadLayoutConfig, saveLayoutConfig, resetLayoutConfig } from './layoutEditor';
import { loadButtonConfig, saveButtonConfig, resetButtonConfig, DEFAULT_BUTTON_CONFIG, validateButtonConfig } from './buttonManager';
import { migrateButtonConfig, backupConfig, cleanOldBackups } from './utils/buttonMigration';
import { StyleEditor } from './StyleEditor';
import { EditableButton, EditableButtonsContainer } from './EditableButton';
import { EditableLayoutPanel, LayoutEditContainer } from './EditablePanel';
import { GlobalButtonsContainer } from './GlobalButton';
import { EditConsole } from './RecycleBin';
import { InputPanelContent, InputFormPanelContent, DocumentListPanelContent, ReplayDirectoryPanelContent, ContentPreviewPanelContent, ProcessingPanelContent, OperationsPanelContent } from './PanelComponents';
import { EditableContentBlock } from './EditableContentBlock';
import { Layout as LayoutIcon, Settings, Check, X, FileText, List, History, Sparkles, FolderOpen, Trash2, Plus, GripVertical, Type, AlignLeft, AlignCenter, AlignRight, Play, GalleryVerticalEnd, Save, RotateCcw, LogOut, Layout, ChevronLeft } from 'lucide-react';


async function api(path, options = {}) {
  const resp = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
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

function readFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.toString());
    reader.onerror = reject;
    reader.readAsText(file, 'utf-8');
  });
}

const isDocxName = (name) => (name || '').toString().trim().toLowerCase().endsWith('.docx');

const loadMammoth = async () => {
  const mod = await import('mammoth/mammoth.browser');
  return mod?.default || mod;
};

const htmlToStructuredText = (html) => {
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
  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const parseDocxFileToStructuredText = async (file) => {
  const buf = await file.arrayBuffer();
  const mammoth = await loadMammoth();
  const res = await mammoth.convertToHtml({ arrayBuffer: buf });
  const html = (res?.value || '').toString();
  const structured = htmlToStructuredText(html);
  return structured.trim() ? structured : '';
};

function uniqueDocsByIdKeepLast(list) {
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

function upsertDocsToFront(prevDocs, docsToUpsert) {
  const unique = uniqueDocsByIdKeepLast(docsToUpsert || []);
  const ids = new Set(unique.map((d) => d.id));
  const rest = (prevDocs || []).filter((d) => !ids.has(d.id));
  return [...unique, ...rest];
}

function buildSectionTree(sections) {
  const roots = [];
  const stack = [];
  (sections || []).forEach((sec) => {
    const rawLevel = Number(sec?.level) || 1;
    const level = Math.max(1, Math.min(3, rawLevel));
    const node = { section: sec, level, children: [] };

    while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
    if (!stack.length) roots.push(node);
    else stack[stack.length - 1].node.children.push(node);

    stack.push({ level, node });
  });
  return roots;
}

const LLM_BUTTONS_STORAGE_KEY = 'llm_buttons_v1';
const LLM_BUTTONS_MIGRATION_KEY = 'llm_buttons_migrated_v2';
const DEPOSITS_STORAGE_KEY = 'deposits_v1';
const DEPOSITS_SEQ_STORAGE_KEY = 'deposits_seq_v1';
const REPLAY_META_MARKER = '__REPLAY_META__';
const REPLAY_DIR_HANDLE_KEY = 'replay_dir_handle_v1';

function openHandleDb() {
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

async function idbGet(key) {
  const db = await openHandleDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readonly');
    const store = tx.objectStore('kv');
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key, value) {
  const db = await openHandleDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite');
    const store = tx.objectStore('kv');
    const req = store.put(value, key);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

async function idbDel(key) {
  const db = await openHandleDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite');
    const store = tx.objectStore('kv');
    const req = store.delete(key);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

const DEFAULT_OUTLINE_BUTTON_PROMPT = `
请基于以下内容抽取提纲（节点数量不限），输出 JSON 数组：
[
  {"id":"...","title":"原文中的标题（尽量保持原样）","summary":"一句摘要（<=20字）","hint":"写作提示","level":1-3}
]
要求：
- level 基于语义判断：1/2/3，不必强制均衡（无法确定默认 1）
- title 覆盖核心结构，顺序合理，尽量直接采用原文标题文本
- summary 为该标题下一句话摘要（<=20字）
- hint 给出该章节写作提示（1-2 句）
- 避免将普通段落或列表项误判为标题；若标题过多可合并从属项到上级，保持精简
- 不要输出多余文本

内容：
{{text}}
`.trim();

const DEFAULT_DISPATCH_SYSTEM_PROMPT = `
你是中文文档处理助手。请根据用户指令处理给定文本，严格用中文输出 JSON 对象，字段：
- summary（一句话说明你做了什么）
- detail（处理后的正文）
- edits（可选数组，每项：{sectionId, field:'title'|'summary', content}�?
不要返回其他字段，不要解释�?
`.trim();

const DEFAULT_FINAL_SYSTEM_PROMPT = `
你是中文写作与排版助手。请将用户提供的草稿整理成结构清晰、语言通顺的最终文档，尽量保留原有信息，不要杜撰。输�?Markdown 正文即可，不要解释�?
`.trim();

function normalizeIoRows(io, fallback) {
  const fallbackDataSource = fallback?.dataSource === 'selected_doc' ? 'selected_doc' : 'preview';
  const fallbackOutputTarget = fallback?.outputTarget === 'title' ? 'title' : 'summary';

  const rows = Array.isArray(io) ? io : null;
  if (!rows) {
    // Migration from older schema: a single outputTarget was controlling where summaries go.
    return [
      {
        id: 'io_migrated_1',
        enabled: true,
        dataSource: fallbackDataSource,
        output: 'titles',
        target: 'title',
      },
      {
        id: 'io_migrated_2',
        enabled: true,
        dataSource: fallbackDataSource,
        output: 'summaries',
        target: fallbackOutputTarget,
      },
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

function defaultLlmButtons() {
  return [
    {
      id: 'btn_outline_extract',
      kind: 'outline_extract',
      label: '全文大纲抽取',
      enabled: true,
      prompt: DEFAULT_OUTLINE_BUTTON_PROMPT,
      dataSource: 'preview', // legacy default for migration
      outputTarget: 'summary', // legacy default for migration
      io: [
        { id: 'io_default_1', enabled: true, dataSource: 'preview', output: 'titles', target: 'title' },
        { id: 'io_default_2', enabled: true, dataSource: 'preview', output: 'summaries', target: 'summary' },
      ],
    },
    {
      id: 'btn_outline_slot_1',
      kind: 'outline_action',
      label: '',
      enabled: false,
      prompt: DEFAULT_DISPATCH_SYSTEM_PROMPT,
      io: [{ id: 'io_outline_slot_1', enabled: true, dataSource: 'preview', output: 'summaries', target: 'summary' }],
    },
    {
      id: 'btn_outline_slot_2',
      kind: 'outline_action',
      label: '',
      enabled: false,
      prompt: DEFAULT_DISPATCH_SYSTEM_PROMPT,
      io: [{ id: 'io_outline_slot_2', enabled: true, dataSource: 'preview', output: 'summaries', target: 'summary' }],
    },
    {
      id: 'btn_outline_slot_3',
      kind: 'outline_action',
      label: '',
      enabled: false,
      prompt: DEFAULT_DISPATCH_SYSTEM_PROMPT,
      io: [{ id: 'io_outline_slot_3', enabled: true, dataSource: 'preview', output: 'summaries', target: 'summary' }],
    },
    {
      id: 'btn_dispatch',
      kind: 'dispatch',
      label: '执行指令',
      enabled: true,
      prompt: DEFAULT_DISPATCH_SYSTEM_PROMPT,
      io: [{ id: 'io_dispatch_1', enabled: true, dataSource: 'preview', output: 'summaries', target: 'summary' }],
    },
    {
      id: 'btn_final_generate',
      kind: 'final_generate',
      label: '最终文档生成',
      enabled: true,
      prompt: DEFAULT_FINAL_SYSTEM_PROMPT,
      io: [{ id: 'io_final_1', enabled: true, dataSource: 'preview', output: 'summaries', target: 'summary' }],
    },
  ];
}

function loadLlmButtonsFromStorage() {
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
        return { id, kind, label, enabled, prompt, io };
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

function loadDepositsFromStorage() {
  try {
    const raw = localStorage.getItem(DEPOSITS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((d) => ({
        id: typeof d?.id === 'string' && d.id.trim() ? d.id.trim() : `沉淀_${Date.now()}`,
        name: typeof d?.name === 'string' && d.name.trim() ? d.name.trim() : undefined,
        createdAt: typeof d?.createdAt === 'number' ? d.createdAt : Date.now(),
        sections: Array.isArray(d?.sections) ? d.sections : [],
      }))
      .filter((d) => d.id);
  } catch (_) {
    return [];
  }
}

function loadDepositsSeqFromStorage() {
  try {
    const raw = localStorage.getItem(DEPOSITS_SEQ_STORAGE_KEY);
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch (_) {
    return 0;
  }
}

export default function SOPWorkbench({ onSwitch }) {
  const [template, setTemplate] = useState(null);
  const [docs, setDocs] = useState([]);
  const [scene, setScene] = useState(null);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [toast, setToast] = useState('');
  const [showOutlineMode, setShowOutlineMode] = useState(true); // 仅保留大纲模式视�?
  const [processingTab, setProcessingTab] = useState('outline'); // 'outline' | 'records' | 'config'
  const [dispatchLogs, setDispatchLogs] = useState([]);
  const [expandedLogs, setExpandedLogs] = useState({});
  const [finalSlots, setFinalSlots] = useState({});
  const [processedContent, setProcessedContent] = useState('');

  const [dispatchMode, setDispatchMode] = useState('doc'); // 'doc' | 'result'
  const [selectedLogTexts, setSelectedLogTexts] = useState({});
  const [outlineEditing, setOutlineEditing] = useState({});
  const [sectionDocLinks, setSectionDocLinks] = useState({}); // sectionId -> docId[]
  const [sectionDocPick, setSectionDocPick] = useState({}); // sectionId -> docId
  const [docDraft, setDocDraft] = useState('');
  const [selectedOutlineExec, setSelectedOutlineExec] = useState({}); // sectionId -> bool
  const [sectionDocDone, setSectionDocDone] = useState({}); // sectionId -> {docId: true}
  const [summaryExpanded, setSummaryExpanded] = useState({}); // sectionId -> bool
  const [isDepositing, setIsDepositing] = useState(false);
  const [isEditingLayout, setIsEditingLayout] = useState(false); // 编辑界面模式
  // 定义默认布局常量�?个面�?- 优化后的布局�?
  // 左列：内容预览（上）、输入素材（中）、文档列表（下）
  // 右列：文档处理（上）、操作调度（下）
  const DEFAULT_LAYOUT = {
    'preview-panel': { left: 20, top: 20, width: 600, height: 360 },
    // 'input-form-panel' removed
    'document-list-panel': { left: 20, top: 396, width: 600, height: 376 }, // Expanded to fill gap
    'processing-panel': { left: 636, top: 20, width: 550, height: 376 },
    'operations-panel': { left: 636, top: 412, width: 550, height: 360 },
  };

  const [panelPositions, setPanelPositions] = useState(() => {
    // 尝试�?localStorage 读取
    let saved = null;
    try {
      const stored = localStorage.getItem('layout_panel_positions');
      if (stored) saved = JSON.parse(stored);
    } catch (e) {
      console.warn('Failed to load layout', e);
    }

    // 验证单个面板位置是否有效
    const isValid = (pos) => pos && pos.width > 100 && pos.height > 100;

    // 配置迁移：从�?面板配置迁移到新5面板配置
    if (saved) {
      // 检查是否是旧配置（包含 input-panel 而不�?input-form-panel�?
      if (saved['input-panel'] && !saved['input-form-panel']) {
        console.log('[Layout Migration] 检测到旧版4面板配置，正在迁移到5面板配置...');

        // 从旧�?input-panel 创建两个新面�?
        const oldInput = saved['input-panel'];
        const splitHeight = Math.floor(oldInput.height / 2) - 10;

        saved['input-form-panel'] = {
          left: oldInput.left,
          top: oldInput.top,
          width: oldInput.width,
          height: splitHeight,
        };

        saved['document-list-panel'] = {
          left: oldInput.left,
          top: oldInput.top + splitHeight + 20,
          width: oldInput.width,
          height: splitHeight,
        };

        // 删除旧面�?
        delete saved['input-panel'];

        // 保存迁移后的配置�?localStorage
        try {
          localStorage.setItem('layout_panel_positions', JSON.stringify(saved));
          console.log('[Layout Migration] 迁移完成并已保存');
        } catch (e) {
          console.warn('[Layout Migration] 保存失败:', e);
        }
      }

      // Config Migration 2: Remove input-form-panel and expand document-list-panel
      if (saved['input-form-panel']) {
        console.log('[Layout Migration] Removing input-form-panel and expanding document-list-panel...');
        const inputPanel = saved['input-form-panel'];
        const listPanel = saved['document-list-panel'];

        if (inputPanel && listPanel) {
          // Expand list panel to cover input panel area (assuming vertical stack)
          // Or just use default for list panel if it seems messy?
          // Let's just set list panel to new default-ish position if it matches old default
          // New Default: top 396, height 376. 
          // Old List: top 592, height 180. Old Input: top 396, height 180.
          // So simply setting List.top = Input.top, and List.height = Input.height + Gap + List.height

          saved['document-list-panel'] = {
            left: listPanel.left,
            top: inputPanel.top,
            width: listPanel.width, // Keep width
            height: (listPanel.top - inputPanel.top) + listPanel.height // Covers gap + old input height
          };
        }
        delete saved['input-form-panel'];
        // Save
        try {
          localStorage.setItem('layout_panel_positions', JSON.stringify(saved));
          console.log('[Layout Migration 2] Completed');
        } catch (e) {
          console.warn('[Layout Migration 2] Save failed:', e);
        }
      }

      // 确保所有必需的面板都存在，缺失的使用默认�?
      const result = { ...DEFAULT_LAYOUT };
      Object.keys(DEFAULT_LAYOUT).forEach(panelId => {
        if (saved[panelId] && isValid(saved[panelId])) {
          result[panelId] = saved[panelId];
        }
      });

      return result;
    }

    // 没有保存的配置，使用默认布局
    console.log('[Panel Init] 使用默认布局，DEFAULT_LAYOUT:', DEFAULT_LAYOUT);
    const defaultCopy = { ...DEFAULT_LAYOUT };
    console.log('[Panel Init] 返回的配�?', defaultCopy);
    return defaultCopy;
  }); // 面板位置和大�?

  // 工作台容器大小（编辑模式下可调整�?
  const [layoutSize, setLayoutSize] = useState({ width: 1800, height: 1200 });

  // 内容块位置（编辑模式下可调整�?
  const DEFAULT_CONTENT_BLOCKS = {
    'input-form-panel': { left: 10, top: 10, width: 560, height: 400 },

    'document-list-panel': { left: 10, top: 10, width: 560, height: 300 },
    'document-replay-ui': { left: 10, top: 320, width: 560, height: 46 }, // New default position
    // 'preview-panel' content split into textarea and toolbar
    'preview-textarea': { left: 10, top: 10, width: 420, height: 250 },
    'preview-toolbar': { left: 10, top: 270, width: 420, height: 50 },
    'processing-panel': { left: 10, top: 10, width: 1100, height: 800 },
    'operations-panel': { left: 10, top: 10, width: 1100, height: 300 },
  };

  const [contentBlockPositions, setContentBlockPositions] = useState(() => {
    try {
      const stored = localStorage.getItem('layout_content_blocks');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to ensure all panels have entries
        return { ...DEFAULT_CONTENT_BLOCKS, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load content block positions', e);
    }
    return DEFAULT_CONTENT_BLOCKS;
  });

  const [buttonPositions, setButtonPositions] = useState(() => {
    // 初始化按钮位�?
    let cached = loadButtonConfig();

    // 如果没有缓存，使用默认配�?
    if (!cached) {
      return DEFAULT_BUTTON_CONFIG;
    }

    // 配置迁移：从�?面板按钮配置迁移到新5面板配置
    if (cached['input-panel'] && !cached['input-form-panel']) {
      console.log('[Button Migration] 检测到旧版4面板按钮配置，正在迁移到5面板配置...');

      // �?input-panel 的按钮分配给 input-form-panel
      cached['input-form-panel'] = cached['input-panel'] || [];

      // document-list-panel 使用默认配置
      cached['document-list-panel'] = DEFAULT_BUTTON_CONFIG['document-list-panel'] || [];

      // 删除旧面�?
      delete cached['input-panel'];

      console.log('[Button Migration] 迁移完成');
    }

    // 确保所有必需的面板都有按钮配�?
    const result = { ...DEFAULT_BUTTON_CONFIG };
    Object.keys(DEFAULT_BUTTON_CONFIG).forEach(panelId => {
      if (cached[panelId] && Array.isArray(cached[panelId])) {
        result[panelId] = cached[panelId];
      }
    });

    // 强制清理 input-form-panel 中的废弃按钮
    if (result['input-form-panel']) {
      // 保留 upload_file 按钮，移�?import_text
      result['input-form-panel'] = result['input-form-panel'].filter(b =>
        b.id !== 'btn_input_import_text'
      );
    }

    return result;
  });  // 按钮配置状态（全局化）
  const [globalButtons, setGlobalButtons] = useState(() => {
    try {
      // 先尝试加载新格式配置
      const newConfig = localStorage.getItem('global-buttons-config');
      if (newConfig) {
        const parsed = JSON.parse(newConfig);
        if (parsed.activeButtons) {
          console.log('[GlobalButtons] Loaded from new format:', parsed.activeButtons.length, 'buttons');
          // Auto-fix: Ensure '全文大纲抽取' has the correct kind
          const fixedButtons = parsed.activeButtons.map(btn => {
            if (btn.label === '全文大纲抽取' && !btn.kind) {
              console.log('[GlobalButtons] Auto-fixing missing kind for outline_extract button');
              return { ...btn, kind: 'outline_extract' };
            }
            return btn;
          });
          return fixedButtons;
        }
      }

      // 如果没有新格式，尝试迁移旧配�?
      const oldConfig = loadButtonConfig();
      if (oldConfig && Object.keys(oldConfig).length > 0) {
        console.log('[GlobalButtons] Migrating from old format...');
        // 备份旧配�?
        backupConfig(oldConfig, 'app-button-config');
        cleanOldBackups('app-button-config', 3);

        // 迁移到新格式
        const migrated = migrateButtonConfig(oldConfig, panelPositions);
        // 保存新格�?
        localStorage.setItem('global-buttons-config', JSON.stringify(migrated));
        console.log('[GlobalButtons] Migration complete:', migrated.activeButtons.length, 'buttons');
        return migrated.activeButtons;
      }
    } catch (e) {
      console.warn('[GlobalButtons] Failed to load config:', e);
    }
    return [];
  });

  const [backupGlobalButtons, setBackupGlobalButtons] = useState(() => {
    try {
      const stored = localStorage.getItem('global_buttons_backup');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }); // 备份状态，用于恢复

  const [deletedButtons, setDeletedButtons] = useState(() => {
    try {
      const stored = localStorage.getItem('deleted_buttons_config');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  // 面板删除状�?
  const [deletedBlocks, setDeletedBlocks] = useState(() => {
    try {
      const stored = localStorage.getItem('layout_deleted_blocks');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  // 回收站显示状�?
  const [showRecycleBin, setShowRecycleBin] = useState(false);

  // Ensure recyle bin is hidden on edit mode toggle
  useEffect(() => {
    setShowRecycleBin(false);
  }, [isEditingLayout]);

  // Load config from backend
  useEffect(() => {
    api('/api/config/all')
      .then(data => {
        let hasServerData = false;

        if (data.layout && Object.keys(data.layout).length > 0) {
          setPanelPositions(prev => ({ ...prev, ...data.layout }));
          hasServerData = true;
        }
        if (data.buttons && data.buttons.activeButtons) {
          // Auto-fix: Ensure '全文大纲抽取' has the correct kind
          const fixedButtons = data.buttons.activeButtons.map(btn => {
            if (btn.label === '全文大纲抽取' && !btn.kind) {
              console.log('[GlobalButtons] Auto-fixing missing kind for outline_extract button (backend)');
              return { ...btn, kind: 'outline_extract' };
            }
            return btn;
          });

          // Auto-restore 'upload_file' button if missing
          if (!fixedButtons.some(b => b.id === 'btn_input_upload_file')) {
            console.log('[GlobalButtons] Restoring missing upload_file button');
            fixedButtons.push({
              id: 'btn_input_upload_file',
              kind: 'upload_file',
              label: '上传文件',
              x: 136,
              y: 408,
              width: 100,
              height: 36,
              enabled: true
            });
          }

          setGlobalButtons(fixedButtons);
          hasServerData = true;
        }
        if (data.contentBlocks && Object.keys(data.contentBlocks).length > 0) {
          setContentBlockPositions(prev => ({ ...prev, ...data.contentBlocks }));
          hasServerData = true;
        }
        if (data.deletedBlocks && Array.isArray(data.deletedBlocks)) {
          setDeletedBlocks(data.deletedBlocks);
          hasServerData = true;
        }

        console.log('Loaded config from backend, hasServerData:', hasServerData);

        // If server has no data, but we have local data (which is already loaded into state via useState initializers),
        // we should sync it UP to the server to persist "previous adjustments".
        if (!hasServerData) {
          console.log('Server config empty, syncing local config to server...');
          // We can use the current state values, but since this runs on mount, the state *is* the local storage value.
          // However, we need to be careful about closure staleness.
          // Inside useEffect [] dependency, state variables might be initial values.
          // But since we use functional updates for setters, we need the actual values to save.
          // Actually, we can read from localStorage directly for the integrity of the data stream.

          const localLayout = localStorage.getItem('layout_panel_positions');
          const localButtons = localStorage.getItem('global-buttons-config'); // New format
          const localBlocks = localStorage.getItem('layout_content_blocks');
          const localDeleted = localStorage.getItem('layout_deleted_blocks');

          if (localLayout || localButtons || localBlocks) {
            const payload = {
              layout: localLayout ? JSON.parse(localLayout) : panelPositions,
              buttons: localButtons ? { activeButtons: JSON.parse(localButtons).activeButtons } : { activeButtons: globalButtons },
              contentBlocks: localBlocks ? JSON.parse(localBlocks) : contentBlockPositions,
              deletedBlocks: localDeleted ? JSON.parse(localDeleted) : deletedBlocks
            };

            api('/api/config/save', {
              method: 'POST',
              body: payload
            }).then(() => console.log('Synced local config to server'));
          }
        }
      })
      .catch(e => console.warn('Failed to load backend config, using local storage', e));
  }, []);

  // 保留原有 buttonPositions 以兼�?(但不再使�?
  const [savedLayout, setSavedLayout] = useState(null);
  const [savedButtons, setSavedButtons] = useState(null);
  const [savedContentBlocks, setSavedContentBlocks] = useState(null);
  const [editingButtonId, setEditingButtonId] = useState(null); // 正在编辑的按�?ID
  const [editingTitleId, setEditingTitleId] = useState(null); // 正在编辑的标�?Panel ID
  const [draggingButton, setDraggingButton] = useState(null); // 正在拖动的按钮信�?
  const [depositSections, setDepositSections] = useState([]); // 当前沉淀�?section 列表
  const [deposits, setDeposits] = useState(() => loadDepositsFromStorage()); // 已沉淀的记�?
  const [depositSeq, setDepositSeq] = useState(() => loadDepositsSeqFromStorage());
  const [selectedDepositIds, setSelectedDepositIds] = useState({}); // depositId -> bool
  const [depositEditing, setDepositEditing] = useState({}); // key -> draft text
  const [expandedDepositSections, setExpandedDepositSections] = useState({}); // depositId -> {sectionId: bool}
  const [batchReplayRunning, setBatchReplayRunning] = useState(false);

  // 主标题配置状�?
  const [headerTitles, setHeaderTitles] = useState(() => {
    try {
      const stored = localStorage.getItem('workbench_header_titles');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed to load header titles', e);
    }
    return {
      eyebrow: {
        text: 'Agentic Workflow',
        style: {},
        position: { left: 0, top: 0 },
        width: 200,
        height: 30
      },
      title: {
        text: 'SOP工作台',
        style: {},
        position: { left: 0, top: 24 },
        width: 200,
        height: 40
      },
    };
  });
  const [editingHeaderTitle, setEditingHeaderTitle] = useState(null); // 'eyebrow' | 'title' | null
  const [draggingHeaderTitle, setDraggingHeaderTitle] = useState(null); // 正在拖动的标�?
  const [resizingHeaderTitle, setResizingHeaderTitle] = useState(null); // 正在调整大小的标�?

  // 获取面板标题（支持自定义标题�?
  const getPanelTitle = (panelId) => {
    const defaultTitles = {
      'input-form-panel': '输入素材',
      'document-list-panel': '文档列表',
      'processing-panel': '文档处理',
      'preview-panel': '内容预览',
      'operations-panel': '操作调度',
    };
    return panelPositions[panelId]?.customTitle || defaultTitles[panelId] || panelId;
  };

  const uploadInputRef = useRef(null);
  const inputFormRef = useRef(null);
  const dispatchInputRef = useRef(null);
  const previewTextRef = useRef(null);

  // Guardian: Ensure 'outline_extract' button exists and is enabled
  useEffect(() => {
    if (loading) return;
    const hasExtract = globalButtons.find((b) => b.kind === 'outline_extract');
    let shouldUpdate = false;
    let newButtons = [...globalButtons];

    if (!hasExtract) {
      console.log('Guardian: Restoring missing outline_extract button');
      const defaultExtract = defaultLlmButtons().find((b) => b.kind === 'outline_extract');
      if (defaultExtract) {
        const newBtn = {
          ...defaultExtract,
          id: `btn_guardian_${Date.now()}`,
          enabled: true,
        };
        newButtons = [newBtn, ...newButtons];
        shouldUpdate = true;
      }
    } else if (hasExtract.enabled === false) {
      // Force enable
      newButtons = newButtons.map(b => b.id === hasExtract.id ? { ...b, enabled: true } : b);
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      setGlobalButtons(newButtons);
      localStorage.setItem('global-buttons-config', JSON.stringify({ activeButtons: newButtons }));
    }
  }, [globalButtons, loading]);
  const [previewSelection, setPreviewSelection] = useState({ text: '', start: 0, end: 0 });
  const [replayState, setReplayState] = useState({}); // depositId -> {running, bySection:{[sectionId]:{status,message}}}
  const [replayDirHandle, setReplayDirHandle] = useState(null);
  const [replayDirName, setReplayDirName] = useState('');

  const showRecords = processingTab === 'records';
  const showConfig = processingTab === 'config';

  const [llmButtons, setLlmButtons] = useState(() => loadLlmButtonsFromStorage());
  const [buttonDraft, setButtonDraft] = useState(null);

  const dispatchButtonCfg = llmButtons.find((b) => b.kind === 'dispatch');
  const finalGenerateCfg = llmButtons.find((b) => b.kind === 'final_generate');
  const outlineSlotButtons = llmButtons.filter((b) => b.kind === 'outline_action').slice(0, 3);
  const selectedOutlineIds = Object.keys(selectedOutlineExec || {}).filter((id) => selectedOutlineExec[id]);
  const hasPreviewSelection = (previewSelection.text || '').toString().trim().length > 0;
  const canFillSummary = showOutlineMode && processingTab === 'outline' && selectedOutlineIds.length > 0 && hasPreviewSelection;

  const deepClone = (obj) => {
    try {
      return structuredClone(obj);
    } catch (_) {
      return JSON.parse(JSON.stringify(obj));
    }
  };

  const appendReplayMeta = (text, meta) => {
    try {
      const payload = JSON.stringify(meta || {});
      return `${(text || '').toString()}\n\n${REPLAY_META_MARKER}\n${payload}`;
    } catch (_) {
      return (text || '').toString();
    }
  };

  const extractReplayMeta = (content) => {
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

  const OP_META_VERSION = 1;

  const clipText = (text, max = 600) => {
    const raw = (text ?? '').toString();
    if (raw.length <= max) return raw;
    return `${raw.slice(0, max)}...`;
  };

  const describeInput = (input) => {
    if (!input) return '';
    if (typeof input === 'string') return input;
    if (typeof input !== 'object') return String(input);
    const kind = (input.kind || '').toString();
    if (kind === 'manual_text') return `粘贴文本（长度：${input.length ?? 0}）`;
    if (kind === 'upload_file') return `上传文件（文档：${input.docName || ''}，长度：${input.length ?? 0}）`;
    if (kind === 'doc_preview') return `内容预览（文档：${input.docName || ''}，长度：${input.length ?? 0}）`;
    if (kind === 'doc_resource') return `资源列表（文档：${input.docName || ''}，长度：${input.length ?? 0}）`;
    if (kind === 'selection')
      return `框选文本（文档�?{input.docName || ''}，区间：${input.start ?? 0}-${input.end ?? 0}，长度：${input.length ?? 0}）`;
    if (kind === 'outline_selected')
      return `已勾选标题（数量�?{Array.isArray(input.sectionIds) ? input.sectionIds.length : input.count ?? 0}）`;
    if (kind === 'doc_link_pick')
      return `大纲标题文档选择（标题：${input.sectionId || ''}，文档：${input.docName || ''}）`;
    return kind ? `${kind}` : JSON.stringify(input);
  };

  const describeDestination = (dest) => {
    if (!dest) return '';
    if (typeof dest === 'string') return dest;
    if (typeof dest !== 'object') return String(dest);
    const kind = (dest.kind || '').toString();
    if (kind === 'docs_list') return '资源列表（文档资源）';
    if (kind === 'outline_apply') return `文档处理/大纲模式（应用模板：${dest.count ?? 0}条）`;
    if (kind === 'outline_section_summary') return `文档处理/大纲模式/摘要（标题：${dest.sectionId || ''}）`;
    if (kind === 'outline_section_summary_batch')
      return `文档处理/大纲模式/摘要（批量：${dest.count ?? (Array.isArray(dest.sectionIds) ? dest.sectionIds.length : 0)}条）`;
    if (kind === 'outline_section_title') return `文档处理/大纲模式/标题（标题：${dest.sectionId || ''}）`;
    if (kind === 'outline_section_docs') return `文档处理/大纲模式/添加文档（标题：${dest.sectionId || ''}）`;
    if (kind === 'dispatch_result') return '文档处理/处理结果';
    if (kind === 'dispatch_apply') return `文档处理/大纲模式（覆盖摘要：${dest.count ?? 0}条）`;
    if (kind === 'final_preview') return '最终文档预览（新窗口）';
    return kind ? `${kind}` : JSON.stringify(dest);
  };

  const formatOpContent = (meta, extraLines = []) => {
    const m = meta && typeof meta === 'object' ? meta : {};
    const inputs = Array.isArray(m.inputs) ? m.inputs : [];
    const destinations = Array.isArray(m.destinations) ? m.destinations : [];
    const lines = [];
    if (inputs.length) lines.push(`输入�?{inputs.map(describeInput).filter(Boolean).join('�?)}`);
    if (m.process) lines.push(`动作�?{(m.process || '').toString()}`);
    if (m.outputs?.summary) lines.push(`输出�?{(m.outputs.summary || '').toString()}`);
    else if (m.outputs && Object.keys(m.outputs || {}).length) lines.push(`输出�?{clipText(JSON.stringify(m.outputs), 240)}`);
    if (destinations.length) lines.push(`记录位置�?{destinations.map(describeDestination).filter(Boolean).join('�?)}`);
    if (Array.isArray(extraLines) && extraLines.length) {
      lines.push('');
      lines.push(...extraLines.filter(Boolean));
    }
    return lines.join('\n').trim();
  };

  const logSectionWithMeta = (action, meta, extraLines) => {
    const safeMeta = {
      v: OP_META_VERSION,
      ts: Date.now(),
      ...(meta || {}),
      inputs: Array.isArray(meta?.inputs) ? meta.inputs : [],
      destinations: Array.isArray(meta?.destinations) ? meta.destinations : [],
      outputs:
        meta?.outputs && typeof meta.outputs === 'object'
          ? {
            ...meta.outputs,
            detailExcerpt: meta.outputs.detailExcerpt ? clipText(meta.outputs.detailExcerpt, 600) : undefined,
            textExcerpt: meta.outputs.textExcerpt ? clipText(meta.outputs.textExcerpt, 600) : undefined,
          }
          : meta?.outputs,
      context: { ...(meta?.context || {}), sceneId: scene?.id || null },
    };
    const content = formatOpContent(safeMeta, extraLines);
    logSection(action, appendReplayMeta(content, safeMeta));
  };

  const pickReplayDirectory = async () => {
    try {
      if (!window.showDirectoryPicker) {
        showToast('当前浏览器不支持目录选择（建议使用 Chrome/Edge）');
        return;
      }
      const handle = await window.showDirectoryPicker();
      await idbSet(REPLAY_DIR_HANDLE_KEY, handle);
      setReplayDirHandle(handle);
      setReplayDirName(handle.name || '已选择目录');
      try {
        await navigator.storage?.persist?.();
      } catch (_) {
        /* ignore */
      }
      showToast('已设置回放目录');
    } catch (err) {
      if (err?.name === 'AbortError') return;
      console.error(err);
      showToast(err.message || '选择目录失败');
    }
  };

  const clearReplayDirectory = async () => {
    try {
      await idbDel(REPLAY_DIR_HANDLE_KEY);
    } catch (_) {
      /* ignore */
    }
    setReplayDirHandle(null);
    setReplayDirName('');
    showToast('已清除回放目录');
  };

  const ensureDirPermission = async (handle) => {
    if (!handle) return false;
    if (!handle.queryPermission) return true;
    try {
      const opts = { mode: 'read' };
      let perm = await handle.queryPermission(opts);
      if (perm === 'granted') return true;
      perm = await handle.requestPermission(opts);
      return perm === 'granted';
    } catch (_) {
      return false;
    }
  };

  const uploadDocFromReplayDirByNameDetailed = async (docName) => {
    const name = (docName || '').toString().trim();
    if (!name) throw new Error('文档名为空');
    if (!replayDirHandle) throw new Error('未设置回放目录：请先选择包含该文件的目录');
    const ok = await ensureDirPermission(replayDirHandle);
    if (!ok) throw new Error('目录权限未授权');
    let fileHandle;
    try {
      fileHandle = await replayDirHandle.getFileHandle(name, { create: false });
    } catch (_) {
      throw new Error(`回放目录中未找到文件：${name}`);
    }
    const file = await fileHandle.getFile();
    const isDocx = isDocxName(name);
    const text = isDocx ? await parseDocxFileToStructuredText(file) : await file.text();
    const res = await api('/api/docs', { method: 'POST', body: { name, content: (text ?? '').toString() } });
    const doc = res?.doc;
    const overwritten = !!res?.overwritten;
    setDocs((prev) => upsertDocsToFront(prev, [doc]));
    setSelectedDocId(doc.id);
    setDocDraft(doc.content || '');
    if (scene) {
      try {
        const docIds = Array.from(new Set([doc.id, ...(scene.docIds || [])]));
        const { scene: s } = await api(`/api/scene/${scene.id}`, { method: 'PATCH', body: { docIds } });
        setScene(s);
      } catch (_) {
        /* ignore */
      }
    }
    return { doc, overwritten, text };
  };

  const uploadDocFromReplayDirByName = async (docName) => {
    const res = await uploadDocFromReplayDirByNameDetailed(docName);
    return res.doc;
  };

  const normalizeDocSelector = (selector) => {
    const s = selector && typeof selector === 'object' ? selector : {};
    const kind = s.kind === 'regex' ? 'regex' : 'keywords';
    const mode = s.mode === 'multi' ? 'multi' : 'single';
    const pick = s.pick === 'first' ? 'first' : 'newest';
    const extension = (s.extension || '').toString().trim();
    const keywords = Array.isArray(s.keywords) ? s.keywords.map((k) => (k || '').toString()).filter(Boolean) : [];
    const pattern = (s.pattern || '').toString();
    const flags = (s.flags || 'i').toString() || 'i';
    const description = (s.description || '').toString();
    return { kind, mode, pick, extension, keywords, pattern, flags, description };
  };

  const matchFileNameBySelector = (name, selector) => {
    const s = normalizeDocSelector(selector);
    const rawName = (name || '').toString();
    if (!rawName) return false;
    const lowered = rawName.toLowerCase();
    if (s.extension && !lowered.endsWith(s.extension.toLowerCase())) return false;
    if (s.kind === 'regex') {
      if (!s.pattern.trim()) return false;
      try {
        const re = new RegExp(s.pattern, s.flags || 'i');
        return re.test(rawName);
      } catch (_) {
        return false;
      }
    }
    if (!s.keywords.length) return true;
    return s.keywords.every((k) => lowered.includes((k || '').toString().toLowerCase()));
  };

  const listReplayDirFiles = async () => {
    if (!replayDirHandle) throw new Error('未设置回放目录：请先选择目录');
    const ok = await ensureDirPermission(replayDirHandle);
    if (!ok) throw new Error('目录权限未授权');
    const out = [];
    // eslint-disable-next-line no-restricted-syntax
    for await (const handle of replayDirHandle.values()) {
      if (handle?.kind !== 'file') continue;
      out.push(handle);
    }
    return out;
  };

  const uploadDocsFromReplayDirBySelector = async (selector) => {
    const s = normalizeDocSelector(selector);
    const handles = await listReplayDirFiles();
    const matched = handles.filter((h) => matchFileNameBySelector(h?.name || '', s));
    if (!matched.length) {
      const desc = s.description ? `（${s.description}）` : '';
      const hint =
        s.kind === 'regex'
          ? `regex=${s.pattern || '(空)'}`
          : `keywords=${(s.keywords || []).join('、') || '(空)'}${s.extension ? ` ext=${s.extension}` : ''}`;
      throw new Error(`回放目录未找到匹配文件${desc}：${hint}`);
    }

    let chosen = matched;
    if (s.mode !== 'multi') {
      if (s.pick === 'first') {
        const sorted = matched.slice().sort((a, b) => (a?.name || '').localeCompare(b?.name || '', 'zh-CN'));
        chosen = sorted[0] ? [sorted[0]] : [matched[0]];
      } else {
        const items = [];
        // eslint-disable-next-line no-restricted-syntax
        for (const h of matched) {
          // eslint-disable-next-line no-await-in-loop
          const f = await h.getFile();
          items.push({ handle: h, lastModified: Number(f?.lastModified || 0) });
        }
        items.sort((a, b) => b.lastModified - a.lastModified || (a.handle?.name || '').localeCompare(b.handle?.name || '', 'zh-CN'));
        chosen = items[0]?.handle ? [items[0].handle] : [matched[0]];
      }
    } else {
      chosen = matched.sort((a, b) => (a?.name || '').localeCompare(b?.name || '', 'zh-CN'));
    }

    const results = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const h of chosen) {
      // eslint-disable-next-line no-await-in-loop
      const r = await uploadDocFromReplayDirByNameDetailed(h.name);
      results.push({ name: h.name, overwritten: !!r.overwritten });
    }
    return { count: results.length, names: results.map((r) => r.name), overwrittenAny: results.some((r) => r.overwritten) };
  };

  const runOutlineExtractButton = async ({ btn, preferDocName }) => {
    if (!scene?.id) throw new Error('scene 未初始化，无法抽取大纲');
    const io = normalizeIoRows(btn?.io, { dataSource: btn?.dataSource, outputTarget: btn?.outputTarget });
    const enabledRows = io.filter((r) => r.enabled);
    if (!enabledRows.some((r) => r.output === 'titles')) {
      throw new Error('按钮配置缺少“输出=标题”的规则');
    }

    let doc = null;
    if (preferDocName) {
      const id = findDocIdByName(preferDocName);
      if (id) doc = docs.find((d) => d.id === id);
      else if (replayDirHandle) doc = await uploadDocFromReplayDirByName(preferDocName);
    }
    if (!doc) doc = docs.find((d) => d.id === selectedDocId) || null;
    if (!doc) throw new Error('请先选择一个文档作为数据源');

    const previewText =
      doc?.id && doc.id === selectedDocId && (docDraft || '').toString().trim()
        ? docDraft
        : (doc.content || '').toString();
    const sources = Array.from(new Set(enabledRows.map((r) => r.dataSource)));
    const parts = sources.map((src) => {
      if (src === 'selected_doc') return `【资源列表选中文档】\n${doc.content || ''}`.trim();
      return `【内容预览】\n${previewText}`.trim();
    });
    const text = `${doc.name || '文档'}\n\n${parts.join('\n\n---\n\n')}`.trim();
    if (!text.trim()) throw new Error('当前数据源内容为空，无法抽取大纲');

    const tplRes = await api('/api/template/auto', { method: 'POST', body: { text, prompt: btn?.prompt || '' } });
    if (!tplRes?.template) throw new Error('提纲生成失败：缺少template');
    if (tplRes?.usedModel === false) {
      if (tplRes?.blocked) {
        showToast('内容触发安全审核，已降级为规则抽取大纲');
      } else {
        throw new Error('未配置QWEN_API_KEY，未调用大模型（请在 `server.js` 配置环境变量后重试）');
      }
    }

    const hasSummaryToSummary = enabledRows.some((r) => r.output === 'summaries' && r.target === 'summary');
    const hasSummaryToTitle = enabledRows.some((r) => r.output === 'summaries' && r.target === 'title');
    const hasTitleToSummary = enabledRows.some((r) => r.output === 'titles' && r.target === 'summary');

    const transformedTemplate = {
      ...tplRes.template,
      sections: (tplRes.template?.sections || []).map((s) => {
        const modelTitle = (s?.title || '').toString();
        const modelSummary = (s?.summary || '').toString().trim();
        const title = hasSummaryToTitle && modelSummary ? `${modelTitle} - ${modelSummary}` : modelTitle;

        const summaryParts = [];
        if (hasTitleToSummary && modelTitle) summaryParts.push(modelTitle);
        if (hasSummaryToSummary && modelSummary) summaryParts.push(modelSummary);
        const summary = summaryParts.join('\n').trim();

        return { ...s, title, summary };
      }),
    };

    const applyRes = await api(`/api/scene/${scene.id}/apply-template`, { method: 'POST', body: { template: transformedTemplate } });
    setTemplate(applyRes.template);
    setScene(applyRes.scene);
    setShowOutlineMode(true);
    return applyRes?.template?.sections?.length || 0;
  };

  useEffect(() => {
    try {
      localStorage.setItem(LLM_BUTTONS_STORAGE_KEY, JSON.stringify(llmButtons));
    } catch (_) {
      /* ignore */
    }
  }, [llmButtons]);

  useEffect(() => {
    (async () => {
      try {
        const handle = await idbGet(REPLAY_DIR_HANDLE_KEY);
        if (handle) {
          setReplayDirHandle(handle);
          setReplayDirName(handle.name || '已选择目录');
        }
      } catch (_) {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(DEPOSITS_STORAGE_KEY, JSON.stringify(deposits));
      localStorage.setItem(DEPOSITS_SEQ_STORAGE_KEY, String(depositSeq || 0));
    } catch (_) {
      /* ignore */
    }
  }, [deposits, depositSeq]);

  useEffect(() => {
    if ((depositSeq || 0) > 0) return;
    if (!deposits.length) return;
    const max = deposits.reduce((acc, d) => {
      const m = /_(\d+)$/.exec(d?.id || '');
      const n = m ? Number(m[1]) : 0;
      return Number.isFinite(n) && n > acc ? n : acc;
    }, 0);
    if (max > 0) setDepositSeq(max);
  }, [depositSeq, deposits]);

  useEffect(() => {
    const init = async () => {
      try {
        // 加载后端的布局配置
        const layoutRes = await api('/api/layout');
        if (layoutRes?.layout) {
          setPanelPositions(layoutRes.layout);
          setSavedLayout(layoutRes.layout);
        }
      } catch (err) {
        console.error('加载布局失败:', err);
        // 降级到localStorage
        const cached = loadLayoutConfig();
        if (cached) {
          setPanelPositions(cached);
          setSavedLayout(cached);
        }
      }

      try {
        // 加载后端的按钮配置
        const buttonsRes = await api('/api/buttons');
        if (buttonsRes?.buttons && validateButtonConfig(buttonsRes.buttons)) {
          setButtonPositions(buttonsRes.buttons);
          setSavedButtons(buttonsRes.buttons);
        }
      } catch (err) {
        console.error('加载按钮配置失败:', err);
        // 降级到localStorage
        const cached = loadButtonConfig();
        if (cached) {
          setButtonPositions(cached);
          setSavedButtons(cached);
        }
      }

      const tplRes = await api('/api/template');
      setTemplate(tplRes.template);
      const sceneRes = await api('/api/scene', { method: 'POST', body: { docIds: [] } });
      setScene(sceneRes.scene);
      setSectionDocLinks(sceneRes.scene.sectionDocLinks || {});
      const docRes = await api('/api/docs');
      setDocs(docRes.docs || []);
      if ((docRes.docs || []).length) setSelectedDocId(docRes.docs[0].id);
    };
    init().catch((err) => showToast(err.message));
  }, []);

  useEffect(() => {
    if (scene?.sectionDocLinks) {
      setSectionDocLinks(scene.sectionDocLinks);
    }
  }, [scene]);

  useEffect(() => {
    const doc = docs.find((d) => d.id === selectedDocId);
    setDocDraft(doc?.content || '');
    setPreviewSelection({ text: '', start: 0, end: 0 });
  }, [selectedDocId, docs]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 1800);
  };

  const startEditLlmButton = (btn) => {
    setEditingButtonId(btn.id);
    setButtonDraft({
      ...btn,
      io: normalizeIoRows(btn?.io, { dataSource: btn?.dataSource, outputTarget: btn?.outputTarget }),
    });
  };

  const cancelEditLlmButton = () => {
    setEditingButtonId(null);
    setButtonDraft(null);
  };

  const addIoRuleToDraft = () => {
    setButtonDraft((prev) => {
      if (!prev) return prev;
      const io = normalizeIoRows(prev?.io, { dataSource: prev?.dataSource, outputTarget: prev?.outputTarget });
      const nextRule = {
        id: `io_${Date.now()}_${io.length + 1}`,
        enabled: true,
        dataSource: 'preview',
        output: 'summaries',
        target: 'summary',
      };
      return { ...prev, io: [...io, nextRule] };
    });
  };

  const updateIoRuleInDraft = (ruleId, patch) => {
    setButtonDraft((prev) => {
      if (!prev) return prev;
      const io = normalizeIoRows(prev?.io, { dataSource: prev?.dataSource, outputTarget: prev?.outputTarget });
      return {
        ...prev,
        io: io.map((r) => (r.id === ruleId ? { ...r, ...patch } : r)),
      };
    });
  };

  const deleteIoRuleFromDraft = (ruleId) => {
    setButtonDraft((prev) => {
      if (!prev) return prev;
      const io = normalizeIoRows(prev?.io, { dataSource: prev?.dataSource, outputTarget: prev?.outputTarget });
      const nextIo = io.filter((r) => r.id !== ruleId);
      return { ...prev, io: nextIo.length ? nextIo : io };
    });
  };

  const [isOptimizingPrompt, setIsOptimizingPrompt] = useState(false);

  const optimizePromptDraft = async () => {
    if (!buttonDraft) return;
    const prompt = (buttonDraft.prompt || '').toString();
    if (!prompt.trim()) {
      showToast('提示词为空，无需优化');
      return;
    }
    setIsOptimizingPrompt(true);
    try {
      const res = await api('/api/prompt/optimize', { method: 'POST', body: { prompt } });
      const nextPrompt = (res?.prompt || '').toString();
      if (!nextPrompt.trim()) {
        showToast('优化返回为空');
        return;
      }
      setButtonDraft((prev) => (prev ? { ...prev, prompt: nextPrompt } : prev));
      showToast('提示词已自动优化');
    } catch (err) {
      console.error(err);
      showToast(err?.message || '提示词优化失败');
    } finally {
      setIsOptimizingPrompt(false);
    }
  };

  const saveLlmButtonDraft = () => {
    if (!buttonDraft?.id) return;
    const io = normalizeIoRows(buttonDraft?.io, {
      dataSource: buttonDraft?.dataSource,
      outputTarget: buttonDraft?.outputTarget,
    });
    const enabledRows = io.filter((r) => r.enabled);
    if (buttonDraft?.kind === 'outline_extract' && !enabledRows.some((r) => r.output === 'titles')) {
      showToast('请至少保留一条“输出=标题”的规则');
      return;
    }
    const next = {
      ...buttonDraft,
      label: (buttonDraft.label || '').toString().trim(),
      enabled: !!buttonDraft.enabled,
      prompt: (buttonDraft.prompt || '').toString(),
      io,
    };
    setLlmButtons((prev) => prev.map((b) => (b.id === next.id ? next : b)));
    cancelEditLlmButton();
    showToast('按钮配置已保存');
  };

  const addLlmButton = () => {
    const id = `btn_${Date.now()}`;
    const next = {
      id,
      kind: 'outline_extract',
      label: '新按钮',
      enabled: true,
      prompt: DEFAULT_OUTLINE_BUTTON_PROMPT,
      io: [
        { id: `io_${Date.now()}_1`, enabled: true, dataSource: 'preview', output: 'titles', target: 'title' },
        { id: `io_${Date.now()}_2`, enabled: true, dataSource: 'preview', output: 'summaries', target: 'summary' },
      ],
    };
    setLlmButtons((prev) => [...prev, next]);
    startEditLlmButton(next);
  };

  const deleteLlmButton = (id) => {
    const btn = llmButtons.find((b) => b.id === id);
    if (!btn) return;
    if (btn.kind === 'outline_action') {
      showToast('预留按钮不可删除');
      return;
    }
    const ok = window.confirm(`确定删除按钮「${btn.label}」吗？`);
    if (!ok) return;
    setLlmButtons((prev) => prev.filter((b) => b.id !== id));
    if (editingButtonId === id) cancelEditLlmButton();
  };

  const handleDeleteBlock = (blockId) => {
    const newDeleted = [...deletedBlocks, blockId];
    // 去重
    const uniqueDeleted = [...new Set(newDeleted)];
    setDeletedBlocks(uniqueDeleted);
    localStorage.setItem('layout_deleted_blocks', JSON.stringify(uniqueDeleted));
  };

  const handleRestoreBlock = (blockId) => {
    const newDeleted = deletedBlocks.filter(id => id !== blockId);
    setDeletedBlocks(newDeleted);
    localStorage.setItem('layout_deleted_blocks', JSON.stringify(newDeleted));
  };

  const handlePermanentDeleteBlock = (blockId) => {
    if (confirm('确定要永久删除这个面板吗？此操作无法撤销。')) {
      const newDeleted = deletedBlocks.filter(id => id !== blockId);
      setDeletedBlocks(newDeleted);
      localStorage.setItem('layout_deleted_blocks', JSON.stringify(newDeleted));
    }
  };

  const toggleLlmButtonEnabled = (id, enabled) => {
    setLlmButtons((prev) => prev.map((b) => (b.id === id ? { ...b, enabled: !!enabled } : b)));
  };

  const logSection = (action, content) => {
    if (!isDepositing) return;
    setDepositSections((prev) => [
      ...prev,
      { id: `sec_${Date.now()}_${prev.length + 1}`, action, content },
    ]);
  };

  const startDeposit = () => {
    setIsDepositing(true);
    setDepositSections([]);
    showToast('开始沉淀');
  };

  const endDeposit = () => {
    if (!isDepositing) return;
    const nextSeq = (depositSeq || 0) + 1;
    const depositId = `沉淀_${nextSeq}`;
    setDepositSeq(nextSeq);
    setDeposits((prev) => [
      ...prev,
      { id: depositId, name: depositId, createdAt: Date.now(), sections: depositSections },
    ]);
    setIsDepositing(false);
    setDepositSections([]);
    showToast('沉淀已记录');
  };

  // 主标题拖动处理
  const handleHeaderTitleMouseDown = (e, titleKey) => {
    if (!isEditingLayout) return;
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startPos = headerTitles[titleKey].position || { left: 0, top: 0 };

    setDraggingHeaderTitle({ titleKey, startX, startY, startPos });
  };

  // 监听标题拖动
  useEffect(() => {
    if (!draggingHeaderTitle) return;

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - draggingHeaderTitle.startX;
      const deltaY = e.clientY - draggingHeaderTitle.startY;

      setHeaderTitles(prev => ({
        ...prev,
        [draggingHeaderTitle.titleKey]: {
          ...prev[draggingHeaderTitle.titleKey],
          position: {
            left: draggingHeaderTitle.startPos.left + deltaX,
            top: draggingHeaderTitle.startPos.top + deltaY,
          }
        }
      }));
    };

    const handleMouseUp = () => {
      setDraggingHeaderTitle(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingHeaderTitle]);

  // 主标题调整大小处理
  const handleHeaderTitleResizeMouseDown = (e, titleKey, direction) => {
    if (!isEditingLayout) return;
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startSize = {
      width: headerTitles[titleKey].width || 200,
      height: headerTitles[titleKey].height || 30
    };

    setResizingHeaderTitle({ titleKey, startX, startY, startSize, direction });
  };

  // 监听标题大小调整
  useEffect(() => {
    if (!resizingHeaderTitle) return;

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - resizingHeaderTitle.startX;
      const deltaY = e.clientY - resizingHeaderTitle.startY;

      setHeaderTitles(prev => {
        const newWidth = Math.max(50, resizingHeaderTitle.startSize.width + deltaX);
        const newHeight = Math.max(20, resizingHeaderTitle.startSize.height + deltaY);

        return {
          ...prev,
          [resizingHeaderTitle.titleKey]: {
            ...prev[resizingHeaderTitle.titleKey],
            width: newWidth,
            height: newHeight
          }
        };
      });
    };

    const handleMouseUp = () => {
      setResizingHeaderTitle(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingHeaderTitle]);

  // 监听全局按钮拖动和调整大小
  useEffect(() => {
    if (!draggingButton) return;

    const handleMouseMove = (e) => {
      // 计算鼠标在视口中的移动距离
      const deltaX = e.clientX - draggingButton.startX;
      const deltaY = e.clientY - draggingButton.startY;

      if (draggingButton.action === 'move') {
        // 移动按钮 - 直接使用delta，因为按钮坐标已经是相对于容器的
        updateGlobalButton(draggingButton.buttonId, {
          x: draggingButton.startPos.x + deltaX,
          y: draggingButton.startPos.y + deltaY
        });
      } else if (draggingButton.action === 'resize') {
        // 调整大小
        const newWidth = Math.max(50, draggingButton.startSize.width + deltaX);
        const newHeight = Math.max(20, draggingButton.startSize.height + deltaY);

        updateGlobalButton(draggingButton.buttonId, {
          width: newWidth,
          height: newHeight
        });
      }
    };

    const handleMouseUp = () => {
      setDraggingButton(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingButton, globalButtons]);

  // 监听 headerTitles 变化并自动保存到 localStorage
  useEffect(() => {
    // 只在标题配置有效时保存（避免保存初始空状态）
    if (headerTitles && (headerTitles.eyebrow || headerTitles.title)) {
      localStorage.setItem('workbench_header_titles', JSON.stringify(headerTitles));
      console.log('[HeaderTitles] Auto-saved to localStorage:', headerTitles);
    }
  }, [headerTitles]);

  const handleStartEditingLayout = () => {
    // Save current state for cancel
    setSavedLayout(JSON.parse(JSON.stringify(panelPositions)));
    setSavedButtons(JSON.parse(JSON.stringify(buttonPositions)));
    setSavedContentBlocks(JSON.parse(JSON.stringify(contentBlockPositions)));
    setIsEditingLayout(true);
  };

  const applySavedLayout = () => {
    if (savedLayout) {
      setPanelPositions(JSON.parse(JSON.stringify(savedLayout)));
    }
    if (savedButtons) {
      setButtonPositions(JSON.parse(JSON.stringify(savedButtons)));
    }
    if (savedContentBlocks) {
      setContentBlockPositions(JSON.parse(JSON.stringify(savedContentBlocks)));
    }
  };

  const handleCancelLayoutEdit = () => {
    applySavedLayout();
    setIsEditingLayout(false);
    showToast('已取消编辑');
  };

  const handleCompleteLayoutEdit = () => {
    // 乐观更新：立即退出编辑模式，无需等待后端响应
    setIsEditingLayout(false);

    // 异步保存到后端
    (async () => {
      try {
        await Promise.all([
          api('/api/layout', {
            method: 'POST',
            body: { layout: panelPositions },
          }),
          api('/api/buttons', {
            method: 'POST',
            body: { buttons: buttonPositions },
          })
        ]);
        // 保存到localStorage
        saveLayoutConfig(panelPositions);
        saveButtonConfig(buttonPositions);
        localStorage.setItem('layout_content_blocks', JSON.stringify(contentBlockPositions));
        localStorage.setItem('workbench_header_titles', JSON.stringify(headerTitles));

        // 保存全局按钮配置
        const globalConfig = {
          activeButtons: globalButtons,
          deletedButtons: deletedButtons,
          version: '2.0',
          savedAt: Date.now()
        };
        localStorage.setItem('global-buttons-config', JSON.stringify(globalConfig));
        console.log('[Save] Saved global buttons config:', globalButtons.length, 'active buttons');

        setSavedLayout(panelPositions);
        setSavedButtons(buttonPositions);
        setSavedContentBlocks(contentBlockPositions);
        setEditingHeaderTitle(null);
        showToast('新布局已保存');
      } catch (err) {
        console.error('后端保存失败:', err);
        // 后端失败也保存到 localStorage
        saveLayoutConfig(panelPositions);
        saveButtonConfig(buttonPositions);
        localStorage.setItem('layout_content_blocks', JSON.stringify(contentBlockPositions));
        localStorage.setItem('workbench_header_titles', JSON.stringify(headerTitles));

        // 保存全局按钮配置
        const globalConfig = {
          activeButtons: globalButtons,
          deletedButtons: deletedButtons,
          version: '2.0',
          savedAt: Date.now()
        };
        localStorage.setItem('global-buttons-config', JSON.stringify(globalConfig));

        setSavedLayout(panelPositions);
        setSavedButtons(buttonPositions);
        setSavedContentBlocks(contentBlockPositions);
        setEditingHeaderTitle(null);
        showToast('⚠️ 已保存到本地（同步后端失败）');
      }
    })();
  };

  const handleResetLayout = () => {
    applySavedLayout();
    showToast('已恢复到默认布局');
  };

  // ========== 按钮拖动和调整大小处理 ==========
  const handleButtonMouseDown = (e, panelId, buttonId, dragType = 'move') => {
    if (!isEditingLayout) return;

    const button = buttonPositions[panelId]?.find(b => b.id === buttonId);
    if (!button) return;

    const startX = e.clientX;
    const startY = e.clientY;

    setDraggingButton({
      panelId,
      buttonId,
      dragType,
      startX,
      startY,
      originalLeft: button.left,
      originalTop: button.top,
      originalWidth: button.width,
      originalHeight: button.height,
    });

    e.preventDefault();
  };



  const toggleDepositSelected = (depositId, checked) => {
    setSelectedDepositIds((prev) => {
      const next = { ...prev };
      if (checked) next[depositId] = true;
      else delete next[depositId];
      return next;
    });
  };

  const clearDepositSelection = () => setSelectedDepositIds({});

  const selectAllDeposits = () => {
    setSelectedDepositIds(() => {
      const next = {};
      deposits.forEach((d) => {
        next[d.id] = true;
      });
      return next;
    });
  };

  const deleteDepositsByIds = (ids) => {
    const list = Array.from(new Set((ids || []).filter(Boolean)));
    if (!list.length) return;
    const ok = window.confirm(`确定删除选中的沉淀（${list.length} 条）吗？`);
    if (!ok) return;
    setDeposits((prev) => prev.filter((d) => !list.includes(d.id)));
    setExpandedLogs((prev) => {
      const next = { ...prev };
      list.forEach((id) => delete next[id]);
      return next;
    });
    setExpandedDepositSections((prev) => {
      const next = { ...prev };
      list.forEach((id) => delete next[id]);
      return next;
    });
    setSelectedDepositIds((prev) => {
      const next = { ...prev };
      list.forEach((id) => delete next[id]);
      return next;
    });
    showToast('已删除沉淀');
  };

  const deleteSelectedDeposits = () => deleteDepositsByIds(Object.keys(selectedDepositIds || {}).filter((k) => selectedDepositIds[k]));

  const startEditDeposit = (depositId, field, value) => {
    setDepositEditing((prev) => ({ ...prev, [`${depositId}||${field}`]: (value ?? '').toString() }));
  };

  const cancelEditDeposit = (depositId, field) => {
    setDepositEditing((prev) => {
      const next = { ...prev };
      delete next[`${depositId}||${field}`];
      return next;
    });
  };

  const applyDepositName = (depositId) => {
    const key = `${depositId}||name`;
    const value = (depositEditing[key] ?? '').toString().trim();
    setDeposits((prev) => prev.map((d) => (d.id === depositId ? { ...d, name: value || d.id } : d)));
    cancelEditDeposit(depositId, 'name');
    showToast('已更新沉淀名称');
  };

  const addDeposit = () => {
    const nextSeq = (depositSeq || 0) + 1;
    const depositId = `沉淀_${nextSeq}`;
    setDepositSeq(nextSeq);
    const next = { id: depositId, name: depositId, createdAt: Date.now(), sections: [] };
    setDeposits((prev) => [...prev, next]);
    setExpandedLogs((prev) => ({ ...prev, [depositId]: true }));
    startEditDeposit(depositId, 'name', depositId);
  };

  const addDepositSection = (depositId) => {
    const newSec = {
      id: `dsec_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      action: '新步骤',
      content: '',
    };
    setDeposits((prev) =>
      prev.map((d) => (d.id === depositId ? { ...d, sections: [...(d.sections || []), newSec] } : d))
    );
    startEditDeposit(depositId, `${newSec.id}||action`, newSec.action);
    startEditDeposit(depositId, `${newSec.id}||content`, newSec.content);
  };

  const deleteDepositSection = (depositId, sectionId) => {
    setDeposits((prev) =>
      prev.map((d) =>
        d.id === depositId ? { ...d, sections: (d.sections || []).filter((s) => s.id !== sectionId) } : d
      )
    );
    setExpandedDepositSections((prev) => {
      const next = { ...prev };
      if (next[depositId]) {
        next[depositId] = { ...(next[depositId] || {}) };
        delete next[depositId][sectionId];
      }
      return next;
    });
    cancelEditDeposit(depositId, `${sectionId}||action`);
    cancelEditDeposit(depositId, `${sectionId}||content`);
    showToast('已删除 section');
  };

  const applyDepositSectionField = (depositId, sectionId, field) => {
    const key = `${depositId}||${sectionId}||${field}`;
    const value = (depositEditing[key] ?? '').toString();
    setDeposits((prev) =>
      prev.map((d) => {
        if (d.id !== depositId) return d;
        const nextSections = (d.sections || []).map((s) => (s.id === sectionId ? { ...s, [field]: value } : s));
        return { ...d, sections: nextSections };
      })
    );
    cancelEditDeposit(depositId, `${sectionId}||${field}`);
  };

  const startEditDepositSection = (depositId, section) => {
    setExpandedDepositSections((prev) => ({
      ...prev,
      [depositId]: { ...(prev?.[depositId] || {}), [section.id]: true },
    }));
    startEditDeposit(depositId, `${section.id}||action`, section?.action || '');
    startEditDeposit(depositId, `${section.id}||content`, section?.content || '');
  };

  const flexEditUploadDepositSection = async (depositId, section) => {
    try {
      const meta = extractReplayMeta(section?.content || '') || {};
      const currentDesc = (meta?.docSelector?.description || '').toString();
      const input = window.prompt(
        '请输入上传文件的自然语言匹配描述（示例：上传所有包含“网安总队”和“2024日”的 .txt 文件）',
        currentDesc
      );
      if (input === null) return;
      const description = input.toString().trim();
      if (!description) {
        showToast('描述不能为空');
        return;
      }

      const res = await api('/api/replay/file-selector', {
        method: 'POST',
        body: { description, exampleName: (meta?.docName || '').toString() },
      });
      const selector = res?.selector;
      if (!selector || typeof selector !== 'object') {
        showToast('生成文件匹配规则失败');
        return;
      }

      const nextMeta = {
        ...(meta || {}),
        type: 'add_doc',
        source: 'upload',
        docSelector: selector,
      };

      const selectorHint =
        selector.kind === 'regex'
          ? `regex=${(selector.pattern || '').toString()}`
          : `keywords=${Array.isArray(selector.keywords) ? selector.keywords.join('、') : ''}${selector.extension ? ` ext=${selector.extension}` : ''}`;
      const head = `上传文档（灵活上传）：${selector.mode === 'multi' ? '批量匹配' : '单个匹配'}`;
      const body = [`描述：${description}`, `规则：${selectorHint}`].join('\n');
      const nextContent = appendReplayMeta([head, body].join('\n'), nextMeta);

      setDeposits((prev) =>
        prev.map((d) => {
          if (d.id !== depositId) return d;
          const nextSections = (d.sections || []).map((s) => (s.id === section.id ? { ...s, content: nextContent } : s));
          return { ...d, sections: nextSections };
        })
      );
      showToast(res?.usedModel === false ? '已生成规则（未调用大模型）' : '已生成规则');
    } catch (err) {
      console.error(err);
      showToast(err?.message || '灵活上传失败');
    }
  };

  const cancelEditDepositSection = (depositId, sectionId) => {
    cancelEditDeposit(depositId, `${sectionId}||action`);
    cancelEditDeposit(depositId, `${sectionId}||content`);
  };

  const applyDepositSection = (depositId, sectionId) => {
    const actionKey = `${depositId}||${sectionId}||action`;
    const contentKey = `${depositId}||${sectionId}||content`;
    const action = (depositEditing[actionKey] ?? '').toString();
    const content = (depositEditing[contentKey] ?? '').toString();
    setDeposits((prev) =>
      prev.map((d) => {
        if (d.id !== depositId) return d;
        const nextSections = (d.sections || []).map((s) => (s.id === sectionId ? { ...s, action, content } : s));
        return { ...d, sections: nextSections };
      })
    );
    cancelEditDepositSection(depositId, sectionId);
    showToast('已更新 section');
  };

  const isDepositSectionExpanded = (depositId, sectionId) => {
    const byDep = expandedDepositSections?.[depositId];
    if (!byDep) return true;
    if (byDep[sectionId] === undefined) return true;
    return !!byDep[sectionId];
  };

  const toggleDepositSectionExpanded = (depositId, sectionId) => {
    setExpandedDepositSections((prev) => {
      const current = prev?.[depositId] || {};
      const nextVal = !(current[sectionId] !== false);
      return { ...prev, [depositId]: { ...current, [sectionId]: nextVal } };
    });
  };

  const setAllDepositSectionsExpanded = (depositId, expanded) => {
    const dep = deposits.find((d) => d.id === depositId);
    if (!dep) return;
    const map = {};
    (dep.sections || []).forEach((s) => {
      map[s.id] = !!expanded;
    });
    setExpandedDepositSections((prev) => ({ ...prev, [depositId]: map }));
  };

  const batchReplaySelectedDeposits = async () => {
    const ids = Object.keys(selectedDepositIds || {}).filter((k) => selectedDepositIds[k]);
    if (!ids.length) {
      showToast('请先选择要批量 Replay 的沉淀');
      return;
    }
    if (batchReplayRunning) return;
    setBatchReplayRunning(true);
    try {
      for (const id of ids) {
        // eslint-disable-next-line no-await-in-loop
        await replayDeposit(id);
      }
      showToast('批量 Replay 完成');
    } finally {
      setBatchReplayRunning(false);
    }
  };

  const submitInputForm = async (formTarget) => {
    const formElement = formTarget instanceof HTMLFormElement ? formTarget : inputFormRef.current;
    if (!formElement) return;
    try {
      const form = new FormData(formElement);
      const name = (form.get('name') || '').toString().trim() || '未命名文档';
      const content = (form.get('content') || '').toString();
      if (!content.trim()) {
        showToast('请粘贴文本后再保存');
        return;
      }
      if (typeof content !== 'string') {
        showToast('content 必须为字符串');
        return;
      }
      const createRes = await api('/api/docs', { method: 'POST', body: { name, content } });
      const doc = createRes?.doc;
      setDocs((prev) => upsertDocsToFront(prev, [doc]));
      setSelectedDocId(doc.id);
      logSectionWithMeta('添加文档', {
        type: 'add_doc',
        docName: doc?.name || name,
        source: 'manual',
        overwritten: !!createRes?.overwritten,
        inputs: [{ kind: 'manual_text', length: (content || '').toString().length }],
        process: createRes?.overwritten ? '覆盖同名文档并保存' : '保存新文档',
        outputs: { summary: `已添加文档：${doc?.name || name}${createRes?.overwritten ? '（覆盖同名）' : ''}` },
        destinations: [{ kind: 'docs_list' }],
      });
      if (scene) {
        const docIds = Array.from(new Set([doc.id, ...(scene.docIds || [])]));
        const { scene: s } = await api(`/api/scene/${scene.id}`, {
          method: 'PATCH',
          body: { docIds },
        });
        setScene(s);
      }
      formElement.reset();
      showToast('文档已保存');
    } catch (err) {
      console.error(err);
      showToast(err.message || '保存失败');
    }
  };

  async function handleCreateDoc(event) {
    event.preventDefault();
    await submitInputForm(event.target);
  }

  function extractText(raw) {
    if (!raw) return '';
    if (typeof raw !== 'string') return String(raw);
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === 'string') return parsed;
        if (parsed.detail && typeof parsed.detail === 'string') return parsed.detail;
        if (parsed.content && typeof parsed.content === 'string') return parsed.content;
        if (parsed.summary && typeof parsed.summary === 'string') return parsed.summary;
        const firstStr = Object.values(parsed).find((v) => typeof v === 'string');
        if (firstStr) return firstStr;
      } catch (_) {
        return trimmed;
      }
    }
    return trimmed;
  }

  async function handleFilePick(event) {
    const inputEl = event?.target;
    const files = Array.from(inputEl?.files || []);
    if (!files.length) return;

    const createdDocs = [];
    const failedFiles = [];
    try {
      for (const file of files) {
        try {
          const name = file?.name || '未命名文档';
          const isDocx = isDocxName(name);
          const rawText = isDocx ? await parseDocxFileToStructuredText(file) : await readFileText(file);
          const text = typeof rawText === 'string' ? rawText : String(rawText ?? '');
          const createRes = await api('/api/docs', {
            method: 'POST',
            body: { name, content: text },
          });
          const doc = createRes?.doc;
          createdDocs.push(doc);
          logSectionWithMeta('添加文档', {
            type: 'add_doc',
            docName: doc?.name || name,
            source: 'upload',
            overwritten: !!createRes?.overwritten,
            inputs: [
              {
                kind: 'upload_file',
                docName: doc?.name || name,
                length: text.length,
                format: isDocx ? 'docx' : 'text',
              },
            ],
            process: `${isDocx ? '解析 Word(.docx) 为结构化文本' : ''}${createRes?.overwritten ? '覆盖同名文档并上传' : '上传并保存为新文档'}`,
            outputs: { summary: `已上传文档：${doc?.name || name}${createRes?.overwritten ? '（覆盖同名）' : ''}` },
            destinations: [{ kind: 'docs_list' }],
          });
        } catch (err) {
          console.error(err);
          failedFiles.push({
            name: file?.name || '(unknown)',
            error: err?.message || '读取或保存文件失败',
          });
        }
      }

      const uniqueCreatedDocs = uniqueDocsByIdKeepLast(createdDocs);
      if (uniqueCreatedDocs.length) {
        setDocs((prev) => upsertDocsToFront(prev, uniqueCreatedDocs));
        setSelectedDocId(uniqueCreatedDocs[0].id);
        if (scene) {
          const newIds = uniqueCreatedDocs.map((d) => d.id);
          const docIds = Array.from(new Set([...newIds, ...(scene.docIds || [])]));
          const { scene: s } = await api(`/api/scene/${scene.id}`, {
            method: 'PATCH',
            body: { docIds },
          });
          setScene(s);
        }
      }

      if (uniqueCreatedDocs.length && failedFiles.length) {
        showToast(`已添加${uniqueCreatedDocs.length} 个文档，失败 ${failedFiles.length} 个`);
      } else if (uniqueCreatedDocs.length) {
        showToast(`已添加${uniqueCreatedDocs.length} 个文档`);
      } else {
        const first = failedFiles[0];
        showToast(first?.error ? `读取或保存文件失败：${first.error}` : '读取或保存文件失败');
      }
    } catch (err) {
      console.error(err);
      showToast(err?.message || '读取或保存文件失败');
    } finally {
      if (uploadInputRef.current) uploadInputRef.current.value = '';
    }
  }

  async function getDocIdsForScene() {
    if (!scene) return [];
    let ids = scene.docIds || [];
    if (!ids.length && docs.length) {
      ids = docs.map((d) => d.id);
      const patched = await api(`/api/scene/${scene.id}`, {
        method: 'PATCH',
        body: { docIds: ids },
      });
      setScene(patched.scene);
    }
    return ids;
  }

  async function editSection(sectionId) {
    if (!scene) return;
    const current = scene.sections?.[sectionId]?.content || '';
    const next = window.prompt('编辑本节内容（Markdown/Text）', current);
    if (next === null) return;
    const { scene: s } = await api(`/api/scene/${scene.id}/section/${sectionId}`, {
      method: 'PATCH',
      body: { content: next },
    });
    setScene(s);
    showToast('章节已保存');
  }

  function buildFinalText() {
    if (template && Array.isArray(template.sections)) {
      const parts = template.sections.map(
        (s) => `${s.title || ''}\n${(s.summary || '').trim()}`
      );
      return parts.join('\n\n');
    }
    const slots = Object.keys(finalSlots).length ? finalSlots : {};
    if (!Object.keys(slots).length) return '';
    const lines = [];
    Object.entries(slots).forEach(([key, slot]) => {
      lines.push(key);
      lines.push(slot?.content?.trim() ? slot.content : '（空）');
      lines.push('');
    });
    return lines.join('\n');
  }

  async function openFinalPreview() {
    const text = buildFinalText();
    if (!text.trim()) {
      showToast('暂无可生成的最终文档');
      return;
    }

    const cfg = llmButtons.find((b) => b.kind === 'final_generate');
    let finalText = text;
    let usedModel = null;
    let modelAttempted = false;

    if (cfg?.enabled && (cfg.prompt || '').toString().trim()) {
      setFinalizing(true);
      modelAttempted = true;
      try {
        const res = await api('/api/final/generate', {
          method: 'POST',
          body: { text, systemPrompt: cfg.prompt },
        });
        if (res?.text && typeof res.text === 'string') finalText = res.text;
        usedModel = res?.usedModel !== false;
      } catch (err) {
        console.error(err);
        showToast(err.message || '最终文档生成失败，已使用原始内容预览');
        usedModel = null;
      } finally {
        setFinalizing(false);
      }
    }

    logSectionWithMeta((cfg?.label || '最终文档生成').toString(), {
      type: 'final_generate',
      buttonId: cfg?.id,
      buttonLabel: cfg?.label,
      prompt: cfg?.prompt,
      inputs: [{ kind: 'manual_text', length: text.length }],
      process: modelAttempted ? '调用大模型对汇总内容进行最终文档生成润色' : '使用当前汇总内容生成最终预览（未调用大模型）',
      outputs: { summary: `最终文档已生成（长度：${finalText.length}）${usedModel === false ? '（未调用大模型）' : ''}`, textExcerpt: finalText },
      destinations: [{ kind: 'final_preview' }],
      usedModel,
    });

    const win = window.open('', '_blank');
    if (win) {
      win.document.write('<pre style="white-space: pre-wrap; font-family: inherit; padding:16px;">');
      win.document.write(finalText.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
      win.document.write('</pre>');
      win.document.close();
    } else {
      showToast('无法打开预览窗口');
    }
  }

  async function autoTemplate(buttonConfig) {
    console.log('[autoTemplate] Called with buttonConfig:', buttonConfig);

    let currentScene = scene;
    if (!currentScene) {
      // Auto-create scene if missing
      try {
        const docIds = selectedDocId ? [selectedDocId] : [];
        const res = await api('/api/scene', {
          method: 'POST',
          body: { docIds }
        });
        currentScene = res.scene;
        setScene(currentScene);
        showToast('已自动创建场景');
      } catch (e) {
        console.error('[autoTemplate] Scene creation failed:', e);
        showToast('请先创建或加载场景（自动创建失败）');
        return;
      }
    }

    // Determine configuration:
    // Ensure we use the clicked button's config (Global Button), merging with defaults if IO is missing
    let btnConfig = buttonConfig;

    // If it's a Global Button (likely lacking 'io'), merge with default definition for its kind
    if (btnConfig && !btnConfig.io) {
      const defaults = defaultLlmButtons();
      const defaultMatch = defaults.find(b => b.kind === btnConfig.kind) || defaults[0];

      // Merge: Global overrides Default (label, prompt), but inherits IO
      btnConfig = {
        ...defaultMatch,
        ...btnConfig,
        io: defaultMatch.io // Explicitly use default IO if missing
      };
    }

    if (!btnConfig) {
      btnConfig = defaultLlmButtons()[0];
    }

    // Final button object
    const btn = btnConfig;
    console.log('[autoTemplate] Using resolved config:', btn);

    const doc = docs.find((d) => d.id === selectedDocId);
    if (!doc) {
      console.warn('[autoTemplate] No document selected');
      return showToast('请先在文档资源列表选择一个文档');
    }

    const io = normalizeIoRows(btn?.io, { dataSource: btn?.dataSource, outputTarget: btn?.outputTarget });
    const enabledRows = io.filter((r) => r.enabled);
    if (!enabledRows.some((r) => r.output === 'titles')) {
      showToast('请至少保留一条“输出=标题”的规则');
      return;
    }

    const sources = Array.from(new Set(enabledRows.map((r) => r.dataSource)));
    const parts = sources.map((src) => {
      if (src === 'selected_doc') return `【资源列表选中文档】\n${doc.content || ''}`.trim();
      return `【内容预览】\n${docDraft || ''}`.trim();
    });
    const text = `${doc.name || '文档'}\n\n${parts.join('\n\n---\n\n')}`.trim();
    if (!text.trim()) return showToast('当前数据源内容为空，无法抽取大纲');

    console.log('[autoTemplate] Sending to API, text length:', text.length);
    setLoading(true);
    try {
      const tplRes = await api('/api/template/auto', {
        method: 'POST',
        body: { text, prompt: btn.prompt || '' },
      });

      console.log('[autoTemplate] API response:', tplRes);

      const hasSummaryToSummary = enabledRows.some((r) => r.output === 'summaries' && r.target === 'summary');
      const hasSummaryToTitle = enabledRows.some((r) => r.output === 'summaries' && r.target === 'title');
      const hasTitleToSummary = enabledRows.some((r) => r.output === 'titles' && r.target === 'summary');

      const transformedTemplate = {
        ...tplRes.template,
        sections: (tplRes.template?.sections || []).map((s) => {
          const modelTitle = (s?.title || '').toString();
          const modelSummary = (s?.summary || '').toString().trim();
          const title = hasSummaryToTitle && modelSummary ? `${modelTitle} - ${modelSummary}` : modelTitle;

          const summaryParts = [];
          if (hasTitleToSummary && modelTitle) summaryParts.push(modelTitle);
          if (hasSummaryToSummary && modelSummary) summaryParts.push(modelSummary);
          const summary = summaryParts.join('\n').trim();

          // CRITICAL FIX: Return the transformed section object
          return { ...s, title, summary };
        }),
      };

      const applyRes = await api(`/api/scene/${currentScene.id}/apply-template`, {
        method: 'POST',
        body: { template: transformedTemplate },
      });
      setTemplate(applyRes.template);
      setScene(applyRes.scene);
      setShowOutlineMode(true);
      logSectionWithMeta('全文大纲抽取', {
        type: 'outline_extract',
        buttonId: btn.id,
        buttonLabel: btn.label,
        prompt: btn.prompt,
        io: enabledRows,
        selectedDocName: doc.name,
        inputs: sources.map((src) =>
          src === 'selected_doc'
            ? { kind: 'doc_resource', docName: doc.name, length: (doc.content || '').toString().length }
            : { kind: 'doc_preview', docName: doc.name, length: (docDraft || '').toString().length }
        ),
        process: '对输入文本进行语义理解，抽取 1-3 级标题，并按按钮配置写入标题/摘要',
        outputs: {
          summary: `生成大纲，条目数：${applyRes.template.sections.length}${tplRes?.usedModel === false ? (tplRes?.blocked ? '（内容审核拦截：规则抽取）' : '（未调用大模型）') : ''
            }`,
          sectionsCount: applyRes.template.sections.length,
          usedModel: tplRes?.usedModel !== false,
          sectionsSample: (applyRes.template.sections || []).slice(0, 8).map((s) => ({
            id: s.id,
            level: s.level,
            title: clipText(s.title || '', 80),
            summaryExcerpt: clipText(s.summary || s.hint || '', 120),
          })),
        },
        destinations: [{ kind: 'outline_apply', count: applyRes.template.sections.length }],
      });
      showToast(
        tplRes?.usedModel === false
          ? tplRes?.blocked
            ? '已生成并应用新模板（内容审核拦截：规则抽取）'
            : '已生成并应用新模板（未调用大模型：请配置 QWEN_API_KEY）'
          : '已生成并应用新模板'
      );
    } catch (err) {
      showToast(err.message);
    } finally {
      setLoading(false);
    }
  }

  const clearOutlineTemplate = async () => {
    if (!scene?.id) {
      showToast('scene 未初始化，无法清除大纲');
      return;
    }
    const ok = window.confirm('确定清除当前已抽取的大纲内容吗？（将置空大纲与关联文档）');
    if (!ok) return;
    const prevCount = (template?.sections || []).length;
    setLoading(true);
    try {
      const emptyTpl = { id: 'template_empty', name: '空模板', sections: [] };
      try {
        await api(`/api/scene/${scene.id}`, { method: 'PATCH', body: { sectionDocLinks: {} } });
      } catch (_) {
        /* ignore */
      }
      const res = await api(`/api/scene/${scene.id}/apply-template`, { method: 'POST', body: { template: emptyTpl } });
      if (res?.scene) setScene(res.scene);
      if (res?.template) setTemplate(res.template);
      setSectionDocLinks(res?.scene?.sectionDocLinks || {});
      setSectionDocPick({});
      setSelectedOutlineExec({});
      setSectionDocDone({});
      setSummaryExpanded({});
      setOutlineEditing({});
      logSectionWithMeta('清除大纲', {
        type: 'outline_clear',
        inputs: [{ kind: 'outline_selected', count: prevCount, sectionIds: (template?.sections || []).map((s) => s.id) }],
        process: '清除已抽取的大纲内容，并置空模板/取消所有标题关联文档',
        outputs: { summary: `已清除大纲（原条目数：${prevCount}）`, clearedCount: prevCount },
        destinations: [{ kind: 'outline_apply', count: 0 }],
      });
      showToast('已清除大纲');
    } catch (err) {
      console.error(err);
      showToast(err?.message || '清除失败');
    } finally {
      setLoading(false);
    }
  };

  const runOutlineSlotButton = async (btn) => {
    if (!btn?.enabled) return;
    if (!scene) return;
    if (!template) return;
    const selectedSections = (template.sections || []).filter((sec) => selectedOutlineExec[sec.id]);
    if (!selectedSections.length) {
      showToast('请先勾选要写入的标题');
      return;
    }

    const io = normalizeIoRows(btn?.io, { dataSource: btn?.dataSource, outputTarget: btn?.outputTarget });
    const enabledRows = io.filter((r) => r.enabled);
    const hasToSummary = enabledRows.some((r) => r.output === 'summaries' && r.target === 'summary');
    const hasToTitle = enabledRows.some((r) => r.output === 'summaries' && r.target === 'title');
    if (!hasToSummary && !hasToTitle) {
      showToast('按钮配置缺少“输出=摘要”的规则，无法应用输出');
      return;
    }

    const doc = docs.find((d) => d.id === selectedDocId) || null;
    if (!doc) {
      showToast('请先选择一个文档作为数据源');
      return;
    }
    const previewText =
      doc?.id && doc.id === selectedDocId && (docDraft || '').toString().trim()
        ? docDraft
        : (doc.content || '').toString();
    const sources = Array.from(new Set(enabledRows.map((r) => r.dataSource)));
    const parts = sources.map((src) => {
      if (src === 'selected_doc') return `【资源列表选中文档】\n${doc.content || ''}`.trim();
      return `【内容预览】\n${previewText}`.trim();
    });
    const docContent = `${doc.name || '文档'}\n\n${parts.join('\n\n---\n\n')}`.trim();
    if (!docContent.trim()) {
      showToast('当前数据源内容为空');
      return;
    }

    const instructions = ((btn?.label || '').toString().trim() || '执行').toString();
    const outlineSegments = selectedSections.map((sec, idx) => ({
      sectionId: sec.id,
      field: 'summary',
      label: (sec.title || `标题${idx + 1}`).toString(),
      content: (sec.summary || sec.hint || '').toString(),
    }));

    setLoading(true);
    try {
      const result = await api('/api/dispatch', {
        method: 'POST',
        body: {
          sceneId: scene.id,
          instructions,
          docContent,
          outlineSegments,
          systemPrompt: btn?.prompt,
        },
      });
      if (result?.usedModel === false) {
        throw new Error('未配置QWEN_API_KEY，未调用大模型（请在 `server.js` 配置环境变量后重试）');
      }
      const summary = extractText(result.summary || '') || '已处理';
      const detail = extractText(result.detail || '') || '';

      if (detail.trim()) {
        const ids = selectedSections.map((s) => s.id);
        setTemplate((prev) => {
          if (!prev) return prev;
          const nextSections = prev.sections.map((sec) => {
            if (!ids.includes(sec.id)) return sec;
            return {
              ...sec,
              title: hasToTitle ? detail : sec.title,
              summary: hasToSummary ? detail : sec.summary,
            };
          });
          const nextTpl = { ...prev, sections: nextSections };
          if (scene?.customTemplate) setScene({ ...scene, customTemplate: nextTpl });
          return nextTpl;
        });
      }

      logSectionWithMeta('个性化按钮', {
        type: 'outline_action',
        buttonId: btn?.id,
        buttonLabel: btn?.label,
        prompt: btn?.prompt,
        selectedSectionIds: selectedSections.map((s) => s.id),
        inputs: [
          { kind: 'outline_selected', sectionIds: selectedSections.map((s) => s.id) },
          ...sources.map((src) => ({ kind: src === 'selected_doc' ? 'selected_doc' : 'preview', length: docContent.length })),
        ],
        process: '使用个性化按钮调用大模型对输入进行处理，并按配置应用输出',
        outputs: { summary, detailLength: detail.length },
        destinations: [{ kind: 'outline_section_summary_batch', sectionIds: selectedSections.map((s) => s.id), count: selectedSections.length }],
      });

      showToast(summary);
    } catch (err) {
      console.error(err);
      showToast(err?.message || '执行失败');
    } finally {
      setLoading(false);
    }
  };

  async function runDispatch() {
    if (!scene) return;
    const dispatchCfg = llmButtons.find((b) => b.kind === 'dispatch');
    if (dispatchCfg && !dispatchCfg.enabled) {
      showToast('执行指令按钮已关闭');
      return;
    }
    const instructions = dispatchInputRef.current?.value || '';
    if (!instructions.trim()) {
      showToast('请输入调度指令');
      return;
    }
    if (dispatchInputRef.current) dispatchInputRef.current.value = '';
    logSectionWithMeta('输入指令', {
      type: 'dispatch_input',
      instructions,
      prompt: dispatchCfg?.prompt,
      selectedSectionIds: Object.keys(selectedOutlineExec || {}).filter((id) => selectedOutlineExec[id]),
      inputs: [{ kind: 'manual_text', length: instructions.length }],
      process: '用户输入调度指令（作为后续大模型处理的指令输入）',
      outputs: { summary: `已记录指令：${clipText(instructions, 120)}` },
      destinations: ['文档处理/操作调度'],
    });
    const baseDoc = docs.find((d) => d.id === selectedDocId)?.content || '';
    let docContent = baseDoc;
    let outlineSegments = [];
    const dispatchInputs = [];
    let dispatchInputKind = dispatchMode === 'result' ? 'result' : 'doc';
    let selectedOutlineIdsForDispatch = [];
    let dispatchInputNote = '';
    let historyInputs = null;
    if (showOutlineMode) {
      const selectedSections = (template?.sections || []).filter((sec) => selectedOutlineExec[sec.id]);
      if (!selectedSections.length) {
        showToast('请选择需处理的标题');
        return;
      }
      selectedOutlineIdsForDispatch = selectedSections.map((s) => s.id);
      dispatchInputs.push({ kind: 'outline_selected', sectionIds: selectedOutlineIdsForDispatch });
      const hasTemplate = selectedSections.length > 0;
      if (!hasTemplate) {
        showToast('暂无大纲可处理');
        return;
      }
      let sectionsWithUnprocessed = [];
      let sectionsProcessedOnly = [];
      selectedSections.forEach((sec) => {
        const docIds = sectionDocLinks[sec.id] || [];
        const doneMap = sectionDocDone[sec.id] || {};
        const unprocessed = docIds.filter((id) => !doneMap[id]);
        if (unprocessed.length) {
          sectionsWithUnprocessed.push({ sec, unprocessed });
        } else {
          sectionsProcessedOnly.push(sec);
        }
      });
      if (sectionsWithUnprocessed.length && sectionsProcessedOnly.length) {
        showToast('请选择仅含未处理文档或仅处理摘要的标题，勿混合');
        return;
      }

      if (sectionsWithUnprocessed.length) {
        // 处理未处理文档，内容来自文档 
        dispatchInputKind = 'outline_unprocessed_docs';
        dispatchInputNote = '输入来自：标题下未处理的已添加文档；输出用于覆盖摘要/或按 edits 写回大纲';
        const allDocIds = sectionsWithUnprocessed.flatMap((s) => s.unprocessed);
        const docItems = allDocIds
          .map((id) => docs.find((d) => d.id === id))
          .filter(Boolean);
        if (!docItems.length) {
          showToast('未找到可处理的文档');
          return;
        }
        docItems.forEach((d) => dispatchInputs.push({ kind: 'doc_resource', docName: d.name, length: (d.content || '').toString().length }));
        docContent = docItems
          .map((d, i) => `【文档${i + 1}：${d.name}\n${d.content}`)
          .join('\n\n---\n\n');
        outlineSegments = sectionsWithUnprocessed.map((item, idx) => ({
          sectionId: item.sec.id,
          field: 'summary',
          content: item.sec.summary || item.sec.hint || item.sec.title || '',
          label: `片段${idx + 1}`,
        }));
      } else {
        // 处理摘要文本 
        dispatchInputKind = 'outline_summaries';
        dispatchInputNote = '输入来自：已勾选标题的摘要/提示；输出用于覆盖摘要/或按 edits 写回大纲';
        outlineSegments = selectedSections.map((sec, idx) => ({
          sectionId: sec.id,
          field: 'summary',
          content: sec.summary || sec.hint || sec.title || '',
          label: `片段${idx + 1}`,
        }));
        const labeled = outlineSegments
          .map((seg) => `【${seg.label}：${seg.sectionId}】\n${seg.content}`)
          .join('\n\n');
        docContent = labeled;
      }
    } else if (dispatchMode === 'result') {
      dispatchInputKind = 'result';
      dispatchInputNote = '输入来自：操作调度历史中选择的片段；输出写入处理结果';
      const entries = Object.entries(selectedLogTexts).filter(
        ([, v]) => typeof v === 'string' && v.trim()
      );
      if (!entries.length) {
        showToast('请选择需处理的历史内容');
        return;
      }
      historyInputs = entries.map(([key, text]) => ({
        key,
        length: (text || '').toString().trim().length,
        text: clipText((text || '').toString().trim(), 2200),
      }));
      dispatchInputs.push(`历史片段（${entries.length}段）`);
      const labeled = entries.map(([key, text], idx) => {
        const tag = key.includes('detail') ? '详情' : '摘要/指令';
        return `【片段${idx + 1}：${tag}】\n${text.trim()}`;
      });
      docContent = labeled.join('\n\n');
    } else {
      dispatchInputKind = 'doc';
      dispatchInputNote = '输入来自：资源列表选中文档；输出写入处理结果';
      if (!docContent.trim()) {
        showToast('请选择文档并保证内容非空');
        return;
      }
      const selected = docs.find((d) => d.id === selectedDocId);
      if (selected) dispatchInputs.push({ kind: 'doc_resource', docName: selected.name, length: (selected.content || '').toString().length });
    }
    setDispatchLogs((logs) => [...logs, { role: 'user', text: instructions }]);
    setDispatching(true);
    try {
      const result = await api('/api/dispatch', {
        method: 'POST',
        body: {
          sceneId: scene.id,
          instructions,
          docContent,
          outlineSegments,
          systemPrompt: dispatchCfg?.prompt,
        },
      });
      const usedModel = result?.usedModel !== false;
      const summary = extractText(result.summary || '') || (usedModel ? '模型已处理' : '未调用大模型（占位返回）');
      const detail = extractText(result.detail || '');
      setDispatchLogs((logs) => [...logs, { role: 'system', text: summary, detail }]);
      setProcessedContent(detail || summary);
      setSelectedLogTexts({});
      showToast(summary || '已为你执行');
      if (dispatchInputRef.current) dispatchInputRef.current.value = '';

      let appliedEditsCount = 0;
      // 如果返回了大纲编辑内容，应用到模板上 
      if (Array.isArray(result.edits) && result.edits.length) {
        appliedEditsCount = result.edits.length;
        setTemplate((prev) => {
          if (!prev) return prev;
          const nextSections = prev.sections.map((sec) => {
            const found = result.edits.find((e) => e.sectionId === sec.id);
            if (!found) return sec;
            return {
              ...sec,
              title: found.field === 'title' && found.content ? found.content : sec.title,
              summary: found.field === 'summary' && found.content ? found.content : sec.summary,
            };
          });
          const nextTpl = { ...prev, sections: nextSections };
          if (scene?.customTemplate) {
            setScene({ ...scene, customTemplate: nextTpl });
          }
          return nextTpl;
        });
      }

      let appliedSummaryCount = 0;
      // 若在大纲模式且有 detail，直接覆盖选中标题的摘要
      if (showOutlineMode && detail) {
        const selectedIds = Object.keys(selectedOutlineExec).filter((k) => selectedOutlineExec[k]);
        if (selectedIds.length) {
          appliedSummaryCount = selectedIds.length;
          setTemplate((prev) => {
            if (!prev) return prev;
            const nextSections = prev.sections.map((sec) =>
              selectedIds.includes(sec.id) ? { ...sec, summary: detail } : sec
            );
            const nextTpl = { ...prev, sections: nextSections };
            if (scene?.customTemplate) {
              setScene({ ...scene, customTemplate: nextTpl });
            }
            return nextTpl;
          });
        }
      }

      const destinations = [{ kind: 'dispatch_result' }];
      if (showOutlineMode && appliedSummaryCount) destinations.push({ kind: 'dispatch_apply', count: appliedSummaryCount });
      if (appliedEditsCount) destinations.push(`文档处理/大纲模式（按 edits 写回${appliedEditsCount}处）`);

      logSectionWithMeta('执行指令', {
        type: 'dispatch',
        instructions,
        prompt: dispatchCfg?.prompt,
        inputKind: dispatchInputKind,
        selectedSectionIds: selectedOutlineIdsForDispatch,
        historyInputs,
        inputs: dispatchInputs,
        docContentLength: (docContent || '').toString().length,
        outlineSegmentsMeta: (outlineSegments || []).map((s) => ({
          sectionId: s.sectionId,
          field: s.field,
          label: s.label,
          contentLength: (s.content || '').toString().length,
        })),
        process: `基于用户指令对输入文本进行处理，并输出JSON（summary/detail/edits）${dispatchInputNote}`.trim(),
        outputs: {
          summary,
          usedModel,
          detailExcerpt: detail,
          detailLength: detail.length,
          editsCount: Array.isArray(result.edits) ? result.edits.length : 0,
        },
        destinations,
      });

      // 若处理了文档，标记已处理 
      if (showOutlineMode) {
        const selectedSections = Object.keys(selectedOutlineExec).filter((id) => selectedOutlineExec[id]);
        setSectionDocDone((prev) => {
          const next = { ...prev };
          selectedSections.forEach((sid) => {
            const docsInSection = sectionDocLinks[sid] || [];
            docsInSection.forEach((dId) => {
              if (!next[sid]) next[sid] = {};
              next[sid][dId] = true;
            });
          });
          return next;
        });
      }
    } catch (err) {
      showToast(err.message);
      setDispatchLogs((logs) => [...logs, { role: 'system', text: `执行失败：${err.message}` }]);
    } finally {
      setDispatching(false);
    }
  }

  async function applyProcessedToOutput() {
    if (!scene) return;
    const content = processedContent || '';
    if (!content.trim()) {
      showToast('暂无可写入的处理结果');
      return;
    }
    setFinalSlots({ result: { content } });
    showToast('已生成最终文档');
  }

  async function deleteDoc(id) {
    try {
      await api(`/api/docs/${id}`, { method: 'DELETE' });
      const nextDocs = docs.filter((d) => d.id !== id);
      setDocs(nextDocs);
      setSectionDocLinks((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((secId) => {
          next[secId] = (next[secId] || []).filter((dId) => dId !== id);
          if (!next[secId].length) delete next[secId];
        });
        return next;
      });
      if (scene) {
        const docIds = (scene.docIds || []).filter((dId) => dId !== id);
        const updatedScene = { ...scene, docIds };
        setScene(updatedScene);
      }
      if (selectedDocId === id) {
        setSelectedDocId(nextDocs[0]?.id || null);
      }
      showToast('文档已删除');
    } catch (err) {
      console.error(err);
      showToast(err.message || '删除失败');
    }
  }

  const selectedDoc = docs.find((d) => d.id === selectedDocId);
  const levelLabel = {
    1: '一级标题',
    2: '二级标题',
    3: '三级标题',
    4: '四级标题',
    5: '五级标题',
  };

  const slotsForOutput = Object.keys(finalSlots).length ? finalSlots : {};

  const startEditOutline = (id, field, value) => {
    setOutlineEditing((prev) => ({
      ...prev,
      [`${id}||${field}`]: value ?? '',
    }));
  };

  const addDocToSection = (sectionId) => {
    const pick = sectionDocPick[sectionId] || selectedDocId;
    if (!pick) {
      showToast('请选择要关联的文档');
      return;
    }
    const current = sectionDocLinks[sectionId] || [];
    if (current.includes(pick)) return;
    const nextLinks = { ...sectionDocLinks, [sectionId]: [...current, pick] };
    setSectionDocLinks(nextLinks);
    void persistSectionLinks(nextLinks);
    const sec = (template?.sections || []).find((s) => s.id === sectionId);
    const docName = docs.find((d) => d.id === pick)?.name || pick;
    logSectionWithMeta(
      '关联文档',
      {
        type: 'outline_link_doc',
        sectionId,
        docId: pick,
        docName,
        inputs: [{ kind: 'doc_link_pick', sectionId, docName }],
        process: '将文档关联到大纲标题，供后续复制全文/指令处理等作为数据源',
        outputs: { summary: `已关联文档：${docName}` },
        destinations: [{ kind: 'outline_section_docs', sectionId }],
      },
      [sec ? `标题【${sec.title || ''}】（${Number(sec.level) || 1}级）` : `标题【${sectionId}】`]
    );
  };

  const copyPreviewToSummary = (sectionId, docId) => {
    const pickId = docId || sectionDocPick[sectionId] || selectedDocId;
    const doc = docs.find((d) => d.id === pickId);
    const content =
      pickId && pickId === selectedDocId ? docDraft || doc?.content || '' : doc?.content || '';
    setTemplate((prev) => {
      if (!prev) return prev;
      const nextSections = prev.sections.map((sec) =>
        sec.id === sectionId ? { ...sec, summary: content } : sec
      );
      const nextTpl = { ...prev, sections: nextSections };
      if (scene?.customTemplate) {
        setScene({ ...scene, customTemplate: nextTpl });
      }
      return nextTpl;
    });
    const sec = (template?.sections || []).find((s) => s.id === sectionId);
    const docName = doc?.name || pickId || '';
    logSectionWithMeta(
      '复制全文到摘要',
      {
        type: 'copy_full_to_summary',
        sectionId,
        docId: pickId,
        docName,
        inputs: [
          pickId && pickId === selectedDocId
            ? { kind: 'doc_preview', docName, length: (docDraft || '').toString().length }
            : { kind: 'doc_resource', docName, length: (doc?.content || '').toString().length },
        ],
        process: '将选中文档的全部内容复制到该标题的摘要中（覆盖原摘要）',
        outputs: { summary: `摘要已更新（长度：${(content || '').toString().length}）` },
        destinations: [{ kind: 'outline_section_summary', sectionId }],
      },
      [sec ? `标题【${sec.title || ''}】（${Number(sec.level) || 1}级）` : `标题【${sectionId}】`]
    );
    showToast(content.toString().trim().length ? '已复制全文到摘要' : '全文为空，已清空摘要');
  };

  const removeDocFromSection = (sectionId, docId) => {
    const current = sectionDocLinks[sectionId] || [];
    const nextList = current.filter((d) => d !== docId);
    const next = { ...sectionDocLinks, [sectionId]: nextList };
    if (!nextList.length) delete next[sectionId];
    setSectionDocLinks(next);
    void persistSectionLinks(next);
    setSectionDocDone((prev) => {
      const next = { ...prev };
      if (next[sectionId]) {
        delete next[sectionId][docId];
        if (!Object.keys(next[sectionId]).length) delete next[sectionId];
      }
      return next;
    });
    const sec = (template?.sections || []).find((s) => s.id === sectionId);
    const docName = docs.find((d) => d.id === docId)?.name || docId;
    logSectionWithMeta(
      '取消关联',
      {
        type: 'outline_unlink_doc',
        sectionId,
        docId,
        docName,
        inputs: [{ kind: 'doc_link_pick', sectionId, docName }],
        process: '从大纲标题中移除已关联文档',
        outputs: { summary: `已取消关联文档：${docName}` },
        destinations: [{ kind: 'outline_section_docs', sectionId }],
      },
      [sec ? `标题【${sec.title || ''}】（${Number(sec.level) || 1}级）` : `标题【${sectionId}】`]
    );
  };

  const persistSectionLinks = async (links) => {
    if (!scene) return null;
    try {
      const { scene: s } = await api(`/api/scene/${scene.id}`, {
        method: 'PATCH',
        body: { sectionDocLinks: links },
      });
      setScene(s);
      setSectionDocLinks(s?.sectionDocLinks || {});
      return s;
    } catch (err) {
      console.error(err);
      showToast(err.message || '关联同步失败');
    }
    return null;
  };

  const saveDocDraft = async () => {
    if (!selectedDocId) return;
    try {
      const { doc } = await api(`/api/docs/${selectedDocId}`, {
        method: 'PATCH',
        body: { content: docDraft },
      });
      setDocs((prev) => prev.map((d) => (d.id === doc.id ? doc : d)));
      showToast('文档内容已更新');
    } catch (err) {
      console.error(err);
      showToast(err.message || '更新文档失败');
    }
  };

  const cancelEditOutline = (id, field) => {
    setOutlineEditing((prev) => {
      const next = { ...prev };
      delete next[`${id}||${field}`];
      return next;
    });
  };

  const applyOutlineUpdate = (sectionId, field, value) => {
    const prevSummary = template?.sections.find((s) => s.id === sectionId)?.summary || '';
    const prevTitle = template?.sections.find((s) => s.id === sectionId)?.title || '';
    setTemplate((prev) => {
      if (!prev) return prev;
      const updatedSections = prev.sections.map((s) =>
        s.id === sectionId ? { ...s, [field]: value } : s
      );
      const nextTpl = { ...prev, sections: updatedSections };
      setScene((sc) => {
        if (!sc) return sc;
        if (sc.customTemplate || prev.id === 'template_auto' || prev.id === 'template_empty') {
          return { ...sc, customTemplate: nextTpl };
        }
        return sc;
      });
      return nextTpl;
    });
    cancelEditOutline(sectionId, field);
    if (field === 'summary') {
      const sec = (template?.sections || []).find((s) => s.id === sectionId);
      logSectionWithMeta(
        '编辑摘要',
        {
          type: 'edit_outline_summary',
          sectionId,
          inputs: [{ kind: 'manual_text', length: (value ?? '').toString().length }],
          process: '手动编辑大纲标题下的摘要内容',
          outputs: {
            summary: `摘要已更新（长度：${(prevSummary || '').toString().length} -> ${(value ?? '').toString().length}）`,
            beforeExcerpt: clipText(prevSummary || '', 260),
            afterExcerpt: clipText((value ?? '').toString(), 260),
          },
          destinations: [{ kind: 'outline_section_summary', sectionId }],
        },
        [sec ? `标题【${sec.title || ''}】（${Number(sec.level) || 1}级）` : `标题【${sectionId}】`]
      );
    } else if (field === 'title') {
      const sec = (template?.sections || []).find((s) => s.id === sectionId);
      logSectionWithMeta(
        '编辑标题',
        {
          type: 'edit_outline_title',
          sectionId,
          inputs: [{ kind: 'manual_text', length: (value ?? '').toString().length }],
          process: '手动编辑大纲标题文本',
          outputs: {
            summary: `标题已更新（长度：${(prevTitle || '').toString().length} -> ${(value ?? '').toString().length}）`,
            beforeExcerpt: clipText(prevTitle || '', 160),
            afterExcerpt: clipText((value ?? '').toString(), 160),
          },
          destinations: [{ kind: 'outline_section_title', sectionId }],
        },
        [sec ? `标题【${prevTitle || ''}】 -> ${value || ''}` : `标题【${sectionId}】`]
      );
    }
  };

  const clearOutlineSummary = (sectionId) => {
    const sec = template?.sections.find((s) => s.id === sectionId);
    const prevShown = sec?.summary || sec?.hint || '';
    setTemplate((prev) => {
      if (!prev) return prev;
      const updatedSections = prev.sections.map((s) => (s.id === sectionId ? { ...s, summary: '', hint: '' } : s));
      const nextTpl = { ...prev, sections: updatedSections };
      setScene((sc) => {
        if (!sc) return sc;
        if (sc.customTemplate || prev.id === 'template_auto' || prev.id === 'template_empty') {
          return { ...sc, customTemplate: nextTpl };
        }
        return sc;
      });
      return nextTpl;
    });
    setSummaryExpanded((prev) => ({ ...prev, [sectionId]: false }));
    cancelEditOutline(sectionId, 'summary');
    logSectionWithMeta(
      '删除摘要',
      {
        type: 'clear_outline_summary',
        sectionId,
        inputs: [{ kind: 'outline_selected', sectionIds: [sectionId] }],
        process: '清空该标题下的摘要/提示内容',
        outputs: { summary: `摘要已清空（原长度：${(prevShown || '').toString().length}）`, beforeExcerpt: clipText(prevShown || '', 260) },
        destinations: [{ kind: 'outline_section_summary', sectionId }],
      },
      [sec ? `标题【${sec.title || ''}】（${Number(sec.level) || 1}级）` : `标题【${sectionId}】`]
    );
    showToast('已删除摘要');
  };

  const updateSectionLevel = (sectionId, level) => {
    const lvl = Number(level) || 1;
    setTemplate((prev) => {
      if (!prev) return prev;
      const updatedSections = prev.sections.map((s) =>
        s.id === sectionId ? { ...s, level: Math.max(1, Math.min(3, lvl)) } : s
      );
      const nextTpl = { ...prev, sections: updatedSections };
      setScene((sc) => {
        if (!sc) return sc;
        if (sc.customTemplate || prev.id === 'template_auto' || prev.id === 'template_empty') {
          return { ...sc, customTemplate: nextTpl };
        }
        return sc;
      });
      return nextTpl;
    });
  };

  const updateTemplateSections = (updater) => {
    setTemplate((prev) => {
      if (!prev) return prev;
      const nextSections = updater(prev.sections || []);
      const nextTpl = { ...prev, sections: nextSections };
      setScene((sc) => {
        if (!sc) return sc;
        if (sc.customTemplate || prev.id === 'template_auto' || prev.id === 'template_empty') {
          return { ...sc, customTemplate: nextTpl };
        }
        return sc;
      });
      return nextTpl;
    });
  };

  const addSectionBelow = (afterId) => {
    const newSection = {
      id: `sec_local_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      title: '新标题',
      summary: '',
      hint: '',
      level: 1,
    };
    updateTemplateSections((sections) => {
      if (!sections.length) return [newSection];
      const idx = sections.findIndex((s) => s.id === afterId);
      if (idx === -1) return [...sections, newSection];
      const before = sections.slice(0, idx + 1);
      const after = sections.slice(idx + 1);
      return [...before, newSection, ...after];
    });
  };

  const removeSectionById = (sectionId) => {
    const sections = template?.sections || [];
    const idx = sections.findIndex((s) => s.id === sectionId);
    if (idx === -1) return;
    const baseLevel = Math.max(1, Math.min(3, Number(sections[idx]?.level) || 1));
    const idsToRemove = [sections[idx].id];
    for (let i = idx + 1; i < sections.length; i += 1) {
      const lvl = Math.max(1, Math.min(3, Number(sections[i]?.level) || 1));
      if (lvl <= baseLevel) break;
      idsToRemove.push(sections[i].id);
    }
    const removed = sections.filter((s) => idsToRemove.includes(s.id));

    updateTemplateSections((list) => (list || []).filter((s) => !idsToRemove.includes(s.id)));
    setSectionDocLinks((prev) => {
      const next = { ...prev };
      idsToRemove.forEach((id) => delete next[id]);
      persistSectionLinks(next);
      return next;
    });
    setSectionDocPick((prev) => {
      const next = { ...prev };
      idsToRemove.forEach((id) => delete next[id]);
      return next;
    });
    setSelectedOutlineExec((prev) => {
      const next = { ...prev };
      idsToRemove.forEach((id) => delete next[id]);
      return next;
    });
    setSectionDocDone((prev) => {
      const next = { ...prev };
      idsToRemove.forEach((id) => delete next[id]);
      return next;
    });
    setSummaryExpanded((prev) => {
      const next = { ...prev };
      idsToRemove.forEach((id) => delete next[id]);
      return next;
    });
    setOutlineEditing((prev) => {
      const next = { ...prev };
      idsToRemove.forEach((id) => {
        delete next[`${id}||title`];
        delete next[`${id}||summary`];
      });
      return next;
    });
    const removedRoot = sections[idx];
    logSectionWithMeta(
      '删除标题',
      {
        type: 'delete_outline_section',
        sectionId,
        removedIds: idsToRemove,
        baseLevel,
        inputs: [{ kind: 'outline_selected', sectionIds: [sectionId] }],
        process: `删除${baseLevel}级标题，并级联删除其下所有下级标题`,
        outputs: {
          summary: `已删除标题：${removedRoot?.title || sectionId}（共${idsToRemove.length}条）`,
          removedSample: removed.slice(0, 8).map((s) => ({
            id: s.id,
            level: s.level,
            title: clipText(s.title || '', 80),
          })),
        },
        destinations: ['文档处理/大纲模式'],
      },
      []
    );
  };

  const outlineTree = buildSectionTree(template?.sections || []);

  const updatePreviewSelection = () => {
    const el = previewTextRef.current;
    if (!el) return;
    const start = Number(el.selectionStart ?? 0);
    const end = Number(el.selectionEnd ?? 0);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      setPreviewSelection({ text: '', start: 0, end: 0 });
      return;
    }
    const text = (el.value || '').slice(start, end);
    if (!text.toString().trim()) {
      setPreviewSelection({ text: '', start: 0, end: 0 });
      return;
    }
    setPreviewSelection({ text, start, end });
  };

  const getPreviewSelectionFromDom = () => {
    const el = previewTextRef.current;
    if (!el) return null;
    const start = Number(el.selectionStart ?? 0);
    const end = Number(el.selectionEnd ?? 0);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
    const text = (el.value || '').slice(start, end);
    if (!text.toString().trim()) return null;
    return { text, start, end };
  };

  const insertSelectionToCheckedSummaries = async () => {
    const domSel = getPreviewSelectionFromDom();
    const snippet = (domSel?.text ?? previewSelection.text ?? '').toString();
    const snippetTrimmed = snippet.trim();
    if (!snippetTrimmed) {
      showToast('请先在内容预览中框选文档');
      return;
    }
    if (!showOutlineMode || processingTab !== 'outline') {
      showToast('请先切换到大纲模式并勾选要写入的标题');
      return;
    }
    const ids = Object.keys(selectedOutlineExec || {}).filter((id) => selectedOutlineExec[id]);
    if (!ids.length) {
      showToast('请先在大纲模式勾选要写入的标题');
      return;
    }

    const doc = docs.find((d) => d.id === selectedDocId);
    const docName = doc?.name || '（未选择文档）';
    const selectedSections = (template?.sections || []).filter((s) => ids.includes(s.id));
    const sectionLines = selectedSections.map((s) => {
      const lvl = Number(s.level) || 1;
      const prefix = levelLabel[lvl] || levelLabel[1] || '标题';
      return `- ${prefix}：${(s.title || '').toString()}`;
    });

    const overwriteIds = [];
    const emptyBeforeIds = [];
    selectedSections.forEach((s) => {
      if ((s?.summary || '').toString().trim().length) overwriteIds.push(s.id);
      else emptyBeforeIds.push(s.id);
    });

    const nextTpl = (() => {
      const prevTpl = template;
      if (!prevTpl || !Array.isArray(prevTpl.sections)) return null;
      const nextSections = (prevTpl.sections || []).map((s) => {
        if (!ids.includes(s.id)) return s;
        return { ...s, summary: snippetTrimmed };
      });
      return { ...prevTpl, sections: nextSections };
    })();

    if (nextTpl) {
      setTemplate(nextTpl);
      setScene((sc) => (sc ? { ...sc, customTemplate: nextTpl } : sc));
      if (scene?.id) {
        try {
          const res = await api(`/api/scene/${scene.id}/apply-template`, {
            method: 'POST',
            body: { template: nextTpl },
          });
          if (res?.template) setTemplate(res.template);
          if (res?.scene) setScene(res.scene);
        } catch (err) {
          console.error(err);
          showToast(err?.message || '填入摘要同步到后端失败（已在本地写入）');
        }
      }
    } else {
      updateTemplateSections((sections) =>
        (sections || []).map((s) => {
          if (!ids.includes(s.id)) return s;
          const prev = (s.summary || '').toString();
          const next = prev.trim() ? `${prev}\n\n${snippetTrimmed}` : snippetTrimmed;
          return { ...s, summary: next };
        })
      );
    }

    logSectionWithMeta(
      '填入摘要',
      {
        type: 'insert_to_summary',
        docName,
        selection: { start: domSel?.start ?? previewSelection.start, end: domSel?.end ?? previewSelection.end },
        targetSectionIds: ids,
        inputs: [
          {
            kind: 'selection',
            docName,
            start: domSel?.start ?? previewSelection.start,
            end: domSel?.end ?? previewSelection.end,
            length: snippetTrimmed.length,
            text: clipText(snippetTrimmed, 1200),
          },
          { kind: 'outline_selected', sectionIds: ids },
        ],
        process: '将内容预览中框选的文本追加到已勾选标题的摘要',
        outputs: {
          summary: `已写入摘要：${ids.length}个标题（覆盖长度：${snippetTrimmed.length}）`,
          insertedExcerpt: clipText(snippetTrimmed, 260),
          overwrite: true,
          overwrittenSectionIds: overwriteIds,
          emptyBeforeSectionIds: emptyBeforeIds,
        },
        destinations: [{ kind: 'outline_section_summary_batch', sectionIds: ids, count: ids.length }],
      },
      ['插入标题：', sectionLines.length ? sectionLines.slice(0, 8).join('\n') : '(无)']
    );

    const endPos = domSel?.end ?? previewSelection.end;
    setPreviewSelection({ text: '', start: 0, end: 0 });
    try {
      previewTextRef.current?.setSelectionRange?.(endPos, endPos);
    } catch (_) {
      /* ignore */
    }
    showToast('已写入摘要');
  };

  const setReplaySectionStatus = (depositId, sectionId, status, message) => {
    setReplayState((prev) => {
      const current = prev[depositId] || { running: false, bySection: {} };
      return {
        ...prev,
        [depositId]: {
          ...current,
          bySection: {
            ...(current.bySection || {}),
            [sectionId]: { status, message: message || '' },
          },
        },
      };
    });
  };

  const captureReplaySnapshot = () =>
    deepClone({
      docs,
      selectedDocId,
      docDraft,
      template,
      scene,
      sectionDocLinks,
      sectionDocPick,
      selectedOutlineExec,
      sectionDocDone,
      dispatchLogs,
      processedContent,
      finalSlots,
      summaryExpanded,
    });

  const restoreReplaySnapshot = async (snap) => {
    if (!snap) return;
    setDocs(snap.docs || []);
    setSelectedDocId(snap.selectedDocId || null);
    setDocDraft(snap.docDraft || '');
    setTemplate(snap.template || null);
    setScene(snap.scene || null);
    setSectionDocLinks(snap.sectionDocLinks || {});
    setSectionDocPick(snap.sectionDocPick || {});
    setSelectedOutlineExec(snap.selectedOutlineExec || {});
    setSectionDocDone(snap.sectionDocDone || {});
    setDispatchLogs(snap.dispatchLogs || []);
    setProcessedContent(snap.processedContent || '');
    setFinalSlots(snap.finalSlots || {});
    setSummaryExpanded(snap.summaryExpanded || {});

    if (snap.scene?.id && snap.template) {
      try {
        if (snap.sectionDocLinks && typeof snap.sectionDocLinks === 'object') {
          await api(`/api/scene/${snap.scene.id}`, { method: 'PATCH', body: { sectionDocLinks: snap.sectionDocLinks } });
        }
        const res = await api(`/api/scene/${snap.scene.id}/apply-template`, {
          method: 'POST',
          body: { template: snap.template },
        });
        setScene(res.scene);
        setTemplate(res.template);
      } catch (_) {
        /* ignore */
      }
    }
  };

  const findDocIdByNameInList = (name, list) => {
    const key = (name || '').toString().trim().toLowerCase();
    if (!key) return null;
    const d = (list || []).find((x) => (x?.name || '').toString().trim().toLowerCase() === key);
    return d?.id || null;
  };

  const findDocIdByName = (name) => findDocIdByNameInList(name, docs);

  const waitUiTick = () => new Promise((r) => setTimeout(r, 0));

  const refreshDocsFromServer = async () => {
    try {
      const res = await api('/api/docs');
      if (Array.isArray(res?.docs)) {
        setDocs(res.docs);
        return res.docs;
      }
    } catch (_) {
      /* ignore */
    }
    return null;
  };

  const refreshSceneFromServer = async (sceneId) => {
    const id = (sceneId || scene?.id || '').toString();
    if (!id) return null;
    try {
      const res = await api(`/api/scene/${id}`);
      const s = res?.scene;
      if (s) {
        setScene(s);
        setSectionDocLinks(s.sectionDocLinks || {});
        if (s.customTemplate) setTemplate(s.customTemplate);
      }
      return s || null;
    } catch (_) {
      return null;
    }
  };

  const getServerTemplate = async (sceneId) => {
    const s = await refreshSceneFromServer(sceneId);
    if (s?.customTemplate) return s.customTemplate;
    try {
      const tplRes = await api('/api/template');
      return tplRes?.template || null;
    } catch (_) {
      return null;
    }
  };

  const applyTemplateToServer = async (tpl) => {
    if (!scene?.id) throw new Error('scene 未初始化');
    if (!tpl || !Array.isArray(tpl.sections)) throw new Error('template 无效');
    const res = await api(`/api/scene/${scene.id}/apply-template`, { method: 'POST', body: { template: tpl } });
    if (res?.scene) setScene(res.scene);
    if (res?.template) setTemplate(res.template);
    if (res?.scene?.sectionDocLinks) setSectionDocLinks(res.scene.sectionDocLinks || {});
    return res?.template || null;
  };

  const assertReplay = (cond, message) => {
    if (!cond) throw new Error(message || 'Replay 校验失败');
  };

  const strictReplayRequired = (meta, action) => {
    if (meta && typeof meta === 'object') return false;
    const a = (action || '').toString();
    if (a === '输入指令') return false;
    if (a === '编辑标题' || a === '编辑摘要' || a === '删除摘要') return false;
    if (a === '最终文档生成') return false;
    return true;
  };

  const replayOneDepositSection = async (deposit, section) => {
    const meta = extractReplayMeta(section?.content || '');
    const action = (section?.action || '').toString();

    if (strictReplayRequired(meta, action)) {
      throw new Error('该 section 缺少回放元数据，无法严格复现；请重新沉淀后再 Replay');
    }

    if (meta?.type === 'dispatch_input' || action === '输入指令') {
      return {
        status: 'pass', message: '输入记录，跳过'
      };
    }

    if (
      meta?.type === 'edit_outline_title' ||
      meta?.type === 'edit_outline_summary' ||
      meta?.type === 'clear_outline_summary' ||
      action === '编辑标题' ||
      action === '编辑摘要' ||
      action === '删除摘要'
    ) {
      return {
        status: 'pass', message: '手动编辑，跳过'
      };
    }

    if (meta?.type === 'add_doc' || action === '添加文档') {
      const docName = meta?.docName || ((section?.content || '').toString().split('：')[1] || '').trim();
      const isUpload = meta?.source === 'upload' || (section?.content || '').toString().includes('上传文档');
      if (isUpload) {
        if (meta?.docSelector && typeof meta.docSelector === 'object') {
          const selector = normalizeDocSelector(meta.docSelector);
          const res = await uploadDocsFromReplayDirBySelector(selector);
          assertReplay(res.count > 0, '未匹配到任何文件，无法复现上传');
          if (selector.mode !== 'multi') assertReplay(res.count === 1, `应上传单个文件，但实际上有 ${res.count} 个`);
          await waitUiTick();
          await refreshDocsFromServer();
          return {
            status: 'done',
            message: `已按规则上传：${res.names.slice(0, 3).join('、')}${res.count > 3 ? ` 等${res.count}个` : ''}`,
          };
        }
        assertReplay(!!docName, '未记录文档名，无法复现上传');
        const expectedOverwritten = typeof meta?.overwritten === 'boolean' ? meta.overwritten : null;

        // 若原沉淀是“覆盖同名文档”，但当前环境不存在同名文档，则先写入一个占位文档以保证覆盖动作可复现
        if (expectedOverwritten === true && !findDocIdByName(docName)) {
          const placeholderRes = await api('/api/docs', { method: 'POST', body: { name: docName, content: '（占位）' } });
          const placeholderDoc = placeholderRes?.doc;
          if (placeholderDoc?.id) {
            setDocs((prev) => upsertDocsToFront(prev, [placeholderDoc]));
            if (scene) {
              try {
                const docIds = Array.from(new Set([placeholderDoc.id, ...(scene.docIds || [])]));
                const { scene: s } = await api(`/api/scene/${scene.id}`, { method: 'PATCH', body: { docIds } });
                setScene(s);
              } catch (_) {
                /* ignore */
              }
            }
          }
          await waitUiTick();
          const list = (await refreshDocsFromServer()) || [];
          assertReplay(!!findDocIdByNameInList(docName, list), `无法创建占位同名文档：${docName}`);
        }

        const { doc, overwritten, text } = await uploadDocFromReplayDirByNameDetailed(docName);
        if (expectedOverwritten !== null) {
          assertReplay(
            overwritten === expectedOverwritten,
            `上传覆盖状态与原沉淀不一致：预期${expectedOverwritten ? '覆盖同名' : '新建'}，现 ${overwritten ? '覆盖同名' : '新建'}`
          );
        }
        assertReplay(!!doc?.id, '上传未返回doc');
        assertReplay((doc?.name || '').toString().trim() === docName.trim(), `上传后文档名不一致：${doc?.name || ''}`);
        assertReplay((doc?.content || '').toString() === (text || '').toString(), '上传后文档内容与文件内容不一致');

        await waitUiTick();
        const list = (await refreshDocsFromServer()) || [];
        const id = findDocIdByNameInList(docName, list);
        assertReplay(!!id, `上传后仍未找到同名文档：${docName}`);
        return { status: 'done', message: `已从目录重传：${docName}${overwritten ? '（覆盖同名）' : ''}` };
      }
      const id = findDocIdByName(docName);
      if (!id) throw new Error(`未找到同名文档：${docName || '(空)'}`);
      setSelectedDocId(id);
      const d = docs.find((x) => x.id === id);
      setDocDraft(d?.content || '');
      await waitUiTick();
      return { status: 'done', message: `已重选文档：${docName}` };
    }

    if (meta?.type === 'outline_extract' || action === '全文大纲抽取') {
      const btnId = meta?.buttonId;
      const btn = (btnId && llmButtons.find((b) => b.id === btnId)) || llmButtons.find((b) => b.kind === 'outline_extract' && b.enabled);
      if (!btn) throw new Error('未找到可用的“全文大纲抽取”按钮配置');
      const prefer = meta?.selectedDocName || meta?.docName;
      if (prefer) {
        const id = findDocIdByName(prefer);
        if (id) {
          const d = docs.find((x) => x.id === id);
          setSelectedDocId(id);
          setDocDraft(d?.content || '');
          await waitUiTick();
        }
      }
      const expectedCount = Number.isFinite(meta?.outputs?.sectionsCount) ? Number(meta.outputs.sectionsCount) : null;
      const count = await runOutlineExtractButton({ btn, preferDocName: meta?.selectedDocName });
      assertReplay(count > 0, '大纲抽取返回 0 条，无法复现');
      if (expectedCount !== null) {
        assertReplay(
          count === expectedCount,
          `大纲抽取条目数与原沉淀不一致：预期${expectedCount}，现 ${count}`
        );
      }
      await refreshSceneFromServer(scene?.id);
      return { status: 'done', message: `已重新执行全文大纲抽取（${count} 条）` };
    }

    if (meta?.type === 'copy_full_to_summary' || action === '复制全文到摘要') {
      const sectionId = meta?.sectionId;
      const docName = meta?.docName;
      if (!sectionId) throw new Error('缺少 sectionId');
      if (!docName) throw new Error('缺少 docName');
      let id = findDocIdByName(docName);
      let doc = id ? docs.find((d) => d.id === id) : null;
      if (!id && replayDirHandle) {
        const uploaded = await uploadDocFromReplayDirByName(docName);
        id = uploaded?.id || null;
        doc = uploaded || null;
      }
      if (!id) throw new Error(`未找到同名文档：${docName}`);
      const content = (doc?.content || '').toString();
      const baseTpl = await getServerTemplate(scene?.id);
      assertReplay(!!baseTpl && Array.isArray(baseTpl.sections), '无法获取模板，无法复现复制全文');
      const target = (baseTpl.sections || []).find((s) => s.id === sectionId);
      assertReplay(!!target, `模板中未找到标题：${sectionId}`);
      const nextTpl = {
        ...baseTpl,
        sections: (baseTpl.sections || []).map((s) => (s.id === sectionId ? { ...s, summary: content } : s)),
      };
      const applied = await applyTemplateToServer(nextTpl);
      const appliedSec = (applied?.sections || []).find((s) => s.id === sectionId);
      assertReplay(!!appliedSec, `应用模板后未找到标题：${sectionId}`);
      assertReplay((appliedSec.summary || '') === content, '复制全文后摘要内容与文档内容不一致');
      await waitUiTick();
      return { status: 'done', message: `已复制全文到摘要：${docName}` };
    }

    if (meta?.type === 'outline_link_doc' || action === '关联文档') {
      const sectionId = meta?.sectionId;
      const docName = meta?.docName;
      if (!sectionId) throw new Error('缺少 sectionId');
      if (!docName) throw new Error('缺少 docName');
      let id = findDocIdByName(docName);
      if (!id && replayDirHandle) {
        const d = await uploadDocFromReplayDirByName(docName);
        id = d?.id || null;
      }
      if (!id) throw new Error(`未找到同名文档：${docName}`);
      const current = sectionDocLinks[sectionId] || [];
      const nextLinks = current.includes(id) ? sectionDocLinks : { ...sectionDocLinks, [sectionId]: [...current, id] };
      setSectionDocLinks(nextLinks);
      setSectionDocPick((prev) => ({ ...prev, [sectionId]: id }));
      await persistSectionLinks(nextLinks);
      const s = await refreshSceneFromServer(scene?.id);
      const serverLinks = s?.sectionDocLinks?.[sectionId] || [];
      assertReplay(serverLinks.includes(id), `后端未成功关联文档：${docName}`);
      await waitUiTick();
      await refreshDocsFromServer();
      return { status: 'done', message: `已关联文档：${docName}` };
    }

    if (meta?.type === 'outline_unlink_doc' || action === '取消关联') {
      const sectionId = meta?.sectionId;
      const docName = meta?.docName;
      if (!sectionId) throw new Error('缺少 sectionId');
      if (!docName) throw new Error('缺少 docName');
      const id = findDocIdByName(docName);
      if (!id) throw new Error(`未找到同名文档：${docName}`);
      const current = sectionDocLinks[sectionId] || [];
      const nextList = current.filter((d) => d !== id);
      const next = { ...sectionDocLinks, [sectionId]: nextList };
      if (!nextList.length) delete next[sectionId];
      setSectionDocLinks(next);
      setSectionDocPick((prev) => {
        const n = { ...prev };
        if (n[sectionId] === id) delete n[sectionId];
        return n;
      });
      await persistSectionLinks(next);
      const s = await refreshSceneFromServer(scene?.id);
      const serverLinks = s?.sectionDocLinks?.[sectionId] || [];
      assertReplay(!serverLinks.includes(id), `后端未成功取消关联文档：${docName}`);
      setSectionDocDone((prev) => {
        const next = { ...prev };
        if (next[sectionId]) {
          delete next[sectionId][id];
          if (!Object.keys(next[sectionId]).length) delete next[sectionId];
        }
        return next;
      });
      await waitUiTick();
      return { status: 'done', message: `已取消关联文档：${docName}` };
    }

    if (meta?.type === 'insert_to_summary' || action === '添入摘要' || action === '填入摘要') {
      const ids = Array.isArray(meta?.targetSectionIds) ? meta.targetSectionIds : [];
      const selectionInput = Array.isArray(meta?.inputs) ? meta.inputs.find((x) => x?.kind === 'selection') : null;
      const text = (selectionInput?.text || selectionInput?.textExcerpt || '').toString().trim();
      if (!ids.length) throw new Error('未记录 targetSectionIds');
      if (!text) throw new Error('未记录框选文本');
      const baseTpl = await getServerTemplate(scene?.id);
      assertReplay(!!baseTpl && Array.isArray(baseTpl.sections), '无法获取模板，无法复现填入摘要');
      ids.forEach((sid) => assertReplay(!!(baseTpl.sections || []).find((s) => s.id === sid), `模板中未找到标题：${sid}`));
      const overwritten = Array.isArray(meta?.outputs?.overwrittenSectionIds) ? meta.outputs.overwrittenSectionIds : [];
      const emptyBefore = Array.isArray(meta?.outputs?.emptyBeforeSectionIds) ? meta.outputs.emptyBeforeSectionIds : [];
      if (overwritten.length || emptyBefore.length) {
        overwritten.forEach((sid) => {
          const sec = (baseTpl.sections || []).find((s) => s.id === sid);
          assertReplay((sec?.summary || '').toString().trim().length > 0, `该标题摘要原本应为非空，但当前为空：${sid}`);
        });
        emptyBefore.forEach((sid) => {
          const sec = (baseTpl.sections || []).find((s) => s.id === sid);
          assertReplay((sec?.summary || '').toString().trim().length === 0, `该标题摘要原本应为空，但当前非空：${sid}`);
        });
      }
      const nextTpl = {
        ...baseTpl,
        sections: (baseTpl.sections || []).map((s) => {
          if (!ids.includes(s.id)) return s;
          return { ...s, summary: text };
        }),
      };
      const applied = await applyTemplateToServer(nextTpl);
      const excerpt = (meta?.outputs?.insertedExcerpt || text).toString().trim();
      ids.forEach((sid) => {
        const sec = (applied?.sections || []).find((s) => s.id === sid);
        assertReplay(!!sec, `应用模板后未找到标题：${sid}`);
        assertReplay((sec.summary || '').toString() === text, `摘要未按“覆盖”写入到标题：${sid}`);
      });
      await waitUiTick();
      return { status: 'done', message: `已写入摘要：${ids.length}个标题` };
    }

    if (meta?.type === 'delete_outline_section' || action === '删除标题') {
      const sectionId = meta?.sectionId;
      if (!sectionId) throw new Error('缺少 sectionId');
      const baseTpl = await getServerTemplate(scene?.id);
      assertReplay(!!baseTpl && Array.isArray(baseTpl.sections), '无法获取模板，无法复现删除标题');
      const sections = baseTpl.sections || [];
      const idx = sections.findIndex((s) => s.id === sectionId);
      assertReplay(idx !== -1, `模板中未找到标题：${sectionId}`);
      const baseLevel = Math.max(1, Math.min(3, Number(sections[idx]?.level) || 1));
      const idsToRemove = [sections[idx].id];
      for (let i = idx + 1; i < sections.length; i += 1) {
        const lvl = Math.max(1, Math.min(3, Number(sections[i]?.level) || 1));
        if (lvl <= baseLevel) break;
        idsToRemove.push(sections[i].id);
      }
      const nextTpl = { ...baseTpl, sections: (sections || []).filter((s) => !idsToRemove.includes(s.id)) };
      const applied = await applyTemplateToServer(nextTpl);
      idsToRemove.forEach((rid) => {
        assertReplay(!(applied?.sections || []).some((s) => s.id === rid), `删除后仍存在标题：${rid}`);
      });
      await waitUiTick();
      return { status: 'done', message: '已删除标题（含下级）' };
    }

    if (meta?.type === 'outline_clear' || action === '清除大纲') {
      assertReplay(!!scene?.id, 'scene 未初始化，无法复现清除大纲');
      await api(`/api/scene/${scene.id}`, { method: 'PATCH', body: { sectionDocLinks: {} } });
      const emptyTpl = {
        id: 'template_empty', name: '空模板', sections: []
      };
      const applied = await applyTemplateToServer(emptyTpl);
      assertReplay(Array.isArray(applied?.sections) && applied.sections.length === 0, '清除后大纲仍非空');
      const s = await refreshSceneFromServer(scene?.id);
      assertReplay(!s?.sectionDocLinks || Object.keys(s.sectionDocLinks || {}).length === 0, '清除后仍存在关联文档');
      setSectionDocPick({});
      setSelectedOutlineExec({});
      setSectionDocDone({});
      setSummaryExpanded({});
      setOutlineEditing({});
      await waitUiTick();
      return {
        status: 'done', message: '已清除大纲'
      };
    }

    if (meta?.type === 'dispatch' || action === '执行指令') {
      if (!scene?.id) throw new Error('scene 未初始化，无法执行调用');
      const instructions =
        meta?.instructions ||
        (() => {
          const m = /指令：([\s\S]*?)(\n|$)/.exec((section?.content || '').toString());
          return (m?.[1] || '').trim();
        })();
      if (!instructions) throw new Error('未解析到指令内容');

      const dispatchCfg = llmButtons.find((b) => b.kind === 'dispatch');
      const systemPrompt = meta?.prompt || dispatchCfg?.prompt;

      const inputKind = (meta?.inputKind || '').toString();
      const outlineIds = Array.isArray(meta?.selectedSectionIds) ? meta.selectedSectionIds : [];
      let docContent = '';
      let outlineSegments = [];

      if (inputKind === 'result' && Array.isArray(meta?.historyInputs) && meta.historyInputs.length) {
        docContent = meta.historyInputs
          .map((h, idx) => `【片段${idx + 1}：${(h?.key || '').toString()}】\n${(h?.text || '').toString()}`)
          .join('\n\n');
      } else if (inputKind.startsWith('outline_')) {
        const picked = (template?.sections || []).filter((s) => outlineIds.includes(s.id));
        outlineSegments = picked.map((sec, idx) => ({
          sectionId: sec.id,
          field: 'summary',
          content: sec.summary || sec.hint || sec.title || '',
          label: `片段${idx + 1}`,
        }));
        if (inputKind === 'outline_unprocessed_docs') {
          const docInputs = Array.isArray(meta?.inputs) ? meta.inputs.filter((x) => x?.kind === 'doc_resource') : [];
          const names = docInputs.map((d) => (d?.docName || '').toString()).filter(Boolean);
          const ensuredDocs = [];
          // eslint-disable-next-line no-restricted-syntax
          for (const name of names) {
            let id = findDocIdByName(name);
            let docObj = id ? docs.find((x) => x.id === id) : null;
            if (!docObj && replayDirHandle) {
              // eslint-disable-next-line no-await-in-loop
              docObj = await uploadDocFromReplayDirByName(name);
              id = docObj?.id || null;
            }
            if (!docObj) throw new Error(`未找到同名文档：${name}`);
            ensuredDocs.push(docObj);
          }
          docContent = ensuredDocs
            .filter(Boolean)
            .map((d, i) => `【文档${i + 1}：${d.name}\n${d.content}`)
            .join('\n\n---\n\n');
        } else {
          docContent = outlineSegments.map((seg) => `【${seg.label}：${seg.sectionId}】\n${seg.content}`).join('\n\n');
        }
      } else {
        const docInputs = Array.isArray(meta?.inputs) ? meta.inputs.filter((x) => x?.kind === 'doc_resource') : [];
        const preferDocName = (docInputs[0]?.docName || meta?.docName || '').toString();
        let id = preferDocName ? findDocIdByName(preferDocName) : selectedDocId;
        let docObj = id ? docs.find((x) => x.id === id) : null;
        if (!id && preferDocName && replayDirHandle) {
          docObj = await uploadDocFromReplayDirByName(preferDocName);
          id = docObj?.id || null;
        }
        if (!docObj) throw new Error(`未找到输入文档：${preferDocName || '(空)'}`);
        docContent = (docObj?.content || '').toString();
      }

      const result = await api('/api/dispatch', {
        method: 'POST',
        body: {
          sceneId: scene?.id,
          instructions,
          docContent,
          outlineSegments,
          systemPrompt,
        },
      });
      if (result?.usedModel === false) {
        throw new Error('未配置QWEN_API_KEY：本次未调用大模型，Replay 失败');
      }

      const detail = extractText(result.detail || '');
      const expectedDetailLen = Number.isFinite(meta?.outputs?.detailLength) ? Number(meta.outputs.detailLength) : null;
      const expectedEditsCount = Number.isFinite(meta?.outputs?.editsCount) ? Number(meta.outputs.editsCount) : null;
      if (expectedDetailLen !== null && expectedDetailLen > 0) {
        assertReplay(detail.toString().trim().length > 0, 'Replay 返回 detail 为空，无法复现原沉淀输出');
      }
      if (expectedEditsCount !== null && expectedEditsCount > 0) {
        assertReplay(Array.isArray(result.edits) && result.edits.length > 0, 'Replay 未返回edits，无法复现原沉淀输出');
      }

      const baseTpl = await getServerTemplate(scene?.id);
      assertReplay(!!baseTpl && Array.isArray(baseTpl.sections), '无法获取模板，无法复现执行指令输出');
      const selectedIds = outlineIds.length ? outlineIds : Object.keys(selectedOutlineExec || {}).filter((k) => selectedOutlineExec[k]);
      const nextTpl = {
        ...baseTpl,
        sections: (baseTpl.sections || []).map((sec) => {
          const found = Array.isArray(result.edits) ? result.edits.find((e) => e.sectionId === sec.id) : null;
          const patched = {
            ...sec,
            title: found?.field === 'title' && found.content ? found.content : sec.title,
            summary: found?.field === 'summary' && found.content ? found.content : sec.summary,
          };
          if (detail && selectedIds.includes(sec.id)) return { ...patched, summary: detail };
          return patched;
        }),
      };
      const applied = await applyTemplateToServer(nextTpl);
      if (selectedIds.length && detail) {
        selectedIds.forEach((sid) => {
          const sec = (applied?.sections || []).find((s) => s.id === sid);
          assertReplay(!!sec, `应用模板后未找到标题：${sid}`);
          assertReplay((sec.summary || '') === detail, `标题摘要未按 Replay 输出覆盖：${sid}`);
        });
      }

      if (selectedIds.length) {
        setSectionDocDone((prev) => {
          const next = { ...prev };
          selectedIds.forEach((sid) => {
            const docsInSection = sectionDocLinks[sid] || [];
            docsInSection.forEach((dId) => {
              if (!next[sid]) next[sid] = {};
              next[sid][dId] = true;
            });
          });
          return next;
        });
      }
      await waitUiTick();
      return {
        status: 'done', message: '已重新执行指令'
      };
    }

    if (meta?.type === 'final_generate' || action === '最终文档生成') {
      return { status: 'pass', message: '最终文档预览跳过（不自动打开新窗口）' };
    }

    // 手动编辑类或无法识别：pass
    return {
      status: 'pass', message: '手动/未知操作，跳过'
    };
  };

  const replayDeposit = async (depositId) => {
    const dep = deposits.find((d) => d.id === depositId);
    if (!dep) return;
    if (replayState?.[depositId]?.running) return;

    setExpandedLogs((prev) => ({ ...prev, [depositId]: true }));
    setReplayState((prev) => ({ ...prev, [depositId]: { running: true, bySection: {} } }));
    showToast('开始Replay');

    for (const s of dep.sections || []) {
      setReplaySectionStatus(depositId, s.id, 'running', '');
      const snap = captureReplaySnapshot();
      try {
        const res = await replayOneDepositSection(dep, s);
        setReplaySectionStatus(depositId, s.id, res.status, res.message || '');
      } catch (err) {
        await restoreReplaySnapshot(snap);
        setReplaySectionStatus(depositId, s.id, 'fail', err?.message || 'Replay 失败');
      }
    }

    setReplayState((prev) => ({ ...prev, [depositId]: { ...(prev?.[depositId] || {}), running: false } }));
    showToast('Replay 完成');
  };

  const renderOutlineNode = (node) => {
    const sec = node.section;
    const level = sec?.level || 1;
    const prefix = levelLabel[level] || levelLabel[1];
    const titleKey = `${sec.id}||title`;
    const summaryKey = `${sec.id}||summary`;
    const editingTitle = outlineEditing[titleKey];
    const editingSummary = outlineEditing[summaryKey];
    const linkedDocIds = sectionDocLinks[sec.id] || [];
    const doneMap = sectionDocDone[sec.id] || {};
    const storedPickDocId = sectionDocPick[sec.id] || '';
    const pickDocId = storedPickDocId || linkedDocIds[linkedDocIds.length - 1] || '';
    const canCopyFullToSummary =
      showOutlineMode &&
      !showRecords &&
      !!pickDocId &&
      (linkedDocIds || []).includes(pickDocId);

    return (
      <div
        key={sec.id}
        className={`section outline-node level-${Number(level) || 1}`}
        style={{ position: 'relative' }}
      >
        <div className="section-head" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <div
            className="section-title"
            style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}
          >
            {editingTitle !== undefined ? (
              <>
                <select
                  value={level}
                  onChange={(e) => updateSectionLevel(sec.id, e.target.value)}
                  className="level-select"
                >
                  <option value="1">一级标题</option>
                  <option value="2">二级标题</option>
                  <option value="3">三级标题</option>
                </select>
                <input
                  value={editingTitle}
                  onChange={(e) => setOutlineEditing((prev) => ({ ...prev, [titleKey]: e.target.value }))}
                  style={{ minWidth: 200 }}
                />
                <button className="ghost small" onClick={() => applyOutlineUpdate(sec.id, 'title', editingTitle)}>
                  保存标题
                </button>
                <button className="ghost small" onClick={() => cancelEditOutline(sec.id, 'title')}>
                  取消
                </button>
              </>
            ) : (
              <>
                <span>{`${prefix}：${sec.title}`}</span>
                <button className="ghost small" onClick={() => startEditOutline(sec.id, 'title', sec.title || '')}>
                  编辑标题
                </button>
              </>
            )}
          </div>
          <div className="section-actions btn-compact">
            <label className="inline-check">
              <input
                type="checkbox"
                checked={!!selectedOutlineExec[sec.id]}
                onChange={(e) => setSelectedOutlineExec((prev) => ({ ...prev, [sec.id]: e.target.checked }))}
              />
            </label>
            <button className="ghost xsmall" type="button" onClick={() => addSectionBelow(sec.id)}>
              加
            </button>
            <button className="ghost xsmall" type="button" onClick={() => removeSectionById(sec.id)}>
              减
            </button>
          </div>
        </div>

        <div className="hint" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {editingSummary !== undefined ? (
            <>
              <textarea
                rows={2}
                value={editingSummary}
                onChange={(e) => setOutlineEditing((prev) => ({ ...prev, [summaryKey]: e.target.value }))}
                style={{ minWidth: 260 }}
              />
              <button className="ghost small" onClick={() => applyOutlineUpdate(sec.id, 'summary', editingSummary)}>
                保存摘要
              </button>
              <button className="ghost small" onClick={() => cancelEditOutline(sec.id, 'summary')}>
                取消
              </button>
            </>
          ) : (
            <>
              <div className={`summary-text ${summaryExpanded[sec.id] ? 'expanded' : ''}`}>
                {sec.summary || sec.hint || '（无摘要）'}
              </div>
              {(sec.summary || sec.hint) && (
                <>
                  <button
                    className="ghost xsmall"
                    type="button"
                    onClick={() => setSummaryExpanded((prev) => ({ ...prev, [sec.id]: !prev[sec.id] }))}
                  >
                    {summaryExpanded[sec.id] ? '收起' : '展开'}
                  </button>
                  <button className="ghost xsmall" type="button" onClick={() => clearOutlineSummary(sec.id)}>
                    删除
                  </button>
                </>
              )}
              <button className="ghost small" onClick={() => startEditOutline(sec.id, 'summary', sec.summary || sec.hint || '')}>
                编辑摘要
              </button>
            </>
          )}
        </div>

        <div className="link-row outline-row docs-row">
          <div className="link-docs">
            {linkedDocIds.length === 0 && <span className="hint">尚未关联文档</span>}
            {linkedDocIds.map((id) => {
              const doc = docs.find((d) => d.id === id);
              const showCopy = canCopyFullToSummary && id === pickDocId;
              return (
                <span key={id} className="doc-inline">
                  <span className={`pill doc-pill ${doneMap[id] ? 'done' : ''}`}>
                    {doc?.name || id}
                    {doneMap[id] && <span className="checkmark">✔</span>}
                    <button
                      type="button"
                      className="pill-close"
                      onClick={() => removeDocFromSection(sec.id, id)}
                      aria-label="移除关联"
                    >
                      ×
                    </button>
                  </span>
                  {showCopy ? (
                    <button
                      className="ghost small"
                      type="button"
                      onClick={() => copyPreviewToSummary(sec.id, pickDocId)}
                    >
                      复制全文
                    </button>
                  ) : null}
                </span>
              );
            })}
          </div>
        </div>

        <div className="link-row outline-row pick-row">
          <div className="link-actions">
            <select
              value={storedPickDocId || ''}
              onChange={(e) => setSectionDocPick((prev) => ({ ...prev, [sec.id]: e.target.value }))}
            >
              <option value="">选择文档</option>
              {docs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <button className="ghost small" type="button" onClick={() => addDocToSection(sec.id)}>
              添加文档
            </button>
          </div>
        </div>

        {node.children?.length ? <div className="outline-children">{node.children.map(renderOutlineNode)}</div> : null}
      </div>
    );
  };

  const EditingToolbar = () =>
    isEditingLayout ? (
      <div
        style={{
          position: 'fixed',
          top: 12,
          right: 12,
          zIndex: 9999,
          display: 'flex',
          gap: 8,
          padding: '8px 12px',
          background: 'rgba(255,255,255,0.9)',
          WebkitBackdropFilter: 'blur(8px)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 12px rgba(15,23,42,0.25)',
          borderRadius: 8,
          border: '1px solid #cbd5e1',
          pointerEvents: 'auto',
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="ghost success" onClick={handleCompleteLayoutEdit} title="保存布局修改">
          完成编辑
        </button>
        <button type="button" className="ghost" onClick={handleCancelLayoutEdit} title="取消编辑，恢复已保存布局">
          取消编辑
        </button>
        <button type="button" className="ghost warning" onClick={handleResetLayout} title="重置为默认布局">
          重置
        </button>
      </div>
    ) : null;

  // 样式编辑
  const handleStyleEdit = (panelId, buttonId) => {
    // 存储为 JSON 字符串以 ID 唯一标识
    setEditingButtonId(JSON.stringify({ panelId, buttonId }));
  };

  // 统一处理工作台按钮点击
  const handleWorkbenchButtonClick = (button) => {
    if (isEditingLayout) return; // 编辑模式下不触发业务逻辑

    console.log('Workbench button clicked:', button.kind, button.label);

    switch (button.kind) {
      // Input Panel
      case 'save':
        handleCreateDoc({ preventDefault: () => { } }); // 模拟表单提交
        break;
      case 'upload':
        uploadInputRef.current?.click();
        break;
      case 'pick_dir':
        pickReplayDirectory();
        break;
      case 'clear_dir':
        clearReplayDirectory();
        break;

      // Preview Panel
      case 'fill_summary':
        // 需确认是否有对应函数，暂只打印
        console.log('Fill summary triggered');
        break;

      // Processing Panel
      case 'tab_outline':
        setProcessingTab('outline');
        break;
      case 'tab_records':
        setProcessingTab('records');
        break;
      case 'tab_config':
        setProcessingTab('config');
        break;
      case 'outline_extract':
        // 查找对应的 llmButton 配置
        const llmBtn = llmButtons.find(b => b.kind === 'outline_extract');
        if (llmBtn) autoTemplate(llmBtn);
        else showToast('未找到抽取配置');
        break;
      case 'clear_outline':
        clearOutlineTemplate();
        break;
      case 'add_button':
        addLlmButton();
        setProcessingTab('config');
        break;

      // Operations Panel
      case 'start_deposit':
        startDeposit();
        break;
      case 'end_deposit':
        endDeposit();
        break;
      case 'dispatch':
        runDispatch();
        break;

      default:
        // 尝试作为通用 LLM 按钮处理 (Slot buttons)
        if (button.kind?.startsWith('slot_') || button.kind === 'custom') {
          // 简化处理：如果有名为 button.id 的 llmButton
          const target = llmButtons.find(b => b.id === button.id) || button;
          // 这里可能需要更精确的查找，或者直接传 button
          // 暂时尝试直接调用
          runOutlineSlotButton(target);
        }
        break;
    }
  };

  // 更新按钮样式
  const handleButtonUpdate = (panelId, buttonId, { style, label }) => {
    console.log('[DEBUG] handleButtonUpdate called:', { panelId, buttonId, style, label });
    setButtonPositions(prev => {
      const panelButtons = prev[panelId] || [];
      const newButtons = panelButtons.map(btn => {
        if (btn.id === buttonId) {
          const updated = { ...btn, style: { ...btn.style, ...style }, label };
          console.log('[DEBUG] Updated button:', updated);
          return updated;
        }
        return btn;
      });
      return { ...prev, [panelId]: newButtons };
    });
  };

  // ===== 全局按钮操作函数 =====

  // 更新全局按钮
  const updateGlobalButton = (buttonId, updates) => {
    console.log('[GlobalButton] Update:', buttonId, updates);
    setGlobalButtons(prev => prev.map(btn =>
      btn.id === buttonId ? { ...btn, ...updates } : btn
    ));
  };

  // 更新全局按钮样式
  const handleGlobalButtonStyleUpdate = (buttonId, { style, label }) => {
    console.log('[GlobalButton] Style update:', buttonId, { style, label });
    setGlobalButtons(prev => prev.map(btn => {
      if (btn.id === buttonId) {
        return {
          ...btn,
          style: style ? { ...btn.style, ...style } : btn.style,
          label: label !== undefined ? label : btn.label
        };
      }
      return btn;
    }));
  };

  // 删除全局按钮（软删除）
  const deleteGlobalButton = (buttonId) => {
    const button = globalButtons.find(btn => btn.id === buttonId);
    if (!button) return;

    console.log('[GlobalButton] Delete (to recycle):', buttonId);

    const deletedButton = { ...button, deletedAt: Date.now() };

    setDeletedButtons(prev => [...prev, deletedButton]);
    setGlobalButtons(prev => prev.filter(btn => btn.id !== buttonId));

    // 保存到localStorage
    setTimeout(() => {
      const deletedConfig = [...deletedButtons, deletedButton];
      localStorage.setItem('deleted-buttons-config', JSON.stringify(deletedConfig));
    }, 0);
  };

  // 恢复已删除的按钮
  const handleRestoreButton = (buttonId) => {
    const button = deletedButtons.find(btn => btn.id === buttonId);
    if (!button) return;

    // 移除 deletedAt 标记
    const { deletedAt, ...rest } = button;
    const restoredButton = { ...rest };

    // 如果原位置被占或者为了方便找到，可以重置位置到中心或原位置
    // 这里保持原位置

    setGlobalButtons(prev => [...prev, restoredButton]);
    setDeletedButtons(prev => {
      const newList = prev.filter(btn => btn.id !== buttonId);
      // 更新 localStorage
      localStorage.setItem('deleted-buttons-config', JSON.stringify(newList));
      return newList;
    });
  };

  // 永久删除按钮
  const handlePermanentDelete = (buttonId) => {
    setDeletedButtons(prev => {
      const newList = prev.filter(btn => btn.id !== buttonId);
      // 更新 localStorage
      localStorage.setItem('deleted-buttons-config', JSON.stringify(newList));
      return newList;
    });
  };

  // 清空回收站
  const handleClearRecycleBin = () => {
    setDeletedButtons([]);
    localStorage.removeItem('deleted-buttons-config');
  };

  // 全局按钮拖动处理
  const handleGlobalButtonMouseDown = (e, buttonId, action = 'move') => {
    if (!isEditingLayout) return;
    e.preventDefault();
    e.stopPropagation();

    const button = globalButtons.find(btn => btn.id === buttonId);
    if (!button) return;

    const startX = e.clientX;
    const startY = e.clientY;

    setDraggingButton({
      buttonId,
      action,
      startX,
      startY,
      startPos: { x: button.x, y: button.y },
      startSize: { width: button.width, height: button.height }
    });
  };

  // 全局按钮样式编辑
  const handleGlobalButtonStyleEdit = (buttonId) => {
    setEditingButtonId(buttonId);
  };

  // 删除按钮
  const handleDeleteButton = (buttonId) => {
    // GlobalButton component already handles the confirmation dialog
    const buttonToDelete = globalButtons.find(b => b.id === buttonId);
    if (buttonToDelete) {
      setDeletedButtons(prev => [...prev, buttonToDelete]);
      setGlobalButtons(prev => prev.filter(b => b.id !== buttonId));
    } else {
      // Fallback for old system if needed, or just ignore
      console.warn('Button not found in global buttons:', buttonId);
    }
  };


  const renderProcessingPanelContent = () => {
    // Determine rendering mode based on processingTab
    // Note: These variables are derived from component state 'processingTab'
    const showConfig = processingTab === 'config';
    const showRecords = processingTab === 'records';

    return (
      <div className="card fixed processing-card">
        {/* Topbar removed as buttons are in EditableButtonsContainer */}
        <div className="processing-topbar" style={{ height: '40px' }} />

        {showConfig ? (
          <div className="config-panel">
            <div className="card-head" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div className="section-title">按钮配置</div>
                <div className="hint">可新增/编辑/删除；关闭则在大纲模式隐藏该按钮。</div>
              </div>
              {/* '新增' is likely 'add_button' in config, but if missing, keep here? User screenshot showed '新增按钮'. */}
            </div>

            <div className="sections" style={{ gap: 10 }}>
              {llmButtons.length === 0 ? (
                <div className="hint">暂无按钮</div>
              ) : (
                llmButtons.map((b, idx) => (
                  <div key={b.id} className="section" style={{ background: '#fff' }}>
                    <div className="section-head" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                      <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="pill muted">{idx + 1}</span>
                        <span>{b.label || '按钮'}</span>
                        <span className={`status ${b.enabled ? 'filled' : 'empty'}`}>
                          {b.enabled ? '启用' : '关闭'}
                        </span>
                      </div>
                      <div className="section-actions" style={{ gap: 8 }}>
                        <label className="inline-check" style={{ gap: 6 }}>
                          <input
                            type="checkbox"
                            checked={!!b.enabled}
                            onChange={(e) => toggleLlmButtonEnabled(b.id, e.target.checked)}
                          />
                          <span className="hint">启用</span>
                        </label>
                        <button className="ghost small" type="button" onClick={() => startEditLlmButton(b)} style={{ pointerEvents: 'auto' }}>
                          编辑
                        </button>
                        <button className="ghost small" type="button" onClick={() => deleteLlmButton(b.id)} style={{ pointerEvents: 'auto' }}>
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {buttonDraft ? (
              <div className="section" style={{ background: '#fff' }}>
                <div className="section-title">编辑：{buttonDraft.label || '按钮'}</div>
                <div className="sections" style={{ gap: 10 }}>
                  <label className="form-row">
                    按钮名称
                    <input
                      value={buttonDraft.label || ''}
                      onChange={(e) => setButtonDraft((p) => ({ ...p, label: e.target.value }))}
                    />
                  </label>

                  <div className="link-row">
                    <label className="form-row" style={{ minWidth: 120 }}>
                      启用
                      <select
                        value={buttonDraft.enabled ? 'on' : 'off'}
                        onChange={(e) => setButtonDraft((p) => ({ ...p, enabled: e.target.value === 'on' }))}
                      >
                        <option value="on">开启</option>
                        <option value="off">关闭</option>
                      </select>
                    </label>
                  </div>

                  <div className="section" style={{ background: '#fff' }}>
                    <div className="card-head" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div className="section-title">数据源与输出</div>
                        <div className="hint">可新增/删除多条规则，用于分别配置“标题/摘要”的输出方式。</div>
                      </div>
                      <button className="ghost small" type="button" onClick={addIoRuleToDraft} style={{ pointerEvents: 'auto' }}>
                        新增一行
                      </button>
                    </div>
                    <div className="sections" style={{ gap: 8 }}>
                      {normalizeIoRows(buttonDraft?.io, {
                        dataSource: buttonDraft?.dataSource,
                        outputTarget: buttonDraft?.outputTarget,
                      }).map((r, idx) => (
                        <div key={r.id} className="link-row io-config-row" style={{ alignItems: 'center' }}>
                          <span className="pill muted">{idx + 1}</span>
                          <label className="inline-check" style={{ gap: 6 }}>
                            <input
                              type="checkbox"
                              checked={!!r.enabled}
                              onChange={(e) => updateIoRuleInDraft(r.id, { enabled: e.target.checked })}
                            />
                            <span className="hint">启用</span>
                          </label>
                          <label className="form-row" style={{ minWidth: 220 }}>
                            数据源
                            <select
                              value={r.dataSource}
                              onChange={(e) => updateIoRuleInDraft(r.id, { dataSource: e.target.value })}
                            >
                              <option value="preview">内容预览（当前文本框）</option>
                              <option value="selected_doc">资源列表选中文档（已保存内容）</option>
                            </select>
                          </label>
                          <label className="form-row" style={{ minWidth: 140 }}>
                            输出内容
                            <select
                              value={r.output}
                              onChange={(e) => updateIoRuleInDraft(r.id, { output: e.target.value })}
                            >
                              <option value="titles">标题</option>
                              <option value="summaries">摘要</option>
                            </select>
                          </label>
                          <label className="form-row" style={{ minWidth: 160 }}>
                            展示位置
                            <select
                              value={r.target}
                              onChange={(e) => updateIoRuleInDraft(r.id, { target: e.target.value })}
                            >
                              <option value="title">标题</option>
                              <option value="summary">摘要</option>
                            </select>
                          </label>
                          <button className="ghost small" type="button" onClick={() => deleteIoRuleFromDraft(r.id)} style={{ pointerEvents: 'auto' }}>
                            删除行
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <label className="form-row">
                    <div className="link-row" style={{ alignItems: 'center' }}>
                      <span>提示词（支持 <code>{'{{text}}'}</code> 占位符）</span>
                      <button
                        className="ghost small"
                        type="button"
                        onClick={optimizePromptDraft}
                        disabled={isOptimizingPrompt || !((buttonDraft.prompt || '').toString().trim())}
                        style={{ pointerEvents: 'auto' }}
                      >
                        {isOptimizingPrompt ? '优化中…' : 'AI自动优化'}
                      </button>
                    </div>
                    <textarea
                      rows={8}
                      value={buttonDraft.prompt || ''}
                      onChange={(e) => setButtonDraft((p) => ({ ...p, prompt: e.target.value }))}
                    />
                  </label>

                  <div className="section-actions" style={{ justifyContent: 'flex-end' }}>
                    <button className="ghost small" type="button" onClick={cancelEditLlmButton} style={{ pointerEvents: 'auto' }}>
                      取消
                    </button>
                    <button className="ghost small" type="button" onClick={saveLlmButtonDraft} style={{ pointerEvents: 'auto' }}>
                      保存并生效
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : !showRecords ? (
          <>
            <div className="sections outline-scroll outline-tree">{outlineTree && outlineTree.map(renderOutlineNode)}</div>
            {finalGenerateCfg?.enabled ? (
              <div className="processing-bottombar">
                {/* Final button is also likely in EditableButtonsContainer? If so, remove. But 'final_btn' is not standard. Keeping for safety if not in config. */}
              </div>
            ) : null}
          </>
        ) : (
          <div className="sections history-scroll">
            {deposits.length === 0 && <p className="hint">暂无沉淀记录</p>}
            <div className="history-toolbar">
              {/* Toolbar actions for history - These might NOT be in EditableButtonsContainer yet. Keeping them. */}
              <div className="actions" style={{ gap: 6 }}>
                <button
                  className="ghost small"
                  type="button"
                  onClick={() => void batchReplaySelectedDeposits()}
                  disabled={batchReplayRunning || !Object.keys(selectedDepositIds || {}).some((k) => selectedDepositIds[k])}
                  style={{ pointerEvents: 'auto' }}
                >
                  批量 Replay
                </button>
                <label className="inline-check" style={{ gap: 6 }}>
                  <input
                    type="checkbox"
                    disabled={deposits.length === 0}
                    checked={
                      deposits.length > 0 &&
                      Object.keys(selectedDepositIds || {}).filter((k) => selectedDepositIds[k]).length === deposits.length
                    }
                    onChange={(e) => (e.target.checked ? selectAllDeposits() : clearDepositSelection())}
                  />
                  <span className="hint">全选</span>
                </label>
                <button
                  className="ghost small"
                  type="button"
                  onClick={deleteSelectedDeposits}
                  disabled={!Object.keys(selectedDepositIds || {}).some((k) => selectedDepositIds[k])}
                  style={{ pointerEvents: 'auto' }}
                >
                  删除选中
                </button>
                <button
                  className="ghost small"
                  type="button"
                  onClick={clearDepositSelection}
                  disabled={!Object.keys(selectedDepositIds || {}).some((k) => selectedDepositIds[k])}
                  style={{ pointerEvents: 'auto' }}
                >
                  清空选择
                </button>
              </div>
              <span className="pill muted">
                {Object.keys(selectedDepositIds || {}).filter((k) => selectedDepositIds[k]).length}/{deposits.length}
              </span>
            </div>
            {deposits.map((dep, idx) => (
              <div key={dep.id} className="section">
                <div className="section-head" style={{ justifyContent: 'space-between' }}>
                  <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <label className="inline-check" style={{ gap: 6 }}>
                      <input
                        type="checkbox"
                        checked={!!selectedDepositIds?.[dep.id]}
                        onChange={(e) => toggleDepositSelected(dep.id, e.target.checked)}
                      />
                    </label>
                    <span className="pill muted">{idx + 1}</span>
                    {depositEditing[`${dep.id}||name`] !== undefined ? (
                      <>
                        <input
                          value={depositEditing[`${dep.id}||name`]}
                          onChange={(e) => startEditDeposit(dep.id, 'name', e.target.value)}
                          style={{ minWidth: 180 }}
                        />
                        <button className="ghost xsmall" type="button" onClick={() => applyDepositName(dep.id)}>
                          保存
                        </button>
                        <button className="ghost xsmall" type="button" onClick={() => cancelEditDeposit(dep.id, 'name')}>
                          取消
                        </button>
                      </>
                    ) : (
                      <>
                        <span>{dep.name || dep.id}</span>
                        <span className="meta">{dep.id}</span>
                        <button
                          className="ghost xsmall"
                          type="button"
                          onClick={() => startEditDeposit(dep.id, 'name', dep.name || dep.id)}
                        >
                          编辑名称
                        </button>
                      </>
                    )}
                  </div>
                  <div className="section-actions" style={{ gap: 6 }}>
                    <button
                      className="ghost xsmall"
                      type="button"
                      onClick={() => void replayDeposit(dep.id)}
                      disabled={!!replayState?.[dep.id]?.running}
                    >
                      Reply
                    </button>
                    {expandedLogs[dep.id] ? (
                      <>
                        <button className="ghost xsmall" type="button" onClick={() => setAllDepositSectionsExpanded(dep.id, false)}>
                          收起全部 section
                        </button>
                        <button className="ghost xsmall" type="button" onClick={() => setAllDepositSectionsExpanded(dep.id, true)}>
                          展开全部 section
                        </button>
                      </>
                    ) : null}
                    <button className="ghost xsmall" type="button" onClick={() => deleteDepositsByIds([dep.id])}>
                      删除
                    </button>
                    <button
                      className="ghost xsmall"
                      type="button"
                      onClick={() => setExpandedLogs((prev) => ({ ...prev, [dep.id]: !prev[dep.id] }))}
                    >
                      {expandedLogs[dep.id] ? '收起' : '展开'}
                    </button>
                  </div>
                </div>
                {expandedLogs[dep.id] && (
                  <div className="sections" style={{ gap: 6 }}>
                    {(dep.sections || []).length === 0 && <div className="hint">暂无 section</div>}
                    {(dep.sections || []).map((s, i) => {
                      const actionKey = `${dep.id}||${s.id}||action`;
                      const contentKey = `${dep.id}||${s.id}||content`;
                      const editing = depositEditing[actionKey] !== undefined || depositEditing[contentKey] !== undefined;
                      const sectionMeta = extractReplayMeta(s?.content || '');
                      const canFlexUpload =
                        !editing &&
                        sectionMeta?.type === 'add_doc' &&
                        (sectionMeta?.source === 'upload' || (s?.content || '').toString().includes('上传文档'));
                      const replay = replayState?.[dep.id]?.bySection?.[s.id];
                      const expanded = editing ? true : isDepositSectionExpanded(dep.id, s.id);
                      return (
                        <div key={s.id} className="section" style={{ background: '#fff' }}>
                          <div className="section-head" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                              <span className="pill muted">{i + 1}</span>
                              {editing ? (
                                <input
                                  value={depositEditing[actionKey] ?? s.action ?? ''}
                                  onChange={(e) => startEditDeposit(dep.id, `${s.id}||action`, e.target.value)}
                                  style={{ minWidth: 180 }}
                                />
                              ) : (
                                <span>{s.action || '（无标题）'}</span>
                              )}
                              {replay?.status ? (
                                <span className={`status ${replay.status}`} title={replay.message || ''}>
                                  {replay.status}
                                </span>
                              ) : null}
                            </div>
                            <div className="section-actions" style={{ gap: 6 }}>
                              {canFlexUpload ? (
                                <button className="ghost xsmall" type="button" onClick={() => void flexEditUploadDepositSection(dep.id, s)}>
                                  灵活上传
                                </button>
                              ) : null}
                              {editing ? (
                                <>
                                  <button className="ghost xsmall" type="button" onClick={() => applyDepositSection(dep.id, s.id)}>
                                    保存
                                  </button>
                                  <button className="ghost xsmall" type="button" onClick={() => cancelEditDepositSection(dep.id, s.id)}>
                                    取消
                                  </button>
                                </>
                              ) : (
                                <button className="ghost xsmall" type="button" onClick={() => startEditDepositSection(dep.id, s)}>
                                  编辑
                                </button>
                              )}
                              <button className="ghost xsmall" type="button" onClick={() => toggleDepositSectionExpanded(dep.id, s.id)}>
                                {expanded ? '收起' : '展开'}
                              </button>
                              <button className="ghost xsmall" type="button" onClick={() => deleteDepositSection(dep.id, s.id)}>
                                删除
                              </button>
                            </div>
                          </div>
                          {expanded ? (
                            editing ? (
                              <textarea
                                rows={4}
                                value={depositEditing[contentKey] ?? s.content ?? ''}
                                onChange={(e) => startEditDeposit(dep.id, `${s.id}||content`, e.target.value)}
                              />
                            ) : (
                              <>
                                <div className="hint" style={{ whiteSpace: 'pre-wrap' }}>{s.content || '（无内容）'}</div>
                                {replay?.status === 'fail' && replay.message ? (
                                  <div className="hint" style={{ whiteSpace: 'pre-wrap', color: '#b91c1c' }}>
                                    {replay.message}
                                  </div>
                                ) : null}
                              </>
                            )
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* 回收站侧边栏 - 仅编辑模式显示 */}
      {/* 编辑控制台 - 仅编辑模式显示 */}
      {isEditingLayout && showRecycleBin && (
        <EditConsole
          deletedButtons={deletedButtons}
          deletedBlocks={deletedBlocks}
          onRestore={handleRestoreButton}
          onPermanentDelete={handlePermanentDelete}
          onRestoreBlock={handleRestoreBlock}
          onPermanentDeleteBlock={handlePermanentDeleteBlock}
          onClearAll={handleClearRecycleBin}
          onClose={() => setShowRecycleBin(false)}
          onSave={() => {
            setIsEditingLayout(false);
            saveButtonConfig(globalButtons);
            localStorage.setItem('layout_panel_positions', JSON.stringify(panelPositions));
            localStorage.setItem('layout_content_blocks', JSON.stringify(contentBlockPositions));
            localStorage.setItem('layout_deleted_blocks', JSON.stringify(deletedBlocks));

            // Persist to backend
            api('/api/config/save', {
              method: 'POST',
              body: {
                layout: panelPositions,
                buttons: { activeButtons: globalButtons }, // Wrap to match expected structure if needed, or just array
                contentBlocks: contentBlockPositions,
                deletedBlocks: deletedBlocks
              }
            }).then(() => {
              console.log('Saved config to backend');
            }).catch(e => {
              console.error('Failed to save to backend', e);
              alert('保存到服务器失败，仅保存到本地');
            });
          }}
          onCancel={() => {
            if (confirm('确定要取消编辑吗？所有未保存的更改将丢失？')) {
              setIsEditingLayout(false);
              window.location.reload();
            }
          }}
          onReset={() => {
            if (confirm('确定要重置为默认布局吗？')) {
              localStorage.removeItem('layout_panel_positions');
              localStorage.removeItem('layout_content_blocks');
              localStorage.removeItem('button_config_v2');
              window.location.reload();
            }
          }}
        />
      )}

      {/* 回收站切换按钮 - 当回收站隐藏但在编辑模式时显示小图标 */}
      {isEditingLayout && !showRecycleBin && (
        <button
          onClick={() => setShowRecycleBin(true)}
          style={{
            position: 'fixed',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10000,
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRight: 'none',
            borderRadius: '8px 0 0 8px',
            padding: '8px',
            boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          title="打开编辑控制台"
        >
          <ChevronLeft size={20} color="#64748b" />
        </button>
      )}

      {/* 完成并保存按钮 - 编辑模式下显示在右上角 */}
      {isEditingLayout && (
        <button
          onClick={() => {
            setIsEditingLayout(false);
            localStorage.setItem('global-buttons-config', JSON.stringify({ activeButtons: globalButtons }));
            localStorage.setItem('layout_panel_positions', JSON.stringify(panelPositions));
            localStorage.setItem('layout_content_blocks', JSON.stringify(contentBlockPositions));
            localStorage.setItem('layout_deleted_blocks', JSON.stringify(deletedBlocks));

            api('/api/config/save', {
              method: 'POST',
              body: {
                layout: panelPositions,
                buttons: { activeButtons: globalButtons },
                contentBlocks: contentBlockPositions,
                deletedBlocks: deletedBlocks
              }
            }).then(() => {
              console.log('Saved config to backend');
            }).catch(e => {
              console.error('Failed to save to backend', e);
              alert('保存到服务器失败，仅保存到本地');
            });
          }}
          style={{
            position: 'fixed',
            right: '20px',
            top: '20px',
            zIndex: 10001, // Higher than console toggle
            background: '#000', // Black background like in design
            color: '#fff',
            border: 'none',
            borderRadius: '999px',
            padding: '10px 24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            fontSize: '14px',
            fontWeight: 500
          }}
        >
          <Save size={16} /> 完成并保存
        </button>
      )}

      <main className={`layout-multi ${isEditingLayout ? 'editing-mode' : ''}`} style={{ position: 'relative' }}>

        {/* <EditingToolbar /> Removed in favor of EditConsole */}

        <header className="hero">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={onSwitch}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: 'var(--primary-accent)',
                color: '#fff',
                border: 'none',
                borderRadius: '999px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <GalleryVerticalEnd size={18} /> 切换工作台
            </button>
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {/* Eyebrow Title */}
              {isEditingLayout ? (
                <div
                  style={{
                    position: 'relative',
                    display: 'inline-flex',
                    alignItems: 'center',
                    width: `${headerTitles.eyebrow.width || 200}px`,
                    height: `${headerTitles.eyebrow.height || 30}px`,
                    border: '2px dashed #cbd5e1',
                    borderRadius: '4px',
                    background: 'transparent',
                    cursor: draggingHeaderTitle?.titleKey === 'eyebrow' ? 'grabbing' : 'grab',
                    zIndex: draggingHeaderTitle?.titleKey === 'eyebrow' ? 200 : 100,
                    transform: `translate(${headerTitles.eyebrow.position?.left || 0}px, ${headerTitles.eyebrow.position?.top || 0}px)`,
                  }}
                  onMouseDown={(e) => handleHeaderTitleMouseDown(e, 'eyebrow')}
                >
                  <p
                    className="eyebrow"
                    style={{
                      margin: 0,
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: headerTitles.eyebrow.style?.textAlign === 'left' ? 'flex-start' : headerTitles.eyebrow.style?.textAlign === 'right' ? 'flex-end' : 'center',
                      textAlign: headerTitles.eyebrow.style?.textAlign || 'center',
                      ...headerTitles.eyebrow.style,
                    }}
                  >
                    {headerTitles.eyebrow.text}
                  </p>
                  {/* 编辑按钮 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingHeaderTitle('eyebrow');
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: '#3b82f6',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)',
                      padding: 0,
                      flexShrink: 0,
                    }}
                    title="编辑标题样式"
                  >
                    编
                  </button>
                  {/* Resize手柄 */}
                  <div
                    onMouseDown={(e) => handleHeaderTitleResizeMouseDown(e, 'eyebrow', 'se')}
                    style={{
                      position: 'absolute',
                      right: '-4px',
                      bottom: '-4px',
                      width: '12px',
                      height: '12px',
                      background: '#3b82f6',
                      border: '2px solid #fff',
                      borderRadius: '50%',
                      cursor: 'nwse-resize',
                      zIndex: 120,
                      boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
                    }}
                  />
                </div>
              ) : (
                <p
                  className="eyebrow"
                  style={{
                    ...headerTitles.eyebrow.style,
                    transform: `translate(${headerTitles.eyebrow.position?.left || 0}px, ${headerTitles.eyebrow.position?.top || 0}px)`,
                    position: 'relative',
                    width: `${headerTitles.eyebrow.width || 200}px`,
                    height: `${headerTitles.eyebrow.height || 30}px`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: headerTitles.eyebrow.style?.textAlign === 'left' ? 'flex-start' : headerTitles.eyebrow.style?.textAlign === 'right' ? 'flex-end' : 'center',
                    textAlign: headerTitles.eyebrow.style?.textAlign || 'center',
                    margin: 0
                  }}
                >
                  {headerTitles.eyebrow.text}
                </p>
              )}

              {/* Main Title */}
              {isEditingLayout ? (
                <div
                  style={{
                    position: 'relative',
                    display: 'inline-flex',
                    alignItems: 'center',
                    width: `${headerTitles.title.width || 200}px`,
                    height: `${headerTitles.title.height || 40}px`,
                    border: '2px dashed #cbd5e1',
                    borderRadius: '4px',
                    background: 'transparent',
                    cursor: draggingHeaderTitle?.titleKey === 'title' ? 'grabbing' : 'grab',
                    zIndex: draggingHeaderTitle?.titleKey === 'title' ? 200 : 100,
                    transform: `translate(${headerTitles.title.position?.left || 0}px, ${headerTitles.title.position?.top || 0}px)`,
                  }}
                  onMouseDown={(e) => handleHeaderTitleMouseDown(e, 'title')}
                >
                  <h1
                    style={{
                      margin: 0,
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: headerTitles.title.style?.textAlign === 'left' ? 'flex-start' : headerTitles.title.style?.textAlign === 'right' ? 'flex-end' : 'center',
                      textAlign: headerTitles.title.style?.textAlign || 'center',
                      ...headerTitles.title.style
                    }}
                  >
                    {headerTitles.title.text}
                  </h1>
                  {/* 编辑按钮 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingHeaderTitle('title');
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#3b82f6',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)',
                      padding: 0,
                      flexShrink: 0,
                    }}
                    title="编辑标题样式"
                  >
                    编
                  </button>
                  {/* Resize手柄 */}
                  <div
                    onMouseDown={(e) => handleHeaderTitleResizeMouseDown(e, 'title', 'se')}
                    style={{
                      position: 'absolute',
                      right: '-4px',
                      bottom: '-4px',
                      width: '12px',
                      height: '12px',
                      background: '#3b82f6',
                      border: '2px solid #fff',
                      borderRadius: '50%',
                      cursor: 'nwse-resize',
                      zIndex: 120,
                      boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
                    }}
                  />
                </div>
              ) : (
                <h1
                  style={{
                    ...headerTitles.title.style,
                    transform: `translate(${headerTitles.title.position?.left || 0}px, ${headerTitles.title.position?.top || 0}px)`,
                    position: 'relative',
                    width: `${headerTitles.title.width || 200}px`,
                    height: `${headerTitles.title.height || 40}px`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: headerTitles.title.style?.textAlign === 'left' ? 'flex-start' : headerTitles.title.style?.textAlign === 'right' ? 'flex-end' : 'center',
                    textAlign: headerTitles.title.style?.textAlign || 'center',
                    margin: 0
                  }}
                >
                  {headerTitles.title.text}
                </h1>
              )}
            </div>
          </div>
          <div className="actions">
            {!isEditingLayout ? (
              <>
                <button
                  className={`ghost ${isEditingLayout ? 'active' : ''}`}
                  onClick={() => setIsEditingLayout(true)}
                  title="点击启用编辑模式"
                >
                  <LayoutIcon size={18} /> 编辑布局
                </button>
                <button className={`ghost ${isDepositing ? 'active' : ''}`} onClick={startDeposit}>
                  <History size={18} /> {isDepositing ? '沉淀中..' : '开始沉淀'}
                </button>
                {isDepositing && (
                  <button className="ghost" onClick={endDeposit}>
                    结束沉淀
                  </button>
                )}

              </>
            ) : (
              <span className="hint">编辑模式中，主要功能区：1. 拖动/调整组件 2. 点击右侧箭头打开编辑控制�?保存/回收)</span>
            )}
          </div>
        </header>

        {isEditingLayout ? (
          <LayoutEditContainer
            isEditing={true}
            size={layoutSize}
            onSizeChange={setLayoutSize}
            style={{ position: 'relative' }}
          >
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              {/* 输入表单面板 */}
              {/* 输入表单面板已移�?*/}

              {/* 文档列表面板 */}
              <EditableLayoutPanel
                panelId="document-list-panel"
                panelName={getPanelTitle('document-list-panel')}
                isEditing={isEditingLayout}
                onTitleEdit={() => setEditingTitleId('document-list-panel')}
                titleStyle={panelPositions['document-list-panel']?.titleStyle}
                className="document-list-panel"
                position={panelPositions['document-list-panel']}
                onPositionChange={(newPos) =>
                  setPanelPositions((prev) => ({ ...prev, 'document-list-panel': newPos }))
                }
              >
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  <EditableContentBlock
                    blockId="document-list-content"
                    panelId="document-list-panel"
                    isEditing={isEditingLayout}
                    position={contentBlockPositions['document-list-panel']}
                    onPositionChange={(newPos) =>
                      setContentBlockPositions(prev => ({ ...prev, 'document-list-panel': newPos }))
                    }
                    hidden={deletedBlocks.includes('document-list-panel')}
                    onDelete={() => handleDeleteBlock('document-list-panel')}
                  >
                    <DocumentListPanelContent
                      docs={docs}
                      selectedDocId={selectedDocId}
                      setSelectedDocId={setSelectedDocId}
                      deleteDoc={deleteDoc}
                      uploadInputRef={uploadInputRef}
                      handleFilePick={handleFilePick}
                      replayDirName={replayDirName}
                      pickReplayDirectory={pickReplayDirectory}
                      clearReplayDirectory={clearReplayDirectory}
                      replayDirHandle={replayDirHandle}
                    />
                  </EditableContentBlock>

                  {/* 可编辑的回放目录模块 */}
                  <EditableContentBlock
                    blockId="document-replay-ui"
                    panelId="document-list-panel"
                    isEditing={isEditingLayout}
                    position={contentBlockPositions['document-replay-ui']}
                    onPositionChange={(newPos) =>
                      setContentBlockPositions(prev => ({ ...prev, 'document-replay-ui': newPos }))
                    }
                    hidden={deletedBlocks.includes('document-replay-ui')}
                    onDelete={() => handleDeleteBlock('document-replay-ui')}
                  >
                    <ReplayDirectoryPanelContent
                      replayDirName={replayDirName}
                      pickReplayDirectory={pickReplayDirectory}
                      clearReplayDirectory={clearReplayDirectory}
                      replayDirHandle={replayDirHandle}
                    />
                  </EditableContentBlock>
                  {/* 旧按钮系统已移除 */}

                </div>
              </EditableLayoutPanel>
              {/* 内容预览面板 */}
              <EditableLayoutPanel
                panelId="preview-panel"
                panelName={getPanelTitle('preview-panel')}
                isEditing={isEditingLayout}
                onTitleEdit={() => setEditingTitleId('preview-panel')}
                titleStyle={panelPositions['preview-panel']?.titleStyle}
                className="preview-panel"
                position={panelPositions['preview-panel']}
                onPositionChange={(newPos) =>
                  setPanelPositions((prev) => ({ ...prev, 'preview-panel': newPos }))
                }
              >
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  {/* 可编辑的预览文本框区�?*/}
                  <EditableContentBlock
                    blockId="preview-textarea"
                    panelId="preview-panel"
                    isEditing={isEditingLayout}
                    position={contentBlockPositions['preview-textarea']}
                    onPositionChange={(newPos) =>
                      setContentBlockPositions(prev => ({ ...prev, 'preview-textarea': newPos }))
                    }
                    hidden={deletedBlocks.includes('preview-textarea')}
                    onDelete={() => handleDeleteBlock('preview-textarea')}
                  >
                    <div className="card" style={{ width: '100%', height: '100%', padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                      <textarea
                        ref={previewTextRef}
                        className="preview full"
                        value={docDraft}
                        onChange={(e) => setDocDraft(e.target.value)}
                        onMouseUp={updatePreviewSelection}
                        onKeyUp={updatePreviewSelection}
                        onSelect={updatePreviewSelection}
                        onBlur={saveDocDraft}
                        placeholder="选择文档以查看全文"
                        style={{ border: 'none', width: '100%', height: '100%', resize: 'none', padding: '12px', boxSizing: 'border-box' }}
                      />
                    </div>
                  </EditableContentBlock>

                  {/* 可编辑的工具栏区域 */}
                  <EditableContentBlock
                    blockId="preview-toolbar"
                    panelId="preview-panel"
                    isEditing={isEditingLayout}
                    position={contentBlockPositions['preview-toolbar']}
                    onPositionChange={(newPos) =>
                      setContentBlockPositions(prev => ({ ...prev, 'preview-toolbar': newPos }))
                    }
                    hidden={deletedBlocks.includes('preview-toolbar')}
                    onDelete={() => handleDeleteBlock('preview-toolbar')}
                  >
                    <div className="card" style={{ width: '100%', height: '100%', padding: '0 12px', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
                      <div className="preview-toolbar" style={{ width: '100%', border: 'none', padding: 0 }}>
                        <button
                          className={`ghost small ${canFillSummary ? 'active' : ''}`}
                          type="button"
                          onClick={insertSelectionToCheckedSummaries}
                        >
                          填入摘要
                        </button>
                      </div>
                    </div>
                  </EditableContentBlock>
                </div>
              </EditableLayoutPanel>
              {/* 文档处理面板 */}
              <EditableLayoutPanel
                panelId="processing-panel"
                panelName={getPanelTitle('processing-panel')}
                isEditing={isEditingLayout}
                onTitleEdit={() => setEditingTitleId('processing-panel')}
                titleStyle={panelPositions['processing-panel']?.titleStyle}
                className="processing-panel"
                position={panelPositions['processing-panel']}
                onPositionChange={(newPos) =>
                  setPanelPositions((prev) => ({ ...prev, 'processing-panel': newPos }))
                }
              >
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  <EditableContentBlock
                    blockId="processing-content"
                    panelId="processing-panel"
                    isEditing={isEditingLayout}
                    position={contentBlockPositions['processing-panel']}
                    onPositionChange={(newPos) =>
                      setContentBlockPositions(prev => ({ ...prev, 'processing-panel': newPos }))
                    }
                    hidden={deletedBlocks.includes('processing-panel')}
                    onDelete={() => handleDeleteBlock('processing-panel')}
                  >
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#666',
                        minHeight: '100%',
                        boxSizing: 'border-box',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      {/* 控制按钮 */}
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        marginBottom: '12px',
                        borderBottom: '1px solid #e2e8f0',
                        padding: '8px 12px'
                      }}>
                        <button
                          className={`ghost small ${processingTab === 'outline' ? 'active' : ''}`}
                          onClick={() => setProcessingTab('outline')}
                          style={{
                            padding: '6px 12px',
                            fontSize: '13px',
                            fontWeight: processingTab === 'outline' ? 600 : 400
                          }}
                        >
                          大纲预览
                        </button>
                        <button
                          className={`ghost small ${processingTab === 'config' ? 'active' : ''}`}
                          onClick={() => setProcessingTab('config')}
                          style={{
                            padding: '6px 12px',
                            fontSize: '13px',
                            fontWeight: processingTab === 'config' ? 600 : 400
                          }}
                        >
                          个性化配置
                        </button>
                        <button
                          className={`ghost small ${processingTab === 'records' ? 'active' : ''}`}
                          onClick={() => setProcessingTab('records')}
                          style={{
                            padding: '6px 12px',
                            fontSize: '13px',
                            fontWeight: processingTab === 'records' ? 600 : 400
                          }}
                        >
                          操作记录
                        </button>
                      </div>

                      {/* 内容区域 */}
                      <div style={{ padding: '0 12px 12px', overflowY: 'auto', flex: 1 }}>
                        {processingTab === 'outline' && (
                          <div>
                            {/* 操作按钮区域 - 仅在大纲模式下显示 */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '12px' }}>
                              {globalButtons
                                .filter(b => b.kind === 'outline_extract' && b.enabled !== false)
                                .slice(0, 1)
                                .map(btn => (
                                  <button
                                    key={btn.id}
                                    className="small"
                                    onClick={() => autoTemplate(btn)}
                                    title={btn.prompt ? `Prompt: ${btn.prompt.slice(0, 50)}...` : '使用默认Prompt'}
                                  >
                                    {btn.label}
                                  </button>
                                ))
                              }
                              {/* 清除按钮 - 也可以配置化，但由硬编码逻辑支持 */}
                              <button
                                className="ghost small"
                                onClick={clearOutlineTemplate}
                                style={{ color: '#ef4444', borderColor: '#ef4444' }}
                              >
                                清除
                              </button>
                            </div>

                            {!template || !template.sections || template.sections.length === 0 ? (
                              <p style={{ fontSize: '13px', color: '#94a3b8', padding: '20px', textAlign: 'center' }}>暂无大纲数据，请点击右上角按钮抽取</p>
                            ) : (
                              template.sections.map((sec, idx) => renderOutlineNode({ section: sec, index: idx }))
                            )}
                          </div>
                        )}
                        {processingTab === 'config' && (
                          <div style={{ height: '100%', overflow: 'auto' }}>
                            <div style={{ padding: '12px', borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
                              <h4 style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 600 }}>全局按钮配置</h4>
                              <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>控制全局功能按钮的显示状态</p>
                            </div>
                            <div style={{ padding: '0 12px' }}>
                              {globalButtons.map((btn) => (
                                <label
                                  key={btn.id}
                                  style={{
                                    display: 'block',
                                    padding: '10px 0',
                                    borderBottom: '1px solid #f0f0f0',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                                    <div>
                                      <div style={{ fontSize: '13px', fontWeight: 500 }}>{btn.label}</div>
                                      <div style={{ fontSize: '11px', color: '#999' }}>{btn.kind}</div>
                                    </div>
                                    <input
                                      type="checkbox"
                                      checked={btn.enabled !== false}
                                      disabled={btn.kind === 'outline_extract'}
                                      style={btn.kind === 'outline_extract' ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                                      title={btn.kind === 'outline_extract' ? '核心功能不可禁用' : ''}
                                      onChange={(e) => {
                                        if (btn.kind === 'outline_extract') return;
                                        const newEnabled = e.target.checked;
                                        const newButtons = globalButtons.map(b => (b.id === btn.id ? { ...b, enabled: newEnabled } : b));
                                        setGlobalButtons(newButtons);
                                        saveButtonConfig({ activeButtons: newButtons });
                                      }}
                                    />
                                  </div>
                                  {/* Prompt 配置区域 - 仅针对大纲抽取类按钮 */}
                                  {btn.kind === 'outline_extract' && (
                                    <div style={{
                                      padding: '8px 0 4px',
                                      display: btn.enabled !== false ? 'block' : 'none'
                                    }}>
                                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>自定义 Prompt:</div>
                                      <textarea
                                        value={btn.prompt || ''}
                                        onChange={(e) => {
                                          const newPrompt = e.target.value;
                                          const newButtons = globalButtons.map(b => (b.id === btn.id ? { ...b, prompt: newPrompt } : b));
                                          setGlobalButtons(newButtons);
                                          // 实时保存可能太频繁，可以用 debounce，这里简化处理直接保存
                                          saveButtonConfig({ activeButtons: newButtons });
                                        }}
                                        placeholder="在此输入生成大纲的 Prompt 指令..."
                                        style={{
                                          width: '100%',
                                          minHeight: '60px',
                                          padding: '8px',
                                          fontSize: '12px',
                                          border: '1px solid #e2e8f0',
                                          borderRadius: '4px',
                                          resize: 'vertical',
                                          background: '#fff'
                                        }}
                                      />
                                    </div>
                                  )}
                                </label>
                              ))}
                              {globalButtons.length === 0 && (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '12px' }}>
                                  暂无全局按钮
                                </div>
                              )}
                            </div>
                            <div style={{ padding: '12px', borderTop: '1px solid #f0f0f0', textAlign: 'center' }}>
                              <button
                                className="ghost small"
                                style={{ color: '#666' }}
                                onClick={() => {
                                  const defaults = defaultLlmButtons();
                                  const currentKinds = globalButtons.map(b => b.kind);
                                  const missing = defaults.filter(d => !currentKinds.includes(d.kind));

                                  if (missing.length === 0) {
                                    showToast('当前已包含所有默认按钮，无需恢复');
                                    return;
                                  }

                                  if (window.confirm(`检测到缺失 ${missing.length} 个默认按钮，是否恢复？`)) {
                                    const newRestored = missing.map(b => ({
                                      ...b,
                                      id: `btn_restored_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                                      enabled: true
                                    }));
                                    const newButtons = [...globalButtons, ...newRestored];
                                    setGlobalButtons(newButtons);
                                    saveButtonConfig({ activeButtons: newButtons });
                                    showToast('已恢复缺失的默认按钮');
                                  }
                                }}
                              >
                                找回默认按钮
                              </button>
                            </div>
                          </div>
                        )}
                        {processingTab === 'records' && (
                          <div className="sections history-scroll" style={{ height: '100%', overflow: 'auto' }}>
                            {deposits.length === 0 && <p className="hint" style={{ padding: '20px', textAlign: 'center' }}>暂无沉淀记录</p>}
                            {deposits.length > 0 && (
                              <>
                                <div className="history-toolbar" style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>
                                  <div className="actions" style={{ gap: 6, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <button
                                      className="ghost small"
                                      type="button"
                                      onClick={() => void batchReplaySelectedDeposits()}
                                      disabled={batchReplayRunning || !Object.keys(selectedDepositIds || {}).some((k) => selectedDepositIds[k])}
                                    >
                                      批量 Replay
                                    </button>
                                    <label className="inline-check" style={{ gap: 6 }}>
                                      <input
                                        type="checkbox"
                                        checked={
                                          deposits.length > 0 &&
                                          Object.keys(selectedDepositIds || {}).filter((k) => selectedDepositIds[k]).length === deposits.length
                                        }
                                        onChange={(e) => (e.target.checked ? selectAllDeposits() : clearDepositSelection())}
                                      />
                                      <span className="hint">全选</span>
                                    </label>
                                    <button
                                      className="ghost small"
                                      type="button"
                                      onClick={deleteSelectedDeposits}
                                      disabled={!Object.keys(selectedDepositIds || {}).some((k) => selectedDepositIds[k])}
                                    >
                                      删除选中
                                    </button>
                                    <button
                                      className="ghost small"
                                      type="button"
                                      onClick={clearDepositSelection}
                                      disabled={!Object.keys(selectedDepositIds || {}).some((k) => selectedDepositIds[k])}
                                    >
                                      清空选择
                                    </button>
                                    <span className="pill muted">
                                      {Object.keys(selectedDepositIds || {}).filter((k) => selectedDepositIds[k]).length}/{deposits.length}
                                    </span>
                                  </div>
                                </div>
                                {deposits.map((dep, idx) => (
                                  <div key={dep.id} className="section">
                                    <div className="section-head" style={{ justifyContent: 'space-between' }}>
                                      <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                        <label className="inline-check" style={{ gap: 6 }}>
                                          <input
                                            type="checkbox"
                                            checked={!!selectedDepositIds?.[dep.id]}
                                            onChange={(e) => toggleDepositSelected(dep.id, e.target.checked)}
                                          />
                                        </label>
                                        <span className="pill muted">{idx + 1}</span>
                                        <span>{dep.name || dep.id}</span>
                                        <span className="meta">{dep.id}</span>
                                      </div>
                                      <div className="section-actions" style={{ gap: 6 }}>
                                        <button
                                          className="ghost xsmall"
                                          type="button"
                                          onClick={() => void replayDeposit(dep.id)}
                                          disabled={!!replayState?.[dep.id]?.running}
                                        >
                                          Replay
                                        </button>
                                        <button className="ghost xsmall" type="button" onClick={() => deleteDepositsByIds([dep.id])}>
                                          删除
                                        </button>
                                        <button
                                          className="ghost xsmall"
                                          type="button"
                                          onClick={() => setExpandedLogs((prev) => ({ ...prev, [dep.id]: !prev[dep.id] }))}
                                        >
                                          {expandedLogs[dep.id] ? '收起' : '展开'}
                                        </button>
                                      </div>
                                    </div>
                                    {expandedLogs[dep.id] && (
                                      <div className="sections" style={{ gap: 6, marginTop: '8px' }}>
                                        {(dep.sections || []).length === 0 && <div className="hint">暂无 section</div>}
                                        {(dep.sections || []).map((s, i) => (
                                          <div key={s.id} className="section" style={{ background: '#f8f9fa', padding: '8px' }}>
                                            <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                                              <span className="pill muted">{i + 1}</span> {s.action || '（无标题）'}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#666', whiteSpace: 'pre-wrap' }}>
                                              {s.content || '（无内容）'}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </EditableContentBlock>
                  {/* 旧按钮系统已移除 */}

                </div>
              </EditableLayoutPanel>
              {/* 操作调度面板 */}
              <EditableLayoutPanel
                panelId="operations-panel"
                panelName={getPanelTitle('operations-panel')}
                isEditing={isEditingLayout}
                onTitleEdit={() => setEditingTitleId('operations-panel')}
                titleStyle={panelPositions['operations-panel']?.titleStyle}
                className="operations-panel"
                position={panelPositions['operations-panel']}
                onPositionChange={(newPos) =>
                  setPanelPositions((prev) => ({ ...prev, 'operations-panel': newPos }))
                }
              >
                {/* 旧按钮系统已移除 */}
                {/* <EditableButtonsContainer
                panelId="operations-panel"
                buttons={buttonPositions['operations-panel']}
                isEditing={isEditingLayout}
                onButtonMouseDown={handleButtonMouseDown}
                onStyleEdit={handleStyleEdit}
                onClick={handleWorkbenchButtonClick}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  margin: 0,
                  padding: '12px',
                  background: 'transparent',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  zIndex: 2,
                  pointerEvents: 'none',
                }}
              /> */}
                <EditableContentBlock
                  blockId="operations-content"
                  panelId="operations-panel"
                  isEditing={isEditingLayout}
                  position={contentBlockPositions['operations-panel']}
                  onPositionChange={(newPos) =>
                    setContentBlockPositions(prev => ({ ...prev, 'operations-panel': newPos }))
                  }
                  hidden={deletedBlocks.includes('operations-panel')}
                  onDelete={() => handleDeleteBlock('operations-panel')}
                >
                  <div className="card">
                    <div className="card-head">
                      <div className="actions" style={{ gap: '6px' }}>
                        {!showOutlineMode && (
                          <>
                            <button
                              type="button"
                              className={`ghost small ${dispatchMode === 'doc' ? 'active' : ''}`}
                              onClick={() => setDispatchMode('doc')}
                            >
                              <FileText size={14} /> 对原文档处理
                            </button>
                            <button
                              type="button"
                              className={`ghost small ${dispatchMode === 'result' ? 'active' : ''}`}
                              onClick={() => setDispatchMode('result')}
                            >
                              <Sparkles size={14} /> 对模型返回内容
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <textarea
                      ref={dispatchInputRef}
                      rows={5}
                      placeholder="例如：一句话总结全文；从文档A粘贴到总结"
                    ></textarea>
                    {dispatchButtonCfg?.enabled ? (
                      <button className="ghost" onClick={runDispatch} disabled={dispatching || loading}>
                        <Play size={16} /> {(dispatchButtonCfg.label || '执行指令').toString()}
                      </button>
                    ) : (
                      <div className="hint">执行指令按钮已关闭</div>
                    )}
                  </div>
                </EditableContentBlock>
              </EditableLayoutPanel>
              <GlobalButtonsContainer
                buttons={globalButtons}
                isEditing={isEditingLayout}
                onMouseDown={handleGlobalButtonMouseDown}
                onStyleEdit={handleGlobalButtonStyleEdit}
                onClick={(btn) => {
                  if (btn.action === 'run_block') runOutlineBlock(btn.targetId);
                  if (btn.action === 'toggle_section') toggleSection(btn.targetId);
                  if (btn.kind === 'dispatch') runDispatch();
                  if (btn.kind === 'final_generate') runFinalGenerate();
                }}
                onDelete={handleDeleteButton}
              />
            </div>
          </LayoutEditContainer >
        ) : (
          <div style={{
            flex: 1,
            position: 'relative',
            minHeight: '600px',
            overflow: 'visible'
          }}>
            {/* 输入表单面板 */}
            {/* 输入表单面板已移除，功能合并至文档列?*/}

            {/* 文档列表面板 */}
            <EditableLayoutPanel
              panelId="document-list-panel"
              panelName={getPanelTitle('document-list-panel')}
              isEditing={false}
              titleStyle={panelPositions['document-list-panel']?.titleStyle}
              className="document-list-panel"
              position={panelPositions['document-list-panel']}
              onPositionChange={() => { }}
            >
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <div style={{
                  position: 'absolute',
                  left: contentBlockPositions['document-list-panel']?.left || 0,
                  top: contentBlockPositions['document-list-panel']?.top || 0,
                  width: contentBlockPositions['document-list-panel']?.width || 560,
                  height: contentBlockPositions['document-list-panel']?.height || 300,
                  overflow: 'hidden'
                }}>
                  <DocumentListPanelContent
                    docs={docs}
                    selectedDocId={selectedDocId}
                    setSelectedDocId={setSelectedDocId}
                    deleteDoc={deleteDoc}
                    uploadInputRef={uploadInputRef}
                    handleFilePick={handleFilePick}
                  />
                </div>
                {/* 独立的回放目录模?*/}
                <div style={{
                  position: 'absolute',
                  left: contentBlockPositions['document-replay-ui']?.left || 0,
                  top: contentBlockPositions['document-replay-ui']?.top || 0,
                  width: contentBlockPositions['document-replay-ui']?.width || 560,
                  height: contentBlockPositions['document-replay-ui']?.height || 46,
                  overflow: 'hidden'
                }}>
                  <ReplayDirectoryPanelContent
                    replayDirName={replayDirName}
                    pickReplayDirectory={pickReplayDirectory}
                    clearReplayDirectory={clearReplayDirectory}
                    replayDirHandle={replayDirHandle}
                  />
                </div>
                {/* 旧按钮系统已移除 */}
                {/* <EditableButtonsContainer
                panelId="document-list-panel"
                buttons={buttonPositions['document-list-panel']}
                isEditing={false}
                onButtonMouseDown={() => { }}
                onStyleEdit={() => { }}
                onClick={handleWorkbenchButtonClick}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  margin: 0,
                  padding: '12px',
                  background: 'transparent',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  zIndex: 2,
                  pointerEvents: 'none',
                }}
              /> */}
              </div>
            </EditableLayoutPanel>

            {/* 内容预览面板 */}
            <EditableLayoutPanel
              panelId="preview-panel"
              panelName={getPanelTitle('preview-panel')}
              isEditing={false}
              titleStyle={panelPositions['preview-panel']?.titleStyle}
              className="preview-panel"
              position={panelPositions['preview-panel']}
              onPositionChange={() => { }}
            >
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <ContentPreviewPanelContent
                  selectedDoc={selectedDoc}
                  processingTab={processingTab}
                  setProcessingTab={setProcessingTab}
                />
                {/* 旧按钮系统已移除 */}
                {/* <EditableButtonsContainer
                panelId="preview-panel"
                buttons={buttonPositions['preview-panel']}
                isEditing={false}
                onButtonMouseDown={() => { }}
                onStyleEdit={() => { }}
                onClick={handleWorkbenchButtonClick}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  margin: 0,
                  padding: '12px',
                  background: 'transparent',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  zIndex: 2,
                  pointerEvents: 'none',
                }}
              /> */}
              </div>
            </EditableLayoutPanel>

            {/* 文档处理面板 */}
            <EditableLayoutPanel
              panelId="processing-panel"
              panelName={getPanelTitle('processing-panel')}
              isEditing={false}
              titleStyle={panelPositions['processing-panel']?.titleStyle}
              className="processing-panel"
              position={panelPositions['processing-panel']}
              onPositionChange={() => { }}
            >
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#666',
                    minHeight: '100%',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  {/* 控制按钮 */}
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '12px',
                    borderBottom: '1px solid #e2e8f0',
                    padding: '8px 12px'
                  }}>
                    <button
                      className={`ghost small ${processingTab === 'outline' ? 'active' : ''}`}
                      onClick={() => setProcessingTab('outline')}
                      style={{
                        padding: '6px 12px',
                        fontSize: '13px',
                        fontWeight: processingTab === 'outline' ? 600 : 400
                      }}
                    >
                      大纲预览
                    </button>
                    <button
                      className={`ghost small ${processingTab === 'config' ? 'active' : ''}`}
                      onClick={() => setProcessingTab('config')}
                      style={{
                        padding: '6px 12px',
                        fontSize: '13px',
                        fontWeight: processingTab === 'config' ? 600 : 400
                      }}
                    >
                      个性化配置
                    </button>
                    <button
                      className={`ghost small ${processingTab === 'records' ? 'active' : ''}`}
                      onClick={() => setProcessingTab('records')}
                      style={{
                        padding: '6px 12px',
                        fontSize: '13px',
                        fontWeight: processingTab === 'records' ? 600 : 400
                      }}
                    >
                      操作记录
                    </button>
                  </div>

                  {/* 内容区域 */}
                  <div style={{ padding: '0 12px 12px', overflowY: 'auto', flex: 1 }}>
                    {processingTab === 'outline' && (
                      <div>
                        {/* 操作按钮区域 - 仅在大纲模式下显示 */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '12px' }}>
                          {globalButtons
                            .filter(b => b.kind === 'outline_extract' && b.enabled !== false)
                            .slice(0, 1) // Force single button
                            .map(btn => (
                              <button
                                key={btn.id}
                                className="small"
                                onClick={() => autoTemplate(btn)}
                                title={btn.prompt ? `Prompt: ${btn.prompt.slice(0, 50)}...` : '使用默认Prompt'}
                              >
                                {btn.label}
                              </button>
                            ))
                          }
                          <button
                            className="ghost small"
                            onClick={clearOutlineTemplate}
                            style={{ color: '#ef4444', borderColor: '#ef4444' }}
                          >
                            清除
                          </button>
                        </div>
                        {!template || !template.sections || template.sections.length === 0 ? (
                          <p style={{ fontSize: '13px', color: '#94a3b8', padding: '20px', textAlign: 'center' }}>暂无大纲数据，请点击右上角按钮抽取</p>
                        ) : (
                          template.sections.map((sec, idx) => renderOutlineNode({ section: sec, index: idx }))
                        )}
                      </div>
                    )}
                    {processingTab === 'config' && (
                      <div style={{ height: '100%', overflow: 'auto' }}>
                        <div style={{ padding: '12px', borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
                          <h4 style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 600 }}>全局按钮配置</h4>
                          <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>控制全局功能按钮的显示状态</p>
                        </div>
                        <div style={{ padding: '0 12px' }}>
                          {globalButtons.map((btn) => (
                            <label
                              key={btn.id}
                              style={{
                                display: 'block', // Changed to block to contain nested div
                                padding: '10px 0',
                                borderBottom: '1px solid #f0f0f0',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                                <div>
                                  <div style={{ fontSize: '13px', fontWeight: 500 }}>{btn.label}</div>
                                  <div style={{ fontSize: '11px', color: '#999' }}>{btn.kind}</div>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={btn.enabled !== false}
                                  disabled={btn.kind === 'outline_extract'}
                                  style={btn.kind === 'outline_extract' ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                                  title={btn.kind === 'outline_extract' ? '核心功能不可禁用' : ''}
                                  onChange={(e) => {
                                    if (btn.kind === 'outline_extract') return;
                                    const newEnabled = e.target.checked;
                                    const newButtons = globalButtons.map(b => (b.id === btn.id ? { ...b, enabled: newEnabled } : b));
                                    setGlobalButtons(newButtons);
                                    // 触发保存
                                    saveButtonConfig({ activeButtons: newButtons });
                                  }}
                                />
                              </div>
                              {/* Prompt 配置区域 - 仅针对大纲抽取类按钮 */}
                              {btn.kind === 'outline_extract' && (
                                <div style={{
                                  padding: '8px 0 4px',
                                  display: btn.enabled !== false ? 'block' : 'none'
                                }}>
                                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>自定义 Prompt:</div>
                                  <textarea
                                    value={btn.prompt || ''}
                                    onChange={(e) => {
                                      const newPrompt = e.target.value;
                                      const newButtons = globalButtons.map(b => (b.id === btn.id ? { ...b, prompt: newPrompt } : b));
                                      setGlobalButtons(newButtons);
                                      // 实时保存
                                      saveButtonConfig({ activeButtons: newButtons });
                                    }}
                                    placeholder="在此输入生成大纲的 Prompt 指令..."
                                    style={{
                                      width: '100%',
                                      minHeight: '60px',
                                      padding: '8px',
                                      fontSize: '12px',
                                      border: '1px solid #e2e8f0',
                                      borderRadius: '4px',
                                      resize: 'vertical',
                                      background: '#fff'
                                    }}
                                  />
                                </div>
                              )}
                            </label>
                          ))}
                          {globalButtons.length === 0 && (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '12px' }}>
                              暂无全局按钮
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {processingTab === 'records' && (
                      <div className="sections history-scroll" style={{ height: '100%', overflow: 'auto' }}>
                        {deposits.length === 0 && <p className="hint" style={{ padding: '20px', textAlign: 'center' }}>暂无沉淀记录</p>}
                        {deposits.length > 0 && (
                          <>
                            <div className="history-toolbar" style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>
                              <div className="actions" style={{ gap: 6, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                                <button
                                  className="ghost small"
                                  type="button"
                                  onClick={() => void batchReplaySelectedDeposits()}
                                  disabled={batchReplayRunning || !Object.keys(selectedDepositIds || {}).some((k) => selectedDepositIds[k])}
                                >
                                  批量 Replay
                                </button>
                                <label className="inline-check" style={{ gap: 6 }}>
                                  <input
                                    type="checkbox"
                                    checked={
                                      deposits.length > 0 &&
                                      Object.keys(selectedDepositIds || {}).filter((k) => selectedDepositIds[k]).length === deposits.length
                                    }
                                    onChange={(e) => (e.target.checked ? selectAllDeposits() : clearDepositSelection())}
                                  />
                                  <span className="hint">全选</span>
                                </label>
                                <button
                                  className="ghost small"
                                  type="button"
                                  onClick={deleteSelectedDeposits}
                                  disabled={!Object.keys(selectedDepositIds || {}).some((k) => selectedDepositIds[k])}
                                >
                                  删除选中
                                </button>
                                <button
                                  className="ghost small"
                                  type="button"
                                  onClick={clearDepositSelection}
                                  disabled={!Object.keys(selectedDepositIds || {}).some((k) => selectedDepositIds[k])}
                                >
                                  清空选择
                                </button>
                                <span className="pill muted">
                                  {Object.keys(selectedDepositIds || {}).filter((k) => selectedDepositIds[k]).length}/{deposits.length}
                                </span>
                              </div>
                            </div>
                            {deposits.map((dep, idx) => (
                              <div key={dep.id} className="section">
                                <div className="section-head" style={{ justifyContent: 'space-between' }}>
                                  <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                    <label className="inline-check" style={{ gap: 6 }}>
                                      <input
                                        type="checkbox"
                                        checked={!!selectedDepositIds?.[dep.id]}
                                        onChange={(e) => toggleDepositSelected(dep.id, e.target.checked)}
                                      />
                                    </label>
                                    <span className="pill muted">{idx + 1}</span>
                                    <span>{dep.name || dep.id}</span>
                                    <span className="meta">{dep.id}</span>
                                  </div>
                                  <div className="section-actions" style={{ gap: 6 }}>
                                    <button
                                      className="ghost xsmall"
                                      type="button"
                                      onClick={() => void replayDeposit(dep.id)}
                                      disabled={!!replayState?.[dep.id]?.running}
                                    >
                                      Replay
                                    </button>
                                    <button className="ghost xsmall" type="button" onClick={() => deleteDepositsByIds([dep.id])}>
                                      删除
                                    </button>
                                    <button
                                      className="ghost xsmall"
                                      type="button"
                                      onClick={() => setExpandedLogs((prev) => ({ ...prev, [dep.id]: !prev[dep.id] }))}
                                    >
                                      {expandedLogs[dep.id] ? '收起' : '展开'}
                                    </button>
                                  </div>
                                </div>
                                {expandedLogs[dep.id] && (
                                  <div className="sections" style={{ gap: 6, marginTop: '8px' }}>
                                    {(dep.sections || []).length === 0 && <div className="hint">暂无 section</div>}
                                    {(dep.sections || []).map((s, i) => (
                                      <div key={s.id} className="section" style={{ background: '#f8f9fa', padding: '8px' }}>
                                        <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                                          <span className="pill muted">{i + 1}</span> {s.action || '（无标题）'}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#666', whiteSpace: 'pre-wrap' }}>
                                          {s.content || '（无内容）'}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {/* 旧按钮系统已移除 */}
                {/* <EditableButtonsContainer
                panelId="processing-panel"
                buttons={buttonPositions['processing-panel']}
                isEditing={false}
                onButtonMouseDown={() => { }}
                onStyleEdit={() => { }}
                onClick={handleWorkbenchButtonClick}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  margin: 0,
                  padding: '12px',
                  background: 'transparent',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  zIndex: 2,
                  pointerEvents: 'none',
                }}
              /> */}
              </div>

            </EditableLayoutPanel>

            {/* 操作调度面板 */}
            <EditableLayoutPanel
              panelId="operations-panel"
              panelName={getPanelTitle('operations-panel')}
              isEditing={false}
              titleStyle={panelPositions['operations-panel']?.titleStyle}
              className="operations-panel"
              position={panelPositions['operations-panel']}
              onPositionChange={() => { }}
            >
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <textarea
                    ref={dispatchInputRef}
                    rows={5}
                    placeholder="例如：一句话总结全文；从文档A粘贴到总结"
                  ></textarea>
                  {dispatchButtonCfg?.enabled ? (
                    <button className="ghost" onClick={runDispatch} disabled={dispatching || loading}>
                      <Play size={16} /> {(dispatchButtonCfg.label || '执行指令').toString()}
                    </button>
                  ) : (
                    <div className="hint">执行指令按钮已关闭</div>
                  )}
                </div>
                {/* 旧按钮系统已移除 */}
                {/* <EditableButtonsContainer
                panelId="operations-panel"
                buttons={buttonPositions['operations-panel']}
                isEditing={false}
                onButtonMouseDown={() => { }}
                onStyleEdit={() => { }}
                onClick={handleWorkbenchButtonClick}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  margin: 0,
                  padding: '12px',
                  background: 'transparent',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  zIndex: 2,
                  pointerEvents: 'none',
                }}
              /> */}
              </div>
            </EditableLayoutPanel>
            <GlobalButtonsContainer
              buttons={globalButtons.filter(b => b.kind !== 'outline_extract')}
              isEditing={false}
              onMouseDown={() => { }}
              onStyleEdit={() => { }}
              onClick={(btn) => {
                if (btn.action === 'run_block') runOutlineBlock(btn.targetId);
                if (btn.action === 'toggle_section') toggleSection(btn.targetId);
                if (btn.kind === 'dispatch') runDispatch();
                if (btn.kind === 'final_generate') runFinalGenerate();
                if (btn.kind === 'outline_extract') autoTemplate(btn);
                if (btn.kind === 'upload_file') uploadInputRef.current?.click();
              }}
              onDelete={undefined}
            />
          </div >
        )
        }

        {/* 按钮样式编辑器 */}
        {
          editingButtonId && (() => {
            // 先尝试作为全局按钮 ID
            const globalButton = globalButtons.find(btn => btn.id === editingButtonId);

            if (globalButton) {
              // 全局按钮编辑
              return (
                <>
                  <div
                    style={{
                      position: 'fixed',
                      top: 0, left: 0, right: 0, bottom: 0,
                      background: 'rgba(0,0,0,0.2)',
                      zIndex: 9999
                    }}
                    onClick={() => setEditingButtonId(null)}
                  />
                  <div style={{ position: 'fixed', right: 20, top: 60, zIndex: 10000 }}>
                    <StyleEditor
                      button={globalButton}
                      label={globalButton.label}
                      onStyleChange={handleGlobalButtonStyleUpdate.bind(null, editingButtonId)}
                      onDelete={() => {
                        if (confirm('确定要删除这个按钮吗？')) {
                          deleteGlobalButton(editingButtonId);
                          setEditingButtonId(null);
                        }
                      }}
                      onClose={() => setEditingButtonId(null)}
                    />
                  </div>
                </>
              );
            }

            // 如果不是全局按钮，尝试作为旧格式面板按钮
            try {
              const { panelId, buttonId } = JSON.parse(editingButtonId);
              const button = buttonPositions[panelId]?.find(b => b.id === buttonId);
              if (button) {
                return (
                  <>
                    <div
                      style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.2)',
                        zIndex: 9999
                      }}
                      onClick={() => setEditingButtonId(null)}
                    />
                    <div style={{ position: 'fixed', right: 20, top: 60, zIndex: 10000 }}>
                      <StyleEditor
                        button={button}
                        label={button.label}
                        onStyleChange={(newStyle) => handleButtonUpdate(panelId, buttonId, newStyle)}
                        onDelete={() => handleDeleteButton()}
                        onClose={() => setEditingButtonId(null)}
                      />
                    </div>
                  </>
                );
              }
            } catch (e) {
              console.error(e);
            }
            return null;
          })()
        }
        {
          editingTitleId && (() => {
            const panelName = {
              'input-form-panel': '输入素材',
              'document-list-panel': '文档列表',
              'processing-panel': '文档处理',
              'preview-panel': '内容预览',
              'operations-panel': '操作调度',
            }[editingTitleId] || editingTitleId;
            const currentStyle = panelPositions[editingTitleId]?.titleStyle || {};

            return (
              <>
                <div
                  style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.2)',
                    zIndex: 9999
                  }}
                  onClick={() => setEditingTitleId(null)}
                />
                <div style={{ position: 'fixed', right: 20, top: 60, zIndex: 10000 }}>
                  <StyleEditor
                    button={{
                      id: 'title',
                      label: panelPositions[editingTitleId]?.customTitle || panelName,
                      style: currentStyle
                    }}
                    onStyleChange={({ style, label }) => {
                      setPanelPositions(prev => ({
                        ...prev,
                        [editingTitleId]: {
                          ...prev[editingTitleId],
                          titleStyle: style,
                          customTitle: label  // Save custom title text
                        }
                      }));
                    }}
                    onClose={() => setEditingTitleId(null)}
                    onDelete={undefined}  // Hide delete for panel title
                  />
                </div>
              </>
            );
          })()
        }
        {/* 主标题样式编辑器 */}
        {
          editingHeaderTitle && (() => {
            const titleConfig = headerTitles[editingHeaderTitle];

            return (
              <>
                <div
                  style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.2)',
                    zIndex: 9999
                  }}
                  onClick={() => setEditingHeaderTitle(null)}
                />
                <div style={{ position: 'fixed', right: 20, top: 60, zIndex: 10000 }}>
                  <StyleEditor
                    button={{
                      id: editingHeaderTitle,
                      label: titleConfig.text,
                      style: titleConfig.style || {}
                    }}
                    onStyleChange={({ style, label }) => {
                      setHeaderTitles(prev => ({
                        ...prev,
                        [editingHeaderTitle]: {
                          ...prev[editingHeaderTitle], // 保留 position, width, height
                          text: label,
                          style: style
                        }
                      }));
                    }}
                    onClose={() => setEditingHeaderTitle(null)}
                    onDelete={undefined}  // 不允许删除主标题
                  />
                </div>
              </>
            );
          })()
        }
        {toast && <div className="toast">{toast}</div>}

        {/* GlobalButtonsContainer 移到最后，利用 DOM 顺序保证不被遮挡 */}
        {/* GlobalButtonsContainer moved inside */}
      </main >
    </>
  );
}
