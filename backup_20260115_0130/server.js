import express from "express";
import cors from "cors";
import { randomUUID } from "crypto";
import { fetch } from "undici";
import fs from "fs";
import path from "path";
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
const QWEN_API_KEY = process.env.QWEN_API_KEY;

if (!QWEN_API_KEY) {
  console.warn('[WARN] QWEN_API_KEY is missing. AI features will return mock data.');
} else {
  console.log('[INFO] QWEN_API_KEY loaded.');
}

// ========== P1: 输入验证和内存管理配置 ==========
const MAX_DOCS = 1000;
const MAX_SCENES = 500;
const MAX_DOC_NAME_LENGTH = 255;
const MAX_CONTENT_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_SCENE_AGE = 24 * 60 * 60 * 1000; // 24小时
const API_TIMEOUT = 120 * 1000; // 120秒超时
const API_RETRY_TIMES = 3;
const API_RETRY_DELAY = 1000; // 初始延迟 1s

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

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

const DATA_DIR = path.join(process.cwd(), "data");
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
  "input-form-panel": [
    { id: "btn_input_import_text", label: "导入文本", left: 228, top: 12, width: 100, height: 36, enabled: true, kind: "import_text" },
    { id: "btn_input_upload_file", label: "上传文件", left: 116, top: 12, width: 100, height: 36, enabled: true, kind: "upload_file" },
  ],
  "document-list-panel": [
    { id: "btn_list_select_all", label: "全选", left: 248, top: 12, width: 80, height: 36, enabled: true, kind: "select_all" },
    { id: "btn_list_delete", label: "删除", left: 156, top: 12, width: 80, height: 36, enabled: true, kind: "delete_selected" },
  ],
  "preview-panel": [
    { id: "btn_preview_fill", label: "填入摘要", left: 0, top: 0, width: 80, height: 32, enabled: true, kind: "fill_summary" },
  ],
  "processing-panel": [
    { id: "btn_proc_outline", label: "大纲模式", left: 0, top: 0, width: 80, height: 32, enabled: true, kind: "tab_outline" },
    { id: "btn_proc_records", label: "操作记录", left: 90, top: 0, width: 80, height: 32, enabled: true, kind: "tab_records" },
    { id: "btn_proc_config", label: "个性化按钮", left: 180, top: 0, width: 100, height: 32, enabled: true, kind: "tab_config" },
    { id: "btn_proc_extract", label: "全文大纲抽取", left: 290, top: 0, width: 100, height: 32, enabled: true, kind: "outline_extract" },
    { id: "btn_proc_clear", label: "清除", left: 400, top: 0, width: 50, height: 32, enabled: true, kind: "clear_outline" },
    { id: "btn_proc_add_button", label: "新增按钮", left: 460, top: 0, width: 80, height: 32, enabled: true, kind: "add_button" },
  ],
  "operations-panel": [
    { id: "btn_ops_start", label: "开始沉淀", left: 0, top: 0, width: 80, height: 32, enabled: true, kind: "start_deposit" },
    { id: "btn_ops_end", label: "结束沉淀", left: 90, top: 0, width: 80, height: 32, enabled: true, kind: "end_deposit" },
    { id: "btn_ops_dispatch", label: "执行指令", left: 180, top: 0, width: 80, height: 32, enabled: true, kind: "dispatch" },
  ],
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

const docs = [];
const scenes = new Map();
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
  const sysPrompt =
    typeof systemPrompt === "string" && systemPrompt.trim()
      ? systemPrompt.trim()
      : "你是中文文档处理助手。请根据用户指令处理给定文本，严格用中文输出 JSON 对象，字段：summary（一句话说明你做了什么，必须为中文），detail（处理后的正文，必须为中文），edits（可选数组，每项：{sectionId, field:'title'|'summary', content}）。不要返回其他字段，不要解释。";

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

