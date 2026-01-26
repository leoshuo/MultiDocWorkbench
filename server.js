import express from "express";

import cors from "cors";

import { randomUUID } from "crypto";

import { fetch } from "undici";

import fs from "fs";

import path from "path";

import { fileURLToPath } from "url";

import { ensureDataDir, readJsonFile, writeJsonFile, logger } from "./server_utils.js";

import multiRouter from "./server_multi.js";



// Manual .env loading (to avoid needing dotenv dependency)

if (fs.existsSync('.env')) {

  try {

    const envConfig = fs.readFileSync('.env', 'utf8');

    envConfig.split('\n').forEach(line => {

      const match = line.match(/^\s*([\w]+)\s*=\s*(.*)?\s*$/);

      if (match) {

        const key = match[1];

        let value = match[2] || '';

        if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {

          value = value.replace(/\\n/gm, '\n');

        }

        value = value.replace(/(^['"]|['"]$)/g, '').trim();

        if (!process.env[key]) {

          process.env[key] = value;

        }

      }

    });

    console.log('[INFO] Loaded environment variables from .env');

  } catch (e) {

    console.error('[WARN] Failed to load .env file:', e);

  }

}



const PORT = process.env.PORT || 4300;

const QWEN_ENDPOINT =
  process.env.QWEN_ENDPOINT ||
  "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

const QWEN_MODEL = process.env.QWEN_MODEL || "qwen-plus";

// 支持多种方式设置 API Key：
// 1. 环境变量: QWEN_API_KEY=xxx node server.js
// 2. 命令行参数: node server.js --api-key=xxx
// 3. 运行时通过 API 设置: POST /api/config/api-key
const getApiKeyFromArgs = () => {
  const args = process.argv.slice(2);
  for (const arg of args) {
    if (arg.startsWith('--api-key=')) {
      return arg.split('=')[1];
    }
    if (arg.startsWith('--QWEN_API_KEY=')) {
      return arg.split('=')[1];
    }
  }
  return null;
};

// 可变的 API Key（支持运行时修改）
let QWEN_API_KEY = process.env.QWEN_API_KEY || getApiKeyFromArgs();

// 调试：打印初始化时的 API Key 状态
console.log('[DEBUG] API Key initialization:', {
  fromEnv: process.env.QWEN_API_KEY ? `set (${process.env.QWEN_API_KEY.substring(0, 6)}...)` : 'empty',
  fromArgs: getApiKeyFromArgs() ? 'set' : 'null',
  final: QWEN_API_KEY ? `set (${QWEN_API_KEY.substring(0, 6)}...)` : 'empty'
});

// 启动时检查并提示交互式输入 API Key
const initApiKey = async () => {
  if (!QWEN_API_KEY) {
    console.warn('\n[WARN] QWEN_API_KEY 未配置，AI 功能将受限。');
    console.log('[INFO] 配置方式:');
    console.log('       1. 环境变量: set QWEN_API_KEY=your_key && node server.js');
    console.log('       2. 命令行参数: node server.js --api-key=your_key');
    console.log('       3. .env 文件: QWEN_API_KEY=your_key');
    console.log('       4. 运行时 API: POST /api/config/api-key');
    console.log('       5. 现在输入（见下方提示）');
    
    // 检查是否为交互式终端（TTY）
    if (process.stdin.isTTY) {
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      await new Promise((resolve) => {
        console.log('\n[INPUT] 请输入 QWEN_API_KEY（直接回车跳过）:');
        rl.question('> ', (answer) => {
          rl.close();
          const key = (answer || '').trim();
          if (key && key.length >= 10) {
            QWEN_API_KEY = key;
            console.log('[INFO] QWEN_API_KEY 已设置成功。\n');
          } else if (key) {
            console.log('[WARN] 输入的 Key 格式无效（长度不足），已跳过。\n');
          } else {
            console.log('[INFO] 已跳过，AI 功能将返回模拟数据。\n');
          }
          resolve();
        });
      });
    }
  } else {
    console.log('[INFO] QWEN_API_KEY loaded successfully.');
  }
};



// ========== P1: 输入验证和内存管理配置 ==========

const MAX_DOCS = 1000;

const MAX_SCENES = 500;

const MAX_DOC_NAME_LENGTH = 255;

const MAX_CONTENT_SIZE = 10 * 1024 * 1024; // 10MB

const MAX_SCENE_AGE = 24 * 60 * 60 * 1000; // 24Сʱ

const API_TIMEOUT = 120 * 1000; // 120秒超时

const API_RETRY_TIMES = 3;

const API_RETRY_DELAY = 1000; // 初始延迟 1s



const app = express();

app.use(cors());

app.use(express.json({ limit: "12mb" }));





// ========== Mount Multi-type Workbench Router ==========

app.use('/api/multi', multiRouter);



// ========== P1: 输入验证工具函数 ==========

const validateDocInput = (name, content) => {

  const errors = [];



  if (!name || typeof name !== 'string') errors.push('name 必须是字符串');

  else if (name.trim().length === 0) errors.push('name 不能为空');

  else if (name.length > MAX_DOC_NAME_LENGTH) errors.push(`name 长度不能超过 ${MAX_DOC_NAME_LENGTH} 字符`);



  if (!content || typeof content !== 'string') errors.push('content 必须是字符串');

  else if (Buffer.byteLength(content, 'utf8') > MAX_CONTENT_SIZE)

    errors.push(`content 大小不能超过 ${(MAX_CONTENT_SIZE / 1024 / 1024).toFixed(1)}MB`);



  if (errors.length > 0) throw new Error(errors.join('; '));

  return { name: name.trim(), content };

};



// ========== P1: 内存管理工具 ==========

const memoryManager = {

  cleanupOldDocs: (list, maxCount = MAX_DOCS) => {

    if (list.length > maxCount) {

      const toRemove = list.length - maxCount;

      logger.info('MEMORY', `移除 ${toRemove} 个旧文档`);

      return list.slice(toRemove);

    }

    return list;

  },



  cleanupOldScenes: (map, maxCount = MAX_SCENES, maxAge = MAX_SCENE_AGE) => {

    const now = Date.now();

    let removed = 0;



    // 按时间清理过期场景

    for (const [id, scene] of map) {

      if (now - (scene.createdAt || 0) > maxAge) {

        map.delete(id);

        removed++;

      }

    }



    // 按数量清理最老的场景

    if (map.size > maxCount) {

      const sorted = Array.from(map.entries())

        .sort((a, b) => (a[1].createdAt || 0) - (b[1].createdAt || 0));

      const toDelete = sorted.length - maxCount;



      for (let i = 0; i < toDelete; i++) {

        map.delete(sorted[i][0]);

        removed++;

      }

    }



    if (removed > 0) logger.info('MEMORY', `清理了 ${removed} 个过期/超限场景`);

  }

};



// ========== P2: API 重试工具 ==========

const fetchWithRetry = async (url, options = {}, retries = API_RETRY_TIMES) => {

  const timeout = options.timeout || API_TIMEOUT;



  for (let attempt = 0; attempt < retries; attempt++) {

    let timeoutHandle = null;

    try {

      const controller = new AbortController();

      timeoutHandle = setTimeout(() => controller.abort(), timeout);



      const response = await fetch(url, {

        ...options,

        signal: controller.signal,

      });



      clearTimeout(timeoutHandle);



      if (!response.ok) {

        const text = await response.text();

        throw new Error(`HTTP ${response.status}: ${text}`);

      }



      return response;

    } catch (err) {

      if (timeoutHandle) clearTimeout(timeoutHandle);



      if (attempt === retries - 1) {

        logger.error('FETCH', `第 ${attempt + 1} 次请求失败，已达最大重试次数`, err);

        throw err;

      }



      const delay = API_RETRY_DELAY * Math.pow(2, attempt);

      logger.debug('FETCH', `第 ${attempt + 1} 次请求失败，${delay}ms 后重试`, err.message);



      await new Promise(resolve => setTimeout(resolve, delay));

    }

  }

};



process.on("unhandledRejection", (err) => logger.error('UNHANDLED', 'unhandledRejection', err));

process.on("uncaughtException", (err) => logger.error('UNHANDLED', 'uncaughtException', err));



const defaultTemplate = {

  id: "template_empty",

  name: "空模板",

  sections: [],

};



const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");

const LAYOUT_STATE_PATH = path.join(DATA_DIR, "layout-config.json");

const BUTTON_STATE_PATH = path.join(DATA_DIR, "button-config.json");

const PANEL_IDS = [

  "input-form-panel",

  "document-list-panel",

  "preview-panel",

  "processing-panel",

  "operations-panel",

];



const DEFAULT_LAYOUT_CONFIG = {

  "preview-panel": { left: 20, top: 20, width: 600, height: 360 },

  "input-form-panel": { left: 20, top: 396, width: 600, height: 180 },

  "document-list-panel": { left: 20, top: 592, width: 600, height: 180 },

  "processing-panel": { left: 636, top: 20, width: 550, height: 376 },

  "operations-panel": { left: 636, top: 412, width: 550, height: 360 },

};



const DEFAULT_BUTTON_CONFIG = {
  "document-list-panel": [
    { id: "btn_list_delete", label: "??", left: 12, top: 12, width: 80, height: 36, enabled: true, kind: "delete_selected" },
    { id: "btn_list_select_all", label: "??", left: 104, top: 12, width: 80, height: 36, enabled: true, kind: "select_all" },
  ],
  "preview-panel": [
    { id: "btn_preview_view_doc", label: "????", left: 12, top: 12, width: 100, height: 36, enabled: true, kind: "view_doc" },
    { id: "btn_preview_summarize", label: "????", left: 124, top: 12, width: 100, height: 36, enabled: true, kind: "fill_summary" },
  ],
  "processing-panel": [
    { id: "btn_proc_config", label: "???????", left: 12, top: 12, width: 120, height: 36, enabled: true, kind: "tab_config" },
    { id: "btn_proc_extract", label: "????", left: 144, top: 12, width: 100, height: 36, enabled: true, kind: "text_snippet" },
    { id: "btn_proc_outline", label: "????", left: 256, top: 12, width: 100, height: 36, enabled: true, kind: "outline_extract" },
  ],
  "processing-tabs": [
    { id: "btn_tab_outline", label: "????", left: 12, top: 6, width: 96, height: 32, enabled: true, kind: "tab_outline", style: { fontSize: 14, fontWeight: 600 } },
    { id: "btn_tab_records", label: "????", left: 128, top: 6, width: 96, height: 32, enabled: true, kind: "tab_records", style: { fontSize: 14, fontWeight: 600 } },
    { id: "btn_tab_config", label: "???????", left: 244, top: 6, width: 140, height: 32, enabled: true, kind: "tab_config", style: { fontSize: 14, fontWeight: 600 } },
    { id: "btn_tab_strategy", label: "?????", left: 404, top: 6, width: 110, height: 32, enabled: true, kind: "tab_strategy", style: { fontSize: 14, fontWeight: 600 } },
  ],
  "processing-records-toolbar": [
    { id: "btn_records_batch_replay", label: "?? Replay", left: 12, top: 8, width: 96, height: 28, enabled: true, kind: "batch_replay", style: { fontSize: 12 } },
    { id: "btn_records_select_all", label: "??", left: 118, top: 8, width: 72, height: 28, enabled: true, kind: "select_all", style: { fontSize: 12 } },
    { id: "btn_records_delete_selected", label: "????", left: 200, top: 8, width: 96, height: 28, enabled: true, kind: "delete_selected", style: { fontSize: 12 } },
    { id: "btn_records_clear_selection", label: "????", left: 306, top: 8, width: 96, height: 28, enabled: true, kind: "clear_selection", style: { fontSize: 12 } },
    { id: "btn_group_new", label: "?????", left: 200, top: 44, width: 110, height: 28, enabled: true, kind: "group_new", style: { fontSize: 12 } },
    { id: "btn_group_update", label: "?????", left: 320, top: 44, width: 110, height: 28, enabled: true, kind: "group_update", style: { fontSize: 12 } },
    { id: "btn_group_rename", label: "???", left: 440, top: 44, width: 84, height: 28, enabled: true, kind: "group_rename", style: { fontSize: 12 } },
    { id: "btn_group_delete", label: "??", left: 534, top: 44, width: 72, height: 28, enabled: true, kind: "group_delete", style: { fontSize: 12 } },
    { id: "btn_group_replay", label: "Replay", left: 616, top: 44, width: 80, height: 28, enabled: true, kind: "group_replay", style: { fontSize: 12 } },
  ],
  "operations-panel": [
    { id: "btn_ops_clear", label: "????", left: 12, top: 12, width: 100, height: 36, enabled: true, kind: "clear_records" },
    { id: "btn_ops_execute", label: "????", left: 124, top: 12, width: 100, height: 36, enabled: true, kind: "dispatch" },
  ],
  "input-form-panel": [],
};

function persistLayoutToDisk(layout) {

  return writeJsonFile(LAYOUT_STATE_PATH, layout);

}



function persistButtonsToDisk(buttons) {

  return writeJsonFile(BUTTON_STATE_PATH, buttons);

}







function validateLayoutPayload(layout) {

  if (!layout || typeof layout !== "object") return "layout 必须为对象";

  for (const panelId of PANEL_IDS) {

    const pos = layout[panelId];

    if (!pos) return `缺少必需的面板配置: ${panelId}`;

    const { left, top, width, height } = pos;

    if (![left, top, width, height].every(Number.isFinite)) {

      return `面板 ${panelId} 的位置配置无效`;

    }

    if (width <= 0 || height <= 0) {

      return `面板 ${panelId} 的尺寸必须大于 0`;

    }

  }

  return null;

}



function validateButtonsPayload(buttons) {

  if (!buttons || typeof buttons !== "object") return "buttons 必须为对象";

  for (const panelId of PANEL_IDS) {

    const list = buttons[panelId];

    if (!Array.isArray(list)) return `面板 ${panelId} 的按钮配置必须为数组`;

    for (const btn of list) {

      if (!btn || typeof btn !== "object") return "按钮配置必须为对象";

      if (!btn.id || !btn.label) return "按钮必须有 id 和 label";

      if (![btn.left, btn.top, btn.width, btn.height].every(Number.isFinite)) {

        return `按钮 ${btn.id} 的位置配置无效`;

      }

      if (btn.width <= 0 || btn.height <= 0) {

        return `按钮 ${btn.id} 的尺寸必须大于 0`;

      }

    }

  }

  return null;

}



const DOCS_STATE_PATH = path.join(process.cwd(), "data", "docs.json");

const docs = [];

const storedDocs = readJsonFile(DOCS_STATE_PATH);

if (Array.isArray(storedDocs)) {

  storedDocs.forEach((doc) => {

    if (!doc || typeof doc !== "object") return;

    const name = (doc.name || "").toString().trim();

    const content = (doc.content || "").toString();

    if (!name) return;

    docs.push({

      id: doc.id || randomUUID(),

      name,

      content,

    });

  });

}

const persistDocs = () => writeJsonFile(DOCS_STATE_PATH, docs);

// ========== 大纲缓存持久化 ==========
const OUTLINE_CACHE_PATH = path.join(DATA_DIR, 'outline-cache.json');

// 持久化大纲缓存
const persistOutlineCache = () => {
  try {
    writeJsonFile(OUTLINE_CACHE_PATH, { template: cachedOutlineTemplate });
    logger.info('OUTLINE_CACHE', '大纲缓存已持久化');
  } catch (e) {
    logger.warn('OUTLINE_CACHE', '大纲缓存持久化失败', { error: e.message });
  }
};

// 加载持久化的大纲缓存
const loadOutlineCache = () => {
  try {
    const cached = readJsonFile(OUTLINE_CACHE_PATH);
    if (cached?.template && Array.isArray(cached.template.sections)) {
      cachedOutlineTemplate = cached.template;
      logger.info('OUTLINE_CACHE', `已加载缓存的大纲，包含 ${cached.template.sections.length} 个标题`);
    }
  } catch (e) {
    logger.warn('OUTLINE_CACHE', '加载大纲缓存失败', { error: e.message });
  }
};

const scenes = new Map();

// ========== 服务端缓存 ==========
// 大纲缓存（持久化到文件）
let cachedOutlineTemplate = null;

// 启动时加载大纲缓存
loadOutlineCache();

// 对话消息缓存（应用端）
let cachedChatMessages = [];

// 操作日志缓存（后管端）
let cachedDispatchLogs = [];

// 沉淀录制状态缓存
let cachedDepositState = {
  isDepositing: false,
  sections: [],
  depositSeq: 0
};

const persistedLayout = readJsonFile(LAYOUT_STATE_PATH);

const layoutValidationError = persistedLayout ? validateLayoutPayload(persistedLayout) : null;

let layoutConfig;

if (persistedLayout && !layoutValidationError) {

  layoutConfig = persistedLayout;

  logger.info("STORAGE", "加载持久化布局配置");

} else {

  if (persistedLayout && layoutValidationError) {

    logger.info("STORAGE", "忽略无效布局配置", layoutValidationError);

  }

  layoutConfig = DEFAULT_LAYOUT_CONFIG;

}



const persistedButtons = readJsonFile(BUTTON_STATE_PATH);

const buttonsValidationError = persistedButtons ? validateButtonsPayload(persistedButtons) : null;

let buttonConfig;

if (persistedButtons && !buttonsValidationError) {

  buttonConfig = persistedButtons;

  logger.info("STORAGE", "加载持久化按钮配置");

} else {

  if (persistedButtons && buttonsValidationError) {

    logger.info("STORAGE", "忽略无效按钮配置", buttonsValidationError);

  }

  buttonConfig = DEFAULT_BUTTON_CONFIG;

}



function toSlug(text, prefix = "sec") {

  const slug = (text || "")

    .toLowerCase()

    .replace(/[^a-z0-9]+/g, "_")

    .replace(/^_+|_+$/g, "")

    .slice(0, 40);

  return slug ? `${prefix}_${slug}` : `${prefix}_${Date.now()}`;

}



function safeJsonParse(text) {

  try {

    return JSON.parse(text);

  } catch (_) {

    return null;

  }

}



function isDataInspectionFailed(payloadOrText) {

  if (!payloadOrText) return false;

  if (typeof payloadOrText === "string") {

    return payloadOrText.includes("data_inspection_failed") || payloadOrText.includes("inappropriate content");

  }

  const code = payloadOrText?.error?.code || payloadOrText?.code;

  const type = payloadOrText?.error?.type || payloadOrText?.type;

  const message = payloadOrText?.error?.message || payloadOrText?.message;

  return (

    code === "data_inspection_failed" ||

    type === "data_inspection_failed" ||

    (typeof message === "string" && (message.includes("inappropriate content") || message.includes("data_inspection_failed")))

  );

}



function buildHeuristicOutlineTemplate(rawText) {

  const text = (rawText || "").toString();

  const lines = text

    .replace(/\r\n/g, "\n")

    .replace(/\r/g, "\n")

    .split("\n")

    .map((l) => l.trim())

    .filter((l) => l);



  const items = [];

  const pushItem = (title, level, idx) => {

    const t = (title || "").toString().trim();

    if (!t) return;

    items.push({ title: t, level: Math.min(3, Math.max(1, level || 1)), idx });

  };



  const patterns = [

    // Markdown heading

    { re: /^(#{1,6})\s+(.+)$/, level: (m) => Math.min(3, Math.max(1, m[1].length)) },

    // 第X章/节/部分

    { re: /^第.{1,10}[章节篇部分]\s*(.+)?$/, level: () => 1 },

    // 中文编号：一、 二. 三）

    { re: /^([一二三四五六七八九十]{1,3})[、\.\)]\s*(.+)$/, level: () => 1 },

    // 阿拉伯编号：1、 2. 3)

    { re: /^(\d{1,2})[、\.\)]\s*(.+)$/, level: () => 1 },

    // （一）(二)

    { re: /^[（(]([一二三四五六七八九十]{1,3})[）)]\s*(.+)$/, level: () => 2 },

    // （1）(2)

    { re: /^[（(](\d{1,2})[）)]\s*(.+)$/, level: () => 3 },

  ];



  for (let i = 0; i < lines.length; i += 1) {

    const line = lines[i];

    for (const p of patterns) {

      const m = p.re.exec(line);

      if (!m) continue;

      const title = (m[2] || m[1] || line).toString().trim();

      const lvl = typeof p.level === "function" ? p.level(m) : p.level;

      pushItem(title, lvl, i);

      break;

    }

  }



  if (!items.length) {

    const first = lines.find((l) => l && l.length > 4) || "概览";

    const second = lines.find((l) => l && l.length > 8 && l !== first) || "要点";

    return {

      id: "template_auto",

      name: "自动生成模板（规则抽取）",

      sections: [

        { id: "sec_rule_1", title: "一、概览", hint: "概述主要内容与背景", summary: first.slice(0, 20), level: 1 },

        { id: "sec_rule_2", title: "二、要点", hint: "提取关键信息和要点", summary: second.slice(0, 20), level: 1 },

        { id: "sec_rule_3", title: "三、总结与行动", hint: "总结与后续建议", summary: "", level: 1 },

      ],

    };

  }



  const max = 60;

  const deduped = [];

  const seen = new Set();

  for (const it of items) {

    if (deduped.length >= max) break;

    const key = `${it.level}::${it.title}`.toLowerCase();

    if (seen.has(key)) continue;

    seen.add(key);

    deduped.push(it);

  }



  const sections = deduped.map((it, idx) => {

    const nextIdx = idx + 1 < deduped.length ? deduped[idx + 1].idx : lines.length;

    const slice = lines.slice(it.idx + 1, Math.min(lines.length, nextIdx)).join(" ").trim();

    const firstSentence = slice.split(/[。！？!?]/)[0] || "";

    const summary = (firstSentence || slice).replace(/\s+/g, " ").trim().slice(0, 20);

    return {

      id: `sec_rule_${idx + 1}`,

      title: it.title,

      hint: "补充写作提示",

      summary: summary || "",

      level: it.level,

    };

  });



  return { id: "template_auto", name: "自动生成模板（规则抽取）", sections };

}



function buildSectionsMap(template) {

  const map = {};

  (template.sections || []).forEach((s) => {

    map[s.id] = { status: "empty", content: "" };

  });

  return map;

}



function createScene(docIds = []) {

  // ========== P1: 内存管理 - 清理过期场景 ==========

  memoryManager.cleanupOldScenes(scenes, MAX_SCENES, MAX_SCENE_AGE);



  const scene = {

    id: `scene_${Date.now()}`,

    createdAt: Date.now(), // P1: 添加时间戳用于过期检查

    templateId: defaultTemplate.id,

    customTemplate: null,

    docIds,

    sectionDocLinks: {},

    sections: buildSectionsMap(defaultTemplate),

  };

  scenes.set(scene.id, scene);

  logger.info('SCENE', `新建场景: ${scene.id}`);

  return scene;

}



function pickTemplate(scene) {

  return scene.customTemplate || defaultTemplate;

}



function pickDocs(docIdsFromReq, scene) {

  const reqDocIds = Array.isArray(docIdsFromReq) ? docIdsFromReq : null;

  const docIdsToUse =

    (reqDocIds && reqDocIds.length && reqDocIds) ||

    (scene.docIds && scene.docIds.length && scene.docIds) ||

    (docs.length ? docs.map((d) => d.id) : []);

  return docIdsToUse

    .map((id) => docs.find((d) => d.id === id))

    .filter(Boolean);

}



function buildMessages({ section, documents, mode, currentContent }) {

  const docsText = documents

    .map((d, i) => `【文档${i + 1}】${d.name}\n${d.content}`)

    .join("\n\n---\n\n");



  const improveNote =

    mode === "improve"

      ? `本次任务是基于已生成的章节内容进行改写/优化。当前内容：\n${currentContent || "(空)"}\n\n`

      : "";



  return [

    {

      role: "system",

      content:

        "你是一个中文文档撰写助手，按指定模板章节输出正文。不要输出多余说明或 JSON，仅需正文，可用小标题或条列。",

    },

    {

      role: "user",

      content: `

这是模板中的章节，请根据提供的原始文档${mode === "improve" ? "并结合当前已写内容" : ""}生成本章节正文。

章节标题：${section.title}

写作提示：${section.hint || "无"}

${improveNote}要求：

- 只输出正文，语言为中文

- 基于提供的文档内容，不要胡编

- 不要出现“以下是”“总结如下”等开头

- 不要输出 JSON



原始文档全文：

${docsText}

      `.trim(),

    },

  ];

}



async function callQwen({ section, documents, mode = "generate", currentContent = "" }) {

  const messages = buildMessages({ section, documents, mode, currentContent });



  if (!QWEN_API_KEY) {

    return [

      "【占位返回】未配置 QWEN_API_KEY，返回示例内容。",

      `模式：${mode === "improve" ? "优化" : "生成"}`,

      `章节：${section.title}`,

      currentContent ? `当前内容：${currentContent}` : "",

      "请在此处写入章节正文。",

    ]

      .filter(Boolean)

      .join("\n");

  }



  // ========== P2: 使用重试机制 ==========

  const resp = await fetchWithRetry(QWEN_ENDPOINT, {

    method: "POST",

    headers: {

      "Content-Type": "application/json",

      Authorization: `Bearer ${QWEN_API_KEY}`,

    },

    body: JSON.stringify({

      model: QWEN_MODEL,

      messages,

      temperature: 0.3,

    }),

    timeout: 30000,

  }, API_RETRY_TIMES);



  const data = await resp.json();

  const content = data?.choices?.[0]?.message?.content;

  if (!content) {

    throw new Error("Qwen 返回缺少内容");

  }

  return content.trim();

}



const DEFAULT_OUTLINE_SYSTEM_PROMPT =

  "你是中文文档的提纲抽取助手，快速输出标题及摘要。返回 JSON 数组，每项包含 id/title/summary/hint/level，level 仅为 1/2/3，基于语义判断层级，不做硬性分级。summary 为标题下的一句话中文摘要（<=20字）。标题尽量使用原文中的标题文本（能逐字则逐字），避免改写。";



const DEFAULT_OUTLINE_USER_PROMPT = `

请基于以下内容抽取提纲（节点数量不限），输出 JSON 数组：

[

  {"id":"...","title":"原文中的标题（尽量保持原样）","summary":"一句摘要<=20字","hint":"写作提示","level":1-3}

]

要求：

- level 基于语义判断为 1/2/3，不必强制均衡（无法确定默认 1）

- title 覆盖核心结构，顺序合理，尽量直接采用原文标题文本

- summary 为该标题下一句话摘要（<=20字）

- hint 给出该章节写作提示（1-2 句）

- 避免将普通段落或列表项误判为标题；若标题过多可合并从属项到上级，保持精简

- 不要输出多余文本



内容：

{{text}}

`.trim();







async function callQwenOutline(text, options = {}) {

  const systemPrompt =

    typeof options.systemPrompt === "string" && options.systemPrompt.trim()

      ? options.systemPrompt.trim()

      : DEFAULT_OUTLINE_SYSTEM_PROMPT;



  const userTemplate =

    typeof options.userPrompt === "string" && options.userPrompt.trim()

      ? options.userPrompt.trim()

      : DEFAULT_OUTLINE_USER_PROMPT;



  const userContent = userTemplate.includes("{{text}}")

    ? userTemplate.replaceAll("{{text}}", text)

    : `${userTemplate}\n\n内容：\n${text}`;



  const messages = [

    { role: "system", content: systemPrompt },

    { role: "user", content: userContent },

  ];



  if (!QWEN_API_KEY) {

    return {

      id: "template_auto",

      name: "自动生成模板",

      sections: [

        { id: "sec_auto_1", title: "一、概览", hint: "概述主要内容和背景", summary: "", level: 1 },

        { id: "sec_auto_2", title: "二、细节", hint: "提取关键信息和要点", summary: "", level: 1 },

        { id: "sec_auto_3", title: "三、总结与行动", hint: "总结与后续建议", summary: "", level: 1 },

      ],

    };

  }



  const resp = await fetchWithRetry(QWEN_ENDPOINT, {

    method: "POST",

    headers: {

      "Content-Type": "application/json",

      Authorization: `Bearer ${QWEN_API_KEY}`,

    },

    body: JSON.stringify({

      model: QWEN_MODEL,

      messages,

      temperature: 0,

    }),

  });



  if (!resp.ok) {

    const raw = await resp.text();

    throw new Error(`Qwen 调用失败 ${resp.status}: ${raw}`);

  }

  const data = await resp.json();

  const content = data?.choices?.[0]?.message?.content;

  if (!content) throw new Error("Qwen 返回缺少内容");



  let sections;

  try {

    sections = JSON.parse(content);

  } catch (e) {

    throw new Error("提纲返回不是合法 JSON");

  }

  if (!Array.isArray(sections)) throw new Error("提纲格式错误");

  const sanitized = sections.map((s, idx) => ({

    id: s.id || toSlug(s.title || `sec_${idx + 1}`),

    title: s.title || `章节${idx + 1}`,

    hint: s.hint || "补充写作提示",

    summary: s.summary || "",

    level: Number.isInteger(s.level) ? Math.min(3, Math.max(1, s.level)) : 1,

  }));

  return { id: "template_auto", name: "自动生成模板", sections: sanitized };

}



async function callQwenDispatch({ instructions, scene, docContent, outlineSegments = [], systemPrompt }) {
  // 默认系统提示语（包含 JSON 关键词，因为使用了 response_format: json_object）
  const defaultSysPrompt = `你是中文文档处理助手。请根据用户指令处理给定文本，严格用中文输出 JSON 对象，字段：summary（一句话说明你做了什么，必须为中文），detail（处理后的正文，必须为中文），edits（可选数组，每项：{sectionId, field:'title'|'summary', content}）。

**重要 - 执行计算指令时必须遵守：**
1. 如果用户指令中包含计算公式（如 "XXX = A + B + C"），你必须：
   - 从文档中准确提取所有需要的数值
   - 严格按照公式进行数学计算
   - 将计算结果填入指定的输出格式中
2. 示例：如果指令要求 "输出: 政治中心区调度检查 XXX 次，XXX = 预警调度次数 + 电台调度次数 + 视频巡检次数 + 实地检查次数"
   - 从文档提取：预警调度68次、电台调度89次、视频巡检373次、实地检查29次
   - 计算：68 + 89 + 373 + 29 = 559
   - 输出：detail 应为 "政治中心区调度检查 559 次"
3. 不要简单复制原文，必须执行用户要求的计算和转换

注意：如果文档中包含形如【片段N | ID=xxx】的标记，edits 中的 sectionId 必须使用 ID= 后面的实际值（如 'sec_1' 或数字），不要包含 '片段N' 等前缀。不要返回其他字段，不要解释。`;
  
  // 如果有自定义 systemPrompt，将其作为补充指导，但保留默认的 JSON 输出要求
  // 因为使用了 response_format: json_object，messages 中必须包含 "json" 关键词
  let sysPrompt = defaultSysPrompt;
  if (typeof systemPrompt === "string" && systemPrompt.trim()) {
    // 将自定义指导追加到默认提示之后
    sysPrompt = `${defaultSysPrompt}\n\n【额外处理指导】\n${systemPrompt.trim()}`;
  }



  const messages = [

    {

      role: "system",

      content: sysPrompt,

    },

    {

      role: "user",

      content: `

用户指令：

${instructions || "(空)"}



文档内容：

${docContent || "(空)"}



若包含大纲片段，请按标记分别处理，并在 edits 中返回对应 sectionId/field 的修改结果。

      `.trim(),

    },

  ];



  if (!QWEN_API_KEY) {
    console.log('[DEBUG] callQwenDispatch: QWEN_API_KEY is empty!', { 
      envValue: process.env.QWEN_API_KEY ? 'set' : 'empty',
      varValue: QWEN_API_KEY ? 'set' : 'empty'
    });
    return { summary: "占位返回：未配置 QWEN_API_KEY", detail: docContent || "" };

  }



  const resp = await fetchWithRetry(QWEN_ENDPOINT, {

    method: "POST",

    headers: {

      "Content-Type": "application/json",

      Authorization: `Bearer ${QWEN_API_KEY}`,

    },

    body: JSON.stringify({

      model: QWEN_MODEL,

      messages,

      temperature: 0.2,

      response_format: { type: "json_object" },

    }),

  });

  if (!resp.ok) {

    const text = await resp.text();

    throw new Error(`Qwen 调度解析失败 ${resp.status}: ${text}`);

  }

  const data = await resp.json();

  const rawContent = data?.choices?.[0]?.message?.content || "";

  let parsed = data?.choices?.[0]?.message?.parsed || {};

  if ((!parsed.summary && !parsed.detail) && typeof rawContent === "string") {

    try {

      const tmp = JSON.parse(rawContent);

      if (tmp && typeof tmp === "object") parsed = tmp;

    } catch (_) {

      /* ignore */

    }

  }

  const content = parsed.detail || parsed.summary || rawContent || "";

  const summary = parsed.summary || "模型已处理内容";

  const detail = parsed.detail || content || "";

  const edits = Array.isArray(parsed.edits) ? parsed.edits : [];

  return { summary, detail, edits };

}



async function callQwenPromptOptimize(prompt) {

  const messages = [

    {

      role: "system",

      content:

        "你是提示词工程助手。请在不改变用户意图的前提下，将用户提供的提示词改写得更清晰、更结构化、更可执行，以便大模型更稳定地理解与输出。只输出 JSON 对象：{prompt: \"...\"}。必须保留并原样输出所有形如 {{...}} 的占位符，不要删除或改写。不要输出其他字段，不要解释。",

    },

    {

      role: "user",

      content: `请对下面提示词进行“AI 自动优化”。目标：清晰、结构化、约束明确、便于模型执行。\n\n原提示词：\n${prompt}`,

    },

  ];



  if (!QWEN_API_KEY) {

    const optimized = [

      "你是一个中文助手，请严格按要求输出。",

      "",

      "任务：",

      prompt.trim(),

      "",

      "输出要求：",

      "- 只输出最终结果，不要解释过程",

      "- 保留并原样使用所有 {{...}} 占位符",

    ].join("\n");

    return { prompt: optimized };

  }



  const resp = await fetch(QWEN_ENDPOINT, {

    method: "POST",

    headers: {

      "Content-Type": "application/json",

      Authorization: `Bearer ${QWEN_API_KEY}`,

    },

    body: JSON.stringify({

      model: QWEN_MODEL,

      messages,

      temperature: 0.2,

      response_format: { type: "json_object" },

    }),

  });

  if (!resp.ok) {

    const text = await resp.text();

    throw new Error(`Qwen 提示词优化失败 ${resp.status}: ${text}`);

  }

  const data = await resp.json();

  const rawContent = data?.choices?.[0]?.message?.content || "";

  let parsed = data?.choices?.[0]?.message?.parsed || {};

  if (!parsed.prompt && typeof rawContent === "string") {

    try {

      const tmp = JSON.parse(rawContent);

      if (tmp && typeof tmp === "object") parsed = tmp;

    } catch (_) {

      /* ignore */

    }

  }

  const out = (parsed.prompt || "").toString();

  if (!out.trim()) throw new Error("提示词优化返回为空");

  return { prompt: out };

}



app.get("/", (_req, res) => {

  res.type("text/plain").send("API 服务运行中。请使用 /api/* 端点。");

});



app.get("/api/template", (_req, res) => {

  res.json({ template: defaultTemplate });

});



app.post("/api/prompt/optimize", async (req, res) => {

  try {

    const prompt = req.body?.prompt;

    if (typeof prompt !== "string") return res.status(400).json({ error: "prompt 必须为字符串" });

    if (!prompt.trim()) return res.json({ prompt });

    const usedModel = !!QWEN_API_KEY;

    const result = await callQwenPromptOptimize(prompt);

    res.json({ ...result, usedModel });

  } catch (err) {

    console.error(err);

    res.status(500).json({ error: err.message || "提示词优化失败" });

  }

});



async function callQwenFileSelector({ description, exampleName }) {

  const sysPrompt =

    "你是前端自动化回放助手。任务：把用户的自然语言描述转换为“文件名匹配规则”，用于在同一目录中找到要上传的文件。\n" +

    "只输出 JSON 对象：{selector:{kind:'keywords'|'regex', mode:'single'|'multi', keywords?:string[], pattern?:string, flags?:string, extension?:'.txt'|'.md'|'', pick?:'newest'|'first', description:string}}。\n" +

    "要求：\n" +

    "- kind=keywords：keywords 为多个关键字，匹配时文件名需同时包含所有关键字（不区分大小写）\n" +

    "- kind=regex：pattern 为正则表达式字符串，flags 建议包含 i\n" +

    "- mode=multi 表示上传所有匹配文件；否则只上传一个\n" +

    "- pick 仅在 single 下有效：newest 表示选择最近修改的\n" +

    "- extension 可为空，若用户明确提到 txt/md 则填入\n" +

    "- description 原样回填用户输入\n" +

    "不要输出其他字段，不要解释。";



  const userContent = [

    `自然语言描述：${description || ""}`,

    exampleName ? `示例文件名（可选）：${exampleName}` : "",

  ]

    .filter(Boolean)

    .join("\n");



  if (!QWEN_API_KEY) {

    const raw = (description || "").toString();

    const mode = /全部|所有|批量|都上传/.test(raw) ? "multi" : "single";

    let extension = "";

    if (/\.txt\b|txt文件|TXT/.test(raw)) extension = ".txt";

    if (/\.md\b|md文件|markdown/i.test(raw)) extension = ".md";

    if (!extension && typeof exampleName === "string") {

      const m = /\.[a-z0-9]+$/i.exec(exampleName.trim());

      if (m) extension = m[0].toLowerCase();

    }

    const stop = new Set(["上传", "文件", "文档", "名称", "匹配", "符合", "要求", "相关", "一类", "选择", "目录", "同名"]);

    const quoted = Array.from(raw.matchAll(/[“”"](.*?)[“”"]/g)).map((m) => (m[1] || "").trim()).filter(Boolean);

    const tokens = raw

      .replace(/[“”"]/g, " ")

      .split(/[\s,，;；、\r\n]+/g)

      .map((t) => t.trim())

      .filter((t) => t.length >= 2 && t.length <= 20 && !stop.has(t));

    const keywords = Array.from(new Set([...quoted, ...tokens])).slice(0, 8);

    return {

      selector: {

        kind: "keywords",

        mode,

        pick: "newest",

        keywords,

        extension,

        description: raw,

      },

    };

  }



  const resp = await fetch(QWEN_ENDPOINT, {

    method: "POST",

    headers: {

      "Content-Type": "application/json",

      Authorization: `Bearer ${QWEN_API_KEY}`,

    },

    body: JSON.stringify({

      model: QWEN_MODEL,

      messages: [

        { role: "system", content: sysPrompt },

        { role: "user", content: userContent },

      ],

      temperature: 0.1,

      response_format: { type: "json_object" },

    }),

  });

  if (!resp.ok) {

    const t = await resp.text();

    throw new Error(`Qwen 文件规则生成失败 ${resp.status}: ${t}`);

  }

  const data = await resp.json();

  const rawContent = data?.choices?.[0]?.message?.content || "";

  let parsed = data?.choices?.[0]?.message?.parsed || {};

  if (!parsed.selector && typeof rawContent === "string") {

    try {

      const tmp = JSON.parse(rawContent);

      if (tmp && typeof tmp === "object") parsed = tmp;

    } catch (_) {

      /* ignore */

    }

  }

  const selector = parsed?.selector;

  if (!selector || typeof selector !== "object") throw new Error("文件规则生成返回为空或格式错误");

  selector.description = (selector.description || description || "").toString();

  return { selector };

}



app.post("/api/replay/file-selector", async (req, res) => {

  try {

    const description = req.body?.description;

    const exampleName = req.body?.exampleName;

    if (typeof description !== "string") return res.status(400).json({ error: "description 必须为字符串" });

    const usedModel = !!QWEN_API_KEY;

    const result = await callQwenFileSelector({

      description,

      exampleName: typeof exampleName === "string" ? exampleName : undefined,

    });

    res.json({ ...result, usedModel });

  } catch (err) {

    console.error(err);

    res.status(500).json({ error: err.message || "文件规则生成失败" });

  }

});


// ========== 大模型语义匹配 API（用于大模型Replay）==========
// 根据记录的特征，在候选列表中找到相似项
async function callQwenSemanticMatch({ taskType, recordedInfo, candidates, context }) {
  // taskType: 'find_document' | 'find_outline_section' | 'extract_content'
  // recordedInfo: 记录中的特征信息
  // candidates: 候选列表
  // context: 额外上下文（如新文档内容）
  
  let systemPrompt = '';
  let userContent = '';
  
  if (taskType === 'find_document') {
    systemPrompt = `你是文档匹配助手。根据沉淀记录中的文档特征信息，在候选文档列表中找到最相似的文档。

重要：你需要基于语义相似性进行匹配，而不是精确名称匹配。例如：
- 记录中"无人机素材"应该匹配"无人机-----最新.txt"
- 记录中"公交总队"应该匹配"公交总队（输入）.txt"
- 关键词"无人机"、"UAV"应该匹配包含"无人机"的文档

输出 JSON 对象：{
  "matchedIndex": 数字（候选列表中的索引，从0开始，如果确实没有相关文档返回-1），
  "matchedName": "匹配的文档名称",
  "confidence": 0-1之间的置信度,
  "reason": "匹配理由"
}
不要输出其他字段，不要解释。`;

    // 构建用户内容，包含沉淀记录中的丰富信息
    const extraInfo = [];
    if (recordedInfo.selectorDescription) extraInfo.push(`选择器描述：${recordedInfo.selectorDescription}`);
    if (recordedInfo.flexKeywords) extraInfo.push(`灵活关键词：${recordedInfo.flexKeywords}`);
    if (recordedInfo.targetSectionTitle) extraInfo.push(`目标章节：${recordedInfo.targetSectionTitle}`);
    if (recordedInfo.structuredContent) extraInfo.push(`结构化内容摘要：${recordedInfo.structuredContent.substring(0, 200)}`);

    userContent = `【沉淀记录中的文档特征】
原记录名称：${recordedInfo.docName || ''}
描述：${recordedInfo.description || ''}
AI指导：${recordedInfo.aiGuidance || ''}
关键词：${recordedInfo.keywords || ''}
${extraInfo.length > 0 ? '\n【额外参考信息】\n' + extraInfo.join('\n') : ''}

【当前文档列表（候选）】
${candidates.map((c, i) => `${i}. ${c.name}`).join('\n')}

请根据沉淀记录的特征，从当前文档列表中找出最相似的文档。注意进行语义匹配，不要求名称完全一致。`;

  } else if (taskType === 'find_outline_section') {
    systemPrompt = `你是大纲位置匹配助手。根据记录的目标位置特征，在当前大纲中找到最相似的位置。
输出 JSON 对象：{
  "matchedId": "匹配的章节ID",
  "matchedTitle": "匹配的章节标题",
  "confidence": 0-1之间的置信度,
  "reason": "匹配理由"
}
不要输出其他字段，不要解释。`;

    userContent = `【记录的目标位置特征】
标题：${recordedInfo.targetTitle || ''}
级别：${recordedInfo.targetLevel || ''}
描述：${recordedInfo.description || ''}
AI指导：${recordedInfo.aiGuidance || ''}
摘要提示：${recordedInfo.targetSummary || ''}

【当前大纲结构】
${candidates.map(c => `- ID: ${c.id}, 级别: ${c.level}, 标题: ${c.title}${c.summary ? `, 摘要: ${(c.summary || '').substring(0, 50)}...` : ''}`).join('\n')}

请根据记录的特征，找出当前大纲中最相似的位置。`;

  } else if (taskType === 'extract_content') {
    systemPrompt = `你是内容提取助手。根据记录的内容特征，从新文档中找到并提取相似的内容片段。
输出 JSON 对象：{
  "extractedContent": "提取的内容",
  "startExcerpt": "提取内容的开头（用于定位）",
  "endExcerpt": "提取内容的结尾（用于定位）",
  "confidence": 0-1之间的置信度,
  "reason": "提取理由"
}
不要输出其他字段，不要解释。`;

    userContent = `【记录的内容特征】
原内容开头：${recordedInfo.contentStart || ''}
原内容结尾：${recordedInfo.contentEnd || ''}
内容摘要：${recordedInfo.contentSummary || ''}
上下文特征：${recordedInfo.contextFeatures || ''}
AI指导：${recordedInfo.aiGuidance || ''}

【新文档内容】
${context?.newDocContent || ''}

请根据记录的特征，从新文档中找到并提取相似的内容片段。`;
  }

  if (!QWEN_API_KEY) {
    // 无API KEY时使用增强的关键词匹配
    if (taskType === 'find_document') {
      const recordedName = (recordedInfo.docName || '').toLowerCase();
      // 提取所有关键词（从 docName、keywords、flexKeywords）
      const allKeywords = [
        ...(recordedInfo.docName || '').replace(/[（）()【】\[\].txt.docx.doc\-_]/g, ' ').toLowerCase().split(/\s+/),
        ...(recordedInfo.keywords || '').toLowerCase().split(/\s+/),
        ...(recordedInfo.flexKeywords || '').toLowerCase().split(/[,，\s]+/)
      ].filter(k => k && k.length > 1);
      
      // 计算每个候选文档的匹配分数
      let bestMatch = { idx: -1, score: 0 };
      candidates.forEach((c, i) => {
        const candidateName = (c.name || '').toLowerCase();
        let score = 0;
        
        // 名称直接包含关系
        if (candidateName.includes(recordedName) || recordedName.includes(candidateName)) {
          score += 10;
        }
        
        // 关键词匹配
        allKeywords.forEach(kw => {
          if (candidateName.includes(kw)) {
            score += 3;
          }
        });
        
        if (score > bestMatch.score) {
          bestMatch = { idx: i, score };
        }
      });
      
      console.log('[Semantic Match Fallback] find_document:', { 
        recordedName, 
        allKeywords: allKeywords.slice(0, 5),
        bestMatchIdx: bestMatch.idx,
        bestMatchName: bestMatch.idx >= 0 ? candidates[bestMatch.idx]?.name : null,
        bestScore: bestMatch.score,
        candidateCount: candidates.length 
      });
      
      return {
        matchedIndex: bestMatch.idx >= 0 ? bestMatch.idx : (candidates.length > 0 ? 0 : -1),
        matchedName: bestMatch.idx >= 0 ? candidates[bestMatch.idx]?.name : candidates[0]?.name,
        confidence: bestMatch.score >= 10 ? 0.8 : (bestMatch.score >= 3 ? 0.6 : 0.3),
        reason: `基于关键词匹配（未配置大模型）- 关键词: ${allKeywords.slice(0, 5).join(', ')}`
      };
    } else if (taskType === 'find_outline_section') {
      const recordedTitle = (recordedInfo.targetTitle || '').toLowerCase();
      // 从记录的标题中提取关键词（去除标点符号）
      const cleanTitle = recordedTitle.replace(/[【】\[\]()（）\-_\s]/g, '');
      const titleKeywords = cleanTitle.split('').filter(Boolean);
      
      // 尝试多种匹配策略
      let matched = null;
      let bestScore = 0;
      
      for (const c of candidates) {
        const candidateTitle = (c.title || '').toLowerCase();
        const cleanCandidateTitle = candidateTitle.replace(/[【】\[\]()（）\-_\s]/g, '');
        
        let score = 0;
        
        // 策略1：直接包含
        if (candidateTitle.includes(cleanTitle) || cleanTitle.includes(cleanCandidateTitle)) {
          score += 100;
        }
        
        // 策略2：关键词匹配（检查每个关键字是否出现）
        for (const kw of titleKeywords) {
          if (kw.length >= 2 && cleanCandidateTitle.includes(kw)) {
            score += 10;
          }
        }
        
        // 策略3：特殊关键词匹配
        const specialKeywords = ['无人机', '公交', '网安', '指挥', '治安', '内保', '出入境', '天安门', '勤务', '政治'];
        for (const kw of specialKeywords) {
          if (cleanTitle.includes(kw) && cleanCandidateTitle.includes(kw)) {
            score += 50;
          }
        }
        
        if (score > bestScore) {
          bestScore = score;
          matched = c;
        }
      }
      
      console.log('[Semantic Match Fallback] find_outline_section:', { 
        recordedTitle, 
        cleanTitle,
        matchedTitle: matched?.title, 
        bestScore,
        candidateCount: candidates.length 
      });
      
      return {
        matchedId: matched?.id || (candidates.length > 0 ? candidates[0].id : null),
        matchedTitle: matched?.title || (candidates.length > 0 ? candidates[0].title : ''),
        confidence: bestScore >= 50 ? 0.7 : (bestScore >= 10 ? 0.5 : 0.3),
        reason: `基于关键词匹配（未配置大模型）- 得分: ${bestScore}`
      };
    }
    return { error: '未配置大模型，无法执行语义匹配' };
  }

  const resp = await fetchWithRetry(QWEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${QWEN_API_KEY}`,
    },
    body: JSON.stringify({
      model: QWEN_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2, // 低温度确保稳定性
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`大模型匹配失败: ${resp.status} - ${errText}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || "{}";

  try {
    return JSON.parse(content);
  } catch {
    return { error: "解析大模型返回失败", raw: content };
  }
}

app.post("/api/replay/llm-match", async (req, res) => {
  try {
    const { taskType, recordedInfo, candidates, context } = req.body || {};
    
    if (!taskType || !recordedInfo) {
      return res.status(400).json({ error: "taskType 和 recordedInfo 必填" });
    }

    const usedModel = !!QWEN_API_KEY;
    const result = await callQwenSemanticMatch({ taskType, recordedInfo, candidates, context });
    
    res.json({ ...result, usedModel });
  } catch (err) {
    console.error('[LLM Match Error]', err);
    res.status(500).json({ error: err.message || "语义匹配失败" });
  }
});

// ========== 统一的 Replay 执行 API ==========
// 应用端和后管端都调用此 API 执行 section 的 Replay
// 确保两端逻辑完全一致
app.post("/api/replay/execute-section", async (req, res) => {
  try {
    const { sceneId, section, mode = 'llm', replayDirPath } = req.body || {};
    
    if (!sceneId) {
      return res.status(400).json({ error: "sceneId 必填" });
    }
    if (!section) {
      return res.status(400).json({ error: "section 必填" });
    }

    // 优先使用 'main' scene（与后管端保持一致）
    const effectiveSceneId = sceneId || 'main';
    let scene = scenes.get(effectiveSceneId);
    
    // 如果 scene 不存在，尝试获取 'main' scene
    if (!scene && effectiveSceneId !== 'main') {
      scene = scenes.get('main');
    }
    
    if (!scene) {
      // 自动创建 scene，使用 cachedOutlineTemplate
      scene = {
        id: effectiveSceneId,
        docIds: [],
        sectionDocLinks: {},
        customTemplate: cachedOutlineTemplate || null,
        template: cachedOutlineTemplate || defaultTemplate,
        sections: buildSectionsMap(cachedOutlineTemplate || defaultTemplate)
      };
      scenes.set(effectiveSceneId, scene);
    }
    
    // 确保 scene 使用最新的 cachedOutlineTemplate
    if (cachedOutlineTemplate && (!scene.customTemplate || !scene.customTemplate.sections?.length)) {
      scene.customTemplate = cachedOutlineTemplate;
      scene.template = cachedOutlineTemplate;
    }

    const meta = section.meta || {};
    const metaType = (meta.type || '').toString();
    const llmScript = section.llmScript || {};
    
    // 日志：输出当前大纲状态
    const tplSections = (scene.customTemplate || scene.template || cachedOutlineTemplate)?.sections || [];
    logger.info('REPLAY', `执行 section: ${metaType}`, { 
      sceneId: effectiveSceneId, 
      mode, 
      tplSectionsCount: tplSections.length,
      docsCount: docs.length,
      hasCachedTemplate: !!cachedOutlineTemplate
    });

    let status = 'done';
    let reason = '';
    let replayMode = mode;

    // 获取当前模板
    const getTemplate = () => {
      const tpl = scene.customTemplate || scene.template || cachedOutlineTemplate;
      return tpl && Array.isArray(tpl.sections) ? tpl : { id: 'empty', name: '空模板', sections: [] };
    };

    // 更新模板（同时持久化）
    const applyTemplate = (newTpl) => {
      scene.customTemplate = newTpl;
      cachedOutlineTemplate = newTpl;
      persistOutlineCache(); // 持久化
      return newTpl;
    };

    // 查找文档
    const findDoc = (docName, docId) => {
      if (docId) {
        const byId = docs.find(d => d.id === docId);
        if (byId) return byId;
      }
      if (docName) {
        const exact = docs.find(d => d.name === docName);
        if (exact) return exact;
        const lower = docName.toLowerCase();
        const partial = docs.find(d => 
          d.name.toLowerCase().includes(lower) || lower.includes(d.name.toLowerCase())
        );
        if (partial) return partial;
      }
      return null;
    };

    // 查找标题
    const findSection = (sectionId, title, tpl) => {
      if (sectionId) {
        const byId = tpl.sections.find(s => s.id === sectionId);
        if (byId) return byId;
      }
      if (title) {
        const exact = tpl.sections.find(s => s.title === title);
        if (exact) return exact;
        const partial = tpl.sections.find(s => 
          s.title?.includes(title) || title.includes(s.title || '')
        );
        if (partial) return partial;
      }
      return null;
    };

    // ========== 根据 metaType 执行对应操作 ==========
    
    if (metaType === 'dispatch_input' || section.action === '输入指令') {
      // 输入指令：直接返回 pass
      status = 'pass';
      reason = '⏭️ 跳过执行：输入指令不支持自动回放';
      
    } else if (metaType === 'edit_outline_title' || metaType === 'edit_outline_summary' || 
               metaType === 'clear_outline_summary' || section.action === '编辑标题' || 
               section.action === '编辑摘要' || section.action === '删除摘要') {
      // 编辑操作：返回 done（已执行过）
      status = 'done';
      reason = '📜 脚本 Replay Done（编辑操作已记录）';
      
    } else if (metaType === 'add_summary_to_section' || section.action === '添加摘要') {
      // 添加摘要
      try {
        const tpl = getTemplate();
        const targetSection = findSection(meta.sectionId || meta.targetSectionId, meta.targetSectionTitle, tpl);
        if (!targetSection) throw new Error('未找到目标标题');
        
        const summaries = Array.isArray(targetSection.summaries) ? [...targetSection.summaries] : [];
        summaries.push({ content: '', createdAt: Date.now() });
        
        const nextTpl = {
          ...tpl,
          sections: tpl.sections.map(s => s.id === targetSection.id ? { ...s, summaries } : s)
        };
        applyTemplate(nextTpl);
        status = 'done';
        reason = `📜 脚本 Replay Done（已添加摘要到「${targetSection.title}」）`;
      } catch (err) {
        status = 'fail';
        reason = err.message || '添加摘要失败';
      }
      
    } else if (metaType === 'remove_summary_from_section' || section.action === '删除摘要项') {
      // 删除摘要项
      try {
        const tpl = getTemplate();
        const targetSection = findSection(meta.sectionId, meta.targetSectionTitle, tpl);
        if (!targetSection) throw new Error('未找到目标标题');
        
        const summaryIndex = meta.summaryIndex ?? 0;
        const summaries = Array.isArray(targetSection.summaries) ? [...targetSection.summaries] : [];
        if (summaryIndex >= 0 && summaryIndex < summaries.length) {
          summaries.splice(summaryIndex, 1);
        }
        
        const nextTpl = {
          ...tpl,
          sections: tpl.sections.map(s => s.id === targetSection.id ? { ...s, summaries } : s)
        };
        applyTemplate(nextTpl);
        status = 'done';
        reason = `📜 脚本 Replay Done（已删除摘要项）`;
      } catch (err) {
        status = 'fail';
        reason = err.message || '删除摘要项失败';
      }
      
    } else if (metaType === 'merge_summaries_in_section' || section.action === '合并摘要') {
      // 合并摘要
      try {
        const tpl = getTemplate();
        const targetSection = findSection(meta.sectionId, meta.targetSectionTitle, tpl);
        if (!targetSection) throw new Error('未找到目标标题');
        
        const summaries = Array.isArray(targetSection.summaries) ? targetSection.summaries : [];
        const mergedContent = summaries.map(s => (s.content || '').trim()).filter(Boolean).join('\n\n');
        
        const nextTpl = {
          ...tpl,
          sections: tpl.sections.map(s => s.id === targetSection.id ? { ...s, summary: mergedContent, summaries: undefined } : s)
        };
        applyTemplate(nextTpl);
        status = 'done';
        reason = `📜 脚本 Replay Done（已合并 ${summaries.length} 个摘要）`;
      } catch (err) {
        status = 'fail';
        reason = err.message || '合并摘要失败';
      }
      
    } else if (metaType === 'add_doc' || metaType.startsWith('add_doc')) {
      // 添加文档（与后管端逻辑一致：找不到时跳过而非失败）
      const docName = meta.docName || meta.selectedDocName || '';
      let doc = findDoc(docName, meta.docId);
      
      // 如果没找到且有 replayDirPath，尝试上传
      if (!doc && replayDirPath && docName) {
        const filePath = path.join(replayDirPath, docName);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          const newDoc = {
            id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: docName,
            content,
            uploadedAt: Date.now()
          };
          docs.push(newDoc);
          persistDocs();
          doc = newDoc;
        }
      }
      
      // 【重要】找不到文档时跳过，而不是失败（与后管端逻辑一致）
      if (!doc) {
        status = 'pass';
        reason = `⏭️ 跳过执行：未找到文档「${docName || '(空)'}」`;
        replayMode = 'skipped';
      } else {
        const docIds = Array.from(new Set([...(scene.docIds || []), doc.id]));
        scene.docIds = docIds;
        
        status = 'done';
        reason = `📜 脚本 Replay Done（已添加文档：${doc.name}）`;
      }
      
    } else if (metaType === 'delete_doc' || metaType === 'remove_doc') {
      // 删除文档
      try {
        const docName = meta.docName || '';
        const doc = findDoc(docName, meta.docId);
        if (doc) {
          const idx = docs.findIndex(d => d.id === doc.id);
          if (idx >= 0) {
            docs.splice(idx, 1);
            persistDocs();
          }
          scene.docIds = (scene.docIds || []).filter(id => id !== doc.id);
        }
        status = 'done';
        reason = `📜 脚本 Replay Done（已删除文档）`;
      } catch (err) {
        status = 'fail';
        reason = err.message || '删除文档失败';
      }
      
    } else if (metaType === 'outline_extract' || metaType.startsWith('outline_extract')) {
      // 大纲抽取：这个需要 AI 处理，返回 pass 让前端处理
      status = 'pass';
      reason = '⏭️ 大纲抽取需要 AI 处理，请在前端执行';
      
    } else if (metaType === 'copy_full_to_summary' || section.action === '复制全文到摘要') {
      // 复制全文到摘要（与后管端逻辑一致：找不到时跳过而非失败）
      const docName = meta.docName || llmScript?.docName || '';
      let doc = findDoc(docName, meta.docId);
      
      // 尝试从 replayDir 加载
      if (!doc && replayDirPath && docName) {
        const filePath = path.join(replayDirPath, docName);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          const newDoc = {
            id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: docName,
            content,
            uploadedAt: Date.now()
          };
          docs.push(newDoc);
          persistDocs();
          doc = newDoc;
        }
      }
      
      // 【重要】找不到文档时跳过，而不是失败（与后管端逻辑一致）
      if (!doc) {
        status = 'pass';
        reason = `⏭️ 跳过执行：未在文档列表中找到「${docName || '(空)'}」，无法满足录制时的输入源要求`;
        replayMode = 'skipped';
      } else {
        const tpl = getTemplate();
        const targetTitle = meta.targetSectionTitle || meta.targetSection?.title || llmScript?.targetSectionTitle || '';
        
        // LLM 模式：语义匹配
        let targetSection = null;
        if (mode === 'llm' && targetTitle) {
          try {
            const candidates = tpl.sections.map(s => ({ id: s.id, level: s.level, title: s.title }));
            const matchRes = await callQwenSemanticMatch({
              taskType: 'find_outline_section',
              recordedInfo: { targetTitle, description: '复制全文到摘要' },
              candidates
            });
            if (matchRes.matchedId) {
              targetSection = tpl.sections.find(s => s.id === matchRes.matchedId);
            }
          } catch (e) {
            logger.warn('REPLAY', '语义匹配失败，回退到精确匹配', { error: e.message });
          }
        }
        
        // 回退到精确匹配
        if (!targetSection) {
          targetSection = findSection(meta.sectionId, targetTitle, tpl);
        }
        
        // 【重要】找不到目标位置时跳过，而不是失败（与后管端逻辑一致）
        if (!targetSection) {
          status = 'pass';
          reason = `⏭️ 跳过执行：当前大纲中未找到相似目标位置「${targetTitle || '(空)'}」`;
          replayMode = 'skipped';
        } else {
          const content = (doc.content || '').toString().trim();
          const nextTpl = {
            ...tpl,
            sections: tpl.sections.map(s => s.id === targetSection.id ? { ...s, summary: content } : s)
          };
          applyTemplate(nextTpl);
          
          status = 'done';
          reason = mode === 'llm' 
            ? `🤖 大模型 Replay Done（已将「${doc.name}」复制到「${targetSection.title}」）`
            : `📜 脚本 Replay Done（已将「${doc.name}」复制到「${targetSection.title}」）`;
          replayMode = mode;
        }
      }
      
    } else if (metaType === 'outline_link_doc' || section.action === '关联文档') {
      // 关联文档（与后管端逻辑一致：找不到时跳过而非失败）
      const docName = meta.docName || llmScript?.docName || '';
      let doc = findDoc(docName, meta.docId);
      
      if (!doc && replayDirPath && docName) {
        const filePath = path.join(replayDirPath, docName);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          const newDoc = {
            id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: docName,
            content,
            uploadedAt: Date.now()
          };
          docs.push(newDoc);
          persistDocs();
          doc = newDoc;
        }
      }
      
      // 【重要】找不到文档时跳过，而不是失败（与后管端逻辑一致）
      if (!doc) {
        status = 'pass';
        reason = `⏭️ 跳过执行：未找到相似文档「${docName || '(空)'}」`;
        replayMode = 'skipped';
      } else {
        const tpl = getTemplate();
        const targetTitle = meta.targetSectionTitle || meta.targetSection?.title || llmScript?.targetSectionTitle || '';
        
        // LLM 模式：语义匹配
        let targetSection = null;
        if (mode === 'llm' && targetTitle) {
          try {
            const candidates = tpl.sections.map(s => ({ id: s.id, level: s.level, title: s.title }));
            const matchRes = await callQwenSemanticMatch({
              taskType: 'find_outline_section',
              recordedInfo: { targetTitle, description: '关联文档' },
              candidates
            });
            if (matchRes.matchedId) {
              targetSection = tpl.sections.find(s => s.id === matchRes.matchedId);
            }
          } catch (e) {
            logger.warn('REPLAY', '语义匹配失败，回退到精确匹配', { error: e.message });
          }
        }
        
        if (!targetSection) {
          targetSection = findSection(meta.sectionId, targetTitle, tpl);
        }
        
        // 【重要】找不到目标位置时跳过，而不是失败（与后管端逻辑一致）
        if (!targetSection) {
          status = 'pass';
          reason = `⏭️ 跳过执行：当前大纲中未找到相似目标位置「${targetTitle || '(空)'}」`;
          replayMode = 'skipped';
        } else {
          const links = scene.sectionDocLinks || {};
          const sectionLinks = links[targetSection.id] || [];
          if (!sectionLinks.includes(doc.id)) {
            links[targetSection.id] = [...sectionLinks, doc.id];
            scene.sectionDocLinks = links;
          }
          
          status = 'done';
          reason = mode === 'llm'
            ? `🤖 大模型 Replay Done（已将「${doc.name}」关联到「${targetSection.title}」）`
            : `📜 脚本 Replay Done（已将「${doc.name}」关联到「${targetSection.title}」）`;
          replayMode = mode;
        }
      }
      
    } else if (metaType === 'outline_unlink_doc' || section.action === '取消关联') {
      // 取消关联
      try {
        const tpl = getTemplate();
        const targetSection = findSection(meta.sectionId, meta.targetSectionTitle, tpl);
        if (!targetSection) throw new Error('未找到目标标题');
        
        const docName = meta.docName || '';
        const doc = findDoc(docName, meta.docId);
        
        if (doc) {
          const links = scene.sectionDocLinks || {};
          const sectionLinks = (links[targetSection.id] || []).filter(id => id !== doc.id);
          if (sectionLinks.length > 0) {
            links[targetSection.id] = sectionLinks;
          } else {
            delete links[targetSection.id];
          }
          scene.sectionDocLinks = links;
        }
        
        status = 'done';
        reason = `📜 脚本 Replay Done（已取消关联）`;
      } catch (err) {
        status = 'fail';
        reason = err.message || '取消关联失败';
      }
      
    } else if (metaType === 'insert_to_summary' || metaType === 'insert_to_summary_multi' || 
               section.action === '填入摘要' || section.action === '添入摘要') {
      // 填入摘要 - 完整复制后管端逻辑
      try {
        const tpl = getTemplate();
        let ids = Array.isArray(meta.targetSectionIds) ? meta.targetSectionIds : 
                  (meta.sectionId ? [meta.sectionId] : []);
        const targetTitles = Array.isArray(meta.selectedSectionTitles) ? meta.selectedSectionTitles : 
                            (Array.isArray(meta.destinations) ? meta.destinations.map(d => d?.sectionTitle).filter(Boolean) : []);
        
        // 获取要填入的内容
        let inputText = '';
        if (Array.isArray(meta.inputs)) {
          const selInput = meta.inputs.find(x => x?.kind === 'selection');
          inputText = (selInput?.text || selInput?.textExcerpt || meta?.outputs?.insertedExcerpt || '').toString().trim();
        }
        if (!inputText) {
          inputText = (meta?.outputs?.insertedExcerpt || meta?.outputs?.summary || '').toString().trim();
        }
        
        if (!inputText) throw new Error('无填入内容');
        
        // 获取 AI 指导
        const aiGuidance = llmScript?.aiGuidance || meta?.aiGuidance || '';
        const specialRequirements = llmScript?.specialRequirements || '';
        
        // LLM 模式：语义匹配目标位置
        let matchedIds = [];
        if (mode === 'llm' && targetTitles.length > 0) {
          const candidates = tpl.sections.map(s => ({ id: s.id, level: s.level, title: s.title }));
          for (const title of targetTitles) {
            const matchRes = await callQwenSemanticMatch({
              taskType: 'find_outline_section',
              recordedInfo: { targetTitle: title, description: '填入摘要', aiGuidance },
              candidates
            });
            if (matchRes.matchedId) {
              matchedIds.push(matchRes.matchedId);
            }
          }
        }
        
        // 合并匹配结果
        const finalIds = [...new Set([...matchedIds, ...ids])];
        if (finalIds.length === 0) throw new Error('未找到目标标题');
        
        // ========== AI 处理逻辑（与后管端完全一致）==========
        let processedText = inputText;
        let usedLLM = false;
        
        if (mode === 'llm' && QWEN_API_KEY) {
          // 检查是否包含计算公式
          const hasCalculation = aiGuidance && (
            aiGuidance.includes('计算') ||
            aiGuidance.includes('公式') ||
            aiGuidance.includes('{{') ||
            /\d+\s*[+\-*/]\s*\d+/.test(aiGuidance) ||
            /次数|总数|合计|总计/.test(aiGuidance)
          );
          
          logger.info('REPLAY', `insert_to_summary AI处理`, { hasCalculation, hasGuidance: !!aiGuidance });
          
          let processPrompt;
          if (hasCalculation) {
            // 计算类任务：使用专门的计算 prompt
            processPrompt = `你是一个数据计算助手。请严格按照用户的计算指导，从原始内容中提取数据并进行计算。

【原始内容（从中提取数据）】
${inputText}

【用户的计算指导】
${aiGuidance}

${specialRequirements ? `【特殊要求】\n${specialRequirements}` : ''}

【执行步骤】
1. 仔细阅读【用户的计算指导】，理解需要提取哪些数值
2. 从【原始内容】中找到并提取这些数值（注意：数值可能以"XX次"、"XX个"等形式出现）
3. 按照指导中的公式进行数学计算
4. 按照指导中的输出格式生成最终结果

【计算示例】
如果指导说："XXX = 预警调度次数 + 电台调度次数 + 视频巡检次数 + 实地检查次数"
原始内容是："开展预警调度指挥68次，对一线带班领导电台调度89次，视频巡检373次，实地检查岗位29个"
那么：
- 提取：预警调度=68, 电台调度=89, 视频巡检=373, 实地检查=29
- 计算：68 + 89 + 373 + 29 = 559
- 输出："政治中心区调度检查 559 次"（或按指导的输出格式）

【重要】
- 必须执行数学计算，不能简单复制原始内容
- 确保数值提取准确
- 输出必须包含计算结果

请直接返回计算结果，不要包含解释说明。`;
          } else if (aiGuidance) {
            // 有指导的处理任务
            processPrompt = `你是一个智能数据处理助手。请按照用户的指导要求，对提取的原始内容进行处理。

【原始内容】
${inputText}

【用户的处理指导】
${aiGuidance}

${specialRequirements ? `【特殊要求】\n${specialRequirements}` : ''}

【任务】
严格按照用户的处理指导对原始内容进行处理。例如：
- 如果指导是"剥离职务头衔，只保留姓名"，则需要识别出所有人名，去掉职务，只返回纯净的姓名
- 如果指导是"提取关键信息"，则需要归纳总结
- 如果指导是"格式化输出"，则需要按要求格式化

【重要】
- 必须按照指导要求处理，不能简单复制原始内容
- 处理结果应该简洁明了

请直接返回处理后的结果，不要包含任何解释说明。`;
          }
          
          // 调用 AI 处理
          if (processPrompt) {
            try {
              const aiResp = await fetch(QWEN_ENDPOINT, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${QWEN_API_KEY}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  model: QWEN_MODEL,
                  messages: [{ role: 'user', content: processPrompt }],
                  max_tokens: 1000,
                  temperature: 0.3
                })
              });
              
              if (aiResp.ok) {
                const aiData = await aiResp.json();
                const aiContent = aiData?.choices?.[0]?.message?.content || '';
                if (aiContent.trim()) {
                  processedText = aiContent.trim();
                  usedLLM = true;
                  logger.info('REPLAY', `AI处理成功`, { originalLen: inputText.length, processedLen: processedText.length });
                }
              }
            } catch (aiErr) {
              logger.warn('REPLAY', `AI处理失败，使用原始内容`, { error: aiErr.message });
            }
          }
        }
        
        // 更新摘要（替换模式）
        const nextTpl = {
          ...tpl,
          sections: tpl.sections.map(s => finalIds.includes(s.id) ? { ...s, summary: processedText } : s)
        };
        applyTemplate(nextTpl);
        
        status = 'done';
        reason = usedLLM
          ? `🤖 大模型 Replay Done（已写入摘要：${finalIds.length} 项）`
          : `📜 脚本 Replay Done（已写入摘要：${finalIds.length} 项）`;
        replayMode = usedLLM ? 'llm' : 'script';
      } catch (err) {
        status = 'fail';
        reason = err.message || '填入摘要失败';
      }
      
    } else if (metaType === 'delete_outline_section' || section.action === '删除标题') {
      // 删除标题
      try {
        const tpl = getTemplate();
        const targetTitle = meta.targetSection?.title || meta.targetSectionTitle || '';
        const targetSection = findSection(meta.sectionId, targetTitle, tpl);
        
        if (!targetSection) throw new Error(targetTitle ? `未找到标题「${targetTitle}」` : '未指定目标标题');
        
        const baseLevel = targetSection.level || 1;
        const targetIdx = tpl.sections.findIndex(s => s.id === targetSection.id);
        const idsToRemove = [targetSection.id];
        
        // 找出下级标题
        for (let i = targetIdx + 1; i < tpl.sections.length; i++) {
          const lvl = tpl.sections[i].level || 1;
          if (lvl <= baseLevel) break;
          idsToRemove.push(tpl.sections[i].id);
        }
        
        const nextTpl = {
          ...tpl,
          sections: tpl.sections.filter(s => !idsToRemove.includes(s.id))
        };
        applyTemplate(nextTpl);
        
        status = 'done';
        reason = `📜 脚本 Replay Done（已删除标题「${targetSection.title}」，共 ${idsToRemove.length} 条）`;
      } catch (err) {
        status = 'fail';
        reason = err.message || '删除标题失败';
      }
      
    } else if (metaType === 'add_outline_section' || section.action === '新增标题') {
      // 新增标题
      try {
        const tpl = getTemplate();
        const newTitle = meta.newSection?.title || meta.newTitle || '新标题';
        const newLevel = meta.newSection?.level || meta.level || 1;
        
        const newSection = {
          id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: newTitle,
          level: newLevel,
          summary: '',
          hint: ''
        };
        
        const nextTpl = {
          ...tpl,
          sections: [...tpl.sections, newSection]
        };
        applyTemplate(nextTpl);
        
        status = 'done';
        reason = `📜 脚本 Replay Done（已新增标题「${newTitle}」）`;
      } catch (err) {
        status = 'fail';
        reason = err.message || '新增标题失败';
      }
      
    } else if (metaType === 'outline_clear' || section.action === '清除大纲') {
      // 清除大纲
      try {
        const emptyTpl = { id: 'template_empty', name: '空模板', sections: [] };
        applyTemplate(emptyTpl);
        scene.sectionDocLinks = {};
        
        status = 'done';
        reason = `📜 脚本 Replay Done（已清除大纲）`;
      } catch (err) {
        status = 'fail';
        reason = err.message || '清除大纲失败';
      }
      
    } else if (metaType === 'restore_history_outline' || section.action === '历史大纲选取') {
      // 恢复历史大纲：需要前端处理
      status = 'pass';
      reason = '⏭️ 历史大纲恢复需要前端处理';
      
    } else if (metaType === 'dispatch' || metaType === 'dispatch_multi_summary' || 
               metaType === 'execute_instruction' || section.action === '执行指令') {
      // 执行指令
      try {
        const instructions = meta.instructions || meta.promptContent || '';
        if (!instructions) throw new Error('无指令内容');
        
        const tpl = getTemplate();
        const targetIds = Array.isArray(meta.targetSectionIds) ? meta.targetSectionIds :
                         Array.isArray(meta.selectedSectionIds) ? meta.selectedSectionIds : [];
        
        // 获取目标内容
        let docContent = '';
        if (Array.isArray(meta.inputs)) {
          const docInput = meta.inputs.find(x => x?.kind === 'doc_preview' || x?.kind === 'doc_resource');
          docContent = docInput?.text || docInput?.textExcerpt || '';
        }
        
        // 获取大纲片段
        const outlineSegments = targetIds.map(id => {
          const sec = tpl.sections.find(s => s.id === id);
          return sec ? { id: sec.id, title: sec.title, summary: sec.summary || '' } : null;
        }).filter(Boolean);
        
        // 调用 dispatch API
        const dispatchResult = await callQwenDispatch({
          instructions,
          scene,
          docContent,
          outlineSegments
        });
        
        // 应用结果
        if (dispatchResult.detail && targetIds.length > 0) {
          const nextTpl = {
            ...tpl,
            sections: tpl.sections.map(s => targetIds.includes(s.id) ? { ...s, summary: dispatchResult.detail } : s)
          };
          applyTemplate(nextTpl);
        }
        
        status = 'done';
        reason = `🤖 大模型 Replay Done（已执行指令）`;
        replayMode = 'llm';
      } catch (err) {
        status = 'fail';
        reason = err.message || '执行指令失败';
      }
      
    } else if (metaType === 'final_generate' || section.action === '最终文档生成') {
      // 最终文档生成：不支持自动回放
      status = 'pass';
      reason = '⏭️ 最终文档生成不支持自动回放';
      
    } else if (!metaType) {
      status = 'fail';
      reason = '未记录可执行的回放元信息';
      
    } else {
      status = 'fail';
      reason = `暂不支持执行动作：${metaType}`;
    }

    logger.info('REPLAY', `执行结果: ${status}`, { reason, replayMode });
    
    res.json({
      status,
      reason,
      replayMode,
      template: scene.customTemplate || scene.template
    });
    
  } catch (err) {
    console.error('[Replay Execute Error]', err);
    res.status(500).json({ error: err.message || "Replay 执行失败" });
  }
});


