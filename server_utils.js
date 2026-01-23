import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const DATA_DIR = path.join(process.cwd(), "data");

export const logger = {
    info: (tag, msg, data) => console.log(`[${new Date().toISOString()}] [INFO] ${tag}: ${msg}`, data || ''),
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

