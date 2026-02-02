import express from "express";

import cors from "cors";

import { randomUUID } from "crypto";

import { fetch } from "undici";

import fs from "fs";

import path from "path";

import { fileURLToPath } from "url";

import mammoth from "mammoth";

import { ensureDataDir, readJsonFile, writeJsonFile, logger } from "./server_utils.js";

import multiRouter from "./server_multi.js";

// ========== .docx 解析工具 ==========
/**
 * 检测内容是否为未解析的 .docx 二进制数据
 * .docx 文件是 ZIP 格式，以 "PK" 开头
 */
const isRawDocxContent = (content) => {
  if (!content || typeof content !== 'string') return false;
  // .docx 文件（ZIP格式）以 "PK\x03\x04" 开头
  return content.startsWith('PK\x03\x04') || content.startsWith('PK');
};

/**
 * 将二进制字符串转换为 Buffer
 */
const binaryStringToBuffer = (binaryStr) => {
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return Buffer.from(bytes);
};

/**
 * 将 HTML 中的格式转换为 Markdown（主要处理加粗）
 * @param {string} html - HTML 内容
 * @returns {string} - Markdown 格式的文本
 */
const htmlToMarkdown = (html) => {
  if (!html) return '';
  
  let text = html;
  
  // 1. 将 <strong> 和 <b> 标签转换为 **加粗**
  text = text.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**');
  text = text.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**');
  
  // 2. 将 <em> 和 <i> 标签转换为 *斜体*（可选）
  text = text.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*');
  text = text.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*');
  
  // 3. 处理段落和换行
  text = text.replace(/<\/p>\s*<p[^>]*>/gi, '\n\n');
  text = text.replace(/<p[^>]*>/gi, '');
  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  
  // 4. 移除其他 HTML 标签
  text = text.replace(/<[^>]+>/g, '');
  
  // 5. 解码 HTML 实体
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#039;/g, "'");
  
  // 6. 清理多余的空行
  text = text.replace(/\n{3,}/g, '\n\n');
  
  return text.trim();
};

/**
 * 解析 .docx 内容为 Markdown 格式（保留加粗等格式）
 */
const parseDocxContent = async (binaryContent) => {
  try {
    const buffer = binaryStringToBuffer(binaryContent);
    // 【关键修改】使用 convertToHtml 而不是 extractRawText，以保留格式
    const result = await mammoth.convertToHtml({ buffer });
    const html = result.value || '';
    // 将 HTML 转换为 Markdown 格式
    const markdown = htmlToMarkdown(html);
    logger.info('DOCX_PARSE', `解析 .docx 内容成功，保留了格式标记`);
    return markdown;
  } catch (error) {
    logger.error('DOCX_PARSE', '解析 .docx 内容失败', error);
    return null;
  }
};

/**
 * 【新增】从文件路径读取文件内容（自动处理 .docx 文件，保留加粗格式）
 * @param {string} filePath - 文件完整路径
 * @returns {Promise<string>} - 文件文本内容（Markdown 格式，包含 **加粗** 标记）
 */
const readFileContent = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  
  if (ext === '.docx') {
    // .docx 文件需要使用 mammoth 解析，保留加粗格式
    try {
      const buffer = fs.readFileSync(filePath);
      // 【关键修改】使用 convertToHtml 而不是 extractRawText，以保留格式
      const result = await mammoth.convertToHtml({ buffer });
      const html = result.value || '';
      // 将 HTML 转换为 Markdown 格式（保留加粗）
      const text = htmlToMarkdown(html);
      logger.info('DOCX_PARSE', `成功解析 .docx 文件: ${path.basename(filePath)}, 内容长度: ${text.length}, 保留格式标记`);
      return text;
    } catch (error) {
      logger.error('DOCX_PARSE', `解析 .docx 文件失败: ${path.basename(filePath)}`, error);
      // 返回空字符串而不是二进制内容
      return '';
    }
  } else {
    // 其他文件用 utf-8 读取
    return fs.readFileSync(filePath, 'utf-8');
  }
};



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

/**
 * 添加或覆盖同名文档
 * @param {Object} newDoc - 新文档对象 { id, name, content, uploadedAt }
 * @returns {Object} - 返回实际存储的文档（如果覆盖则返回更新后的原文档）
 */
const upsertDoc = (newDoc) => {
  const key = (newDoc.name || '').trim().toLowerCase();
  const existingIdx = docs.findIndex(d => (d?.name || '').trim().toLowerCase() === key);
  
  if (existingIdx !== -1) {
    // 同名文档存在，覆盖内容但保留原有 ID
    docs[existingIdx] = { 
      ...docs[existingIdx], 
      name: newDoc.name, 
      content: newDoc.content,
      uploadedAt: newDoc.uploadedAt || Date.now()
    };
    logger.info('DOCS', `文档已覆盖: ${newDoc.name}`);
    return docs[existingIdx];
  } else {
    // 新文档，直接添加
    docs.push(newDoc);
    logger.info('DOCS', `文档已添加: ${newDoc.name}`);
    return newDoc;
  }
};

// ========== 大纲缓存持久化 ==========
const OUTLINE_CACHE_PATH = path.join(DATA_DIR, 'outline-cache.json');
const OUTLINE_HISTORY_PATH = path.join(DATA_DIR, 'outline-history.json');