app.post("/api/dispatch", async (req, res) => {

  try {

    const { sceneId, instructions, docContent, outlineSegments, systemPrompt } = req.body || {};

    const scene = scenes.get(sceneId);

    if (!scene) return res.status(404).json({ error: "scene 不存在" });

    if (!instructions || typeof instructions !== "string") {

      return res.status(400).json({ error: "instructions 必须为字符串" });

    }

    const usedModel = !!QWEN_API_KEY;
    console.log('[DEBUG] /api/dispatch called:', { 
      usedModel, 
      hasApiKey: !!QWEN_API_KEY,
      apiKeyPrefix: QWEN_API_KEY ? QWEN_API_KEY.substring(0, 6) : 'none'
    });

    const result = await callQwenDispatch({ instructions, scene, docContent, outlineSegments, systemPrompt });
    
    console.log('[DEBUG] /api/dispatch result:', { 
      summary: result.summary?.substring(0, 50),
      hasDetail: !!result.detail,
      editsCount: result.edits?.length || 0
    });

    res.json({ ...result, usedModel });

  } catch (err) {

    console.error(err);

    res.status(500).json({ error: err.message || "指令解析失败" });

  }

});



async function callQwenFinal({ text, systemPrompt }) {

  const sysPrompt =

    typeof systemPrompt === "string" && systemPrompt.trim()

      ? systemPrompt.trim()

      : "你是中文写作与排版助手。请将用户提供的草稿整理成结构清晰、语言通顺的最终文档，尽量保留原有信息，不要杜撰。严格输出中文 Markdown 正文，不要解释。";



  const messages = [

    { role: "system", content: sysPrompt },

    { role: "user", content: text || "" },

  ];



  if (!QWEN_API_KEY) {

    return { text: text || "" };

  }



  const resp = await fetch(QWEN_ENDPOINT, {

    method: "POST",

    headers: {

      "Content-Type": "application/json",

      Authorization: `Bearer ${QWEN_API_KEY}`,

    },

    body: JSON.stringify({

      model: QWEN_MODEL,

      messages,

      temperature: 0.2,

    }),

  });

  if (!resp.ok) {

    const t = await resp.text();

    throw new Error(`Qwen 最终文档生成失败 ${resp.status}: ${t}`);

  }

  const data = await resp.json();

  const content = data?.choices?.[0]?.message?.content;

  return { text: (content || "").toString() };

}