app.post("/api/dispatch", async (req, res) => {
  try {
    const { sceneId, instructions, docContent, outlineSegments, systemPrompt } = req.body || {};
    const scene = scenes.get(sceneId);
    if (!scene) return res.status(404).json({ error: "scene 不存在" });
    if (!instructions || typeof instructions !== "string") {
      return res.status(400).json({ error: "instructions 必须为字符串" });
    }
    const usedModel = !!QWEN_API_KEY;
    const result = await callQwenDispatch({ instructions, scene, docContent, outlineSegments, systemPrompt });
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
      return res.status(200).json({ doc: docs[existingIdx], overwritten: true });
    }

    const doc = { id: randomUUID(), name: validated.name, content: validated.content };
    docs.push(doc);
    logger.info('DOCS', `新建文档: ${validated.name}`);
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
  const scene = scenes.get(req.params.id);
  if (!scene) return res.status(404).json({ error: "scene 不存在" });
  res.json({ scene });
});

app.patch("/api/scene/:id", (req, res) => {
  const scene = scenes.get(req.params.id);
  if (!scene) return res.status(404).json({ error: "scene 不存在" });
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
  const scene = scenes.get(req.params.id);
  if (!scene) return res.status(404).json({ error: "scene 不存在" });
  const { sectionId } = req.params;
  const slot = scene.sections[sectionId];
  if (!slot) return res.status(404).json({ error: "section 不存在" });
  const content = req.body?.content ?? "";
  slot.content = content;
  slot.status = content.trim() ? "filled" : "empty";
  res.json({ scene });
});

app.post("/api/scene/:id/apply-template", (req, res) => {
  const scene = scenes.get(req.params.id);
  if (!scene) return res.status(404).json({ error: "scene 不存在" });
  const tpl = req.body?.template;
  if (!tpl || !Array.isArray(tpl.sections)) {
    return res.status(400).json({ error: "template.sections 不能为空" });
  }
  scene.customTemplate = {
    id: tpl.id || "template_auto",
    name: tpl.name || "自动模板",
    sections: tpl.sections.map((s, idx) => ({
      id: s.id || toSlug(s.title || `sec_${idx + 1}`),
      title: s.title || `章节${idx + 1}`,
      hint: s.hint || "补充写作提示",
      summary: s.summary || "",
      level: Number.isInteger(s.level) ? Math.min(5, Math.max(1, s.level)) : 1,
    })),
  };
  scene.sections = buildSectionsMap(scene.customTemplate);
  scene.sectionDocLinks = scene.sectionDocLinks || {};
  res.json({ scene, template: scene.customTemplate });
});

async function handleGenerateLike(req, res, mode = "generate") {
  try {
    const scene = scenes.get(req.params.id);
    if (!scene) return res.status(404).json({ error: "scene 不存在" });
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

app.get("/api/config/all", (_req, res) => {
  try {
    const layout = readJsonFile(LAYOUT_STATE_PATH); // Don't fallback to DEFAULT here, let client decide
    const buttons = readJsonFile(BUTTON_STATE_PATH);
    const contentBlocks = readJsonFile(CONTENT_BLOCKS_PATH);
    const deletedBlocks = readJsonFile(DELETED_BLOCKS_PATH);

    res.json({
      layout: layout || null,
      buttons: buttons || null,
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
    const { layout, buttons, contentBlocks, deletedBlocks } = req.body;

    if (layout) writeJsonFile(LAYOUT_STATE_PATH, layout);
    if (buttons) writeJsonFile(BUTTON_STATE_PATH, buttons);
    if (contentBlocks) writeJsonFile(CONTENT_BLOCKS_PATH, contentBlocks);
    if (deletedBlocks) writeJsonFile(DELETED_BLOCKS_PATH, deletedBlocks);

    res.json({ success: true });
  } catch (err) {
    logger.error("CONFIG", "Failed to save config", err);
    res.status(500).json({ error: "Failed to save config" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Qwen Endpoint: ${QWEN_ENDPOINT}`);
  console.log(`Using Qwen Model: ${QWEN_MODEL}`);
});
