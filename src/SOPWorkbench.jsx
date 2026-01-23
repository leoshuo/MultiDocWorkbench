import { useEffect, useRef, useState, useCallback } from 'react';


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


import { API_BASE_URL } from './config';


import { DocumentPreviewModal } from './DocumentPreviewModal';


import { Pencil, Layout as LayoutIcon, Settings, Check, X, FileText, List, History, Sparkles, FolderOpen, Trash2, Plus, GripVertical, Type, AlignLeft, AlignCenter, AlignRight, Play, GalleryVerticalEnd, Save, RotateCcw, LogOut, Layout, ChevronLeft, Upload, Copy, Edit3 } from 'lucide-react';

const UI_TEXT = {
  t1: "应用端按钮配置",
  t2: "配置多文档处理工作台对话区按钮与沉淀集的对应关系",
  t3: "暂无应用端按钮",
  t4: "可选沉淀集",
  t5: "先选择左侧按钮，再勾选右侧沉淀集",
  t6: "暂无沉淀集",
  t7: "后管页面按钮逻辑",
  t8: "控制经验沉淀工作台按钮显示与逻辑配置",
  t9: "自定义 Prompt:",
  t10: "找回默认按钮",
  t11: "🤖 大模型Replay",
  t12: "📜 脚本Replay",
  t13: "沉淀",
  t14: "选择沉淀集",
  t15: "沉淀集：",
  t16: "沉淀集暂无沉淀",
  t17: "一级标题",
  t18: "二级标题",
  t19: "三级标题",
  t20: "四级标题",
  t21: "保存标题",
  t22: "取消",
  t23: "编辑标题",
  t24: "保存摘要",
  t25: "删除",
  t26: "编辑摘要",
  t27: "选择文档",
  t28: "添加文档",
  t29: "移除关联",
  t30: "复制全文",
  t31: "保存布局修改",
  t32: "完成编辑",
  t33: "取消编辑，恢复已保存布局",
  t34: "取消编辑",
  t35: "重置为默认布局",
  t36: "重置",
  t37: "按钮配置",
  t38: "可新增/编辑/删除；关闭则在大纲配置隐藏该按钮",
  t39: "暂无按钮",
  t40: "启用",
  t41: "编辑",
  t42: "编辑：",
  t43: "按钮名称",
  t44: "开",
  t45: "关闭",
  t46: "沉淀方式",
  t47: "数据源与输出",
  t48: "可新增/删除多条规则，用于分别配置“标题/摘要”的输出方式",
  t49: "新增一条",
  t50: "数据源",
  t51: "内容预览（当前文本框）",
  t52: "资源列表选中文档（已保存内容）",
  t53: "输出内容",
  t54: "标题",
  t55: "展示位置",
  t56: "删除",
  t57: "提示词（支持",
  t58: "占位符）",
  t59: "保存并生效",
  t60: "请选择要显示的列表",
  t61: "沉淀列表",
  t62: "沉淀集列表",
  t63: "暂无沉淀记录",
  t64: "拖动排序",
  t65: "点击修改顺序",
  t66: "保存",
  t67: "编辑名称",
  t68: "收起全部 section",
  t69: "展开全部 section",
  t70: "原因：",
  t71: "暂无 section",
  t72: "操作记录",
  t73: "灵活上传",
  t74: "输入来源",
  t75: "必须",
  t76: "可选",
  t77: "执行摘要",
  t78: "记录位置",
  t79: "保存后将通过大模型规范编译",
  t80: "后管页面按钮逻辑重配",
  t81: "完成并保存",
  t82: "编辑标题样式",
  t83: "切换应用端工作台",
  t84: "配置经验沉淀工作台按钮逻辑",
  t85: "点击启用编辑模式",
  t86: "编辑布局",
  t87: "结束沉淀",
  t88: "编辑模式中，主要功能区：1. 拖动/调整组件 2. 点击右侧箭头打开编辑控制（保存/回收）",
  t89: "填入摘要",
  t90: "选择文档以查看全文",
  t91: "最终文档生成",
  t92: "清除",
  t93: "暂无大纲数据，请点击右上角按钮抽取",
  t94: "动作执行",
  t95: "对原文档处理",
  t96: "对模型返回内容",
  t97: "批量修改选中",
  t98: "例如：一句话总结全文；从文档A粘贴到总结",
  t99: "执行指令按钮已关闭",
  t100: "清除全部",
  t101: "历史大纲",
  t102: "用户行为采集配置",
  t103: "启用点击流采集",
  t104: "停留时长阈值(秒)",
  t105: "采集采样率(%)",
  t106: "自动分类反馈",
  t107: "情感分析灵敏度",
  t108: "隐性SOP归纳配置",
  t109: "即时归纳可能模式",
  t110: "最小归纳样本数",
  t111: "历史大纲存档",
  t112: "保存当前大纲为存档",
  t113: "加载中...",
  t114: "暂无存档记录",
  t115: "包含",
  t116: "个章节",
  t117: "保存中...",
  t118: "未选择沉淀集",
  t119: "回放中...",
  t120: "双击编辑名称",
  t121: "点击编辑",
  t122: "未记录原因",
  t123: "未记录动作",
  t124: "编译中...",
  t125: "编译",
  t126: "未记录",
  t127: "暂无摘要",
  t128: "暂无内容",
  t129: "未记录信息",
  t130: "打开已隐藏面板",
  t131: "沉淀中...",
  t132: "AI自动优化",
  t133: "优化中...",
  t134: "使用此处",
  t135: "未命名文档",
  t136: "未命名存档",
  t137: "策略置信阈值",
  t138: "自迭代配置说明",
  t139: "配置系统自动学习与优化的策略参数",
  t140: "反馈结构化配置",
  t141: "自动沉淀",
  t142: "收起",
  t143: "展开",
  t144: "沉淀记录",
  t145: "执行指令",
  t146: "上传文件",
  t147: "使用默认Prompt",
  t148: "确认要删除该按钮吗？",
  t149: "输入素材",
  t150: "文档列表",
  t151: "文档处理",
  t152: "内容预览",
  t153: "操作调度",
  t154: "保存到后端失败，已保存到本地",
  t155: "确认要取消编辑吗？未保存的修改将丢失。",
  t156: "确定要重置为默认布局吗？",
  t157: "核心功能不可禁用",
  t158: "当前已包含所有默认按钮，无需恢复",
  t159: "检测到缺失：",
  t160: "个默认按钮，是否恢复？",
  t161: "已恢复缺失的默认按钮",
  t162: "上传文档",
  t163: "按钮",
  t164: "请输入沉淀集名称"
};








async function api(path, options = {}) {


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





function readFileText(file) {


  return new Promise((resolve, reject) => {


    const reader = new FileReader();


    reader.onload = () => resolve(reader.result.toString());


    reader.onerror = reject;


    reader.readAsText(file, 'utf-8');


  });


}





const isDocxName = (name) => (name || '').toString().trim().toLowerCase().endsWith('.docx');





const PROCESSING_TAB_SEQUENCE = ['tab_outline', 'tab_records', 'tab_config', 'tab_strategy'];

const PROCESSING_TAB_LABELS = {
  tab_outline: '大纲配置',
  tab_records: '沉淀配置',
  tab_config: '应用端按钮配置',
  tab_strategy: '自迭代配置'
};
const INPUT_SOURCE_PREFIX_RE = /^输入来源[:：]?\s*/;
const fixMojibake = (value) => {
  if (typeof value !== 'string') return value;
  if (!/[\u00C0-\u00FF]/.test(value)) return value;
  const bytes = Uint8Array.from(value, (ch) => ch.charCodeAt(0) & 0xff);
  const decoded = new TextDecoder('utf-8').decode(bytes);
  return /[\u4e00-\u9fff]/.test(decoded) ? decoded : value;
};
const isGarbledText = (value) =>
  typeof value === 'string' && (/\uFFFD/.test(value) || /\?{2,}/.test(value));
const sanitizeText = (value, fallback = '') => {
  if (value === null || value === undefined) return fallback;
  const fixed = fixMojibake((value || '').toString());
  const trimmed = fixed.trim();
  if (!trimmed || isGarbledText(trimmed)) return fallback;
  return trimmed;
};
const normalizeButtonText = (btn) => {
  if (!btn || typeof btn !== 'object') return btn;
  const next = { ...btn };
  if (typeof next.label === 'string') next.label = sanitizeText(next.label, '');
  if (typeof next.prompt === 'string') next.prompt = sanitizeText(next.prompt, '');
  if (typeof next.title === 'string') next.title = sanitizeText(next.title, '');
  return next;
};

const LEGACY_PROCESSING_TAB_LABELS = {
  tab_outline: ['大纲预览', '大纲模式', '大纲配置'],
  tab_records: ['沉淀记录', '沉淀列表', '沉淀配置'],
  tab_config: ['应用端按钮配置', '应用端配置', '应用端按钮'],
  tab_strategy: ['策略自更新配置', '自迭代配置']
};

const DEFAULT_SECTION_REQUIREMENTS = {


  inputSource: 'optional',


  actionExecution: 'optional',


  executionSummary: 'optional',


  recordLocation: 'optional'


};


const DEFAULT_APP_BUTTONS = [
  { id: 'app_btn_daily_merge', label: '日报合并写作（主任版）', groupIds: [] },
  { id: 'app_btn_competitor_report', label: '竞品分析报告写作', groupIds: [] },
  { id: 'app_btn_custom_write', label: '自定义写作', groupIds: [] }];






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


  return lines.


    join('\n').


    replace(/\n{3,}/g, '\n\n').


    trim();


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


    const level = Math.max(1, Math.min(4, rawLevel));


    const node = { section: sec, level, children: [] };





    while (stack.length && stack[stack.length - 1].level >= level) stack.pop();


    if (!stack.length) roots.push(node); else


      stack[stack.length - 1].node.children.push(node);





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

const SHARED_SCENE_KEY = 'shared_scene_id';




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





const DEFAULT_OUTLINE_BUTTON_PROMPT =
  `
请输出 JSON 数组：

[
  {"id":"...","title":"标题","summary":"不超过20字的摘要","hint":"提示","level":1-4}
]

要求：
- level 只取 1/2/3/4，默认 1
- title 必填
- summary 不超过20字
- hint 为1-2句
- 只输出 JSON

输入：
{{text}}
`.trim();


const DEFAULT_DISPATCH_SYSTEM_PROMPT =
  `
请输出 JSON：
- summary: 简要摘要
- detail: 详细说明
- edits: [{sectionId, field:'title'|'summary', content}]
只输出 JSON。
`.trim();


const DEFAULT_FINAL_SYSTEM_PROMPT =
  `
请输出 Markdown 格式的最终文档。
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


        target: 'title'


      },


      {


        id: 'io_migrated_2',


        enabled: true,


        dataSource: fallbackDataSource,


        output: 'summaries',


        target: fallbackOutputTarget


      }];





  }





  const normalized = rows.


    map((r, idx) => {


      const id = typeof r?.id === 'string' && r.id.trim() ? r.id.trim() : `io_${idx + 1}`;


      const enabled = r?.enabled !== false;


      const dataSource = r?.dataSource === 'selected_doc' ? 'selected_doc' : 'preview';


      const output = r?.output === 'summaries' ? 'summaries' : 'titles';


      const target = r?.target === 'title' ? 'title' : 'summary';


      return { id, enabled, dataSource, output, target };


    }).


    filter((r) => r.id);





  return normalized.length ? normalized : normalizeIoRows(null, fallback);


}





const DEFAULT_PRECIPITATION_MODE = 'llm';





const normalizePrecipitationMode = (value) => value === 'script' ? 'script' : 'llm';





function defaultLlmButtons() {


  return [


    {


      id: 'btn_outline_extract',


      kind: 'outline_extract',


      label: '全文大纲抽取',


      enabled: true,


      precipitationMode: 'llm',


      prompt: DEFAULT_OUTLINE_BUTTON_PROMPT,


      dataSource: 'preview', // legacy default for migration


      outputTarget: 'summary', // legacy default for migration


      io: [


        { id: 'io_default_1', enabled: true, dataSource: 'preview', output: 'titles', target: 'title' },


        { id: 'io_default_2', enabled: true, dataSource: 'preview', output: 'summaries', target: 'summary' }]





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


    }];





}





function loadLlmButtonsFromStorage() {


  try {


    const raw = localStorage.getItem(LLM_BUTTONS_STORAGE_KEY);


    if (!raw) return defaultLlmButtons();


    const parsed = JSON.parse(raw);


    if (!Array.isArray(parsed)) return defaultLlmButtons();


    const normalized = parsed.


      map((b, idx) => {


        const id = typeof b?.id === 'string' && b.id.trim() ? b.id.trim() : `btn_${idx + 1}`;


        const kind =


          b?.kind === 'dispatch' || b?.kind === 'final_generate' || b?.kind === 'outline_extract' || b?.kind === 'outline_action' ?


            b.kind :


            'outline_extract';


        const label = typeof b?.label === 'string' ? b.label : '';


        const enabled = !!b?.enabled;


        const dataSource = b?.dataSource === 'selected_doc' ? 'selected_doc' : 'preview';


        const promptDefault =


          kind === 'dispatch' ?


            DEFAULT_DISPATCH_SYSTEM_PROMPT :


            kind === 'final_generate' ?


              DEFAULT_FINAL_SYSTEM_PROMPT :


              kind === 'outline_action' ?


                DEFAULT_DISPATCH_SYSTEM_PROMPT :


                DEFAULT_OUTLINE_BUTTON_PROMPT;


        const prompt = typeof b?.prompt === 'string' ? b.prompt : promptDefault;


        const outputTarget = b?.outputTarget === 'title' ? 'title' : 'summary';


        const io = normalizeIoRows(b?.io, { dataSource, outputTarget });


        const precipitationMode = normalizePrecipitationMode(b?.precipitationMode);


        return { id, kind, label, enabled, prompt, io, precipitationMode };


      }).


      filter((b) => b.id);


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


    return parsed.


      map((d) => ({


        id: typeof d?.id === 'string' && d.id.trim() ? d.id.trim() : `沉淀_${Date.now()}`,


        name: typeof d?.name === 'string' && d.name.trim() ? fixMojibake(d.name).trim() : undefined,


        createdAt: typeof d?.createdAt === 'number' ? d.createdAt : Date.now(),


        precipitationMode: normalizePrecipitationMode(d?.precipitationMode),


        sections: Array.isArray(d?.sections) ? d.sections.map((s) => ({
          ...s,
          action: fixMojibake(s?.action),
          content: fixMojibake(s?.content),
          summary: fixMojibake(s?.summary),
          hint: fixMojibake(s?.hint)
        })) : []


      })).


      filter((d) => d.id);


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


  const [showOutlineMode, setShowOutlineMode] = useState(true);


  const [processingTab, setProcessingTab] = useState('outline'); // 'outline' | 'records' | 'config'

  // 沉淀配置的显示模式: 'deposits' | 'groups' - 互斥切换
  const [depositViewMode, setDepositViewMode] = useState('deposits');

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
  
  // 标题折叠状态：当某个标题被折叠时，其下级标题将被隐藏
  const [sectionCollapsed, setSectionCollapsed] = useState({}); // sectionId -> bool


  const [isDepositing, setIsDepositing] = useState(false);


  const [isEditingLayout, setIsEditingLayout] = useState(false); // 编辑界面模式








  // 左列：内容预览（上）、输入素材（中）、文档列表（下）


  // 右列：文档处理（上）、操作调度（下）


  const DEFAULT_LAYOUT = {


    'preview-panel': { left: 20, top: 20, width: 600, height: 360 },


    // 'input-form-panel' removed


    'document-list-panel': { left: 20, top: 396, width: 600, height: 376 }, // Expanded to fill gap


    'processing-panel': { left: 636, top: 20, width: 550, height: 376 },


    'operations-panel': { left: 636, top: 412, width: 550, height: 360 }


  };





  const [panelPositions, setPanelPositions] = useState(() => {





    let saved = null;


    try {


      const stored = localStorage.getItem('layout_panel_positions');


      if (stored) saved = JSON.parse(stored);


    } catch (e) {


      console.warn('Failed to load layout', e);


    }





    // 验证单个面板位置是否有效


    const isValid = (pos) => pos && pos.width > 100 && pos.height > 100;








    if (saved) {





      if (saved['input-panel'] && !saved['input-form-panel']) {


        console.log('[Layout Migration] 检测到旧版4面板配置，正在迁移到5面板配置...');








        const oldInput = saved['input-panel'];


        const splitHeight = Math.floor(oldInput.height / 2) - 10;





        saved['input-form-panel'] = {


          left: oldInput.left,


          top: oldInput.top,


          width: oldInput.width,


          height: splitHeight


        };





        saved['document-list-panel'] = {


          left: oldInput.left,


          top: oldInput.top + splitHeight + 20,


          width: oldInput.width,


          height: splitHeight


        };








        delete saved['input-panel'];








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


            height: listPanel.top - inputPanel.top + listPanel.height // Covers gap + old input height


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








      const result = { ...DEFAULT_LAYOUT };


      Object.keys(DEFAULT_LAYOUT).forEach((panelId) => {


        if (saved[panelId] && isValid(saved[panelId])) {


          result[panelId] = saved[panelId];


        }


      });





      return result;


    }





    // 没有保存的配置，使用默认布局


    console.log('[Panel Init] 使用默认布局，DEFAULT_LAYOUT:', DEFAULT_LAYOUT);


    const defaultCopy = { ...DEFAULT_LAYOUT };


    console.log('[Panel Init] 返回的配?', defaultCopy);


    return defaultCopy;


  }); // 面板位置和大?














  const [layoutSize, setLayoutSize] = useState(() => {


    try {


      const stored = localStorage.getItem('layout_size');


      if (stored) {


        const parsed = JSON.parse(stored);


        if (parsed && Number(parsed.width) > 0 && Number(parsed.height) > 0) {


          return { width: Number(parsed.width), height: Number(parsed.height) };


        }


      }


    } catch (_) {





      /* ignore */
    }


    return { width: 1800, height: 1200 };


  });





  // 内容块位置（编辑模式下可调整?


  const DEFAULT_CONTENT_BLOCKS = {


    'input-form-panel': { left: 10, top: 10, width: 560, height: 400 },





    'document-list-panel': { left: 10, top: 10, width: 560, height: 300 },


    'document-replay-ui': { left: 10, top: 320, width: 560, height: 46 }, // New default position


    // 'preview-panel' content split into textarea and toolbar


    'preview-textarea': { left: 10, top: 10, width: 420, height: 250 },


    'preview-toolbar': { left: 10, top: 270, width: 420, height: 50 },


    'processing-panel': { left: 10, top: 60, width: 1060, height: 720 },


    'processing-tabs': { left: 10, top: 10, width: 560, height: 44 },


    'processing-records-toolbar': { left: 10, top: 60, width: 560, height: 36 },


    'processing-records-list': { left: 10, top: 108, width: 1060, height: 650 },


    'operations-panel': { left: 10, top: 10, width: 1100, height: 300 }


  };





  const [contentBlockPositions, setContentBlockPositions] = useState(() => {


    try {


      const stored = localStorage.getItem('layout_content_blocks');


      if (stored) {


        const parsed = JSON.parse(stored);


        // Merge with defaults to ensure all panels have entries


        const merged = { ...DEFAULT_CONTENT_BLOCKS, ...parsed };


        const toolbar = merged['processing-records-toolbar'];


        // 工具栏高度已改为单行布局，不再需要强制设置高度
        if (toolbar && Number(toolbar.height) > 50) {
          merged['processing-records-toolbar'] = { ...toolbar, height: 36 };
        }


        return merged;


      }


    } catch (e) {


      console.warn('Failed to load content block positions', e);


    }


    return DEFAULT_CONTENT_BLOCKS;


  });





  const mergeButtonConfigWithDefaults = (incoming) => {


    if (!incoming || typeof incoming !== 'object') {


      return { ...DEFAULT_BUTTON_CONFIG };


    }





    const source = { ...incoming };





    if (source['input-panel'] && !source['input-form-panel']) {


      source['input-form-panel'] = source['input-panel'] || [];


      delete source['input-panel'];


    }





    const merged = { ...DEFAULT_BUTTON_CONFIG };


    Object.keys(DEFAULT_BUTTON_CONFIG).forEach((panelId) => {


      if (Array.isArray(source[panelId])) {


        merged[panelId] = source[panelId];


      }


    });





    if (merged['input-form-panel']) {


      merged['input-form-panel'] = merged['input-form-panel'].filter(


        (b) => b.id !== 'btn_input_import_text'


      );


    }





    if (Array.isArray(merged['processing-tabs'])) {


      const defaults = DEFAULT_BUTTON_CONFIG['processing-tabs'] || [];


      const byKind = new Map(merged['processing-tabs'].map((btn) => [btn.kind, btn]));


      const defaultsByKind = new Map(defaults.map((btn) => [btn.kind, btn]));


      let legacyDetected = false;


      let normalized = defaults.map((def) => {


        const existing = byKind.get(def.kind);


        if (!existing) return def;


        const existingLabel = typeof existing?.label === 'string' ? sanitizeText(existing.label, '') : '';
        if (LEGACY_PROCESSING_TAB_LABELS[def.kind]?.includes(existingLabel)) {


          legacyDetected = true;


        }


        return { ...existing, label: PROCESSING_TAB_LABELS[def.kind] || def.label };


      });


      if (legacyDetected) {


        normalized = normalized.map((btn) => {


          const def = defaultsByKind.get(btn.kind);


          if (!def) return btn;


          return {


            ...btn,


            left: def.left,


            top: def.top,


            width: def.width,


            height: def.height


          };


        });


      }


      merged['processing-tabs'] = normalized.concat(


        merged['processing-tabs'].filter((btn) => !defaults.some((def) => def.kind === btn.kind))


      );


    }





    Object.keys(merged).forEach((panelId) => {
      if (!Array.isArray(merged[panelId])) return;
      const defaults = DEFAULT_BUTTON_CONFIG[panelId] || [];
      const defaultsByKind = new Map(defaults.map((btn) => [btn.kind, btn]));
      const defaultsById = new Map(defaults.map((btn) => [btn.id, btn]));
      merged[panelId] = merged[panelId].map((btn) => {
        const normalizedBtn = normalizeButtonText(btn);
        const fallback =
          defaultsById.get(btn.id)?.label ||
          defaultsByKind.get(btn.kind)?.label ||
          normalizedBtn.label ||
          btn.label ||
          '';
        const label = sanitizeText(normalizedBtn.label, fallback);
        return { ...normalizedBtn, label };
      });
    });

    if (Array.isArray(merged['processing-records-toolbar'])) {


      // 旧版配置检测：如果 group_new 和 group_update 在第二行（top: 44），需要迁移到第一行
      const legacyGroupPositions = {
        group_new: { left: 12, top: 44 },
        group_update: { left: 122, top: 44 },
      };


      const toolbarDefaults = DEFAULT_BUTTON_CONFIG['processing-records-toolbar'] || [];


      const byKind = new Map(merged['processing-records-toolbar'].map((btn) => [btn.kind, btn]));


      const isLegacy = Object.entries(legacyGroupPositions).every(([kind, pos]) => {


        const btn = byKind.get(kind);


        return btn && Number(btn.left) === pos.left && Number(btn.top) === pos.top;


      });


      if (isLegacy) {


        merged['processing-records-toolbar'] = merged['processing-records-toolbar'].map((btn) => {


          const def = toolbarDefaults.find((item) => item.kind === btn.kind);


          if (!def) return btn;


          return {


            ...btn,


            left: def.left,


            top: def.top,


            width: def.width,


            height: def.height


          };


        });


      }


    }





    return merged;


  };





  const [buttonPositions, setButtonPositions] = useState(() => {





    let cached = loadButtonConfig();








    if (!cached) {


      return DEFAULT_BUTTON_CONFIG;


    }








    if (cached['input-panel'] && !cached['input-form-panel']) {


      console.log('[Button Migration] 检测到旧版4面板按钮配置，正在迁移到5面板配置...');








      cached['input-form-panel'] = cached['input-panel'] || [];





      // document-list-panel 使用默认配置


      cached['document-list-panel'] = DEFAULT_BUTTON_CONFIG['document-list-panel'] || [];








      delete cached['input-panel'];





      console.log('[Button Migration] 迁移完成');


    }








    return mergeButtonConfigWithDefaults(cached);


  }); // 按钮配置状态（全局化）


  const [globalButtons, setGlobalButtons] = useState(() => {


    try {


      // 先尝试加载新格式配置


      const newConfig = localStorage.getItem('global-buttons-config');


      if (newConfig) {


        const parsed = JSON.parse(newConfig);


        if (parsed.activeButtons) {


          console.log('[GlobalButtons] Loaded from new format:', parsed.activeButtons.length, 'buttons');


          // Auto-fix: Ensure '全文大纲抽取' has the correct kind


          const fixedButtons = parsed.activeButtons.map((btn) => {
            const normalizedBtn = normalizeButtonText(btn);


            if (normalizedBtn.label === '全文大纲抽取' && !normalizedBtn.kind) {


              console.log('[GlobalButtons] Auto-fixing missing kind for outline_extract button');


              return { ...normalizedBtn, kind: 'outline_extract' };


            }


            return normalizedBtn;


          });


          return fixedButtons;


        }


      }








      const oldConfig = loadButtonConfig();


      if (oldConfig && Object.keys(oldConfig).length > 0) {


        console.log('[GlobalButtons] Migrating from old format...');





        backupConfig(oldConfig, 'app-button-config');


        cleanOldBackups('app-button-config', 3);





        // 迁移到新格式


        const migrated = migrateButtonConfig(oldConfig, panelPositions);
        migrated.activeButtons = (migrated.activeButtons || []).map((btn) => normalizeButtonText(btn));





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








  const [deletedBlocks, setDeletedBlocks] = useState(() => {


    try {


      const stored = localStorage.getItem('layout_deleted_blocks');


      return stored ? JSON.parse(stored) : [];


    } catch (e) {


      return [];


    }


  });








  const [showRecycleBin, setShowRecycleBin] = useState(false);





  // Ensure recyle bin is hidden on edit mode toggle


  useEffect(() => {


    setShowRecycleBin(false);


  }, [isEditingLayout]);





  // Load config from backend


  useEffect(() => {


    api('/api/config/all').


      then((data) => {


        let hasServerData = false;





        if (data.layout && Object.keys(data.layout).length > 0) {


          setPanelPositions((prev) => ({ ...prev, ...data.layout }));


          hasServerData = true;


        }


        if (data.globalButtons && data.globalButtons.activeButtons) {


          const fixedButtons = data.globalButtons.activeButtons.map((btn) => {


            if (btn.label === '全文大纲抽取' && !btn.kind) {


              console.log('[GlobalButtons] Auto-fixing missing kind for outline_extract button (backend)');


              return { ...btn, kind: 'outline_extract' };


            }


            return btn;


          });





          if (!fixedButtons.some((b) => b.id === 'btn_input_upload_file')) {


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


        } else if (data.buttons && data.buttons.activeButtons) {


          // Auto-fix: Ensure '全文大纲抽取' has the correct kind


          const fixedButtons = data.buttons.activeButtons.map((btn) => {


            if (btn.label === '全文大纲抽取' && !btn.kind) {


              console.log('[GlobalButtons] Auto-fixing missing kind for outline_extract button (backend)');


              return { ...btn, kind: 'outline_extract' };


            }


            return btn;


          });





          // Auto-restore 'upload_file' button if missing


          if (!fixedButtons.some((b) => b.id === 'btn_input_upload_file')) {


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


          setContentBlockPositions((prev) => ({ ...prev, ...data.contentBlocks }));


          hasServerData = true;


        }


        if (data.deletedBlocks && Array.isArray(data.deletedBlocks)) {


          setDeletedBlocks(data.deletedBlocks);


          hasServerData = true;


        }


        if (Array.isArray(data.llmButtons) && data.llmButtons.length > 0) {


          try {


            localStorage.setItem(LLM_BUTTONS_STORAGE_KEY, JSON.stringify(data.llmButtons));


            setLlmButtons(loadLlmButtonsFromStorage());


            hasServerData = true;


          } catch (_) {





            /* ignore */
          }


        }


        if (data.headerTitles && typeof data.headerTitles === 'object') {


          setHeaderTitles((prev) => ({ ...prev, ...data.headerTitles }));


          hasServerData = true;


        }


        if (data.layoutSize && Number(data.layoutSize.width) > 0 && Number(data.layoutSize.height) > 0) {


          setLayoutSize({ width: Number(data.layoutSize.width), height: Number(data.layoutSize.height) });


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


          const localHeaderTitles = localStorage.getItem('workbench_header_titles');


          const localLayoutSize = localStorage.getItem('layout_size');


          const localLlmButtons = localStorage.getItem(LLM_BUTTONS_STORAGE_KEY);





          if (localLayout || localButtons || localBlocks || localHeaderTitles || localLayoutSize || localLlmButtons) {


            const payload = {


              layout: localLayout ? JSON.parse(localLayout) : panelPositions,


              globalButtons: localButtons ? JSON.parse(localButtons) : { activeButtons: globalButtons },


              contentBlocks: localBlocks ? JSON.parse(localBlocks) : contentBlockPositions,


              deletedBlocks: localDeleted ? JSON.parse(localDeleted) : deletedBlocks,


              headerTitles: localHeaderTitles ? JSON.parse(localHeaderTitles) : headerTitles,


              layoutSize: localLayoutSize ? JSON.parse(localLayoutSize) : layoutSize,


              llmButtons: localLlmButtons ? JSON.parse(localLlmButtons) : llmButtons


            };





            api('/api/config/save', {


              method: 'POST',


              body: payload


            }).then(() => console.log('Synced local config to server'));


          }


        }


      }).


      catch((e) => console.warn('Failed to load backend config, using local storage', e));


  }, []);








  const [savedLayout, setSavedLayout] = useState(null);


  const [savedButtons, setSavedButtons] = useState(null);


  const [savedContentBlocks, setSavedContentBlocks] = useState(null);


  const [editingButtonId, setEditingButtonId] = useState(null);


  const [editingTitleId, setEditingTitleId] = useState(null);


  const [draggingButton, setDraggingButton] = useState(null);


  const [depositSections, setDepositSections] = useState([]);


  const [deposits, setDeposits] = useState(() => loadDepositsFromStorage());


  const [depositSeq, setDepositSeq] = useState(() => loadDepositsSeqFromStorage());


  const [selectedDepositIds, setSelectedDepositIds] = useState({}); // depositId -> bool


  const [depositEditing, setDepositEditing] = useState({}); // key -> draft text


  const [expandedDepositSections, setExpandedDepositSections] = useState({}); // depositId -> {sectionId: bool}


  const [compilingDepositSections, setCompilingDepositSections] = useState({}); // depositId||sectionId -> bool


  const [draggingDepositId, setDraggingDepositId] = useState('');


  const [dragOverDepositId, setDragOverDepositId] = useState('');


  const [depositGroups, setDepositGroups] = useState([]);


  const [selectedDepositGroupId, setSelectedDepositGroupId] = useState('');


  const [depositGroupReplay, setDepositGroupReplay] = useState({});


  const [batchReplayRunning, setBatchReplayRunning] = useState(false);


  const [appButtonsConfig, setAppButtonsConfig] = useState(DEFAULT_APP_BUTTONS);


  const [appButtonsSaving, setAppButtonsSaving] = useState(false);

  // Replay 目录配置状态
  // 配置的目录路径用于服务端自动加载文件进行 Replay
  const [replayDirConfig, setReplayDirConfig] = useState({ dirPath: '', autoLoadFiles: true });
  const [replayDirConfigSaving, setReplayDirConfigSaving] = useState(false);


  const [showBackofficeConfig, setShowBackofficeConfig] = useState(false);


  const [selectedAppButtonId, setSelectedAppButtonId] = useState('');








  const [headerTitles, setHeaderTitles] = useState(() => {
    const defaultHeaderTitles = {
      eyebrow: {
        text: 'EXPERIENCE STUDIO',
        style: {},
        position: { left: 0, top: 0 },
        width: 200,
        height: 30
      },
      title: {
        text: '经验沉淀工作台',
        style: {},
        position: { left: 0, top: 24 },
        width: 200,
        height: 40
      }
    };
    const normalizeText = (value, fallback) => sanitizeText(value, fallback);
    try {
      const stored = localStorage.getItem('workbench_header_titles');
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          eyebrow: {
            ...defaultHeaderTitles.eyebrow,
            ...(parsed?.eyebrow || {}),
            text: normalizeText(parsed?.eyebrow?.text, defaultHeaderTitles.eyebrow.text)
          },
          title: {
            ...defaultHeaderTitles.title,
            ...(parsed?.title || {}),
            text: normalizeText(parsed?.title?.text, defaultHeaderTitles.title.text)
          }
        };
      }
    } catch (e) {
      console.warn('Failed to load header titles', e);
    }
    return defaultHeaderTitles;
  });
  const [editingHeaderTitle, setEditingHeaderTitle] = useState(null); // 'eyebrow' | 'title' | null


  const [draggingHeaderTitle, setDraggingHeaderTitle] = useState(null);


  const [resizingHeaderTitle, setResizingHeaderTitle] = useState(null);








  const getPanelTitle = (panelId) => {
    const defaultTitles = {
      'input-form-panel': UI_TEXT.t149,
      'document-list-panel': UI_TEXT.t150,
      'processing-panel': UI_TEXT.t151,
      'preview-panel': UI_TEXT.t152,
      'operations-panel': UI_TEXT.t153
    };
    const fallbackTitle = defaultTitles[panelId] || panelId;
    const customTitle = sanitizeText(panelPositions[panelId]?.customTitle, '');
    return customTitle || fallbackTitle;
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


          enabled: true


        };


        newButtons = [newBtn, ...newButtons];


        shouldUpdate = true;


      }


    } else if (hasExtract.enabled === false) {


      // Force enable


      newButtons = newButtons.map((b) => b.id === hasExtract.id ? { ...b, enabled: true } : b);


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





  const [outlineHistory, setOutlineHistory] = useState([]);


  const [historyLoading, setHistoryLoading] = useState(false);


  const [showHistoryModal, setShowHistoryModal] = useState(false);


  const [showDocPreviewModal, setShowDocPreviewModal] = useState(false);

  // 沉淀确认弹窗状态
  const [showDepositConfirmModal, setShowDepositConfirmModal] = useState(false);
  const [depositConfirmData, setDepositConfirmData] = useState(null); // { sections, userRequirements, aiOptimizedContent, isProcessing }
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(-1); // -1 表示显示全部，>=0 表示选中某个 section

  // 更新沉淀集弹窗状态
  const [showUpdateGroupModal, setShowUpdateGroupModal] = useState(false);
  const [updateGroupSelectedIds, setUpdateGroupSelectedIds] = useState([]); // 选中的沉淀集ID列表

  const [buttonDraft, setButtonDraft] = useState(null);





  const [llmButtons, setLlmButtons] = useState(() => loadLlmButtonsFromStorage());


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
    if (kind === 'manual_text') return `文本输入：${input.length ?? 0}字`;
    if (kind === 'upload_file') return `上传文件：${input.docName || UI_TEXT.t135}`;
    if (kind === 'doc_preview') return `预览文档：${input.docName || ''}`;
    if (kind === 'doc_resource') return `文档资源：${input.docName || ''}`;
    if (kind === 'selection')
      return `选区：${input.docName || ''} 区间：${input.start ?? 0}-${input.end ?? 0}`;
    if (kind === 'outline_selected')
      return `已选标题：${Array.isArray(input.sectionIds) ? input.sectionIds.length : input.count ?? 0}条`;
    if (kind === 'doc_link_pick')
      return `关联标题：${input.sectionId || ''} 文档：${input.docName || ''}`;
    return kind ? `${kind}` : JSON.stringify(input);
  };

  const describeDestination = (dest) => {
    if (!dest) return '';
    if (typeof dest === 'string') return dest;
    if (typeof dest !== 'object') return String(dest);
    const kind = (dest.kind || dest || '').toString();
    // 优先使用标题（sectionTitle）而非序号（sectionId）
    const getSectionLabel = () => dest.sectionTitle || dest.sectionId || '';
    if (kind === 'outline_apply') return `大纲应用：${dest.count ?? 0}条`;
    if (kind === 'outline_section_summary') return `摘要写入：${getSectionLabel()}`;
    if (kind === 'outline_section_summary_batch')
      return `摘要写入：${dest.count ?? (Array.isArray(dest.sectionIds) ? dest.sectionIds.length : 0)}条`;
    if (kind === 'outline_section_title') return `标题写入：${getSectionLabel()}`;
    if (kind === 'outline_section_docs') return `文档关联：${getSectionLabel()}`;
    if (kind === 'dispatch_result') return '指令结果';
    if (kind === 'final_preview') return '最终预览';
    return kind ? `${kind}` : JSON.stringify(dest);
  };

  const formatOpContent = (meta, extraLines = []) => {
    const m = meta && typeof meta === 'object' ? meta : {};
    const inputs = Array.isArray(m.inputs) ? m.inputs : [];
    const destinations = Array.isArray(m.destinations) ? m.destinations : [];
    const lines = [];

    if (m.type === 'add_doc') {
      const docName = inputs.find((i) => i.kind === 'upload_file')?.docName || UI_TEXT.t135;
      lines.push('已上传文档：' + docName);
    } else {
      const record = (m.record || m.process || UI_TEXT.t71).toString().slice(0, 50);
      lines.push('操作记录：' + record);
    }

    if (inputs.length) {
      const inputDesc = inputs.map(describeInput).filter(Boolean).join('；');
      lines.push('输入：' + inputDesc);
    }

    if (m.process) {
      let actionDesc = (m.process || '').toString();
      lines.push('动作：' + actionDesc);
    }

    if (m.outputs && m.outputs.summary) {
      lines.push('输出摘要：' + (m.outputs.summary || '').toString());
    }

    if (destinations.length) {
      const destDesc = destinations.map(describeDestination).filter(Boolean).join('；');
      lines.push('记录位置：' + destDesc);
    }

    if (Array.isArray(extraLines) && extraLines.length) {
      lines.push('');
      lines.push(...extraLines.filter(Boolean));
    }

    return lines.join('\n').trim();
  };

  const parseDepositSectionContent = (content) => {
    const raw = (content || '').toString();
    const idx = raw.indexOf(REPLAY_META_MARKER);
    const base = idx === -1 ? raw.trim() : raw.slice(0, idx).trim();
    const lines = base.
      split(/\r?\n/).
      map((line) => line.trim()).
      filter(Boolean);

    const recordLine =
      lines.find((line) => line.startsWith('\u64cd\u4f5c\u8bb0\u5f55\uff1a')) ||
      lines.find((line) => line.startsWith('\u64cd\u4f5c\u8bb0\u5f55')) ||
      lines.find((line) => line.startsWith('\u64cd\u4f5c\uff1a')) ||
      '';

    const operationRecord = recordLine ? recordLine.replace(/^\u64cd\u4f5c\u8bb0\u5f55\uff1a?/, '').trim() : '';
    const actionExecution =
      (lines.find((line) => line.startsWith('\u52a8\u4f5c\u6267\u884c\uff1a')) || '').
        replace(/^\u52a8\u4f5c\u6267\u884c\uff1a?/, '').
        trim();
    const executionSummary =
      (lines.find((line) => line.startsWith('\u6267\u884c\u6458\u8981\uff1a')) || '').
        replace(/^\u6267\u884c\u6458\u8981\uff1a?/, '').
        trim();
    const recordLocation =
      (lines.find((line) => line.startsWith('\u8bb0\u5f55\u4f4d\u7f6e\uff1a')) || '').
        replace(/^\u8bb0\u5f55\u4f4d\u7f6e\uff1a?/, '').
        trim();
    const inputLine = lines.find((line) => line.startsWith('\u8f93\u5165\u6765\u6e90\uff1a')) || '';

    return {
      operationRecord,
      actionExecution,
      executionSummary,
      recordLocation,
      inputLine: inputLine.replace(/^\u8f93\u5165\u6765\u6e90\uff1a?/, '').trim()
    };
  };

  const normalizeRequirement = (value) => value === 'required' ? 'required' : 'optional';





  const getSectionRequirements = (section) => {


    const meta = extractReplayMeta(section?.content || '') || {};


    const raw = section?.requirements || meta?.requirements || {};


    return {


      inputSource: normalizeRequirement(raw.inputSource),


      actionExecution: normalizeRequirement(raw.actionExecution),


      executionSummary: normalizeRequirement(raw.executionSummary),


      recordLocation: normalizeRequirement(raw.recordLocation)


    };


  };





  const resolvePrecipitationMode = (meta) => {


    if (meta?.precipitationMode) return normalizePrecipitationMode(meta.precipitationMode);


    const buttonId = meta?.buttonId;


    if (buttonId) {


      const btn = llmButtons.find((b) => b.id === buttonId);


      if (btn?.precipitationMode) return normalizePrecipitationMode(btn.precipitationMode);


    }


    return DEFAULT_PRECIPITATION_MODE;


  };


  const logSectionWithMeta = (action, meta, extraLines) => {
    // ===== 自动沉淀记录原则 =====
    // 核心原则：记录足够的上下文信息，让大模型能够理解用户意图并执行 Replay
    // 记录五要素：
    //   1. 输入来源：用户基于什么类型的内容操作（记录内容类型、上下文信息）
    //   2. 动作执行：用户点击了什么按钮（记录按钮类型、动作类型）
    //   3. 记录位置：回写作用在什么地方（使用标题定位，而非序号）
    //   4. 执行摘要：结果输出了什么（记录输出摘要）
    //   5. 上下文环境：当前系统状态（文档列表、大纲状态等）
    // 
    // 大模型 Replay 会读取这些信息，理解意图后执行，而非严格脚本匹配

    // 需要排除的编辑框内容字段（这些是用户输入的具体文本，不应记录）
    // 注意：instructions 不再排除，因为 dispatch 需要保留指令内容用于 Replay
    const EXCLUDED_FIELDS = [
      'prompt',          // 自定义 prompt 内容
      'userInput',       // 用户输入内容
      'textContent',     // 文本内容
      'rawContent',      // 原始内容
      'fullContent',     // 完整内容
      'editValue',       // 编辑值
      'dispatchInput'    // 调度输入
    ];

    // 过滤掉编辑框内容字段
    const filteredMeta = { ...(meta || {}) };
    EXCLUDED_FIELDS.forEach(field => {
      delete filteredMeta[field];
    });

    // 收集当前上下文环境（帮助 AI 理解操作背景）
    const currentContext = {
      sceneId: scene?.id || null,
      // 当前加载的文档
      loadedDocs: Array.isArray(docs) ? docs.map(d => ({ id: d.id, name: d.name })).slice(0, 10) : [],
      loadedDocsCount: Array.isArray(docs) ? docs.length : 0,
      // 当前大纲状态
      hasOutline: !!(scene?.customTemplate?.sections?.length || scene?.template?.sections?.length),
      outlineSectionsCount: scene?.customTemplate?.sections?.length || scene?.template?.sections?.length || 0,
      outlineSectionTitles: (scene?.customTemplate?.sections || scene?.template?.sections || [])
        .slice(0, 10).map(s => s.title || '未命名'),
      // 时间戳
      timestamp: Date.now()
    };

    const safeMeta = {
      v: OP_META_VERSION,
      ts: Date.now(),
      // === 要素1：动作执行（按钮操作） ===
      buttonAction: meta?.buttonAction || meta?.type || action,
      buttonLabel: meta?.buttonLabel || '',
      buttonId: meta?.buttonId || '',
      type: meta?.type || action,
      precipitationMode: resolvePrecipitationMode(meta),
      // === 文档相关（用于 add_doc、delete_doc、outline_extract 等） ===
      docName: meta?.docName || '',
      selectedDocName: meta?.selectedDocName || '',
      docId: meta?.docId || '',
      // === 大纲相关（用于 restore_history_outline 等） ===
      outlineId: meta?.outlineId || '',
      outlineTitle: meta?.outlineTitle || '',
      // === 目标章节相关（用于 insert_to_summary、edit_title 等） ===
      targetSectionIds: meta?.targetSectionIds || [],
      targetSectionId: meta?.targetSectionId || '',
      targetSectionTitle: meta?.targetSectionTitle || '',
      // === 操作意图描述（帮助 AI 理解） ===
      intentDescription: meta?.intentDescription || action,
      expectedResult: meta?.expectedResult || '',
      // === 保留操作相关字段 ===
      record: meta?.record || '',
      overwritten: meta?.overwritten,
      source: meta?.source || '',
      // === 要素2：输入来源（记录内容摘要、上下文、来源位置） ===
      inputs: Array.isArray(meta?.inputs) ? meta.inputs.map(inp => ({
        kind: inp.kind,
        docName: inp.docName || '',
        contextSummary: inp.contextSummary || inp.docName || '',
        sourceType: inp.sourceType || inp.kind,
        // 选中内容的核心信息
        textExcerpt: inp.textExcerpt ? clipText(inp.textExcerpt, 200) : undefined,
        textLength: inp.textLength,
        // 上下文信息：这段内容的前后文（帮助 AI 理解语境）
        contextBefore: inp.contextBefore ? clipText(inp.contextBefore, 80) : undefined,
        contextAfter: inp.contextAfter ? clipText(inp.contextAfter, 80) : undefined,
        // 位置信息
        selectionStart: inp.start,
        selectionEnd: inp.end
      })) : [],
      inputKind: meta?.inputKind || '',
      inputSourceType: meta?.inputSourceType || meta?.inputKind || '',
      // === 要素3：记录位置（优先使用标题，而非序号） ===
      destinations: Array.isArray(meta?.destinations) ? meta.destinations.map(dest => {
        if (typeof dest === 'string') return dest;
        if (typeof dest === 'object') {
          return {
            kind: dest.kind,
            sectionTitle: dest.sectionTitle || dest.label || '',
            sectionId: dest.sectionId,
            count: dest.count
          };
        }
        return dest;
      }) : [],
      // === 要素4：执行摘要（结果输出） ===
      outputs:
        meta?.outputs && typeof meta.outputs === 'object' ?
          {
            summary: meta.outputs.summary || '',
            usedModel: meta.outputs.usedModel || '',
            detailExcerpt: meta.outputs.detailExcerpt ? clipText(meta.outputs.detailExcerpt, 100) : undefined,
            // 完整输出内容（不截断，用于 Replay 对比）
            outputContent: meta.outputs.outputContent || '',
            outputContentExcerpt: meta.outputs.outputContent ? clipText(meta.outputs.outputContent, 500) : undefined,
            // 完整 edits 详情（用于 Replay）
            edits: Array.isArray(meta.outputs.edits) ? meta.outputs.edits : [],
            editsCount: meta.outputs.editsCount,
            status: meta.outputs.status || 'done',
            // 记录输出的目标位置
            targetSections: meta.outputs.targetSections || [],
            // 大纲抽取专用：生成的完整大纲结构
            generatedSections: meta.outputs.generatedSections || []
          } :
          meta?.outputs,
      // 操作记录（简短描述）
      process: meta?.process ? clipText(meta.process, 100) : undefined,
      // === dispatch 执行指令专用字段 ===
      // 动作描述（泛化的操作描述）
      actionDescription: meta?.actionDescription || '',
      // 指令内容（完整保留，用于 Replay）
      instructions: meta?.instructions || '',
      promptContent: meta?.promptContent || meta?.instructions || '',
      inputSourceDesc: meta?.inputSourceDesc || '',
      outputTargetDesc: meta?.outputTargetDesc || '',
      // 输入内容（完整保留，用于 Replay 对比）
      inputContent: meta?.inputContent || '',
      inputContentExcerpt: meta?.inputContent ? clipText(meta.inputContent, 500) : undefined,
      // 目标位置详细信息（包含级别、标题、原始摘要）
      targetSectionsDetail: meta?.targetSectionsDetail || [],
      // === AI 指导（用于大模型 Replay）===
      aiGuidance: meta?.aiGuidance || '',
      // === 特殊要求字段（所有操作通用） ===
      specialRequirements: meta?.specialRequirements || '无',
      // === 新增/删除标题专用字段 ===
      afterSection: meta?.afterSection || null,
      newSection: meta?.newSection || null,
      targetSection: meta?.targetSection || null,
      removedSections: meta?.removedSections || [],
      // === 要素5：上下文环境（帮助 AI 理解操作背景） ===
      context: currentContext
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


      showToast('已选择回放目录');


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
    showToast('已清空回放目录');


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


    if (!replayDirHandle) throw new Error('未选择回放目录，请先选择文件夹目录');


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


    if (!replayDirHandle) throw new Error('未选择回放目录，请先选择文件夹目录');


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


      const desc = s.description ? '“' + s.description + '”' : '';


      const hint =


        s.kind === 'regex' ?


          'regex=' + (s.pattern || '(空)') :


          'keywords=' + ((s.keywords || []).join('、') || '(空)') + (s.extension ? ' ext=' + s.extension : '');


      throw new Error('回放目录未找到匹配文件' + desc + '，' + hint);


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


    if (!scene?.id) throw new Error('scene 未初始化，无法获取大纲');


    const io = normalizeIoRows(btn?.io, { dataSource: btn?.dataSource, outputTarget: btn?.outputTarget });


    const enabledRows = io.filter((r) => r.enabled);


    if (!enabledRows.some((r) => r.output === 'titles')) {


      throw new Error('按钮配置缺少“输入标题”的规则');


    }





    let doc = null;


    if (preferDocName) {


      const id = findDocIdByName(preferDocName);


      if (id) doc = docs.find((d) => d.id === id); else


        if (replayDirHandle) doc = await uploadDocFromReplayDirByName(preferDocName);


    }


    if (!doc) doc = docs.find((d) => d.id === selectedDocId) || null;


    if (!doc) throw new Error('请先选择一个文档作为数据源');





    const previewText =


      doc?.id && doc.id === selectedDocId && (docDraft || '').toString().trim() ?


        docDraft :


        (doc.content || '').toString();


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


        showToast('内容安全拦截，已降级为规则提取。');


      } else {


        throw new Error('未配置 QWEN_API_KEY，未启用大模型，请在 server.js 中设置环境变量。');


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


      })


    };





    const applyRes = await api(`/api/scene/${scene.id}/apply-template`, { method: 'POST', body: { template: transformedTemplate } });


    setTemplate(applyRes.template);


    setScene(applyRes.scene);


    setShowOutlineMode(true);








    try {


      const historyItem = {


        id: `outline_${Date.now()}`,


        template: applyRes.template,


        timestamp: Date.now(),


        docName: doc.name || '未命名文档',


        title: doc.name || '未命名文档'


      };


      await api('/api/multi/outlines', { method: 'POST', body: historyItem });


      setOutlineHistory((prev) => [historyItem, ...prev]);


    } catch (e) {


      console.error('自动保存历史大纲失败', e);


    }





    return applyRes?.template?.sections?.length || 0;


  };





  useEffect(() => {


    try {


      localStorage.setItem(LLM_BUTTONS_STORAGE_KEY, JSON.stringify(llmButtons));


    } catch (_) {





      /* ignore */
    }


    api('/api/config/save', { method: 'POST', body: { llmButtons } }).catch((e) => {


      console.warn('保存按钮配置失败', e);


    });


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

  // ========== 大纲缓存同步：template 变更时自动同步到服务端 ==========
  useEffect(() => {
    // 仅当 template 有实际内容时同步
    if (!template || !template.sections || !template.sections.length) return;

    const syncOutlineCache = async () => {
      try {
        await api('/api/outline/cache', { method: 'POST', body: { template } });
      } catch (e) {
        console.log('同步大纲缓存失败', e);
      }
    };

    // 延迟同步，避免频繁请求
    const timer = setTimeout(syncOutlineCache, 500);
    return () => clearTimeout(timer);
  }, [template]);

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





        const buttonsRes = await api('/api/buttons');


        if (buttonsRes?.buttons && validateButtonConfig(buttonsRes.buttons)) {


          const mergedButtons = mergeButtonConfigWithDefaults(buttonsRes.buttons);


          setButtonPositions(mergedButtons);


          setSavedButtons(mergedButtons);


        }


      } catch (err) {


        console.error('加载按钮配置失败:', err);


        // 降级到localStorage


        const cached = loadButtonConfig();


        if (cached) {


          const mergedButtons = mergeButtonConfigWithDefaults(cached);


          setButtonPositions(mergedButtons);


          setSavedButtons(mergedButtons);


        }

      }

      // 优先从服务端缓存加载大纲（工作台切换时保持）
      let cachedTemplate = null;
      try {
        const cacheRes = await api('/api/outline/cache');
        if (cacheRes?.template) {
          cachedTemplate = cacheRes.template;
        }
      } catch (e) {
        console.log('大纲缓存加载失败，使用默认模板', e);
      }

      const tplRes = await api('/api/template');
      // 如果有缓存的大纲，优先使用缓存
      setTemplate(cachedTemplate || tplRes.template);

      const docRes = await api('/api/docs');

      const sharedScene = await loadSharedScene();

      if (sharedScene) {

        setScene(sharedScene);

        setSectionDocLinks(sharedScene.sectionDocLinks || {});

      }

      setDocs(docRes.docs || []);

      if ((docRes.docs || []).length) setSelectedDocId(docRes.docs[0].id);




      // 加载操作沉淀记录


      await reloadDeposits(true);


      await reloadDepositGroups(true);





      try {


        const appButtonsRes = await api(`/api/multi/app-buttons`);


        const normalized = normalizeAppButtons(appButtonsRes);


        if (normalized.length) setAppButtonsConfig(normalized);


      } catch (e) {


        console.error('加载应用端按钮配置失败', e);


      }


      // 加载 Replay 目录配置
      try {
        const replayConfigRes = await api(`/api/multi/replay/config`);
        if (replayConfigRes) {
          setReplayDirConfig({
            dirPath: replayConfigRes.dirPath || '',
            autoLoadFiles: replayConfigRes.autoLoadFiles !== false
          });
        }
      } catch (e) {
        console.error('加载 Replay 目录配置失败', e);
      }





      // 加载历史大纲


      try {


        const outlines = await api('/api/multi/outlines');


        if (Array.isArray(outlines)) setOutlineHistory(outlines);


      } catch (e) { console.error('加载历史大纲失败', e); }





    };


    init().catch((err) => showToast(err.message));


  }, []);





  useEffect(() => {

    if (scene?.sectionDocLinks) {

      setSectionDocLinks(scene.sectionDocLinks);

    }

  }, [scene]);



  useEffect(() => {

    if (scene?.id) {

      localStorage.setItem(SHARED_SCENE_KEY, scene.id);

    }

  }, [scene?.id]);




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


      precipitationMode: normalizePrecipitationMode(btn?.precipitationMode),


      io: normalizeIoRows(btn?.io, { dataSource: btn?.dataSource, outputTarget: btn?.outputTarget })


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


        target: 'summary'


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


        io: io.map((r) => r.id === ruleId ? { ...r, ...patch } : r)


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


      setButtonDraft((prev) => prev ? { ...prev, prompt: nextPrompt } : prev);


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


      outputTarget: buttonDraft?.outputTarget


    });


    const enabledRows = io.filter((r) => r.enabled);


    if (buttonDraft?.kind === 'outline_extract' && !enabledRows.some((r) => r.output === 'titles')) {


      showToast('请至少保留一条“输入标题”的规则');


      return;


    }


    const next = {


      ...buttonDraft,


      label: (buttonDraft.label || '').toString().trim(),


      enabled: !!buttonDraft.enabled,


      prompt: (buttonDraft.prompt || '').toString(),


      precipitationMode: normalizePrecipitationMode(buttonDraft?.precipitationMode),


      io


    };


    setLlmButtons((prev) => prev.map((b) => b.id === next.id ? next : b));


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


      precipitationMode: DEFAULT_PRECIPITATION_MODE,


      prompt: DEFAULT_OUTLINE_BUTTON_PROMPT,


      io: [


        { id: `io_${Date.now()}_1`, enabled: true, dataSource: 'preview', output: 'titles', target: 'title' },


        { id: `io_${Date.now()}_2`, enabled: true, dataSource: 'preview', output: 'summaries', target: 'summary' }]





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


    const ok = window.confirm(`确认删除按钮“${btn.label}”？`);


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


    const newDeleted = deletedBlocks.filter((id) => id !== blockId);


    setDeletedBlocks(newDeleted);


    localStorage.setItem('layout_deleted_blocks', JSON.stringify(newDeleted));


  };





  const handlePermanentDeleteBlock = (blockId) => {
    if (!confirm('确认要永久删除该组件吗？此操作不可撤销。')) return;
    const newDeleted = deletedBlocks.filter((id) => id !== blockId);
    setDeletedBlocks(newDeleted);
    localStorage.setItem('layout_deleted_blocks', JSON.stringify(newDeleted));
  };





  const toggleLlmButtonEnabled = (id, enabled) => {


    setLlmButtons((prev) => prev.map((b) => b.id === id ? { ...b, enabled: !!enabled } : b));


  };





  const logSection = (action, content) => {


    if (!isDepositing) return;


    setDepositSections((prev) => [


      ...prev,


      {


        id: `sec_${Date.now()}_${prev.length + 1}`,


        action,


        content,


        requirements: { ...DEFAULT_SECTION_REQUIREMENTS }


      }]


    );


  };





  const startDeposit = () => {


    setIsDepositing(true);


    setDepositSections([]);


    showToast('自动沉淀已开始');


  };





  const endDeposit = () => {
    if (!isDepositing) return;

    // 检查是否有正在执行的大模型操作
    if (dispatching || loading) {
      showToast('请等待当前操作完成后再结束沉淀');
      return;
    }

    if (depositSections.length === 0) {
      setIsDepositing(false);
      showToast('没有记录到任何操作');
      return;
    }

    // 打开确认弹窗，让用户补充要求并由 AI 优化
    // 生成初始的结构化脚本内容（基于录制的操作）
    const initialScript = generateInitialScript(depositSections);
    
    setDepositConfirmData({
      sections: [...depositSections],
      userRequirements: '',
      structuredScript: initialScript,  // 可编辑的结构化脚本
      aiOptimizedContent: null,
      isProcessing: false,
      depositName: '',
      precipitationMode: 'llm'  // 默认大模型沉淀，用户可选择 'script'
    });
    setSelectedSectionIndex(-1);  // 默认显示全部
    setShowDepositConfirmModal(true);
  };

  // 生成初始结构化脚本（基于录制内容，包含详细上下文）
  const generateInitialScript = (sections) => {
    if (!sections || sections.length === 0) return '';
    const lines = [];
    lines.push('【沉淀脚本】');
    lines.push('');
    
    sections.forEach((s, i) => {
      lines.push(`=== 步骤 ${i + 1}: ${s.action || '操作'} ===`);
      
      // 提取关键信息
      const content = s.content || '';
      const metaMatch = content.match(/__REPLAY_META__\n(.+)/s);
      
      if (metaMatch) {
        try {
          const meta = JSON.parse(metaMatch[1]);
          const type = meta.type || meta.buttonAction || '';
          
          // 基本信息
          lines.push(`【操作类型】${type}`);
          
          // 根据不同操作类型展示详细信息
          if (type === 'insert_to_summary' || type === 'fill_summary') {
            // 填入摘要 - 展示完整上下文
            const inputs = meta.inputs || [];
            const selectionInput = inputs.find(inp => inp.kind === 'selection');
            const outlineInput = inputs.find(inp => inp.kind === 'outline_selected');
            
            // 1. 来源文档
            const docName = meta.docName || selectionInput?.docName || '未记录';
            lines.push(`【来源文档】${docName}`);
            
            // 2. 选中的内容（作为内容描述）
            const textExcerpt = selectionInput?.textExcerpt || selectionInput?.text || '';
            if (textExcerpt) {
              lines.push(`【选中内容】${textExcerpt.slice(0, 150)}${textExcerpt.length > 150 ? '...' : ''}`);
              // 生成内容描述，供大模型 Replay 时查找
              lines.push(`【内容描述】需要从文档中找到与以下内容相似或相同的段落："${textExcerpt.slice(0, 100)}${textExcerpt.length > 100 ? '...' : ''}"`);
            }
            
            // 3. 上下文（前后文）- 用于定位
            const contextBefore = selectionInput?.contextBefore || '';
            const contextAfter = selectionInput?.contextAfter || '';
            if (contextBefore || contextAfter) {
              lines.push(`【内容上下文】`);
              if (contextBefore) lines.push(`  前文特征: "${contextBefore}"`);
              if (contextAfter) lines.push(`  后文特征: "${contextAfter}"`);
            }
            
            // 4. 作用位置（目标标题）
            const outputs = meta.outputs || {};
            const targetSections = outputs.targetSections || [];
            const destinations = meta.destinations || [];
            if (targetSections.length > 0) {
              const titles = targetSections.map(t => t.title || '未命名').join('、');
              lines.push(`【目标标题】填入到以下标题的摘要中：${titles}`);
            } else if (destinations.length > 0) {
              const destTitles = destinations.map(d => d.sectionTitle || d.kind || '').filter(Boolean).join('、');
              if (destTitles) lines.push(`【目标标题】${destTitles}`);
            }
            
            // 5. 执行结果
            if (outputs.summary) {
              lines.push(`【执行结果】${outputs.summary}`);
            }
            lines.push(`【特殊要求】${meta.specialRequirements || '无'}`);
            
          } else if (type === 'add_doc' || type === 'upload_doc') {
            // 添加文档
            lines.push(`【文档名称】${meta.docName || '未记录'}`);
            const outputs = meta.outputs || {};
            if (outputs.summary) lines.push(`【执行结果】${outputs.summary}`);
            lines.push(`【特殊要求】${meta.specialRequirements || '无'}`);
            
          } else if (type === 'outline_extract') {
            // 大纲抽取 - 完整详细记录
            
            // 1. 动作描述
            if (meta.actionDescription) {
              lines.push(`【动作描述】${meta.actionDescription}`);
            }
            
            // 2. 来源文档
            lines.push(`【来源文档】${meta.selectedDocName || meta.docName || '未记录'}`);
            
            // 3. 输入内容摘要
            const inputExcerpt = meta.inputContentExcerpt || '';
            if (inputExcerpt) {
              const excerpt = inputExcerpt.length > 200 ? inputExcerpt.substring(0, 200) + '...' : inputExcerpt;
              lines.push(`【输入内容】${excerpt}`);
            }
            
            // 4. 输出结果 - 完整大纲结构
            const outputs = meta.outputs || {};
            const generatedSections = outputs.generatedSections || [];
            if (generatedSections.length > 0) {
              lines.push(`【生成大纲】共 ${generatedSections.length} 个标题：`);
              generatedSections.slice(0, 10).forEach((s, i) => {
                const levelText = s.levelText || `${s.level}级`;
                lines.push(`  ${i + 1}. [${levelText}] ${s.title}`);
                if (s.summary) {
                  const summaryExcerpt = s.summary.length > 80 ? s.summary.substring(0, 80) + '...' : s.summary;
                  lines.push(`     摘要：${summaryExcerpt}`);
                }
              });
              if (generatedSections.length > 10) {
                lines.push(`  ... 还有 ${generatedSections.length - 10} 个标题`);
              }
            } else {
              const context = meta.context || {};
              if (context.outlineSectionsCount) {
                lines.push(`【抽取结果】生成 ${context.outlineSectionsCount} 个标题`);
              }
              if (context.outlineSectionTitles?.length) {
                lines.push(`【标题列表】${context.outlineSectionTitles.slice(0, 5).join('、')}${context.outlineSectionTitles.length > 5 ? '...' : ''}`);
              }
            }
            
            // 5. AI 指导
            if (meta.aiGuidance) {
              lines.push(`【AI指导】${meta.aiGuidance}`);
            }
            
            lines.push(`【特殊要求】${meta.specialRequirements || '无'}`);
            
          } else if (type === 'add_outline_section') {
            // 新增标题 - 完整详细记录
            
            // 1. 动作描述
            if (meta.actionDescription) {
              lines.push(`【动作描述】${meta.actionDescription}`);
            }
            
            // 2. 参考标题（插入位置）
            const afterSection = meta.afterSection;
            if (afterSection) {
              lines.push(`【参考标题】${afterSection.levelText || `${afterSection.level}级`}标题「${afterSection.title}」`);
              if (afterSection.summary) {
                const excerpt = afterSection.summary.length > 100 ? afterSection.summary.substring(0, 100) + '...' : afterSection.summary;
                lines.push(`  摘要：${excerpt}`);
              }
            } else {
              lines.push(`【参考标题】在大纲末尾新增`);
            }
            
            // 3. 新增的标题信息
            const newSection = meta.newSection;
            if (newSection) {
              lines.push(`【新增标题】${newSection.levelText || `${newSection.level}级`}标题「${newSection.title}」`);
              if (newSection.summary) {
                lines.push(`  摘要：${newSection.summary}`);
              }
            }
            
            // 4. AI 指导
            if (meta.aiGuidance) {
              lines.push(`【AI指导】${meta.aiGuidance}`);
            }
            
            lines.push(`【特殊要求】${meta.specialRequirements || '无'}`);
            
          } else if (type === 'delete_outline_section') {
            // 删除标题 - 完整详细记录
            
            // 1. 动作描述
            if (meta.actionDescription) {
              lines.push(`【动作描述】${meta.actionDescription}`);
            }
            
            // 2. 被删除的目标标题
            const targetSection = meta.targetSection;
            if (targetSection) {
              lines.push(`【目标标题】${targetSection.levelText || `${targetSection.level}级`}标题「${targetSection.title}」`);
              if (targetSection.summary) {
                const excerpt = targetSection.summary.length > 100 ? targetSection.summary.substring(0, 100) + '...' : targetSection.summary;
                lines.push(`  摘要：${excerpt}`);
              }
            }
            
            // 3. 所有被删除的标题详情
            const removedSections = meta.removedSections || [];
            if (removedSections.length > 0) {
              lines.push(`【删除详情】共删除 ${removedSections.length} 个标题：`);
              removedSections.slice(0, 8).forEach((s, i) => {
                lines.push(`  ${i + 1}. [${s.levelText || `${s.level}级`}] ${s.title}`);
              });
              if (removedSections.length > 8) {
                lines.push(`  ... 还有 ${removedSections.length - 8} 个标题`);
              }
            }
            
            // 4. AI 指导
            if (meta.aiGuidance) {
              lines.push(`【AI指导】${meta.aiGuidance}`);
            }
            
            lines.push(`【特殊要求】${meta.specialRequirements || '无'}`);
            
          } else if (type === 'restore_history_outline') {
            // 恢复历史大纲
            lines.push(`【大纲名称】${meta.outlineTitle || meta.outlineId || '未记录'}`);
            const outputs = meta.outputs || {};
            if (outputs.summary) lines.push(`【执行结果】${outputs.summary}`);
            lines.push(`【特殊要求】${meta.specialRequirements || '无'}`);
            
          } else if (type === 'dispatch' || type === 'execute_instruction') {
            // 执行指令 - 完整详细记录
            
            // 1. 动作描述
            const actionDesc = meta.actionDescription || '';
            if (actionDesc) {
              lines.push(`【动作描述】${actionDesc}`);
            }
            
            // 2. Prompt 内容（核心指令）
            const promptContent = meta.promptContent || meta.instructions || meta.process || '';
            if (promptContent) {
              lines.push(`【指令内容】${promptContent}`);
            }
            
            // 3. 输入来源和输入内容
            const inputSourceDesc = meta.inputSourceDesc || '';
            const inputKind = meta.inputKind || '';
            if (inputSourceDesc) {
              lines.push(`【输入来源】${inputSourceDesc}`);
            } else if (inputKind) {
              const kindMap = { 
                'doc': '文档内容', 
                'result': '上一次结果', 
                'batch_outline': '大纲标题',
                'outline_selected_batch': '已选大纲标题（批量）',
                'outline_unprocessed_docs': '未处理文档'
              };
              lines.push(`【输入来源】${kindMap[inputKind] || inputKind}`);
            }
            
            // 输入内容（显示实际输入的文本摘要）
            const inputContent = meta.inputContent || meta.inputContentExcerpt || '';
            if (inputContent) {
              const excerpt = inputContent.length > 300 ? inputContent.substring(0, 300) + '...' : inputContent;
              lines.push(`【输入内容】${excerpt}`);
            }
            
            // 4. 目标位置详细信息
            const targetSections = meta.targetSectionsDetail || [];
            if (targetSections.length > 0) {
              lines.push(`【目标位置】共 ${targetSections.length} 个标题：`);
              targetSections.forEach((t, i) => {
                const levelText = t.levelText || `${t.level || 1}级`;
                lines.push(`  ${i + 1}. ${levelText}标题「${t.title}」`);
                if (t.originalSummary) {
                  const summaryExcerpt = t.originalSummary.length > 100 ? t.originalSummary.substring(0, 100) + '...' : t.originalSummary;
                  lines.push(`     原内容：${summaryExcerpt}`);
                }
              });
            } else {
              // 兼容旧格式
              const selectedTitles = meta.selectedSectionTitles || [];
              if (selectedTitles.length > 0) {
                lines.push(`【目标标题】${selectedTitles.join('、')}`);
              }
            }
            
            // 输出目标描述
            const outputTargetDesc = meta.outputTargetDesc || '';
            if (outputTargetDesc) {
              lines.push(`【输出目标】${outputTargetDesc}`);
            }
            
            // 5. 输出内容和编辑详情
            const outputs = meta.outputs || {};
            
            // 显示 edits 详情（实际修改了什么）
            const edits = outputs.edits || [];
            if (edits.length > 0) {
              lines.push(`【输出编辑】共 ${edits.length} 处修改：`);
              edits.forEach((edit, i) => {
                const newVal = edit.newValueExcerpt || edit.newValue || '';
                const excerpt = newVal.length > 150 ? newVal.substring(0, 150) + '...' : newVal;
                lines.push(`  ${i + 1}. 字段: ${edit.field || 'summary'}`);
                lines.push(`     新值: ${excerpt}`);
              });
            } else if (outputs.outputContent) {
              const excerpt = outputs.outputContent.length > 300 ? outputs.outputContent.substring(0, 300) + '...' : outputs.outputContent;
              lines.push(`【输出内容】${excerpt}`);
            } else if (outputs.summary) {
              lines.push(`【执行结果】${outputs.summary}`);
            }
            
            // 6. AI 指导信息
            const aiGuidance = meta.aiGuidance || '';
            if (aiGuidance) {
              lines.push(`【AI指导】${aiGuidance}`);
            }
            
            // 7. 特殊要求
            const specialReqs = meta.specialRequirements || '';
            if (specialReqs && specialReqs !== '无') {
              lines.push(`【特殊要求】${specialReqs}`);
            }
            
          } else {
            // 其他类型 - 通用展示
            if (meta.docName) lines.push(`【相关文档】${meta.docName}`);
            if (meta.outlineTitle) lines.push(`【相关大纲】${meta.outlineTitle}`);
            if (meta.process) lines.push(`【操作描述】${meta.process}`);
            const outputs = meta.outputs || {};
            if (outputs.summary) lines.push(`【执行结果】${outputs.summary}`);
            lines.push(`【特殊要求】${meta.specialRequirements || '无'}`);
          }
          
          // 通用上下文信息
          const context = meta.context || {};
          if (context.loadedDocsCount > 0) {
            lines.push(`【当前环境】已加载 ${context.loadedDocsCount} 个文档`);
          }
          
        } catch (e) { 
          // 解析失败时，显示原始内容摘要
          lines.push(`【原始记录】${content.slice(0, 200)}...`);
        }
      } else {
        // 没有 meta 时，显示原始内容
        lines.push(`【原始记录】${content.slice(0, 200)}...`);
      }
      
      lines.push('');
    });
    
    lines.push('---');
    lines.push('提示: 点击「AI 智能优化」可将上述内容转化为更通用的结构化脚本');
    return lines.join('\n');
  };

  // 从完整脚本中提取某个步骤的内容
  const getScriptForSection = (fullScript, sectionIndex) => {
    if (!fullScript || sectionIndex < 0) return fullScript || '';
    
    // 尝试匹配 [步骤N] 格式（AI 优化后）
    const aiFormatRegex = /(\[步骤\d+\][^\[]*?)(?=\[步骤\d+\]|===\s*Replay|===\s*脚本|$)/gs;
    const aiMatches = [...fullScript.matchAll(aiFormatRegex)];
    if (aiMatches.length > 0 && sectionIndex < aiMatches.length) {
      return aiMatches[sectionIndex][1].trim();
    }
    
    // 尝试匹配 === 步骤 N: 标题 === 格式（初始格式）
    const initialFormatRegex = /(===\s*步骤\s*\d+[：:][^=]*?===[\s\S]*?)(?====\s*步骤|===\s*Replay|===\s*脚本|---\n提示|$)/g;
    const initialMatches = [...fullScript.matchAll(initialFormatRegex)];
    if (initialMatches.length > 0 && sectionIndex < initialMatches.length) {
      return initialMatches[sectionIndex][1].trim();
    }
    
    // 如果无法解析，返回全部内容
    return fullScript;
  };

  // 更新完整脚本中某个步骤的内容
  const updateScriptForSection = (fullScript, sectionIndex, newContent) => {
    if (!fullScript || sectionIndex < 0) return newContent;
    
    // 尝试匹配 [步骤N] 格式
    const aiFormatRegex = /(\[步骤\d+\][^\[]*?)(?=\[步骤\d+\]|===\s*Replay|===\s*脚本|$)/gs;
    const aiMatches = [...fullScript.matchAll(aiFormatRegex)];
    if (aiMatches.length > 0 && sectionIndex < aiMatches.length) {
      const parts = [];
      let lastEnd = 0;
      aiMatches.forEach((match, idx) => {
        if (idx === sectionIndex) {
          parts.push(fullScript.slice(lastEnd, match.index));
          parts.push(newContent);
        } else {
          parts.push(fullScript.slice(lastEnd, match.index + match[1].length));
        }
        lastEnd = match.index + match[1].length;
      });
      parts.push(fullScript.slice(lastEnd));
      return parts.join('');
    }
    
    // 尝试匹配 === 步骤 N: 标题 === 格式
    const initialFormatRegex = /(===\s*步骤\s*\d+[：:][^=]*?===[\s\S]*?)(?====\s*步骤|===\s*Replay|===\s*脚本|---\n提示|$)/g;
    const initialMatches = [...fullScript.matchAll(initialFormatRegex)];
    if (initialMatches.length > 0 && sectionIndex < initialMatches.length) {
      const parts = [];
      let lastEnd = 0;
      initialMatches.forEach((match, idx) => {
        if (idx === sectionIndex) {
          parts.push(fullScript.slice(lastEnd, match.index));
          parts.push(newContent + '\n\n');
        } else {
          parts.push(fullScript.slice(lastEnd, match.index + match[1].length));
        }
        lastEnd = match.index + match[1].length;
      });
      parts.push(fullScript.slice(lastEnd));
      return parts.join('');
    }
    
    // 如果无法解析，直接返回新内容
    return newContent;
  };

  // AI 优化沉淀内容
  const processDepositWithAI = async () => {
    if (!depositConfirmData) return;
    
    setDepositConfirmData(prev => ({ ...prev, isProcessing: true }));
    
    try {
      // 构建发送给 AI 的内容 - 包含原始录制
      const sectionsText = depositConfirmData.sections.map((s, i) => {
        return `【步骤${i + 1}】${s.action || '操作'}\n${s.content || ''}`;
      }).join('\n\n---\n\n');
      
      // 当前脚本内容（如果用户已编辑或 AI 已优化过）
      const currentScript = depositConfirmData.structuredScript || '';
      const hasExistingScript = currentScript && !currentScript.includes('提示: 点击「AI 智能优化」');
      
      // 用户的修改指示（追加需求，不覆盖原有内容）
      const userReqs = depositConfirmData.userRequirements?.trim() || '';
      const previousReqs = depositConfirmData.accumulatedRequirements || '';
      const combinedRequirements = previousReqs 
        ? (userReqs ? `${previousReqs}\n\n【追加需求】${userReqs}` : previousReqs)
        : (userReqs || '无特殊要求，请生成通用化的脚本');
      
      const prompt = `你是一个经验沉淀优化助手。用户录制了一系列操作步骤，需要你基于【原始录制内容】和【当前脚本】，根据用户的【修改指示】进行增量优化。

**重要：请保留原有脚本的所有信息，只根据用户新的修改指示添加或调整内容，不要删除原有信息！**

【原始录制内容（系统自动记录，作为脚本回退的基础）】
${sectionsText}

${hasExistingScript ? `【当前脚本内容（请在此基础上优化，保留已有信息）】\n${currentScript}\n` : ''}
【用户修改指示（增量需求，在原有基础上添加）】
${combinedRequirements}

【生成要求】
1. **保留原有脚本的所有信息**，包括步骤描述、类型、条件等
2. 根据用户的修改指示，**追加**新的需求点或**调整**描述，但不要删除原有内容
3. 将具体的文件名、选区位置等替换为通用变量（如 {{当前文档}}、{{选中内容}}）
4. 为每个步骤保留完整的执行指令，以支持脚本回退 Replay
5. 对于"填入摘要"类操作，必须保留完整的内容描述和上下文特征

请直接返回优化后的结构化脚本（纯文本格式，不要用代码块包裹）：

【沉淀名称】建议的名称
【流程概述】一句话描述整个流程的目的

=== 执行步骤 ===

[步骤1] 步骤标题
- 类型: 操作类型（如 add_doc, outline_extract, insert_to_summary）
- 描述: 具体要做什么（通用化描述）
- 条件: 执行此步骤的前提条件（可选）
- 内容描述: 【仅填入摘要时必填】需要查找的内容特征描述
- 前文特征: 【可选】内容前面的文字特征，用于定位
- 后文特征: 【可选】内容后面的文字特征，用于定位  
- 目标标题: 【仅填入摘要时必填】要填入的大纲标题名称
- AI指导: 给 Replay AI 的执行提示
- 脚本回退参数: 【保留原始参数，用于脚本模式回退】

[步骤2] ...

=== Replay 指导 ===
整体执行时的注意事项和智能适配说明

=== 脚本回退说明 ===
如大模型 Replay 失败，可使用原始录制的脚本参数进行回退执行`;

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          maxTokens: 2500
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // 检查 AI 是否可用
        if (data?.usedModel === false || data?.content === null) {
          // AI 未配置，提示用户
          setDepositConfirmData(prev => ({ ...prev, isProcessing: false }));
          showToast('⚠️ AI 服务未配置（QWEN_API_KEY），请手动编辑脚本或联系管理员配置');
          return;
        }
        
        if (data?.content) {
          // 直接使用 AI 返回的文本作为结构化脚本
          const optimizedScript = data.content.trim();
          
          // 尝试从脚本中提取建议名称
          const nameMatch = optimizedScript.match(/【沉淀名称】(.+)/);
          const suggestedName = nameMatch ? nameMatch[1].trim() : '';
          
          // 累积用户的需求（用于下次优化时保留上下文）
          const newAccumulatedReqs = depositConfirmData.userRequirements?.trim()
            ? (depositConfirmData.accumulatedRequirements 
                ? `${depositConfirmData.accumulatedRequirements}\n【追加】${depositConfirmData.userRequirements.trim()}`
                : depositConfirmData.userRequirements.trim())
            : depositConfirmData.accumulatedRequirements || '';
          
          setDepositConfirmData(prev => ({
            ...prev,
            structuredScript: optimizedScript,
            depositName: suggestedName || prev.depositName,
            accumulatedRequirements: newAccumulatedReqs,
            userRequirements: '', // 清空当前输入，方便用户输入新的追加需求
            isProcessing: false,
            optimizeCount: (prev.optimizeCount || 0) + 1
          }));
          showToast('✅ AI 优化完成，可继续输入追加需求或确认保存');
          return;
        }
      }
      
      setDepositConfirmData(prev => ({ ...prev, isProcessing: false }));
      showToast('AI 优化失败，请检查网络或重试');
    } catch (e) {
      console.error('AI 处理沉淀内容失败', e);
      setDepositConfirmData(prev => ({ ...prev, isProcessing: false }));
      showToast('AI 处理失败');
    }
  };

  // 确认保存沉淀
  const confirmSaveDeposit = async () => {
    if (!depositConfirmData) return;
    
    const nextSeq = (depositSeq || 0) + 1;
    const depositId = `沉淀_${nextSeq}`;
    const precipitationMode = depositConfirmData.precipitationMode || 'llm';
    const depositName = depositConfirmData.depositName?.trim() || depositId;
    const structuredScript = depositConfirmData.structuredScript?.trim() || '';
    
    // 从结构化脚本中解析每个步骤的大模型记录
    // 支持两种格式：
    // 1. [步骤N] 标题 - AI 优化后的格式
    // 2. === 步骤 N: 标题 === - 初始生成的格式
    const parseLLMStepsFromScript = (script) => {
      if (!script) return [];
      const steps = [];
      
      // 解析字段的通用函数 - 支持 "- 字段:" 和 "【字段】" 两种格式
      const parseField = (content, fieldName) => {
        // 先尝试 "- 字段:" 格式
        const dashRegex = new RegExp(`-\\s*${fieldName}[：:]\\s*(.*?)(?=-\\s*\\w|【|$)`, 's');
        const dashMatch = content.match(dashRegex);
        if (dashMatch) return dashMatch[1].trim();
        
        // 再尝试 "【字段】" 格式
        const bracketRegex = new RegExp(`【${fieldName}】\\s*(.*?)(?=【|===|$)`, 's');
        const bracketMatch = content.match(bracketRegex);
        if (bracketMatch) return bracketMatch[1].trim();
        
        return '';
      };
      
      // 尝试匹配 [步骤N] 格式（AI 优化后）
      const aiFormatRegex = /\[步骤(\d+)\]\s*([^\n]+)([\s\S]*?)(?=\[步骤\d+\]|===\s*Replay|===\s*脚本|$)/g;
      let match;
      while ((match = aiFormatRegex.exec(script)) !== null) {
        const stepNum = parseInt(match[1]);
        const stepTitle = match[2].trim();
        const stepContent = match[3].trim();
        
        steps.push({
          stepNum,
          title: stepTitle,
          type: parseField(stepContent, '类型'),
          description: parseField(stepContent, '描述'),
          condition: parseField(stepContent, '条件'),
          contentDescription: parseField(stepContent, '内容描述'),
          contextBefore: parseField(stepContent, '前文特征'),
          contextAfter: parseField(stepContent, '后文特征'),
          targetTitle: parseField(stepContent, '目标标题'),
          aiGuidance: parseField(stepContent, 'AI指导'),
          fallbackParams: parseField(stepContent, '脚本回退参数'),
          rawContent: stepContent
        });
      }
      
      // 如果没有匹配到 AI 格式，尝试匹配初始格式 === 步骤 N: 标题 ===
      if (steps.length === 0) {
        const initialFormatRegex = /===\s*步骤\s*(\d+)[：:]\s*([^=\n]+?)\s*===([\s\S]*?)(?====\s*步骤|===\s*Replay|===\s*脚本|---|\n\n\n|$)/g;
        while ((match = initialFormatRegex.exec(script)) !== null) {
          const stepNum = parseInt(match[1]);
          const stepTitle = match[2].trim();
          const stepContent = match[3].trim();
          
          steps.push({
            stepNum,
            title: stepTitle,
            type: parseField(stepContent, '操作类型') || parseField(stepContent, '类型'),
            description: parseField(stepContent, '描述') || parseField(stepContent, '指令Prompt'),
            condition: parseField(stepContent, '条件'),
            contentDescription: parseField(stepContent, '内容描述'),
            contextBefore: parseField(stepContent, '前文特征'),
            contextAfter: parseField(stepContent, '后文特征'),
            targetTitle: parseField(stepContent, '目标标题') || parseField(stepContent, '输出目标'),
            aiGuidance: parseField(stepContent, 'AI指导'),
            inputSource: parseField(stepContent, '输入来源'),
            outputTarget: parseField(stepContent, '输出目标'),
            outputContent: parseField(stepContent, '输出内容'),
            specialRequirements: parseField(stepContent, '特殊要求'),
            rawContent: stepContent
          });
        }
      }
      
      return steps;
    };
    
    // 解析结构化脚本中的所有步骤
    const llmSteps = parseLLMStepsFromScript(structuredScript);
    const isLLMMode = precipitationMode === 'llm';
    
    // 辅助函数：从原始内容中提取 __REPLAY_META__
    const extractReplayMeta = (content) => {
      if (!content) return null;
      const metaMatch = content.match(/__REPLAY_META__\n(.+)/s);
      if (metaMatch) {
        try {
          return JSON.parse(metaMatch[1]);
        } catch (_) {}
      }
      return null;
    };
    
    // 辅助函数：基于 llmScript 和 originalMeta 生成新的 __REPLAY_META__
    const generateReplayMeta = (llmStep, originalMeta, section) => {
      // 优先使用原始的 meta，然后用 llmStep 中的信息补充/更新
      const baseMeta = originalMeta || {};
      
      return {
        ...baseMeta,
        // 从 llmScript 更新的字段
        type: llmStep?.type || baseMeta.type || section.action,
        buttonAction: llmStep?.type || baseMeta.buttonAction || 'dispatch',
        intentDescription: llmStep?.description || baseMeta.intentDescription || section.action,
        // 输入来源信息
        inputSourceDesc: llmStep?.inputSource || baseMeta.inputSourceDesc || '',
        // 输出目标信息
        outputTargetDesc: llmStep?.outputTarget || baseMeta.outputTargetDesc || '',
        targetTitle: llmStep?.targetTitle || baseMeta.targetTitle || '',
        // 内容描述（用于大模型定位）
        contentDescription: llmStep?.contentDescription || baseMeta.contentDescription || '',
        contextBefore: llmStep?.contextBefore || baseMeta.contextBefore || '',
        contextAfter: llmStep?.contextAfter || baseMeta.contextAfter || '',
        // AI 执行指导
        aiGuidance: llmStep?.aiGuidance || baseMeta.aiGuidance || '',
        // 特殊要求
        specialRequirements: llmStep?.specialRequirements || baseMeta.specialRequirements || '无',
        // 标记为大模型模式生成
        generatedByLLM: true,
        generatedAt: Date.now()
      };
    };
    
    // 辅助函数：从结构化脚本中提取某个步骤的完整格式化内容
    const extractFullStepContent = (script, stepNum) => {
      if (!script) return null;
      // 匹配 [步骤N] 格式
      const aiFormatRegex = new RegExp(`(\\[步骤${stepNum}\\][^\\[]*?)(?=\\[步骤\\d+\\]|===\\s*Replay|===\\s*脚本|$)`, 's');
      const aiMatch = script.match(aiFormatRegex);
      if (aiMatch) return aiMatch[1].trim();
      
      // 匹配 === 步骤 N: 标题 === 格式
      const initialFormatRegex = new RegExp(`(===\\s*步骤\\s*${stepNum}[：:][^=]*?===.*?)(?====\\s*步骤|===\\s*Replay|===\\s*脚本|---|\n\n\n|$)`, 's');
      const initialMatch = script.match(initialFormatRegex);
      if (initialMatch) return initialMatch[1].trim();
      
      return null;
    };
    
    // 为每个 section 保存记录
    // - 大模型模式：保存 llmScript（从结构化脚本解析）和 originalScript，并生成新的 __REPLAY_META__
    // - 脚本模式：只保存 originalScript，保留原始 __REPLAY_META__
    const sectionsWithBoth = depositConfirmData.sections.map((s, idx) => {
      // 获取对应的步骤解析结果
      const llmStep = llmSteps[idx] || null;
      
      // 从原始内容中提取 __REPLAY_META__
      const originalMeta = extractReplayMeta(s.content) || s.meta;
      
      // 构建脚本记录内容 - 优先使用完整的格式化步骤内容
      const fullStepContent = extractFullStepContent(structuredScript, idx + 1);
      const scriptContent = fullStepContent || llmStep?.rawContent || s.content;
      
      // 生成/更新 __REPLAY_META__
      let replayMeta = originalMeta;
      if (isLLMMode && llmStep) {
        // 大模型模式：基于 llmScript 生成新的 meta
        replayMeta = generateReplayMeta(llmStep, originalMeta, s);
      }
      
      // 构建带有 __REPLAY_META__ 的完整内容
      const contentWithMeta = replayMeta 
        ? `${scriptContent}\n\n${REPLAY_META_MARKER}\n${JSON.stringify(replayMeta)}`
        : scriptContent;
      
      // 脚本记录（系统自动记录的原始内容）- 两种模式都需要
      const originalScript = {
        action: s.action,
        buttonLabel: s.buttonLabel,
        // 保存带有 __REPLAY_META__ 的内容
        content: contentWithMeta,
        // 同时保留原始 meta 信息用于回退
        meta: replayMeta,
        // 保存原始未处理的 content 用于严格脚本回退
        rawContent: s.content
      };
      
      // 大模型记录 - 只在大模型模式下有值
      // 合并原始 meta 中的所有详细信息、脚本解析的信息、以及完整的脚本内容
      // 目的：大模型 Replay 时可以直接使用 llmScript 中的完整信息
      let llmScript = null;
      if (isLLMMode) {
        llmScript = {
          // === 从脚本解析的字段（显示用）===
          title: llmStep?.title || s.action || '',
          type: llmStep?.type || originalMeta?.type || '',
          description: llmStep?.description || originalMeta?.actionDescription || '',
          condition: llmStep?.condition || '',
          contentDescription: llmStep?.contentDescription || '',
          contextBefore: llmStep?.contextBefore || originalMeta?.contextBefore || '',
          contextAfter: llmStep?.contextAfter || originalMeta?.contextAfter || '',
          targetTitle: llmStep?.targetTitle || originalMeta?.outputTargetDesc || '',
          aiGuidance: llmStep?.aiGuidance || originalMeta?.aiGuidance || '',
          inputSource: llmStep?.inputSource || originalMeta?.inputSourceDesc || '',
          outputTarget: llmStep?.outputTarget || originalMeta?.outputTargetDesc || '',
          specialRequirements: llmStep?.specialRequirements || originalMeta?.specialRequirements || '',
          
          // === 完整的格式化脚本内容（沉淀弹窗中显示的内容）===
          // 用于大模型 Replay 时作为上下文
          structuredScriptContent: fullStepContent || llmStep?.rawContent || '',
          rawContent: llmStep?.rawContent || '',
          
          // === 从原始 meta 继承的完整信息（用于 Replay）===
          // 动作描述
          actionDescription: originalMeta?.actionDescription || llmStep?.description || '',
          // 指令内容（dispatch 专用）
          instructions: originalMeta?.instructions || originalMeta?.promptContent || '',
          promptContent: originalMeta?.promptContent || originalMeta?.instructions || '',
          // 输入信息（inputContent/inputContentExcerpt 仅作为参考记录）
          // Replay 时应使用目标位置的最新内容执行 prompt，而非此处记录的原始输入
          inputKind: originalMeta?.inputKind || '',
          inputSourceType: originalMeta?.inputSourceType || originalMeta?.inputKind || '',
          inputSourceDesc: originalMeta?.inputSourceDesc || '',
          inputContent: originalMeta?.inputContent || '',  // 参考：录制时的输入内容
          inputContentExcerpt: originalMeta?.inputContentExcerpt || '',  // 参考：录制时的输入摘要
          inputContentIsReference: true,  // 标记：输入内容仅供参考，Replay 使用最新内容
          inputs: originalMeta?.inputs || [],
          // 目标位置详细信息
          targetSectionsDetail: originalMeta?.targetSectionsDetail || [],
          selectedSectionIds: originalMeta?.selectedSectionIds || [],
          selectedSectionTitles: originalMeta?.selectedSectionTitles || [],
          outlineSegmentsMeta: originalMeta?.outlineSegmentsMeta || [],
          destinations: originalMeta?.destinations || [],
          // 输出信息
          outputs: originalMeta?.outputs || {},
          outputContent: llmStep?.outputContent || originalMeta?.outputs?.outputContent || '',
          outputTargetDesc: originalMeta?.outputTargetDesc || '',
          // 新增/删除标题专用
          afterSection: originalMeta?.afterSection || null,
          newSection: originalMeta?.newSection || null,
          targetSection: originalMeta?.targetSection || null,
          removedSections: originalMeta?.removedSections || [],
          // 大纲抽取专用
          generatedSections: originalMeta?.outputs?.generatedSections || [],
          // 文档相关
          docName: originalMeta?.docName || '',
          selectedDocName: originalMeta?.selectedDocName || '',
          
          // === 保存脚本记录的完整内容（备份）===
          // 用于脚本回退时使用
          originalScriptContent: contentWithMeta,
          originalScriptRawContent: s.content,
          
          // === 保存生成的 __REPLAY_META__ ===
          replayMeta: replayMeta
        };
      }
      
      return {
        ...s,
        // 更新 content 为带有 __REPLAY_META__ 的内容
        content: contentWithMeta,
        // 保存 meta 用于 Replay
        meta: replayMeta,
        // 大模型记录（仅大模型模式下有值）
        llmScript,
        // 脚本记录（两种模式都保存）
        originalScript,
        // 初始化 replay 状态
        lastReplayStatus: null, // 'llm_done' | 'script_done' | 'skipped' | 'fail' | null
        lastReplayMode: null,   // 'llm' | 'script' | null
        lastReplayTime: null,
        lastReplayError: null
      };
    });
    
    // 构建最终的沉淀记录
    const newDeposit = { 
      id: depositId, 
      name: depositName, 
      title: depositName, // 兼容显示
      createdAt: Date.now(), 
      precipitationMode,
      sections: sectionsWithBoth,  // 包含大模型记录和脚本记录的 sections
      // 大模型模式：保存完整的结构化脚本（AI 优化版）
      // 脚本模式：不保存结构化脚本
      structuredScript: isLLMMode ? structuredScript : null,
      // 累积的用户需求（用于追溯优化历史）- 仅大模型模式有意义
      accumulatedRequirements: isLLMMode ? (depositConfirmData.accumulatedRequirements || '') : '',
      optimizeCount: isLLMMode ? (depositConfirmData.optimizeCount || 0) : 0,
      // 从脚本中提取概述信息（仅大模型模式）
      summary: isLLMMode ? (extractFromScript(structuredScript, '流程概述') || '') : '',
      replayGuidance: isLLMMode ? (extractFromScript(structuredScript, 'Replay 指导') || '') : '',
      // 支持脚本回退的标记
      supportsScriptFallback: true
    };
    
    setDepositSeq(nextSeq);
    setDeposits(prev => [...prev, newDeposit]);
    
    setIsDepositing(false);
    setDepositSections([]);
    setShowDepositConfirmModal(false);
    setDepositConfirmData(null);
    showToast(`沉淀已保存（${precipitationMode === 'llm' ? '🤖 大模型Replay' : '📜 脚本Replay'}）`);

    // 保存到服务端
    try {
      await api(`/api/multi/precipitation/records`, { method: 'POST', body: newDeposit });
    } catch (e) {
      console.error('保存沉淀记录失败', e);
    }
  };

  // 从结构化脚本中提取指定字段
  const extractFromScript = (script, fieldName) => {
    if (!script) return '';
    const regex = new RegExp(`【${fieldName}】(.+?)(?=\\n|$)`);
    const match = script.match(regex);
    return match ? match[1].trim() : '';
  };

  // 取消沉淀确认
  const cancelDepositConfirm = () => {
    setShowDepositConfirmModal(false);
    setDepositConfirmData(null);
    setSelectedSectionIndex(-1);  // 重置选中状态
    // 不结束录制状态，让用户可以继续
  };





  // --- History Handlers ---


  const handleOpenHistory = () => {


    setShowHistoryModal(true);


  };





  const saveHistory = async () => {


    if (!template || !template.sections.length) {


      showToast('当前无可存档内容');


      return;


    }


    setHistoryLoading(true);


    try {


      const historyItem = {


        id: `outline_${Date.now()}`,


        template: deepClone(template), // Ensure deep clone


        timestamp: Date.now(),


        docName: docs.find((d) => d.id === selectedDocId)?.name || '未命名文档',


        title: docs.find((d) => d.id === selectedDocId)?.name || '未命名文档'


      };


      await api('/api/multi/outlines', { method: 'POST', body: historyItem });


      setOutlineHistory((prev) => [historyItem, ...prev]);


      showToast('已存档当前大纲');


    } catch (e) {


      console.error('保存历史失败', e);


      showToast('保存失败');


    } finally {


      setHistoryLoading(false);


    }


  };





  const useHistory = async (item) => {


    if (!item?.template) return;






    setHistoryLoading(true);


    try {


      // Apply template to backend


      const applyRes = await api(`/api/scene/${scene.id}/apply-template`, { method: 'POST', body: { template: item.template } });


      setTemplate(applyRes.template);


      setScene(applyRes.scene);


      setShowOutlineMode(true);





      // 记录沉淀


      logSectionWithMeta('点击了历史大纲选取', {


        type: 'restore_history_outline',


        outlineId: item.id,


        outlineTitle: item.title || item.docName,


        process: `恢复历史大纲：${item.title || item.docName}`,


        destinations: [{ kind: 'outline_panel' }],


        outputs: { summary: `已恢复大纲：${item.title || item.docName}` }


      });





      showToast('已恢复历史大纲');


      setShowHistoryModal(false);


    } catch (e) {


      console.error('回滚历史失败', e);


      showToast('回滚失败');


    } finally {


      setHistoryLoading(false);


    }


  };





  const deleteHistory = async (itemId) => {


    if (!confirm('确认删除该存档？')) return;


    setHistoryLoading(true);


    try {


      await api(`/api/multi/outlines/${itemId}`, { method: 'DELETE' });


      setOutlineHistory((prev) => prev.filter((i) => i.id !== itemId));


      showToast('已删除存档');


    } catch (e) {


      console.error('删除存档失败', e);


      showToast('删除失败');


    } finally {


      setHistoryLoading(false);


    }


  };





  const updateHistoryTitle = async (itemId, newTitle) => {


    setHistoryLoading(true);


    try {


      await api(`/api/multi/outlines/${itemId}`, {


        method: 'PATCH',


        body: { title: newTitle }


      });


      setOutlineHistory((prev) => prev.map((i) =>


        i.id === itemId ? { ...i, title: newTitle } : i


      ));


      showToast('已更新存档名称');


    } catch (e) {


      console.error('更新存档名称失败', e);


      showToast('更新失败');


    } finally {


      setHistoryLoading(false);


    }


  };





  const reloadDeposits = async (silent = false) => {


    try {


      const records = await api(`/api/multi/precipitation/records`);


      if (Array.isArray(records)) {


        const normalized = records.map((d) => ({


          ...d,


          precipitationMode: normalizePrecipitationMode(d?.precipitationMode),


          sections: Array.isArray(d?.sections) ? d.sections : []


        }));


        setDeposits(normalized);


        const max = records.reduce((acc, d) => {


          const m = /_(\d+)$/.exec(d?.id || '');


          const n = m ? Number(m[1]) : 0;


          return Number.isFinite(n) && n > acc ? n : acc;


        }, 0);


        if (max > 0) setDepositSeq(max);


      }


      return true;


    } catch (e) {


      console.error('加载沉淀记录失败', e);


      if (!silent) showToast('刷新沉淀记录失败');


      return false;


    }


  };





  const normalizeDepositGroup = (g) => {


    if (!g) return null;


    const id = typeof g.id === 'string' && g.id.trim() ? g.id.trim() : `group_${Date.now()}`;


    const name = typeof g.name === 'string' && g.name.trim() ? g.name.trim() : id;


    const depositIds = Array.isArray(g.depositIds) ? Array.from(new Set(g.depositIds.filter(Boolean))) : [];


    const createdAt = typeof g.createdAt === 'number' ? g.createdAt : Date.now();


    return { ...g, id, name, depositIds, createdAt };


  };





  const reloadDepositGroups = async (silent = false) => {

    try {

      const groups = await api(`/api/multi/precipitation/groups`);

      if (Array.isArray(groups)) {

        const normalized = groups.map(normalizeDepositGroup).filter(Boolean);

        setDepositGroups(normalized);


        if (selectedDepositGroupId && !normalized.some((g) => g.id === selectedDepositGroupId)) {


          setSelectedDepositGroupId('');


        }


      }


      return true;


    } catch (e) {


      console.error('加载场景失败', e);


      if (!silent) showToast('刷新场景失败');


      return false;


    }

  };



  const loadSharedScene = async () => {

    const cachedId = localStorage.getItem(SHARED_SCENE_KEY);

    if (cachedId) {

      try {

        const existing = await api(`/api/scene/${cachedId}`);

        if (existing?.scene) return existing.scene;

      } catch (_) {



        /* ignore */
      }

    }

    const created = await api('/api/scene', { method: 'POST', body: { docIds: [] } });

    if (created?.scene?.id) {

      localStorage.setItem(SHARED_SCENE_KEY, created.scene.id);

    }

    return created?.scene || null;

  };




  const getSelectedDepositIds = () =>


    deposits.filter((d) => selectedDepositIds?.[d.id]).map((d) => d.id);





  const createDepositGroupFromSelection = async () => {


    const ids = getSelectedDepositIds();


    if (!ids.length) {


      showToast('请先选择要合并的沉淀');


      return;


    }


    const defaultName = `沉淀集_${depositGroups.length + 1}`;


    const input = window.prompt(UI_TEXT.t164, defaultName);


    if (input === null) return;


    const name = input.trim() || defaultName;


    const newGroup = {


      id: `group_${Date.now()}`,


      name,


      depositIds: ids,


      createdAt: Date.now()


    };


    setDepositGroups((prev) => [...prev, newGroup]);  // 添加到末尾
    setSelectedDepositGroupId(newGroup.id);
    // 创建后切换到沉淀集列表模式
    setDepositViewMode('groups');
    try {
      await api(`/api/multi/precipitation/groups`, { method: 'POST', body: newGroup });
      showToast('已创建沉淀集');
    } catch (e) {
      console.error('创建沉淀集失败', e);
      showToast('创建沉淀集失败');
      await reloadDepositGroups(true);
    }
  };





  const updateDepositGroup = async (groupId, patch, successMsg) => {
    if (!groupId) return;
    const nextPatch = { ...patch };
    // 支持一个沉淀被多次添加到同一个沉淀集，不再去重
    if (Array.isArray(nextPatch.depositIds)) {
      nextPatch.depositIds = nextPatch.depositIds.filter(Boolean);
    }


    setDepositGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, ...nextPatch } : g));


    try {


      await api(`/api/multi/precipitation/groups/${groupId}`, {


        method: 'PATCH',


        body: nextPatch


      });


      if (successMsg) showToast(successMsg);


    } catch (e) {


      console.error('更新沉淀集失败', e);


      showToast('更新沉淀集失败');


      await reloadDepositGroups(true);


    }


  };





  const renameDepositGroup = async () => {


    const group = depositGroups.find((g) => g.id === selectedDepositGroupId);


    if (!group) {


      showToast('请先选择沉淀集');


      return;


    }


    const input = window.prompt('请输入沉淀集名称', group.name);


    if (input === null) return;


    const name = input.trim() || group.name;


    await updateDepositGroup(group.id, { name }, '已更新沉淀集名称');


  };





  const updateGroupFromSelection = async () => {
    const ids = getSelectedDepositIds();
    
    if (!ids.length) {
      showToast('请先选择要合并的沉淀');
      return;
    }
    
    if (depositGroups.length === 0) {
      showToast('暂无沉淀集，请先创建');
      return;
    }
    
    // 打开多选弹窗
    setUpdateGroupSelectedIds([]);
    setShowUpdateGroupModal(true);
  };

  // 确认更新沉淀集（将选中的沉淀并入选中的沉淀集）
  const confirmUpdateGroups = async () => {
    const depositIds = getSelectedDepositIds();
    
    if (!depositIds.length) {
      showToast('请先选择要合并的沉淀');
      return;
    }
    
    if (!updateGroupSelectedIds.length) {
      showToast('请选择至少一个沉淀集');
      return;
    }
    
    // 将选中的沉淀并入所有选中的沉淀集
    for (const groupId of updateGroupSelectedIds) {
      const targetGroup = depositGroups.find(g => g.id === groupId);
      if (targetGroup) {
        const mergedIds = Array.from(new Set([...(targetGroup.depositIds || []), ...depositIds]));
        await updateDepositGroup(targetGroup.id, { depositIds: mergedIds });
      }
    }
    
    const groupNames = updateGroupSelectedIds
      .map(id => depositGroups.find(g => g.id === id)?.name)
      .filter(Boolean)
      .join('、');
    
    showToast(`已将选中沉淀并入「${groupNames}」`);
    setShowUpdateGroupModal(false);
    setUpdateGroupSelectedIds([]);
    
    // 如果只选了一个沉淀集，选中它
    if (updateGroupSelectedIds.length === 1) {
      setSelectedDepositGroupId(updateGroupSelectedIds[0]);
    }
  };





  const deleteDepositGroup = async () => {
    const group = depositGroups.find((g) => g.id === selectedDepositGroupId);
    if (!group) {
      showToast('请先选择沉淀集');
      return;
    }
    if (!confirm('确认要删除沉淀集 "' + group.name + '" 吗？')) return;
    setDepositGroups((prev) => prev.filter((g) => g.id !== group.id));
    if (selectedDepositGroupId === group.id) setSelectedDepositGroupId('');
    try {
      await api(`/api/multi/precipitation/groups/${group.id}`, { method: "DELETE" });
      showToast('已删除沉淀集');
    } catch (e) {
      console.error('delete deposit group failed', e);
      showToast('删除沉淀集失败');
      await reloadDepositGroups(true);
    }
  };





  const replayDepositGroup = async () => {


    const group = depositGroups.find((g) => g.id === selectedDepositGroupId);


    if (!group) {


      showToast('请先选择沉淀集');


      return;


    }


    if (depositGroupReplay[group.id]) return;


    setDepositGroupReplay((prev) => ({ ...prev, [group.id]: true }));


    showToast(`开始Replay沉淀集：${group.name}`);


    for (const depositId of group.depositIds || []) {


      const dep = deposits.find((d) => d.id === depositId);


      if (!dep) continue;


      // eslint-disable-next-line no-await-in-loop


      await replayDeposit(depositId);


    }


    setDepositGroupReplay((prev) => ({ ...prev, [group.id]: false }));


    showToast('沉淀集Replay完成');


  };





  const normalizeAppButtons = (payload) => {


    if (!payload || !Array.isArray(payload.buttons)) return DEFAULT_APP_BUTTONS;


    return payload.buttons.


      map((btn, idx) => {


        if (!btn || typeof btn !== 'object') return null;


        const id = typeof btn.id === 'string' && btn.id.trim() ? btn.id.trim() : `app_btn_${idx}`;


        const label = typeof btn.label === 'string' ? fixMojibake(btn.label).trim() : '';


        if (!label) return null;


        const groupIds = Array.isArray(btn.groupIds) ? btn.groupIds.filter(Boolean) : [];


        return { id, label, groupIds };


      }).


      filter(Boolean);


  };





  const updateAppButtonLabel = (id, label) => {


    setAppButtonsConfig((prev) => prev.map((btn) => btn.id === id ? { ...btn, label } : btn));


  };





  const updateAppButtonGroups = (id, groupIds) => {


    setAppButtonsConfig((prev) => prev.map((btn) => btn.id === id ? { ...btn, groupIds } : btn));


  };





  const toggleAppButtonGroup = (id, groupId) => {


    setAppButtonsConfig((prev) =>


      prev.map((btn) => {


        if (btn.id !== id) return btn;


        const current = Array.isArray(btn.groupIds) ? btn.groupIds : [];


        const exists = current.includes(groupId);


        const next = exists ? current.filter((gid) => gid !== groupId) : [...current, groupId];


        return { ...btn, groupIds: next };


      })


    );


  };





  const saveAppButtonsConfig = async () => {


    setAppButtonsSaving(true);


    try {

      // 保存前清理已删除的沉淀集引用
      const validGroupIds = new Set(depositGroups.map(g => g.id));
      const cleanedButtons = appButtonsConfig.map((btn) => ({
        ...btn,
        groupIds: (btn.groupIds || []).filter((gid) => validGroupIds.has(gid))
      }));
      setAppButtonsConfig(cleanedButtons);

      await api(`/api/multi/app-buttons`, { method: 'POST', body: { buttons: cleanedButtons } });


      showToast('应用端按钮配置已保存');


    } catch (e) {


      console.error('保存应用端按钮配置失败', e);


      showToast('保存应用端按钮配置失败');


    } finally {


      setAppButtonsSaving(false);


    }


  };





  
  // 保存 Replay 目录配置
  const saveReplayDirConfig = async () => {
    setReplayDirConfigSaving(true);
    try {
      await api(`/api/multi/replay/config`, {
        method: 'POST',
        body: {
          dirPath: replayDirConfig.dirPath,
          autoLoadFiles: replayDirConfig.autoLoadFiles
        }
      });
      showToast('Replay 目录配置已保存');
    } catch (e) {
      console.error('保存 Replay 目录配置失败', e);
      showToast('保存 Replay 目录配置失败');
    } finally {
      setReplayDirConfigSaving(false);
    }
  };


  const saveBackofficeButtonsConfig = async () => {


    try {


      const payload = {


        globalButtons: {


          activeButtons: globalButtons,


          deletedButtons,


          version: '2.0',


          savedAt: Date.now()


        }


      };


      localStorage.setItem('global-buttons-config', JSON.stringify(payload.globalButtons));


      await api('/api/config/save', { method: 'POST', body: payload });


      showToast('后管按钮配置已保存');


    } catch (e) {


      console.error('保存后管按钮配置失败', e);


      showToast('保存后管按钮配置失败');


    }


  };





  const renderAppButtonsConfigPanel = () =>


    <div className="app-buttons-config">


      <div className="card-head" style={{ alignItems: 'center', justifyContent: 'space-between' }}>


        <div>


          <div className="section-title">{UI_TEXT.t1}</div>


          <div className="hint">{UI_TEXT.t2}</div>


        </div>


        <button


          className="ghost small"


          type="button"


          onClick={saveAppButtonsConfig}


          disabled={appButtonsSaving}


          style={{ pointerEvents: 'auto' }}>





          {appButtonsSaving ? UI_TEXT.t117 : UI_TEXT.t66}


        </button>


      </div>


      {/* 注：Replay 目录配置已移至"文档列表"面板，应用端和后管端共用同一配置 */}

      {appButtonsConfig.length === 0 ?


        <div className="hint">{UI_TEXT.t3}</div> :





        <div className="app-buttons-config-grid">


          <div className="app-buttons-left">


            {appButtonsConfig.map((btn, idx) => {


              const isActive = btn.id === selectedAppButtonId;


              const groupNames = (btn.groupIds || []).


                map((gid) => depositGroups.find((g) => g.id === gid)?.name || gid);


              return (


                <div


                  key={btn.id}


                  className={`app-button-item ${isActive ? 'active' : ''}`}


                  onClick={() => setSelectedAppButtonId(btn.id)}>





                  <div className="app-button-row">


                    <span className="pill muted">{idx + 1}</span>


                    <input


                      value={btn.label}


                      onChange={(e) => updateAppButtonLabel(btn.id, e.target.value)}


                      onClick={(e) => e.stopPropagation()}


                      placeholder={UI_TEXT.t43} />





                  </div>


                  <div className="app-button-selected-groups">


                    {groupNames.length === 0 ?


                      <span className="hint">{UI_TEXT.t118}</span> :





                      groupNames.map((name) =>


                        <span key={name} className="pill muted">{name}</span>


                      )


                    }


                  </div>


                </div>);





            })}


          </div>


          <div className="app-buttons-right">


            <div className="section-title" style={{ fontSize: '14px' }}>{UI_TEXT.t4}</div>


            <div className="hint">{UI_TEXT.t5}</div>


            {depositGroups.length === 0 ?


              <div className="hint">{UI_TEXT.t6}</div> :





              <div className="app-button-group-list">


                {depositGroups.map((group) => {


                  const selected = appButtonsConfig.find((btn) => btn.id === selectedAppButtonId);


                  const checked = selected?.groupIds?.includes(group.id);


                  return (


                    <label key={group.id} className={`app-button-group-item ${checked ? 'active' : ''}`}>


                      <input


                        type="checkbox"


                        checked={!!checked}


                        onChange={() => {


                          if (!selected) return;


                          toggleAppButtonGroup(selected.id, group.id);


                        }} />





                      <span>{group.name}</span>


                    </label>);





                })}


              </div>


            }


          </div>


        </div>


      }


    </div>;








  const renderGlobalButtonsConfigPanel = () =>


    <div style={{ height: '100%', overflow: 'auto' }}>


      <div style={{ padding: '12px', borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>


        <h4 style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 600 }}>{UI_TEXT.t7}</h4>


        <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>{UI_TEXT.t8}</p>


      </div>


      <div style={{ padding: '0 12px' }}>


        {globalButtons.map((btn) =>


          <label


            key={btn.id}


            style={{


              display: 'block',


              padding: '10px 0',


              borderBottom: '1px solid #f0f0f0'


            }}>





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


                title={btn.kind === 'outline_extract' ? UI_TEXT.t157 : ''}


                onChange={(e) => {


                  if (btn.kind === 'outline_extract') return;


                  const newEnabled = e.target.checked;


                  const newButtons = globalButtons.map((b) => b.id === btn.id ? { ...b, enabled: newEnabled } : b);


                  setGlobalButtons(newButtons);


                  saveButtonConfig({ activeButtons: newButtons });


                }} />





            </div>


            {btn.kind === 'outline_extract' &&


              <div style={{ padding: '8px 0 4px' }}>


                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{UI_TEXT.t9}</div>


                <textarea


                  value={btn.prompt || ''}


                  onChange={(e) => {


                    const newPrompt = e.target.value;


                    const newButtons = globalButtons.map((b) => b.id === btn.id ? { ...b, prompt: newPrompt } : b);


                    setGlobalButtons(newButtons);


                    saveButtonConfig({ activeButtons: newButtons });


                  }}


                  style={{ width: '100%', minHeight: '80px', fontSize: '12px' }} />





              </div>


            }


          </label>


        )}


      </div>


      <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0', textAlign: 'center' }}>


        <button


          className="ghost small"


          type="button"


          style={{ color: '#666' }}


          onClick={() => {


            const defaults = defaultLlmButtons();


            const currentKinds = globalButtons.map((b) => b.kind);


            const missing = defaults.filter((d) => !currentKinds.includes(d.kind));





            if (missing.length === 0) {


              showToast(UI_TEXT.t158);


              return;


            }





            if (window.confirm(`${UI_TEXT.t159}${missing.length}${UI_TEXT.t160}`)) {


              const newRestored = missing.map((b) => ({


                ...b,


                id: `btn_restored_${Date.now()}_${Math.random().toString(36).slice(2)}`,


                enabled: true


              }));


              const newButtons = [...globalButtons, ...newRestored];


              setGlobalButtons(newButtons);


              saveButtonConfig({ activeButtons: newButtons });


              showToast(UI_TEXT.t161);


            }


          }}>{UI_TEXT.t10}








        </button>


      </div>


    </div>;








  // --- Precipitation Handlers ---





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





      setHeaderTitles((prev) => ({


        ...prev,


        [draggingHeaderTitle.titleKey]: {


          ...prev[draggingHeaderTitle.titleKey],


          position: {


            left: draggingHeaderTitle.startPos.left + deltaX,


            top: draggingHeaderTitle.startPos.top + deltaY


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





      setHeaderTitles((prev) => {


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








  useEffect(() => {


    if (!draggingButton) return;





    const handleMouseMove = (e) => {





      const deltaX = e.clientX - draggingButton.startX;


      const deltaY = e.clientY - draggingButton.startY;





      if (draggingButton.panelId) {


        const { panelId, buttonId, dragType } = draggingButton;


        let nextLeft = draggingButton.originalLeft;


        let nextTop = draggingButton.originalTop;


        let nextWidth = draggingButton.originalWidth;


        let nextHeight = draggingButton.originalHeight;





        if (dragType === 'move') {


          nextLeft = draggingButton.originalLeft + deltaX;


          nextTop = draggingButton.originalTop + deltaY;


        } else if (dragType === 'resize-e') {


          nextWidth = Math.max(40, draggingButton.originalWidth + deltaX);


        } else if (dragType === 'resize-s') {


          nextHeight = Math.max(20, draggingButton.originalHeight + deltaY);


        } else if (dragType === 'resize-se') {


          nextWidth = Math.max(40, draggingButton.originalWidth + deltaX);


          nextHeight = Math.max(20, draggingButton.originalHeight + deltaY);


        }





        setButtonPositions((prev) => {


          const list = prev[panelId] || [];


          const nextList = list.map((btn) =>


            btn.id === buttonId ?


              { ...btn, left: nextLeft, top: nextTop, width: nextWidth, height: nextHeight } :


              btn


          );


          return { ...prev, [panelId]: nextList };


        });


        return;


      }





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


    showToast('已恢复已保存布局');


  };





  const handleCompleteLayoutEdit = async () => {





    setIsEditingLayout(false);








    try {
      // 保存所有配置到服务端（持久化到 data 目录）
      const configToSave = {
        layout: panelPositions,
        buttons: buttonPositions,
        contentBlocks: contentBlockPositions,
        headerTitles: headerTitles,
        layoutSize: layoutSize,
        globalButtons: {
          activeButtons: globalButtons,
          deletedButtons: deletedButtons,
          version: '2.0',
          savedAt: Date.now()
        }
      };

      const saveRes = await fetch('/api/config/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configToSave)
      });

      if (!saveRes.ok) {
        console.error('[Save] 保存配置到服务端失败');
        showToast('保存布局失败，请重试');
        return;
      }

      console.log('[Save] 配置已保存到服务端');

      // 同时保存到 localStorage 作为本地缓存
      saveLayoutConfig(panelPositions);
      saveButtonConfig(buttonPositions);
      localStorage.setItem('layout_content_blocks', JSON.stringify(contentBlockPositions));
      localStorage.setItem('workbench_header_titles', JSON.stringify(headerTitles));
      localStorage.setItem('layout_size', JSON.stringify(layoutSize));
      
      const globalConfig = {
        activeButtons: globalButtons,
        deletedButtons: deletedButtons,
        version: '2.0',
        savedAt: Date.now()
      };
      localStorage.setItem('global-buttons-config', JSON.stringify(globalConfig));
      console.log('[Save] Saved global buttons config:', globalButtons.length, 'active buttons');








      setSavedLayout(JSON.parse(JSON.stringify(panelPositions)));


      setSavedButtons(JSON.parse(JSON.stringify(buttonPositions)));


      setSavedContentBlocks(JSON.parse(JSON.stringify(contentBlockPositions)));


      setEditingHeaderTitle(null);





      showToast('配置已保存（本地）');


    } catch (e) {


      console.error('Local save failed', e);


      showToast('⚠️ 本地保存失败，请检查控制台');


    }








    (async () => {


      try {


        await Promise.all([


          api('/api/layout', {


            method: 'POST',


            body: { layout: panelPositions }


          }),


          api('/api/buttons', {


            method: 'POST',


            body: { buttons: buttonPositions }


          }),


          api('/api/config/save', {


            method: 'POST',


            body: {


              layout: panelPositions,


              contentBlocks: contentBlockPositions,


              deletedBlocks,


              globalButtons: {


                activeButtons: globalButtons,


                deletedButtons,


                version: '2.0',


                savedAt: Date.now()


              },


              headerTitles,


              layoutSize


            }


          })



        ]

        );


        console.log('Backend save success');


      } catch (e) {





        console.warn('Backend save failed', e);


      }


    })();


  };





  const handleResetLayout = () => {


    applySavedLayout();


    showToast('已恢复到默认布局');


  };








  const handleButtonMouseDown = (e, panelId, buttonId, dragType = 'move') => {


    if (!isEditingLayout) return;





    const button = buttonPositions[panelId]?.find((b) => b.id === buttonId);


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


      originalHeight: button.height


    });





    e.preventDefault();


  };











  const toggleDepositSelected = (depositId, checked) => {


    setSelectedDepositIds((prev) => {


      const next = { ...prev };


      if (checked) next[depositId] = true; else


        delete next[depositId];


      return next;


    });


  };





  const clearDepositSelection = () => setSelectedDepositIds({});





  const persistDepositOrder = async (nextList) => {


    const order = (nextList || []).map((d) => d.id);


    if (!order.length) return;


    try {


      await api(`/api/multi/precipitation/records/order`, {


        method: 'POST',


        body: { order }


      });


    } catch (e) {


      console.error('保存沉淀顺序失败', e);


      showToast('保存沉淀顺序失败');


    }


  };





  const reorderDepositList = (list, sourceId, targetId) => {


    const next = [...(list || [])];


    const fromIdx = next.findIndex((d) => d.id === sourceId);


    const toIdx = next.findIndex((d) => d.id === targetId);


    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return list;


    const [moved] = next.splice(fromIdx, 1);


    next.splice(toIdx, 0, moved);


    return next;


  };





  const moveDepositToIndex = (list, depositId, targetIndex) => {


    const next = [...(list || [])];


    const fromIdx = next.findIndex((d) => d.id === depositId);


    if (fromIdx === -1) return list;


    const bounded = Math.max(0, Math.min(targetIndex, next.length - 1));


    const [moved] = next.splice(fromIdx, 1);


    next.splice(bounded, 0, moved);


    return next;


  };





  const applyDepositOrderChange = (updater) => {


    let nextList = null;


    setDeposits((prev) => {


      nextList = updater(prev);


      return nextList;


    });


    if (nextList) {


      persistDepositOrder(nextList);


    }


  };





  const selectAllDeposits = () => {


    setSelectedDepositIds(() => {


      const next = {};


      deposits.forEach((d) => {


        next[d.id] = true;


      });


      return next;


    });


  };





  const deleteDepositsByIds = async (ids) => {


    const list = Array.from(new Set((ids || []).filter(Boolean)));


    if (!list.length) return;


    const ok = window.confirm(`确定删除选中的沉淀：${list.length} 条）吗？`);


    if (!ok) return;


    const results = await Promise.allSettled(


      list.map((id) => api(`/api/multi/precipitation/records/${id}`, { method: 'DELETE' }))


    );


    const okIds = list.filter((_, idx) => results[idx].status === 'fulfilled');


    const failedIds = list.filter((_, idx) => results[idx].status !== 'fulfilled');





    if (okIds.length) {


      setDeposits((prev) => prev.filter((d) => !okIds.includes(d.id)));


      setDepositGroups((prev) =>


        prev.map((g) => ({ ...g, depositIds: (g.depositIds || []).filter((id) => !okIds.includes(id)) }))


      );


      setExpandedLogs((prev) => {


        const next = { ...prev };


        okIds.forEach((id) => delete next[id]);


        return next;


      });


      setExpandedDepositSections((prev) => {


        const next = { ...prev };


        okIds.forEach((id) => delete next[id]);


        return next;


      });


      setSelectedDepositIds((prev) => {


        const next = { ...prev };


        okIds.forEach((id) => delete next[id]);


        return next;


      });


    }





    if (failedIds.length) {


      console.error('删除沉淀失败', failedIds);


      showToast(`批量删除失败：${failedIds.length}/${list.length}，请稍后重试`);


      await reloadDeposits(true);


      await reloadDepositGroups(true);


      return;


    }





    const refreshed = await reloadDeposits(false);


    if (refreshed) showToast('已删除沉淀');


  };





  const deleteSelectedDeposits = () => void deleteDepositsByIds(Object.keys(selectedDepositIds || {}).filter((k) => selectedDepositIds[k]));





  const startEditDeposit = (depositId, field, value) => {


    setDepositEditing((prev) => ({ ...prev, [`${depositId}||${field}`]: (value ?? '').toString() }));


  };





  const startEditDepositOrder = (depositId, currentIndex) => {


    startEditDeposit(depositId, 'order', String(currentIndex));


  };





  const cancelEditDeposit = (depositId, field) => {


    setDepositEditing((prev) => {


      const next = { ...prev };


      delete next[`${depositId}||${field}`];


      return next;


    });


  };





  const applyDepositName = async (depositId) => {


    const key = `${depositId}||name`;


    const value = (depositEditing[key] ?? '').toString().trim();


    const nextName = value || depositId;


    try {


      await api(`/api/multi/precipitation/records/${depositId}`, { method: 'PATCH', body: { name: nextName, title: nextName } });


      setDeposits((prev) => prev.map((d) => d.id === depositId ? { ...d, name: nextName, title: nextName } : d));


      cancelEditDeposit(depositId, 'name');


      showToast('已更新沉淀名称');


    } catch (e) {


      console.error('更新沉淀名称失败', e);


      showToast('更新失败');


    }


  };





  const updateDepositMode = async (depositId, mode) => {


    const nextMode = normalizePrecipitationMode(mode);


    setDeposits((prev) => prev.map((d) => d.id === depositId ? { ...d, precipitationMode: nextMode } : d));


    try {


      await api(`/api/multi/precipitation/records/${depositId}`, {


        method: 'PATCH',


        body: { precipitationMode: nextMode }


      });


      showToast('已更新沉淀方式');


    } catch (e) {


      console.error('更新沉淀方式失败', e);


      showToast('更新沉淀方式失败');


      await reloadDeposits(true);


    }


  };





  const renderDepositModeSelect = (deposit) =>


    <label className="deposit-mode">


      <select


        value={normalizePrecipitationMode(deposit?.precipitationMode)}


        onChange={(e) => updateDepositMode(deposit.id, e.target.value)}>





        <option value="llm">{UI_TEXT.t11}</option>


        <option value="script">{UI_TEXT.t12}</option>


      </select>


    </label>;








  const renderDepositGroupSelector = () =>


    <div className="deposit-group-selector">


      <span className="hint">{UI_TEXT.t13}</span>


      <select


        value={selectedDepositGroupId}


        onChange={(e) => setSelectedDepositGroupId(e.target.value)}>





        <option value="">{UI_TEXT.t14}</option>


        {depositGroups.length === 0 ?


          <option value="" disabled>{UI_TEXT.t6}</option> :


          null}


        {depositGroups.map((g) =>
          <option key={g.id} value={g.id}>{sanitizeText(g.name, g.name || '')}</option>
        )}


      </select>


    </div>;








  const getProcessingTabLayout = () => {
    const list = buttonPositions['processing-tabs'] || [];
    const defaults = DEFAULT_BUTTON_CONFIG['processing-tabs'] || [];
    const byKind = new Map(
      list
        .filter((btn) => PROCESSING_TAB_SEQUENCE.includes(btn?.kind))
        .map((btn) => [btn.kind, btn])
    );
    return PROCESSING_TAB_SEQUENCE
      .map((kind) => byKind.get(kind) || defaults.find((btn) => btn.kind === kind))
      .filter(Boolean);
  };

  // 每个 Tab 的彩色配置 - 精致专业风格
  const TAB_COLORS = {
    tab_outline: { 
      bg: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', 
      inactiveBg: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
      color: '#1e40af',
      activeColor: '#ffffff',
      border: '#3b82f6',
      shadow: 'rgba(59, 130, 246, 0.4)'
    },
    tab_records: { 
      bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
      inactiveBg: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
      color: '#047857',
      activeColor: '#ffffff',
      border: '#10b981',
      shadow: 'rgba(16, 185, 129, 0.4)'
    },
    tab_config: { 
      bg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', 
      inactiveBg: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
      color: '#6d28d9',
      activeColor: '#ffffff',
      border: '#8b5cf6',
      shadow: 'rgba(139, 92, 246, 0.4)'
    },
    tab_strategy: { 
      bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
      inactiveBg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
      color: '#b45309',
      activeColor: '#ffffff',
      border: '#f59e0b',
      shadow: 'rgba(245, 158, 11, 0.4)'
    }
  };

  const getProcessingTabButtons = () => {
    const list = getProcessingTabLayout();
    return list.map((btn) => {
      const fallbackLabel = sanitizeText(btn.label, '');
      const normalized = { ...btn, label: PROCESSING_TAB_LABELS[btn.kind] || fallbackLabel || btn.label };
      const isActive =
        btn.kind === 'tab_outline' && processingTab === 'outline' ||
        btn.kind === 'tab_config' && processingTab === 'config' ||
        btn.kind === 'tab_records' && processingTab === 'records' ||
        btn.kind === 'tab_strategy' && processingTab === 'strategy';
      
      const colors = TAB_COLORS[btn.kind] || TAB_COLORS.tab_outline;
      
      return {
        ...normalized,
        style: {
          ...(normalized.style || {}),
          background: isActive ? colors.bg : colors.inactiveBg,
          color: isActive ? colors.activeColor : colors.color,
          border: isActive ? 'none' : `1px solid ${colors.border}40`,
          borderRadius: '14px',
          boxShadow: isActive ? `0 4px 14px ${colors.shadow}` : '0 1px 3px rgba(0,0,0,0.08)',
          fontWeight: isActive ? 700 : 600,
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isActive ? 'translateY(-1px)' : 'none'
        }
      };
    });
  };





  const applyDepositOrder = (depositId) => {


    const key = `${depositId}||order`;


    const raw = (depositEditing[key] ?? '').toString().trim();


    const nextOrder = Number.parseInt(raw, 10);


    if (!Number.isFinite(nextOrder)) {


      cancelEditDeposit(depositId, 'order');


      return;


    }


    applyDepositOrderChange((prev) => moveDepositToIndex(prev, depositId, Math.max(0, nextOrder - 1)));


    cancelEditDeposit(depositId, 'order');


  };





  const handleDepositOrderKeyDown = (e, depositId) => {


    if (e.key !== 'Enter') return;


    e.preventDefault();


    applyDepositOrder(depositId);


  };





  const handleDepositDragStart = (depositId) => (e) => {


    setDraggingDepositId(depositId);


    setDragOverDepositId('');


    try {


      e.dataTransfer.effectAllowed = 'move';


      e.dataTransfer.setData('text/plain', depositId);


    } catch (_) {





      /* ignore */
    }


  };





  const handleDepositDragOver = (depositId) => (e) => {


    if (!draggingDepositId || draggingDepositId === depositId) return;


    e.preventDefault();


    setDragOverDepositId(depositId);


  };





  const handleDepositDrop = (depositId) => (e) => {


    e.preventDefault();


    const sourceId = draggingDepositId || e.dataTransfer?.getData?.('text/plain');


    if (!sourceId || sourceId === depositId) return;


    applyDepositOrderChange((prev) => reorderDepositList(prev, sourceId, depositId));


    setDraggingDepositId('');


    setDragOverDepositId('');


  };





  const handleDepositDragEnd = () => {


    setDraggingDepositId('');


    setDragOverDepositId('');


  };





  const renderProcessingTabArrows = () => {
    const list = getProcessingTabLayout();
    if (!list.length) return null;
    const byKind = {};
    list.forEach((btn) => {
      if (btn?.kind) byKind[btn.kind] = btn;
    });


    return PROCESSING_TAB_SEQUENCE.slice(0, -1).map((kind, idx) => {


      const leftBtn = byKind[kind];


      const rightBtn = byKind[PROCESSING_TAB_SEQUENCE[idx + 1]];


      if (!leftBtn || !rightBtn) return null;


      const leftEdge = leftBtn.left + leftBtn.width;


      const rightEdge = rightBtn.left;


      const center = leftEdge + (rightEdge - leftEdge) / 2;


      const top = leftBtn.top + (leftBtn.height - 16) / 2;


      return (


        <span


          key={`tab-seq-${kind}`}


          className="tab-seq-arrow"


          style={{ left: `${Math.max(0, center - 10)}px`, top: `${Math.max(0, top)}px` }}>





          --&gt;


        </span>);





    });


  };





  // 沉淀列表模式的按钮: 批量操作 + 沉淀集管理
  const RECORD_TOOLBAR_DEPOSIT_KINDS = new Set([
    'batch_replay',
    'select_all',
    'delete_selected',
    'clear_selection',
    'group_new',     // 从选中的沉淀创建新沉淀集
    'group_update'   // 更新已选沉淀集的内容（移至沉淀列表模式）
  ]);

  // 沉淀集列表模式的按钮: 沉淀集信息管理
  const RECORD_TOOLBAR_GROUP_KINDS = new Set([
    'group_rename',
    'group_delete',
    'group_replay'
  ]);



  const getRecordsToolbarButtons = (kindSet) => {

    const selectedGroup = depositGroups.find((g) => g.id === selectedDepositGroupId) || null;

    const selectedCount = getSelectedDepositIds().length;

    const hasSelection = selectedCount > 0;

    const allSelected =

      deposits.length > 0 &&

      Object.keys(selectedDepositIds || {}).filter((k) => selectedDepositIds[k]).length === deposits.length;

    const baseList = buttonPositions['processing-records-toolbar'] || [];

    const list = kindSet ? baseList.filter((btn) => kindSet.has(btn.kind)) : baseList;

    return list.map((btn) => {

      let disabled = false;


      switch (btn.kind) {


        case 'batch_replay':


        case 'delete_selected':


        case 'clear_selection':


          disabled = !hasSelection;


          break;


        case 'select_all':


          disabled = deposits.length === 0;


          break;


        case 'group_new':


          disabled = !hasSelection;


          break;


        case 'group_update':

          // 无需先选中沉淀集，弹窗中会提示选择要并入的沉淀集
          disabled = !hasSelection;


          break;


        case 'group_rename':


        case 'group_delete':


        case 'group_replay':


          disabled = !selectedGroup;


          break;


        default:


          break;


      }





      if (btn.kind === 'batch_replay' && batchReplayRunning) {


        disabled = true;


      }





      if (btn.kind === 'group_replay' && selectedGroup && depositGroupReplay[selectedGroup.id]) {


        disabled = true;


      }





      let label = btn.label;

      if (btn.kind === 'select_all') {

        label = allSelected ? '取消全选' : '全选';

      }

      return { ...btn, label, disabled };


    });


  };





  const getDepositReplayStatus = (deposit) => {


    const bySection = replayState?.[deposit?.id]?.bySection || {};


    const statuses = (deposit?.sections || []).


      map((s) => bySection?.[s.id]?.status).


      filter(Boolean);


    if (!statuses.length) return '';


    if (statuses.every((s) => s === 'done')) return 'done';


    if (statuses.every((s) => s === 'fail')) return 'fail';


    return 'partial done';


  };





  const getDepositReplayReason = (deposit) => {


    const bySection = replayState?.[deposit?.id]?.bySection || {};


    const issues = (deposit?.sections || []).


      map((s) => {


        const state = bySection?.[s.id];


        if (!state || state.status === 'done' || state.status === 'running') return null;


        const title = (s.action || s.id || '未命名').toString();


        const msg = (state.message || '').toString().trim();


        return msg ? `${title}：${state.status} - ${msg}` : `${title}：${state.status}`;


      }).


      filter(Boolean);


    if (!issues.length) return '';


    if (issues.length <= 3) return issues.join('、');


    return `${issues.slice(0, 3).join('、')} 等 ${issues.length} 项`;


  };





  // 渲染沉淀集列表视图
  const renderDepositGroupsList = () => {
    if (depositGroups.length === 0) {
      return <p className="hint" style={{ padding: '20px', textAlign: 'center' }}>{UI_TEXT.t6}</p>;
    }
    return (
      <div className="deposit-groups-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {depositGroups.map((group) => {
          const isSelected = selectedDepositGroupId === group.id;
          const depositCount = (group.depositIds || []).length;
          return (
            <div
              key={group.id}
              className={`section deposit-group-item ${isSelected ? 'selected' : ''}`}
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                background: isSelected ? '#e0f2fe' : '#f8fafc',
                border: isSelected ? '2px solid #0ea5e9' : '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onClick={() => setSelectedDepositGroupId(isSelected ? '' : group.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => setSelectedDepositGroupId(isSelected ? '' : group.id)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span style={{ fontWeight: 500, fontSize: '14px' }}>{sanitizeText(group.name, group.id)}</span>
                  <span className="pill muted" style={{ fontSize: '12px' }}>{depositCount} 条沉淀</span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className="ghost xsmall"
                    onClick={(e) => { e.stopPropagation(); setSelectedDepositGroupId(group.id); renameDepositGroup(); }}
                  >
                    {UI_TEXT.t67}
                  </button>
                  <button
                    type="button"
                    className="ghost xsmall"
                    onClick={(e) => { e.stopPropagation(); setSelectedDepositGroupId(group.id); setTimeout(() => replayDepositGroup(), 0); }}
                    disabled={depositGroupReplay[group.id]}
                  >
                    {depositGroupReplay[group.id] ? UI_TEXT.t119 : 'Replay'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderSelectedDepositGroupPanel = () => {
    const group = depositGroups.find((g) => g.id === selectedDepositGroupId);
    if (!group) return null;


    // 支持一个沉淀被多次添加到同一个沉淀集，保留重复项
    const groupDeposits = (group.depositIds || [])
      .map((id, idx) => {
        const dep = deposits.find((d) => d.id === id);
        return dep ? { ...dep, _groupIdx: idx } : null;
      })
      .filter(Boolean);


    return (


      <div className="section deposit-group-panel">


        <div className="section-head" style={{ justifyContent: 'space-between', alignItems: 'center' }}>


          <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>


            <span>{UI_TEXT.t15}{group.name}</span>


            <span className="pill muted">{groupDeposits.length}</span>


          </div>


          <div className="section-actions" style={{ gap: 6 }}>


            <button


              className="ghost xsmall"


              type="button"


              onClick={replayDepositGroup}


              disabled={depositGroupReplay[group.id]}>




              {depositGroupReplay[group.id] ? UI_TEXT.t119 : 'Replay'}



            </button>


          </div>


        </div>


        <div className="sections" style={{ gap: 6 }}>


          {groupDeposits.length === 0 && <div className="hint">{UI_TEXT.t16}</div>}


          {groupDeposits.map((dep, idx) =>
            <div key={`${dep.id}_${dep._groupIdx}`} className="section">


              <div className="section-head" style={{ justifyContent: 'space-between', alignItems: 'center' }}>


                <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'nowrap', flex: 1, minWidth: 0 }}>


                  <span className="pill muted">{idx + 1}</span>


                  {depositEditing[`${dep.id}||name`] !== undefined ?


                    <input


                      className="deposit-name-input"


                      value={depositEditing[`${dep.id}||name`]}


                      onChange={(e) => startEditDeposit(dep.id, 'name', e.target.value)}


                      onBlur={() => void applyDepositName(dep.id)}


                      onKeyDown={(e) => handleDepositNameKeyDown(e, dep.id)}


                      autoFocus


                      onClick={(e) => e.stopPropagation()}


                      style={{ border: '1px solid #1a73e8', padding: '2px 6px', borderRadius: '4px', fontSize: '16px', width: '200px' }} /> :








                    <span


                      className="deposit-name"


                      onDoubleClick={(e) => { e.stopPropagation(); startEditDeposit(dep.id, 'name', dep.name || dep.id); }}


                      title={UI_TEXT.t120}


                      style={{ cursor: 'text', fontWeight: 500 }}>





                      {dep.name || UI_TEXT.t144}


                    </span>


                  }


                  <button


                    className="icon-btn tiny"


                    type="button"


                    onClick={(e) => { e.stopPropagation(); startEditDeposit(dep.id, 'name', dep.name || dep.id); }}


                    title={UI_TEXT.t67}


                    style={{ width: 20, height: 20, padding: 2, opacity: 0.5 }}>





                    <Edit3 size={12} />


                  </button>


                </div>


                <div className="section-actions" style={{ gap: 6 }}>


                  {getDepositReplayStatus(dep) ?


                    <span


                      className={`status ${getDepositReplayStatus(dep).replace(' ', '-')}`}

                      title={getDepositReplayReason(dep) || UI_TEXT.t122}>






                      {getDepositReplayStatus(dep)}


                    </span> :


                    null}


                  <button


                    className="ghost xsmall"


                    type="button"


                    onClick={() => void replayDeposit(dep.id)}


                    disabled={!!replayState?.[dep.id]?.running}>





                    Replay


                  </button>


                </div>


              </div>


            </div>


          )}


        </div>


      </div>);





  };





  const addDeposit = () => {


    const nextSeq = (depositSeq || 0) + 1;


    const depositId = `沉淀_${nextSeq}`;


    setDepositSeq(nextSeq);


    const next = { id: depositId, name: depositId, createdAt: Date.now(), precipitationMode: DEFAULT_PRECIPITATION_MODE, sections: [] };


    setDeposits((prev) => [...prev, next]);


    setExpandedLogs((prev) => ({ ...prev, [depositId]: true }));


    startEditDeposit(depositId, 'name', depositId);


  };





  const addDepositSection = (depositId) => {


    const newSec = {


      id: `dsec_${Date.now()}_${Math.floor(Math.random() * 1000)}`,


      action: '新增 section',


      content: '',


      requirements: { ...DEFAULT_SECTION_REQUIREMENTS }


    };


    setDeposits((prev) =>


      prev.map((d) => d.id === depositId ? { ...d, sections: [...(d.sections || []), newSec] } : d)


    );


    startEditDeposit(depositId, `${newSec.id}||action`, newSec.action);


    startEditDeposit(depositId, `${newSec.id}||exec`, '');


    startEditDeposit(depositId, `${newSec.id}||summary`, '');


    startEditDeposit(depositId, `${newSec.id}||location`, '');


    startEditDeposit(depositId, `${newSec.id}||req_input`, DEFAULT_SECTION_REQUIREMENTS.inputSource);


    startEditDeposit(depositId, `${newSec.id}||req_exec`, DEFAULT_SECTION_REQUIREMENTS.actionExecution);


    startEditDeposit(depositId, `${newSec.id}||req_summary`, DEFAULT_SECTION_REQUIREMENTS.executionSummary);


    startEditDeposit(depositId, `${newSec.id}||req_location`, DEFAULT_SECTION_REQUIREMENTS.recordLocation);


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


    cancelEditDeposit(depositId, `${sectionId}||exec`);


    cancelEditDeposit(depositId, `${sectionId}||summary`);


    cancelEditDeposit(depositId, `${sectionId}||location`);


    cancelEditDeposit(depositId, `${sectionId}||req_input`);


    cancelEditDeposit(depositId, `${sectionId}||req_exec`);


    cancelEditDeposit(depositId, `${sectionId}||req_summary`);


    cancelEditDeposit(depositId, `${sectionId}||req_location`);


    showToast('已删除 section');


  };





  const applyDepositSectionField = (depositId, sectionId, field) => {


    const key = `${depositId}||${sectionId}||${field}`;


    const value = (depositEditing[key] ?? '').toString();


    setDeposits((prev) =>


      prev.map((d) => {


        if (d.id !== depositId) return d;


        const nextSections = (d.sections || []).map((s) => s.id === sectionId ? { ...s, [field]: value } : s);


        return { ...d, sections: nextSections };


      })


    );


    cancelEditDeposit(depositId, `${sectionId}||${field}`);


  };





  const startEditDepositSection = (depositId, section) => {


    setExpandedDepositSections((prev) => ({


      ...prev,


      [depositId]: { ...(prev?.[depositId] || {}), [section.id]: true }


    }));


    const parsed = parseDepositSectionContent(section?.content || '');
    const llm = section?.llmScript || {};


    const requirements = getSectionRequirements(section);


    // 新的字段结构：基于 llmScript
    startEditDeposit(depositId, `${section.id}||type`, llm.type || section?.meta?.type || '');
    startEditDeposit(depositId, `${section.id}||description`, llm.description || llm.actionDescription || '');
    startEditDeposit(depositId, `${section.id}||instructions`, llm.instructions || llm.promptContent || '');
    startEditDeposit(depositId, `${section.id}||inputSourceDesc`, llm.inputSourceDesc || '');
    startEditDeposit(depositId, `${section.id}||targetTitle`, llm.targetTitle || llm.outputTargetDesc || '');
    startEditDeposit(depositId, `${section.id}||aiGuidance`, llm.aiGuidance || '');
    
    // 兼容旧字段
    startEditDeposit(depositId, `${section.id}||action`, section?.action || parsed.operationRecord || '');
    startEditDeposit(depositId, `${section.id}||exec`, parsed.actionExecution || '');
    startEditDeposit(depositId, `${section.id}||summary`, parsed.executionSummary || '');
    startEditDeposit(depositId, `${section.id}||location`, parsed.recordLocation || '');


    startEditDeposit(depositId, `${section.id}||req_input`, requirements.inputSource);


    startEditDeposit(depositId, `${section.id}||req_exec`, requirements.actionExecution);


    startEditDeposit(depositId, `${section.id}||req_summary`, requirements.executionSummary);


    startEditDeposit(depositId, `${section.id}||req_location`, requirements.recordLocation);


  };





  const flexEditUploadDepositSection = async (depositId, section) => {


    try {


      const meta = extractReplayMeta(section?.content || '') || {};


      const currentDesc = (meta?.docSelector?.description || '').toString();


      const input = window.prompt(


        '请描述要上传的文件（用于匹配文件名），例如：上传列表中包含“2024年10月”的 .txt 文件',


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


        body: { description, exampleName: (meta?.docName || '').toString() }


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


        docSelector: selector


      };





      const selectorHint =


        selector.kind === 'regex' ?


          `regex=${(selector.pattern || '').toString()}` :


          `keywords=${Array.isArray(selector.keywords) ? selector.keywords.join('??') : ''}${selector.extension ? ` ext=${selector.extension}` : ''}`;


      const head = `上传文档（灵活上传）：${selector.mode === 'multi' ? '批量匹配' : '单个匹配'}`;


      const body = [`描述：${description}`, `规则：${selectorHint}`].join('\n');


      const nextContent = appendReplayMeta([head, body].join('\n'), nextMeta);





      setDeposits((prev) =>


        prev.map((d) => {


          if (d.id !== depositId) return d;


          const nextSections = (d.sections || []).map((s) => s.id === section.id ? { ...s, content: nextContent } : s);


          return { ...d, sections: nextSections };


        })


      );

      showToast(res?.usedModel === false ? '生成成功（未配置大模型）' : '生成成功');



    } catch (err) {


      console.error(err);


      showToast(err?.message || '灵活上传失败');


    }


  };





  const cancelEditDepositSection = (depositId, sectionId) => {

    // 新字段（llmScript）
    cancelEditDeposit(depositId, `${sectionId}||type`);
    cancelEditDeposit(depositId, `${sectionId}||description`);
    cancelEditDeposit(depositId, `${sectionId}||instructions`);
    cancelEditDeposit(depositId, `${sectionId}||inputSourceDesc`);
    cancelEditDeposit(depositId, `${sectionId}||targetTitle`);
    cancelEditDeposit(depositId, `${sectionId}||aiGuidance`);

    // 旧字段
    cancelEditDeposit(depositId, `${sectionId}||action`);


    cancelEditDeposit(depositId, `${sectionId}||exec`);


    cancelEditDeposit(depositId, `${sectionId}||summary`);


    cancelEditDeposit(depositId, `${sectionId}||location`);


    cancelEditDeposit(depositId, `${sectionId}||req_input`);


    cancelEditDeposit(depositId, `${sectionId}||req_exec`);


    cancelEditDeposit(depositId, `${sectionId}||req_summary`);


    cancelEditDeposit(depositId, `${sectionId}||req_location`);


  };





  const applyDepositSection = async (depositId, sectionId) => {


    // 新字段 keys（基于 llmScript）
    const typeKey = `${depositId}||${sectionId}||type`;
    const descriptionKey = `${depositId}||${sectionId}||description`;
    const instructionsKey = `${depositId}||${sectionId}||instructions`;
    const inputSourceDescKey = `${depositId}||${sectionId}||inputSourceDesc`;
    const targetTitleKey = `${depositId}||${sectionId}||targetTitle`;
    const aiGuidanceKey = `${depositId}||${sectionId}||aiGuidance`;
    
    // 旧字段 keys
    const actionKey = `${depositId}||${sectionId}||action`;


    const execKey = `${depositId}||${sectionId}||exec`;


    const summaryKey = `${depositId}||${sectionId}||summary`;


    const locationKey = `${depositId}||${sectionId}||location`;


    const reqInputKey = `${depositId}||${sectionId}||req_input`;


    const reqExecKey = `${depositId}||${sectionId}||req_exec`;


    const reqSummaryKey = `${depositId}||${sectionId}||req_summary`;


    const reqLocationKey = `${depositId}||${sectionId}||req_location`;

    // 新字段值（llmScript 字段）
    const llmType = (depositEditing[typeKey] ?? '').toString();
    const llmDescription = (depositEditing[descriptionKey] ?? '').toString();
    const llmInstructions = (depositEditing[instructionsKey] ?? '').toString();
    const llmInputSourceDesc = (depositEditing[inputSourceDescKey] ?? '').toString();
    const llmTargetTitle = (depositEditing[targetTitleKey] ?? '').toString();
    const llmAiGuidance = (depositEditing[aiGuidanceKey] ?? '').toString();

    // 旧字段值
    const operationRecord = (depositEditing[actionKey] ?? '').toString();


    const actionExecution = (depositEditing[execKey] ?? '').toString();


    const executionSummary = (depositEditing[summaryKey] ?? '').toString();


    const recordLocation = (depositEditing[locationKey] ?? '').toString();


    const currentSection =


      deposits.find((d) => d.id === depositId)?.sections?.find((s) => s.id === sectionId) || {};


    const baseRequirements = getSectionRequirements(currentSection);


    const requirements = {


      inputSource: normalizeRequirement(depositEditing[reqInputKey] ?? baseRequirements.inputSource),


      actionExecution: normalizeRequirement(depositEditing[reqExecKey] ?? baseRequirements.actionExecution),


      executionSummary: normalizeRequirement(depositEditing[reqSummaryKey] ?? baseRequirements.executionSummary),


      recordLocation: normalizeRequirement(depositEditing[reqLocationKey] ?? baseRequirements.recordLocation)


    };


    const compileKey = `${depositId}||${sectionId}`;


    setCompilingDepositSections((prev) => ({ ...prev, [compileKey]: true }));


    try {


      const res = await api(`/api/multi/precipitation/records/${depositId}/sections/${sectionId}/compile`, {


        method: 'POST',


        body: {

          // 新字段（llmScript）
          llmScript: {
            type: llmType,
            description: llmDescription,
            actionDescription: llmDescription,
            instructions: llmInstructions,
            promptContent: llmInstructions,
            inputSourceDesc: llmInputSourceDesc,
            targetTitle: llmTargetTitle,
            outputTargetDesc: llmTargetTitle,
            aiGuidance: llmAiGuidance
          },

          // 旧字段（兼容）
          operationRecord,


          actionExecution,


          executionSummary,


          recordLocation,


          actionLabel: operationRecord,


          requirements


        }


      });


      if (res?.record) {


        setDeposits((prev) => prev.map((d) => d.id === res.record.id ? res.record : d));


      } else if (res?.section) {


        setDeposits((prev) =>


          prev.map((d) => {


            if (d.id !== depositId) return d;


            const nextSections = (d.sections || []).map((s) =>


              s.id === sectionId ? { ...res.section, requirements: res.section.requirements || requirements } : s


            );


            return { ...d, sections: nextSections };


          })


        );


      }


      cancelEditDepositSection(depositId, sectionId);


      showToast('已更新 section');


    } catch (e) {


      console.error('编译沉淀信息失败', e);


      showToast(e?.message || '编译失败');


    } finally {


      setCompilingDepositSections((prev) => {


        const next = { ...prev };


        delete next[compileKey];


        return next;


      });


    }


  };





  const handleDepositNameKeyDown = (e, depositId) => {


    if (e.key !== 'Enter') return;


    e.preventDefault();


    void applyDepositName(depositId);


  };





  const handleDepositSectionKeyDown = (e, depositId, sectionId) => {


    if (e.key !== 'Enter') return;


    if (e.shiftKey) return;


    e.preventDefault();


    void applyDepositSection(depositId, sectionId);


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


        showToast('粘贴的文本不能为空');


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


        process: createRes?.overwritten ? '覆盖同名文档并更新内容' : '新增文档',


        outputs: { summary: '已新增文档：' + (doc?.name || name) + (createRes?.overwritten ? '（覆盖同名文档）' : '') },


        destinations: [{ kind: 'docs_list' }]


      });


      if (scene) {


        const docIds = Array.from(new Set([doc.id, ...(scene.docIds || [])]));


        const { scene: s } = await api(`/api/scene/${scene.id}`, {


          method: 'PATCH',


          body: { docIds }


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


          const name = file?.name || '未命名文件';


          const isDocx = isDocxName(name);


          const rawText = isDocx ? await parseDocxFileToStructuredText(file) : await readFileText(file);


          const text = typeof rawText === 'string' ? rawText : String(rawText ?? '');


          const createRes = await api('/api/docs', {


            method: 'POST',


            body: { name, content: text }


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


                format: isDocx ? 'docx' : 'text'


              }],





            process: (isDocx ? '解析 Word(.docx) 为结构化文本，' : '') + (createRes?.overwritten ? '覆盖同名文档' : '上传为新文档'),


            outputs: { summary: '已上传文档：' + (doc?.name || name) + (createRes?.overwritten ? '（覆盖同名文档）' : '') },


            destinations: [{ kind: 'docs_list' }]


          });


        } catch (err) {


          console.error(err);


          failedFiles.push({


            name: file?.name || '(unknown)',


            error: err?.message || '读取或保存文件失败'


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


            body: { docIds }


          });


          setScene(s);


        }


      }





      if (uniqueCreatedDocs.length && failedFiles.length) {


        showToast(`已上传 ${uniqueCreatedDocs.length} 个文档，失败 ${failedFiles.length} 个`);


      } else if (uniqueCreatedDocs.length) {


        showToast(`已上传 ${uniqueCreatedDocs.length} 个文档`);


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


        body: { docIds: ids }


      });


      setScene(patched.scene);


    }


    return ids;


  }





  async function editSection(sectionId) {


    if (!scene) return;


    const current = scene.sections?.[sectionId]?.content || '';


    const next = window.prompt('编辑段落内容（Markdown/Text）', current);


    if (next === null) return;


    const { scene: s } = await api(`/api/scene/${scene.id}/section/${sectionId}`, {


      method: 'PATCH',


      body: { content: next }


    });


    setScene(s);


    showToast('内容已更新');


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


      lines.push(slot?.content?.trim() ? slot.content : '暂无内容');


      lines.push('');


    });


    return lines.join('\n');


  }





  async function openFinalPreview() {


    const text = buildFinalText();


    if (!text.trim()) {


      showToast('暂无可生成的内容');


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


          body: { text, systemPrompt: cfg.prompt }


        });


        if (res?.text && typeof res.text === 'string') finalText = res.text;


        usedModel = res?.usedModel !== false;


      } catch (err) {


        console.error(err);


        showToast(err.message || '生成最终文档失败，将使用原始内容预览');


        usedModel = null;


      } finally {


        setFinalizing(false);


      }


    }





    logSectionWithMeta(cfg?.label || UI_TEXT.t91, {


      type: 'final_generate',


      buttonId: cfg?.id,


      buttonLabel: cfg?.label,


      prompt: cfg?.prompt,


      inputs: [{ kind: 'manual_text', length: text.length }],


      process: modelAttempted ? '使用大模型对合并内容进行润色' : '使用当前预览内容（未调用大模型）',


      outputs: { summary: '最终文档已生成，长度：' + finalText.length + (usedModel === false ? '（未配置大模型）' : ''), textExcerpt: finalText },


      destinations: [{ kind: 'final_preview' }],


      usedModel


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


        showToast('自动创建场景失败，请稍后重试');


        return;


      }


    }





    // Determine configuration:


    // Ensure we use the clicked button's config (Global Button), merging with defaults if IO is missing


    let btnConfig = buttonConfig;





    // If it's a Global Button (likely lacking 'io'), merge with default definition for its kind


    if (btnConfig && !btnConfig.io) {


      const defaults = defaultLlmButtons();


      const defaultMatch = defaults.find((b) => b.kind === btnConfig.kind) || defaults[0];





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


      return showToast('请先在文档源列表中选择一个文档');


    }





    const io = normalizeIoRows(btn?.io, { dataSource: btn?.dataSource, outputTarget: btn?.outputTarget });


    const enabledRows = io.filter((r) => r.enabled);


    if (!enabledRows.some((r) => r.output === 'titles')) {


      showToast('请至少保留一条“输入标题”的规则');


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


        body: { text, prompt: btn.prompt || '' }


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


        })


      };





      const applyRes = await api(`/api/scene/${currentScene.id}/apply-template`, {


        method: 'POST',


        body: { template: transformedTemplate }


      });


      setTemplate(applyRes.template);


      setScene(applyRes.scene);


      setShowOutlineMode(true);


      // ========== 大模型级别沉淀记录（全文大纲抽取）==========
      // 记录完整信息，支持 Replay 时使用新文档内容生成大纲
      logSectionWithMeta('全文大纲抽取', {


        type: 'outline_extract',

        // ========== 动作描述 ==========
        actionDescription: `从文档「${doc.name}」中使用大模型抽取大纲结构`,

        buttonId: btn.id,


        buttonLabel: btn.label,


        prompt: btn.prompt,


        io: enabledRows,

        // ========== 输入信息 ==========
        selectedDocName: doc.name,
        selectedDocId: doc.id,
        // 记录输入文档的内容摘要（用于 Replay 时参考）
        inputContentExcerpt: (doc.content || '').toString().substring(0, 500),
        inputContentLength: (doc.content || '').toString().length,

        inputs: sources.map((src) =>


          src === 'selected_doc' ?


            { 
              kind: 'doc_resource', 
              docName: doc.name, 
              docId: doc.id,
              length: (doc.content || '').toString().length,
              contentExcerpt: (doc.content || '').toString().substring(0, 300)
            } :


            { 
              kind: 'doc_preview', 
              docName: doc.name, 
              length: (docDraft || '').toString().length,
              contentExcerpt: (docDraft || '').toString().substring(0, 300)
            }


        ),


        process: '对输入文本进行语义理解，抽取 1-3 级标题，并按按钮配置写入标题/摘要',

        // ========== 输出信息 ==========
        outputs: {



          summary: '生成大纲：标题数 ' + applyRes.template.sections.length + (tplRes?.usedModel === false ? tplRes?.blocked ? '（安全拦截，已降级规则提取）' : '（未配置大模型）' : ''),




          sectionsCount: applyRes.template.sections.length,


          usedModel: tplRes?.usedModel !== false,

          // 记录完整的生成大纲结构（用于 Replay 时参考和对比）
          generatedSections: (applyRes.template.sections || []).map((s) => ({
            id: s.id,
            level: s.level,
            levelText: s.level === 1 ? '一级标题' : s.level === 2 ? '二级标题' : s.level === 3 ? '三级标题' : `${s.level}级标题`,
            title: s.title || '',
            summary: s.summary || '',
            hint: s.hint || ''
          })),

          sectionsSample: (applyRes.template.sections || []).slice(0, 8).map((s) => ({


            id: s.id,


            level: s.level,


            title: clipText(s.title || '', 80),


            summaryExcerpt: clipText(s.summary || s.hint || '', 120)


          }))


        },

        // ========== 目标位置 ==========
        destinations: [{ kind: 'outline_apply', count: applyRes.template.sections.length }],
        outputTarget: '大纲配置面板',
        
        // ========== AI 指导（用于大模型 Replay）==========
        aiGuidance: `从输入文档中提取大纲结构，识别标题层级（1-3级），并为每个标题生成摘要或提示信息。Replay 时应使用目标文档的最新内容进行大纲抽取。`,
        specialRequirements: '保持原文档的结构层次，确保标题完整、摘要简洁'


      });


      showToast(


        tplRes?.usedModel === false ?


          tplRes?.blocked ?


            '已生成并应用新模板（内容审核拦截：规则抽取）' :


            '已生成并应用新模板（未配置大模型，请设置 QWEN_API_KEY）' :


          '已生成并应用新模板'


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


        process: '清空已抽取的大纲数据，使用空模板并重置列表',


        outputs: { summary: `已清空大纲，原有标题 ${prevCount} 条`, clearedCount: prevCount },


        destinations: [{ kind: 'outline_apply', count: 0 }]


      });


      showToast('已清空大纲');


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


      showToast('按钮配置缺少“摘要/标题”写入规则，无法应用');


      return;


    }





    const doc = docs.find((d) => d.id === selectedDocId) || null;


    if (!doc) {


      showToast('请先选择一个文档作为数据源');


      return;


    }


    const previewText =


      doc?.id && doc.id === selectedDocId && (docDraft || '').toString().trim() ?


        docDraft :


        (doc.content || '').toString();


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


      content: (sec.summary || sec.hint || '').toString()


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


          systemPrompt: btn?.prompt


        }


      });


      if (result?.usedModel === false) {


        throw new Error('未配置QWEN_API_KEY，未调用大模型（请在 `server.js` 配置环境变量后重试）');


      }


      const summary = extractText(result.summary || '') || '已完成';


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


              summary: hasToSummary ? detail : sec.summary


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


          ...sources.map((src) => ({ kind: src === 'selected_doc' ? 'selected_doc' : 'preview', length: docContent.length }))],





        process: '使用个性化按钮调用大模型，对选中标题进行写入并应用结果',


        outputs: { summary, detailLength: detail.length },


        destinations: [{ kind: 'outline_section_summary_batch', sectionIds: selectedSections.map((s) => s.id), count: selectedSections.length }]


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


      showToast('请输入指令');


      return;


    }


    if (dispatchInputRef.current) dispatchInputRef.current.value = '';


    // 注意：不记录"输入指令"步骤，只在"执行指令"时记录完整信息（包括prompt和输出结果）


    const baseDoc = docs.find((d) => d.id === selectedDocId)?.content || '';


    let docContent = baseDoc;


    let outlineSegments = [];


    const dispatchInputs = [];


    let dispatchInputKind = dispatchMode === 'result' ? 'result' : 'doc';


    let selectedOutlineIdsForDispatch = [];


    let dispatchInputNote = '';


    let historyInputs = null;





    if (dispatchMode === 'batch_outline') {


      const selectedSections = (template?.sections || []).filter((sec) => selectedOutlineExec[sec.id]);


      if (!selectedSections.length) {


        showToast('请先选择要处理的标题');


        return;


      }


      selectedOutlineIdsForDispatch = selectedSections.map((s) => s.id);


      dispatchInputs.push({ kind: 'outline_selected', sectionIds: selectedOutlineIdsForDispatch });





      dispatchInputKind = 'outline_selected_batch';


      dispatchInputNote = '输入来自：已勾选标题及摘要；输出将按 edits 修改大纲';





      outlineSegments = selectedSections.map((sec, idx) => ({


        sectionId: sec.id,


        field: 'summary', // Initial field hint, but content includes both


        content: `标题：${sec.title}\n摘要：${sec.summary || sec.hint || ''}`,


        label: `片段${idx + 1}`


      }));


      const labeled = outlineSegments.
        map((seg) => `【${seg.label} | ID=${seg.sectionId}】\n${seg.content}`).
        join('\n\n');
      docContent = labeled;


    } else if (showOutlineMode) {


      const selectedSections = (template?.sections || []).filter((sec) => selectedOutlineExec[sec.id]);


      if (!selectedSections.length) {


        showToast('请先选择要处理的标题');


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


        const docItems = allDocIds.


          map((id) => docs.find((d) => d.id === id)).


          filter(Boolean);


        if (!docItems.length) {


          showToast('未找到可处理文档');


          return;


        }


        docItems.forEach((d) => dispatchInputs.push({ kind: 'doc_resource', docName: d.name, length: (d.content || '').toString().length }));


        docContent = docItems.


          map((d, i) => `【文：${i + 1}：${d.name}\n${d.content}`).


          join('\n\n---\n\n');


        outlineSegments = sectionsWithUnprocessed.map((item, idx) => ({


          sectionId: item.sec.id,


          field: 'summary',


          content: item.sec.summary || item.sec.hint || item.sec.title || '',


          label: `片段${idx + 1}`


        }));


      } else {


        // 处理摘要文本 


        dispatchInputKind = 'outline_summaries';


        dispatchInputNote = '输入来自：已勾选标题的摘要/提示；输出用于覆盖摘要或按 edits 写回大纲';


        outlineSegments = selectedSections.map((sec, idx) => ({


          sectionId: sec.id,


          field: 'summary',


          content: sec.summary || sec.hint || sec.title || '',


          label: `片段${idx + 1}`


        }));


        const labeled = outlineSegments.
          map((seg) => `【${seg.label} | ID=${seg.sectionId}】\n${seg.content}`).
          join('\n\n');
        docContent = labeled;
      }
    } else if (dispatchMode === 'result') {


      dispatchInputKind = 'result';


      dispatchInputNote = '输入来自：操作调度历史中选择的片段；输出写入处理结果';


      const entries = Object.entries(selectedLogTexts).filter(


        ([, v]) => typeof v === 'string' && v.trim()


      );


      if (!entries.length) {


        showToast('请先选择操作历史片段');


        return;


      }


      historyInputs = entries.map(([key, text]) => ({


        key,


        length: (text || '').toString().trim().length,


        text: clipText((text || '').toString().trim(), 2200)


      }));


      dispatchInputs.push(`历史片段：${entries.length}段）`);


      const labeled = entries.map(([key, text], idx) => {


        const tag = key.includes('detail') ? '详情' : '摘要/指令';


        return `【片：${idx + 1}：${tag}】\n${text.trim()}`;


      });


      docContent = labeled.join('\n\n');


    } else {


      dispatchInputKind = 'doc';


      dispatchInputNote = '输入来自：来源列表选中的文档；输出写入处理结果';


      if (!docContent.trim()) {


        showToast('请先选择文档并确保内容存在');


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


          systemPrompt: dispatchCfg?.prompt


        }


      });


      const usedModel = result?.usedModel !== false;


      const summary = extractText(result.summary || '') || (usedModel ? '模型已处理' : '未配置大模型，使用占位结果');


      const detail = extractText(result.detail || '');


      setDispatchLogs((logs) => [...logs, { role: 'system', text: summary, detail }]);


      setProcessedContent(detail || summary);


      setSelectedLogTexts({});


      showToast(summary || '未生成结果');


      if (dispatchInputRef.current) dispatchInputRef.current.value = '';





      let appliedEditsCount = 0;


      // 如果返回了大纲编辑内容，应用到模板上 
      // 辅助函数：从大模型返回的 sectionId 中解析出实际 ID
      // 支持格式：
      // - "sec_xxx" (直接 ID)
      // - "2" (纯数字，按索引匹配)
      // - "片段1" (中文标签，按索引匹配)
      // - "片段1: sec_xxx" (标签+ID)
      // - "ID=sec_xxx" (ID=格式)
      const resolveEditSectionId = (rawId, segmentIdList) => {
        if (!rawId) return null;
        const str = String(rawId).trim();
        
        // 1. 尝试匹配 "ID=xxx" 或 "id=xxx" 格式
        const idMatch = str.match(/ID\s*=\s*(.+)/i);
        if (idMatch) return idMatch[1].trim();
        
        // 2. 尝试匹配 "片段N: xxx" 格式，取 xxx
        const labelContentMatch = str.match(/片段\d+\s*[:：]\s*(.+)/);
        if (labelContentMatch) return labelContentMatch[1].trim();
        
        // 3. 尝试匹配 "xxx | ID=yyy" 格式，取 ID 部分
        const pipeMatch = str.match(/\|\s*ID\s*=\s*(.+)/i);
        if (pipeMatch) return pipeMatch[1].trim();
        
        // 4. 如果是纯数字，按索引匹配（1-based）
        if (/^\d+$/.test(str)) {
          const idx = parseInt(str, 10) - 1;  // 转为 0-based
          if (idx >= 0 && idx < segmentIdList.length) {
            return segmentIdList[idx];
          }
        }
        
        // 5. 如果是 "片段N" 格式，按索引匹配
        const labelOnlyMatch = str.match(/片段(\d+)/);
        if (labelOnlyMatch) {
          const idx = parseInt(labelOnlyMatch[1], 10) - 1;  // 转为 0-based
          if (idx >= 0 && idx < segmentIdList.length) {
            return segmentIdList[idx];
          }
        }
        
        // 6. 直接返回原值
        return str;
      };

      // 收集 outlineSegments 中的 sectionId 列表，用于索引匹配
      const segmentIdList = outlineSegments.map(seg => seg.sectionId);

      if (Array.isArray(result.edits) && result.edits.length) {
        appliedEditsCount = result.edits.length;
        setTemplate((prev) => {
          if (!prev) return prev;
          const nextSections = prev.sections.map((sec) => {
            // 使用增强的容错匹配逻辑
            const found = result.edits.find((e) => {
              const resolvedId = resolveEditSectionId(e.sectionId, segmentIdList);
              return resolvedId === sec.id || e.sectionId === sec.id;
            });
            if (!found) return sec;
            return {
              ...sec,
              title: found.field === 'title' && found.content ? found.content : sec.title,
              summary: found.field === 'summary' && found.content ? found.content : sec.summary
            };
          });
          const nextTpl = { ...prev, sections: nextSections };


          if (scene?.customTemplate) {


            setScene({ ...scene, customTemplate: nextTpl });


          }


          return nextTpl;


        });


      }





      // 记录 edits 已经更新的 sectionId
      const editedSectionIds = new Set();
      if (Array.isArray(result.edits)) {
        result.edits.forEach(e => {
          const resolvedId = resolveEditSectionId(e.sectionId, segmentIdList);
          if (resolvedId) editedSectionIds.add(resolvedId);
          if (e.sectionId) editedSectionIds.add(e.sectionId);
        });
      }

      let appliedSummaryCount = 0;





      // 对于 edits 没有覆盖到的选中标题，如果有 detail，用 detail 填充
      if (showOutlineMode && detail) {
        const selectedIds = Object.keys(selectedOutlineExec).filter((k) => selectedOutlineExec[k]);
        // 找出还没有被 edits 更新的选中标题
        const remainingIds = selectedIds.filter(id => !editedSectionIds.has(id));
        
        if (remainingIds.length) {
          appliedSummaryCount = remainingIds.length;
          setTemplate((prev) => {
            if (!prev) return prev;
            const nextSections = prev.sections.map((sec) =>
              // 只更新 edits 没有覆盖到的选中标题
              remainingIds.includes(sec.id) ? { ...sec, summary: detail } : sec
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


      if (appliedEditsCount) destinations.push(`文档处理/大纲配置（按 edits 写回${appliedEditsCount}处）`);





      // 沉淀记录：执行指令 - 记录完整信息
      // 包括：prompt内容、输入来源、输出目标、输出内容、特殊要求
      
      // 构建输入来源描述（包含标题级别、标题名称、内容来源类型）
      const inputSourceDesc = (() => {
        const sources = [];
        
        // 辅助函数：获取标题的详细描述（包含级别）
        const getSectionDesc = (secId) => {
          const sec = (template?.sections || []).find(s => s.id === secId);
          if (!sec) return secId;
          const levelText = sec.level === 1 ? '一级标题' : sec.level === 2 ? '二级标题' : sec.level === 3 ? '三级标题' : `${sec.level}级标题`;
          return `${levelText}「${sec.title}」`;
        };
        
        if (dispatchInputKind === 'doc') {
          const docName = docs.find(d => d.id === selectedDocId)?.name;
          sources.push(`文档「${docName || '未知'}」的内容`);
        } else if (dispatchInputKind === 'result') {
          sources.push('操作调度历史中选择的片段');
        } else if (dispatchInputKind === 'outline_selected_batch') {
          // 已勾选标题及摘要
          const sectionDescs = selectedOutlineIdsForDispatch.map(getSectionDesc);
          sources.push(`已勾选的大纲（${sectionDescs.join('、')}）的标题和摘要内容`);
        } else if (dispatchInputKind === 'outline_summaries') {
          // 已勾选标题的摘要/提示
          const sectionDescs = selectedOutlineIdsForDispatch.map(getSectionDesc);
          sources.push(`已勾选的大纲（${sectionDescs.join('、')}）的摘要内容`);
        } else if (dispatchInputKind === 'outline_unprocessed_docs') {
          // 标题下未处理的已添加文档
          const sectionDescs = selectedOutlineIdsForDispatch.map(getSectionDesc);
          sources.push(`已勾选的大纲（${sectionDescs.join('、')}）下未处理的关联文档`);
        } else if (dispatchInputKind === 'batch_outline') {
          const sectionDescs = selectedOutlineIdsForDispatch.map(getSectionDesc);
          sources.push(`大纲标题：${sectionDescs.join('、')}`);
        }
        return sources.join('；') || '未指定';
      })();

      // 构建输出目标描述（包含标题级别和名称）
      const outputTargetDesc = (() => {
        const targets = [];
        
        // 如果有应用到大纲摘要，详细列出目标标题
        if (showOutlineMode && appliedSummaryCount) {
          const targetSectionDescs = selectedOutlineIdsForDispatch.map(id => {
            const sec = (template?.sections || []).find(s => s.id === id);
            if (!sec) return id;
            const levelText = sec.level === 1 ? '一级标题' : sec.level === 2 ? '二级标题' : sec.level === 3 ? '三级标题' : `${sec.level}级标题`;
            return `${levelText}「${sec.title}」`;
          });
          targets.push(`大纲摘要（${targetSectionDescs.join('、')}）`);
        }
        
        // 如果有 edits 应用，也列出具体标题
        if (appliedEditsCount && Array.isArray(result.edits)) {
          const editTargets = result.edits.map(e => {
            // 从 outlineSegments 中找到对应的 section
            const seg = outlineSegments.find(s => s.sectionId === e.sectionId);
            const sec = (template?.sections || []).find(s => s.id === e.sectionId);
            if (sec) {
              const levelText = sec.level === 1 ? '一级标题' : sec.level === 2 ? '二级标题' : sec.level === 3 ? '三级标题' : `${sec.level}级标题`;
              return `${levelText}「${sec.title}」的${e.field === 'title' ? '标题' : '摘要'}`;
            }
            return `${e.sectionId}的${e.field || 'summary'}`;
          });
          targets.push(`大纲配置（${editTargets.join('、')}）`);
        }
        
        targets.push('结果展示区');
        return targets.join('、');
      })();

      // ========== 大模型级别沉淀记录（执行指令）==========
      // 记录完整信息，支持 Replay 时使用最新目标位置内容处理
      
      // 构建输入内容的实际文本（用于 Replay 时作为参考）
      const inputContentForRecord = (() => {
        if (dispatchInputKind === 'result' && Array.isArray(historyInputs) && historyInputs.length) {
          return historyInputs.map((h, idx) => `【片段${idx + 1}：${h?.key || ''}】\n${h?.text || ''}`).join('\n\n');
        } else if (outlineSegments && outlineSegments.length > 0) {
          return outlineSegments.map((s, idx) => `【${s.label || `片段${idx + 1}`}】\n${s.content || ''}`).join('\n\n');
        }
        return '';
      })();
      
      // 构建目标位置的详细信息（包含原始值，用于 Replay 时获取最新内容）
      const targetSectionsDetailForRecord = selectedOutlineIdsForDispatch.map(id => {
        const sec = (template?.sections || []).find(s => s.id === id);
        if (!sec) return { id, found: false };
        const levelText = sec.level === 1 ? '一级标题' : sec.level === 2 ? '二级标题' : sec.level === 3 ? '三级标题' : `${sec.level}级标题`;
        return {
          id: sec.id,
          level: sec.level,
          levelText,
          title: sec.title,
          originalSummary: sec.summary || '', // 原始摘要内容（Replay 时需要获取最新值）
          originalHint: sec.hint || '',
          found: true
        };
      });

      logSectionWithMeta('执行指令', {
        type: 'dispatch',
        // ========== 动作描述 ==========
        actionDescription: `对已勾选大纲标题的内容执行指令「${instructions}」`,
        // 记录 prompt 内容（指令要求）- 这是核心的处理逻辑
        promptContent: instructions,
        instructions: instructions, // 同时记录为 instructions 字段（兼容性）
        
        // ========== 输入信息 ==========
        inputKind: dispatchInputKind,
        inputSourceType: dispatchInputKind,
        inputSourceDesc,
        // 输入内容的实际文本（Replay 时需要获取最新内容替换）
        inputContent: inputContentForRecord,
        inputContentExcerpt: inputContentForRecord.length > 500 ? inputContentForRecord.substring(0, 500) + '...' : inputContentForRecord,
        
        // 选中的大纲标题（用标题定位）
        selectedSectionTitles: selectedOutlineIdsForDispatch.map(id => {
          const sec = (template?.sections || []).find(s => s.id === id);
          return sec?.title || id;
        }),
        selectedSectionIds: selectedOutlineIdsForDispatch,
        inputs: dispatchInputs,
        
        // ========== 目标位置详细信息 ==========
        // 大纲段落信息（记录标题、级别、原始内容用于定位和 Replay）
        targetSectionsDetail: targetSectionsDetailForRecord,
        outlineSegmentsMeta: (outlineSegments || []).map((s) => ({
          sectionTitle: s.label || s.title || '',
          sectionId: s.sectionId,
          field: s.field,
          originalContent: s.content || '' // 记录原始内容
        })),
        
        // ========== 输出信息 ==========
        outputTargetDesc,
        process: `执行指令：${instructions}`,
        outputs: {
          summary,
          usedModel,
          // 记录完整的输出内容（大模型生成的结果）
          outputContent: detail || summary,
          outputContentExcerpt: detail ? detail.substring(0, 500) : summary,
          detailExcerpt: detail,
          // 记录 edits 详情（用于 Replay 时知道要更新哪些字段）
          edits: Array.isArray(result.edits) ? result.edits.map(e => ({
            sectionId: e.sectionId,
            field: e.field || 'summary',
            newValue: e.newValue,
            newValueExcerpt: (e.newValue || '').substring(0, 200)
          })) : [],
          editsCount: Array.isArray(result.edits) ? result.edits.length : 0,
          status: 'done'
        },
        destinations,
        
        // ========== AI 指导（用于大模型 Replay）==========
        aiGuidance: `根据指令「${instructions}」处理输入内容，生成符合要求的输出。Replay 时应使用目标位置的最新内容作为输入。`,
        specialRequirements: '无'
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


    showToast('已写入处理结果');


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





  const clearAllDocs = async () => {


    if (!docs.length) return;


    if (!confirm('确认要清空文档列表中的全部文件吗？此操作不可撤销。')) return;


    try {


      for (const doc of docs) {


        await api(`/api/docs/${doc.id}`, { method: 'DELETE' });


      }


      setDocs([]);


      setSelectedDocId(null);


      setSectionDocLinks({});


      setSectionDocPick({});


      setSectionDocDone({});


      if (scene) {


        setScene({ ...scene, docIds: [] });


      }


      showToast('已清空全部文档');


    } catch (err) {


      console.error(err);


      showToast(err.message || '清除失败');


    }


  };





  useEffect(() => {


    if (!appButtonsConfig.length) {


      setSelectedAppButtonId('');


      return;


    }


    setSelectedAppButtonId((prev) => {


      if (prev && appButtonsConfig.some((btn) => btn.id === prev)) return prev;


      return appButtonsConfig[0].id;


    });


  }, [appButtonsConfig]);





  const selectedDoc = docs.find((d) => d.id === selectedDocId);


  const levelLabel = {


    1: '一级标题',


    2: '二级标题',


    3: '三级标题',


    4: '四级标题',


    5: '五级标题'


  };





  const slotsForOutput = Object.keys(finalSlots).length ? finalSlots : {};





  const startEditOutline = (id, field, value) => {


    setOutlineEditing((prev) => ({


      ...prev,


      [`${id}||${field}`]: value ?? ''


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


        destinations: [{ kind: 'outline_section_docs', sectionId }]


      },


      [sec ? `标题：${sec.title || ''}（第${Number(sec.level) || 1}级）` : `标题：${sectionId}`]


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


          pickId && pickId === selectedDocId ?


            { kind: 'doc_preview', docName, length: (docDraft || '').toString().length } :


            { kind: 'doc_resource', docName, length: (doc?.content || '').toString().length }],





        process: '将选中文档的全部内容复制到该标题的摘要中（覆盖原摘要）',


        outputs: { summary: `摘要已更新，长度：${(content || '').toString().length}` },


        destinations: [{ kind: 'outline_section_summary', sectionId }]


      },


      [sec ? `标题：${sec.title || ''}（第${Number(sec.level) || 1}级）` : `标题：${sectionId}`]


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


        process: '从大纲标题移除已关联文档',


        outputs: { summary: `已取消关联文档：${docName}` },


        destinations: [{ kind: 'outline_section_docs', sectionId }]


      },


      [sec ? `标题：${sec.title || ''}（第${Number(sec.level) || 1}级）` : `标题：${sectionId}`]


    );


  };





  const persistSectionLinks = async (links) => {


    if (!scene) return null;


    try {


      const { scene: s } = await api(`/api/scene/${scene.id}`, {


        method: 'PATCH',


        body: { sectionDocLinks: links }


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


        body: { content: docDraft }


      });


      setDocs((prev) => prev.map((d) => d.id === doc.id ? doc : d));


      showToast('文档内容已保存');


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
      // 沉淀记录：用标题定位，不记录编辑框具体内容


      logSectionWithMeta(


        '编辑摘要',


        {


          type: 'edit_outline_summary',


          // 使用标题定位，而非序号
          sectionTitle: sec?.title || '',
          sectionId,


          inputs: [{ kind: 'manual_edit', sourceType: 'user_edit' }],


          process: '手动编辑大纲标题下的摘要内容',


          outputs: {


            summary: '摘要已更新',
            status: 'done'


          },


          // 记录位置：使用标题
          destinations: [{ kind: 'outline_section_summary', sectionTitle: sec?.title || '', sectionId }]


        },


        [sec ? `标题：${sec.title || ''}（第${Number(sec.level) || 1}级）` : `标题：${sectionId}`]


      );


    } else if (field === 'title') {


      const sec = (template?.sections || []).find((s) => s.id === sectionId);
      // 沉淀记录：用标题定位，记录标题变更但不记录完整内容


      logSectionWithMeta(


        '编辑标题',


        {


          type: 'edit_outline_title',


          // 使用原标题定位
          sectionTitle: prevTitle || '',
          sectionId,


          inputs: [{ kind: 'manual_edit', sourceType: 'user_edit' }],


          process: '手动编辑大纲标题文本',


          outputs: {


            summary: '标题已更新',
            status: 'done'


          },


          // 记录位置：使用标题
          destinations: [{ kind: 'outline_section_title', sectionTitle: prevTitle || '', sectionId }]


        },


        [sec ? `标题位置：${prevTitle || ''}` : `标题：${sectionId}`]


      );


    }


  };





  const clearOutlineSummary = (sectionId) => {


    const sec = template?.sections.find((s) => s.id === sectionId);


    const prevShown = sec?.summary || sec?.hint || '';


    setTemplate((prev) => {


      if (!prev) return prev;


      const updatedSections = prev.sections.map((s) => s.id === sectionId ? { ...s, summary: '', hint: '' } : s);


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


        outputs: { summary: `摘要已清空，原长度：${(prevShown || '').toString().length}`, beforeExcerpt: clipText(prevShown || '', 260) },


        destinations: [{ kind: 'outline_section_summary', sectionId }]


      },


      [sec ? `标题：${sec.title || ''}（第${Number(sec.level) || 1}级）` : `标题：${sectionId}`]


    );


    showToast('已删除摘要');


  };





  const updateSectionLevel = (sectionId, level) => {


    const lvl = Number(level) || 1;


    setTemplate((prev) => {


      if (!prev) return prev;


      const updatedSections = prev.sections.map((s) =>


        s.id === sectionId ? { ...s, level: Math.max(1, Math.min(4, lvl)) } : s


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
    // 获取参考标题的信息（用于沉淀记录和继承级别）
    const afterSection = (template?.sections || []).find(s => s.id === afterId);
    
    // 新增标题继承参考标题的级别（默认为1级）
    const inheritedLevel = afterSection?.level || 1;
    const levelText = inheritedLevel === 1 ? '一级标题' : inheritedLevel === 2 ? '二级标题' : inheritedLevel === 3 ? '三级标题' : `${inheritedLevel}级标题`;

    const newSection = {


      id: `sec_local_${Date.now()}_${Math.floor(Math.random() * 1000)}`,


      title: '新标题',


      summary: '',


      hint: '',


      level: inheritedLevel  // 继承参考标题的级别


    };


    updateTemplateSections((sections) => {


      if (!sections.length) return [newSection];


      const idx = sections.findIndex((s) => s.id === afterId);


      if (idx === -1) return [...sections, newSection];


      const before = sections.slice(0, idx + 1);


      const after = sections.slice(idx + 1);


      return [...before, newSection, ...after];


    });
    
    // ========== 大模型级别沉淀记录（新增标题）==========
    logSectionWithMeta('新增标题', {
      type: 'add_outline_section',
      
      // ========== 动作描述 ==========
      actionDescription: afterSection ? 
        `在${levelText}「${afterSection.title}」之后新增同级标题` :
        '在大纲末尾新增标题',
      
      // ========== 输入信息 ==========
      afterSectionId: afterId,
      afterSection: afterSection ? {
        id: afterSection.id,
        level: afterSection.level,
        levelText: levelText,
        title: afterSection.title || '',
        summary: afterSection.summary || ''
      } : null,
      
      inputs: [{ kind: 'outline_position', afterSectionId: afterId }],
      
      // ========== 新增的标题信息 ==========
      newSection: {
        id: newSection.id,
        level: newSection.level,
        levelText: levelText,
        title: newSection.title,
        summary: newSection.summary
      },
      
      process: '在指定位置新增标题',
      
      // ========== 输出信息 ==========
      outputs: {
        summary: `已在「${afterSection?.title || '末尾'}」之后新增标题`,
        newSectionId: newSection.id,
        newSectionTitle: newSection.title
      },
      
      // ========== 目标位置 ==========
      destinations: ['文档处理/大纲配置'],
      outputTarget: '大纲配置面板',
      
      // ========== AI 指导（用于大模型 Replay）==========
      aiGuidance: `在指定标题之后新增一个新标题。Replay 时应根据参考标题「${afterSection?.title || ''}」定位插入位置。`,
      specialRequirements: '新增的标题默认为一级标题，标题文本为「新标题」'
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


    // ========== 大模型级别沉淀记录（删除标题）==========
    const levelText = baseLevel === 1 ? '一级标题' : baseLevel === 2 ? '二级标题' : baseLevel === 3 ? '三级标题' : `${baseLevel}级标题`;
    
    logSectionWithMeta(


      '删除标题',


      {


        type: 'delete_outline_section',

        // ========== 动作描述 ==========
        actionDescription: `删除${levelText}「${removedRoot?.title || '未知'}」及其下级标题`,

        sectionId,


        removedIds: idsToRemove,


        baseLevel,
        
        // ========== 输入信息（被删除的标题详情）==========
        inputs: [{ kind: 'outline_selected', sectionIds: [sectionId] }],
        
        // 记录被删除标题的完整信息（用于 Replay 时定位）
        targetSection: {
          id: removedRoot?.id,
          level: removedRoot?.level,
          levelText,
          title: removedRoot?.title || '',
          summary: removedRoot?.summary || '',
          hint: removedRoot?.hint || ''
        },
        
        // 记录所有被删除的标题详情
        removedSections: removed.map(s => ({
          id: s.id,
          level: s.level,
          levelText: s.level === 1 ? '一级标题' : s.level === 2 ? '二级标题' : s.level === 3 ? '三级标题' : `${s.level}级标题`,
          title: s.title || '',
          summary: s.summary || '',
          hint: s.hint || ''
        })),


        process: `删除第${baseLevel}级标题，并删除其下级标题`,

        // ========== 输出信息 ==========
        outputs: {


          summary: `已删除标题：${removedRoot?.title || sectionId}（共${idsToRemove.length}条）`,
          
          deletedCount: idsToRemove.length,


          removedSample: removed.slice(0, 8).map((s) => ({


            id: s.id,


            level: s.level,


            title: clipText(s.title || '', 80)


          }))


        },

        // ========== 目标位置 ==========
        destinations: ['文档处理/大纲配置'],
        outputTarget: '大纲配置面板',
        
        // ========== AI 指导（用于大模型 Replay）==========
        aiGuidance: `删除指定标题及其所有下级标题。Replay 时应根据标题名称「${removedRoot?.title || ''}」定位目标标题，然后执行删除操作。`,
        specialRequirements: '删除操作会同时删除该标题下的所有子标题'


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


    // 优先使用保存的previewSelection状态（点击按钮时DOM选择可能已丢失）


    const domSel = getPreviewSelectionFromDom();


    const snippet = (previewSelection.text || domSel?.text || '').toString();


    const snippetTrimmed = snippet.trim();


    if (!snippetTrimmed) {


      showToast('请先在预览区选择文本');


      return;


    }


    if (!showOutlineMode || processingTab !== 'outline') {


      showToast('请切换到大纲配置并选择要写入的标题');


      return;


    }


    const ids = Object.keys(selectedOutlineExec || {}).filter((id) => selectedOutlineExec[id]);


    if (!ids.length) {


      showToast('请在大纲配置中勾选要写入的标题');


      return;


    }





    const doc = docs.find((d) => d.id === selectedDocId);


    const docName = doc?.name || '未选择文档';


    const selectedSections = (template?.sections || []).filter((s) => ids.includes(s.id));


    const sectionLines = selectedSections.map((s) => {


      const lvl = Number(s.level) || 1;


      const prefix = levelLabel[lvl] || levelLabel[1] || '标题';


      return `- ${prefix}：${(s.title || '').toString()}`;


    });





    const overwriteIds = [];


    const emptyBeforeIds = [];


    selectedSections.forEach((s) => {


      if ((s?.summary || '').toString().trim().length) overwriteIds.push(s.id); else


        emptyBeforeIds.push(s.id);


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


      setScene((sc) => sc ? { ...sc, customTemplate: nextTpl } : sc);


      if (scene?.id) {


        try {


          const res = await api(`/api/scene/${scene.id}/apply-template`, {


            method: 'POST',


            body: { template: nextTpl }


          });


          if (res?.template) setTemplate(res.template);


          if (res?.scene) setScene(res.scene);


        } catch (err) {


          console.error(err);


          showToast(err?.message || '摘要同步失败，已保留当前内容');


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





    // 获取选中内容的上下文（前后各100字符）
    const fullDocText = doc?.content || '';
    const selStart = domSel?.start ?? previewSelection.start;
    const selEnd = domSel?.end ?? previewSelection.end;
    const contextBefore = fullDocText.slice(Math.max(0, selStart - 100), selStart).trim();
    const contextAfter = fullDocText.slice(selEnd, selEnd + 100).trim();
    
    // 获取目标标题的详细信息
    const targetSectionDetails = selectedSections.map(s => ({
      id: s.id,
      title: s.title || '未命名',
      level: s.level || 1,
      hadContentBefore: !!(s.summary?.toString().trim())
    }));

    logSectionWithMeta(
      '填入摘要',
      {
        type: 'insert_to_summary',
        intentDescription: '填入摘要',
        // === 输入信息：选中了什么内容 ===
        docName,
        docId: doc?.id || '',
        selection: { start: selStart, end: selEnd },
        targetSectionIds: ids,
        inputs: [
          {
            kind: 'selection',
            docName,
            contextSummary: docName,
            sourceType: 'selection',
            // 选中内容的详细信息
            textExcerpt: clipText(snippetTrimmed, 200),  // 选中的核心内容
            textLength: snippetTrimmed.length,
            // 上下文信息：这段内容在文档中的前后文
            contextBefore: clipText(contextBefore, 80),
            contextAfter: clipText(contextAfter, 80)
          },
          { 
            kind: 'outline_selected', 
            contextSummary: `已选标题：${ids.length}条`,
            sourceType: 'outline_selected'
          }
        ],
        // === 动作信息 ===
        process: '将内容预览中框选的文本追加到已勾选标题的摘要',
        // === 输出信息：结果写入到哪里 ===
        outputs: {
          summary: `已写入摘要：${ids.length} 个标题（字数：${snippetTrimmed.length}）`,
          usedModel: '',
          status: 'done',
          // 具体写入了哪些标题
          targetSections: targetSectionDetails
        },
        // === 目标位置：作用在哪些标题下 ===
        destinations: [{ 
          kind: 'outline_section_summary_batch', 
          sectionTitle: targetSectionDetails.map(s => s.title).join('、'),
          count: ids.length 
        }],
        // === 额外上下文：覆盖情况 ===
          overwrittenSectionIds: overwriteIds,
          emptyBeforeSectionIds: emptyBeforeIds
      },
      ['操作记录', sectionLines.length ? sectionLines.slice(0, 8).join('\n') : '(空)']
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


    const normalizedMessage =


      message || (


        status === 'pass' ? '已通过（未记录原因）' : status === 'fail' ? '执行失败（未记录原因）' : '');


    setReplayState((prev) => {


      const current = prev[depositId] || { running: false, bySection: {} };


      return {


        ...prev,


        [depositId]: {


          ...current,


          bySection: {


            ...(current.bySection || {}),


            [sectionId]: { status, message: normalizedMessage }


          }


        }


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


      summaryExpanded


    });





  const restoreReplaySnapshot = async (snap) => {
    if (!snap) return;

    // 恢复 Replay 快照
    try {
      const list = await refreshDocsFromServer();
      if (snap.selectedDocId && Array.isArray(list) && list.some((d) => d.id === snap.selectedDocId)) {
        setSelectedDocId(snap.selectedDocId);
      }

      const sharedScene = await loadSharedScene();
      if (sharedScene?.id) {
        const sceneRes = await api(`/api/scene/${sharedScene.id}`);
        const latestScene = sceneRes?.scene || sharedScene;
        setScene(latestScene);
        const tpl = latestScene?.customTemplate || latestScene?.template || null;
        if (tpl) setTemplate(tpl);
        if (latestScene?.sectionDocLinks) setSectionDocLinks(latestScene.sectionDocLinks);
      }
    } catch (_) {

      /* ignore */
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


    if (!scene?.id) throw new Error('scene 未初始化，无法获取大纲');


    if (!tpl || !Array.isArray(tpl.sections)) throw new Error('template 无效');


    const res = await api(`/api/scene/${scene.id}/apply-template`, { method: 'POST', body: { template: tpl } });


    if (res?.scene) setScene(res.scene);


    if (res?.template) setTemplate(res.template);


    if (res?.scene?.sectionDocLinks) setSectionDocLinks(res.scene.sectionDocLinks || {});


    return res?.template || null;


  };





  const strictReplayRequired = (meta, action) => {


    if (meta && typeof meta === 'object') return false;


    const a = (action || '').toString();


    if (a === '输入指令') return false;


    if (a === '编辑标题' || a === '编辑摘要' || a === '删除摘要') return false;


    if (a === '添加文档') return false;


    return true;


  };





  const replayOneDepositSection = async (deposit, section) => {


    const meta = extractReplayMeta(section?.content || '');


    const action = (section?.action || '').toString();


    const mode = normalizePrecipitationMode(deposit?.precipitationMode);


    const softErrors = [];





    const assertReplay = (cond, message, opts = {}) => {


      if (cond) return true;


      if (mode === 'llm' && !opts.strict) {


        softErrors.push(message || 'Replay 校验失败');


        return false;


      }


      throw new Error(message || 'Replay 校验失败');


    };





    const finalizeReplayResult = (result) => {


      if (!result) return result;


      if (!softErrors.length) return result;


      if (result.status === 'done') {
        // 有差异但执行成功 - 兼容性执行
        const replayMode = result.replayMode || 'llm';
        const diffDetails = softErrors.join('；');
        
        let baseMessage = '';
        if (replayMode === 'llm') {
          baseMessage = `🤖 大模型 Replay Done（兼容性执行，差异：${diffDetails}）`;
        } else {
          baseMessage = `📜 脚本 Replay Done（存在差异：${diffDetails}）`;
        }


        return { ...result, status: 'pass', message: baseMessage, softErrors: [...softErrors] };


      }


      return { ...result, softErrors: [...softErrors] };


    };





    if (strictReplayRequired(meta, action)) {


      throw new Error('该 section 缺少回放元数据，无法严格复现；请重新沉淀后再 Replay');


    }





    if (meta?.type === 'dispatch_input' || action === '输入指令') {


      return {


        status: 'pass', message: '已采用大模型泛化执行'


      };


    }





    if (


      meta?.type === 'edit_outline_title' ||


      meta?.type === 'edit_outline_summary' ||


      meta?.type === 'clear_outline_summary' ||


      action === '编辑标题' ||


      action === '编辑摘要' ||


      action === '删除摘要') {


      return {


        status: 'pass', message: '已采用大模型泛化执行'


      };


    }





    if (meta?.type === 'add_doc' || action === '添加文档') {
      const docName = meta?.docName || ((section?.content || '').toString().split('添加文档：')[1] || '').trim();
      const isUpload = meta?.source === 'upload' || (section?.content || '').toString().includes('上传文档');

      if (isUpload) {
        if (meta?.docSelector && typeof meta.docSelector === 'object') {
          const selector = normalizeDocSelector(meta.docSelector);
          const res = await uploadDocsFromReplayDirBySelector(selector);
          assertReplay(res.count > 0, '未匹配到任何文件，无法执行上传', { strict: true });
          if (selector.mode !== 'multi') assertReplay(res.count === 1, `应上传单个文件，实际上传 ${res.count} 个`);
          await waitUiTick();
          await refreshDocsFromServer();
          return finalizeReplayResult({
            status: 'done',
            message: '手动/未知操作'
          });
        }

        assertReplay(!!docName, '未记录文档名，无法执行上传', { strict: true });
        const expectedOverwritten = typeof meta?.overwritten === 'boolean' ? meta.overwritten : null;

        // 如果原本是覆盖同名文档但当前无同名文档，先创建占位文档保证覆盖可复现
        if (expectedOverwritten === true && !findDocIdByName(docName)) {
          const placeholderRes = await api('/api/docs', { method: 'POST', body: { name: docName, content: '占位文档' } });
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
          assertReplay(!!findDocIdByNameInList(docName, list), `无法找到占位同名文档：${docName}`);
        }

        const { doc, overwritten, text } = await uploadDocFromReplayDirByNameDetailed(docName);
        if (expectedOverwritten !== null) {
          assertReplay(
            overwritten === expectedOverwritten,
            `上传覆盖状态与原沉淀不一致：预期${expectedOverwritten ? '覆盖同名' : '新增'}，实际${overwritten ? '覆盖同名' : '新增'}`
          );
        }
        assertReplay(!!doc?.id, '上传未返回 doc', { strict: true });
        assertReplay((doc?.name || '').toString().trim() === docName.trim(), `上传文档名不一致：${doc?.name || ''}`);
        assertReplay((doc?.content || '').toString() === (text || '').toString(), '上传文档内容不一致');

        await waitUiTick();
        const list = (await refreshDocsFromServer()) || [];
        const id = findDocIdByNameInList(docName, list);
        assertReplay(!!id, `上传后未找到同名文档：${docName}`);
        return finalizeReplayResult({
          status: 'done',
          message: '手动/未知操作'
        });
      }

      const id = findDocIdByName(docName);
      if (!id) throw new Error(`未找到同名文档：${docName || '(空)'}`);
      setSelectedDocId(id);
      const d = docs.find((x) => x.id === id);
      setDocDraft(d?.content || '');
      await waitUiTick();
      return finalizeReplayResult({ status: 'done', message: '📜 脚本 Replay Done', replayMode: 'script' });
    }
    if (meta?.type === 'outline_extract' || action === '全文大纲抽取') {


      const btnId = meta?.buttonId;


      const btn = btnId && llmButtons.find((b) => b.id === btnId) || llmButtons.find((b) => b.kind === 'outline_extract' && b.enabled);


      if (!btn) throw new Error('未找到可用的“全文大纲抽取”按钮');


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

      // 大纲抽取使用大模型
      return finalizeReplayResult({ status: 'done', message: `🤖 大模型 Replay Done（大纲抽取：${count} 条）`, replayMode: 'llm' });


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


      assertReplay(!!baseTpl && Array.isArray(baseTpl.sections), '无法获取模板，无法复现复制全文', { strict: true });


      const target = (baseTpl.sections || []).find((s) => s.id === sectionId);


      assertReplay(!!target, `模板中未找到标题：${sectionId}`, { strict: true });


      const nextTpl = {


        ...baseTpl,


        sections: (baseTpl.sections || []).map((s) => s.id === sectionId ? { ...s, summary: content } : s)


      };


      const applied = await applyTemplateToServer(nextTpl);


      const appliedSec = (applied?.sections || []).find((s) => s.id === sectionId);


      assertReplay(!!appliedSec, `应用模板后未找到标题：${sectionId}`, { strict: true });


      assertReplay((appliedSec.summary || '') === content, '复制全文后摘要与文档内容不一致');


      await waitUiTick();


      return finalizeReplayResult({ status: 'done', message: '📜 脚本 Replay Done', replayMode: 'script' });


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


      assertReplay(serverLinks.includes(id), `后端未成功关联文档：${docName}`, { strict: true });


      await waitUiTick();


      await refreshDocsFromServer();


      return finalizeReplayResult({ status: 'done', message: `已关联文档：${docName}` });


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


      assertReplay(!serverLinks.includes(id), `后端未成功取消关联文档：${docName}`, { strict: true });


      setSectionDocDone((prev) => {


        const next = { ...prev };


        if (next[sectionId]) {


          delete next[sectionId][id];


          if (!Object.keys(next[sectionId]).length) delete next[sectionId];


        }


        return next;


      });


      await waitUiTick();


      return finalizeReplayResult({ status: 'done', message: `已取消关联文档：${docName}` });


    }





    if (meta?.type === 'insert_to_summary' || action === '添入摘要' || action === '填入摘要') {


      const ids = Array.isArray(meta?.targetSectionIds) ? meta.targetSectionIds : [];


      const selectionInput = Array.isArray(meta?.inputs) ? meta.inputs.find((x) => x?.kind === 'selection') : null;


      let text = (selectionInput?.text || selectionInput?.textExcerpt || '').toString().trim();


      if (!ids.length) throw new Error('未记录 targetSectionIds');


      if (!text) throw new Error('未记录选中文本');

      // ========== 大模型智能处理：当模式为 llm 时始终尝试 AI 处理 ==========
      const llmScript = section?.llmScript || null;
      const aiGuidance = llmScript?.aiGuidance || '';
      const specialRequirements = llmScript?.specialRequirements || '';
      
      // 跟踪是否成功使用了大模型
      let usedLLM = false;
      let llmFailReason = '';
      
      // 修改：大模型模式下始终尝试 AI 处理，即使没有明确的 aiGuidance
      if (mode === 'llm') {
        showToast('🤖 大模型处理中...');
        
        try {
          // 构建智能处理 prompt - 即使没有 aiGuidance 也提供默认的智能处理
          const hasGuidance = !!(aiGuidance || specialRequirements);
          const processPrompt = hasGuidance 
            ? `你是一个智能数据处理助手。请按照用户的指导要求，对提取的原始内容进行处理。

【原始内容】
${text}

【用户的处理指导】
${aiGuidance || '无特殊指导'}

【特殊要求】
${specialRequirements || '无'}

【任务】
严格按照用户的处理指导对原始内容进行处理。例如：
- 如果指导是"剥离职务头衔，只保留姓名"，则需要识别出所有人名，去掉如"副总队长""支队长"等职务，只返回纯净的姓名
- 如果指导是"提取关键信息"，则需要归纳总结
- 如果指导是"格式化输出"，则需要按要求格式化

【重要】
- 必须按照指导要求处理，不能简单复制原始内容
- 如果是提取姓名类任务，确保不遗漏任何人员
- 处理结果应该简洁明了

请直接返回处理后的结果，不要包含任何解释说明。`
            : `你是一个智能数据处理助手。请对提取的原始内容进行智能处理和清洗。

【原始内容】
${text}

【默认处理规则】
1. 如果内容包含人名+职务的格式（如"副总队长 张三"），自动剥离职务头衔，只保留纯净姓名
2. 去除多余的空格、换行和格式字符
3. 如果有多个项目，用适当的分隔符（如顿号、逗号）分隔
4. 保持内容简洁、规范

【重要】
- 进行合理的数据清洗和格式化
- 处理结果应该简洁明了
- 如果原内容已经很规范，可以保持不变

请直接返回处理后的结果，不要包含任何解释说明。`;

          const processResponse = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [{ role: 'user', content: processPrompt }],
              maxTokens: 2000
            })
          });
          
          if (processResponse.ok) {
            const processData = await processResponse.json();
            if (processData?.content) {
              const processedText = processData.content.trim();
              console.log('🤖 大模型处理结果:', processedText);
              showToast(`🤖 AI 处理完成`);
              text = processedText;  // 使用处理后的内容
              usedLLM = true;
            } else {
              llmFailReason = '大模型返回内容为空';
              console.log('🤖 大模型返回为空，使用原始内容');
            }
          } else {
            // HTTP 错误
            const errText = await processResponse.text().catch(() => '');
            llmFailReason = `API 请求失败 (${processResponse.status}): ${errText || '未知错误'}`;
            console.error('大模型 API 错误:', llmFailReason);
          }
        } catch (aiErr) {
          llmFailReason = aiErr?.message || '网络错误或服务不可用';
          console.error('大模型处理失败:', aiErr);
        }
        
        // 如果大模型模式但未成功使用大模型，告知用户原因
        if (!usedLLM && llmFailReason) {
          showToast(`⚠️ 大模型未使用：${llmFailReason}，已回退到脚本模式`);
        }
      }


      const baseTpl = await getServerTemplate(scene?.id);


      assertReplay(!!baseTpl && Array.isArray(baseTpl.sections), '无法获取模板，无法复现填入摘要', { strict: true });


      ids.forEach((sid) => assertReplay(!!(baseTpl.sections || []).find((s) => s.id === sid), `模板中未找到标题：${sid}`, { strict: true }));


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


        })


      };


      const applied = await applyTemplateToServer(nextTpl);


      const excerpt = (meta?.outputs?.insertedExcerpt || text).toString().trim();


      ids.forEach((sid) => {


        const sec = (applied?.sections || []).find((s) => s.id === sid);


        assertReplay(!!sec, `应用模板后未找到标题：${sid}`, { strict: true });

        // 大模型模式下放宽校验（因为内容已被处理）
        if (mode !== 'llm') {
          assertReplay((sec.summary || '').toString() === text, `摘要未按"覆盖"写入到标题：${sid}`);
        }


      });


      await waitUiTick();

      // 返回结果，详细说明执行情况
      let resultMsg = '';
      let replayMode = 'script'; // 默认为脚本模式
      
      if (mode === 'llm') {
        if (usedLLM) {
          // 大模型成功执行
          replayMode = 'llm';
          resultMsg = '🤖 大模型 Replay Done';
        } else if (llmFailReason) {
          // 大模型失败，回退到脚本
          replayMode = 'script_fallback';
          resultMsg = `📜 脚本 Replay Done（大模型回退原因：${llmFailReason}）`;
        } else {
          // 脚本模式执行
          resultMsg = '📜 脚本 Replay Done';
        }
      } else {
        resultMsg = '📜 脚本 Replay Done';
      }
      
      return finalizeReplayResult({ status: 'done', message: resultMsg, replayMode, llmFailReason });


    }





    if (meta?.type === 'delete_outline_section' || action === '删除标题') {


      const sectionId = meta?.sectionId;


      if (!sectionId) throw new Error('缺少 sectionId');


      const baseTpl = await getServerTemplate(scene?.id);


      assertReplay(!!baseTpl && Array.isArray(baseTpl.sections), '无法获取模板，无法复现删除标题', { strict: true });


      const sections = baseTpl.sections || [];


      const idx = sections.findIndex((s) => s.id === sectionId);


      assertReplay(idx !== -1, `模板中未找到标题：${sectionId}`, { strict: true });


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


        assertReplay(!(applied?.sections || []).some((s) => s.id === rid), `删除后仍存在标题：${rid}`, { strict: true });


      });


      await waitUiTick();


      return finalizeReplayResult({ status: 'done', message: '已删除标题（含下级）' });


    }





    if (meta?.type === 'outline_clear' || action === '清除大纲') {


      assertReplay(!!scene?.id, 'scene 未初始化，无法清除大纲', { strict: true });


      await api(`/api/scene/${scene.id}`, { method: 'PATCH', body: { sectionDocLinks: {} } });


      const emptyTpl = {


        id: 'template_empty', name: '空模板', sections: []


      };


      const applied = await applyTemplateToServer(emptyTpl);
      assertReplay(Array.isArray(applied?.sections) && applied.sections.length === 0, '清除后大纲仍非空', { strict: true });
      const s = await refreshSceneFromServer(scene?.id);
      assertReplay(!s?.sectionDocLinks || Object.keys(s.sectionDocLinks || {}).length === 0, '清除后仍有关联文档', { strict: true });
      setSectionDocPick({});
      setSelectedOutlineExec({});
      setSectionDocDone({});
      setSummaryExpanded({});
      setOutlineEditing({});
      await waitUiTick();
      return finalizeReplayResult({ status: 'done', message: '📜 脚本 Replay Done', replayMode: 'script' });
    }

    if (meta?.type === 'restore_history_outline' || action === '历史大纲选取') {
      const outlineId = meta?.outlineId;
      const title = meta?.outlineTitle;


      const historyItem = outlineHistory.find((h) => h.id === outlineId) ||
        outlineHistory.find((h) => (h.title || h.docName) === title);

      if (!historyItem) {
        throw new Error(`未找到匹配的历史大纲存档: ${title || outlineId}`);
      }


      const applyRes = await api(`/api/scene/${scene.id}/apply-template`, { method: 'POST', body: { template: historyItem.template } });
      setTemplate(applyRes.template);
      setScene(applyRes.scene);
      setShowOutlineMode(true);
      await waitUiTick();
      return finalizeReplayResult({ status: 'done', message: '📜 脚本 Replay Done', replayMode: 'script' });
    }
    if (meta?.type === 'dispatch' || action === '执行指令') {


      if (!scene?.id) throw new Error('scene 未初始化，无法获取大纲');

      // ========== 获取 llmScript 中的 AI 指导 ==========
      const llmScript = section?.llmScript || null;
      const aiGuidance = llmScript?.aiGuidance || '';
      const specialRequirements = llmScript?.specialRequirements || '';


      let instructions =


        meta?.instructions ||

        // 兼容沉淀记录中使用 promptContent 字段的情况
        meta?.promptContent ||


        (() => {


          const m = /指令：?([\\s\\S]*?)(\\n|$)/.exec((section?.content || '').toString());


          return (m?.[1] || '').trim();


        })();


      if (!instructions) throw new Error('未记录指令内容');

      // ========== 大模型模式：将 AI 指导添加到 instructions ==========
      if (mode === 'llm' && (aiGuidance || specialRequirements)) {
        showToast('🤖 正在按 AI 指导执行指令...');
        // 将 AI 指导追加到原始指令中，让大模型在执行时考虑这些指导
        instructions = `${instructions}

【执行指导】
${aiGuidance || '无特殊指导'}

【特殊要求】
${specialRequirements || '无'}`;
        console.log('🤖 大模型 Replay - 增强指令:', instructions);
      }



      const dispatchCfg = llmButtons.find((b) => b.kind === 'dispatch');


      const systemPrompt = meta?.prompt || dispatchCfg?.prompt;
      const m = /指令：?([\\s\\S]*?)(\\n|$)/.exec((section?.content || '').toString());




      const inputKind = (meta?.inputKind || '').toString();


      const outlineIds = Array.isArray(meta?.selectedSectionIds) ? meta.selectedSectionIds : [];


      let docContent = '';


      let outlineSegments = [];





      if (inputKind === 'result' && Array.isArray(meta?.historyInputs) && meta.historyInputs.length) {


        docContent = meta.historyInputs.


          map((h, idx) => `【片：${idx + 1}：${(h?.key || '').toString()}】\n${(h?.text || '').toString()}`).


          join('\n\n');


      } else if (inputKind.startsWith('outline_')) {
        // 获取用于定位的额外信息
        const targetTitles = Array.isArray(meta?.selectedSectionTitles) ? meta.selectedSectionTitles : [];
        const targetSectionsDetail = Array.isArray(meta?.targetSectionsDetail) ? meta.targetSectionsDetail : [];
        const llmScriptInfo = section?.llmScript || {};
        const llmTargetSectionsDetail = Array.isArray(llmScriptInfo?.targetSectionsDetail) ? llmScriptInfo.targetSectionsDetail : [];
        
        // 优先按标题名称定位 section（适应大纲重新生成的情况）
        const allSections = template?.sections || [];
        let picked = [];
        
        // 方法1：使用 targetSectionsDetail 中的标题定位
        const detailsToUse = targetSectionsDetail.length > 0 ? targetSectionsDetail : llmTargetSectionsDetail;
        if (detailsToUse.length > 0) {
          picked = detailsToUse.map(detail => {
            let found = allSections.find(s => s.title === detail.title);
            if (!found && detail.id) found = allSections.find(s => s.id === detail.id);
            return found;
          }).filter(Boolean);
        }
        
        // 方法2：使用 selectedSectionTitles 定位
        if (picked.length === 0 && targetTitles.length > 0) {
          picked = targetTitles.map(title => allSections.find(s => s.title === title)).filter(Boolean);
        }
        
        // 方法3：使用 selectedSectionIds 定位（兼容旧记录）
        if (picked.length === 0 && outlineIds.length > 0) {
          picked = allSections.filter(s => outlineIds.includes(s.id));
        }
        
        // 方法4：使用 llmScript 中的 targetTitle 匹配
        if (picked.length === 0 && llmScriptInfo?.targetTitle) {
          const found = allSections.find(s => s.title?.includes(llmScriptInfo.targetTitle) || llmScriptInfo.targetTitle?.includes(s.title));
          if (found) picked = [found];
        }
        
        // 回退到当前 UI 选中
        if (picked.length === 0) {
          console.warn('[dispatch replay] 未能定位到目标 section，使用当前选中');
          const currentSelectedIds = Object.keys(selectedOutlineExec || {}).filter(k => selectedOutlineExec[k]);
          picked = allSections.filter(s => currentSelectedIds.includes(s.id));
        }
        
        console.log('[dispatch replay] 定位结果:', { picked: picked.map(p => p?.title) });

        // 验证 picked 中的 section 有内容
        if (picked.length === 0) {
          throw new Error('无法定位目标大纲标题，请确保大纲中存在对应的标题');
        }
        
        // 检查是否有空内容的 section
        const emptySections = picked.filter(sec => !(sec.summary || sec.hint));
        if (emptySections.length > 0) {
          console.warn('[dispatch replay] 部分 section 内容为空:', emptySections.map(s => s.title));
        }

        outlineSegments = picked.map((sec, idx) => ({
          sectionId: sec.id,
          field: 'summary',
          content: inputKind === 'outline_selected_batch' ?
            `标题：${sec.title}\n摘要：${sec.summary || sec.hint || '(内容为空)'}` :
            sec.summary || sec.hint || sec.title || '(内容为空)',
          label: `片段${idx + 1}`
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


          docContent = ensuredDocs.


            filter(Boolean).


            map((d, i) => `【文：${i + 1}：${d.name}\n${d.content}`).


            join('\n\n---\n\n');


        } else {


          docContent = outlineSegments.map((seg) => `【${seg.label} | ID=${seg.sectionId}】\n${seg.content}`).join('\n\n');


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


          systemPrompt


        }


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


      // 检查输出：只要 detail 有内容或 edits 有内容，就视为成功
      // 大模型可能以 detail 或 edits 形式返回结果，两者都可接受
      const hasOutput = (detail && detail.trim().length > 0) || (Array.isArray(result.edits) && result.edits.length > 0);
      if (expectedEditsCount !== null && expectedEditsCount > 0) {
        assertReplay(hasOutput, 'Replay 未返回有效输出（detail 或 edits 均为空）');
      }





      const baseTpl = await getServerTemplate(scene?.id);


      assertReplay(!!baseTpl && Array.isArray(baseTpl.sections), '无法获取模板，无法复现执行指令', { strict: true });


      const selectedIds = outlineIds.length ? outlineIds : Object.keys(selectedOutlineExec || {}).filter((k) => selectedOutlineExec[k]);

      // 收集 outlineSegments 中的 sectionId 列表，用于索引匹配（与 runDispatch 中的 resolveEditSectionId 逻辑一致）
      const segmentIdListForReplay = outlineSegments.map(seg => seg.sectionId);
      const resolveEditIdForReplay = (rawId) => {
        if (!rawId) return null;
        const str = String(rawId).trim();
        const idMatch = str.match(/ID\s*=\s*(.+)/i);
        if (idMatch) return idMatch[1].trim();
        const labelContentMatch = str.match(/片段\d+\s*[:：]\s*(.+)/);
        if (labelContentMatch) return labelContentMatch[1].trim();
        if (/^\d+$/.test(str)) {
          const idx = parseInt(str, 10) - 1;
          if (idx >= 0 && idx < segmentIdListForReplay.length) return segmentIdListForReplay[idx];
        }
        const labelOnlyMatch = str.match(/片段(\d+)/);
        if (labelOnlyMatch) {
          const idx = parseInt(labelOnlyMatch[1], 10) - 1;
          if (idx >= 0 && idx < segmentIdListForReplay.length) return segmentIdListForReplay[idx];
        }
        return str;
      };

      const nextTpl = {
        ...baseTpl,
        sections: (baseTpl.sections || []).map((sec) => {
          const found = Array.isArray(result.edits) ? result.edits.find((e) => {
            const resolvedId = resolveEditIdForReplay(e.sectionId);
            return resolvedId === sec.id || e.sectionId === sec.id;
          }) : null;
          const patched = {
            ...sec,
            title: found?.field === 'title' && found.content ? found.content : sec.title,
            summary: found?.field === 'summary' && found.content ? found.content : sec.summary
          };
          if (detail && selectedIds.includes(sec.id)) return { ...patched, summary: detail };
          return patched;
        })


      };


      const applied = await applyTemplateToServer(nextTpl);


      if (selectedIds.length && detail) {


        selectedIds.forEach((sid) => {


          const sec = (applied?.sections || []).find((s) => s.id === sid);


          assertReplay(!!sec, `应用模板后未找到标题：${sid}`, { strict: true });


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
      
      // 返回详细执行结果
      const usedLLMForDispatch = mode === 'llm' && (aiGuidance || specialRequirements);
      const dispatchResultMsg = usedLLMForDispatch 
        ? '🤖 大模型 Replay Done' 
        : '📜 脚本 Replay Done';
      return finalizeReplayResult({ status: 'done', message: dispatchResultMsg, replayMode: usedLLMForDispatch ? 'llm' : 'script' });
    }

    if (meta?.type === 'final_generate' || action === '最终文档生成') {
      return { status: 'pass', message: '最终文档生成不支持自动回放' };
    }


    return {
      status: 'pass',
      message: '手动/未知操作'
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





  // 计算某个标题是否有下级标题（用于显示展开/收起按钮）
  const hasChildSections = (sectionId) => {
    const sections = template?.sections || [];
    const idx = sections.findIndex(s => s.id === sectionId);
    if (idx === -1 || idx === sections.length - 1) return false;
    
    const currentLevel = sections[idx]?.level || 1;
    // 检查下一个标题是否是更低级别（数字更大）的子标题
    const nextSection = sections[idx + 1];
    return nextSection && (nextSection.level || 1) > currentLevel;
  };

  // 切换标题折叠状态
  const toggleSectionCollapse = (sectionId) => {
    setSectionCollapsed(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  // 检查标题是否应该被隐藏（因为某个父标题被折叠）
  // 规则：当一个标题被折叠时，它后面所有级别更低（数字更大）的标题都应该隐藏
  // 直到遇到同级或更高级别的标题为止
  const isSectionHiddenByParent = (idx) => {
    const sections = template?.sections || [];
    const sec = sections[idx];
    if (!sec) return false;
    
    const currentLevel = sec.level || 1;
    
    // 向前遍历所有标题，检查是否有任何父级标题被折叠且当前标题在其折叠范围内
    for (let i = idx - 1; i >= 0; i--) {
      const prevSec = sections[i];
      const prevLevel = prevSec?.level || 1;
      
      // 如果遇到级别更高或相等的标题（即不是当前标题的子标题）
      if (prevLevel < currentLevel) {
        // 这是一个可能的父标题，检查它是否被折叠
        if (sectionCollapsed[prevSec.id]) {
          return true; // 父标题被折叠，当前标题应该隐藏
        }
        // 即使这个父标题没有被折叠，我们也需要继续向上查找更高级别的祖父标题
        // 但要注意：我们只需要检查比当前父标题级别更高的标题
        // 所以不能 break，继续向上查找
      }
      
      // 如果遇到同级标题，说明当前标题已经不在之前遍历过的标题的子树中
      // 但我们仍然需要继续向上查找更高级别的父标题
      // 例如：一级A -> 二级B -> 三级C -> 二级D（当前）
      // 当检查二级D时，向上找到三级C（级别更低，跳过），然后找到二级B（同级）
      // 此时不能停止，还需要继续向上找一级A
      
      // 只有当遇到的标题级别更高或相等时，且它被折叠了，当前标题才需要隐藏
      // 所以这里不需要特殊处理，继续循环即可
    }
    
    return false;
  };

  const renderOutlineNode = (node) => {
    // 检查是否应该被隐藏
    if (isSectionHiddenByParent(node.index)) {
      return null;
    }

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


      processingTab !== 'records' &&


      !!pickDocId &&


      (linkedDocIds || []).includes(pickDocId);





    return (


      <div


        key={sec.id}


        className={`section outline-node level-${Number(level) || 1}`}


        style={{ position: 'relative' }}>





        <div className="section-head" style={{ alignItems: 'center', justifyContent: 'space-between', paddingRight: '100px' }}>


          <div


            className="section-title"


            style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>





            {editingTitle !== undefined ?


              <>


                <select


                  value={level}


                  onChange={(e) => updateSectionLevel(sec.id, e.target.value)}


                  className="level-select">





                  <option value="1">{UI_TEXT.t17}</option>


                  <option value="2">{UI_TEXT.t18}</option>


                  <option value="3">{UI_TEXT.t19}</option>


                  <option value="4">{UI_TEXT.t20}</option>


                </select>


                <input


                  value={editingTitle}


                  onChange={(e) => setOutlineEditing((prev) => ({ ...prev, [titleKey]: e.target.value }))}


                  style={{ minWidth: 200 }} />





                <button className="ghost small" onClick={() => applyOutlineUpdate(sec.id, 'title', editingTitle)}>{UI_TEXT.t21}





                </button>


                <button className="ghost small" onClick={() => cancelEditOutline(sec.id, 'title')}>{UI_TEXT.t22}





                </button>


              </> :





              <>


                <span>{`${prefix}：${sec.title}`}</span>


                <button className="ghost xsmall" style={{ fontSize: '11px', padding: '2px 6px' }} onClick={() => startEditOutline(sec.id, 'title', sec.title || '')}>{UI_TEXT.t23}





                </button>


              </>


            }


          </div>


          <div className="section-actions btn-compact" style={{ position: 'absolute', right: '8px', top: '8px' }}>


            <label className="inline-check">


              <input


                type="checkbox"


                checked={!!selectedOutlineExec[sec.id]}


                onChange={(e) => setSelectedOutlineExec((prev) => ({ ...prev, [sec.id]: e.target.checked }))} />





            </label>


            <button className="ghost xsmall" type="button" onClick={() => addSectionBelow(sec.id)}>


              +


            </button>


            <button className="ghost xsmall" type="button" onClick={() => removeSectionById(sec.id)}>


              {UI_TEXT.t25}


            </button>

            {/* 展开/收起按钮 - 仅当有下级标题时显示 */}
            {hasChildSections(sec.id) && (
              <button 
                className="ghost xsmall" 
                type="button" 
                onClick={() => toggleSectionCollapse(sec.id)}
                style={{ 
                  fontSize: '11px', 
                  padding: '2px 6px',
                  minWidth: '36px',
                  color: sectionCollapsed[sec.id] ? '#0ea5e9' : '#64748b'
                }}
                title={sectionCollapsed[sec.id] ? '展开下级标题' : '收起下级标题'}
              >
                {sectionCollapsed[sec.id] ? '展开' : '收起'}
              </button>
            )}


          </div>


        </div>





        <div className="hint" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>


          {editingSummary !== undefined ?


            <>


              <textarea


                rows={2}


                value={editingSummary}


                onChange={(e) => setOutlineEditing((prev) => ({ ...prev, [summaryKey]: e.target.value }))}


                style={{ minWidth: 260 }} />





              <button className="ghost small" onClick={() => applyOutlineUpdate(sec.id, 'summary', editingSummary)}>{UI_TEXT.t24}





              </button>


              <button className="ghost small" onClick={() => cancelEditOutline(sec.id, 'summary')}>{UI_TEXT.t22}





              </button>


            </> :





            <>


              <div className={`summary-text ${summaryExpanded[sec.id] ? 'expanded' : ''}`}>


                {sec.summary || sec.hint || UI_TEXT.t127}


              </div>


              {(sec.summary || sec.hint) &&


                <>


                  <button


                    className="ghost xsmall"


                    type="button"


                    style={{ fontSize: '11px', padding: '2px 6px' }}


                    onClick={() => setSummaryExpanded((prev) => ({ ...prev, [sec.id]: !prev[sec.id] }))}>





                    {summaryExpanded[sec.id] ? UI_TEXT.t142 : UI_TEXT.t143}


                  </button>


                  <button className="ghost xsmall" style={{ fontSize: '11px', padding: '2px 6px' }} type="button" onClick={() => clearOutlineSummary(sec.id)}>{UI_TEXT.t25}





                  </button>


                </>


              }


              <button className="ghost xsmall" style={{ fontSize: '11px', padding: '2px 6px' }} onClick={() => startEditOutline(sec.id, 'summary', sec.summary || sec.hint || '')}>{UI_TEXT.t26}





              </button>


            </>


          }


        </div>





        <div className="link-row outline-row mixed-row" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginTop: '4px' }}>


          {/* Picker & Add Button (First) */}


          <div className="link-actions" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>


            <select


              value={storedPickDocId || ''}


              onChange={(e) => setSectionDocPick((prev) => ({ ...prev, [sec.id]: e.target.value }))}


              style={{ maxWidth: '140px', padding: '2px 6px', fontSize: '12px', height: '24px' }}>





              <option value="">{UI_TEXT.t27}</option>


              {docs.map((d) =>


                <option key={d.id} value={d.id}>


                  {d.name}


                </option>


              )}


            </select>


            <button className="ghost xsmall" style={{ fontSize: '11px', padding: '2px 6px', whiteSpace: 'nowrap' }} type="button" onClick={() => addDocToSection(sec.id)}>{UI_TEXT.t28}





            </button>


          </div>





          {/* Linked Docs (After) */}


          {linkedDocIds.map((id) => {


            const doc = docs.find((d) => d.id === id);


            const showCopy = canCopyFullToSummary && id === pickDocId;


            return (


              <span key={id} className="doc-inline" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>


                <span className={`pill doc-pill ${doneMap[id] ? 'done' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', background: doneMap[id] ? '#e6f4ea' : '#f1f3f4', fontSize: '12px', border: '1px solid transparent' }}>


                  <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc?.name || id}>


                    {doc?.name || id}


                  </span>


                  {doneMap[id] && <span className="checkmark" style={{ fontSize: '10px' }}></span>}


                  <button


                    type="button"


                    className="pill-close"


                    onClick={() => removeDocFromSection(sec.id, id)}


                    aria-label={UI_TEXT.t29}


                    style={{ width: '16px', height: '16px', lineHeight: '14px', fontSize: '14px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', color: '#666', cursor: 'pointer' }}>





                    ×


                  </button>


                </span>


                {showCopy ?


                  <button


                    className="ghost xsmall"


                    type="button"


                    style={{ fontSize: '11px', padding: '2px 6px' }}


                    onClick={() => copyPreviewToSummary(sec.id, pickDocId)}>{UI_TEXT.t30}








                  </button> :


                  null}


              </span>);





          })}


        </div>





        {node.children?.length ? <div className="outline-children">{node.children.map(renderOutlineNode)}</div> : null}


      </div>);





  };





  const EditingToolbar = () =>


    isEditingLayout ?


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


          pointerEvents: 'auto'


        }}


        onMouseDown={(e) => e.stopPropagation()}


        onClick={(e) => e.stopPropagation()}>





        <button type="button" className="ghost success" onClick={handleCompleteLayoutEdit} title={UI_TEXT.t31}>{UI_TEXT.t32}





        </button>


        <button type="button" className="ghost" onClick={handleCancelLayoutEdit} title={UI_TEXT.t33}>{UI_TEXT.t34}





        </button>


        <button type="button" className="ghost warning" onClick={handleResetLayout} title={UI_TEXT.t35}>{UI_TEXT.t36}





        </button>


      </div> :


      null;





  // 样式编辑


  const handleStyleEdit = (panelId, buttonId) => {





    setEditingButtonId(JSON.stringify({ panelId, buttonId }));


  };








  const handleWorkbenchButtonClick = (button) => {


    if (isEditingLayout) return; // 编辑模式下不触发业务逻辑





    console.log('Workbench button clicked:', button.kind, button.label);


    const allSelected =


      deposits.length > 0 &&


      Object.keys(selectedDepositIds || {}).filter((k) => selectedDepositIds[k]).length === deposits.length;





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
        // 切换到应用端按钮配置时，刷新沉淀集列表并清理无效引用
        (async () => {
          try {
            const groups = await api(`/api/multi/precipitation/groups`);
            if (Array.isArray(groups)) {
              const normalized = groups.map(normalizeDepositGroup).filter(Boolean);
              setDepositGroups(normalized);
              // 清理appButtonsConfig中已不存在的沉淀集ID
              const validGroupIds = new Set(normalized.map(g => g.id));
              setAppButtonsConfig((prev) => prev.map((btn) => ({
                ...btn,
                groupIds: (btn.groupIds || []).filter((gid) => validGroupIds.has(gid))
              })));
            }
          } catch (e) {
            console.error('刷新沉淀集列表失败', e);
          }
        })();


        break;


      case 'tab_strategy':


        setProcessingTab('strategy');


        break;


      case 'batch_replay':


        batchReplaySelectedDeposits();


        break;


      case 'select_all':


        if (allSelected) clearDepositSelection(); else


          selectAllDeposits();


        break;


      case 'delete_selected':


        deleteSelectedDeposits();


        break;


      case 'clear_selection':


        clearDepositSelection();


        break;


      case 'group_new':


        createDepositGroupFromSelection();


        break;


      case 'group_update':


        updateGroupFromSelection();


        break;


      case 'group_rename':


        renameDepositGroup();


        break;


      case 'group_delete':


        deleteDepositGroup();


        break;


      case 'group_replay':


        replayDepositGroup();


        break;


      case 'outline_extract':





        const llmBtn = llmButtons.find((b) => b.kind === 'outline_extract');


        if (llmBtn) autoTemplate(llmBtn); else


          showToast('未找到可用的抽取按钮');


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





          const target = llmButtons.find((b) => b.id === button.id) || button;


          // 这里可能需要更精确的查找，或者直接传 button


          // 暂时尝试直接调用


          runOutlineSlotButton(target);


        }


        break;


    }


  };





  // 更新按钮样式


  const handleButtonUpdate = (panelId, buttonId, { style, label, kind, prompt }) => {


    console.log('[DEBUG] handleButtonUpdate called:', { panelId, buttonId, style, label, kind, prompt });


    setButtonPositions((prev) => {


      const panelButtons = prev[panelId] || [];


      const newButtons = panelButtons.map((btn) => {


        if (btn.id === buttonId) {


          const updated = {


            ...btn,


            style: style ? { ...btn.style, ...style } : btn.style,


            label: label !== undefined ? label : btn.label,


            kind: kind !== undefined ? kind : btn.kind,


            prompt: prompt !== undefined ? prompt : btn.prompt


          };


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


    setGlobalButtons((prev) => prev.map((btn) =>


      btn.id === buttonId ? { ...btn, ...updates } : btn


    ));


  };





  // 更新全局按钮样式


  const handleGlobalButtonStyleUpdate = (buttonId, { style, label, kind, prompt }) => {


    console.log('[GlobalButton] Style update:', buttonId, { style, label, kind, prompt });


    setGlobalButtons((prev) => prev.map((btn) => {


      if (btn.id === buttonId) {


        return {


          ...btn,


          style: style ? { ...btn.style, ...style } : btn.style,


          label: label !== undefined ? label : btn.label,


          kind: kind !== undefined ? kind : btn.kind,


          prompt: prompt !== undefined ? prompt : btn.prompt


        };


      }


      return btn;


    }));


  };








  const deleteGlobalButton = (buttonId) => {


    const button = globalButtons.find((btn) => btn.id === buttonId);


    if (!button) return;





    console.log('[GlobalButton] Delete (to recycle):', buttonId);





    const deletedButton = { ...button, deletedAt: Date.now() };





    setDeletedButtons((prev) => [...prev, deletedButton]);


    setGlobalButtons((prev) => prev.filter((btn) => btn.id !== buttonId));





    // 保存到localStorage


    setTimeout(() => {


      const deletedConfig = [...deletedButtons, deletedButton];


      localStorage.setItem('deleted-buttons-config', JSON.stringify(deletedConfig));


    }, 0);


  };





  // 恢复已删除的按钮


  const handleRestoreButton = (buttonId) => {


    const button = deletedButtons.find((btn) => btn.id === buttonId);


    if (!button) return;





    // 移除 deletedAt 标记


    const { deletedAt, ...rest } = button;


    const restoredButton = { ...rest };














    setGlobalButtons((prev) => [...prev, restoredButton]);


    setDeletedButtons((prev) => {


      const newList = prev.filter((btn) => btn.id !== buttonId);


      // 更新 localStorage


      localStorage.setItem('deleted-buttons-config', JSON.stringify(newList));


      return newList;


    });


  };





  // 永久删除按钮


  const handlePermanentDelete = (buttonId) => {


    setDeletedButtons((prev) => {


      const newList = prev.filter((btn) => btn.id !== buttonId);


      // 更新 localStorage


      localStorage.setItem('deleted-buttons-config', JSON.stringify(newList));


      return newList;


    });


  };








  const handleClearRecycleBin = () => {


    setDeletedButtons([]);


    localStorage.removeItem('deleted-buttons-config');


  };





  // 全局按钮拖动处理


  const handleGlobalButtonMouseDown = (e, buttonId, action = 'move') => {


    if (!isEditingLayout) return;


    e.preventDefault();


    e.stopPropagation();





    const button = globalButtons.find((btn) => btn.id === buttonId);


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


    const buttonToDelete = globalButtons.find((b) => b.id === buttonId);


    if (buttonToDelete) {


      setDeletedButtons((prev) => [...prev, buttonToDelete]);


      setGlobalButtons((prev) => prev.filter((b) => b.id !== buttonId));


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





        {showConfig ?


          <div className="config-panel">


            <div className="card-head" style={{ alignItems: 'center', justifyContent: 'space-between' }}>


              <div>


                <div className="section-title">{UI_TEXT.t37}</div>


                <div className="hint">{UI_TEXT.t38}</div>


              </div>


              {/* '新增' is likely 'add_button' in config, but if missing, keep here? User screenshot showed '新增按钮'. */}


            </div>





            <div className="sections" style={{ gap: 10 }}>


              {llmButtons.length === 0 ?


                <div className="hint">{UI_TEXT.t39}</div> :





                llmButtons.map((b, idx) =>


                  <div key={b.id} className="section" style={{ background: '#fff' }}>


                    <div className="section-head" style={{ alignItems: 'center', justifyContent: 'space-between' }}>


                      <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>


                        <span className="pill muted">{idx + 1}</span>


                        <span>{b.label || UI_TEXT.t163}</span>


                        <span className={`status ${b.enabled ? 'filled' : 'empty'}`}>


                          {b.enabled ? UI_TEXT.t40 : UI_TEXT.t45}


                        </span>


                      </div>


                      <div className="section-actions" style={{ gap: 8 }}>


                        <label className="inline-check" style={{ gap: 6 }}>


                          <input


                            type="checkbox"


                            checked={!!b.enabled}


                            onChange={(e) => toggleLlmButtonEnabled(b.id, e.target.checked)} />





                          <span className="hint">{UI_TEXT.t40}</span>


                        </label>


                        <button className="ghost small" type="button" onClick={() => startEditLlmButton(b)} style={{ pointerEvents: 'auto' }}>{UI_TEXT.t41}





                        </button>


                        <button className="ghost small" type="button" onClick={() => deleteLlmButton(b.id)} style={{ pointerEvents: 'auto' }}>{UI_TEXT.t25}





                        </button>


                      </div>


                    </div>


                  </div>


                )


              }


            </div>





            {buttonDraft ?


              <div className="section" style={{ background: '#fff' }}>


                <div className="section-title">{UI_TEXT.t42}{buttonDraft.label || UI_TEXT.t163}</div>


                <div className="sections" style={{ gap: 10 }}>


                  <label className="form-row">{UI_TEXT.t43}





                    <input


                      value={buttonDraft.label || ''}


                      onChange={(e) => setButtonDraft((p) => ({ ...p, label: e.target.value }))} />





                  </label>





                  <div className="link-row">


                    <label className="form-row" style={{ minWidth: 120 }}>{UI_TEXT.t40}





                      <select


                        value={buttonDraft.enabled ? 'on' : 'off'}


                        onChange={(e) => setButtonDraft((p) => ({ ...p, enabled: e.target.value === 'on' }))}>





                        <option value="on">{UI_TEXT.t44}</option>


                        <option value="off">{UI_TEXT.t45}</option>


                      </select>


                    </label>


                    <label className="form-row" style={{ minWidth: 160 }}>{UI_TEXT.t46}





                      <select


                        value={normalizePrecipitationMode(buttonDraft.precipitationMode)}


                        onChange={(e) => setButtonDraft((p) => ({ ...p, precipitationMode: e.target.value }))}>





                        <option value="llm">{UI_TEXT.t11}</option>


                        <option value="script">{UI_TEXT.t12}</option>


                      </select>


                    </label>


                  </div>





                  <div className="section" style={{ background: '#fff' }}>


                    <div className="card-head" style={{ alignItems: 'center', justifyContent: 'space-between' }}>


                      <div>


                        <div className="section-title">{UI_TEXT.t47}</div>


                        <div className="hint">{UI_TEXT.t48}</div>


                      </div>


                      <button className="ghost small" type="button" onClick={addIoRuleToDraft} style={{ pointerEvents: 'auto' }}>{UI_TEXT.t49}





                      </button>


                    </div>


                    <div className="sections" style={{ gap: 8 }}>


                      {normalizeIoRows(buttonDraft?.io, {


                        dataSource: buttonDraft?.dataSource,


                        outputTarget: buttonDraft?.outputTarget


                      }).map((r, idx) =>


                        <div key={r.id} className="link-row io-config-row" style={{ alignItems: 'center' }}>


                          <span className="pill muted">{idx + 1}</span>


                          <label className="inline-check" style={{ gap: 6 }}>


                            <input


                              type="checkbox"


                              checked={!!r.enabled}


                              onChange={(e) => updateIoRuleInDraft(r.id, { enabled: e.target.checked })} />





                            <span className="hint">{UI_TEXT.t40}</span>


                          </label>


                          <label className="form-row" style={{ minWidth: 220 }}>{UI_TEXT.t50}





                            <select


                              value={r.dataSource}


                              onChange={(e) => updateIoRuleInDraft(r.id, { dataSource: e.target.value })}>





                              <option value="preview">{UI_TEXT.t51}</option>


                              <option value="selected_doc">{UI_TEXT.t52}</option>


                            </select>


                          </label>


                          <label className="form-row" style={{ minWidth: 140 }}>{UI_TEXT.t53}





                            <select


                              value={r.output}


                              onChange={(e) => updateIoRuleInDraft(r.id, { output: e.target.value })}>





                              <option value="titles">{UI_TEXT.t54}</option>


                              <option value="summaries">ժҪ</option>


                            </select>


                          </label>


                          <label className="form-row" style={{ minWidth: 160 }}>{UI_TEXT.t55}





                            <select


                              value={r.target}


                              onChange={(e) => updateIoRuleInDraft(r.id, { target: e.target.value })}>





                              <option value="title">{UI_TEXT.t54}</option>


                              <option value="summary">ժҪ</option>


                            </select>


                          </label>


                          <button className="ghost small" type="button" onClick={() => deleteIoRuleFromDraft(r.id)} style={{ pointerEvents: 'auto' }}>{UI_TEXT.t56}





                          </button>


                        </div>


                      )}


                    </div>


                  </div>





                  <label className="form-row">


                    <div className="link-row" style={{ alignItems: 'center' }}>


                      <span>{UI_TEXT.t57}<code>{'{{text}}'}</code>{UI_TEXT.t58}</span>


                      <button


                        className="ghost small"


                        type="button"


                        onClick={optimizePromptDraft}


                        disabled={isOptimizingPrompt || !(buttonDraft.prompt || '').toString().trim()}


                        style={{ pointerEvents: 'auto' }}>





                        {isOptimizingPrompt ? UI_TEXT.t133 : UI_TEXT.t132}


                      </button>


                    </div>


                    <textarea


                      rows={8}


                      value={buttonDraft.prompt || ''}


                      onChange={(e) => setButtonDraft((p) => ({ ...p, prompt: e.target.value }))} />





                  </label>





                  <div className="section-actions" style={{ justifyContent: 'flex-end' }}>


                    <button className="ghost small" type="button" onClick={cancelEditLlmButton} style={{ pointerEvents: 'auto' }}>{UI_TEXT.t22}





                    </button>


                    <button className="ghost small" type="button" onClick={saveLlmButtonDraft} style={{ pointerEvents: 'auto' }}>{UI_TEXT.t59}





                    </button>


                  </div>


                </div>


              </div> :


              null}


          </div> :


          !showRecords ?


            <>


              <div className="sections outline-scroll outline-tree">{outlineTree && outlineTree.map(renderOutlineNode)}</div>


              {finalGenerateCfg?.enabled ?


                <div className="processing-bottombar">


                  {/* Final button is also likely in EditableButtonsContainer? If so, remove. But 'final_btn' is not standard. Keeping for safety if not in config. */}


                </div> :


                null}


            </> :




            <div className="sections history-scroll">
              {/* 沉淀列表/沉淀集列表切换标签 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                <button
                  type="button"
                  className={`ghost small ${depositViewMode === 'deposits' ? 'active' : ''}`}
                  onClick={() => setDepositViewMode('deposits')}
                  style={{ padding: '6px 16px', fontSize: '15px', fontWeight: 600, whiteSpace: 'nowrap' }}
                >{UI_TEXT.t61}</button>
                <button
                  type="button"
                  className={`ghost small ${depositViewMode === 'groups' ? 'active' : ''}`}
                  onClick={() => setDepositViewMode('groups')}
                  style={{ padding: '6px 16px', fontSize: '15px', fontWeight: 600, whiteSpace: 'nowrap' }}
                >{UI_TEXT.t62}</button>
              </div>
              {/* 功能按钮栏 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 0', borderBottom: '1px solid #e5e7eb', marginBottom: '4px', flexWrap: 'nowrap', overflowX: 'auto', minHeight: '32px' }}>
                {depositViewMode === 'deposits' && getRecordsToolbarButtons(RECORD_TOOLBAR_DEPOSIT_KINDS).map((btn) =>
                  <EditableButton
                    key={btn.id}
                    button={btn}
                    isEditing={false}
                    panelId="processing-records-toolbar"
                    onMouseDown={handleButtonMouseDown}
                    onStyleEdit={handleStyleEdit}
                    onClick={handleWorkbenchButtonClick} />
                )}
                {depositViewMode === 'groups' && getRecordsToolbarButtons(RECORD_TOOLBAR_GROUP_KINDS).map((btn) =>
                  <EditableButton
                    key={btn.id}
                    button={btn}
                    isEditing={false}
                    panelId="processing-records-toolbar"
                    onMouseDown={handleButtonMouseDown}
                    onStyleEdit={handleStyleEdit}
                    onClick={handleWorkbenchButtonClick} />
                )}
              </div>
              {/* 沉淀集列表模式：显示所有沉淀集 + 选中沉淀集的详情 */}
              {depositViewMode === 'groups' && renderDepositGroupsList()}
              {depositViewMode === 'groups' && renderSelectedDepositGroupPanel()}

              {depositViewMode === 'deposits' && deposits.length === 0 && <p className="hint">{UI_TEXT.t63}</p>}

              {depositViewMode === 'deposits' && deposits.map((dep, idx) => {

                const orderKey = `${dep.id}||order`;


                const orderEditing = depositEditing[orderKey] !== undefined;


                const depositStatus = getDepositReplayStatus(dep);


                const depositReason = getDepositReplayReason(dep);


                const statusClass = depositStatus ? depositStatus.replace(' ', '-') : '';


                return (


                  <div


                    key={dep.id}


                    className="section"


                    onDragOver={handleDepositDragOver(dep.id)}


                    onDrop={handleDepositDrop(dep.id)}


                    style={dragOverDepositId === dep.id ? { outline: '2px dashed #3b82f6', outlineOffset: 2 } : undefined}>





                    <div className="section-head" style={{ justifyContent: 'space-between', alignItems: 'center' }}>


                      <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'nowrap', flex: 1, minWidth: 0 }}>


                        <label className="inline-check" style={{ gap: 6 }}>


                          <input


                            type="checkbox"


                            checked={!!selectedDepositIds?.[dep.id]}


                            onChange={(e) => toggleDepositSelected(dep.id, e.target.checked)} />





                        </label>


                        <button


                          className="icon-btn tiny deposit-drag-handle"


                          type="button"


                          draggable


                          onDragStart={handleDepositDragStart(dep.id)}


                          onDragEnd={handleDepositDragEnd}


                          title={UI_TEXT.t64}>





                          <GripVertical size={12} />


                        </button>


                        {orderEditing ?


                          <input


                            className="deposit-order-input"


                            type="number"


                            min={1}


                            max={deposits.length}


                            value={depositEditing[orderKey]}


                            onChange={(e) => startEditDeposit(dep.id, 'order', e.target.value)}


                            onBlur={() => applyDepositOrder(dep.id)}


                            onKeyDown={(e) => handleDepositOrderKeyDown(e, dep.id)} /> :








                          <button


                            className="pill muted deposit-order-pill"


                            type="button"


                            onClick={() => startEditDepositOrder(dep.id, idx + 1)}


                            title={UI_TEXT.t65}>





                            {idx + 1}


                          </button>


                        }


                        {depositEditing[`${dep.id}||name`] !== undefined ?


                          <>


                            <input


                              className="deposit-name-input"


                              value={depositEditing[`${dep.id}||name`]}


                              onChange={(e) => startEditDeposit(dep.id, 'name', e.target.value)}


                              onKeyDown={(e) => handleDepositNameKeyDown(e, dep.id)}


                              style={{ minWidth: 180 }} />





                            <button className="ghost xsmall" type="button" onClick={() => void applyDepositName(dep.id)}>{UI_TEXT.t66}





                            </button>


                            <button className="ghost xsmall" type="button" onClick={() => cancelEditDeposit(dep.id, 'name')}>{UI_TEXT.t22}





                            </button>


                          </> :





                          <>


                            <span className="deposit-name">{dep.name || UI_TEXT.t144}</span>


                            <button


                              className="ghost xsmall"


                              type="button"


                              onClick={() => startEditDeposit(dep.id, 'name', dep.name || dep.id)}>{UI_TEXT.t67}








                            </button>


                          </>


                        }


                      </div>


                      <div className="section-actions" style={{ gap: 6 }}>


                        {depositStatus ?


                          <span


                            className={`status ${statusClass}`}


                            title={depositReason || UI_TEXT.t122}>





                            {depositStatus}


                          </span> :


                          null}


                        {renderDepositModeSelect(dep)}


                        <button


                          className="ghost xsmall"


                          type="button"


                          onClick={() => void replayDeposit(dep.id)}


                          disabled={!!replayState?.[dep.id]?.running}>





                          Reply


                        </button>


                        {expandedLogs[dep.id] ?


                          <>


                            <button className="ghost xsmall" type="button" onClick={() => setAllDepositSectionsExpanded(dep.id, false)}>{UI_TEXT.t68}





                            </button>


                            <button className="ghost xsmall" type="button" onClick={() => setAllDepositSectionsExpanded(dep.id, true)}>{UI_TEXT.t69}





                            </button>


                          </> :


                          null}


                        <button className="ghost xsmall" type="button" onClick={() => deleteDepositsByIds([dep.id])}>{UI_TEXT.t25}





                        </button>


                        <button


                          className="ghost xsmall"


                          type="button"


                          onClick={() => setExpandedLogs((prev) => ({ ...prev, [dep.id]: !prev[dep.id] }))}>





                          {expandedLogs[dep.id] ? UI_TEXT.t142 : UI_TEXT.t143}


                        </button>


                      </div>


                    </div>


                    {depositStatus && depositStatus !== 'done' && depositReason ?


                      <div className="hint" style={{ marginTop: 6, color: '#92400e' }}>{UI_TEXT.t70}


                        {depositReason}


                      </div> :


                      null}


                    {expandedLogs[dep.id] &&


                      <div className="sections" style={{ gap: 6 }}>


                        {(dep.sections || []).length === 0 && <div className="hint">{UI_TEXT.t71}</div>}


                        {(dep.sections || []).map((s, i) => {


                          // 新字段 keys（基于 llmScript）
                          const typeKey = `${dep.id}||${s.id}||type`;
                          const descriptionKey = `${dep.id}||${s.id}||description`;
                          const instructionsKey = `${dep.id}||${s.id}||instructions`;
                          const inputSourceDescKey = `${dep.id}||${s.id}||inputSourceDesc`;
                          const targetTitleKey = `${dep.id}||${s.id}||targetTitle`;
                          const aiGuidanceKey = `${dep.id}||${s.id}||aiGuidance`;
                          
                          // 旧字段 keys（兼容）
                          const actionKey = `${dep.id}||${s.id}||action`;


                          const execKey = `${dep.id}||${s.id}||exec`;


                          const summaryKey = `${dep.id}||${s.id}||summary`;


                          const locationKey = `${dep.id}||${s.id}||location`;


                          const reqInputKey = `${dep.id}||${s.id}||req_input`;


                          const reqExecKey = `${dep.id}||${s.id}||req_exec`;


                          const reqSummaryKey = `${dep.id}||${s.id}||req_summary`;


                          const reqLocationKey = `${dep.id}||${s.id}||req_location`;


                          const editing =


                            depositEditing[typeKey] !== undefined ||
                            depositEditing[descriptionKey] !== undefined ||
                            depositEditing[actionKey] !== undefined ||


                            depositEditing[execKey] !== undefined ||


                            depositEditing[summaryKey] !== undefined ||


                            depositEditing[locationKey] !== undefined;


                          const parsed = parseDepositSectionContent(s?.content || '');


                          const requirements = getSectionRequirements(s);


                          const sectionMeta = extractReplayMeta(s?.content || '');


                          const canFlexUpload =


                            !editing &&


                            sectionMeta?.type === 'add_doc' && (


                              sectionMeta?.source === 'upload' || (s?.content || '').toString().includes(UI_TEXT.t162));


                          const replay = replayState?.[dep.id]?.bySection?.[s.id];


                          const compiling = !!compilingDepositSections[`${dep.id}||${s.id}`];


                          const expanded = editing ? true : isDepositSectionExpanded(dep.id, s.id);


                          return (


                            <div key={s.id} className="section" style={{ background: '#fff' }}>


                              <div className="section-head" style={{ justifyContent: 'space-between', alignItems: 'center' }}>


                                <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'nowrap', flex: 1, minWidth: 0 }}>


                                  <span className="pill muted">{i + 1}</span>


                                  {editing ?


                                    <>


                                      <span className="hint">{UI_TEXT.t72}</span>


                                      <input


                                        value={depositEditing[actionKey] ?? s.action ?? ''}


                                        onChange={(e) => startEditDeposit(dep.id, `${s.id}||action`, e.target.value)}


                                        onKeyDown={(e) => handleDepositSectionKeyDown(e, dep.id, s.id)}


                                        style={{ minWidth: 180 }} />





                                    </> :





                                    <span className="section-action-name">{s.action || UI_TEXT.t123}</span>


                                  }


                                  {replay?.status ?


                                    <span className={`status ${replay.status}`} title={replay.message || ''}>


                                      {replay.status}


                                    </span> :


                                    null}


                                </div>


                                <div className="section-actions" style={{ gap: 6 }}>


                                  {canFlexUpload ?


                                    <button className="ghost xsmall" type="button" onClick={() => void flexEditUploadDepositSection(dep.id, s)}>{UI_TEXT.t73}





                                    </button> :


                                    null}


                                  {editing ?


                                    <>


                                      <button className="ghost xsmall" type="button" onClick={() => void applyDepositSection(dep.id, s.id)} disabled={compiling}>


                                        {compiling ? UI_TEXT.t124 : UI_TEXT.t125}


                                      </button>


                                      <button className="ghost xsmall" type="button" onClick={() => cancelEditDepositSection(dep.id, s.id)}>


                                        {UI_TEXT.t22}


                                      </button>


                                    </> :





                                    <button className="ghost xsmall" type="button" onClick={() => startEditDepositSection(dep.id, s)}>{UI_TEXT.t41}





                                    </button>


                                  }


                                  <button className="ghost xsmall" type="button" onClick={() => toggleDepositSectionExpanded(dep.id, s.id)}>


                                    {expanded ? UI_TEXT.t142 : UI_TEXT.t143}


                                  </button>


                                  <button className="ghost xsmall" type="button" onClick={() => deleteDepositSection(dep.id, s.id)}>{UI_TEXT.t25}





                                  </button>


                                </div>


                              </div>


                              {expanded ?


                                editing ?


                                  <div className="section" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px', borderRadius: 8 }}>


                                    <div style={{ display: 'grid', gap: 8 }}>

                                      {/* 操作类型 */}
                                      <label style={{ display: 'grid', gap: 4 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <span className="hint">操作类型</span>
                                          <span className="hint" style={{ fontSize: 10, color: '#94a3b8' }}>必填</span>
                                        </div>
                                        <input
                                          value={depositEditing[typeKey] ?? ''}
                                          placeholder="如: dispatch, insert_to_summary, outline_extract"
                                          onChange={(e) => startEditDeposit(dep.id, `${s.id}||type`, e.target.value)}
                                          onKeyDown={(e) => handleDepositSectionKeyDown(e, dep.id, s.id)} />
                                      </label>

                                      {/* 动作描述 */}
                                      <label style={{ display: 'grid', gap: 4 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <span className="hint">动作描述</span>
                                          <span className="hint" style={{ fontSize: 10, color: '#94a3b8' }}>必填</span>
                                        </div>
                                        <input
                                          value={depositEditing[descriptionKey] ?? ''}
                                          placeholder="如: 对已勾选大纲标题的内容执行指令「扩写摘要到5句话。」"
                                          onChange={(e) => startEditDeposit(dep.id, `${s.id}||description`, e.target.value)}
                                          onKeyDown={(e) => handleDepositSectionKeyDown(e, dep.id, s.id)} />
                                      </label>

                                      {/* 指令内容 */}
                                      <label style={{ display: 'grid', gap: 4 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <span className="hint">指令内容</span>
                                          <span className="hint" style={{ fontSize: 10, color: '#94a3b8' }}>可选</span>
                                        </div>
                                        <textarea
                                          rows={2}
                                          value={depositEditing[instructionsKey] ?? ''}
                                          placeholder="如: 扩写摘要到5句话。"
                                          onChange={(e) => startEditDeposit(dep.id, `${s.id}||instructions`, e.target.value)}
                                          onKeyDown={(e) => handleDepositSectionKeyDown(e, dep.id, s.id)} />
                                      </label>

                                      {/* 输入来源 */}
                                      <label style={{ display: 'grid', gap: 4 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <span className="hint">输入来源</span>
                                          <span className="hint" style={{ fontSize: 10, color: '#94a3b8' }}>可选</span>
                                        </div>
                                        <input
                                          value={depositEditing[inputSourceDescKey] ?? ''}
                                          placeholder="如: 已勾选的大纲（一级标题「每日报告」的摘要内容）"
                                          onChange={(e) => startEditDeposit(dep.id, `${s.id}||inputSourceDesc`, e.target.value)}
                                          onKeyDown={(e) => handleDepositSectionKeyDown(e, dep.id, s.id)} />
                                      </label>

                                      {/* 目标位置 */}
                                      <label style={{ display: 'grid', gap: 4 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <span className="hint">目标位置</span>
                                          <span className="hint" style={{ fontSize: 10, color: '#94a3b8' }}>可选</span>
                                        </div>
                                        <input
                                          value={depositEditing[targetTitleKey] ?? ''}
                                          placeholder="如: 大纲配置（一级标题「每日报告」的摘要）、结果展示区"
                                          onChange={(e) => startEditDeposit(dep.id, `${s.id}||targetTitle`, e.target.value)}
                                          onKeyDown={(e) => handleDepositSectionKeyDown(e, dep.id, s.id)} />
                                      </label>

                                      {/* AI指导 */}
                                      <label style={{ display: 'grid', gap: 4 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <span className="hint">AI指导</span>
                                          <span className="hint" style={{ fontSize: 10, color: '#94a3b8' }}>可选</span>
                                        </div>
                                        <textarea
                                          rows={2}
                                          value={depositEditing[aiGuidanceKey] ?? ''}
                                          placeholder="如: 根据指令处理输入内容，生成符合要求的输出。Replay 时应使用目标位置的最新内容作为输入。"
                                          onChange={(e) => startEditDeposit(dep.id, `${s.id}||aiGuidance`, e.target.value)}
                                          onKeyDown={(e) => handleDepositSectionKeyDown(e, dep.id, s.id)} />
                                      </label>

                                      <div style={{ borderTop: '1px dashed #e2e8f0', margin: '4px 0', paddingTop: 8 }}>
                                        <div className="hint" style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>旧字段（兼容脚本Replay）</div>
                                      </div>

                                      <label style={{ display: 'grid', gap: 4 }}>


                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>


                                          <span className="hint">{UI_TEXT.t74}</span>


                                          <select


                                            value={depositEditing[reqInputKey] ?? requirements.inputSource}


                                            onChange={(e) => startEditDeposit(dep.id, `${s.id}||req_input`, e.target.value)}>





                                            <option value="required">{UI_TEXT.t75}</option>


                                            <option value="optional">{UI_TEXT.t76}</option>


                                          </select>


                                        </div>


                                        <div className="hint" style={{ whiteSpace: 'pre-wrap' }}>


                                          {(parsed.inputLine || '').replace(INPUT_SOURCE_PREFIX_RE, '') || UI_TEXT.t126}


                                        </div>


                                      </label>


                                      <label style={{ display: 'grid', gap: 4 }}>


                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>


                                          <span className="hint">{UI_TEXT.t94}</span>


                                          <select


                                            value={depositEditing[reqExecKey] ?? requirements.actionExecution}


                                            onChange={(e) => startEditDeposit(dep.id, `${s.id}||req_exec`, e.target.value)}>





                                            <option value="required">{UI_TEXT.t75}</option>


                                            <option value="optional">{UI_TEXT.t76}</option>


                                          </select>


                                        </div>


                                        <input


                                          value={depositEditing[execKey] ?? ''}


                                          onChange={(e) => startEditDeposit(dep.id, `${s.id}||exec`, e.target.value)}


                                          onKeyDown={(e) => handleDepositSectionKeyDown(e, dep.id, s.id)} />





                                      </label>


                                      <label style={{ display: 'grid', gap: 4 }}>


                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>


                                          <span className="hint">{UI_TEXT.t77}</span>


                                          <select


                                            value={depositEditing[reqSummaryKey] ?? requirements.executionSummary}


                                            onChange={(e) => startEditDeposit(dep.id, `${s.id}||req_summary`, e.target.value)}>





                                            <option value="required">{UI_TEXT.t75}</option>


                                            <option value="optional">{UI_TEXT.t76}</option>


                                          </select>


                                        </div>


                                        <textarea


                                          rows={3}


                                          value={depositEditing[summaryKey] ?? ''}


                                          onChange={(e) => startEditDeposit(dep.id, `${s.id}||summary`, e.target.value)}


                                          onKeyDown={(e) => handleDepositSectionKeyDown(e, dep.id, s.id)} />





                                      </label>


                                      <label style={{ display: 'grid', gap: 4 }}>


                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>


                                          <span className="hint">{UI_TEXT.t78}</span>


                                          <select


                                            value={depositEditing[reqLocationKey] ?? requirements.recordLocation}


                                            onChange={(e) => startEditDeposit(dep.id, `${s.id}||req_location`, e.target.value)}>





                                            <option value="required">{UI_TEXT.t75}</option>


                                            <option value="optional">{UI_TEXT.t76}</option>


                                          </select>


                                        </div>


                                        <input


                                          value={depositEditing[locationKey] ?? ''}


                                          onChange={(e) => startEditDeposit(dep.id, `${s.id}||location`, e.target.value)}


                                          onKeyDown={(e) => handleDepositSectionKeyDown(e, dep.id, s.id)} />





                                      </label>


                                      <div className="hint">{UI_TEXT.t79}</div>


                                    </div>


                                  </div> :





                                  <>


                                    {/* 显示大模型记录（如果有） - 完整信息 */}
                                    {s.llmScript && (
                                      <div style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', border: '1px solid #7dd3fc', borderRadius: 6, padding: 8, marginBottom: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                          <span style={{ background: '#0ea5e9', color: '#fff', fontSize: 11, padding: '2px 6px', borderRadius: 4 }}>🤖 大模型记录</span>
                                          {s.llmScript.title && <span style={{ fontWeight: 500, color: '#0369a1' }}>{s.llmScript.title}</span>}
                                        </div>
                                        {s.llmScript.type && <div style={{ fontSize: 12, color: '#0c4a6e' }}>类型: {s.llmScript.type}</div>}
                                        {s.llmScript.description && <div style={{ fontSize: 12, color: '#0c4a6e' }}>描述: {s.llmScript.description}</div>}
                                        {(s.llmScript.instructions || s.llmScript.promptContent) && <div style={{ fontSize: 12, color: '#0c4a6e' }}>指令内容: {s.llmScript.instructions || s.llmScript.promptContent}</div>}
                                        {s.llmScript.inputSourceDesc && <div style={{ fontSize: 12, color: '#0c4a6e' }}>输入来源: {s.llmScript.inputSourceDesc}</div>}
                                        {s.llmScript.inputContentExcerpt && <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>【参考】录制时输入: {s.llmScript.inputContentExcerpt.length > 80 ? s.llmScript.inputContentExcerpt.substring(0, 80) + '...' : s.llmScript.inputContentExcerpt}</div>}
                                        {s.llmScript.targetTitle && <div style={{ fontSize: 12, color: '#0c4a6e' }}>目标标题: {s.llmScript.targetTitle}</div>}
                                        {s.llmScript.outputTargetDesc && <div style={{ fontSize: 12, color: '#0c4a6e' }}>输出目标: {s.llmScript.outputTargetDesc}</div>}
                                        {s.llmScript.outputs?.outputContent && <div style={{ fontSize: 12, color: '#0c4a6e' }}>输出内容: {s.llmScript.outputs.outputContent.length > 100 ? s.llmScript.outputs.outputContent.substring(0, 100) + '...' : s.llmScript.outputs.outputContent}</div>}
                                        {s.llmScript.aiGuidance && <div style={{ fontSize: 12, color: '#0c4a6e', fontStyle: 'italic' }}>AI指导: {s.llmScript.aiGuidance}</div>}
                                      </div>
                                    )}
                                    {/* 显示脚本记录 */}
                                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 8 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                        <span style={{ background: '#64748b', color: '#fff', fontSize: 11, padding: '2px 6px', borderRadius: 4 }}>📜 脚本记录</span>
                                      </div>
                                      <div className="hint" style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{s.content || s.originalScript?.content || UI_TEXT.t128}</div>
                                    </div>


                                    {replay?.status && replay.status !== 'done' ?


                                      <div


                                        className="hint"


                                        style={{ whiteSpace: 'pre-wrap', color: replay.status === 'fail' ? '#b91c1c' : '#92400e' }}>





                                        {replay.message || UI_TEXT.t129}


                                      </div> :


                                      null}


                                  </> :





                                null}


                            </div>);





                        })}


                      </div>


                    }


                  </div>);





              })}


            </div>


        }


      </div>);





  };





  return (


    <>


      {showBackofficeConfig &&


        <div className="modal-backdrop" onClick={() => setShowBackofficeConfig(false)}>


          <div className="modal-card" onClick={(e) => e.stopPropagation()}>


            <div className="modal-head">


              <h3>{UI_TEXT.t80}</h3>


              <button className="ghost xsmall" type="button" onClick={() => setShowBackofficeConfig(false)}>{UI_TEXT.t45}





              </button>


            </div>


            <div className="modal-body">


              {renderGlobalButtonsConfigPanel()}


            </div>


            <div className="modal-foot">


              <button className="ghost small" type="button" onClick={() => setShowBackofficeConfig(false)}>{UI_TEXT.t22}





              </button>


              <button className="ghost small" type="button" onClick={saveBackofficeButtonsConfig}>{UI_TEXT.t59}





              </button>


            </div>


          </div>


        </div>


      }

      {/* 沉淀确认弹窗 - AI 优化沉淀内容 */}
      {showDepositConfirmModal && depositConfirmData && (
        <div className="modal-backdrop" onClick={cancelDepositConfirm}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ width: '900px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-head">
              <h3>📝 沉淀确认与优化</h3>
              <button className="ghost xsmall" type="button" onClick={cancelDepositConfirm}>✕</button>
            </div>
            
            <div className="modal-body" style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
              {/* 第一行：沉淀名称 + 沉淀模式 */}
              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#374151' }}>沉淀名称</label>
                  <input
                    type="text"
                    value={depositConfirmData.depositName || ''}
                    onChange={(e) => setDepositConfirmData(prev => ({ ...prev, depositName: e.target.value }))}
                    placeholder="请输入沉淀名称"
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                  />
                </div>
                <div style={{ width: '200px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#374151' }}>沉淀模式</label>
                  <select
                    value={depositConfirmData.precipitationMode || 'llm'}
                    onChange={(e) => setDepositConfirmData(prev => ({ ...prev, precipitationMode: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', background: '#fff' }}
                  >
                    <option value="llm">🤖 大模型Replay</option>
                    <option value="script">📜 脚本Replay</option>
                  </select>
                </div>
              </div>

              {/* 沉淀模式说明 */}
              <div style={{ 
                marginBottom: '16px', 
                padding: '10px 14px', 
                background: depositConfirmData.precipitationMode === 'llm' ? '#eff6ff' : '#fef3c7',
                border: `1px solid ${depositConfirmData.precipitationMode === 'llm' ? '#bfdbfe' : '#fcd34d'}`,
                borderRadius: '6px',
                fontSize: '13px'
              }}>
                {depositConfirmData.precipitationMode === 'llm' ? (
                  <><b>🤖 大模型Replay</b>：Replay 时 AI 会理解沉淀内容，结合当前上下文智能执行，适应性强。如无法执行会告知原因后尝试脚本Replay</>
                ) : (
                  <><b>📜 脚本Replay</b>：Replay 时严格按照录制的脚本执行，要求字段完全匹配</>
                )}
              </div>

              {/* 录制的步骤摘要 - 可点击选择查看对应的脚本内容 */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#374151' }}>
                  录制的操作（共 {depositConfirmData.sections?.length || 0} 步）
                  <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: '8px' }}>点击查看对应脚本</span>
                </label>
                <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '8px', maxHeight: '120px', overflow: 'auto' }}>
                  {/* 全部显示选项 */}
                  <div 
                    onClick={() => setSelectedSectionIndex(-1)}
                    style={{ 
                      padding: '6px 10px', 
                      marginBottom: '4px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      background: selectedSectionIndex === -1 ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                      color: selectedSectionIndex === -1 ? '#fff' : '#6b7280',
                      fontWeight: selectedSectionIndex === -1 ? 500 : 400,
                      transition: 'all 0.2s'
                    }}
                  >
                    📋 全部步骤
                  </div>
                  {/* 各个 section */}
                  {depositConfirmData.sections?.map((s, i) => (
                    <div 
                      key={i} 
                      onClick={() => setSelectedSectionIndex(i)}
                      style={{ 
                        padding: '6px 10px', 
                        borderRadius: '4px',
                        cursor: 'pointer',
                        background: selectedSectionIndex === i ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                        color: selectedSectionIndex === i ? '#fff' : '#111827',
                        fontWeight: selectedSectionIndex === i ? 500 : 400,
                        transition: 'all 0.2s',
                        marginBottom: i < depositConfirmData.sections.length - 1 ? '2px' : '0'
                      }}
                    >
                      <span style={{ marginRight: '8px', opacity: 0.7 }}>{i + 1}.</span>
                      <span>{s.action || s.generalizedTitle || '操作'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 结构化沉淀脚本 - 始终显示的可编辑文本框 */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#374151' }}>
                  结构化沉淀脚本
                  <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: '8px' }}>
                    {selectedSectionIndex >= 0 
                      ? `（当前显示：步骤 ${selectedSectionIndex + 1}）`
                      : (depositConfirmData.precipitationMode === 'llm' ? '（可编辑，AI 优化结果将显示在此）' : '（可编辑，Replay 时将严格执行此脚本）')
                    }
                  </span>
                </label>
                <textarea
                  value={selectedSectionIndex >= 0 
                    ? getScriptForSection(depositConfirmData.structuredScript, selectedSectionIndex)
                    : (depositConfirmData.structuredScript || '')
                  }
                  onChange={(e) => {
                    if (selectedSectionIndex >= 0) {
                      // 更新选中 section 对应的脚本内容
                      const updatedScript = updateScriptForSection(
                        depositConfirmData.structuredScript, 
                        selectedSectionIndex, 
                        e.target.value
                      );
                      setDepositConfirmData(prev => ({ ...prev, structuredScript: updatedScript }));
                    } else {
                      // 更新全部脚本内容
                      setDepositConfirmData(prev => ({ ...prev, structuredScript: e.target.value }));
                    }
                  }}
                  placeholder={depositConfirmData.precipitationMode === 'llm' 
                    ? '点击下方「AI 智能优化」按钮，AI 将根据录制的操作生成结构化脚本...\n\n您也可以直接在此编辑脚本内容。'
                    : '请输入或编辑结构化脚本，Replay 时将按此脚本执行...'}
                  style={{ 
                    width: '100%', 
                    height: '220px', 
                    padding: '12px', 
                    border: `1px solid ${depositConfirmData.structuredScript ? '#a7f3d0' : '#d1d5db'}`,
                    borderRadius: '6px', 
                    fontSize: '13px',
                    background: depositConfirmData.structuredScript ? '#f0fdf4' : '#fff',
                    color: '#1f2937',
                    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                    resize: 'vertical',
                    lineHeight: '1.5'
                  }}
                />
              </div>

              {/* 大模型沉淀时显示 AI 优化区域 */}
              {depositConfirmData.precipitationMode === 'llm' && (
                <>
                  {/* 补充要求 / 修改指示 */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#374151' }}>
                      修改指示（可选）
                      <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: '8px' }}>告诉 AI 如何调整脚本</span>
                    </label>
                    <textarea
                      value={depositConfirmData.userRequirements || ''}
                      onChange={(e) => setDepositConfirmData(prev => ({ ...prev, userRequirements: e.target.value }))}
                      placeholder="例如：把职称去掉，只留下名字；第2步改为通用描述..."
                      style={{ width: '100%', height: '50px', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', resize: 'vertical' }}
                    />
                  </div>

                  {/* AI 优化按钮 */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button
                      onClick={() => processDepositWithAI()}
                      disabled={depositConfirmData.isProcessing}
                      style={{
                        background: depositConfirmData.isProcessing ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '10px 20px',
                        fontSize: '14px',
                        cursor: depositConfirmData.isProcessing ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      {depositConfirmData.isProcessing ? '⏳ AI 处理中...' : (depositConfirmData.structuredScript ? '🔄 AI 重新优化' : '✨ AI 智能优化')}
                    </button>
                    <span style={{ color: '#6b7280', fontSize: '13px' }}>
                      {depositConfirmData.structuredScript 
                        ? '将基于当前脚本和修改指示重新优化' 
                        : '将录制内容转化为可复用的结构化脚本'}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="modal-foot" style={{ borderTop: '1px solid #e5e7eb', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                {depositConfirmData.precipitationMode === 'llm' 
                  ? '🤖 大模型Replay：AI 智能执行' 
                  : '📜 脚本Replay：严格匹配执行'}
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  className="ghost small" 
                  type="button" 
                  onClick={cancelDepositConfirm}
                  style={{ padding: '8px 16px' }}
                >
                  取消
                </button>
                <button 
                  className="ghost small" 
                  type="button" 
                  onClick={() => { setIsDepositing(false); setDepositSections([]); setShowDepositConfirmModal(false); setDepositConfirmData(null); }}
                  style={{ padding: '8px 16px', color: '#dc2626' }}
                >
                  放弃录制
                </button>
                <button 
                  type="button" 
                  onClick={confirmSaveDeposit}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 20px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  ✓ 确认保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 更新沉淀集弹窗 - 多选沉淀集 */}
      {showUpdateGroupModal && (
        <div className="modal-backdrop" onClick={() => setShowUpdateGroupModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ width: '450px', maxWidth: '90vw' }}>
            <div className="modal-head">
              <h3>📦 选择要并入的沉淀集</h3>
              <button className="ghost xsmall" type="button" onClick={() => setShowUpdateGroupModal(false)}>✕</button>
            </div>
            
            <div className="modal-body" style={{ padding: '16px', maxHeight: '400px', overflow: 'auto' }}>
              <p style={{ marginBottom: '12px', color: '#6b7280', fontSize: '13px' }}>
                已选择 {getSelectedDepositIds().length} 个沉淀，请选择要并入的沉淀集（可多选）：
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {depositGroups.map((group, idx) => (
                  <label 
                    key={group.id} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px',
                      padding: '10px 12px',
                      background: updateGroupSelectedIds.includes(group.id) ? '#eff6ff' : '#f9fafb',
                      border: updateGroupSelectedIds.includes(group.id) ? '1px solid #3b82f6' : '1px solid #e5e7eb',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={updateGroupSelectedIds.includes(group.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setUpdateGroupSelectedIds(prev => [...prev, group.id]);
                        } else {
                          setUpdateGroupSelectedIds(prev => prev.filter(id => id !== group.id));
                        }
                      }}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <span style={{ flex: 1, fontWeight: 500, color: '#374151' }}>
                      {idx + 1}. {group.name}
                    </span>
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                      {(group.depositIds || []).length} 个沉淀
                    </span>
                  </label>
                ))}
              </div>
              
              {depositGroups.length === 0 && (
                <p style={{ textAlign: 'center', color: '#9ca3af', padding: '20px' }}>暂无沉淀集</p>
              )}
            </div>
            
            <div className="modal-foot" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '12px 16px', borderTop: '1px solid #e5e7eb' }}>
              <button 
                className="ghost small" 
                type="button" 
                onClick={() => setShowUpdateGroupModal(false)}
                style={{ padding: '8px 16px' }}
              >
                取消
              </button>
              <button 
                type="button" 
                onClick={confirmUpdateGroups}
                disabled={updateGroupSelectedIds.length === 0}
                style={{
                  background: updateGroupSelectedIds.length > 0 ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : '#e5e7eb',
                  color: updateGroupSelectedIds.length > 0 ? '#fff' : '#9ca3af',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: updateGroupSelectedIds.length > 0 ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease'
                }}
              >
                确认并入 {updateGroupSelectedIds.length > 0 ? `(${updateGroupSelectedIds.length}个)` : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditingLayout && showRecycleBin &&


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


            localStorage.setItem('layout_size', JSON.stringify(layoutSize));





            // Persist to backend


            api('/api/config/save', {


              method: 'POST',


              body: {


                layout: panelPositions,


                globalButtons: {


                  activeButtons: globalButtons,


                  deletedButtons,


                  version: '2.0',


                  savedAt: Date.now()


                },


                contentBlocks: contentBlockPositions,


                deletedBlocks: deletedBlocks,


                headerTitles,


                layoutSize


              }


            }).then(() => {


              console.log('Saved config to backend');


            }).catch((e) => {


              console.error('Failed to save to backend', e);


              alert(UI_TEXT.t154);


            });


          }}


          onCancel={() => {


            if (confirm(UI_TEXT.t155)) {


              setIsEditingLayout(false);


              window.location.reload();


            }


          }}


          onReset={() => {


            if (confirm(UI_TEXT.t156)) {


              localStorage.removeItem('layout_panel_positions');


              localStorage.removeItem('layout_content_blocks');


              localStorage.removeItem('button_config_v2');


              window.location.reload();


            }


          }} />





      }








      {isEditingLayout && !showRecycleBin &&


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


          title={UI_TEXT.t130}>





          <ChevronLeft size={20} color="#64748b" />


        </button>


      }








      {isEditingLayout &&


        <button


          onClick={() => {


            setIsEditingLayout(false);


            localStorage.setItem('global-buttons-config', JSON.stringify({


              activeButtons: globalButtons,


              deletedButtons,


              version: '2.0',


              savedAt: Date.now()


            }));


            localStorage.setItem('layout_panel_positions', JSON.stringify(panelPositions));


            localStorage.setItem('layout_content_blocks', JSON.stringify(contentBlockPositions));


            localStorage.setItem('layout_deleted_blocks', JSON.stringify(deletedBlocks));


            localStorage.setItem('layout_size', JSON.stringify(layoutSize));





            api('/api/config/save', {


              method: 'POST',


              body: {


                layout: panelPositions,


                globalButtons: {


                  activeButtons: globalButtons,


                  deletedButtons,


                  version: '2.0',


                  savedAt: Date.now()


                },


                contentBlocks: contentBlockPositions,


                deletedBlocks: deletedBlocks,


                headerTitles,


                layoutSize


              }


            }).then(() => {


              console.log('Saved config to backend');


            }).catch((e) => {


              console.error('Failed to save to backend', e);


              alert(UI_TEXT.t154);


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


          }}>





          <Save size={16} />{UI_TEXT.t81}


        </button>


      }





      <main className={`layout-multi ${isEditingLayout ? 'editing-mode' : ''}`} style={{ position: 'relative' }}>





        {/* <EditingToolbar /> Removed in favor of EditConsole */}





        <header className="hero" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>


            <LayoutIcon size={22} style={{ color: 'var(--primary-accent)', marginTop: '4px' }} />


            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px' }}>


              {/* Eyebrow Title */}


              {isEditingLayout ?


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


                    transform: `translate(${headerTitles.eyebrow.position?.left || 0}px, ${headerTitles.eyebrow.position?.top || 0}px)`


                  }}


                  onMouseDown={(e) => handleHeaderTitleMouseDown(e, 'eyebrow')}>





                  <p


                    className="eyebrow"


                    style={{


                      margin: 0,


                      flex: 1,


                      display: 'flex',


                      alignItems: 'center',


                      justifyContent: headerTitles.eyebrow.style?.textAlign === 'left' ? 'flex-start' : headerTitles.eyebrow.style?.textAlign === 'right' ? 'flex-end' : 'center',


                      textAlign: headerTitles.eyebrow.style?.textAlign || 'center',


                      ...headerTitles.eyebrow.style


                    }}>





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


                      flexShrink: 0


                    }}


                    title={UI_TEXT.t82}>





                    <Type size={12} />


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


                    }} />





                </div> :





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


                  }}>





                  {headerTitles.eyebrow.text}


                </p>


              }





              {/* Main Title */}


              {isEditingLayout ?


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


                    transform: `translate(${headerTitles.title.position?.left || 0}px, ${headerTitles.title.position?.top || 0}px)`


                  }}


                  onMouseDown={(e) => handleHeaderTitleMouseDown(e, 'title')}>





                  <h1


                    style={{


                      margin: 0,


                      flex: 1,


                      display: 'flex',


                      alignItems: 'center',


                      justifyContent: headerTitles.title.style?.textAlign === 'left' ? 'flex-start' : headerTitles.title.style?.textAlign === 'right' ? 'flex-end' : 'center',


                      textAlign: headerTitles.title.style?.textAlign || 'center',


                      ...headerTitles.title.style


                    }}>





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


                      flexShrink: 0


                    }}


                    title={UI_TEXT.t82}>





                    <Type size={12} />


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


                    }} />





                </div> :





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


                  }}>





                  {headerTitles.title.text}


                </h1>


              }


            </div>


          </div>


          <div className="actions" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            {/* 第一行：切换应用端工作台按钮（字体更大），编辑模式下向左移动避免被工具栏遮挡 */}
            <button
              onClick={onSwitch}
              className="ghost"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '999px',
                fontSize: '16px',
                fontWeight: 600,
                marginRight: isEditingLayout ? '280px' : '0'
              }}>
              <GalleryVerticalEnd size={18} /> {UI_TEXT.t83}
            </button>

            {/* 第二行：只有自动沉淀按钮 */}
            {!isEditingLayout && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button className={`ghost ${isDepositing ? 'active' : ''}`} onClick={startDeposit}>
                  <History size={18} /> {isDepositing ? UI_TEXT.t131 : UI_TEXT.t141}
                </button>
                {isDepositing && (
                  <button className="ghost" onClick={endDeposit}>{UI_TEXT.t87}</button>
                )}
              </div>
            )}
            {isEditingLayout && <span className="hint">{UI_TEXT.t88}</span>}
          </div>

          {/* 右下角：后管页面按钮逻辑、编辑布局（字体更小） */}
          {!isEditingLayout && (
            <div style={{
              position: 'fixed',
              right: '24px',
              bottom: '24px',
              display: 'flex',
              gap: '8px',
              zIndex: 100
            }}>
              <button
                className="ghost"
                onClick={() => setShowBackofficeConfig(true)}
                title={UI_TEXT.t84}
                style={{ fontSize: '11px', padding: '4px 8px' }}>
                <Settings size={14} />{UI_TEXT.t80}
              </button>
              <button
                className="ghost"
                onClick={() => setIsEditingLayout(true)}
                title={UI_TEXT.t85}
                style={{ fontSize: '11px', padding: '4px 8px' }}>
                <Pencil size={14} />{UI_TEXT.t86}
              </button>
            </div>
          )}
        </header>





        {isEditingLayout ?


          <LayoutEditContainer


            isEditing={true}


            size={layoutSize}


            onSizeChange={setLayoutSize}


            style={{ position: 'relative' }}>





            <div style={{ position: 'relative', width: '100%', height: '100%' }}>


              {/* 输入表单面板 */}








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


                }>





                <div style={{ position: 'relative', width: '100%', height: '100%' }}>


                  <EditableContentBlock


                    blockId="document-list-content"


                    panelId="document-list-panel"


                    isEditing={isEditingLayout}


                    position={contentBlockPositions['document-list-panel']}


                    onPositionChange={(newPos) =>


                      setContentBlockPositions((prev) => ({ ...prev, 'document-list-panel': newPos }))


                    }


                    hidden={deletedBlocks.includes('document-list-panel')}


                    onDelete={() => handleDeleteBlock('document-list-panel')}>





                    <DocumentListPanelContent
                      docs={docs}
                      selectedDocId={selectedDocId}
                      setSelectedDocId={setSelectedDocId}
                      deleteDoc={deleteDoc}
                      uploadInputRef={uploadInputRef}
                      handleFilePick={handleFilePick}
                      replayDirConfig={replayDirConfig}
                      setReplayDirConfig={setReplayDirConfig}
                      saveReplayDirConfig={saveReplayDirConfig}
                      replayDirConfigSaving={replayDirConfigSaving} />





                  </EditableContentBlock>





                  {/* 可编辑的回放目录模块 */}


                  <EditableContentBlock


                    blockId="document-replay-ui"


                    panelId="document-list-panel"


                    isEditing={isEditingLayout}


                    position={contentBlockPositions['document-replay-ui']}


                    onPositionChange={(newPos) =>


                      setContentBlockPositions((prev) => ({ ...prev, 'document-replay-ui': newPos }))


                    }


                    hidden={deletedBlocks.includes('document-replay-ui')}


                    onDelete={() => handleDeleteBlock('document-replay-ui')}>





                    <ReplayDirectoryPanelContent


                      replayDirName={replayDirName}


                      pickReplayDirectory={pickReplayDirectory}


                      clearReplayDirectory={clearReplayDirectory}


                      replayDirHandle={replayDirHandle} />





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


                }>





                <div style={{ position: 'relative', width: '100%', height: '100%' }}>





                  <EditableContentBlock


                    blockId="preview-textarea"


                    panelId="preview-panel"


                    isEditing={isEditingLayout}


                    position={contentBlockPositions['preview-textarea']}


                    onPositionChange={(newPos) =>


                      setContentBlockPositions((prev) => ({ ...prev, 'preview-textarea': newPos }))


                    }


                    hidden={deletedBlocks.includes('preview-textarea')}


                    onDelete={() => handleDeleteBlock('preview-textarea')}>





                    <div className="card" style={{ width: '100%', height: '100%', padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>


                      <div style={{ position: 'absolute', top: 8, right: 24, zIndex: 10 }}>


                        <button


                          type="button"


                          onClick={insertSelectionToCheckedSummaries}


                          style={{ backgroundColor: '#ffffff', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 12px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', height: '32px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>





                          <Copy size={14} />{UI_TEXT.t89}


                        </button>


                      </div>


                      <textarea


                        ref={previewTextRef}


                        className="preview full"


                        value={docDraft}


                        onChange={(e) => setDocDraft(e.target.value)}


                        onMouseUp={updatePreviewSelection}


                        onKeyUp={updatePreviewSelection}


                        onSelect={updatePreviewSelection}


                        onBlur={saveDocDraft}


                        placeholder={UI_TEXT.t90}


                        style={{ border: 'none', width: '100%', height: '100%', resize: 'none', padding: '48px 12px 12px', boxSizing: 'border-box' }} />





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


                }>





                <div style={{ position: 'relative', width: '100%', height: '100%' }}>


                  <EditableContentBlock


                    blockId="processing-tabs"


                    panelId="processing-panel"


                    isEditing={isEditingLayout}


                    position={contentBlockPositions['processing-tabs']}


                    onPositionChange={(newPos) =>


                      setContentBlockPositions((prev) => ({ ...prev, 'processing-tabs': newPos }))


                    }


                    allowChildPointerEvents>





                    <div className="editable-button-group processing-tabs-bar">


                      {getProcessingTabButtons().map((btn) =>


                        <EditableButton


                          key={btn.id}


                          button={btn}


                          isEditing={isEditingLayout}


                          panelId="processing-tabs"


                          onMouseDown={handleButtonMouseDown}


                          onStyleEdit={handleStyleEdit}


                          onClick={handleWorkbenchButtonClick} />





                      )}


                      {renderProcessingTabArrows()}


                    </div>


                  </EditableContentBlock>


                  {processingTab !== 'records' &&


                    <EditableContentBlock


                      blockId="processing-content"


                      panelId="processing-panel"


                      isEditing={isEditingLayout}


                      position={contentBlockPositions['processing-panel']}


                      onPositionChange={(newPos) =>


                        setContentBlockPositions((prev) => ({ ...prev, 'processing-panel': newPos }))


                      }


                      hidden={deletedBlocks.includes('processing-panel')}


                      onDelete={() => handleDeleteBlock('processing-panel')}>





                      <div


                        style={{


                          fontSize: '12px',


                          color: '#666',


                          minHeight: '100%',


                          boxSizing: 'border-box',


                          display: 'flex',


                          flexDirection: 'column'


                        }}>





                        {/* 内容区域 */}


                        <div style={{ padding: '0 12px 12px', overflowY: 'auto', flex: 1 }}>


                          {processingTab === 'outline' &&


                            <div>





                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '12px' }}>











                                <button


                                  className="ghost small"


                                  onClick={() => setShowDocPreviewModal(true)}


                                  disabled={!template?.sections?.length}


                                  style={{ background: '#3b82f6', color: '#fff', border: 'none' }}>{UI_TEXT.t91}








                                </button>





                                {/* 清除按钮 - 也可以配置化，但由硬编码逻辑支持 */}


                                <button


                                  className="ghost small"


                                  onClick={clearOutlineTemplate}


                                  style={{ color: '#ef4444', borderColor: '#ef4444' }}>{UI_TEXT.t92}








                                </button>


                              </div>





                              {!template || !template.sections || template.sections.length === 0 ?


                                <p style={{ fontSize: '13px', color: '#94a3b8', padding: '20px', textAlign: 'center' }}>{UI_TEXT.t93}</p> :





                                template.sections.map((sec, idx) => renderOutlineNode({ section: sec, index: idx }))


                              }


                            </div>


                          }


                          {processingTab === 'config' && renderAppButtonsConfigPanel()}


                        </div>


                      </div>


                    </EditableContentBlock>


                  }


                  {processingTab === 'records' &&


                    <>


                      <EditableContentBlock


                        blockId="processing-records-toolbar"


                        panelId="processing-panel"


                        isEditing={isEditingLayout}


                        position={{ ...contentBlockPositions['processing-records-toolbar'], height: 70 }}


                        onPositionChange={(newPos) =>


                          setContentBlockPositions((prev) => ({ ...prev, 'processing-records-toolbar': newPos }))


                        }


                        allowChildPointerEvents>





                        {/* 沉淀列表/沉淀集列表切换标签 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                          <button
                            type="button"
                            className={`ghost small ${depositViewMode === 'deposits' ? 'active' : ''}`}
                            onClick={() => setDepositViewMode('deposits')}
                            style={{ padding: '6px 16px', fontSize: '15px', fontWeight: 600, whiteSpace: 'nowrap' }}
                          >{UI_TEXT.t61}</button>
                          <button
                            type="button"
                            className={`ghost small ${depositViewMode === 'groups' ? 'active' : ''}`}
                            onClick={() => setDepositViewMode('groups')}
                            style={{ padding: '6px 16px', fontSize: '15px', fontWeight: 600, whiteSpace: 'nowrap' }}
                          >{UI_TEXT.t62}</button>
                        </div>
                        {/* 功能按钮栏 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 0', borderBottom: '1px solid #e5e7eb', marginBottom: '4px', flexWrap: 'nowrap', overflowX: 'auto', minHeight: '32px' }}>
                          {depositViewMode === 'deposits' && getRecordsToolbarButtons(RECORD_TOOLBAR_DEPOSIT_KINDS).map((btn) =>
                            <EditableButton
                              key={btn.id}
                              button={btn}
                              isEditing={isEditingLayout}
                              panelId="processing-records-toolbar"
                              onMouseDown={handleButtonMouseDown}
                              onStyleEdit={handleStyleEdit}
                              onClick={handleWorkbenchButtonClick} />
                          )}
                          {depositViewMode === 'groups' && getRecordsToolbarButtons(RECORD_TOOLBAR_GROUP_KINDS).map((btn) =>
                            <EditableButton
                              key={btn.id}
                              button={btn}
                              isEditing={isEditingLayout}
                              panelId="processing-records-toolbar"
                              onMouseDown={handleButtonMouseDown}
                              onStyleEdit={handleStyleEdit}
                              onClick={handleWorkbenchButtonClick} />
                          )}
                        </div>
                      </EditableContentBlock>
                      <EditableContentBlock
                        blockId="processing-records-list"


                        panelId="processing-panel"


                        isEditing={isEditingLayout}


                        position={contentBlockPositions['processing-records-list']}


                        onPositionChange={(newPos) =>


                          setContentBlockPositions((prev) => ({ ...prev, 'processing-records-list': newPos }))


                        }>





                        <div className="sections history-scroll" style={{ height: '100%', overflow: 'auto' }}>

                          {/* 沉淀集列表模式 */}
                          {depositViewMode === 'groups' && renderDepositGroupsList()}
                          {depositViewMode === 'groups' && renderSelectedDepositGroupPanel()}

                          {/* 沉淀列表模式 */}
                          {depositViewMode === 'deposits' && deposits.length === 0 &&

                            <p className="hint" style={{ padding: '20px', textAlign: 'center' }}>{UI_TEXT.t63}</p>

                          }

                          {depositViewMode === 'deposits' && deposits.length > 0 &&

                            <>

                              {deposits.map((dep, idx) => {

                                const orderKey = `${dep.id}||order`;


                                const orderEditing = depositEditing[orderKey] !== undefined;


                                const depositStatus = getDepositReplayStatus(dep);


                                const depositReason = getDepositReplayReason(dep);


                                const statusClass = depositStatus ? depositStatus.replace(' ', '-') : '';


                                return (


                                  <div


                                    key={dep.id}


                                    className="section"


                                    onDragOver={handleDepositDragOver(dep.id)}


                                    onDrop={handleDepositDrop(dep.id)}


                                    style={dragOverDepositId === dep.id ? { outline: '2px dashed #3b82f6', outlineOffset: 2 } : undefined}>





                                    <div className="section-head" style={{ justifyContent: 'space-between', alignItems: 'center' }}>


                                      <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'nowrap', flex: 1, minWidth: 0 }}>


                                        <label className="inline-check" style={{ gap: 6 }}>


                                          <input


                                            type="checkbox"


                                            checked={!!selectedDepositIds?.[dep.id]}


                                            onChange={(e) => toggleDepositSelected(dep.id, e.target.checked)} />





                                        </label>


                                        <button


                                          className="icon-btn tiny deposit-drag-handle"


                                          type="button"


                                          draggable


                                          onDragStart={handleDepositDragStart(dep.id)}


                                          onDragEnd={handleDepositDragEnd}


                                          title={UI_TEXT.t64}>





                                          <GripVertical size={12} />


                                        </button>


                                        {orderEditing ?


                                          <input


                                            className="deposit-order-input"


                                            type="number"


                                            min={1}


                                            max={deposits.length}


                                            value={depositEditing[orderKey]}


                                            onChange={(e) => startEditDeposit(dep.id, 'order', e.target.value)}


                                            onBlur={() => applyDepositOrder(dep.id)}


                                            onKeyDown={(e) => handleDepositOrderKeyDown(e, dep.id)} /> :








                                          <button


                                            className="pill muted deposit-order-pill"


                                            type="button"


                                            onClick={() => startEditDepositOrder(dep.id, idx + 1)}


                                            title={UI_TEXT.t65}>





                                            {idx + 1}


                                          </button>


                                        }


                                        <span className="deposit-name">{dep.name || UI_TEXT.t144}</span>


                                      </div>


                                      <div className="section-actions" style={{ gap: 6 }}>


                                        {depositStatus ?


                                          <span


                                            className={`status ${statusClass}`}


                                            title={depositReason || UI_TEXT.t122}>





                                            {depositStatus}


                                          </span> :


                                          null}


                                        {renderDepositModeSelect(dep)}


                                        <button


                                          className="ghost xsmall"


                                          type="button"


                                          onClick={() => void replayDeposit(dep.id)}


                                          disabled={!!replayState?.[dep.id]?.running}>





                                          Replay


                                        </button>


                                        <button className="ghost xsmall" type="button" onClick={() => deleteDepositsByIds([dep.id])}>{UI_TEXT.t25}





                                        </button>


                                        <button


                                          className="ghost xsmall"


                                          type="button"


                                          onClick={() => setExpandedLogs((prev) => ({ ...prev, [dep.id]: !prev[dep.id] }))}>





                                          {expandedLogs[dep.id] ? UI_TEXT.t142 : UI_TEXT.t143}


                                        </button>


                                      </div>


                                    </div>


                                    {depositStatus && depositStatus !== 'done' && depositReason ?


                                      <div className="hint" style={{ marginTop: 6, color: '#92400e' }}>{UI_TEXT.t70}


                                        {depositReason}


                                      </div> :


                                      null}


                                    {expandedLogs[dep.id] &&


                                      <div className="sections" style={{ gap: 6, marginTop: '8px' }}>


                                        {(dep.sections || []).length === 0 && <div className="hint">{UI_TEXT.t71}</div>}


                                        {(dep.sections || []).map((s, i) => {


                                          const actionKey = `${dep.id}||${s.id}||action`;


                                          const execKey = `${dep.id}||${s.id}||exec`;


                                          const summaryKey = `${dep.id}||${s.id}||summary`;


                                          const locationKey = `${dep.id}||${s.id}||location`;


                                          const reqInputKey = `${dep.id}||${s.id}||req_input`;


                                          const reqExecKey = `${dep.id}||${s.id}||req_exec`;


                                          const reqSummaryKey = `${dep.id}||${s.id}||req_summary`;


                                          const reqLocationKey = `${dep.id}||${s.id}||req_location`;


                                          const editing =


                                            depositEditing[actionKey] !== undefined ||


                                            depositEditing[execKey] !== undefined ||


                                            depositEditing[summaryKey] !== undefined ||


                                            depositEditing[locationKey] !== undefined;


                                          const parsed = parseDepositSectionContent(s?.content || '');


                                          const requirements = getSectionRequirements(s);


                                          const sectionMeta = extractReplayMeta(s?.content || '');


                                          const canFlexUpload =


                                            !editing &&


                                            sectionMeta?.type === 'add_doc' && (


                                              sectionMeta?.source === 'upload' || (s?.content || '').toString().includes(UI_TEXT.t162));


                                          const replay = replayState?.[dep.id]?.bySection?.[s.id];


                                          const compiling = !!compilingDepositSections[`${dep.id}||${s.id}`];


                                          const expanded = editing ? true : isDepositSectionExpanded(dep.id, s.id);


                                          return (


                                            <div key={s.id} className="section" style={{ background: '#fff' }}>


                                              <div className="section-head" style={{ justifyContent: 'space-between', alignItems: 'center' }}>


                                                <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'nowrap', flex: 1, minWidth: 0 }}>


                                                  <span className="pill muted">{i + 1}</span>


                                                  {editing ?


                                                    <>


                                                      <span className="hint">{UI_TEXT.t72}</span>


                                                      <input


                                                        value={depositEditing[actionKey] ?? s.action ?? ''}


                                                        onChange={(e) => startEditDeposit(dep.id, `${s.id}||action`, e.target.value)}


                                                        onKeyDown={(e) => handleDepositSectionKeyDown(e, dep.id, s.id)}


                                                        style={{ minWidth: 180 }} />





                                                    </> :





                                                    <span className="section-action-name">{s.action || UI_TEXT.t123}</span>


                                                  }


                                                  {replay?.status ?


                                                    <span className={`status ${replay.status}`} title={replay.message || ''}>


                                                      {replay.status}


                                                    </span> :


                                                    null}


                                                </div>


                                                <div className="section-actions" style={{ gap: 6 }}>


                                                  {canFlexUpload ?


                                                    <button className="ghost xsmall" type="button" onClick={() => void flexEditUploadDepositSection(dep.id, s)}>{UI_TEXT.t73}





                                                    </button> :


                                                    null}


                                                  {editing ?


                                                    <>


                                                      <button


                                                        className="ghost xsmall"


                                                        type="button"


                                                        onClick={() => void applyDepositSection(dep.id, s.id)}


                                                        disabled={compiling}>





                                                        {compiling ? UI_TEXT.t124 : UI_TEXT.t125}


                                                      </button>


                                                      <button className="ghost xsmall" type="button" onClick={() => cancelEditDepositSection(dep.id, s.id)}>


                                                        {UI_TEXT.t22}


                                                      </button>


                                                    </> :





                                                    <button className="ghost xsmall" type="button" onClick={() => startEditDepositSection(dep.id, s)}>{UI_TEXT.t41}





                                                    </button>


                                                  }


                                                  <button className="ghost xsmall" type="button" onClick={() => toggleDepositSectionExpanded(dep.id, s.id)}>


                                                    {expanded ? UI_TEXT.t142 : UI_TEXT.t143}


                                                  </button>


                                                  <button className="ghost xsmall" type="button" onClick={() => deleteDepositSection(dep.id, s.id)}>{UI_TEXT.t25}





                                                  </button>


                                                </div>


                                              </div>


                                              {expanded ?


                                                editing ?


                                                  <div className="section" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px', borderRadius: 8 }}>


                                                    <div style={{ display: 'grid', gap: 8 }}>


                                                      <label style={{ display: 'grid', gap: 4 }}>


                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>


                                                          <span className="hint">{UI_TEXT.t74}</span>


                                                          <select


                                                            value={depositEditing[reqInputKey] ?? requirements.inputSource}


                                                            onChange={(e) => startEditDeposit(dep.id, `${s.id}||req_input`, e.target.value)}>





                                                            <option value="required">{UI_TEXT.t75}</option>


                                                            <option value="optional">{UI_TEXT.t76}</option>


                                                          </select>


                                                        </div>


                                                        <div className="hint" style={{ whiteSpace: 'pre-wrap' }}>


                                                          {(parsed.inputLine || '').replace(INPUT_SOURCE_PREFIX_RE, '') || UI_TEXT.t126}


                                                        </div>


                                                      </label>


                                                      <label style={{ display: 'grid', gap: 4 }}>


                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>


                                                          <span className="hint">{UI_TEXT.t94}</span>


                                                          <select


                                                            value={depositEditing[reqExecKey] ?? requirements.actionExecution}


                                                            onChange={(e) => startEditDeposit(dep.id, `${s.id}||req_exec`, e.target.value)}>





                                                            <option value="required">{UI_TEXT.t75}</option>


                                                            <option value="optional">{UI_TEXT.t76}</option>


                                                          </select>


                                                        </div>


                                                        <input


                                                          value={depositEditing[execKey] ?? ''}


                                                          onChange={(e) => startEditDeposit(dep.id, `${s.id}||exec`, e.target.value)}


                                                          onKeyDown={(e) => handleDepositSectionKeyDown(e, dep.id, s.id)} />





                                                      </label>


                                                      <label style={{ display: 'grid', gap: 4 }}>


                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>


                                                          <span className="hint">{UI_TEXT.t77}</span>


                                                          <select


                                                            value={depositEditing[reqSummaryKey] ?? requirements.executionSummary}


                                                            onChange={(e) => startEditDeposit(dep.id, `${s.id}||req_summary`, e.target.value)}>





                                                            <option value="required">{UI_TEXT.t75}</option>


                                                            <option value="optional">{UI_TEXT.t76}</option>


                                                          </select>


                                                        </div>


                                                        <textarea


                                                          rows={3}


                                                          value={depositEditing[summaryKey] ?? ''}


                                                          onChange={(e) => startEditDeposit(dep.id, `${s.id}||summary`, e.target.value)}


                                                          onKeyDown={(e) => handleDepositSectionKeyDown(e, dep.id, s.id)} />





                                                      </label>


                                                      <label style={{ display: 'grid', gap: 4 }}>


                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>


                                                          <span className="hint">{UI_TEXT.t78}</span>


                                                          <select


                                                            value={depositEditing[reqLocationKey] ?? requirements.recordLocation}


                                                            onChange={(e) => startEditDeposit(dep.id, `${s.id}||req_location`, e.target.value)}>





                                                            <option value="required">{UI_TEXT.t75}</option>


                                                            <option value="optional">{UI_TEXT.t76}</option>


                                                          </select>


                                                        </div>


                                                        <input


                                                          value={depositEditing[locationKey] ?? ''}


                                                          onChange={(e) => startEditDeposit(dep.id, `${s.id}||location`, e.target.value)}


                                                          onKeyDown={(e) => handleDepositSectionKeyDown(e, dep.id, s.id)} />





                                                      </label>


                                                      <div className="hint">{UI_TEXT.t79}</div>


                                                    </div>


                                                  </div> :





                                                  <>


                                                    {/* 显示大模型记录（如果有） - 完整信息 */}
                                    {s.llmScript && (
                                      <div style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', border: '1px solid #7dd3fc', borderRadius: 6, padding: 8, marginBottom: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                          <span style={{ background: '#0ea5e9', color: '#fff', fontSize: 11, padding: '2px 6px', borderRadius: 4 }}>🤖 大模型记录</span>
                                          {s.llmScript.title && <span style={{ fontWeight: 500, color: '#0369a1' }}>{s.llmScript.title}</span>}
                                        </div>
                                        {s.llmScript.type && <div style={{ fontSize: 12, color: '#0c4a6e' }}>类型: {s.llmScript.type}</div>}
                                        {s.llmScript.description && <div style={{ fontSize: 12, color: '#0c4a6e' }}>描述: {s.llmScript.description}</div>}
                                        {(s.llmScript.instructions || s.llmScript.promptContent) && <div style={{ fontSize: 12, color: '#0c4a6e' }}>指令内容: {s.llmScript.instructions || s.llmScript.promptContent}</div>}
                                        {s.llmScript.inputSourceDesc && <div style={{ fontSize: 12, color: '#0c4a6e' }}>输入来源: {s.llmScript.inputSourceDesc}</div>}
                                        {s.llmScript.inputContentExcerpt && <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>【参考】录制时输入: {s.llmScript.inputContentExcerpt.length > 80 ? s.llmScript.inputContentExcerpt.substring(0, 80) + '...' : s.llmScript.inputContentExcerpt}</div>}
                                        {s.llmScript.targetTitle && <div style={{ fontSize: 12, color: '#0c4a6e' }}>目标标题: {s.llmScript.targetTitle}</div>}
                                        {s.llmScript.outputTargetDesc && <div style={{ fontSize: 12, color: '#0c4a6e' }}>输出目标: {s.llmScript.outputTargetDesc}</div>}
                                        {s.llmScript.outputs?.outputContent && <div style={{ fontSize: 12, color: '#0c4a6e' }}>输出内容: {s.llmScript.outputs.outputContent.length > 100 ? s.llmScript.outputs.outputContent.substring(0, 100) + '...' : s.llmScript.outputs.outputContent}</div>}
                                        {s.llmScript.aiGuidance && <div style={{ fontSize: 12, color: '#0c4a6e', fontStyle: 'italic' }}>AI指导: {s.llmScript.aiGuidance}</div>}
                                      </div>
                                    )}
                                    {/* 显示脚本记录 */}
                                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 8 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                        <span style={{ background: '#64748b', color: '#fff', fontSize: 11, padding: '2px 6px', borderRadius: 4 }}>📜 脚本记录</span>
                                      </div>
                                      <div className="hint" style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{s.content || s.originalScript?.content || UI_TEXT.t128}</div>
                                    </div>


                                                    {replay?.status && replay.status !== 'done' ?


                                                      <div


                                                        className="hint"


                                                        style={{ whiteSpace: 'pre-wrap', color: replay.status === 'fail' ? '#b91c1c' : '#92400e' }}>





                                                        {replay.message || UI_TEXT.t129}


                                                      </div> :


                                                      null}


                                                  </> :





                                                null}


                                            </div>);





                                        })}


                                      </div>


                                    }


                                  </div>);





                              })}


                            </>


                          }


                        </div>


                      </EditableContentBlock>


                    </>


                  }


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


                }>





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
                /> */









































                }


                <EditableContentBlock


                  blockId="operations-content"


                  panelId="operations-panel"


                  isEditing={isEditingLayout}


                  position={contentBlockPositions['operations-panel']}


                  onPositionChange={(newPos) =>


                    setContentBlockPositions((prev) => ({ ...prev, 'operations-panel': newPos }))


                  }


                  hidden={deletedBlocks.includes('operations-panel')}


                  onDelete={() => handleDeleteBlock('operations-panel')}>





                  <div className="card">


                    <div className="card-head">


                      <div className="actions" style={{ gap: '6px' }}>


                        {!showOutlineMode ?


                          <>


                            <button


                              type="button"


                              className={`ghost small ${dispatchMode === 'doc' ? 'active' : ''}`}


                              onClick={() => setDispatchMode('doc')}>





                              <FileText size={14} />{UI_TEXT.t95}


                            </button>


                            <button


                              type="button"


                              className={`ghost small ${dispatchMode === 'result' ? 'active' : ''}`}


                              onClick={() => setDispatchMode('result')}>





                              <Sparkles size={14} />{UI_TEXT.t96}


                            </button>


                          </> :





                          <button


                            type="button"


                            className={`ghost small ${dispatchMode === 'batch_outline' ? 'active' : ''}`}


                            onClick={() => setDispatchMode('batch_outline')}>





                            <Edit3 size={14} />{UI_TEXT.t97}


                          </button>


                        }


                      </div>


                    </div>


                    <textarea


                      ref={dispatchInputRef}


                      className="dispatch-input"


                      rows={1}


                      placeholder={UI_TEXT.t98}>


                    </textarea>


                    {dispatchButtonCfg?.enabled ?


                      <button className="ghost" onClick={runDispatch} disabled={dispatching || loading}>


                        <Play size={16} /> {(dispatchButtonCfg.label || UI_TEXT.t145).toString()}


                      </button> :





                      <div className="hint">{UI_TEXT.t99}</div>


                    }


                  </div>


                </EditableContentBlock>


              </EditableLayoutPanel>


              <GlobalButtonsContainer


                buttons={globalButtons.filter((b) => b.kind !== 'outline_extract' && b.kind !== 'upload_file' && b.kind !== 'fill_summary')}


                isEditing={isEditingLayout}


                onMouseDown={handleGlobalButtonMouseDown}


                onStyleEdit={handleGlobalButtonStyleEdit}


                onClick={(btn) => {


                  if (btn.action === 'run_block') runOutlineBlock(btn.targetId);


                  if (btn.action === 'toggle_section') toggleSection(btn.targetId);


                  if (btn.kind === 'dispatch') runDispatch();


                  if (btn.kind === 'final_generate') runFinalGenerate();


                }}


                onDelete={handleDeleteButton} />





            </div>


          </LayoutEditContainer> :





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


              headerActions={


                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>


                  {globalButtons.find((b) => b.kind === 'upload_file')?.enabled !== false &&


                    <button


                      type="button"


                      onClick={() => {


                        console.log('Upload button clicked', uploadInputRef.current);


                        uploadInputRef.current?.click();


                      }}


                      title={globalButtons.find((b) => b.kind === 'upload_file')?.label || UI_TEXT.t146}


                      style={{ pointerEvents: 'auto', backgroundColor: '#ffffff', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 12px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', height: '32px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>





                      <Upload size={14} /> {globalButtons.find((b) => b.kind === 'upload_file')?.label || UI_TEXT.t146}


                    </button>


                  }


                  <button


                    type="button"


                    onClick={() => void clearAllDocs()}


                    disabled={docs.length === 0}


                    title={UI_TEXT.t100}


                    style={{ pointerEvents: 'auto', backgroundColor: '#ffffff', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 12px', fontSize: '14px', fontWeight: 500, cursor: docs.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', height: '32px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', opacity: docs.length === 0 ? 0.6 : 1 }}>{UI_TEXT.t92}








                  </button>


                </div>


              }>





              <div style={{ position: 'relative', width: '100%', height: '100%' }}>


                <EditableContentBlock


                  blockId="document-list-content"


                  panelId="document-list-panel"


                  isEditing={false}


                  position={contentBlockPositions['document-list-panel']}


                  onPositionChange={() => { }}


                  hidden={deletedBlocks.includes('document-list-panel')}>





                  <DocumentListPanelContent
                    docs={docs}
                    selectedDocId={selectedDocId}
                    setSelectedDocId={setSelectedDocId}
                    deleteDoc={deleteDoc}
                    uploadInputRef={uploadInputRef}
                    handleFilePick={handleFilePick}
                    replayDirConfig={replayDirConfig}
                    setReplayDirConfig={setReplayDirConfig}
                    saveReplayDirConfig={saveReplayDirConfig}
                    replayDirConfigSaving={replayDirConfigSaving} />





                </EditableContentBlock>





                <EditableContentBlock


                  blockId="document-replay-ui"


                  panelId="document-list-panel"


                  isEditing={false}


                  position={contentBlockPositions['document-replay-ui']}


                  onPositionChange={() => { }}


                  hidden={deletedBlocks.includes('document-replay-ui')}>





                  <ReplayDirectoryPanelContent


                    replayDirName={replayDirName}


                    pickReplayDirectory={pickReplayDirectory}


                    clearReplayDirectory={clearReplayDirectory}


                    replayDirHandle={replayDirHandle} />





                </EditableContentBlock>


                {/* 旧按钮系统已移除 */}


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


              onPositionChange={() => { }}>








              <div style={{ position: 'relative', width: '100%', height: '100%' }}>





                <EditableContentBlock


                  blockId="preview-textarea"


                  panelId="preview-panel"


                  isEditing={false}


                  position={contentBlockPositions['preview-textarea']}


                  onPositionChange={() => { }}


                  hidden={deletedBlocks.includes('preview-textarea')}>





                  <div className="card" style={{ width: '100%', height: '100%', padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>


                    <div style={{ position: 'absolute', top: 8, right: 24, zIndex: 10 }}>


                      <button


                        type="button"


                        onClick={insertSelectionToCheckedSummaries}


                        style={{ backgroundColor: '#ffffff', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 12px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', height: '32px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>





                        <Copy size={14} />{UI_TEXT.t89}


                      </button>


                    </div>


                    <textarea


                      ref={previewTextRef}


                      className="preview full"


                      value={docDraft}


                      onChange={(e) => setDocDraft(e.target.value)}


                      onMouseUp={updatePreviewSelection}


                      onKeyUp={updatePreviewSelection}


                      onSelect={updatePreviewSelection}


                      onBlur={saveDocDraft}


                      placeholder={UI_TEXT.t90}


                      style={{ border: 'none', width: '100%', height: '100%', resize: 'none', padding: '48px 12px 12px', boxSizing: 'border-box' }} />





                  </div>


                </EditableContentBlock>


                {/* 旧按钮系统已移除 */}




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


              onPositionChange={() => { }}>





              <div style={{ position: 'relative', width: '100%', height: '100%' }}>


                <EditableContentBlock


                  blockId="processing-tabs"


                  panelId="processing-panel"


                  isEditing={false}


                  position={contentBlockPositions['processing-tabs']}


                  onPositionChange={() => { }}


                  allowChildPointerEvents>





                  <div className="editable-button-group processing-tabs-bar">


                    {getProcessingTabButtons().map((btn) =>


                      <EditableButton


                        key={btn.id}


                        button={btn}


                        isEditing={false}


                        panelId="processing-tabs"


                        onMouseDown={handleButtonMouseDown}


                        onStyleEdit={handleStyleEdit}


                        onClick={handleWorkbenchButtonClick} />





                    )}


                    {renderProcessingTabArrows()}


                  </div>


                </EditableContentBlock>


                {processingTab !== 'records' &&


                  <EditableContentBlock


                    blockId="processing-content"


                    panelId="processing-panel"


                    isEditing={false}


                    position={contentBlockPositions['processing-panel']}


                    onPositionChange={() => { }}


                    hidden={deletedBlocks.includes('processing-panel')}>





                    <div


                      style={{


                        fontSize: '12px',


                        color: '#666',


                        minHeight: '100%',


                        boxSizing: 'border-box',


                        display: 'flex',


                        flexDirection: 'column'


                      }}>





                      {/* 内容区域 */}


                      <div style={{ padding: '0 12px 12px', overflowY: 'auto', flex: 1 }}>


                        {processingTab === 'outline' &&


                          <div>





                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>


                              <button


                                onClick={handleOpenHistory}


                                style={{ backgroundColor: '#ffffff', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 12px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', height: '32px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>





                                <History size={14} />{UI_TEXT.t101}


                              </button>





                              <div style={{ display: 'flex', gap: '8px' }}>


                                {globalButtons.


                                  filter((b) => b.kind === 'outline_extract' && b.enabled !== false).


                                  slice(0, 1) // Force single button
                                  .

                                  map((btn) =>


                                    <button


                                      key={btn.id}


                                      onClick={() => autoTemplate(btn)}


                                      title={btn.prompt ? `Prompt: ${btn.prompt.slice(0, 50)}...` : UI_TEXT.t147}


                                      style={{ backgroundColor: '#ffffff', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 12px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', height: '32px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>





                                      {btn.label}


                                    </button>


                                  )


                                }


                                <button


                                  onClick={clearOutlineTemplate}


                                  style={{ backgroundColor: '#ffffff', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 12px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', height: '32px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>{UI_TEXT.t92}








                                </button>





                                <button


                                  onClick={() => setShowDocPreviewModal(true)}


                                  disabled={!template?.sections?.length}


                                  style={{ backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', height: '32px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', opacity: template?.sections?.length ? 1 : 0.5 }}>{UI_TEXT.t91}








                                </button>


                              </div>


                            </div>


                            {!template || !template.sections || template.sections.length === 0 ?


                              <p style={{ fontSize: '13px', color: '#94a3b8', padding: '20px', textAlign: 'center' }}>{UI_TEXT.t93}</p> :





                              template.sections.map((sec, idx) => renderOutlineNode({ section: sec, index: idx }))


                            }


                          </div>


                        }


                        {processingTab === 'config' && renderAppButtonsConfigPanel()}


                        {processingTab === 'strategy' &&


                          <div style={{ height: '100%', overflow: 'auto' }}>


                            <div style={{ padding: '12px', borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>


                              <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600 }}>{UI_TEXT.t138}</h4>


                              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{UI_TEXT.t139}</p>


                            </div>


                            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>





                              {/* 模块1: 用户行为采集配置 */}


                              <div className="card" style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', background: '#fff' }}>


                                <h5 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600, borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', color: '#334155' }}>{UI_TEXT.t102}</h5>


                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>


                                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', color: '#475569', cursor: 'pointer' }}>


                                    <span>{UI_TEXT.t103}</span>


                                    <input type="checkbox" defaultChecked style={{ width: '16px', height: '16px' }} />


                                  </label>


                                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', color: '#475569' }}>


                                    <span>{UI_TEXT.t104}</span>


                                    <input type="number" defaultValue={5} style={{ width: '80px', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }} />


                                  </label>


                                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', color: '#475569' }}>


                                    <span>{UI_TEXT.t105}</span>


                                    <input type="number" defaultValue={100} style={{ width: '80px', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }} />


                                  </label>


                                </div>


                              </div>








                              <div className="card" style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', background: '#fff' }}>


                                <h5 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600, borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', color: '#334155' }}>{UI_TEXT.t140}</h5>


                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>


                                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', color: '#475569', cursor: 'pointer' }}>


                                    <span>{UI_TEXT.t106}</span>


                                    <input type="checkbox" defaultChecked style={{ width: '16px', height: '16px' }} />


                                  </label>


                                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', color: '#475569' }}>


                                    <span>{UI_TEXT.t107}</span>


                                    <select style={{ width: '80px', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', background: '#fff' }}>


                                      <option></option>


                                      <option></option>


                                      <option></option>


                                    </select>


                                  </label>


                                </div>


                              </div>








                              <div className="card" style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', background: '#fff' }}>


                                <h5 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600, borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', color: '#334155' }}>{UI_TEXT.t108}</h5>


                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>


                                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', color: '#475569', cursor: 'pointer' }}>


                                    <span>{UI_TEXT.t109}</span>


                                    <input type="checkbox" style={{ width: '16px', height: '16px' }} />


                                  </label>


                                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', color: '#475569' }}>


                                    <span>{UI_TEXT.t110}</span>


                                    <input type="number" defaultValue={10} style={{ width: '80px', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }} />


                                  </label>


                                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', color: '#475569' }}>


                                    <span>{UI_TEXT.t137}</span>


                                    <input type="number" defaultValue={0.8} step={0.1} style={{ width: '80px', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }} />


                                  </label>


                                </div>


                              </div>





                            </div>


                          </div>


                        }


                      </div>


                    </div>


                  </EditableContentBlock>


                }


                {processingTab === 'records' &&


                  <>


                    <EditableContentBlock


                      blockId="processing-records-toolbar"


                      panelId="processing-panel"


                      isEditing={false}


                      position={{ ...contentBlockPositions['processing-records-toolbar'], height: 70 }}


                      onPositionChange={() => { }}


                      allowChildPointerEvents>





                      {/* 沉淀列表/沉淀集列表切换标签 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                        <button
                          type="button"
                          className={`ghost small ${depositViewMode === 'deposits' ? 'active' : ''}`}
                          onClick={() => setDepositViewMode('deposits')}
                          style={{ padding: '6px 16px', fontSize: '15px', fontWeight: 600, whiteSpace: 'nowrap' }}
                        >{UI_TEXT.t61}</button>
                        <button
                          type="button"
                          className={`ghost small ${depositViewMode === 'groups' ? 'active' : ''}`}
                          onClick={() => setDepositViewMode('groups')}
                          style={{ padding: '6px 16px', fontSize: '15px', fontWeight: 600, whiteSpace: 'nowrap' }}
                        >{UI_TEXT.t62}</button>
                      </div>
                      {/* 功能按钮栏 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 0', borderBottom: '1px solid #e5e7eb', marginBottom: '4px', flexWrap: 'nowrap', overflowX: 'auto', minHeight: '32px' }}>
                        {depositViewMode === 'deposits' && getRecordsToolbarButtons(RECORD_TOOLBAR_DEPOSIT_KINDS).map((btn) =>
                          <EditableButton
                            key={btn.id}
                            button={btn}
                            isEditing={false}
                            panelId="processing-records-toolbar"
                            onMouseDown={handleButtonMouseDown}
                            onStyleEdit={handleStyleEdit}
                            onClick={handleWorkbenchButtonClick} />
                        )}
                        {depositViewMode === 'groups' && getRecordsToolbarButtons(RECORD_TOOLBAR_GROUP_KINDS).map((btn) =>
                          <EditableButton
                            key={btn.id}
                            button={btn}
                            isEditing={false}
                            panelId="processing-records-toolbar"
                            onMouseDown={handleButtonMouseDown}
                            onStyleEdit={handleStyleEdit}
                            onClick={handleWorkbenchButtonClick} />
                        )}
                      </div>
                    </EditableContentBlock>


                    <EditableContentBlock


                      blockId="processing-records-list"


                      panelId="processing-panel"


                      isEditing={false}


                      position={contentBlockPositions['processing-records-list']}


                      onPositionChange={() => { }}>





                      <div className="sections history-scroll" style={{ height: '100%', overflow: 'auto' }}>
                        {/* 沉淀集列表模式 */}
                        {depositViewMode === 'groups' && renderDepositGroupsList()}
                        {depositViewMode === 'groups' && renderSelectedDepositGroupPanel()}

                        {/* 沉淀列表模式 */}
                        {depositViewMode === 'deposits' && deposits.length === 0 &&
                          <p className="hint" style={{ padding: '20px', textAlign: 'center' }}>{UI_TEXT.t63}</p>
                        }

                        {depositViewMode === 'deposits' && deposits.length > 0 &&

                          <>

                            {deposits.map((dep, idx) => {

                              const orderKey = `${dep.id}||order`;


                              const orderEditing = depositEditing[orderKey] !== undefined;


                              const depositStatus = getDepositReplayStatus(dep);


                              const depositReason = getDepositReplayReason(dep);


                              const statusClass = depositStatus ? depositStatus.replace(' ', '-') : '';


                              return (


                                <div


                                  key={dep.id}


                                  className="section"


                                  onDragOver={handleDepositDragOver(dep.id)}


                                  onDrop={handleDepositDrop(dep.id)}


                                  style={dragOverDepositId === dep.id ? { outline: '2px dashed #3b82f6', outlineOffset: 2 } : undefined}>





                                  <div className="section-head" style={{ justifyContent: 'space-between', alignItems: 'center' }}>


                                    <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'nowrap', flex: 1, minWidth: 0 }}>


                                      <label className="inline-check" style={{ gap: 6 }}>


                                        <input


                                          type="checkbox"


                                          checked={!!selectedDepositIds?.[dep.id]}


                                          onChange={(e) => toggleDepositSelected(dep.id, e.target.checked)} />





                                      </label>


                                      <button


                                        className="icon-btn tiny deposit-drag-handle"


                                        type="button"


                                        draggable


                                        onDragStart={handleDepositDragStart(dep.id)}


                                        onDragEnd={handleDepositDragEnd}


                                        title={UI_TEXT.t64}>





                                        <GripVertical size={12} />


                                      </button>


                                      {orderEditing ?


                                        <input


                                          className="deposit-order-input"


                                          type="number"


                                          min={1}


                                          max={deposits.length}


                                          value={depositEditing[orderKey]}


                                          onChange={(e) => startEditDeposit(dep.id, 'order', e.target.value)}


                                          onBlur={() => applyDepositOrder(dep.id)}


                                          onKeyDown={(e) => handleDepositOrderKeyDown(e, dep.id)} /> :








                                        <button


                                          className="pill muted deposit-order-pill"


                                          type="button"


                                          onClick={() => startEditDepositOrder(dep.id, idx + 1)}


                                          title={UI_TEXT.t65}>





                                          {idx + 1}


                                        </button>


                                      }





                                      {/* Editable Deposit Name */}


                                      {depositEditing[`${dep.id}||name`] !== undefined ?


                                        <input


                                          className="deposit-name-input"


                                          value={depositEditing[`${dep.id}||name`]}


                                          onChange={(e) => startEditDeposit(dep.id, 'name', e.target.value)}


                                          onBlur={() => void applyDepositName(dep.id)}


                                          onKeyDown={(e) => handleDepositNameKeyDown(e, dep.id)}


                                          autoFocus


                                          onClick={(e) => e.stopPropagation()}


                                          style={{ border: '1px solid #1a73e8', padding: '2px 6px', borderRadius: '4px', fontSize: '16px', width: '200px' }} /> :








                                        <span


                                          className="deposit-name"


                                          onDoubleClick={(e) => { e.stopPropagation(); startEditDeposit(dep.id, 'name', dep.name || dep.id); }}


                                          title={UI_TEXT.t120}


                                          style={{ cursor: 'text', fontWeight: 500 }}>





                                          {dep.name || UI_TEXT.t144}


                                        </span>


                                      }


                                      <button


                                        className="icon-btn tiny"


                                        type="button"


                                        onClick={(e) => { e.stopPropagation(); startEditDeposit(dep.id, 'name', dep.name || dep.id); }}


                                        title={UI_TEXT.t67}


                                        style={{ width: 20, height: 20, padding: 2, opacity: 0.5 }}>





                                        <Edit3 size={12} />


                                      </button>


                                    </div>


                                    <div className="section-actions" style={{ gap: 6 }}>


                                      {depositStatus ?


                                        <span


                                          className={`status ${statusClass}`}


                                          title={depositReason || UI_TEXT.t122}>





                                          {depositStatus}


                                        </span> :


                                        null}


                                      {renderDepositModeSelect(dep)}


                                      <button


                                        className="ghost xsmall"


                                        type="button"


                                        onClick={() => void replayDeposit(dep.id)}


                                        disabled={!!replayState?.[dep.id]?.running}>





                                        Replay


                                      </button>


                                      <button className="ghost xsmall" type="button" onClick={() => deleteDepositsByIds([dep.id])}>{UI_TEXT.t25}





                                      </button>


                                      <button


                                        className="ghost xsmall"


                                        type="button"


                                        onClick={() => setExpandedLogs((prev) => ({ ...prev, [dep.id]: !prev[dep.id] }))}>





                                        {expandedLogs[dep.id] ? UI_TEXT.t142 : UI_TEXT.t143}


                                      </button>


                                    </div>


                                  </div>


                                  {depositStatus && depositStatus !== 'done' && depositReason ?


                                    <div className="hint" style={{ marginTop: 6, color: '#92400e' }}>{UI_TEXT.t70}


                                      {depositReason}


                                    </div> :


                                    null}


                                  {expandedLogs[dep.id] &&


                                    <div className="sections" style={{ gap: 6, marginTop: '8px' }}>


                                      {(dep.sections || []).length === 0 && <div className="hint">{UI_TEXT.t71}</div>}


                                      {(dep.sections || []).map((s, i) => {


                                        const actionKey = `${dep.id}||${s.id}||action`;


                                        const execKey = `${dep.id}||${s.id}||exec`;


                                        const summaryKey = `${dep.id}||${s.id}||summary`;


                                        const locationKey = `${dep.id}||${s.id}||location`;


                                        const reqInputKey = `${dep.id}||${s.id}||req_input`;


                                        const reqExecKey = `${dep.id}||${s.id}||req_exec`;


                                        const reqSummaryKey = `${dep.id}||${s.id}||req_summary`;


                                        const reqLocationKey = `${dep.id}||${s.id}||req_location`;


                                        const editing =


                                          depositEditing[actionKey] !== undefined ||


                                          depositEditing[execKey] !== undefined ||


                                          depositEditing[summaryKey] !== undefined ||


                                          depositEditing[locationKey] !== undefined;


                                        const parsed = parseDepositSectionContent(s?.content || '');


                                        const requirements = getSectionRequirements(s);


                                        const sectionMeta = extractReplayMeta(s?.content || '');


                                        const canFlexUpload =


                                          !editing &&


                                          sectionMeta?.type === 'add_doc' && (


                                            sectionMeta?.source === 'upload' || (s?.content || '').toString().includes(UI_TEXT.t162));


                                        const replay = replayState?.[dep.id]?.bySection?.[s.id];


                                        const compiling = !!compilingDepositSections[`${dep.id}||${s.id}`];


                                        const expanded = editing ? true : isDepositSectionExpanded(dep.id, s.id);


                                        return (


                                          <div key={s.id} className="section" style={{ background: '#fff' }}>


                                            <div className="section-head" style={{ justifyContent: 'space-between', alignItems: 'center' }}>


                                              <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'nowrap', flex: 1, minWidth: 0 }}>


                                                <span className="pill muted">{i + 1}</span>


                                                {editing ?


                                                  <>


                                                    <span className="hint">{UI_TEXT.t72}</span>


                                                    <input


                                                      value={depositEditing[actionKey] ?? s.action ?? ''}


                                                      onChange={(e) => startEditDeposit(dep.id, `${s.id}||action`, e.target.value)}


                                                      onKeyDown={(e) => handleDepositSectionKeyDown(e, dep.id, s.id)}


                                                      style={{ minWidth: 180 }} />





                                                  </> :





                                                  <span className="section-action-name">{s.action || UI_TEXT.t123}</span>


                                                }


                                                {replay?.status ?


                                                  <span className={`status ${replay.status}`} title={replay.message || ''}>


                                                    {replay.status}


                                                  </span> :


                                                  null}


                                              </div>


                                              <div className="section-actions" style={{ gap: 6 }}>


                                                {canFlexUpload ?


                                                  <button className="ghost xsmall" type="button" onClick={() => void flexEditUploadDepositSection(dep.id, s)}>{UI_TEXT.t73}





                                                  </button> :


                                                  null}


                                                {editing ?


                                                  <>


                                                    <button


                                                      className="ghost xsmall"


                                                      type="button"


                                                      onClick={() => void applyDepositSection(dep.id, s.id)}


                                                      disabled={compiling}>





                                                      {compiling ? UI_TEXT.t124 : UI_TEXT.t125}


                                                    </button>


                                                    <button className="ghost xsmall" type="button" onClick={() => cancelEditDepositSection(dep.id, s.id)}>


                                                      {UI_TEXT.t22}


                                                    </button>


                                                  </> :





                                                  <button className="ghost xsmall" type="button" onClick={() => startEditDepositSection(dep.id, s)}>{UI_TEXT.t41}





                                                  </button>


                                                }


                                                <button className="ghost xsmall" type="button" onClick={() => toggleDepositSectionExpanded(dep.id, s.id)}>


                                                  {expanded ? UI_TEXT.t142 : UI_TEXT.t143}


                                                </button>


                                                <button className="ghost xsmall" type="button" onClick={() => deleteDepositSection(dep.id, s.id)}>{UI_TEXT.t25}





                                                </button>


                                              </div>


                                            </div>


                                            {expanded ?


                                              editing ?


                                                <div className="section" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px', borderRadius: 8 }}>


                                                  <div style={{ display: 'grid', gap: 8 }}>


                                                    <label style={{ display: 'grid', gap: 4 }}>


                                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>


                                                        <span className="hint">{UI_TEXT.t74}</span>


                                                        <select


                                                          value={depositEditing[reqInputKey] ?? requirements.inputSource}


                                                          onChange={(e) => startEditDeposit(dep.id, `${s.id}||req_input`, e.target.value)}>





                                                          <option value="required">{UI_TEXT.t75}</option>


                                                          <option value="optional">{UI_TEXT.t76}</option>


                                                        </select>


                                                      </div>


                                                      <div className="hint" style={{ whiteSpace: 'pre-wrap' }}>


                                                        {(parsed.inputLine || '').replace(INPUT_SOURCE_PREFIX_RE, '') || UI_TEXT.t126}


                                                      </div>


                                                    </label>


                                                    <label style={{ display: 'grid', gap: 4 }}>


                                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>


                                                        <span className="hint">{UI_TEXT.t94}</span>


                                                        <select


                                                          value={depositEditing[reqExecKey] ?? requirements.actionExecution}


                                                          onChange={(e) => startEditDeposit(dep.id, `${s.id}||req_exec`, e.target.value)}>





                                                          <option value="required">{UI_TEXT.t75}</option>


                                                          <option value="optional">{UI_TEXT.t76}</option>


                                                        </select>


                                                      </div>


                                                      <input


                                                        value={depositEditing[execKey] ?? ''}


                                                        onChange={(e) => startEditDeposit(dep.id, `${s.id}||exec`, e.target.value)}


                                                        onKeyDown={(e) => handleDepositSectionKeyDown(e, dep.id, s.id)} />





                                                    </label>


                                                    <label style={{ display: 'grid', gap: 4 }}>


                                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>


                                                        <span className="hint">{UI_TEXT.t77}</span>


                                                        <select


                                                          value={depositEditing[reqSummaryKey] ?? requirements.executionSummary}


                                                          onChange={(e) => startEditDeposit(dep.id, `${s.id}||req_summary`, e.target.value)}>





                                                          <option value="required">{UI_TEXT.t75}</option>


                                                          <option value="optional">{UI_TEXT.t76}</option>


                                                        </select>


                                                      </div>


                                                      <textarea


                                                        rows={3}


                                                        value={depositEditing[summaryKey] ?? ''}


                                                        onChange={(e) => startEditDeposit(dep.id, `${s.id}||summary`, e.target.value)}


                                                        onKeyDown={(e) => handleDepositSectionKeyDown(e, dep.id, s.id)} />





                                                    </label>


                                                    <label style={{ display: 'grid', gap: 4 }}>


                                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>


                                                        <span className="hint">{UI_TEXT.t78}</span>


                                                        <select


                                                          value={depositEditing[reqLocationKey] ?? requirements.recordLocation}


                                                          onChange={(e) => startEditDeposit(dep.id, `${s.id}||req_location`, e.target.value)}>





                                                          <option value="required">{UI_TEXT.t75}</option>


                                                          <option value="optional">{UI_TEXT.t76}</option>


                                                        </select>


                                                      </div>


                                                      <input


                                                        value={depositEditing[locationKey] ?? ''}


                                                        onChange={(e) => startEditDeposit(dep.id, `${s.id}||location`, e.target.value)}


                                                        onKeyDown={(e) => handleDepositSectionKeyDown(e, dep.id, s.id)} />





                                                    </label>


                                                    <div className="hint">{UI_TEXT.t79}</div>


                                                  </div>


                                                </div> :





                                                <>


                                                  {/* 显示大模型记录（如果有） - 完整信息 */}
                                    {s.llmScript && (
                                      <div style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', border: '1px solid #7dd3fc', borderRadius: 6, padding: 8, marginBottom: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                          <span style={{ background: '#0ea5e9', color: '#fff', fontSize: 11, padding: '2px 6px', borderRadius: 4 }}>🤖 大模型记录</span>
                                          {s.llmScript.title && <span style={{ fontWeight: 500, color: '#0369a1' }}>{s.llmScript.title}</span>}
                                        </div>
                                        {s.llmScript.type && <div style={{ fontSize: 12, color: '#0c4a6e' }}>类型: {s.llmScript.type}</div>}
                                        {s.llmScript.description && <div style={{ fontSize: 12, color: '#0c4a6e' }}>描述: {s.llmScript.description}</div>}
                                        {(s.llmScript.instructions || s.llmScript.promptContent) && <div style={{ fontSize: 12, color: '#0c4a6e' }}>指令内容: {s.llmScript.instructions || s.llmScript.promptContent}</div>}
                                        {s.llmScript.inputSourceDesc && <div style={{ fontSize: 12, color: '#0c4a6e' }}>输入来源: {s.llmScript.inputSourceDesc}</div>}
                                        {s.llmScript.inputContentExcerpt && <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>【参考】录制时输入: {s.llmScript.inputContentExcerpt.length > 80 ? s.llmScript.inputContentExcerpt.substring(0, 80) + '...' : s.llmScript.inputContentExcerpt}</div>}
                                        {s.llmScript.targetTitle && <div style={{ fontSize: 12, color: '#0c4a6e' }}>目标标题: {s.llmScript.targetTitle}</div>}
                                        {s.llmScript.outputTargetDesc && <div style={{ fontSize: 12, color: '#0c4a6e' }}>输出目标: {s.llmScript.outputTargetDesc}</div>}
                                        {s.llmScript.outputs?.outputContent && <div style={{ fontSize: 12, color: '#0c4a6e' }}>输出内容: {s.llmScript.outputs.outputContent.length > 100 ? s.llmScript.outputs.outputContent.substring(0, 100) + '...' : s.llmScript.outputs.outputContent}</div>}
                                        {s.llmScript.aiGuidance && <div style={{ fontSize: 12, color: '#0c4a6e', fontStyle: 'italic' }}>AI指导: {s.llmScript.aiGuidance}</div>}
                                      </div>
                                    )}
                                    {/* 显示脚本记录 */}
                                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 8 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                        <span style={{ background: '#64748b', color: '#fff', fontSize: 11, padding: '2px 6px', borderRadius: 4 }}>📜 脚本记录</span>
                                      </div>
                                      <div className="hint" style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{s.content || s.originalScript?.content || UI_TEXT.t128}</div>
                                    </div>


                                                  {replay?.status && replay.status !== 'done' ?


                                                    <div


                                                      className="hint"


                                                      style={{ whiteSpace: 'pre-wrap', color: replay.status === 'fail' ? '#b91c1c' : '#92400e' }}>





                                                      {replay.message || UI_TEXT.t129}


                                                    </div> :


                                                    null}


                                                </> :





                                              null}


                                          </div>);





                                      })}


                                    </div>


                                  }


                                </div>);





                            })}


                          </>


                        }


                      </div>


                    </EditableContentBlock>


                  </>


                }


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
                /> */









































                }


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


              onPositionChange={() => { }}>





              <div style={{ position: 'relative', width: '100%', height: '100%' }}>


                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>


                  <textarea


                    ref={dispatchInputRef}


                    className="dispatch-input"


                    rows={1}


                    placeholder={UI_TEXT.t98}>


                  </textarea>


                  {dispatchButtonCfg?.enabled ?


                    <button className="ghost" onClick={runDispatch} disabled={dispatching || loading}>


                      <Play size={16} /> {(dispatchButtonCfg.label || UI_TEXT.t145).toString()}


                    </button> :





                    <div className="hint">{UI_TEXT.t99}</div>


                  }


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
                /> */









































                }


              </div>


            </EditableLayoutPanel>


            <GlobalButtonsContainer


              buttons={globalButtons.filter((b) => b.kind !== 'outline_extract' && b.kind !== 'upload_file' && b.kind !== 'fill_summary')}


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


              onDelete={undefined} />





          </div>





        }








        {


          editingButtonId && (() => {


            // 先尝试作为全局按钮 ID


            const globalButton = globalButtons.find((btn) => btn.id === editingButtonId);





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


                    onClick={() => setEditingButtonId(null)} />





                  <div style={{ position: 'fixed', right: 20, top: 60, zIndex: 10000 }}>


                    <StyleEditor


                      button={globalButton}


                      label={globalButton.label}


                      onStyleChange={handleGlobalButtonStyleUpdate.bind(null, editingButtonId)}


                      onLogicChange={(newConfig) => {


                        handleGlobalButtonStyleUpdate(editingButtonId, {


                          ...globalButton,


                          kind: newConfig.kind,


                          prompt: newConfig.prompt


                        });


                      }}


                      onDelete={() => {


                        if (confirm(UI_TEXT.t148)) {


                          deleteGlobalButton(editingButtonId);


                          setEditingButtonId(null);


                        }


                      }}


                      onClose={() => setEditingButtonId(null)} />





                  </div>


                </>);





            }





            // 如果不是全局按钮，尝试作为旧格式面板按钮


            try {


              const { panelId, buttonId } = JSON.parse(editingButtonId);


              const button = buttonPositions[panelId]?.find((b) => b.id === buttonId);


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


                      onClick={() => setEditingButtonId(null)} />





                    <div style={{ position: 'fixed', right: 20, top: 60, zIndex: 10000 }}>


                      <StyleEditor


                        button={button}


                        label={button.label}


                        onStyleChange={(newStyle) => handleButtonUpdate(panelId, buttonId, newStyle)}


                        onLogicChange={(newConfig) => {


                          handleButtonUpdate(panelId, buttonId, {


                            style: button.style,


                            label: button.label,


                            kind: newConfig.kind,


                            prompt: newConfig.prompt


                          });


                        }}


                        onDelete={() => handleDeleteButton()}


                        onClose={() => setEditingButtonId(null)} />





                    </div>


                  </>);





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


              'input-form-panel': UI_TEXT.t149,


              'document-list-panel': UI_TEXT.t150,


              'processing-panel': UI_TEXT.t151,


              'preview-panel': UI_TEXT.t152,


              'operations-panel': UI_TEXT.t153


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


                  onClick={() => setEditingTitleId(null)} />





                <div style={{ position: 'fixed', right: 20, top: 60, zIndex: 10000 }}>


                  <StyleEditor


                    button={{


                      id: 'title',


                      label: panelPositions[editingTitleId]?.customTitle || panelName,


                      style: currentStyle


                    }}


                    onStyleChange={({ style, label }) => {


                      setPanelPositions((prev) => ({


                        ...prev,


                        [editingTitleId]: {


                          ...prev[editingTitleId],


                          titleStyle: style,


                          customTitle: label // Save custom title text


                        }


                      }));


                    }}


                    onClose={() => setEditingTitleId(null)}


                    onDelete={undefined} // Hide delete for panel title
                  />




                </div>


              </>);





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


                  onClick={() => setEditingHeaderTitle(null)} />





                <div style={{ position: 'fixed', right: 20, top: 60, zIndex: 10000 }}>


                  <StyleEditor


                    button={{


                      id: editingHeaderTitle,


                      label: titleConfig.text,


                      style: titleConfig.style || {}


                    }}


                    onStyleChange={({ style, label }) => {


                      setHeaderTitles((prev) => ({


                        ...prev,


                        [editingHeaderTitle]: {


                          ...prev[editingHeaderTitle], // 保留 position, width, height


                          text: label,


                          style: style


                        }


                      }));


                    }}


                    onClose={() => setEditingHeaderTitle(null)}


                    onDelete={undefined} // 不允许删除主标题
                  />




                </div>


              </>);





          })()


        }


        {toast && <div className="toast">{toast}</div>}





        {


          showHistoryModal &&


          <HistoryModal


            onClose={() => setShowHistoryModal(false)}


            onSave={saveHistory}


            onUse={useHistory}


            onDelete={deleteHistory}


            onRename={updateHistoryTitle}


            historyList={outlineHistory}


            loading={historyLoading} />








        }





        {/* 最终文档预览Modal */}


        <DocumentPreviewModal


          isOpen={showDocPreviewModal}


          onClose={() => setShowDocPreviewModal(false)}


          sections={template?.sections || []}


          docName={docs.find((d) => d.id === selectedDocId)?.name || UI_TEXT.t135} />








        {/* GlobalButtonsContainer 移到最后，利用 DOM 顺序保证不被遮挡 */}


        {/* GlobalButtonsContainer moved inside */}


      </main>


    </>);





}





const HistoryModal = ({ onClose, onSave, onUse, onDelete, onRename, historyList, loading }) => {


  return (


    <div style={{


      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,


      background: 'rgba(0,0,0,0.5)', zIndex: 10000,


      display: 'flex', alignItems: 'center', justifyContent: 'center'


    }}>


      <div className="card" style={{


        width: '500px',


        maxHeight: '80vh',


        display: 'flex',


        flexDirection: 'column',


        background: '#fff',


        color: '#333',


        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',


        borderRadius: '16px',


        overflow: 'hidden',


        border: '1px solid rgba(0,0,0,0.05)',


        position: 'relative'


      }}>


        <button


          className="ghost icon-btn"


          onClick={onClose}


          style={{ color: '#666', width: '28px', height: '28px', position: 'absolute', top: '12px', right: '12px', zIndex: 2 }}>





          <X size={20} />


        </button>


        <div className="card-head" style={{ justifyContent: 'space-between', borderBottom: '1px solid #eee', padding: '16px 20px', background: '#fafafa' }}>


          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111', margin: 0 }}>{UI_TEXT.t111}</h3>


        </div>





        <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee' }}>


          <button style={{ width: '100%', borderRadius: '8px', padding: '10px', background: '#3b82f6', color: '#fff', border: 'none', fontSize: '14px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={onSave}>


            <Save size={16} />{UI_TEXT.t112}


          </button>


        </div>





        <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>


          {loading ?


            <div className="hint text-center" style={{ padding: '20px' }}>{UI_TEXT.t113}</div> :


            historyList.length === 0 ?


              <div className="hint text-center" style={{ padding: '40px' }}>{UI_TEXT.t114}</div> :





              <HistoryList list={historyList} onUse={onUse} onDelete={onDelete} onRename={onRename} />


          }


        </div>


      </div>


    </div>);





};





const HistoryList = ({ list, onUse, onDelete, onRename }) => {


  const [editingId, setEditingId] = useState(null);


  const [editValue, setEditValue] = useState('');





  const startEdit = (item) => {


    setEditingId(item.id);


    setEditValue(item.title || item.docName || UI_TEXT.t136);


  };





  const submitEdit = () => {


    if (editingId && editValue.trim()) {


      onRename(editingId, editValue.trim());


    }


    setEditingId(null);


  };





  return (


    <div style={{ padding: '0' }}>


      {list.map((item) =>


        <div key={item.id} className="list-item" style={{


          cursor: 'default',


          flexDirection: 'column',


          alignItems: 'flex-start',


          gap: '8px',


          padding: '16px 20px',


          borderBottom: '1px solid #f0f0f0',


          margin: 0,


          borderRadius: 0


        }}>


          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>


            {editingId === item.id ?


              <div style={{ display: 'flex', gap: '8px', flex: 1, alignItems: 'center' }}>


                <input


                  autoFocus


                  value={editValue}


                  onChange={(e) => setEditValue(e.target.value)}


                  onKeyDown={(e) => e.key === 'Enter' && submitEdit()}


                  onBlur={submitEdit}


                  style={{


                    flex: 1,


                    padding: '4px 8px',


                    borderRadius: '4px',


                    border: '1px solid #ddd',


                    fontSize: '14px'


                  }} />





              </div> :





              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>


                <div style={{ fontWeight: 600, fontSize: '14px', color: '#333' }}>


                  {item.title || item.docName || UI_TEXT.t136}


                </div>


                <button


                  className="ghost icon-btn small"


                  onClick={() => startEdit(item)}


                  style={{ width: '24px', height: '24px', color: '#666', opacity: 0.6 }}


                  title={UI_TEXT.t67}>





                  <Edit3 size={14} />


                </button>


              </div>


            }


            <div className="hint" style={{ fontSize: '12px', color: '#999' }}>{new Date(item.timestamp).toLocaleString()}</div>


          </div>


          <div className="hint" style={{ fontSize: '12px', color: '#666' }}>{UI_TEXT.t115}


            {item.template?.sections?.length || 0}{UI_TEXT.t116}


          </div>


          <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'flex-end', marginTop: '8px' }}>


            <button onClick={() => onDelete(item.id)} style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 14px', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>{UI_TEXT.t25}</button>


            <button onClick={() => onUse(item)} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 14px', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>{UI_TEXT.t134}</button>


          </div>


        </div>


      )}


    </div>);





};