app.post("/api/final/generate", async (req, res) => {

  try {

    const text = req.body?.text;

    const systemPrompt = req.body?.systemPrompt;

    if (typeof text !== "string") return res.status(400).json({ error: "text 必须为字符串" });

    const usedModel = !!QWEN_API_KEY;

    const result = await callQwenFinal({ text, systemPrompt });

    res.json({ ...result, usedModel });

  } catch (err) {

    console.error(err);

    res.status(500).json({ error: err.message || "最终文档生成失败" });

  }

});



app.post("/api/template/auto", async (req, res) => {

  try {

    const text = req.body?.text || "";

    if (!text.trim()) return res.status(400).json({ error: "text 不能为空" });

    const prompt = req.body?.prompt;

    const systemPrompt = req.body?.systemPrompt;

    const tpl = await callQwenOutline(text, {

      userPrompt: typeof prompt === "string" ? prompt : undefined,

      systemPrompt: typeof systemPrompt === "string" ? systemPrompt : undefined,

    });

    res.json({ template: tpl, usedModel: !!QWEN_API_KEY });

  } catch (err) {

    const message = err?.message || "提纲生成失败";

    const parsed = safeJsonParse(message.split(": ").slice(1).join(": ")) || safeJsonParse(message);

    if (isDataInspectionFailed(parsed || message)) {

      const tpl = buildHeuristicOutlineTemplate(req.body?.text || "");

      return res.json({

        template: tpl,

        usedModel: false,

        blocked: true,

        blockedCode: parsed?.error?.code || parsed?.code || "data_inspection_failed",

        blockedMessage:

          parsed?.error?.message ||

          parsed?.message ||

          "Input data may contain inappropriate content. Please redact and retry if you need model output.",

      });

    }

    console.error(err);

    res.status(500).json({ error: message });

  }

});



