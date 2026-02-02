import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const DATA_DIR = path.join(process.cwd(), "data");

// ========== AI配置常量 ==========
export const AI_CONFIG = {
  // API配置
  TIMEOUT: 120000,          // 120秒超时
  RETRY_TIMES: 3,           // 重试次数
  RETRY_DELAY: 1000,        // 初始重试延迟（毫秒）
  
  // 默认模型
  DEFAULT_MODEL: 'qwen-plus',
  
  // 默认端点
  DEFAULT_ENDPOINT: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
};

// ========== 默认Prompt常量 ==========
export const DEFAULT_PROMPTS = {
  // 大纲抽取
  OUTLINE_SYSTEM: "你是中文文档的提纲抽取助手，快速输出标题及摘要。返回 JSON 数组，每项包含 id/title/summary/hint/level，level 仅为 1/2/3，基于语义判断层级，不做硬性分级。",
  
  // 指令调度
  DISPATCH_SYSTEM: `请输出JSON：
- summary: 简要摘要
- detail: 详细说明
- edits: [{sectionId, field:'title'|'summary', content}]
只输出JSON。`,

  // 最终文档生成
  FINAL_SYSTEM: "请输出 Markdown 格式的最终文档。"
};

export const logger = {
    info: (tag, msg, data) => console.log(`[${new Date().toISOString()}] [INFO] ${tag}: ${msg}`, data || ''),
    warn: (tag, msg, data) => console.warn(`[${new Date().toISOString()}] [WARN] ${tag}: ${msg}`, data || ''),
    error: (tag, msg, err) => console.error(`[${new Date().toISOString()}] [ERROR] ${tag}: ${msg}`, err || ''),
    debug: (tag, msg, data) => process.env.DEBUG && console.log(`[${new Date().toISOString()}] [DEBUG] ${tag}: ${msg}`, data || ''),
};

export function ensureDataDir() {
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (err) {
        logger.error("STORAGE", "无法创建数据目录", err);
    }
}

export function readJsonFile(filePath) {
    try {
        if (!fs.existsSync(filePath)) return null;
        const raw = fs.readFileSync(filePath, "utf8");
        return JSON.parse(raw);
    } catch (err) {
        logger.error("STORAGE", `读取 ${path.basename(filePath)} 失败`, err);
        return null;
    }
}

export function writeJsonFile(filePath, data) {
    try {
        ensureDataDir();
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
        return true;
    } catch (err) {
        logger.error("STORAGE", `写入 ${path.basename(filePath)} 失败`, err);
        return false;
    }
}

/**
 * 带重试和超时的fetch函数
 * @param {string} url - 请求URL
 * @param {Object} options - fetch选项
 * @param {number} retries - 重试次数
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(url, options = {}, retries = AI_CONFIG.RETRY_TIMES) {
  const timeout = options.timeout || AI_CONFIG.TIMEOUT;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok && attempt < retries) {
        const delay = AI_CONFIG.RETRY_DELAY * Math.pow(2, attempt);
        logger.debug('FETCH', `请求失败，${delay}ms 后重试 (${attempt + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return response;
    } catch (err) {
      if (attempt === retries) {
        throw err;
      }
      const delay = AI_CONFIG.RETRY_DELAY * Math.pow(2, attempt);
      logger.debug('FETCH', `请求异常，${delay}ms 后重试 (${attempt + 1}/${retries}): ${err.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Call AI Model (Universal Wrapper)
 * Supports OpenAI-compatible endpoints (like DashScope/Qwen, DeepSeek, etc.) based on .env config
 */
export async function callAI(messages, model = null) {
    // Try to get config from env, with fallbacks
    const API_KEY = process.env.QWEN_API_KEY || process.env.GOOGLE_API_KEY;
    // Default to DashScope compatible-mode if not set
    const ENDPOINT = process.env.QWEN_ENDPOINT || "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
    // Use env model or default to qwen-plus
    const TARGET_MODEL = model || process.env.AI_MODEL_NAME || "qwen-plus";

    if (!API_KEY) {
        logger.warn("AI", "API Key (QWEN_API_KEY or GOOGLE_API_KEY) is missing in .env, returning mock response");
        // 返回 mock JSON 响应，用于沉淀编译等场景
        return JSON.stringify({
            operationRecord: "操作记录（未配置AI）",
            actionExecution: "动作执行（未配置AI）",
            executionSummary: "执行摘要（未配置AI）",
            recordLocation: "记录位置（未配置AI）"
        });
    }

    try {
        logger.debug("AI", `Calling AI: ${TARGET_MODEL} at ${ENDPOINT}`);
        
        const response = await fetch(ENDPOINT, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: TARGET_MODEL,
                messages: messages,
                max_tokens: 2000 // Reasonable limit for intent analysis
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`AI API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        return content;
    } catch (error) {
        logger.error("AI", "AI Call Failed", error);
        throw error;
    }
}