// 读取历史大纲
const loadOutlineHistory = () => {
  try {
    const data = readJsonFile(OUTLINE_HISTORY_PATH);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
};

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

// ========== 场景持久化 ==========
const SCENES_CACHE_PATH = path.join(DATA_DIR, 'scenes-cache.json');

const scenes = new Map();

// 持久化场景数据
const persistScenes = () => {
  try {
    const scenesObj = {};
    scenes.forEach((scene, id) => {
      scenesObj[id] = scene;
    });
    writeJsonFile(SCENES_CACHE_PATH, scenesObj);
    logger.info('SCENES_CACHE', '场景数据已持久化');
  } catch (e) {
    logger.warn('SCENES_CACHE', '场景数据持久化失败', { error: e.message });
  }
};

// 加载持久化的场景数据
const loadScenesCache = () => {
  try {
    const cached = readJsonFile(SCENES_CACHE_PATH);
    if (cached && typeof cached === 'object') {
      Object.keys(cached).forEach(id => {
        scenes.set(id, cached[id]);
      });
      logger.info('SCENES_CACHE', `已加载缓存的场景数据，共 ${scenes.size} 个场景`);
    }
  } catch (e) {
    logger.warn('SCENES_CACHE', '加载场景缓存失败', { error: e.message });
  }
};

// ========== 服务端缓存 ==========
// 大纲缓存（持久化到文件）
let cachedOutlineTemplate = null;

// 启动时加载缓存
loadOutlineCache();
loadScenesCache();

// 【重要】启动时检查：如果大纲缓存为空但 scene 有数据，使用 scene 的数据
(() => {
  const mainScene = scenes.get('main');
  const sceneTemplate = mainScene?.customTemplate;
  const cacheIsEmpty = !cachedOutlineTemplate || !cachedOutlineTemplate.sections?.length;
  const sceneHasTemplate = sceneTemplate?.sections?.length > 0;
  
  if (cacheIsEmpty && sceneHasTemplate) {
    cachedOutlineTemplate = sceneTemplate;
    persistOutlineCache();
    logger.info('OUTLINE_CACHE', `从 main 场景恢复大纲缓存，共 ${sceneTemplate.sections.length} 个标题`);
  }
})();

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

**关键原则 - 区分"输出格式"和"计算公式"：**
1. **输出格式**：指定了 detail 字段应该输出什么样的文本
2. **计算公式**：说明如何计算数值，但计算过程**不应该出现在最终输出中**
3. detail 字段**只能包含按照输出格式生成的最终文本**，不能包含计算公式或计算过程

**执行计算指令的正确方式：**
1. 如果用户指令中同时包含"输出格式"和"计算公式"，你必须：
   - 从文档中准确提取所有需要的数值
   - 严格按照计算公式进行数学计算
   - 将计算结果**仅按照输出格式**填入 detail 字段
2. 示例：
   - 输出格式："X月X日，指挥部共调度检查【总次数】次。"
   - 计算公式："【总次数】= 政治中心区 + 社会面勤务 + 外围检查站"
   - 从文档提取：政治中心区559次、社会面勤务64次、外围检查站847次
   - 计算：559 + 64 + 847 = 1470
   - ✅ 正确输出：detail = "X月X日，指挥部共调度检查 1470 次。"
   - ❌ 错误输出：detail = "X月X日，指挥部共调度检查 1470 次，1470=559+64+847"（包含了计算过程）
3. 不要简单复制原文，必须执行用户要求的计算和转换
4. **重要**：最终输出只包含填充了计算结果的输出格式文本，绝对不要把计算公式或计算过程写入输出

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



// 根路由由静态文件服务处理（见文件末尾 SERVE_DIST 逻辑）
// 不再需要单独的根路由返回 API 消息



app.get("/api/template", (_req, res) => {
  // 优先返回缓存的大纲、其次 main scene 的大纲、最后默认模板
  let template = cachedOutlineTemplate;
  
  if (!template || !template.sections?.length) {
    const mainScene = scenes.get('main');
    template = mainScene?.customTemplate;
  }
  
  if (!template || !template.sections?.length) {
    template = defaultTemplate;
  }
  
  res.json({ template });
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
    const { 
      sceneId, 
      section, 
      mode = 'llm', 
      replayDirPath,
      // 【重要】当前内容预览的文档内容，用于大模型匹配类似内容
      currentDocContent = '',
      currentDocName = '',
      // 【重要】沉淀级别的格式要求，用于 AI 处理
      depositAccumulatedRequirements = '',
      depositLlmRecordContent = '',
      // 【关键新增】前端传递的 aiGuidance（包含计算公式和输出格式）
      aiGuidance: frontendAiGuidance = '',
      // 【新增】单独传递的计算公式和输出格式
      calculationFormula: frontendCalculationFormula = '',
      outputFormat: frontendOutputFormat = '',
      // 【新增】字段级别校验配置 { stepIndex_fieldName: true/false }
      // 校验的字段必须存在才能 replay 成功，校验失败返回 skip（pass）而非 fail
      fieldValidation = {},
      validationMode = 'none'
    } = req.body || {};
    
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
    
    // 【调试】打印收到的目标位置信息
    logger.info('REPLAY', '收到的目标位置信息', {
      'meta.destinations': meta.destinations,
      'meta.targetSummaries': meta.targetSummaries,
      'meta.targetSectionIds': meta.targetSectionIds,
      'llmScript.destinations': llmScript?.destinations,
      'llmScript.targetSummaries': llmScript?.targetSummaries,
      'firstDestSummaryIndex': meta.destinations?.[0]?.summaryIndex,
      'firstDestSectionId': meta.destinations?.[0]?.sectionId,
      'firstDestSectionTitle': meta.destinations?.[0]?.sectionTitle
    });
    
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
    let extraData = null; // 用于返回额外信息（如合并方式设置结果）

    // 【新增】字段校验辅助函数
    // 检查必填字段是否存在，校验失败返回 skip 而非 fail
    const validateRequiredFields = (stepIndex, fieldValues) => {
      if (!fieldValidation || Object.keys(fieldValidation).length === 0) {
        return { valid: true };
      }
      
      const missingFields = [];
      for (const [key, required] of Object.entries(fieldValidation)) {
        if (!required) continue; // 不校验的字段跳过
        
        // key 格式: stepIndex_fieldName
        const [keyStepIndex, fieldName] = key.split('_');
        if (parseInt(keyStepIndex) !== stepIndex) continue;
        
        // 检查字段值是否存在
        const value = fieldValues[fieldName];
        if (value === undefined || value === null || value === '') {
          missingFields.push(fieldName);
        }
      }
      
      if (missingFields.length > 0) {
        return { 
          valid: false, 
          missingFields,
          message: `⚠️ 校验失败：缺少必填字段 [${missingFields.join(', ')}]`
        };
      }
      
      return { valid: true };
    };
    
    // 获取 section 在沉淀中的步骤索引（用于字段校验）
    const sectionStepIndex = section?.stepIndex || 0;

    // ========== 【新增】字段校验（在执行操作之前） ==========
    // 如果启用了字段校验，检查必填字段是否存在
    // 校验失败时返回 skip（pass）而非 fail
    if (fieldValidation && Object.keys(fieldValidation).length > 0) {
      // 从各个来源收集字段值
      const fieldValues = {
        // 从 meta 中提取
        '操作类型': meta?.type || metaType || '',
        '目标标题': meta?.targetSectionTitle || (Array.isArray(meta?.selectedSectionTitles) ? meta.selectedSectionTitles.join('、') : ''),
        '来源文档': meta?.docName || '',
        '文档名称': meta?.docName || '',
        // 从 inputs 中提取
        '具体内容': '',
        '选中内容': '',
        '内容开头': '',
        '内容结尾': '',
        '前文上下文': '',
        '后文上下文': '',
        // 从 llmScript 中提取
        'AI指导': llmScript?.aiGuidance || meta?.aiGuidance || '',
        '特殊要求': llmScript?.specialRequirements || meta?.specialRequirements || '',
        '指令': llmScript?.instructions || meta?.instructions || '',
        // 从 outputs 中提取
        '执行结果': meta?.outputs?.executionResult || meta?.outputs?.summary || '',
        '写入内容': meta?.outputs?.writtenContent || ''
      };
      
      // 从 inputs 数组中提取选中内容相关字段
      if (Array.isArray(meta?.inputs)) {
        const selInput = meta.inputs.find(x => x?.kind === 'selection');
        if (selInput) {
          fieldValues['具体内容'] = selInput.text || '';
          fieldValues['选中内容'] = selInput.text || '';
          // 【新增】原文 - 完整的原文内容（包含格式标记）
          fieldValues['原文'] = selInput.originalText || selInput.text || '';
          fieldValues['内容开头'] = selInput.textHead || '';
          fieldValues['内容结尾'] = selInput.textTail || '';
          fieldValues['前文上下文'] = selInput.contextBefore || '';
          fieldValues['后文上下文'] = selInput.contextAfter || '';
          if (selInput.contentFeatures) {
            fieldValues['内容特征'] = [
              selInput.contentFeatures.charCount ? `${selInput.contentFeatures.charCount}字` : '',
              selInput.contentFeatures.lineCount ? `${selInput.contentFeatures.lineCount}行` : '',
              selInput.contentFeatures.hasNumbers ? '含数字' : '',
              selInput.contentFeatures.hasDates ? '含日期' : '',
              selInput.contentFeatures.hasBold ? `含加粗(${selInput.contentFeatures.boldCount || 0}处)` : ''
            ].filter(Boolean).join('、') || '';
          }
        }
      }
      
      // 从 destinations 中提取目标位置信息
      if (Array.isArray(meta?.destinations) && meta.destinations.length > 0) {
        fieldValues['目标位置'] = meta.destinations.map(d => d.sectionTitle || '').filter(Boolean).join('、') || '';
      }
      
      // 执行校验
      const validationResult = validateRequiredFields(sectionStepIndex, fieldValues);
      if (!validationResult.valid) {
        logger.info('REPLAY', `字段校验失败，跳过操作`, { 
          missingFields: validationResult.missingFields,
          stepIndex: sectionStepIndex
        });
        return res.json({
          status: 'pass',  // 校验失败返回 pass（skip）
          reason: validationResult.message,
          replayMode: mode,
          validationFailed: true,
          missingFields: validationResult.missingFields
        });
      }
      logger.info('REPLAY', '字段校验通过');
    }

    // 获取当前模板
    const getTemplate = () => {
      const tpl = scene.customTemplate || scene.template || cachedOutlineTemplate;
      return tpl && Array.isArray(tpl.sections) ? tpl : { id: 'empty', name: '空模板', sections: [] };
    };

    // 更新模板（同时持久化大纲和场景）
    const applyTemplate = (newTpl) => {
      scene.customTemplate = newTpl;
      cachedOutlineTemplate = newTpl;
      persistOutlineCache(); // 持久化大纲
      persistScenes(); // 持久化场景
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
      // 添加摘要（与后管端逻辑一致：找不到时跳过而非失败）
      const tpl = getTemplate();
      const sectionTitle = meta.targetSectionTitle || llmScript?.targetSectionTitle || '';
      
      // LLM 模式：语义匹配
      let targetSection = null;
      if (mode === 'llm' && sectionTitle) {
        try {
          const candidates = tpl.sections.map(s => ({ id: s.id, level: s.level, title: s.title }));
          const matchRes = await callQwenSemanticMatch({
            taskType: 'find_outline_section',
            recordedInfo: { targetTitle: sectionTitle, description: '添加摘要' },
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
        targetSection = findSection(meta.sectionId || meta.targetSectionId, sectionTitle, tpl);
      }
      
      // 【重要】找不到目标时跳过（与后管端逻辑一致）
      if (!targetSection) {
        if (mode === 'llm') {
          status = 'pass';
          reason = `⏭️ 跳过执行：当前大纲中未找到与「${sectionTitle || '(空)'}」相似的目标章节`;
          replayMode = 'skipped';
        } else {
          status = 'fail';
          reason = '未找到目标标题';
        }
      } else {
        const summaries = Array.isArray(targetSection.summaries) ? [...targetSection.summaries] : [];
        summaries.push({ content: '', createdAt: Date.now() });
        
        const nextTpl = {
          ...tpl,
          sections: tpl.sections.map(s => s.id === targetSection.id ? { ...s, summaries } : s)
        };
        applyTemplate(nextTpl);
        status = 'done';
        reason = mode === 'llm'
          ? `🤖 大模型匹配添加摘要：${targetSection.title}`
          : `📜 脚本 Replay Done（已添加摘要到「${targetSection.title}」）`;
        replayMode = mode;
      }
      
    } else if (metaType === 'remove_summary_from_section' || section.action === '删除摘要项') {
      // 删除摘要项（与后管端逻辑一致：找不到时跳过而非失败）
      const tpl = getTemplate();
      const sectionTitle = meta.targetSectionTitle || llmScript?.targetSectionTitle || '';
      
      // LLM 模式：语义匹配
      let targetSection = null;
      if (mode === 'llm' && sectionTitle) {
        try {
          const candidates = tpl.sections.map(s => ({ id: s.id, level: s.level, title: s.title }));
          const matchRes = await callQwenSemanticMatch({
            taskType: 'find_outline_section',
            recordedInfo: { targetTitle: sectionTitle, description: '删除摘要' },
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
        targetSection = findSection(meta.sectionId, sectionTitle, tpl);
      }
      
      const sumIdx = meta.summaryIndex;
      
      // 【重要】找不到目标或索引时跳过（与后管端逻辑一致）
      if (!targetSection || typeof sumIdx !== 'number') {
        if (mode === 'llm') {
          status = 'pass';
          reason = `⏭️ 跳过执行：当前大纲中未找到与「${sectionTitle || '(空)'}」相似的目标章节${typeof sumIdx !== 'number' ? '或摘要索引' : ''}`;
          replayMode = 'skipped';
        } else {
          status = 'fail';
          reason = '未找到目标标题或摘要索引';
        }
      } else {
        const summaries = Array.isArray(targetSection.summaries) ? [...targetSection.summaries] : [];
        if (sumIdx >= 0 && sumIdx < summaries.length) {
          summaries.splice(sumIdx, 1);
        }
        
        const nextTpl = {
          ...tpl,
          sections: tpl.sections.map(s => s.id === targetSection.id ? { ...s, summaries } : s)
        };
        applyTemplate(nextTpl);
        status = 'done';
        reason = mode === 'llm'
          ? `🤖 大模型匹配删除摘要：${targetSection.title}`
          : `📜 脚本 Replay Done（已删除摘要项）`;
        replayMode = mode;
      }
      
    } else if (metaType === 'merge_summaries_in_section' || section.action === '合并摘要') {
      // 合并摘要（与后管端逻辑一致：找不到时跳过而非失败）
      const tpl = getTemplate();
      const sectionTitle = meta.targetSectionTitle || llmScript?.targetSectionTitle || '';
      
      // LLM 模式：语义匹配
      let targetSection = null;
      if (mode === 'llm' && sectionTitle) {
        try {
          const candidates = tpl.sections.map(s => ({ id: s.id, level: s.level, title: s.title }));
          const matchRes = await callQwenSemanticMatch({
            taskType: 'find_outline_section',
            recordedInfo: { targetTitle: sectionTitle, description: '合并摘要' },
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
        targetSection = findSection(meta.sectionId, sectionTitle, tpl);
      }
      
      // 【重要】找不到目标时跳过（与后管端逻辑一致）
      if (!targetSection) {
        if (mode === 'llm') {
          status = 'pass';
          reason = `⏭️ 跳过执行：当前大纲中未找到与「${sectionTitle || '(空)'}」相似的目标章节`;
          replayMode = 'skipped';
        } else {
          status = 'fail';
          reason = '未找到目标标题';
        }
      } else {
        const summaries = Array.isArray(targetSection.summaries) ? targetSection.summaries : [];
        const mergedContent = summaries.map(s => (s.content || '').trim()).filter(Boolean).join('\n\n');
        
        const nextTpl = {
          ...tpl,
          sections: tpl.sections.map(s => s.id === targetSection.id ? { ...s, summary: mergedContent, summaries: undefined } : s)
        };
        applyTemplate(nextTpl);
        status = 'done';
        reason = mode === 'llm'
          ? `🤖 大模型匹配合并摘要：${targetSection.title}`
          : `📜 脚本 Replay Done（已合并 ${summaries.length} 个摘要）`;
        replayMode = mode;
      }
      
    } else if (metaType === 'set_merge_type' || section.action?.includes('拼接')) {
      // ========== 设置摘要合并方式 ==========
      // 在大纲中找到目标章节，设置其摘要的合并方式（段落拼接/句子拼接）
      const tpl = getTemplate();
      const sectionTitle = meta.targetSectionTitle || meta.sectionTitle || llmScript?.targetSectionTitle || '';
      const mergeType = meta.mergeType || llmScript?.mergeType || 'sentence'; // 默认使用句子拼接
      const mergeTypeLabel = mergeType === 'sentence' ? '句子拼接' : '段落拼接';
      
      // LLM 模式：语义匹配目标章节
      let targetSection = null;
      if (mode === 'llm' && sectionTitle) {
        try {
          const candidates = tpl.sections.map(s => ({ id: s.id, level: s.level, title: s.title }));
          const matchRes = await callQwenSemanticMatch({
            taskType: 'find_outline_section',
            recordedInfo: { targetTitle: sectionTitle, description: `设置${mergeTypeLabel}` },
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
        targetSection = findSection(meta.sectionId || llmScript?.targetSectionId, sectionTitle, tpl);
      }
      
      if (!targetSection) {
        if (mode === 'llm') {
          status = 'pass';
          reason = `⏭️ 跳过执行：当前大纲中未找到与「${sectionTitle || '(空)'}」相似的目标章节`;
          replayMode = 'skipped';
        } else {
          status = 'fail';
          reason = '未找到目标标题';
        }
      } else {
        // 【关键】将合并方式信息存储到场景的 sectionMergeType 中
        // 这样前端可以读取并在最终文档生成时使用
        const sceneId = req.body.sceneId;
        let stored = false;
        
        if (sceneId) {
          const sceneData = scenes.get(sceneId);
          if (sceneData) {
            if (!sceneData.sectionMergeType) {
              sceneData.sectionMergeType = {};
            }
            sceneData.sectionMergeType[targetSection.id] = mergeType;
            scenes.set(sceneId, sceneData);
            stored = true;
            logger.info('REPLAY', `设置合并方式成功（场景存储）`, {
              sceneId,
              sectionId: targetSection.id,
              sectionTitle: targetSection.title,
              mergeType,
              mergeTypeLabel
            });
          }
        }
        
        // 【脚本模式兼容】如果没有场景或场景存储失败，返回合并方式信息让前端处理
        // 前端收到后可以直接应用到当前的 sectionMergeType 状态
        status = 'done';
        reason = mode === 'llm'
          ? `🤖 大模型匹配设置合并方式：${targetSection.title} → ${mergeTypeLabel}`
          : `📜 脚本 Replay Done（已设置 ${targetSection.title} 为 ${mergeTypeLabel}）`;
        replayMode = mode;
        
        // 将合并方式信息附加到返回结果中，让前端也能应用
        // 这确保无论是否有场景存储，前端都能正确更新状态
        extraData = {
          mergeTypeResult: {
            sectionId: targetSection.id,
            sectionTitle: targetSection.title,
            mergeType,
            mergeTypeLabel
          }
        };
      }
      
    } else if (metaType === 'add_doc' || metaType.startsWith('add_doc')) {
      // ========== 添加文档 - 区分大模型模式和脚本模式 ==========
      // 
      // 【大模型模式】
      // 1. 读取 llmScript 中的语义化描述
      // 2. 大模型理解需求，输出结构化执行脚本
      // 3. 系统根据脚本执行（灵活上传只是更改文件名匹配方法）
      // 4. 失败时回退到脚本模式
      //
      // 【脚本模式】
      // 1. 直接使用 meta 中的精确参数（docId, docName）
      // 2. 精确匹配文档
      // 3. 不匹配则 fail
      //
      
      const originalDocName = meta.docName || meta.selectedDocName || '';
      const isUpload = meta?.source === 'upload' || (section?.content || '').toString().includes('上传文档');
      const docSelector = meta?.docSelector || llmScript?.docSelector || null;
      
      let doc = null;
      
      // ========== 脚本模式：精确复现 ==========
      if (mode === 'script') {
        logger.info('REPLAY', '添加文档 - 脚本模式：精确复现', {
          originalDocName,
          docId: meta.docId,
          replayDirPath,
          loadedDocsCount: docs.length,
          loadedDocNames: docs.map(d => d.name)
        });
        
        // 【重要】脚本模式只允许精确匹配，不使用 findDoc（它有部分匹配）
        // 【修改】脚本模式应该**优先从文件系统（目录）中匹配**，确保使用的是实际存在的文件
        // 而不是内存中可能已过期的文档条目
        
        // 1. 首先从目录精确匹配文件名（最严格：确保文件实际存在）
        if (replayDirPath && originalDocName) {
          try {
            const files = fs.readdirSync(replayDirPath);
            logger.info('REPLAY', `脚本模式 - 目录文件列表 (${files.length} 个)`, { files });
            
            // 【关键】严格精确匹配，文件名必须完全一致
            const matchedFile = files.find(f => f === originalDocName);
            
            if (matchedFile) {
              logger.info('REPLAY', `脚本模式 - 从目录精确匹配到文件: ${matchedFile}`);
              const filePath = path.join(replayDirPath, matchedFile);
              if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                // 【修复】使用 readFileContent 正确处理 .docx 文件
                const content = await readFileContent(filePath);
                const newDoc = {
                  id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  name: matchedFile,
                  content,
                  uploadedAt: Date.now()
                };
                doc = upsertDoc(newDoc);
                persistDocs();
                logger.info('REPLAY', `脚本模式 - 已从目录加载文件: ${matchedFile}`);
              }
            } else {
              logger.info('REPLAY', `脚本模式 - 目录中未找到精确匹配的文件: ${originalDocName}`);
            }
          } catch (e) {
            logger.warn('REPLAY', '脚本模式 - 读取目录失败', { error: e.message, replayDirPath });
          }
        }
        
        // 【重要】脚本模式下，只从目录中加载文件，不从内存中的已加载文档列表查找
        // 这样确保脚本模式严格依赖于文件系统中的实际文件
        // 如果目录中没有该文件，则直接失败（fail）
        
        // 脚本模式：找不到则 fail（不是 pass）
        if (!doc) {
          status = 'fail';
          reason = `❌ 脚本模式失败：目录中未找到与录制完全一致的文件「${originalDocName || '(空)'}」`;
          replayMode = 'script';
          logger.info('REPLAY', '脚本模式精确匹配失败', { 
            originalDocName, 
            replayDirPath,
            hint: '脚本模式要求目录中存在完全一致的文件名' 
          });
        } else {
          const docIds = Array.from(new Set([...(scene.docIds || []), doc.id]));
          scene.docIds = docIds;
          
          status = 'done';
          reason = `📜 脚本 Replay Done（已添加文档：${doc.name}）`;
          replayMode = 'script';
        }
      }
      // ========== 大模型模式：智能匹配 ==========
      else {
        logger.info('REPLAY', '添加文档 - 大模型模式：智能匹配');
        
        // 【Step 1】构建大模型 prompt，让大模型理解需求并输出执行脚本
        const llmDocName = llmScript?.docName || originalDocName || '';
        const llmDescription = llmScript?.actionDescription || llmScript?.description || '添加/上传文档';
        const llmKeywords = [
          ...(docSelector?.keywords || []),
          ...(llmScript?.flexKeywords || '').split(/[,，\s]+/).filter(Boolean),
          ...(llmDocName || '').replace(/[（）()【】\[\].txt.docx.doc\-_]/g, ' ').trim().split(/\s+/).filter(Boolean)
        ].filter(Boolean);
        const llmAiGuidance = llmScript?.aiGuidance || '';
        
        // 获取可用的文件列表
        let availableFiles = [];
        if (replayDirPath) {
          try {
            availableFiles = fs.readdirSync(replayDirPath).filter(f => {
              const filePath = path.join(replayDirPath, f);
              return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
            });
          } catch (e) {
            logger.warn('REPLAY', '读取目录失败', { error: e.message });
          }
        }
        
        // 已加载的文档列表
        const loadedDocs = docs.map(d => ({ id: d.id, name: d.name }));
        
        // 构建大模型 prompt
        const llmPrompt = `你是一个智能文档处理助手。请根据录制时的需求，输出执行脚本。

========== 录制时的操作需求 ==========
- 动作：${llmDescription}
- 录制的文档名：${llmDocName || '(未记录)'}
- 关键词/特征：${llmKeywords.length > 0 ? llmKeywords.join('、') : '(无)'}
- AI 指导：${llmAiGuidance || '(无)'}
- 是否为上传操作：${isUpload ? '是' : '否'}

========== 当前可用资源 ==========
【已加载的文档】
${loadedDocs.length > 0 ? loadedDocs.map((d, i) => `${i + 1}. ${d.name}`).join('\n') : '(暂无已加载文档)'}

【目录中可用的文件】
${availableFiles.length > 0 ? availableFiles.map((f, i) => `${i + 1}. ${f}`).join('\n') : '(目录为空或未配置)'}

========== 任务要求 ==========
1. 理解录制时的需求（要添加什么类型的文档）
2. 从【当前可用资源】中找到最匹配的文档/文件
3. 优先使用【已加载的文档】，如果没有匹配的再从【目录中可用的文件】选择
4. 输出执行脚本

========== 输出格式（严格 JSON）==========
{
  "matched": true或false,
  "source": "loaded_doc" 或 "directory_file",
  "matchedName": "匹配到的文档/文件名",
  "matchedIndex": 匹配项在列表中的索引（0开始），
  "reason": "匹配理由说明"
}

如果无法匹配，返回：
{
  "matched": false,
  "source": null,
  "matchedName": "",
  "matchedIndex": -1,
  "reason": "未找到匹配的原因"
}`;

        let llmResult = null;
        
        // 【Step 2】调用大模型
        if (QWEN_API_KEY && (availableFiles.length > 0 || loadedDocs.length > 0)) {
          try {
            const llmResp = await fetch(QWEN_ENDPOINT, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${QWEN_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: QWEN_MODEL,
                messages: [{ role: 'user', content: llmPrompt }],
                max_tokens: 1000,
                temperature: 0.2
              })
            });
            
            if (llmResp.ok) {
              const llmData = await llmResp.json();
              const llmContent = (llmData?.choices?.[0]?.message?.content || '').trim();
              
              // 解析 JSON
              let jsonStr = llmContent;
              if (jsonStr.startsWith('```')) {
                jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
              }
              
              try {
                llmResult = JSON.parse(jsonStr);
                logger.info('REPLAY', '大模型返回执行脚本', { 
                  matched: llmResult.matched,
                  source: llmResult.source,
                  matchedName: llmResult.matchedName
                });
              } catch (parseErr) {
                logger.warn('REPLAY', '大模型返回 JSON 解析失败', { content: llmContent.substring(0, 200) });
              }
            }
          } catch (llmErr) {
            logger.warn('REPLAY', `大模型调用失败: ${llmErr.message}`);
          }
        }
        
        // 【Step 3】根据大模型脚本执行
        // 【修复】从 docSelector 中获取必须匹配的关键词，用于验证大模型结果
        const mustMatchKeywords = docSelector?.keywords || [];
        
        // 【修复】验证函数：检查文档名是否包含所有必须匹配的关键词
        const validateMatch = (name) => {
          if (mustMatchKeywords.length === 0) return true;  // 没有必须匹配的关键词，不验证
          const lowerName = (name || '').toLowerCase();
          const isValid = mustMatchKeywords.every(k => lowerName.includes(k.toLowerCase()));
          if (!isValid) {
            logger.warn('REPLAY', `大模型返回的文档「${name}」不包含必须匹配的关键词`, { mustMatchKeywords });
          }
          return isValid;
        };
        
        if (llmResult && llmResult.matched) {
          let candidateDoc = null;
          let candidateName = '';
          
          if (llmResult.source === 'loaded_doc' && llmResult.matchedIndex >= 0 && llmResult.matchedIndex < loadedDocs.length) {
            // 从已加载文档中选择
            candidateDoc = docs.find(d => d.id === loadedDocs[llmResult.matchedIndex].id);
            candidateName = candidateDoc?.name || '';
          } else if (llmResult.source === 'directory_file' && llmResult.matchedIndex >= 0 && llmResult.matchedIndex < availableFiles.length) {
            // 从目录加载文件
            candidateName = availableFiles[llmResult.matchedIndex];
          } else if (llmResult.matchedName) {
            candidateName = llmResult.matchedName;
          }
          
          // 【关键修复】验证大模型返回的结果是否符合关键词要求
          if (candidateName && validateMatch(candidateName)) {
            if (candidateDoc) {
              doc = candidateDoc;
              logger.info('REPLAY', `大模型选择已加载文档（验证通过）: ${doc.name}`);
            } else if (replayDirPath) {
              const matchedFile = availableFiles.find(f => f === candidateName);
              if (matchedFile) {
                const filePath = path.join(replayDirPath, matchedFile);
                try {
                  // 【修复】使用 readFileContent 正确处理 .docx 文件
                  const content = await readFileContent(filePath);
                  const newDoc = {
                    id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    name: matchedFile,
                    content,
                    uploadedAt: Date.now()
                  };
                  doc = upsertDoc(newDoc);
                  persistDocs();
                  logger.info('REPLAY', `大模型选择目录文件（验证通过）: ${matchedFile}`);
                } catch (e) {
                  logger.warn('REPLAY', '加载目录文件失败', { file: matchedFile, error: e.message });
                }
              }
            }
          } else {
            logger.info('REPLAY', '大模型返回结果未通过关键词验证，将回退到关键词匹配', {
              llmMatchedName: candidateName,
              mustMatchKeywords
            });
          }
        }
        
        // 【Step 4】大模型失败时回退到关键词匹配（docSelector 或自动提取）
        // 【重要】如果有 docSelector（用户通过"执行匹配"设置的），仍算作"大模型匹配"
        let usedDocSelector = false;
        if (!doc) {
          logger.info('REPLAY', '大模型未直接匹配成功，尝试使用 docSelector 关键词匹配');
          
          // 提取关键词
          const targetName = llmDocName || originalDocName || '';
          const cleanName = targetName.replace(/\.(txt|docx?|pdf|xlsx?)$/i, '');
          const chineseKeywords = (cleanName.match(/[\u4e00-\u9fa5]+/g) || []);
          const englishKeywords = cleanName.replace(/[\u4e00-\u9fa5]/g, ' ').replace(/[^a-zA-Z\s]/g, ' ').trim().split(/\s+/).filter(k => k.length > 1);
          const keywords = [...new Set([...llmKeywords, ...chineseKeywords, ...englishKeywords])];
          
          // 【修复】从 docSelector 中获取必须匹配的关键词
          const mustMatchKeywords = docSelector?.keywords || [];
          
          // 【新增】标记是否使用了 docSelector（用户设置的灵活匹配）
          if (docSelector && mustMatchKeywords.length > 0) {
            usedDocSelector = true;
            logger.info('REPLAY', '使用 docSelector 关键词匹配（用户通过"执行匹配"设置）', { mustMatchKeywords });
          }
          
          logger.info('REPLAY', '关键词匹配 - 关键词列表', { 
            mustMatchKeywords, 
            allKeywords: keywords,
            targetName,
            usedDocSelector
          });
          
          // 【修复】匹配函数：必须匹配的关键词全部匹配，其他关键词至少匹配一个
          const isMatch = (name) => {
            const lowerName = name.toLowerCase();
            // 必须匹配的关键词全部要存在
            if (mustMatchKeywords.length > 0) {
              const allMustMatch = mustMatchKeywords.every(k => lowerName.includes(k.toLowerCase()));
              if (!allMustMatch) return false;
            }
            // 如果没有必须匹配的关键词，则普通关键词至少匹配一个
            if (mustMatchKeywords.length === 0 && keywords.length > 0) {
              return keywords.some(k => lowerName.includes(k.toLowerCase()));
            }
            return mustMatchKeywords.length > 0;  // 有必须匹配的关键词且全部匹配
          };
          
          // 先从已加载文档中查找
          if (mustMatchKeywords.length > 0 || keywords.length > 0) {
            doc = docs.find(d => isMatch(d.name));
            if (doc) {
              logger.info('REPLAY', `从已加载文档匹配到: ${doc.name}`);
            }
          }
          
          // 再从目录中查找
          if (!doc && replayDirPath && availableFiles.length > 0) {
            let matchedFile = null;
            
            // 精确匹配
            matchedFile = availableFiles.find(f => f === targetName);
            
            // 【修复】使用统一的匹配函数
            if (!matchedFile && (mustMatchKeywords.length > 0 || keywords.length > 0)) {
              matchedFile = availableFiles.find(f => isMatch(f));
            }
            
            if (matchedFile) {
              const filePath = path.join(replayDirPath, matchedFile);
              try {
                // 【修复】使用 readFileContent 正确处理 .docx 文件
                const content = await readFileContent(filePath);
                const newDoc = {
                  id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  name: matchedFile,
                  content,
                  uploadedAt: Date.now()
                };
                doc = upsertDoc(newDoc);
                persistDocs();
                logger.info('REPLAY', `回退关键词匹配到文件: ${matchedFile}`, { mustMatchKeywords, keywords });
              } catch (e) {
                logger.warn('REPLAY', '回退加载文件失败', { error: e.message });
              }
            } else {
              logger.info('REPLAY', '回退关键词匹配失败 - 目录中无匹配文件', { 
                mustMatchKeywords,
                availableFilesCount: availableFiles.length,
                availableFilesSample: availableFiles.slice(0, 5)
              });
            }
          }
        }
        
        // 【Step 5】设置执行结果
        if (!doc) {
          status = 'pass';
          reason = `⏭️ 跳过执行：未找到文档「${llmDocName || originalDocName || '(空)'}」（${llmResult?.reason || '无匹配'}）`;
          replayMode = 'skipped';
        } else {
          const docIds = Array.from(new Set([...(scene.docIds || []), doc.id]));
          scene.docIds = docIds;
          
          status = 'done';
          
          // 【重要】判断是否为大模型/智能匹配：
          // 1. 大模型直接返回 matched: true
          // 2. 使用了 docSelector（用户通过"执行匹配"设置的灵活匹配）
          const isLlmMatch = llmResult?.matched || usedDocSelector;
          
          if (llmResult?.matched) {
            reason = `🤖 大模型 Replay Done（已添加文档：${doc.name}，来源：${llmResult.source === 'loaded_doc' ? '已加载' : '目录'}）`;
            replayMode = 'llm';
          } else if (usedDocSelector) {
            reason = `🤖 大模型 Replay Done（已添加文档：${doc.name}，使用灵活匹配关键词）`;
            replayMode = 'llm';
          } else {
            reason = `📜 脚本回退 Replay Done（已添加文档：${doc.name}）`;
            replayMode = 'script_fallback';
          }
        }
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
      // 复制全文到摘要（与后管端逻辑一致：使用大模型语义匹配）
      const docName = meta.docName || llmScript?.docName || '';
      let doc = findDoc(docName, meta.docId);
      
      // 【关键】LLM 模式：使用大模型语义匹配文档（与后管端完全一致）
      if (!doc && mode === 'llm' && docs.length > 0) {
        const docSelectorKeywords = llmScript?.docSelector?.keywords || [];
        const flexKeywordsArr = (llmScript?.flexKeywords || '').split(/[,，\s]+/).filter(Boolean);
        const docNameKeywords = (docName || '').replace(/[（）()【】\[\].txt.docx.doc\-_]/g, ' ').trim().split(/\s+/).filter(Boolean);
        const allKeywords = [...new Set([...docSelectorKeywords, ...flexKeywordsArr, ...docNameKeywords])];
        
        const recordedDocInfo = {
          docName: docName,
          description: llmScript?.actionDescription || '复制全文到摘要',
          aiGuidance: llmScript?.aiGuidance || meta?.aiGuidance || '',
          keywords: allKeywords.join(' '),
          selectorDescription: llmScript?.docSelector?.description || '',
          flexKeywords: llmScript?.flexKeywords || ''
        };
        
        const candidateDocs = docs.map(d => ({ id: d.id, name: d.name }));
        try {
          const docMatchRes = await callQwenSemanticMatch({
            taskType: 'find_document',
            recordedInfo: recordedDocInfo,
            candidates: candidateDocs
          });
          logger.info('REPLAY', '大模型文档匹配结果', { docMatchRes });
          if (docMatchRes.matchedIndex >= 0 && docMatchRes.matchedIndex < candidateDocs.length) {
            doc = docs.find(d => d.id === candidateDocs[docMatchRes.matchedIndex].id);
            logger.info('REPLAY', `大模型匹配到文档: ${doc?.name}`);
          }
        } catch (e) {
          logger.warn('REPLAY', '大模型文档匹配失败', { error: e.message });
        }
      }
      
      // 尝试从 replayDir 加载（使用中文关键词匹配）
      if (!doc && replayDirPath) {
        const targetName = docName || '';
        // 提取中文关键词（连续的中文字符）
        const cleanName = targetName.replace(/\.(txt|docx?|pdf|xlsx?)$/i, '');
        const chineseKeywords = (cleanName.match(/[\u4e00-\u9fa5]+/g) || []);
        const englishKeywords = cleanName.replace(/[\u4e00-\u9fa5]/g, ' ').replace(/[^a-zA-Z\s]/g, ' ').trim().split(/\s+/).filter(k => k.length > 1);
        
        try {
          const files = fs.readdirSync(replayDirPath);
          // 先尝试精确匹配
          let matchedFile = files.find(f => f === targetName);
          // 再尝试中文关键词匹配
          if (!matchedFile && chineseKeywords.length > 0) {
            matchedFile = files.find(f => chineseKeywords.some(k => f.includes(k)));
          }
          // 再尝试英文关键词匹配
          if (!matchedFile && englishKeywords.length > 0) {
            matchedFile = files.find(f => englishKeywords.some(k => f.toLowerCase().includes(k.toLowerCase())));
          }
          
          if (matchedFile) {
            const filePath = path.join(replayDirPath, matchedFile);
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
              // 【修复】使用 readFileContent 正确处理 .docx 文件
              const content = await readFileContent(filePath);
              const newDoc = {
                id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: matchedFile,
                content,
                uploadedAt: Date.now()
              };
              doc = upsertDoc(newDoc);
              persistDocs();
              logger.info('REPLAY', `从目录加载文档: ${matchedFile}`, { chineseKeywords });
            }
          }
        } catch (e) {
          logger.warn('REPLAY', '从目录加载文档失败', { error: e.message });
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
          
          // 获取目标摘要索引
          let targetSumIdx = 0;
          if (Array.isArray(meta.destinations)) {
            const dest = meta.destinations.find(d => d?.sectionId === targetSection.id);
            if (dest && typeof dest.summaryIndex === 'number') targetSumIdx = dest.summaryIndex;
            if (dest && typeof dest.sumIdx === 'number') targetSumIdx = dest.sumIdx;
          }
          if (Array.isArray(meta.targetSectionsDetail)) {
            const detail = meta.targetSectionsDetail.find(d => d?.id === targetSection.id);
            if (detail && typeof detail.summaryIndex === 'number') targetSumIdx = detail.summaryIndex;
          }
          
          logger.info('REPLAY', `copy_full_to_summary 写入摘要位置`, { sectionId: targetSection.id, targetSumIdx });
          
          const nextTpl = {
            ...tpl,
            sections: tpl.sections.map(s => {
              if (s.id !== targetSection.id) return s;
              
              // 确保 summaries 数组存在且足够长
              let summaries = Array.isArray(s.summaries) ? [...s.summaries] : [];
              while (summaries.length <= targetSumIdx) {
                summaries.push({ id: `${s.id}_sum_${summaries.length}`, content: '' });
              }
              
              // 更新目标摘要位置
              summaries[targetSumIdx] = { ...summaries[targetSumIdx], content: content };
              
              // 如果写入第一个摘要，同时更新 summary 字段
              const updatedSection = { ...s, summaries };
              if (targetSumIdx === 0) {
                updatedSection.summary = content;
              }
              
              return updatedSection;
            })
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
      // 关联文档（与后管端逻辑一致：使用大模型语义匹配）
      const docName = meta.docName || llmScript?.docName || '';
      let doc = findDoc(docName, meta.docId);
      
      // 【关键】LLM 模式：使用大模型语义匹配文档（与后管端完全一致）
      if (!doc && mode === 'llm' && docs.length > 0) {
        const docSelectorKeywords = llmScript?.docSelector?.keywords || [];
        const flexKeywordsArr = (llmScript?.flexKeywords || '').split(/[,，\s]+/).filter(Boolean);
        const docNameKeywords = (docName || '').replace(/[（）()【】\[\].txt.docx.doc\-_]/g, ' ').trim().split(/\s+/).filter(Boolean);
        const allKeywords = [...new Set([...docSelectorKeywords, ...flexKeywordsArr, ...docNameKeywords])];
        
        const recordedDocInfo = {
          docName: docName,
          description: llmScript?.actionDescription || '关联文档',
          aiGuidance: llmScript?.aiGuidance || meta?.aiGuidance || '',
          keywords: allKeywords.join(' '),
          selectorDescription: llmScript?.docSelector?.description || '',
          flexKeywords: llmScript?.flexKeywords || ''
        };
        
        const candidateDocs = docs.map(d => ({ id: d.id, name: d.name }));
        try {
          const docMatchRes = await callQwenSemanticMatch({
            taskType: 'find_document',
            recordedInfo: recordedDocInfo,
            candidates: candidateDocs
          });
          logger.info('REPLAY', '大模型文档匹配结果', { docMatchRes });
          if (docMatchRes.matchedIndex >= 0 && docMatchRes.matchedIndex < candidateDocs.length) {
            doc = docs.find(d => d.id === candidateDocs[docMatchRes.matchedIndex].id);
            logger.info('REPLAY', `大模型匹配到文档: ${doc?.name}`);
          }
        } catch (e) {
          logger.warn('REPLAY', '大模型文档匹配失败', { error: e.message });
        }
      }
      
      // 尝试从 replayDir 加载（使用中文关键词匹配）
      if (!doc && replayDirPath) {
        const targetName = docName || '';
        // 提取中文关键词（连续的中文字符）
        const cleanName = targetName.replace(/\.(txt|docx?|pdf|xlsx?)$/i, '');
        const chineseKeywords = (cleanName.match(/[\u4e00-\u9fa5]+/g) || []);
        const englishKeywords = cleanName.replace(/[\u4e00-\u9fa5]/g, ' ').replace(/[^a-zA-Z\s]/g, ' ').trim().split(/\s+/).filter(k => k.length > 1);
        
        try {
          const files = fs.readdirSync(replayDirPath);
          // 先尝试精确匹配
          let matchedFile = files.find(f => f === targetName);
          // 再尝试中文关键词匹配
          if (!matchedFile && chineseKeywords.length > 0) {
            matchedFile = files.find(f => chineseKeywords.some(k => f.includes(k)));
          }
          // 再尝试英文关键词匹配
          if (!matchedFile && englishKeywords.length > 0) {
            matchedFile = files.find(f => englishKeywords.some(k => f.toLowerCase().includes(k.toLowerCase())));
          }
          
          if (matchedFile) {
            const filePath = path.join(replayDirPath, matchedFile);
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
              // 【修复】使用 readFileContent 正确处理 .docx 文件
              const content = await readFileContent(filePath);
              const newDoc = {
                id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: matchedFile,
                content,
                uploadedAt: Date.now()
              };
              doc = upsertDoc(newDoc);
              persistDocs();
              logger.info('REPLAY', `从目录加载文档: ${matchedFile}`, { chineseKeywords });
            }
          }
        } catch (e) {
          logger.warn('REPLAY', '从目录加载文档失败', { error: e.message });
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
      // 取消关联（与后管端逻辑一致：找不到时跳过而非失败）
      const tpl = getTemplate();
      const targetTitle = meta.targetSectionTitle || llmScript?.targetSectionTitle || '';
      
      // LLM 模式：语义匹配
      let targetSection = null;
      if (mode === 'llm' && targetTitle) {
        try {
          const candidates = tpl.sections.map(s => ({ id: s.id, level: s.level, title: s.title }));
          const matchRes = await callQwenSemanticMatch({
            taskType: 'find_outline_section',
            recordedInfo: { targetTitle, description: '取消关联' },
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
      
      // 【重要】找不到目标时跳过（与后管端逻辑一致）
      if (!targetSection) {
        if (mode === 'llm') {
          status = 'pass';
          reason = `⏭️ 跳过执行：当前大纲中未找到与「${targetTitle || '(空)'}」相似的目标标题`;
          replayMode = 'skipped';
        } else {
          status = 'fail';
          reason = '未找到目标标题';
        }
      } else {
        const docName = meta.docName || llmScript?.docName || '';
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
        reason = mode === 'llm'
          ? `🤖 大模型 Replay Done（已取消关联）`
          : `📜 脚本 Replay Done（已取消关联）`;
        replayMode = mode;
      }
      
    } else if (metaType === 'insert_to_summary' || metaType === 'insert_to_summary_multi' || 
               section.action === '填入摘要' || section.action === '添入摘要') {
      // ========== 填入摘要 - 区分大模型模式和脚本模式 ==========
      // 
      // 【大模型模式 (mode === 'llm')】
      // 1. 使用 llmScript 中的参考特征
      // 2. 从新文档中匹配类似内容
      // 3. 大模型处理并返回写入脚本
      // 4. 匹配失败时可回退到脚本模式或 pass
      //
      // 【脚本模式 (mode === 'script')】
      // 1. 直接使用 meta/originalScript 中的精确参数
      // 2. 使用录制时的原始内容（meta.inputs[].text）
      // 3. 精确匹配目标位置（使用 sectionId）
      // 4. 不进行大模型泛化，不匹配则 fail
      //
      
      const tpl = getTemplate();
      const originalScript = section.originalScript || {};
      
      // ========== 脚本模式：精确复现 ==========
      if (mode === 'script') {
        logger.info('REPLAY', '填入摘要 - 脚本模式：精确复现');
        
        // 从 meta 或 originalScript 获取精确参数
        const targetIds = Array.isArray(meta.targetSectionIds) ? meta.targetSectionIds : 
                         (meta.sectionId ? [meta.sectionId] : []);
        
        // 获取录制时的原始内容和上下文
        let originalText = '';
        let recordedContextBefore = '';
        let recordedContextAfter = '';
        
        if (Array.isArray(meta.inputs)) {
          const selInput = meta.inputs.find(x => x?.kind === 'selection');
          originalText = (selInput?.text || selInput?.textExcerpt || '').toString().trim();
          // 【关键】获取录制时的上下文
          recordedContextBefore = (selInput?.contextBefore || '').toString().trim();
          recordedContextAfter = (selInput?.contextAfter || '').toString().trim();
        }
        if (!originalText) {
          originalText = (meta?.outputs?.insertedExcerpt || meta?.outputs?.writtenContent || '').toString().trim();
        }
        
        // 【关键新增】脚本模式上下文验证
        // 如果记录了上下文，需要在源文档中验证上下文是否匹配
        let contextVerified = true;
        let contextMismatchReason = '';
        
        if (recordedContextBefore || recordedContextAfter) {
          // 从请求中获取当前文档内容
          const currentDocContent = req.body?.currentDocContent || '';
          
          if (currentDocContent && originalText) {
            // 在当前文档中查找原始内容
            const contentIndex = currentDocContent.indexOf(originalText);
            
            if (contentIndex === -1) {
              // 原始内容在当前文档中不存在
              contextVerified = false;
              contextMismatchReason = '原始内容在当前文档中不存在';
            } else {
              // 验证上下文
              if (recordedContextBefore) {
                const actualContextBefore = currentDocContent.substring(
                  Math.max(0, contentIndex - recordedContextBefore.length - 50),
                  contentIndex
                ).trim();
                // 检查录制的上下文是否包含在实际上下文中（允许一定的偏移）
                if (!actualContextBefore.includes(recordedContextBefore.substring(0, 30)) &&
                    !recordedContextBefore.includes(actualContextBefore.substring(actualContextBefore.length - 30))) {
                  contextVerified = false;
                  contextMismatchReason = `前文上下文不匹配：期望包含「${recordedContextBefore.substring(0, 30)}...」`;
                }
              }
              
              if (contextVerified && recordedContextAfter) {
                const actualContextAfter = currentDocContent.substring(
                  contentIndex + originalText.length,
                  contentIndex + originalText.length + recordedContextAfter.length + 50
                ).trim();
                if (!actualContextAfter.includes(recordedContextAfter.substring(0, 30)) &&
                    !recordedContextAfter.includes(actualContextAfter.substring(0, 30))) {
                  contextVerified = false;
                  contextMismatchReason = `后文上下文不匹配：期望包含「${recordedContextAfter.substring(0, 30)}...」`;
                }
              }
            }
            
            logger.info('REPLAY', '脚本模式上下文验证', {
              hasContextBefore: !!recordedContextBefore,
              hasContextAfter: !!recordedContextAfter,
              contextVerified,
              contextMismatchReason: contextMismatchReason || '(验证通过)'
            });
          }
        }
        
        // 校验：脚本模式必须有精确的目标ID和内容
        if (targetIds.length === 0) {
          status = 'fail';
          reason = '❌ 脚本模式失败：未记录目标章节ID';
          replayMode = 'script';
        } else if (!originalText) {
          status = 'fail';
          reason = '❌ 脚本模式失败：未记录原始选中内容';
          replayMode = 'script';
        } else if (!contextVerified && contextMismatchReason) {
          // 【修改】上下文不匹配时，仍然执行写入，但添加警告提示
          // 这样可以支持在不同文档上使用录制的脚本
          logger.warn('REPLAY', '上下文验证失败但仍继续执行', { reason: contextMismatchReason });
          // 继续执行下面的写入逻辑，不跳过
        }
        
        // 继续执行写入操作
        if (status !== 'fail') {
          // 精确匹配目标章节
          const validTargets = targetIds.filter(id => tpl.sections.find(s => s.id === id));
          
          if (validTargets.length === 0) {
            status = 'fail';
            reason = `❌ 脚本模式失败：目标章节不存在（ID: ${targetIds.join(', ')}）`;
            replayMode = 'script';
          } else {
            // 获取目标摘要索引
            const getSummaryIndexForSection = (sectionId) => {
              if (Array.isArray(meta.destinations)) {
                const dest = meta.destinations.find(d => d?.sectionId === sectionId);
                if (dest && typeof dest.summaryIndex === 'number') return dest.summaryIndex;
              }
              if (Array.isArray(meta.targetSummaries)) {
                const ts = meta.targetSummaries.find(t => t?.sectionId === sectionId);
                if (ts && typeof ts.summaryIndex === 'number') return ts.summaryIndex;
              }
              return 0;
            };
            
            // 执行写入（使用录制时的原始内容）
            const nextTpl = {
              ...tpl,
              sections: tpl.sections.map(s => {
                if (!validTargets.includes(s.id)) return s;
                
                const targetSumIdx = getSummaryIndexForSection(s.id);
                const updatedSection = { ...s };
                let summaries = Array.isArray(s.summaries) ? [...s.summaries] : [];
                
                while (summaries.length <= targetSumIdx) {
                  summaries.push({ id: `${s.id}_sum_${summaries.length}`, content: '' });
                }
                
                summaries[targetSumIdx] = { ...summaries[targetSumIdx], content: originalText };
                updatedSection.summaries = summaries;
                
                if (targetSumIdx === 0) {
                  updatedSection.summary = originalText;
                }
                
                return updatedSection;
              })
            };
            
            applyTemplate(nextTpl);
            
            status = 'done';
            reason = `📜 脚本 Replay Done（已写入 ${validTargets.length} 个摘要）`;
            replayMode = 'script';
            logger.info('REPLAY', '脚本模式执行成功', { targets: validTargets.length });
          }
        }
      }
      // ========== 大模型模式：智能匹配与泛化 ==========
      else {
        logger.info('REPLAY', '填入摘要 - 大模型模式：智能匹配');
        
        let ids = Array.isArray(meta.targetSectionIds) ? meta.targetSectionIds : 
                  (meta.sectionId ? [meta.sectionId] : []);
        const targetTitles = Array.isArray(meta.selectedSectionTitles) ? meta.selectedSectionTitles : 
                            (Array.isArray(meta.destinations) ? meta.destinations.map(d => d?.sectionTitle).filter(Boolean) : []);
        
        // 校验目标章节
        if (ids.length === 0 && targetTitles.length === 0) {
          status = 'pass';
          reason = '⏭️ 跳过执行：未记录目标章节信息';
          replayMode = 'skipped';
        } else {
          // 获取匹配参考特征（优先从 llmScript，其次从 meta）
          let referenceFeatures = null;
          if (llmScript?.contentDescription || llmScript?.contextBefore || llmScript?.contextAfter) {
            referenceFeatures = {
              textHead: llmScript.contentDescription || '',
              textTail: '',
              contextBefore: llmScript.contextBefore || '',
              contextAfter: llmScript.contextAfter || '',
              textLength: 0,
              docName: llmScript.docName || meta.docName || ''
            };
          }
          if (!referenceFeatures && Array.isArray(meta.inputs)) {
            const selInput = meta.inputs.find(x => x?.kind === 'selection');
            if (selInput) {
              referenceFeatures = {
                textHead: selInput.textHead || (selInput.text || '').slice(0, 50),
                textTail: selInput.textTail || (selInput.text || '').slice(-50),
                contextBefore: selInput.contextBefore || '',
                contextAfter: selInput.contextAfter || '',
                textLength: selInput.textLength || (selInput.text || '').length,
                docName: selInput.docName || meta.docName || ''
              };
            }
          }
          
          if (!referenceFeatures) {
            // 大模型模式缺少参考特征时，尝试回退到脚本模式
            logger.warn('REPLAY', '大模型模式缺少参考特征，尝试回退到脚本模式');
            
            let originalText = '';
            if (Array.isArray(meta.inputs)) {
              const selInput = meta.inputs.find(x => x?.kind === 'selection');
              originalText = (selInput?.text || '').toString().trim();
            }
            
            if (originalText && ids.length > 0) {
              // 可以回退到脚本模式
              const validTargets = ids.filter(id => tpl.sections.find(s => s.id === id));
              if (validTargets.length > 0) {
                const nextTpl = {
                  ...tpl,
                  sections: tpl.sections.map(s => {
                    if (!validTargets.includes(s.id)) return s;
                    return { ...s, summary: originalText };
                  })
                };
                applyTemplate(nextTpl);
                
                status = 'done';
                reason = `📜 脚本回退 Replay Done（大模型缺少参考特征，使用原始内容写入 ${validTargets.length} 个摘要）`;
                replayMode = 'script_fallback';
              } else {
                status = 'pass';
                reason = '⏭️ 跳过执行：目标章节不存在';
                replayMode = 'skipped';
              }
            } else {
              status = 'pass';
              reason = '⏭️ 跳过执行：缺少参考特征且无法回退';
              replayMode = 'skipped';
            }
          } else {
            // 获取新文档内容
            let newDocContent = currentDocContent || '';
            let newDocName = currentDocName || '';
            
            // 尝试从 replayDirPath 加载
            if (!newDocContent && replayDirPath && referenceFeatures.docName) {
              try {
                const files = fs.readdirSync(replayDirPath);
                const origDocName = referenceFeatures.docName;
                const keywords = (origDocName || '').replace(/\.(txt|docx?|pdf|xlsx?)$/i, '')
                  .replace(/[\u4e00-\u9fa5]/g, m => m + ' ')
                  .split(/[^a-zA-Z\u4e00-\u9fa5]+/)
                  .filter(k => k.length > 1);
                
                const matchedFile = files.find(f => keywords.some(k => f.toLowerCase().includes(k.toLowerCase())));
                if (matchedFile) {
                  const filePath = path.join(replayDirPath, matchedFile);
                  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                    // 【修复】使用 readFileContent 正确处理 .docx 文件
                    newDocContent = await readFileContent(filePath);
                    newDocName = matchedFile;
                    logger.info('REPLAY', `从 replayDir 加载文档: ${matchedFile}`);
                  }
                }
              } catch (e) {
                logger.warn('REPLAY', '从 replayDir 加载文档失败', { error: e.message });
              }
            }
            
            // 【校验】没有新文档内容 → skip
            if (!newDocContent) {
              status = 'pass';
              reason = '⏭️ 跳过执行：当前内容预览为空，无法匹配类似内容（请先加载文档）';
              replayMode = 'skipped';
            } else {
              // 【Step 4】获取目标章节信息
            // 【关键修复】优先使用前端传递的 aiGuidance，确保计算指导不丢失
            const aiGuidance = frontendAiGuidance || llmScript?.aiGuidance || meta?.aiGuidance || '';
            // 【新增】获取计算公式和输出格式（优先使用前端传递的值）
            const calculationFormula = frontendCalculationFormula || llmScript?.calculationFormula || '';
            const outputFormat = frontendOutputFormat || llmScript?.outputFormat || '';
            
            const specialRequirements = [
              llmScript?.specialRequirements || '',
              depositAccumulatedRequirements || ''
            ].filter(Boolean).join('\n\n');
            
            logger.info('REPLAY', '填入摘要 - 处理指导:', { 
              frontendAiGuidance: frontendAiGuidance?.substring(0, 100) || '(空)',
              calculationFormula: calculationFormula?.substring(0, 100) || '(空)',
              outputFormat: outputFormat?.substring(0, 50) || '(空)'
            });
            
            // 【关键修复】检测是否需要计算处理 - 优先检查是否有计算公式
            const needsCalculation = calculationFormula || (aiGuidance && (
              aiGuidance.includes('计算公式') ||
              aiGuidance.includes('【计算公式】') ||
              aiGuidance.includes('{{') ||
              /=.*\+/.test(aiGuidance)
            ));
            
            // 获取目标章节标题列表（用于大模型匹配）
            const outlineSections = tpl.sections.map(s => ({
              id: s.id,
              level: s.level,
              title: s.title,
              currentSummary: (s.summary || '').substring(0, 50)
            }));
            
            // 【Step 5】单条发给大模型：匹配内容 + 处理 + 生成写入脚本
            // 【关键修复】根据是否需要计算，使用不同的 prompt 策略
            let unifiedPrompt;
            
            if (needsCalculation) {
              // 计算类任务：强调计算处理
              logger.info('REPLAY', '检测到计算任务，使用计算专用 prompt', {
                calculationFormula: calculationFormula?.substring(0, 150),
                outputFormat: outputFormat?.substring(0, 80),
                docContentLength: newDocContent?.length || 0,
                docContentPreview: newDocContent?.substring(0, 300)
              });
              
              // 【优化】判断是简单赋值还是复杂计算
              const isSimpleAssignment = calculationFormula && !calculationFormula.includes('+') && !calculationFormula.includes('-') && !calculationFormula.includes('*');
              logger.info('REPLAY', `计算类型: ${isSimpleAssignment ? '简单提取（单值赋值）' : '复杂计算（多值运算）'}`);
              
              // 【关键】计算任务只需要返回计算结果，目标位置由系统决定
              unifiedPrompt = `你是一个**数据提取和计算专家**。你的唯一任务是从文档中提取数值并${isSimpleAssignment ? '直接使用该数值' : '执行数学计算'}。

========== 【重要说明】==========
${isSimpleAssignment ? 
`这是一个**简单提取任务**：只需要找到文档中与计算公式描述匹配的数值，直接使用该数值填入输出格式即可。
- 不需要进行加减乘除运算
- 只需要找到正确的数值并填入` : 
`这是一个**计算任务**：需要从文档中提取多个数值，然后按公式进行计算。`}

========== 【文档内容】==========
${newDocContent.substring(0, 4000)}

========== 【计算公式】==========
${calculationFormula || aiGuidance}

========== 【输出格式】==========
${outputFormat || '（直接输出计算结果）'}

========== 【执行步骤】==========
${isSimpleAssignment ? 
`【简单提取示例】
假设文档中有："共检查847岗次，发现问题5件"
假设计算公式是：{{调度检查总次数}} = {{共检查岗次数值}}
假设输出格式是：外围检查站 {{调度检查总次数}} 次，

正确的执行：
Step 1: 在文档中找到"共检查"后面的数字 → 847
Step 2: 将 847 填入输出格式
Step 3: 生成结果 → "外围检查站 847 次，"` :
`【多值计算示例】
假设文档中有："开展预警调度指挥68次，对一线带班领导电台调度89次，视频巡检373次，实地检查岗位29个"
假设计算公式是：{{总次数}} = {{预警调度次数}} + {{电台调度次数}} + {{视频巡检次数}} + {{实地检查数量}}
假设输出格式是：其中政治中心区 {{总次数}} 次，

正确的执行：
Step 1: 提取数值 - 预警:68, 电台:89, 视频:373, 实地:29
Step 2: 计算 68 + 89 + 373 + 29 = 559
Step 3: 生成结果 → "其中政治中心区 559 次，"`}

========== 【输出要求】==========
返回 JSON 格式：
{
  "matched": true,
  "extractedValues": {...提取的数值...},
  "calculation": "计算过程或直接赋值说明",
  "processedContent": "按输出格式填入数值后的最终字符串",
  "matchedContent": "文档中被匹配到的原始内容"
}

⚠️ 关键要求：
1. processedContent 必须是按【输出格式】填入数值后的完整字符串
2. 必须将 {{变量名}} 替换为实际数值
3. 仔细阅读【计算公式】，找到公式中描述的数值（如"共检查岗次"对应文档中"共检查XXX岗次"的数字）
4. 输出格式中的文字（如"外围检查站"）必须保持不变，只替换 {{}} 部分

请直接返回 JSON（不要 markdown 代码块）：`;
            } else {
              // 非计算类任务：标准处理
              unifiedPrompt = `你是一个智能文档处理助手。请完成以下任务，并返回结构化的 JSON 结果。

========== 任务说明 ==========
1. 在【新文档内容】中找到与【参考特征】类似的内容段落
2. 根据【处理指导】对匹配到的内容进行处理
3. 确定写入的目标位置（从【当前大纲】中匹配）
4. 生成写入脚本

========== 输入数据 ==========

【参考特征（来自之前录制的操作）】
- 开头特征：${referenceFeatures.textHead || '(无)'}
- 结尾特征：${referenceFeatures.textTail || '(无)'}
- 前文上下文：${referenceFeatures.contextBefore || '(无)'}
- 后文上下文：${referenceFeatures.contextAfter || '(无)'}
- 预期字数：约 ${referenceFeatures.textLength || '未知'} 字
- 原文档名：${referenceFeatures.docName || '(无)'}

【新文档内容】
${newDocContent.substring(0, 6000)}${newDocContent.length > 6000 ? '\n...(内容已截断)' : ''}

【处理指导】
${aiGuidance || '无特殊处理指导，直接使用匹配到的原始内容'}

【输出格式要求】
${specialRequirements || '无特殊格式要求'}

【当前大纲结构】
${outlineSections.map(s => `- [${s.id}] ${'  '.repeat(s.level - 1)}${s.title}`).join('\n')}`;
            }
            
            // 添加通用输出要求
            unifiedPrompt += `

【录制时的目标标题】
${targetTitles.length > 0 ? targetTitles.join('、') : '(未记录)'}

========== 输出要求 ==========

请返回严格的 JSON 格式（不要包含 markdown 代码块标记）：

{
  "matched": true或false,
  "matchedContent": "从新文档中匹配到的原始内容（如果找不到则为空字符串）",
  "processedContent": "处理后的最终内容（按照处理指导和格式要求处理后的结果）",
  "writeScript": {
    "action": "write_summary",
    "targetSectionId": "目标章节的ID（从当前大纲中匹配）",
    "targetSectionTitle": "目标章节的标题",
    "summaryIndex": 0,
    "content": "要写入的内容（与processedContent相同）"
  },
  "reason": "简要说明匹配和处理的逻辑"
}

如果无法匹配到内容，返回：
{
  "matched": false,
  "matchedContent": "",
  "processedContent": "",
  "writeScript": null,
  "reason": "未找到类似内容的原因"
}`;

            let llmResult = null;
            
            if (QWEN_API_KEY) {
              try {
                const llmResp = await fetch(QWEN_ENDPOINT, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${QWEN_API_KEY}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    model: QWEN_MODEL,
                    messages: [{ role: 'user', content: unifiedPrompt }],
                    max_tokens: 2000,
                    temperature: 0.2
                  })
                });
                
                if (llmResp.ok) {
                  const llmData = await llmResp.json();
                  const llmContent = (llmData?.choices?.[0]?.message?.content || '').trim();
                  
                  // 解析 JSON（移除可能的 markdown 标记）
                  let jsonStr = llmContent;
                  if (jsonStr.startsWith('```')) {
                    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
                  }
                  
                  try {
                    llmResult = JSON.parse(jsonStr);
                    logger.info('REPLAY', '大模型返回结果解析成功', { 
                      matched: llmResult.matched,
                      hasWriteScript: !!llmResult.writeScript 
                    });
                    // 【新增】详细打印 LLM 返回的关键内容
                    logger.info('REPLAY', '大模型返回的内容', {
                      processedContent: llmResult.processedContent,
                      matchedContent: llmResult.matchedContent?.substring(0, 100),
                      contentToWrite: llmResult.writeScript?.content || llmResult.processedContent,
                      extractedValues: llmResult.extractedValues,
                      calculation: llmResult.calculation
                    });
                  } catch (parseErr) {
                    logger.warn('REPLAY', '大模型返回 JSON 解析失败', { content: llmContent.substring(0, 500) });
                  }
                }
              } catch (llmErr) {
                logger.warn('REPLAY', `大模型调用失败: ${llmErr.message}`);
              }
            }
            
            // 【Step 6】根据大模型结果执行写入脚本
            // 【关键修复】优先使用前端传递的精确目标信息，而不是大模型返回的目标
            const frontendDestinations = Array.isArray(meta.destinations) ? meta.destinations : [];
            const frontendTargetSummaries = Array.isArray(meta.targetSummaries) ? meta.targetSummaries : [];
            
            logger.info('REPLAY', '检查前端传递的目标信息', {
              destinationsCount: frontendDestinations.length,
              targetSummariesCount: frontendTargetSummaries.length,
              firstDestination: frontendDestinations[0],
              firstDestSummaryIndex: frontendDestinations[0]?.summaryIndex,
              firstTargetSumSummaryIndex: frontendTargetSummaries[0]?.summaryIndex
            });
            
            if (!llmResult || !llmResult.matched) {
              status = 'pass';
              reason = `⏭️ 跳过执行：${llmResult?.reason || '在新文档中未找到类似内容'}`;
              replayMode = 'skipped';
            } else {
              // 获取大模型处理后的内容
              const contentToWrite = llmResult.processedContent || llmResult.writeScript?.content || llmResult.matchedContent || '';
              
              logger.info('REPLAY', '大模型返回的内容', {
                processedContent: llmResult.processedContent?.substring(0, 100) || '(空)',
                matchedContent: llmResult.matchedContent?.substring(0, 100) || '(空)',
                contentToWrite: contentToWrite?.substring(0, 100) || '(空)'
              });
              
              if (!contentToWrite) {
                status = 'pass';
                reason = '⏭️ 跳过执行：处理后的内容为空';
                replayMode = 'skipped';
              } else {
                // 【关键修复】使用前端传递的精确目标信息
                let targetSection = null;
                let targetSumIdx = 0;
                let sumIdxSource = 'default';
                
                // 【关键】先确定 summaryIndex（优先从前端传递的数据获取，不会被覆盖）
                // 【修复】支持数字和字符串类型的 summaryIndex
                const destSumIdx = frontendDestinations[0]?.summaryIndex;
                const tsSumIdx = frontendTargetSummaries[0]?.summaryIndex;
                
                if (frontendDestinations.length > 0 && destSumIdx !== undefined && destSumIdx !== null) {
                  targetSumIdx = typeof destSumIdx === 'number' ? destSumIdx : parseInt(destSumIdx, 10);
                  if (isNaN(targetSumIdx)) targetSumIdx = 0;
                  sumIdxSource = 'destinations';
                } else if (frontendTargetSummaries.length > 0 && tsSumIdx !== undefined && tsSumIdx !== null) {
                  targetSumIdx = typeof tsSumIdx === 'number' ? tsSumIdx : parseInt(tsSumIdx, 10);
                  if (isNaN(targetSumIdx)) targetSumIdx = 0;
                  sumIdxSource = 'targetSummaries';
                }
                
                logger.info('REPLAY', '确定的 summaryIndex', {
                  targetSumIdx,
                  sumIdxSource,
                  destSummaryIndex: destSumIdx,
                  destSummaryIndexType: typeof destSumIdx,
                  targetSumSummaryIndex: tsSumIdx,
                  targetSumSummaryIndexType: typeof tsSumIdx
                });
                
                // 然后查找目标章节
                // 优先从 destinations 获取目标章节
                if (frontendDestinations.length > 0) {
                  const dest = frontendDestinations[0];
                  targetSection = tpl.sections.find(s => s.id === dest.sectionId);
                  if (!targetSection && dest.sectionTitle) {
                    targetSection = tpl.sections.find(s => 
                      s.title === dest.sectionTitle || 
                      s.title?.includes(dest.sectionTitle) ||
                      dest.sectionTitle?.includes(s.title || '')
                    );
                  }
                }
                
                // 其次从 targetSummaries 获取目标章节
                if (!targetSection && frontendTargetSummaries.length > 0) {
                  const ts = frontendTargetSummaries[0];
                  targetSection = tpl.sections.find(s => s.id === ts.sectionId);
                  if (!targetSection && ts.sectionTitle) {
                    targetSection = tpl.sections.find(s => 
                      s.title === ts.sectionTitle || 
                      s.title?.includes(ts.sectionTitle) ||
                      ts.sectionTitle?.includes(s.title || '')
                    );
                  }
                }
                
                // 最后从 targetSectionIds 获取目标章节
                if (!targetSection && ids.length > 0) {
                  targetSection = tpl.sections.find(s => ids.includes(s.id));
                }
                
                // 如果还找不到，使用大模型返回的目标（兜底，但不覆盖 summaryIndex）
                if (!targetSection && llmResult.writeScript) {
                  const script = llmResult.writeScript;
                  targetSection = tpl.sections.find(s => s.id === script.targetSectionId);
                  if (!targetSection && script.targetSectionTitle) {
                    targetSection = tpl.sections.find(s => 
                      s.title === script.targetSectionTitle || 
                      s.title?.includes(script.targetSectionTitle) ||
                      script.targetSectionTitle?.includes(s.title || '')
                    );
                  }
                  // 只有在前端没有提供 summaryIndex 时才使用大模型返回的
                  if (targetSection && sumIdxSource === 'default') {
                    targetSumIdx = script.summaryIndex || 0;
                    sumIdxSource = 'llmResult';
                  }
                }
                
                logger.info('REPLAY', '确定的目标位置', {
                  targetSection: targetSection?.title || '(未找到)',
                  targetSectionId: targetSection?.id || '(未找到)',
                  targetSumIdx,
                  sumIdxSource,
                  usedFrontendTarget: !!frontendDestinations.length || !!frontendTargetSummaries.length
                });
                
                if (!targetSection) {
                  status = 'pass';
                  reason = `⏭️ 跳过执行：当前大纲中未找到目标章节`;
                  replayMode = 'skipped';
                } else {
                  // 执行写入
                  const nextTpl = {
                    ...tpl,
                    sections: tpl.sections.map(s => {
                      if (s.id !== targetSection.id) return s;
                      
                      const updatedSection = { ...s };
                      let summaries = Array.isArray(s.summaries) ? [...s.summaries] : [];
                      
                      while (summaries.length <= targetSumIdx) {
                        summaries.push({ id: `${s.id}_sum_${summaries.length}`, content: '' });
                      }
                      
                      summaries[targetSumIdx] = { ...summaries[targetSumIdx], content: contentToWrite };
                      updatedSection.summaries = summaries;
                      
                      if (targetSumIdx === 0) {
                        updatedSection.summary = contentToWrite;
                      }
                      
                      return updatedSection;
                    })
                  };
                  
                  applyTemplate(nextTpl);
                  
                  logger.info('REPLAY', '写入脚本执行成功', {
                    targetSection: targetSection.title,
                    summaryIndex: targetSumIdx,
                    contentLength: contentToWrite.length
                  });
                  
                  status = 'done';
                  reason = `🤖 大模型 Replay Done（已写入摘要[${targetSumIdx}]：「${targetSection.title}」，内容长度：${contentToWrite.length}）`;
                  replayMode = 'llm';
                }
              }
            }
          }
        }
      }
      }
      
    } else if (metaType === 'delete_outline_section' || section.action === '删除标题') {
      // 删除标题（与后管端逻辑一致：找不到时跳过而非失败）
      const tpl = getTemplate();
      const targetTitle = meta.targetSection?.title || meta.targetSectionTitle || llmScript?.targetSectionTitle || '';
      
      // LLM 模式：语义匹配
      let targetSection = null;
      if (mode === 'llm' && targetTitle) {
        try {
          const candidates = tpl.sections.map(s => ({ id: s.id, level: s.level, title: s.title }));
          const matchRes = await callQwenSemanticMatch({
            taskType: 'find_outline_section',
            recordedInfo: { targetTitle, description: '删除标题' },
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
      
      // 【重要】找不到目标时跳过（与后管端逻辑一致）
      if (!targetSection) {
        if (mode === 'llm') {
          status = 'pass';
          reason = `⏭️ 跳过执行：当前大纲中未找到与「${targetTitle || '(空)'}」相似的目标标题`;
          replayMode = 'skipped';
        } else {
          status = 'fail';
          reason = targetTitle ? `未找到标题「${targetTitle}」` : '未指定目标标题';
        }
      } else {
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
        reason = mode === 'llm'
          ? `🤖 大模型 Replay Done（已删除标题「${targetSection.title}」，共 ${idsToRemove.length} 条）`
          : `📜 脚本 Replay Done（已删除标题「${targetSection.title}」，共 ${idsToRemove.length} 条）`;
        replayMode = mode;
      }
      
    } else if (metaType === 'add_outline_section' || section.action === '新增标题') {
      // 新增标题
      const tpl = getTemplate();
      const newTitle = meta.newSection?.title || meta.newTitle || llmScript?.newTitle || '新标题';
      const newLevel = meta.newSection?.level || meta.level || llmScript?.level || 1;
      
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
      reason = mode === 'llm'
        ? `🤖 大模型 Replay Done（已新增标题「${newTitle}」）`
        : `📜 脚本 Replay Done（已新增标题「${newTitle}」）`;
      replayMode = mode;
      
    } else if (metaType === 'outline_clear' || section.action === '清除大纲') {
      // 清除大纲
      const emptyTpl = { id: 'template_empty', name: '空模板', sections: [] };
      applyTemplate(emptyTpl);
      scene.sectionDocLinks = {};
      
      status = 'done';
      reason = mode === 'llm'
        ? `🤖 大模型 Replay Done（已清除大纲）`
        : `📜 脚本 Replay Done（已清除大纲）`;
      replayMode = mode;
      
    } else if (metaType === 'restore_history_outline' || section.action === '历史大纲选取') {
      // 恢复历史大纲（与后管端逻辑一致）
      const outlineId = meta.outlineId || llmScript?.outlineId || '';
      const outlineTitle = meta.outlineTitle || llmScript?.outlineTitle || '';
      
      // 从文件读取历史大纲
      const outlineHistory = loadOutlineHistory();
      
      // 查找匹配的历史大纲
      let historyItem = null;
      if (outlineId) {
        historyItem = outlineHistory.find(h => h.id === outlineId);
      }
      if (!historyItem && outlineTitle) {
        historyItem = outlineHistory.find(h => (h.title || h.docName) === outlineTitle);
      }
      // 如果都没找到，尝试模糊匹配
      if (!historyItem && outlineTitle) {
        historyItem = outlineHistory.find(h => 
          (h.title || h.docName || '').includes(outlineTitle) || 
          outlineTitle.includes(h.title || h.docName || '')
        );
      }
      // 如果还是没找到，使用最新的历史大纲
      if (!historyItem && outlineHistory.length > 0) {
        historyItem = outlineHistory[0];
        logger.info('REPLAY', `未找到指定历史大纲，使用最新的：${historyItem.title || historyItem.docName}`);
      }
      
      if (!historyItem) {
        if (mode === 'llm') {
          status = 'pass';
          reason = `⏭️ 跳过执行：未找到匹配的历史大纲存档「${outlineTitle || outlineId || '(空)'}」`;
          replayMode = 'skipped';
        } else {
          status = 'fail';
          reason = `未找到匹配的历史大纲存档: ${outlineTitle || outlineId}`;
        }
      } else if (historyItem.template && Array.isArray(historyItem.template.sections)) {
        // 应用历史大纲
        applyTemplate(historyItem.template);
        
        status = 'done';
        reason = mode === 'llm'
          ? `🤖 大模型 Replay Done（已恢复历史大纲：${historyItem.title || historyItem.docName}）`
          : `📜 脚本 Replay Done（已恢复历史大纲：${historyItem.title || historyItem.docName}）`;
        replayMode = mode;
      } else {
        status = 'pass';
        reason = `⏭️ 跳过执行：历史大纲数据无效`;
        replayMode = 'skipped';
      }
      
    } else if (metaType === 'dispatch' || metaType === 'dispatch_multi_summary' || 
               metaType === 'execute_instruction' || section.action === '执行指令') {
      // 执行指令（与后管端逻辑一致：缺少数据时跳过而非失败）
      const instructions = meta.instructions || meta.promptContent || llmScript?.instructions || '';
      
      // 【关键修复】从 content/structuredScriptContent 中提取 outputFormat 和 calculationFormula
      // 因为这些字段可能在 llmScript 中为空，但实际存在于内容中
      const contentToSearch = section.content || llmScript?.structuredScriptContent || llmScript?.originalScriptContent || '';
      
      // 提取输出格式
      const outputFormatMatch = contentToSearch.match(/【输出格式】\s*([\s\S]*?)(?=\n【|$)/);
      const extractedOutputFormat = outputFormatMatch ? outputFormatMatch[1].trim() : '';
      
      // 提取计算公式
      const calcFormulaMatch = contentToSearch.match(/【计算公式】\s*([\s\S]*?)(?=\n【|$)/);
      const extractedCalcFormula = calcFormulaMatch ? calcFormulaMatch[1].trim() : '';
      
      // 存储到 meta 中供后续使用
      if (extractedOutputFormat && !meta.outputFormat) {
        meta.outputFormat = extractedOutputFormat;
      }
      if (extractedCalcFormula && !meta.calculationFormula) {
        meta.calculationFormula = extractedCalcFormula;
      }
      
      logger.info('REPLAY', 'dispatch - 提取的输出格式和计算公式', {
        hasExtractedOutputFormat: !!extractedOutputFormat,
        hasExtractedCalcFormula: !!extractedCalcFormula,
        outputFormatPreview: extractedOutputFormat.substring(0, 80),
        calcFormulaPreview: extractedCalcFormula.substring(0, 80)
      });
      
      // 【重要】大模型模式：缺少指令内容时跳过（与后管端逻辑一致）
      if (!instructions) {
        if (mode === 'llm') {
          status = 'pass';
          reason = '⏭️ 跳过执行：未记录指令内容';
          replayMode = 'skipped';
        } else {
          status = 'fail';
          reason = '无指令内容';
        }
      } else {
        const tpl = getTemplate();
        let targetIds = Array.isArray(meta.targetSectionIds) ? meta.targetSectionIds :
                       Array.isArray(meta.selectedSectionIds) ? meta.selectedSectionIds : [];
        
        // 【关键修复】优先从前端传递的 destinations/targetSummaries 获取目标信息（包含 summaryIndex）
        const frontendDestinations = Array.isArray(meta.destinations) ? meta.destinations : [];
        const frontendTargetSummaries = Array.isArray(meta.targetSummaries) ? meta.targetSummaries : [];
        
        logger.info('REPLAY', 'dispatch - 检查前端传递的目标信息', {
          destinationsCount: frontendDestinations.length,
          targetSummariesCount: frontendTargetSummaries.length,
          firstDestSummaryIndex: frontendDestinations[0]?.summaryIndex,
          firstDestSectionId: frontendDestinations[0]?.sectionId,
          firstDestSectionTitle: frontendDestinations[0]?.sectionTitle
        });
        
        // 【关键】先确定 summaryIndex（优先从前端传递的数据获取）
        // 创建 sectionId -> summaryIndex 的映射
        const sectionSummaryIndexMap = {};
        let defaultSummaryIndex = 0;
        
        // 从 destinations 提取
        for (const dest of frontendDestinations) {
          if (dest?.sectionId && (dest.summaryIndex !== undefined && dest.summaryIndex !== null)) {
            const sumIdx = typeof dest.summaryIndex === 'number' ? dest.summaryIndex : parseInt(dest.summaryIndex, 10);
            if (!isNaN(sumIdx)) {
              sectionSummaryIndexMap[dest.sectionId] = sumIdx;
              if (defaultSummaryIndex === 0) defaultSummaryIndex = sumIdx;
            }
          }
        }
        
        // 从 targetSummaries 提取
        for (const ts of frontendTargetSummaries) {
          if (ts?.sectionId && (ts.summaryIndex !== undefined && ts.summaryIndex !== null) && !(ts.sectionId in sectionSummaryIndexMap)) {
            const sumIdx = typeof ts.summaryIndex === 'number' ? ts.summaryIndex : parseInt(ts.summaryIndex, 10);
            if (!isNaN(sumIdx)) {
              sectionSummaryIndexMap[ts.sectionId] = sumIdx;
              if (defaultSummaryIndex === 0) defaultSummaryIndex = sumIdx;
            }
          }
        }
        
        logger.info('REPLAY', 'dispatch - 确定的 summaryIndex 映射', {
          sectionSummaryIndexMap,
          defaultSummaryIndex
        });
        
        // LLM 模式：语义匹配目标章节
        const targetTitles = Array.isArray(meta.selectedSectionTitles) ? meta.selectedSectionTitles :
                            frontendDestinations.map(d => d?.sectionTitle).filter(Boolean);
        
        if (mode === 'llm' && targetTitles.length > 0 && targetIds.length === 0) {
          const candidates = tpl.sections.map(s => ({ id: s.id, level: s.level, title: s.title }));
          for (const title of targetTitles) {
            try {
              const matchRes = await callQwenSemanticMatch({
                taskType: 'find_outline_section',
                recordedInfo: { targetTitle: title, description: '执行指令' },
                candidates
              });
              if (matchRes.matchedId) {
                targetIds.push(matchRes.matchedId);
              }
            } catch (e) {
              logger.warn('REPLAY', '语义匹配失败', { error: e.message });
            }
          }
        }
        
        // 【补充】如果 targetIds 仍然为空，尝试从 destinations 获取
        if (targetIds.length === 0 && frontendDestinations.length > 0) {
          for (const dest of frontendDestinations) {
            if (dest?.sectionId) {
              const sec = tpl.sections.find(s => s.id === dest.sectionId);
              if (sec) {
                targetIds.push(dest.sectionId);
              } else if (dest.sectionTitle) {
                // 尝试标题匹配
                const matchedSec = tpl.sections.find(s => 
                  s.title === dest.sectionTitle || 
                  s.title?.includes(dest.sectionTitle) ||
                  dest.sectionTitle?.includes(s.title || '')
                );
                if (matchedSec) {
                  targetIds.push(matchedSec.id);
                  // 同步 summaryIndex 映射
                  if (dest.summaryIndex !== undefined && dest.summaryIndex !== null) {
                    const sumIdx = typeof dest.summaryIndex === 'number' ? dest.summaryIndex : parseInt(dest.summaryIndex, 10);
                    if (!isNaN(sumIdx)) {
                      sectionSummaryIndexMap[matchedSec.id] = sumIdx;
                    }
                  }
                }
              }
            }
          }
        }
        
        logger.info('REPLAY', 'dispatch - 确定的目标章节', {
          targetIds,
          targetTitles
        });
        
        // 获取目标内容
        let docContent = '';
        if (Array.isArray(meta.inputs)) {
          const docInput = meta.inputs.find(x => x?.kind === 'doc_preview' || x?.kind === 'doc_resource');
          docContent = docInput?.text || docInput?.textExcerpt || '';
        }
        
        // 【关键修复 V2】对于 dispatch_multi_summary，从【当前大纲】获取最新摘要内容（而非录制时的固定值）
        if (metaType === 'dispatch_multi_summary' && frontendTargetSummaries.length > 0) {
          // 从【当前大纲模板】中获取目标章节的所有摘要最新内容
          const targetSectionId = frontendTargetSummaries[0]?.sectionId;
          const targetSection = tpl.sections.find(s => s.id === targetSectionId);
          
          if (targetSection) {
            const currentSummaries = Array.isArray(targetSection.summaries) ? targetSection.summaries : [];
            
            // 构建当前大纲中的摘要内容（使用最新数据，而非录制时数据）
            const summaryContents = frontendTargetSummaries.map((ts, idx) => {
              // 从当前大纲获取该位置的最新摘要内容
              const currentContent = currentSummaries[ts.summaryIndex]?.content || '';
              return `【摘要${idx + 1}（${targetSection.title}[${ts.summaryIndex}]）】\n${currentContent || '(空)'}`;
            }).join('\n\n');
            
            if (summaryContents) {
              docContent = summaryContents + (docContent ? `\n\n【原始文档内容】\n${docContent}` : '');
              logger.info('REPLAY', 'dispatch_multi_summary - 从当前大纲获取最新摘要内容', {
                sectionTitle: targetSection.title,
                summaryCount: frontendTargetSummaries.length,
                contentPreview: docContent.substring(0, 500)
              });
            }
          }
        }
        
        // 获取大纲片段（包含正确的摘要位置内容）
        const outlineSegments = targetIds.map(id => {
          const sec = tpl.sections.find(s => s.id === id);
          if (!sec) return null;
          
          // 获取该章节对应的 summaryIndex
          const sumIdx = sectionSummaryIndexMap[id] ?? defaultSummaryIndex;
          const summaries = Array.isArray(sec.summaries) ? sec.summaries : [];
          const targetSummary = summaries[sumIdx]?.content || sec.summary || '';
          
          return { 
            id: sec.id, 
            title: sec.title, 
            summary: targetSummary,
            summaryIndex: sumIdx
          };
        }).filter(Boolean);
        
        try {
          // 【关键修复】检测并使用分开的 outputFormat 和 calculationFormula 字段
          // 避免使用混乱的 instructions 内容
          let finalInstructions = instructions;
          const outputFormat = meta.outputFormat || llmScript?.outputFormat || '';
          const calculationFormula = meta.calculationFormula || llmScript?.calculationFormula || '';
          
          // 如果有 outputFormat 或 calculationFormula，重构为清晰的指令
          if (outputFormat || calculationFormula) {
            finalInstructions = `【重要】请严格按照以下要求执行：

【输出格式】（最终输出必须严格遵循此格式，不得添加任何额外内容）
${outputFormat || '(未指定)'}

【计算公式】（说明如何计算数值，但计算过程不能出现在最终输出中）
${calculationFormula || '(无需计算)'}

【执行要求】
1. 从文档内容中提取所需数值
2. 按照计算公式进行数学运算
3. 将计算结果填入输出格式中的占位符（如 {{总次数}}、XXX 等）
4. 最终输出【只能】包含填充后的输出格式文本
5. 绝对禁止在输出中包含：计算公式、计算过程、等号表达式、加减乘除符号

【正确示例】
- 输出格式："X月X日，共检查 {{总数}} 次"
- 计算后正确输出："X月X日，共检查 1470 次"
- 错误输出："X月X日，共检查 1470 次，1470=559+64+847"（包含了计算过程，禁止！）`;

            logger.info('REPLAY', 'dispatch - 使用结构化输出格式重构指令', {
              hasOutputFormat: !!outputFormat,
              hasCalculationFormula: !!calculationFormula,
              outputFormat: outputFormat.substring(0, 100),
              calculationFormula: calculationFormula.substring(0, 100)
            });
          }
          
          // 调用 dispatch API
          const dispatchResult = await callQwenDispatch({
            instructions: finalInstructions,
            scene,
            docContent,
            outlineSegments
          });
          
          // 【关键修复】应用结果到正确的摘要位置
          if (dispatchResult.detail && targetIds.length > 0) {
            const nextTpl = {
              ...tpl,
              sections: tpl.sections.map(s => {
                if (!targetIds.includes(s.id)) return s;
                
                // 获取该章节对应的 summaryIndex
                const sumIdx = sectionSummaryIndexMap[s.id] ?? defaultSummaryIndex;
                
                const updatedSection = { ...s };
                let summaries = Array.isArray(s.summaries) ? [...s.summaries] : [];
                
                // 确保 summaries 数组足够长
                while (summaries.length <= sumIdx) {
                  summaries.push({ id: `${s.id}_sum_${summaries.length}`, content: '' });
                }
                
                // 写入到正确的摘要位置
                summaries[sumIdx] = { ...summaries[sumIdx], content: dispatchResult.detail };
                updatedSection.summaries = summaries;
                
                // 如果是第一个摘要，同时更新 summary 字段
                if (sumIdx === 0) {
                  updatedSection.summary = dispatchResult.detail;
                }
                
                return updatedSection;
              })
            };
            applyTemplate(nextTpl);
            
            logger.info('REPLAY', 'dispatch - 写入成功', {
              targetIds,
              sectionSummaryIndexMap,
              contentLength: dispatchResult.detail.length
            });
          }
          
          status = 'done';
          reason = `🤖 大模型 Replay Done（已执行指令，写入 ${targetIds.length} 个摘要位置）`;
          replayMode = 'llm';
        } catch (dispatchErr) {
          if (mode === 'llm') {
            status = 'pass';
            reason = `⏭️ 跳过执行：指令执行失败 - ${dispatchErr.message}`;
            replayMode = 'skipped';
          } else {
            status = 'fail';
            reason = dispatchErr.message || '执行指令失败';
          }
        }
      }
      
    } else if (metaType === 'final_generate' || section.action === '最终文档生成') {
      // 最终文档生成：支持自动回放
      try {
        // 【关键修复】优先使用全局缓存的模板（后管端会同步到这里）
        // 这确保应用端和后管端使用相同的数据源
        const tpl = cachedOutlineTemplate || getTemplate();
        logger.info('REPLAY', '最终文档生成使用模板', { 
          source: cachedOutlineTemplate ? 'cachedOutlineTemplate' : 'scene', 
          sections: tpl?.sections?.length || 0 
        });
        
        // 获取合并方式配置（优先从 main 场景获取，因为应用端使用 main 场景）
        const mainScene = scenes.get('main');
        const sectionMergeType = mainScene?.sectionMergeType || scene?.sectionMergeType || {};
        
        // 收集所有章节的摘要内容
        const contentParts = [];
        for (const sec of tpl.sections || []) {
          if (!sec.title) continue;
          const levelPrefix = '#'.repeat(sec.level || 1);
          contentParts.push(`${levelPrefix} ${sec.title}`);
          
          // 收集摘要 - 与前端 getSummaries 逻辑一致，支持向后兼容
          let summaries = [];
          if (Array.isArray(sec.summaries) && sec.summaries.length > 0) {
            summaries = sec.summaries;
          } else if (sec.summary && sec.summary.trim()) {
            // 向后兼容：将单个 summary 字段转换为数组（不使用 hint）
            summaries = [{ id: `${sec.id}_sum_0`, content: sec.summary }];
          }
          
          // 【关键修复】根据合并方式配置处理摘要，默认使用句子拼接
          const mergeType = sectionMergeType[sec.id] || 'sentence';
          const summaryTexts = summaries.map(sum => (sum.content || '').toString().trim()).filter(Boolean);
          
          if (summaryTexts.length > 0) {
            if (mergeType === 'sentence') {
              // 句子拼接：首尾相连，不换行
              contentParts.push(summaryTexts.join(''));
            } else if (mergeType === 'paragraph') {
              // 段落拼接：每个摘要之间换行
              contentParts.push(summaryTexts.join('\n'));
            } else {
              // 默认：句子拼接
              contentParts.push(summaryTexts.join(''));
            }
          }
          contentParts.push(''); // 空行分隔
        }
        
        const mergedText = contentParts.join('\n').trim();
        
        if (!mergedText) {
          status = 'pass';
          reason = '⏭️ 跳过执行：暂无可生成的内容';
        } else {
          // 获取最终文档生成的配置
          const cfg = meta.buttonConfig || {};
          const systemPrompt = cfg.prompt || meta.prompt || '';
          
          let finalText = mergedText;
          let usedModel = false;
          
          // 调用大模型生成最终文档
          if (systemPrompt && QWEN_API_KEY) {
            try {
              const result = await callQwenFinal({ text: mergedText, systemPrompt });
              if (result?.text) {
                finalText = result.text;
                usedModel = true;
              }
            } catch (e) {
              logger.warn('REPLAY', '最终文档生成调用大模型失败，使用原始内容', { error: e.message });
            }
          }
          
          status = 'done';
          reason = usedModel 
            ? `🤖 最终文档已生成（大模型润色），共 ${finalText.length} 字`
            : `📜 最终文档已生成（原始合并），共 ${finalText.length} 字`;
          
          // 将生成的文档内容放入返回结果
          res.json({
            status,
            reason,
            replayMode: mode,
            template: getTemplate(),
            scene: { id: scene.id, sectionDocLinks: scene.sectionDocLinks || {}, docIds: scene.docIds || [] },
            finalDocument: {
              text: finalText,
              usedModel,
              sections: tpl.sections || []
            }
          });
          return; // 提前返回，避免重复响应
        }
      } catch (e) {
        logger.error('REPLAY', '最终文档生成失败', { error: e.message });
        status = 'fail';
        reason = `最终文档生成失败: ${e.message}`;
      }
      
    } else if (!metaType) {
      status = 'fail';
      reason = '未记录可执行的回放元信息';
      
    } else {
      status = 'fail';
      reason = `暂不支持执行动作：${metaType}`;
    }

    logger.info('REPLAY', `执行结果: ${status}`, { reason, replayMode });
    
    // 【重要】持久化场景数据（包括 sectionDocLinks 等）
    persistScenes();
    
    // 【重要】不返回整个 template 快照，只返回执行结果
    // 前端如需同步大纲，应单独调用 /api/outline/cache 获取
    res.json({
      status,
      reason,
      replayMode,
      // 只返回必要的场景信息，不返回 template
      scene: {
        id: scene.id,
        sectionDocLinks: scene.sectionDocLinks || {},
        docIds: scene.docIds || []
      },
      // 返回额外数据（如合并方式设置结果）
      ...(extraData ? { extraData } : {})
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



app.post("/api/docs", async (req, res) => {

  try {

    const { name, content } = req.body || {};



    // ========== P1: 输入验证 ==========

    const validated = validateDocInput(name, content);
    
    // ========== 【新增】.docx 自动解析 ==========
    let finalContent = validated.content;
    if (validated.name.toLowerCase().endsWith('.docx') && isRawDocxContent(validated.content)) {
      logger.info('DOCX_PARSE', `检测到未解析的 .docx 文件，正在解析: ${validated.name}`);
      const parsedContent = await parseDocxContent(validated.content);
      if (parsedContent !== null) {
        finalContent = parsedContent;
        logger.info('DOCX_PARSE', `成功解析 .docx 文件: ${validated.name}, 内容长度: ${parsedContent.length}`);
      } else {
        logger.warn('DOCX_PARSE', `.docx 解析失败，使用原始内容: ${validated.name}`);
      }
    }



    // ========== P1: 内存管理 ==========

    memoryManager.cleanupOldDocs(docs, MAX_DOCS);



    const key = validated.name.toLowerCase();

    const existingIdx = docs.findIndex((d) => (d?.name || "").trim().toLowerCase() === key);



    if (existingIdx !== -1) {

      docs[existingIdx] = { ...docs[existingIdx], name: validated.name, content: finalContent };

      logger.info('DOCS', `文档已更新: ${validated.name}`);

      persistDocs();

      return res.status(200).json({ doc: docs[existingIdx], overwritten: true });

    }



    const doc = { id: randomUUID(), name: validated.name, content: finalContent };

    docs.push(doc);

    logger.info('DOCS', `新建文档: ${validated.name}`);

    persistDocs();

    return res.status(201).json({ doc, overwritten: false });

  } catch (err) {

    logger.error('DOCS_POST', '创建文档失败', err);

    return res.status(400).json({ error: err.message || "创建文档失败" });

  }

});



app.get("/api/docs", async (_req, res) => {
  try {
    // 处理 .docx 文件的解析
    const processedDocs = await Promise.all(docs.map(async (doc) => {
      // 检测是否为未解析的 .docx 内容
      if (doc.name && doc.name.toLowerCase().endsWith('.docx') && isRawDocxContent(doc.content)) {
        logger.info('DOCX_PARSE', `正在解析 .docx 文件: ${doc.name}`);
        const parsedContent = await parseDocxContent(doc.content);
        if (parsedContent !== null) {
          // 更新内存中的文档内容
          doc.content = parsedContent;
          // 异步持久化（不等待）
          persistDocs();
          logger.info('DOCX_PARSE', `已成功解析 .docx 文件: ${doc.name}, 内容长度: ${parsedContent.length}`);
        }
      }
      return doc;
    }));
    res.json({ docs: processedDocs });
  } catch (error) {
    logger.error('DOCS_GET', '获取文档列表失败', error);
    res.json({ docs });
  }
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
    
    // 【新增】同时导出到文件系统（使用用户配置的目录）
    const exportToFile = req.body?.exportToFile;
    const userExportDir = req.body?.exportDir;
    let exportedPath = null;
    if (exportToFile && userExportDir) {
      try {
        // 使用用户配置的目录
        const exportDir = userExportDir;
        if (!fs.existsSync(exportDir)) {
          fs.mkdirSync(exportDir, { recursive: true });
        }
        
        // 将 markdown 格式的加粗标记 **text** 转换为纯文本
        let plainContent = (content || doc.content || '').replace(/\*\*([^*]+)\*\*/g, '$1');
        
        // 生成导出文件名（使用原文件名，但改为 .txt 扩展名）
        let exportName = doc.name.replace(/\.(docx?|pdf|xlsx?)$/i, '') + '（输出）.txt';
        const exportPath = path.join(exportDir, exportName);
        
        fs.writeFileSync(exportPath, plainContent, 'utf-8');
        exportedPath = exportPath;
        logger.info('DOCS', `文档已导出到文件: ${exportPath}`);
      } catch (exportErr) {
        logger.warn('DOCS', '导出文件失败', { error: exportErr.message });
      }
    }

    res.json({ doc, exportedPath });

  } catch (err) {

    logger.error('DOCS_PATCH', '更新文档失败', err);

    res.status(400).json({ error: err.message || "更新文档失败" });

  }

});

// 【新增】导出文档到文件系统
app.post("/api/docs/:id/export", (req, res) => {
  try {
    const { id } = req.params;
    const doc = docs.find((d) => d.id === id);
    
    if (!doc) return res.status(404).json({ error: "doc 不存在" });
    
    // 使用用户配置的导出目录
    const exportDir = req.body?.exportDir;
    if (!exportDir) {
      return res.status(400).json({ error: "未配置文件目录，请在文档列表面板中配置" });
    }
    
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    
    // 将 markdown 格式的加粗标记 **text** 转换为纯文本
    let plainContent = (doc.content || '').replace(/\*\*([^*]+)\*\*/g, '$1');
    
    // 生成导出文件名
    let exportName = doc.name.replace(/\.(docx?|pdf|xlsx?)$/i, '') + '（输出）.txt';
    const exportPath = path.join(exportDir, exportName);
    
    fs.writeFileSync(exportPath, plainContent, 'utf-8');
    
    logger.info('DOCS', `文档已导出到文件: ${exportPath}`);
    res.json({ success: true, exportedPath: exportPath });
    
  } catch (err) {
    logger.error('DOCS_EXPORT', '导出文档失败', err);
    res.status(400).json({ error: err.message || "导出文档失败" });
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

  // 【新增】处理 sectionMergeType（各章节的合并方式配置）
  if (req.body?.sectionMergeType && typeof req.body.sectionMergeType === "object") {
    scene.sectionMergeType = { ...(scene.sectionMergeType || {}), ...req.body.sectionMergeType };
    logger.info('SCENE', `更新 sectionMergeType: ${Object.keys(req.body.sectionMergeType).length} 个配置`);
  }

  persistScenes(); // 持久化场景
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
  persistOutlineCache(); // 持久化大纲
  persistScenes(); // 持久化场景
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

// ========== 应用端批量 Replay API ==========
// POST /api/app/batch-replay - 应用端批量执行沉淀（与后管端逻辑完全一致）
app.post('/api/app/batch-replay', async (req, res) => {
  try {
    const { depositIds, groupId, mode = 'script' } = req.body || {};
    
    // 从文件加载沉淀数据
    const RECORDS_FILE = path.join(__dirname, 'data', 'precipitation-records.json');
    const GROUPS_FILE = path.join(__dirname, 'data', 'precipitation-groups.json');
    
    let allDeposits = [];
    let allGroups = [];
    
    try {
      if (fs.existsSync(RECORDS_FILE)) {
        const data = JSON.parse(fs.readFileSync(RECORDS_FILE, 'utf-8'));
        allDeposits = Array.isArray(data) ? data : (data.records || []);
      }
    } catch (e) {
      logger.error('APP_BATCH_REPLAY', '加载沉淀记录失败', { error: e.message });
    }
    
    try {
      if (fs.existsSync(GROUPS_FILE)) {
        const data = JSON.parse(fs.readFileSync(GROUPS_FILE, 'utf-8'));
        allGroups = Array.isArray(data) ? data : (data.groups || []);
      }
    } catch (e) {
      logger.error('APP_BATCH_REPLAY', '加载沉淀集失败', { error: e.message });
    }
    
    // 获取沉淀列表
    let targetDepositIds = [];
    
    if (Array.isArray(depositIds) && depositIds.length > 0) {
      targetDepositIds = depositIds;
    } else if (groupId) {
      // 根据沉淀集 ID 获取包含的沉淀
      const group = allGroups.find(g => g.id === groupId);
      if (group && Array.isArray(group.depositIds)) {
        targetDepositIds = group.depositIds;
      }
    }
    
    if (targetDepositIds.length === 0) {
      return res.json({ success: false, error: '未找到要执行的沉淀', results: [] });
    }

    // ======== 源文档匹配辅助函数（与后管端逻辑一致） ========
    const matchDocByNameOrId = (docList, targetName, targetId) => {
      if (!docList || !Array.isArray(docList) || docList.length === 0) return null;

      // 1. 精确 ID 匹配
      if (targetId) {
        const byId = docList.find(d => d.id === targetId);
        if (byId) return byId;
      }

      // 2. 精确名称匹配
      if (targetName) {
        const exact = docList.find(d => d.name === targetName);
        if (exact) return exact;
      }

      // 3. 双向包含匹配
      if (targetName) {
        const contains = docList.find(d =>
          d.name?.includes(targetName) || targetName.includes(d.name)
        );
        if (contains) return contains;
      }

      // 4. 关键词模糊匹配
      if (targetName) {
        const extractKeywords = (name) => {
          return (name || '')
            .replace(/\.(txt|docx?|pdf|xlsx?)$/i, '')
            .replace(/^\d{6,8}/, '')
            .replace(/[（）()【】\[\]\-_]/g, ' ')
            .split(/\s+/)
            .filter(k => k.length >= 2);
        };

        const targetKeywords = extractKeywords(targetName);
        if (targetKeywords.length > 0) {
          let bestMatch = null;
          let bestScore = 0;

          for (const d of docList) {
            const docKeywords = extractKeywords(d.name);
            const matchCount = targetKeywords.filter(tk =>
              docKeywords.some(dk => dk.includes(tk) || tk.includes(dk))
            ).length;
            const score = matchCount / targetKeywords.length;

            if (score > bestScore && score >= 0.5) {
              bestScore = score;
              bestMatch = d;
            }
          }

          if (bestMatch) return bestMatch;
        }
      }

      return null;
    };
    
    logger.info('APP_BATCH_REPLAY', `开始批量执行 ${targetDepositIds.length} 个沉淀`);
    
    const results = [];
    
    // 逐个执行沉淀（与后管端 batchReplaySelectedDeposits 逻辑一致）
    for (let i = 0; i < targetDepositIds.length; i++) {
      const depositId = targetDepositIds[i];
      const deposit = allDeposits.find(d => d.id === depositId);
      
      if (!deposit) {
        results.push({
          depositId,
          depositName: depositId,
          status: 'fail',
          reason: '沉淀记录不存在'
        });
        continue;
      }
      
      const depositName = deposit.name || deposit.action || depositId;
      logger.info('APP_BATCH_REPLAY', `执行沉淀 ${i + 1}/${targetDepositIds.length}: ${depositName}`);
      
      // 获取沉淀的 sections
      const sections = deposit.sections || (deposit.meta ? [{ meta: deposit.meta, action: deposit.action }] : []);
      
      if (sections.length === 0) {
        results.push({
          depositId,
          depositName,
          status: 'pass',
          reason: '沉淀无可执行的 sections'
        });
        continue;
      }
      
      // 执行每个 section（直接调用 /api/replay/execute-section 的完整逻辑）
      const sectionResults = [];
      for (const section of sections) {
        try {
          // ======== 为 insert_to_summary 准备源文档上下文 ========
          const sectionMeta = section?.meta || {};
          const sectionLlmScript = section?.llmScript || {};
          const metaType = (sectionMeta.type || '').toString();
          const isInsertToSummary = metaType === 'insert_to_summary' || metaType === 'insert_to_summary_multi';

          let currentDocContent = '';
          let currentDocName = '';

          if (isInsertToSummary) {
            const selectionInput = Array.isArray(sectionMeta.inputs)
              ? sectionMeta.inputs.find(x => x?.kind === 'selection')
              : null;
            const recordedDocName = selectionInput?.docName || sectionMeta?.docName || sectionLlmScript?.docName || '';
            const recordedDocId = sectionMeta?.docId || sectionLlmScript?.docId || '';

            const matchedDoc = matchDocByNameOrId(docs, recordedDocName, recordedDocId);
            if (matchedDoc) {
              currentDocContent = matchedDoc.content || '';
              currentDocName = matchedDoc.name || '';
            }
          }

          // 【关键】直接使用内部 HTTP 请求调用现有的 replay API
          // 这确保与后管端完全一致
          const http = require('http');
          const executeResult = await new Promise((resolve, reject) => {
            const postData = JSON.stringify({
              section,
              mode,
              sceneId: 'main',
              currentDocContent,
              currentDocName
            });
            
            const options = {
              hostname: 'localhost',
              port: 4300,
              path: '/api/replay/execute-section',
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
              }
            };
            
            const req = http.request(options, (res) => {
              let data = '';
              res.on('data', chunk => data += chunk);
              res.on('end', () => {
                try {
                  resolve(JSON.parse(data));
                } catch (e) {
                  reject(new Error('解析响应失败'));
                }
              });
            });
            
            req.on('error', reject);
            req.write(postData);
            req.end();
          });
          
          sectionResults.push({
            action: section.action || section.meta?.type || 'unknown',
            status: executeResult.status || 'pass',
            reason: executeResult.reason || executeResult.message || ''
          });
        } catch (e) {
          sectionResults.push({
            action: section.action || 'unknown',
            status: 'fail',
            reason: e.message
          });
        }
      }
      
      // 汇总该沉淀的执行结果
      const allDone = sectionResults.every(r => r.status === 'done');
      const allPass = sectionResults.every(r => r.status === 'pass');
      const hasFail = sectionResults.some(r => r.status === 'fail');
      
      results.push({
        depositId,
        depositName,
        status: hasFail ? 'fail' : (allDone ? 'done' : (allPass ? 'pass' : 'partial')),
        sectionResults,
        reason: hasFail ? '部分操作失败' : (allDone ? '全部执行成功' : '部分操作跳过')
      });

      // ======== 持久化沉淀回放状态（用于列表显示） ========
      try {
        const now = Date.now();
        const replayMode = mode === 'llm' ? 'llm' : 'script';
        const statusValue = hasFail
          ? 'fail'
          : (allDone ? (replayMode === 'llm' ? 'llm_done' : 'script_done') : (allPass ? 'pass' : 'partial'));
        const errorMsg = hasFail ? '部分操作失败' : '';

        const idx = allDeposits.findIndex(d => d.id === depositId);
        if (idx !== -1) {
          allDeposits[idx] = {
            ...allDeposits[idx],
            lastReplayStatus: statusValue,
            lastReplayMode: replayMode,
            lastReplayTime: now,
            lastReplayError: errorMsg
          };
        }
      } catch (e) {
        logger.warn('APP_BATCH_REPLAY', '更新沉淀回放状态失败', { error: e.message });
      }
    }
    
    // 汇总批量执行结果
    const doneCount = results.filter(r => r.status === 'done').length;
    const passCount = results.filter(r => r.status === 'pass').length;
    const failCount = results.filter(r => r.status === 'fail').length;
    
    logger.info('APP_BATCH_REPLAY', `批量执行完成: done=${doneCount}, pass=${passCount}, fail=${failCount}`);
    
    // 写回沉淀记录，确保状态可在后管端列表展示
    try {
      fs.writeFileSync(RECORDS_FILE, JSON.stringify(allDeposits, null, 2), 'utf-8');
    } catch (e) {
      logger.warn('APP_BATCH_REPLAY', '写回沉淀记录失败', { error: e.message });
    }

    res.json({
      success: true,
      summary: {
        total: results.length,
        done: doneCount,
        pass: passCount,
        fail: failCount
      },
      results
    });
    
  } catch (e) {
    logger.error('APP_BATCH_REPLAY', '批量执行失败', { error: e.message });
    res.status(500).json({ success: false, error: e.message, results: [] });
  }
});

// ========== 最终文档生成 API ==========
// GET /api/final-document/generate - 生成最终文档（与后管端逻辑完全一致）
app.get('/api/final-document/generate', (req, res) => {
  try {
    // 【关键】使用 cachedOutlineTemplate，这是后管端同步过来的最新数据
    const tpl = cachedOutlineTemplate;
    
    if (!tpl || !tpl.sections?.length) {
      return res.json({ 
        success: false, 
        error: '暂无大纲内容，请先在后台配置大纲',
        text: '' 
      });
    }
    
    // 获取合并方式配置（从 main 场景获取）
    const mainScene = scenes.get('main');
    const sectionMergeType = mainScene?.sectionMergeType || {};
    
    // 【关键】使用与后管端 buildFinalTextFromTemplate 完全相同的逻辑
    const contentParts = [];
    for (const sec of tpl.sections) {
      if (!sec.title) continue;
      
      // 使用 Markdown 格式的标题（# 前缀）
      const levelPrefix = '#'.repeat(sec.level || 1);
      contentParts.push(`${levelPrefix} ${sec.title}`);
      
      // 收集摘要 - 与后管端 getSummaries 逻辑一致
      let summaries = [];
      if (Array.isArray(sec.summaries) && sec.summaries.length > 0) {
        summaries = sec.summaries;
      } else if (sec.summary && sec.summary.trim()) {
        // 向后兼容：将单个 summary 字段转换为数组（不使用 hint）
        summaries = [{ id: `${sec.id}_sum_0`, content: sec.summary }];
      }
      
      // 根据合并方式配置处理摘要，默认使用句子拼接
      const mergeType = sectionMergeType[sec.id] || 'sentence';
      const summaryTexts = summaries.map(sum => (sum.content || '').toString().trim()).filter(Boolean);
      
      if (summaryTexts.length > 0) {
        if (mergeType === 'sentence') {
          // 句子拼接：首尾相连，不换行
          contentParts.push(summaryTexts.join(''));
        } else if (mergeType === 'paragraph') {
          // 段落拼接：每个摘要之间换行
          contentParts.push(summaryTexts.join('\n'));
        } else {
          // 默认：句子拼接
          contentParts.push(summaryTexts.join(''));
        }
      }
      contentParts.push(''); // 空行分隔
    }
    
    const text = contentParts.join('\n').trim();
    
    logger.info('FINAL_DOCUMENT', '生成最终文档', { 
      sections: tpl.sections.length, 
      textLength: text.length 
    });
    
    res.json({ 
      success: true, 
      text,
      sections: tpl.sections,
      sectionMergeType
    });
    
  } catch (e) {
    logger.error('FINAL_DOCUMENT', '生成最终文档失败', { error: e.message });
    res.status(500).json({ success: false, error: e.message, text: '' });
  }
});

// ========== 大纲缓存 API ==========
// GET /api/outline/cache - 获取缓存的大纲
app.get('/api/outline/cache', (req, res) => {
  // 如果缓存为空，尝试从 main scene 恢复
  if (!cachedOutlineTemplate || !cachedOutlineTemplate.sections?.length) {
    const mainScene = scenes.get('main');
    const sceneTemplate = mainScene?.customTemplate;
    if (sceneTemplate?.sections?.length > 0) {
      cachedOutlineTemplate = sceneTemplate;
      persistOutlineCache();
      logger.info('OUTLINE_CACHE', `从 main 场景恢复大纲缓存，共 ${sceneTemplate.sections.length} 个标题`);
    }
  }
  res.json({ template: cachedOutlineTemplate });
});

// POST /api/outline/cache - 更新缓存的大纲
app.post('/api/outline/cache', (req, res) => {
  const { template, syncToScene = true } = req.body || {};
  cachedOutlineTemplate = template || null;
  persistOutlineCache(); // 持久化
  
  // 【关键修复】同时更新 main 场景的 customTemplate，确保数据一致
  if (syncToScene && template) {
    let mainScene = scenes.get('main');
    if (!mainScene) {
      mainScene = {
        id: 'main',
        docIds: [],
        sectionDocLinks: {},
        customTemplate: null,
        template: defaultTemplate,
        sections: {}
      };
      scenes.set('main', mainScene);
    }
    mainScene.customTemplate = template;
    mainScene.template = template;
    persistScenes(); // 持久化场景
    logger.info('OUTLINE_CACHE', '大纲缓存已更新，同时同步到 main 场景');
  } else {
    logger.info('OUTLINE_CACHE', '大纲缓存已更新');
  }
  
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