app.post("/api/docs", (req, res) => {

  try {

    const { name, content } = req.body || {};



    // ========== P1: 输入验证 ==========

    const validated = validateDocInput(name, content);



    // ========== P1: 内存管理 ==========

    memoryManager.cleanupOldDocs(docs, MAX_DOCS);



    const key = validated.name.toLowerCase();

    const existingIdx = docs.findIndex((d) => (d?.name || "").trim().toLowerCase() === key);



    if (existingIdx !== -1) {

      docs[existingIdx] = { ...docs[existingIdx], name: validated.name, content: validated.content };

      logger.info('DOCS', `文档已更新: ${validated.name}`);

      persistDocs();

      return res.status(200).json({ doc: docs[existingIdx], overwritten: true });

    }



    const doc = { id: randomUUID(), name: validated.name, content: validated.content };

    docs.push(doc);

    logger.info('DOCS', `新建文档: ${validated.name}`);

    persistDocs();

    return res.status(201).json({ doc, overwritten: false });

  } catch (err) {

    logger.error('DOCS_POST', '创建文档失败', err);

    return res.status(400).json({ error: err.message || "创建文档失败" });

  }

});



app.get("/api/docs", (_req, res) => {

  res.json({ docs });

});



app.delete("/api/docs/:id", (req, res) => {

  const { id } = req.params;

  const idx = docs.findIndex((d) => d.id === id);

  if (idx === -1) return res.status(404).json({ error: "doc 不存在" });

  docs.splice(idx, 1);

  persistDocs();

  // 同步从所有 scene 中移除关联

  scenes.forEach((s) => {

    s.docIds = (s.docIds || []).filter((dId) => dId !== id);

    const links = s.sectionDocLinks || {};

    Object.keys(links).forEach((secId) => {

      links[secId] = (links[secId] || []).filter((dId) => dId !== id);

      if (!links[secId].length) delete links[secId];

    });

    s.sectionDocLinks = links;

  });

  res.json({ ok: true });

});



app.patch("/api/docs/:id", (req, res) => {

  try {

    const { id } = req.params;

    const doc = docs.find((d) => d.id === id);

    if (!doc) return res.status(404).json({ error: "doc 不存在" });



    const content = req.body?.content;

    const name = req.body?.name;



    // ========== P1: 输入验证 ==========

    if (content !== undefined) {

      if (typeof content !== "string") {

        return res.status(400).json({ error: "content 必须为字符串" });

      }

      if (Buffer.byteLength(content, 'utf8') > MAX_CONTENT_SIZE) {

        return res.status(400).json({ error: `content 大小不能超过 ${(MAX_CONTENT_SIZE / 1024 / 1024).toFixed(1)}MB` });

      }

    }



    if (name !== undefined) {

      if (typeof name !== "string") {

        return res.status(400).json({ error: "name 必须为字符串" });

      }

      if (name.length > MAX_DOC_NAME_LENGTH) {

        return res.status(400).json({ error: `name 长度不能超过 ${MAX_DOC_NAME_LENGTH} 字符` });

      }

    }



    if (name !== undefined) doc.name = name.trim() || doc.name;

    if (content !== undefined) doc.content = content;



    logger.info('DOCS', `文档已更新: ${doc.name}`);

    persistDocs();

    res.json({ doc });

  } catch (err) {

    logger.error('DOCS_PATCH', '更新文档失败', err);

    res.status(400).json({ error: err.message || "更新文档失败" });

  }

});



app.post("/api/scene", (req, res) => {

  try {

    const docIds = Array.isArray(req.body?.docIds) ? req.body.docIds : [];

    const scene = createScene(docIds);

    res.status(201).json({ scene });

  } catch (err) {

    logger.error('SCENE_POST', '创建场景失败', err);

    res.status(400).json({ error: err.message || "创建场景失败" });

  }

});



app.get("/api/scene/:id", (req, res) => {
  let scene = scenes.get(req.params.id);

  // 如果 scene 不存在，自动创建一个新的（保持数据一致性）
  if (!scene) {
    scene = {
      id: req.params.id,
      docIds: [],
      sectionDocLinks: {},
      customTemplate: cachedOutlineTemplate || null,
      template: cachedOutlineTemplate || defaultTemplate,
      sections: buildSectionsMap(cachedOutlineTemplate || defaultTemplate)
    };
    scenes.set(scene.id, scene);
    logger.info('SCENE', `自动创建场景: ${scene.id}`);
  }

  res.json({ scene });
});



app.patch("/api/scene/:id", (req, res) => {
  let scene = scenes.get(req.params.id);

  // 如果 scene 不存在，自动创建
  if (!scene) {
    scene = {
      id: req.params.id,
      docIds: [],
      sectionDocLinks: {},
      customTemplate: cachedOutlineTemplate || null,
      template: cachedOutlineTemplate || defaultTemplate,
      sections: buildSectionsMap(cachedOutlineTemplate || defaultTemplate)
    };
    scenes.set(scene.id, scene);
    logger.info('SCENE', `PATCH 时自动创建场景: ${scene.id}`);
  }

  if (Array.isArray(req.body?.docIds)) {
    scene.docIds = req.body.docIds;
  }

  if (req.body?.sectionDocLinks && typeof req.body.sectionDocLinks === "object") {

    const cleaned = {};

    Object.entries(req.body.sectionDocLinks).forEach(([secId, list]) => {

      if (Array.isArray(list)) {

        const uniq = Array.from(new Set(list.filter((v) => typeof v === "string" && v)));

        if (uniq.length) cleaned[secId] = uniq;

      }

    });

    scene.sectionDocLinks = cleaned;

  }

  res.json({ scene });

});



app.patch("/api/scene/:id/section/:sectionId", (req, res) => {
  let scene = scenes.get(req.params.id);

  if (!scene) {
    scene = {
      id: req.params.id,
      docIds: [],
      sectionDocLinks: {},
      customTemplate: cachedOutlineTemplate || null,
      template: cachedOutlineTemplate || defaultTemplate,
      sections: buildSectionsMap(cachedOutlineTemplate || defaultTemplate)
    };
    scenes.set(scene.id, scene);
  }

  const { sectionId } = req.params;

  const slot = scene.sections[sectionId];

  if (!slot) return res.status(404).json({ error: "section 不存在" });

  const content = req.body?.content ?? "";

  slot.content = content;

  slot.status = content.trim() ? "filled" : "empty";

  res.json({ scene });

});



app.post("/api/scene/:id/apply-template", (req, res) => {
  let scene = scenes.get(req.params.id);

  if (!scene) {
    scene = {
      id: req.params.id,
      docIds: [],
      sectionDocLinks: {},
      customTemplate: null,
      template: defaultTemplate,
      sections: buildSectionsMap(defaultTemplate)
    };
    scenes.set(scene.id, scene);
  }

  const tpl = req.body?.template;

  if (!tpl || !Array.isArray(tpl.sections)) {

    return res.status(400).json({ error: "template.sections 不能为空" });

  }

  const oldSections = scene.sections || {};

  scene.customTemplate = {

    id: tpl.id || "template_auto",

    name: tpl.name || "自动模板",

    sections: tpl.sections.map((s, idx) => ({

      id: s.id || toSlug(s.title || `sec_${idx + 1}`),

      title: s.title || `章节${idx + 1}`,

      hint: s.hint || "补充写作提示",

      summary: s.summary || "",

      // 保留多摘要数组 summaries
      summaries: Array.isArray(s.summaries) ? s.summaries : undefined,

      level: Number.isInteger(s.level) ? Math.min(5, Math.max(1, s.level)) : 1,

    })),

  };



  // Rebuild sections map but preserve existing content

  const newSections = {};

  scene.customTemplate.sections.forEach(s => {

    if (oldSections[s.id]) {

      newSections[s.id] = oldSections[s.id];

    } else {

      newSections[s.id] = { status: "empty", content: "" };

    }

  });

  scene.sections = newSections;



  scene.sectionDocLinks = scene.sectionDocLinks || {};

  // 重要：同步更新全局大纲缓存，确保两个工作台共享同一大纲状态
  cachedOutlineTemplate = scene.customTemplate;
  persistOutlineCache(); // 持久化
  logger.info('OUTLINE_CACHE', 'apply-template 同步更新大纲缓存');

  res.json({ scene, template: scene.customTemplate });

});



async function handleGenerateLike(req, res, mode = "generate") {
  try {
    let scene = scenes.get(req.params.id);

    if (!scene) {
      scene = {
        id: req.params.id,
        docIds: [],
        sectionDocLinks: {},
        customTemplate: cachedOutlineTemplate || null,
        template: cachedOutlineTemplate || defaultTemplate,
        sections: buildSectionsMap(cachedOutlineTemplate || defaultTemplate)
      };
      scenes.set(scene.id, scene);
    }

    const { sectionId } = req.params;

    const slot = scene.sections[sectionId];

    if (!slot) return res.status(404).json({ error: "section 不存在" });



    const tpl = pickTemplate(scene);

    const section = tpl.sections.find((s) => s.id === sectionId);

    if (!section) return res.status(404).json({ error: "section 不在模板中" });



    const selectedDocs = pickDocs(req.body?.docIds, scene);

    if (!selectedDocs.length) {

      return res.status(400).json({ error: "当前 scene 未关联文档" });

    }



    const content = await callQwen({

      section,

      documents: selectedDocs,

      mode,

      currentContent: slot.content || "",

    });

    slot.content = content;

    slot.status = "filled";

    res.json({ scene });

  } catch (err) {

    console.error(err);

    res.status(500).json({ error: err.message || "生成失败" });

  }

}



app.post("/api/scene/:id/section/:sectionId/generate", (req, res) =>

  handleGenerateLike(req, res, "generate")

);

app.post("/api/scene/:id/section/:sectionId/improve", (req, res) =>

  handleGenerateLike(req, res, "improve")

);



// ========== 布局编辑 API (SOP Workbench) ==========





app.get("/api/layout", (req, res) => {

  res.json({ layout: layoutConfig });

});



app.post("/api/layout", (req, res) => {

  try {

    const layout = req.body?.layout;

    const validationError = validateLayoutPayload(layout);

    if (validationError) {

      return res.status(400).json({ error: validationError });

    }



    if (!persistLayoutToDisk(layout)) {

      return res.status(500).json({ error: "保存布局失败" });

    }



    layoutConfig = layout;

    logger.info("LAYOUT", "布局已更新", layoutConfig);

    res.json({ ok: true, layout: layoutConfig });

  } catch (err) {

    logger.error("LAYOUT_POST", "保存布局失败", err);

    res.status(500).json({ error: err.message || "保存布局失败" });

  }

});



// ========== 按钮配置 API ==========

app.get("/api/buttons", (req, res) => {

  res.json({ buttons: buttonConfig });

});



app.post("/api/buttons", (req, res) => {

  try {

    const buttons = req.body?.buttons;

    const validationError = validateButtonsPayload(buttons);

    if (validationError) {

      return res.status(400).json({ error: validationError });

    }



    if (!persistButtonsToDisk(buttons)) {

      return res.status(500).json({ error: "保存按钮配置失败" });

    }



    buttonConfig = buttons;

    logger.info("BUTTONS", "按钮配置已更新");

    res.json({ ok: true, buttons: buttonConfig });

  } catch (err) {

    logger.error("BUTTONS_POST", "保存按钮配置失败", err);

    res.status(500).json({ error: err.message || "保存按钮配置失败" });

  }

});

// ========== P3: Persistence APIs ==========



const CONTENT_BLOCKS_PATH = path.join(DATA_DIR, "content-blocks.json");

const DELETED_BLOCKS_PATH = path.join(DATA_DIR, "deleted-blocks.json");

const GLOBAL_BUTTONS_PATH = path.join(DATA_DIR, "global-buttons.json");

const HEADER_TITLES_PATH = path.join(DATA_DIR, "header-titles.json");

const LAYOUT_SIZE_PATH = path.join(DATA_DIR, "layout-size.json");

const LLM_BUTTONS_PATH = path.join(DATA_DIR, "llm-buttons.json");



app.get("/api/config/all", (_req, res) => {

  try {

    const layout = readJsonFile(LAYOUT_STATE_PATH); // Don't fallback to DEFAULT here, let client decide

    const buttons = readJsonFile(BUTTON_STATE_PATH);

    const globalButtons = readJsonFile(GLOBAL_BUTTONS_PATH);

    const llmButtons = readJsonFile(LLM_BUTTONS_PATH);

    const headerTitles = readJsonFile(HEADER_TITLES_PATH);

    const layoutSize = readJsonFile(LAYOUT_SIZE_PATH);

    const contentBlocks = readJsonFile(CONTENT_BLOCKS_PATH);

    const deletedBlocks = readJsonFile(DELETED_BLOCKS_PATH);

    const legacyGlobalButtons = !globalButtons && buttons && Array.isArray(buttons.activeButtons) ? buttons : null;



    res.json({

      layout: layout || null,

      buttons: buttons || null,

      globalButtons: globalButtons || legacyGlobalButtons || null,

      llmButtons: llmButtons || null,

      headerTitles: headerTitles || null,

      layoutSize: layoutSize || null,

      contentBlocks: contentBlocks || null,

      deletedBlocks: deletedBlocks || null

    });

  } catch (err) {

    logger.error("CONFIG", "Failed to load config", err);

    res.status(500).json({ error: "Failed to load config" });

  }

});



app.post("/api/config/save", (req, res) => {

  try {

    const {

      layout,

      buttons,

      contentBlocks,

      deletedBlocks,

      globalButtons,

      headerTitles,

      layoutSize,

      llmButtons

    } = req.body;



    if (layout) writeJsonFile(LAYOUT_STATE_PATH, layout);

    if (buttons) {

      const isGlobalButtons = buttons && Array.isArray(buttons.activeButtons);

      if (isGlobalButtons) {

        writeJsonFile(GLOBAL_BUTTONS_PATH, buttons);

      } else {

        writeJsonFile(BUTTON_STATE_PATH, buttons);

      }

    }

    if (globalButtons) writeJsonFile(GLOBAL_BUTTONS_PATH, globalButtons);

    if (llmButtons) writeJsonFile(LLM_BUTTONS_PATH, llmButtons);

    if (headerTitles) writeJsonFile(HEADER_TITLES_PATH, headerTitles);

    if (layoutSize) writeJsonFile(LAYOUT_SIZE_PATH, layoutSize);

    if (contentBlocks) writeJsonFile(CONTENT_BLOCKS_PATH, contentBlocks);

    if (deletedBlocks) writeJsonFile(DELETED_BLOCKS_PATH, deletedBlocks);



    res.json({ success: true });

  } catch (err) {

    logger.error("CONFIG", "Failed to save config", err);

    res.status(500).json({ error: "Failed to save config" });

  }

});



// ========== 配置管理 API ==========
// GET /api/config/status - 获取 AI 配置状态
app.get('/api/config/status', (req, res) => {
  res.json({ 
    hasApiKey: !!QWEN_API_KEY,
    model: QWEN_MODEL,
    endpoint: QWEN_ENDPOINT.replace(/\/chat\/completions$/, '/...') // 隐藏完整端点
  });
});

// POST /api/config/api-key - 运行时设置 API Key
app.post('/api/config/api-key', (req, res) => {
  const { apiKey } = req.body || {};
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
    return res.status(400).json({ error: 'Invalid API Key format' });
  }
  
  QWEN_API_KEY = apiKey.trim();
  logger.info('CONFIG', 'API Key updated at runtime');
  console.log('[INFO] QWEN_API_KEY updated successfully via API.');
  res.json({ success: true, message: 'API Key 已设置，AI 功能现在可用' });
});

// ========== 大纲缓存 API ==========
// GET /api/outline/cache - 获取缓存的大纲
app.get('/api/outline/cache', (req, res) => {
  res.json({ template: cachedOutlineTemplate });
});

// POST /api/outline/cache - 更新缓存的大纲
app.post('/api/outline/cache', (req, res) => {
  const { template } = req.body || {};
  cachedOutlineTemplate = template || null;
  persistOutlineCache(); // 持久化
  logger.info('OUTLINE_CACHE', '大纲缓存已更新');
  res.json({ success: true, template: cachedOutlineTemplate });
});

// DELETE /api/outline/cache - 清空缓存的大纲
app.delete('/api/outline/cache', (req, res) => {
  cachedOutlineTemplate = null;
  persistOutlineCache(); // 持久化（清空）
  logger.info('OUTLINE_CACHE', '大纲缓存已清空');
  res.json({ success: true });
});

// ========== 对话消息缓存 API ==========
// GET /api/chat/cache - 获取缓存的对话消息
app.get('/api/chat/cache', (req, res) => {
  res.json({ messages: cachedChatMessages });
});

// POST /api/chat/cache - 更新缓存的对话消息
app.post('/api/chat/cache', (req, res) => {
  const { messages } = req.body || {};
  cachedChatMessages = Array.isArray(messages) ? messages : [];
  res.json({ success: true });
});

// ========== 操作日志缓存 API ==========
// GET /api/dispatch/logs/cache - 获取缓存的操作日志
app.get('/api/dispatch/logs/cache', (req, res) => {
  res.json({ logs: cachedDispatchLogs });
});

// POST /api/dispatch/logs/cache - 更新缓存的操作日志
app.post('/api/dispatch/logs/cache', (req, res) => {
  const { logs } = req.body || {};
  cachedDispatchLogs = Array.isArray(logs) ? logs : [];
  res.json({ success: true });
});

// ========== 沉淀录制状态缓存 API ==========
// GET /api/deposit/state/cache - 获取沉淀录制状态
app.get('/api/deposit/state/cache', (req, res) => {
  res.json(cachedDepositState);
});

// POST /api/deposit/state/cache - 更新沉淀录制状态
app.post('/api/deposit/state/cache', (req, res) => {
  const { isDepositing, sections, depositSeq } = req.body || {};
  if (typeof isDepositing === 'boolean') cachedDepositState.isDepositing = isDepositing;
  if (Array.isArray(sections)) cachedDepositState.sections = sections;
  if (typeof depositSeq === 'number') cachedDepositState.depositSeq = depositSeq;
  res.json({ success: true, state: cachedDepositState });
});

// ========== 通用 AI 聊天 API ==========
// 用于应用端智能对话交互
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { messages, maxTokens = 500 } = req.body || {};
    
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages 不能为空' });
    }
    
    // 检查 API Key
    if (!QWEN_API_KEY) {
      // 无 AI 时返回空，让前端使用结构化消息
      return res.json({ content: null, usedModel: false });
    }
    
    // 调用 Qwen API
    const apiMessages = messages.map(m => ({
      role: m.role || 'user',
      content: m.content || ''
    }));
    
    console.log('[AI Chat] 开始调用 AI...', { messageCount: apiMessages.length });
    
    const response = await fetchWithRetry(QWEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${QWEN_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: QWEN_MODEL,
        messages: apiMessages,
        max_tokens: maxTokens,
        temperature: 0.7
      }),
      timeout: 60000  // 60秒超时，避免长时间等待
    }, 2);  // 最多重试 2 次
    
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '';
    
    console.log('[AI Chat] AI 返回成功', { contentLength: content.length });
    res.json({ content, usedModel: true });
  } catch (error) {
    logger.error('AI_CHAT', 'AI 聊天失败', error);
    console.error('[AI Chat] 错误:', error.message);
    // 返回空让前端使用回退方案
    res.json({ content: null, usedModel: false, error: error.message });
  }
});

// ========== AI Replay 分析 API ==========
// 让大模型理解沉淀记录的意图并生成执行指令
app.post('/api/ai/replay-analyze', async (req, res) => {
  try {
    const { section, context } = req.body || {};
    
    if (!section) {
      return res.status(400).json({ error: 'section 不能为空' });
    }
    
    // 检查 API Key
    if (!QWEN_API_KEY) {
      return res.json({ 
        understood: false, 
        usedModel: false,
        fallbackToScript: true,
        reason: 'AI 服务不可用'
      });
    }
    
    // 构建 AI 分析 prompt
    const prompt = `你是一个智能文档处理助手，需要分析以下沉淀记录并生成执行指令。

【沉淀记录信息】
操作名称：${section.action || '未知操作'}
沉淀内容：${section.content || '无'}

【当前系统上下文】
- 已加载文档：${context?.docs?.map(d => d.name).join('、') || '无'}
- 当前大纲章节数：${context?.outlineSectionsCount || 0}
- 历史大纲数量：${context?.outlineHistoryCount || 0}
${context?.outlineHistory?.length > 0 ? `- 历史大纲列表：${context.outlineHistory.slice(0, 5).map(o => `[${o.id}]${o.title || o.docName || '未命名'}`).join('、')}` : ''}

【任务要求】
1. 理解这个沉淀记录想要执行什么操作
2. 即使某些字段缺失，也尝试从上下文推断合理的执行方式
3. 返回 JSON 格式的执行指令

【支持的操作类型】
- add_doc: 添加/上传文档 (params: docName, docId)
- delete_doc: 删除文档 (params: docName, docId)
- outline_extract: 从文档提取大纲 (params: docName)
- outline_clear: 清除大纲
- restore_history_outline: 应用历史大纲 (params: outlineId, outlineTitle)
- insert_to_summary: 填入摘要 (params: targetSectionIds, targetSectionTitle, content)
- dispatch: 执行指令 (params: instruction)

请严格按以下 JSON 格式返回（不要包含任何 markdown 标记）：
{
  "understood": true或false,
  "action": "操作类型",
  "params": {
    // 根据操作类型提供参数，缺失的参数可以从上下文推断
  },
  "confidence": 0.0到1.0的置信度,
  "reason": "执行理由说明",
  "fallbackToScript": false或true
}

注意：
1. 如果能从沉淀内容和上下文推断出意图，设置 understood 为 true
2. 只有完全无法理解时才设置 fallbackToScript 为 true
3. 对于文档操作，如果没有指定文档，可以推荐使用第一个可用文档
4. 对于大纲操作，如果没有指定大纲 ID，可以推荐使用最新的历史大纲`;

    const response = await fetchWithRetry(QWEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${QWEN_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: QWEN_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
        temperature: 0.3  // 低温度以获得更确定的结果
      })
    });
    
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '';
    
    // 尝试解析 JSON
    try {
      // 清理可能的 markdown 标记
      const cleanJson = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const result = JSON.parse(cleanJson);
      
      res.json({
        ...result,
        usedModel: true,
        rawContent: content
      });
    } catch (parseErr) {
      logger.warn('AI_REPLAY', 'AI 返回解析失败', { content, error: parseErr.message });
      res.json({
        understood: false,
        usedModel: true,
        fallbackToScript: true,
        reason: 'AI 返回格式解析失败',
        rawContent: content
      });
    }
  } catch (error) {
    logger.error('AI_REPLAY', 'AI Replay 分析失败', error);
    res.json({
      understood: false,
      usedModel: false,
      fallbackToScript: true,
      reason: `AI 服务错误: ${error.message}`
    });
  }
});

// Fallback to multi-router for endpoints not defined above (outlines, precipitation, etc)

app.use('/api', multiRouter);



// Serve built frontend (optional)

const DIST_DIR = path.join(process.cwd(), "dist");

const serveDist = String(process.env.SERVE_DIST || "").toLowerCase();

if ((serveDist === "1" || serveDist === "true") && fs.existsSync(DIST_DIR)) {

  app.use(express.static(DIST_DIR));

  app.get(/^\/(?!api).*/, (_req, res) => {

    res.sendFile(path.join(DIST_DIR, "index.html"));

  });

  console.log(`[INFO] Serving dist from ${DIST_DIR}`);

}



// 启动服务器（先初始化 API Key）
const startServer = async () => {
  await initApiKey();
  
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Qwen Endpoint: ${QWEN_ENDPOINT}`);
    console.log(`Using Qwen Model: ${QWEN_MODEL}`);
    if (QWEN_API_KEY) {
      console.log(`API Key: 已配置 (${QWEN_API_KEY.substring(0, 6)}...)`);
    } else {
      console.log(`API Key: 未配置 - AI 功能将返回模拟数据`);
    }
  });
};

startServer();

