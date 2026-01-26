import express from "express";


import path from "path";

import { fileURLToPath } from "url";


import fs from "fs";


import { readJsonFile, writeJsonFile, logger, callAI } from "./server_utils.js";




const router = express.Router();


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");





// MultiDoc Workbench Configurations


const MULTI_LAYOUT_STATE_PATH = path.join(DATA_DIR, "multi-layout-config.json");

const MULTI_BUTTON_STATE_PATH = path.join(DATA_DIR, "multi-button-config.json");

const MULTI_PANEL_VISIBILITY_PATH = path.join(DATA_DIR, "multi-panel-visibility.json");

const MULTI_APP_BUTTONS_PATH = path.join(DATA_DIR, "multi-app-buttons.json");



const DEFAULT_MULTI_PANEL_VISIBILITY = {

    'sources-panel': true,

    'chat-panel': true,

    'studio-panel': true

};



const DEFAULT_MULTI_APP_BUTTONS = {

    buttons: [

        { id: 'app_btn_daily_merge', label: '日报合并写作（主任版）', groupIds: [] },

        { id: 'app_btn_competitor_report', label: '竞品分析报告写作', groupIds: [] },

        { id: 'app_btn_custom_write', label: '自定义写作', groupIds: [] }

    ]

};




const DEFAULT_MULTI_LAYOUT_CONFIG = {

    layoutSize: { width: 1680, height: 1050 },

    panelPositions: {

        'sources-panel': { left: 20, top: 40, width: 320, height: 900 },

        'chat-panel': { left: 360, top: 40, width: 800, height: 900 },

        'studio-panel': { left: 1180, top: 40, width: 460, height: 900 },

    },

    panelTitles: {

        'sources-panel': '来源',

        'chat-panel': '对话',

        'studio-panel': 'Studio',

    },

    panelVisibility: {

        'sources-panel': true,

        'chat-panel': true,

        'studio-panel': true,

    },

};




const DEFAULT_MULTI_BUTTON_CONFIG = {


    'doc-classify': [


        {


            id: 'btn_doc_title',


            label: '文档归类',


            left: 24,


            top: 24,


            width: 312,


            height: 32,


            enabled: true,


            kind: 'text',


            style: {


                fontSize: 20,


                color: '#1e293b',


                backgroundColor: 'transparent',


                fontWeight: 600,


                borderColor: 'transparent',


                borderWidth: 0,


                borderRadius: 0,


                textAlign: 'left',


                justifyContent: 'flex-start',


                padding: '0'


            }


        },


        {


            id: 'btn_doc_desc',


            label: '自动识别上传的文档类型，智能分析内容特征，并将精确归类到相应的业务文件夹中。',


            left: 24,


            top: 64,


            width: 312,


            height: 80,


            enabled: true,


            kind: 'text',


            style: {


                fontSize: 14,


                color: '#64748b',


                backgroundColor: 'transparent',


                fontWeight: 400,


                borderColor: 'transparent',


                borderWidth: 0,


                borderRadius: 0,


                textAlign: 'left',


                justifyContent: 'flex-start',


                padding: '0'


            }


        },


        {


            id: 'btn_multi_start',


            label: '开始处理',


            left: 240,


            top: 400,


            width: 90,


            height: 32,


            enabled: true,


            kind: 'action',


            style: {


                fontSize: 14,


                color: '#1e293b',


                backgroundColor: 'transparent',


                fontWeight: 500,


                borderColor: '#e2e8f0',


                borderWidth: 1,


                borderRadius: 6


            }


        }


    ],


    'info-extract': [


        {


            id: 'btn_info_title',


            label: '信息提取',


            left: 24,


            top: 24,


            width: 312,


            height: 32,


            enabled: true,


            kind: 'text',


            style: {


                fontSize: 20,


                color: '#1e293b',


                backgroundColor: 'transparent',


                fontWeight: 600,


                borderColor: 'transparent',


                borderWidth: 0,


                borderRadius: 0,


                textAlign: 'left',


                justifyContent: 'flex-start',


                padding: '0'


            }


        },


        {


            id: 'btn_info_desc',


            label: '从多篇非结构化文档中，利用大模型提取关键实体与数据，自动生成结构化报表。',


            left: 24,


            top: 64,


            width: 312,


            height: 80,


            enabled: true,


            kind: 'text',


            style: {


                fontSize: 14,


                color: '#64748b',


                backgroundColor: 'transparent',


                fontWeight: 400,


                borderColor: 'transparent',


                borderWidth: 0,


                borderRadius: 0,


                textAlign: 'left',


                justifyContent: 'flex-start',


                padding: '0'


            }


        },


        {


            id: 'btn_multi_config',


            label: '配置规则',


            left: 240,


            top: 400,


            width: 90,


            height: 32,


            enabled: true,


            kind: 'action',


            style: {


                fontSize: 14,


                color: '#1e293b',


                backgroundColor: 'transparent',


                fontWeight: 500,


                borderColor: '#e2e8f0',


                borderWidth: 1,


                borderRadius: 6


            }


        }


    ],


    'cross-analysis': [


        {


            id: 'btn_cross_title',


            label: '跨文档分析',


            left: 24,


            top: 24,


            width: 312,


            height: 32,


            enabled: true,


            kind: 'text',


            style: {


                fontSize: 20,


                color: '#1e293b',


                backgroundColor: 'transparent',


                fontWeight: 600,


                borderColor: 'transparent',


                borderWidth: 0,


                borderRadius: 0,


                textAlign: 'left',


                justifyContent: 'flex-start',


                padding: '0'


            }


        },


        {


            id: 'btn_cross_desc',


            label: '深度分析多个文档之间的关联关系，挖掘潜在洞察，一键生成综合分析报告。',


            left: 24,


            top: 64,


            width: 312,


            height: 80,


            enabled: true,


            kind: 'text',


            style: {


                fontSize: 14,


                color: '#64748b',


                backgroundColor: 'transparent',


                fontWeight: 400,


                borderColor: 'transparent',


                borderWidth: 0,


                borderRadius: 0,


                textAlign: 'left',


                justifyContent: 'flex-start',


                padding: '0'


            }


        },


        {


            id: 'btn_multi_report',


            label: '生成报告',


            left: 240,


            top: 400,


            width: 90,


            height: 32,


            enabled: true,


            kind: 'action',


            style: {


                fontSize: 14,


                color: '#1e293b',


                backgroundColor: 'transparent',


                fontWeight: 500,


                borderColor: '#e2e8f0',


                borderWidth: 1,


                borderRadius: 6


            }


        }


    ],


    'header': [


        {


            id: 'btn_header_switch',


            label: '← 切换至 SOP 工作台',


            left: 40,


            top: 18,


            width: 180,


            height: 36,


            enabled: true,


            kind: 'switch',


            style: {


                fontSize: 14,


                color: '#475569',


                backgroundColor: 'transparent',


                fontWeight: 500,


                borderColor: '#e2e8f0',


                borderWidth: 1,


                borderRadius: 8


            }


        },


        {


            id: 'btn_header_title',


            label: '多类型文档处理工作台',


            left: 550,


            top: 18,


            width: 300,


            height: 36,


            enabled: true,


            kind: 'title',


            style: {


                fontSize: 22,


                color: '#1e293b',


                backgroundColor: 'transparent',


                fontWeight: 700,


                borderColor: 'transparent',


                borderWidth: 0,


                borderRadius: 0


            }


        },


        {


            id: 'btn_header_edit',


            label: '⚙ 编辑布局',


            left: 1100,


            top: 18,


            width: 120,


            height: 36,


            enabled: true,


            kind: 'edit',


            style: {


                fontSize: 14,


                color: '#475569',


                backgroundColor: 'transparent',


                fontWeight: 500,


                borderColor: '#e2e8f0',


                borderWidth: 1,


                borderRadius: 8


            }


        }


    ]


};





// Layout Endpoints


// 重置布局配置


router.post('/layout/reset', (req, res) => {


    try {


        if (fs.existsSync(MULTI_LAYOUT_STATE_PATH)) {


            fs.unlinkSync(MULTI_LAYOUT_STATE_PATH);


        }


        logger.info('MULTI_LAYOUT', '布局已重置');


        res.json(DEFAULT_MULTI_LAYOUT_CONFIG);


    } catch (error) {


        logger.error('MULTI_LAYOUT', '重置布局失败', error);


        res.status(500).json({ error: '重置布局失败' });


    }


});





router.get("/layout", (req, res) => {


    try {


        const data = readJsonFile(MULTI_LAYOUT_STATE_PATH);


        res.json(data || DEFAULT_MULTI_LAYOUT_CONFIG);


    } catch (error) {


        logger.error('MULTI_LAYOUT', '获取布局配置失败', error);


        res.status(500).json({ error: '获取布局配置失败' });


    }


});





router.post("/layout", (req, res) => {

    try {


        const layout = req.body;


        if (!layout || typeof layout !== 'object') {


            return res.status(400).json({


                error: "布局配置必须为对象"


            });


        }


        if (writeJsonFile(MULTI_LAYOUT_STATE_PATH, layout)) {


            logger.info('MULTI_LAYOUT', '布局配置已保存');


            res.json({ ok: true });


        } else {


            res.status(500).json({ error: "保存失败" });


        }


    } catch (error) {


        logger.error('MULTI_LAYOUT', '保存布局配置失败', error);


        res.status(500).json({ error: '保存布局配置失败' });


    }


});



// Panel Visibility Endpoints

router.get("/panels", (req, res) => {

    try {

        const data = readJsonFile(MULTI_PANEL_VISIBILITY_PATH);

        res.json(data || DEFAULT_MULTI_PANEL_VISIBILITY);

    } catch (error) {

        logger.error('MULTI_PANELS', '获取面板可见性失败', error);

        res.status(500).json({ error: '获取面板可见性失败' });

    }

});



router.post("/panels", (req, res) => {

    try {

        const visibility = req.body;

        if (!visibility || typeof visibility !== 'object') {

            return res.status(400).json({ error: "面板可见性必须为对象" });

        }

        const normalized = { ...DEFAULT_MULTI_PANEL_VISIBILITY };

        Object.keys(normalized).forEach((key) => {

            normalized[key] = visibility[key] !== false;

        });

        if (writeJsonFile(MULTI_PANEL_VISIBILITY_PATH, normalized)) {

            logger.info('MULTI_PANELS', '面板可见性已保存');

            res.json({ ok: true, visibility: normalized });

        } else {

            res.status(500).json({ error: "保存失败" });

        }

    } catch (error) {

        logger.error('MULTI_PANELS', '保存面板可见性失败', error);

        res.status(500).json({ error: '保存面板可见性失败' });

    }

});



// Button Endpoints

router.get("/buttons", (req, res) => {

    try {


        const data = readJsonFile(MULTI_BUTTON_STATE_PATH);


        res.json(data || DEFAULT_MULTI_BUTTON_CONFIG);


    } catch (error) {


        logger.error('MULTI_BUTTONS', '获取按钮配置失败', error);


        res.status(500).json({ error: '获取按钮配置失败' });


    }


});





router.post("/buttons", (req, res) => {


    try {


        const buttons = req.body;


        if (!buttons || typeof buttons !== 'object') {


            return res.status(400).json({


                error: "按钮配置必须为对象"


            });


        }


        if (writeJsonFile(MULTI_BUTTON_STATE_PATH, buttons)) {


            logger.info('MULTI_BUTTONS', '按钮配置已保存');


            res.json({ ok: true });


        } else {


            res.status(500).json({ error: "保存失败" });


        }


    } catch (error) {


        logger.error('MULTI_BUTTONS', '保存按钮配置失败', error);


        res.status(500).json({ error: '保存按钮配置失败' });


    }


});





router.post("/buttons/reset", (req, res) => {

    try {

        if (fs.existsSync(MULTI_BUTTON_STATE_PATH)) {

            fs.unlinkSync(MULTI_BUTTON_STATE_PATH);

        }

        logger.info('MULTI_BUTTONS', '按钮配置已重置');

        res.json(DEFAULT_MULTI_BUTTON_CONFIG);

    } catch (error) {

        logger.error('MULTI_BUTTONS', '重置按钮配置失败', error);

        res.status(500).json({ error: '重置按钮失败' });

    }

});



// App-side chat buttons (for MultiDoc chat panel)

router.get("/app-buttons", (_req, res) => {

    try {

        const data = readJsonFile(MULTI_APP_BUTTONS_PATH);

        res.json(data || DEFAULT_MULTI_APP_BUTTONS);

    } catch (error) {

        logger.error('MULTI_APP_BUTTONS', '获取应用端按钮配置失败', error);

        res.status(500).json({ error: '获取应用端按钮配置失败' });

    }

});



router.post("/app-buttons", (req, res) => {

    try {

        const { buttons } = req.body || {};

        if (!Array.isArray(buttons)) {

            return res.status(400).json({ error: "buttons 必须为数组" });

        }

        const normalized = buttons

            .map((btn, idx) => {

                if (!btn || typeof btn !== 'object') return null;

                const id = typeof btn.id === 'string' && btn.id.trim() ? btn.id.trim() : `app_btn_${Date.now()}_${idx}`;

                const label = typeof btn.label === 'string' ? btn.label.trim() : '';

                if (!label) return null;

                const groupIds = Array.isArray(btn.groupIds) ? btn.groupIds.filter(Boolean) : [];

                return { id, label, groupIds };

            })

            .filter(Boolean);



        const payload = { buttons: normalized };

        if (writeJsonFile(MULTI_APP_BUTTONS_PATH, payload)) {

            logger.info('MULTI_APP_BUTTONS', '应用端按钮配置已保存');

            res.json({ ok: true, buttons: normalized });

        } else {

            res.status(500).json({ error: "保存失败" });

        }

    } catch (error) {

        logger.error('MULTI_APP_BUTTONS', '保存应用端按钮配置失败', error);

        res.status(500).json({ error: '保存应用端按钮配置失败' });

    }

});



// Precipitation Endpoints

const PRECIPITATION_RECORDS_PATH = path.join(DATA_DIR, "precipitation-records.json");

const PRECIPITATION_GROUPS_PATH = path.join(DATA_DIR, "precipitation-groups.json");



const normalizePrecipitationGroup = (group) => {

    if (!group) return null;

    const id = typeof group.id === "string" && group.id.trim() ? group.id.trim() : `group_${Date.now()}`;

    const name = typeof group.name === "string" && group.name.trim() ? group.name.trim() : id;

    const depositIds = Array.isArray(group.depositIds)

        ? Array.from(new Set(group.depositIds.filter(Boolean)))

        : [];

    const createdAt = typeof group.createdAt === "number" ? group.createdAt : Date.now();

    return { ...group, id, name, depositIds, createdAt };

};

const REPLAY_META_MARKER = "__REPLAY_META__";



const extractReplayMeta = (content) => {

    const raw = (content || "").toString();

    const idx = raw.indexOf(REPLAY_META_MARKER);

    if (idx === -1) return null;

    const json = raw.slice(idx + REPLAY_META_MARKER.length).trim();

    try {

        const parsed = JSON.parse(json);

        return parsed && typeof parsed === "object" ? parsed : null;

    } catch (_) {

        return null;

    }

};



const stripReplayMeta = (content) => {

    const raw = (content || "").toString();

    const idx = raw.indexOf(REPLAY_META_MARKER);

    if (idx === -1) return raw.trim();

    return raw.slice(0, idx).trim();

};



const parseSectionContentFields = (content) => {

    const base = stripReplayMeta(content);

    const lines = base

        .split(/\r?\n/)

        .map((line) => line.trim())

        .filter(Boolean);

    const recordLine =

        lines.find((line) => line.startsWith("【操作记录】")) ||

        lines.find((line) => line.startsWith("【沉淀记录】")) ||

        lines.find((line) => line.startsWith("【添加文档】")) ||

        "";

    const operationRecord = recordLine ? recordLine.replace(/^【[^】]+】/, "").trim() : "";

    const actionExecution = (lines.find((line) => line.startsWith("动作执行：")) || "").replace(/^动作执行：/, "").trim();

    const executionSummary = (lines.find((line) => line.startsWith("执行摘要：")) || "").replace(/^执行摘要：/, "").trim();

    const recordLocation = (lines.find((line) => line.startsWith("记录位置：")) || "").replace(/^记录位置：/, "").trim();

    const inputLine = lines.find((line) => line.startsWith("输入来源：")) || "";

    return { operationRecord, actionExecution, executionSummary, recordLocation, inputLine };

};




router.get("/precipitation/records", (req, res) => {


    try {


        const data = readJsonFile(PRECIPITATION_RECORDS_PATH);


        res.json(data || []);


    } catch (error) {


        logger.error('PRECIPITATION', '获取沉淀记录失败', error);


        res.status(500).json({ error: '获取沉淀记录失败' });


    }


});





router.post("/precipitation/records", (req, res) => {

    try {

        const newRecord = req.body;

        if (!newRecord || !newRecord.id || !newRecord.sections) {

            return res.status(400).json({ error: "无效的沉淀记录数据" });

        }

        if (typeof newRecord.precipitationMode !== "string") {

            newRecord.precipitationMode = "llm";

        } else {

            newRecord.precipitationMode = newRecord.precipitationMode === "script" ? "script" : "llm";

        }



        const existingRecords = readJsonFile(PRECIPITATION_RECORDS_PATH) || [];

        const updatedRecords = [...existingRecords, newRecord]; // 新记录添加到末尾




        if (writeJsonFile(PRECIPITATION_RECORDS_PATH, updatedRecords)) {


            logger.info('PRECIPITATION', `已保存沉淀记录: ${newRecord.id}`);


            res.json({ ok: true });


        } else {


            res.status(500).json({ error: "保存沉淀记录失败" });


        }


    } catch (error) {


        logger.error('PRECIPITATION', '保存沉淀记录失败', error);


        res.status(500).json({ error: '保存沉淀记录失败' });


    }


});



router.patch("/precipitation/records/:id", (req, res) => {

    try {

        const { id } = req.params;

        const { name, precipitationMode } = req.body || {};



        const existingRecords = readJsonFile(PRECIPITATION_RECORDS_PATH) || [];

        const idx = existingRecords.findIndex(r => r.id === id);

        if (idx === -1) {

            return res.status(404).json({ error: "未找到该沉淀记录" });

        }



        const current = existingRecords[idx];

        const nextMode = precipitationMode === "script" ? "script" : "llm";

        const next = {

            ...current,

            name: typeof name === "string" ? name : current.name,

            precipitationMode: typeof precipitationMode === "string" ? nextMode : current.precipitationMode

        };



        existingRecords[idx] = next;



        if (writeJsonFile(PRECIPITATION_RECORDS_PATH, existingRecords)) {

            logger.info('PRECIPITATION', `已更新沉淀记录: ${id}`);

            res.json({ ok: true, record: next });

        } else {

            res.status(500).json({ error: "更新沉淀记录失败" });

        }

    } catch (error) {

        logger.error('PRECIPITATION', '更新沉淀记录失败', error);

        res.status(500).json({ error: '更新沉淀记录失败' });

    }

});

// PUT 路由：完整更新沉淀记录（支持编辑后保存）
router.put("/precipitation/records/:id", (req, res) => {
    try {
        const { id } = req.params;
        const updatedRecord = req.body;

        if (!updatedRecord || typeof updatedRecord !== 'object') {
            return res.status(400).json({ error: "无效的沉淀记录数据" });
        }

        const existingRecords = readJsonFile(PRECIPITATION_RECORDS_PATH) || [];
        const idx = existingRecords.findIndex(r => r.id === id);

        if (idx === -1) {
            return res.status(404).json({ error: "未找到该沉淀记录" });
        }

        // 保留原始记录的关键字段，合并更新
        const current = existingRecords[idx];
        const next = {
            ...current,
            ...updatedRecord,
            id: id, // 确保 ID 不变
            updatedAt: Date.now()
        };

        existingRecords[idx] = next;

        if (writeJsonFile(PRECIPITATION_RECORDS_PATH, existingRecords)) {
            logger.info('PRECIPITATION', `已完整更新沉淀记录: ${id}`);
            res.json({ ok: true, record: next });
        } else {
            res.status(500).json({ error: "更新沉淀记录失败" });
        }
    } catch (error) {
        logger.error('PRECIPITATION', '完整更新沉淀记录失败', error);
        res.status(500).json({ error: '更新沉淀记录失败' });
    }
});



router.post("/precipitation/records/order", (req, res) => {

    try {

        const { order } = req.body || {};

        if (!Array.isArray(order)) {

            return res.status(400).json({ error: "order 必须是数组" });

        }

        const existingRecords = readJsonFile(PRECIPITATION_RECORDS_PATH) || [];

        const orderIds = order.map((id) => (id || "").toString()).filter(Boolean);

        const orderSet = new Set(orderIds);

        const recordById = new Map(existingRecords.map((r) => [r.id, r]));

        const reordered = [];

        orderIds.forEach((id) => {

            const found = recordById.get(id);

            if (found) reordered.push(found);

        });

        existingRecords.forEach((r) => {

            if (!orderSet.has(r.id)) reordered.push(r);

        });

        if (writeJsonFile(PRECIPITATION_RECORDS_PATH, reordered)) {

            logger.info("PRECIPITATION", `已更新沉淀顺序: ${orderIds.length} 条`);

            res.json({ ok: true, records: reordered });

        } else {

            res.status(500).json({ error: "保存沉淀顺序失败" });

        }

    } catch (error) {

        logger.error("PRECIPITATION", "更新沉淀顺序失败", error);

        res.status(500).json({ error: "更新沉淀顺序失败" });

    }

});



router.post("/precipitation/records/:id/sections/:sectionId/compile", async (req, res) => {

    try {

        const { id, sectionId } = req.params;

        const {

            operationRecord,

            actionExecution,

            executionSummary,

            recordLocation,

            actionLabel,

            requirements,

            llmScript  // 新字段：大模型记录

        } = req.body || {};



        const existingRecords = readJsonFile(PRECIPITATION_RECORDS_PATH) || [];

        const recordIdx = existingRecords.findIndex(r => r.id === id);

        if (recordIdx === -1) {

            return res.status(404).json({ error: "未找到该沉淀记录" });

        }

        const record = existingRecords[recordIdx];

        const sections = Array.isArray(record.sections) ? record.sections : [];

        const secIdx = sections.findIndex(s => s.id === sectionId);

        if (secIdx === -1) {

            return res.status(404).json({ error: "未找到该沉淀步骤" });

        }



        const currentSection = sections[secIdx];

        const currentMeta = extractReplayMeta(currentSection?.content || "") || {};

        const contentFields = parseSectionContentFields(currentSection?.content || "");

        const nextRequirements = requirements && typeof requirements === "object"

            ? {

                inputSource: requirements.inputSource === "required" ? "required" : "optional",

                actionExecution: requirements.actionExecution === "required" ? "required" : "optional",

                executionSummary: requirements.executionSummary === "required" ? "required" : "optional",

                recordLocation: requirements.recordLocation === "required" ? "required" : "optional"

            }

            : (currentSection?.requirements || currentMeta?.requirements);

        const prompt = `

你是自动化沉淀编译器，负责把用户编辑的字段编译为规范、可复现的记录描述。



[用户编辑内容]

操作记录：${(operationRecord ?? "").toString()}

动作执行：${(actionExecution ?? "").toString()}

执行摘要：${(executionSummary ?? "").toString()}

记录位置：${(recordLocation ?? "").toString()}



[已有信息]

已有操作记录：${contentFields.operationRecord}

已有动作执行：${contentFields.actionExecution}

已有执行摘要：${contentFields.executionSummary}

已有记录位置：${contentFields.recordLocation}

已有Meta：${JSON.stringify(currentMeta)}

字段要求：${JSON.stringify(nextRequirements || {})}



[输出要求]

1. 输出只包含 JSON，不要输出 Markdown。

2. 字段必须包含：operationRecord, actionExecution, executionSummary, recordLocation。

3. 如果用户编辑字段为空，请优先沿用已有内容；如果已有内容也为空，可基于已有Meta进行简洁归纳。

4. 语言保持简洁、规范、可复现。

`;



        const messages = [

            { role: "system", content: "你是严谨的后端接口，只输出合法 JSON。" },

            { role: "user", content: prompt }

        ];



        // 尝试调用 AI 编译，如果失败则使用已有内容
        let compiled = {};
        try {
        const aiResponse = await callAI(messages);
            const cleanJson = aiResponse.replace(/```json/g, "").replace(/```/g, "").trim();
            compiled = JSON.parse(cleanJson);
        } catch (e) {
            // AI 调用失败或返回非 JSON 时，使用用户输入或已有内容（不报错）
            logger.warn("PRECIPITATION", "AI编译失败，使用已有内容", { error: e?.message });
            compiled = {
                operationRecord: operationRecord || contentFields.operationRecord || "",
                actionExecution: actionExecution || contentFields.actionExecution || "",
                executionSummary: executionSummary || contentFields.executionSummary || "",
                recordLocation: recordLocation || contentFields.recordLocation || ""
            };
        }



        const nextOperationRecord = (compiled?.operationRecord || contentFields.operationRecord || currentMeta?.record || currentMeta?.process || "").toString().trim();

        const nextActionExecution = (compiled?.actionExecution || contentFields.actionExecution || currentMeta?.process || "").toString().trim();

        const nextExecutionSummary = (compiled?.executionSummary || contentFields.executionSummary || currentMeta?.outputs?.summary || "").toString().trim();

        const nextRecordLocation = (compiled?.recordLocation || contentFields.recordLocation || "").toString().trim();



        const nextMeta = {

            ...currentMeta,

            record: nextOperationRecord || currentMeta?.record,

            process: nextActionExecution || currentMeta?.process,

            outputs: {

                ...(currentMeta?.outputs || {}),

                summary: nextExecutionSummary || (currentMeta?.outputs || {}).summary

            },

            destinations: nextRecordLocation ? [nextRecordLocation] : currentMeta?.destinations || [],

            requirements: nextRequirements || currentMeta?.requirements

        };



        const lines = [];

        if (nextOperationRecord) lines.push(`【操作记录】${nextOperationRecord}`);

        if (contentFields.inputLine) lines.push(contentFields.inputLine);

        if (nextActionExecution) lines.push(`动作执行：${nextActionExecution}`);

        if (nextExecutionSummary) lines.push(`执行摘要：${nextExecutionSummary}`);

        if (nextRecordLocation) lines.push(`记录位置：${nextRecordLocation}`);



        const contentText = lines.join("\n").trim();

        const nextContent = `${contentText}\n\n${REPLAY_META_MARKER}\n${JSON.stringify(nextMeta)}`;



        // 合并 llmScript（新字段）
        const nextLlmScript = llmScript && typeof llmScript === 'object' 
            ? { 
                ...(currentSection.llmScript || {}), 
                ...llmScript,
                // 确保重要字段被更新
                type: llmScript.type || currentSection.llmScript?.type || currentMeta?.type || '',
                description: llmScript.description || llmScript.actionDescription || currentSection.llmScript?.description || '',
                actionDescription: llmScript.actionDescription || llmScript.description || currentSection.llmScript?.actionDescription || '',
                instructions: llmScript.instructions || llmScript.promptContent || currentSection.llmScript?.instructions || '',
                promptContent: llmScript.promptContent || llmScript.instructions || currentSection.llmScript?.promptContent || '',
                inputSourceDesc: llmScript.inputSourceDesc || currentSection.llmScript?.inputSourceDesc || '',
                targetTitle: llmScript.targetTitle || llmScript.outputTargetDesc || currentSection.llmScript?.targetTitle || '',
                outputTargetDesc: llmScript.outputTargetDesc || llmScript.targetTitle || currentSection.llmScript?.outputTargetDesc || '',
                aiGuidance: llmScript.aiGuidance || currentSection.llmScript?.aiGuidance || ''
            }
            : currentSection.llmScript;

        const nextSection = {

            ...currentSection,

            action: typeof actionLabel === "string" && actionLabel.trim() ? actionLabel.trim() : (nextOperationRecord || currentSection.action),

            content: nextContent,

            requirements: nextRequirements || currentSection.requirements,

            llmScript: nextLlmScript  // 保存更新后的 llmScript

        };



        const nextSections = sections.map((s, i) => (i === secIdx ? nextSection : s));

        const nextRecord = { ...record, sections: nextSections };

        existingRecords[recordIdx] = nextRecord;



        if (writeJsonFile(PRECIPITATION_RECORDS_PATH, existingRecords)) {

            logger.info('PRECIPITATION', `已编译沉淀步骤: ${id}/${sectionId}`);

            res.json({ ok: true, record: nextRecord, section: nextSection });

        } else {

            res.status(500).json({ error: "保存沉淀记录失败" });

        }

    } catch (error) {
        logger.error('PRECIPITATION', '编译沉淀记录失败', error);
        // 返回更友好的错误信息，而非直接 500
        res.status(400).json({ 
            error: '编译沉淀记录失败', 
            detail: error?.message || '未知错误',
            // 提示可选字段不是必须的
            hint: '可选字段可以留空，只需填写必要信息即可保存'
        });

    }

});



router.delete("/precipitation/records/:id", (req, res) => {

    try {

        const { id } = req.params;

        const existingRecords = readJsonFile(PRECIPITATION_RECORDS_PATH) || [];

        const updatedRecords = existingRecords.filter(r => r.id !== id);

        if (updatedRecords.length === existingRecords.length) {

            return res.status(404).json({ error: "未找到该沉淀记录" });

        }



        if (writeJsonFile(PRECIPITATION_RECORDS_PATH, updatedRecords)) {

            const groups = readJsonFile(PRECIPITATION_GROUPS_PATH) || [];

            const nextGroups = groups

                .map(normalizePrecipitationGroup)

                .filter(Boolean)

                .map((g) => ({

                    ...g,

                    depositIds: (g.depositIds || []).filter((depId) => depId !== id),

                }));

            writeJsonFile(PRECIPITATION_GROUPS_PATH, nextGroups);

            logger.info('PRECIPITATION', `已删除沉淀记录: ${id}`);

            res.json({ ok: true });

        } else {

            res.status(500).json({ error: "删除沉淀记录失败" });

        }

    } catch (error) {


        logger.error('PRECIPITATION', '删除沉淀记录失败', error);


        res.status(500).json({ error: '删除沉淀记录失败' });


    }

});



router.get("/precipitation/groups", (req, res) => {

    try {

        const data = readJsonFile(PRECIPITATION_GROUPS_PATH) || [];

        res.json(data);

    } catch (error) {

        logger.error('PRECIPITATION', '获取沉淀集失败', error);

        res.status(500).json({ error: '获取沉淀集失败' });

    }

});



router.post("/precipitation/groups", (req, res) => {

    try {

        const newGroup = normalizePrecipitationGroup(req.body);

        if (!newGroup || !newGroup.id || !Array.isArray(newGroup.depositIds)) {

            return res.status(400).json({ error: "无效的沉淀集数据" });

        }



        const existingGroups = readJsonFile(PRECIPITATION_GROUPS_PATH) || [];

        const updatedGroups = [...existingGroups, newGroup];  // 添加到末尾



        if (writeJsonFile(PRECIPITATION_GROUPS_PATH, updatedGroups)) {

            logger.info('PRECIPITATION', `已保存沉淀集: ${newGroup.id}`);

            res.json({ ok: true, group: newGroup });

        } else {

            res.status(500).json({ error: "保存沉淀集失败" });

        }

    } catch (error) {

        logger.error('PRECIPITATION', '保存沉淀集失败', error);

        res.status(500).json({ error: '保存沉淀集失败' });

    }

});



router.patch("/precipitation/groups/:id", (req, res) => {

    try {

        const { id } = req.params;

        const { name, depositIds } = req.body || {};



        const existingGroups = readJsonFile(PRECIPITATION_GROUPS_PATH) || [];

        const idx = existingGroups.findIndex(g => g.id === id);

        if (idx === -1) {

            return res.status(404).json({ error: "未找到该沉淀集" });

        }



        const current = normalizePrecipitationGroup(existingGroups[idx]) || existingGroups[idx];

        const next = {

            ...current,

            name: typeof name === "string" ? name : current.name,

            depositIds: Array.isArray(depositIds)

                ? Array.from(new Set(depositIds.filter(Boolean)))

                : current.depositIds,

        };

        existingGroups[idx] = next;



        if (writeJsonFile(PRECIPITATION_GROUPS_PATH, existingGroups)) {

            logger.info('PRECIPITATION', `已更新沉淀集: ${id}`);

            res.json({ ok: true, group: next });

        } else {

            res.status(500).json({ error: "更新沉淀集失败" });

        }

    } catch (error) {

        logger.error('PRECIPITATION', '更新沉淀集失败', error);

        res.status(500).json({ error: '更新沉淀集失败' });

    }

});



router.delete("/precipitation/groups/:id", (req, res) => {

    try {

        const { id } = req.params;

        const existingGroups = readJsonFile(PRECIPITATION_GROUPS_PATH) || [];

        const updatedGroups = existingGroups.filter(g => g.id !== id);

        if (updatedGroups.length === existingGroups.length) {

            return res.status(404).json({ error: "未找到该沉淀集" });

        }

        if (writeJsonFile(PRECIPITATION_GROUPS_PATH, updatedGroups)) {

            logger.info('PRECIPITATION', `已删除沉淀集: ${id}`);

            res.json({ ok: true });

        } else {

            res.status(500).json({ error: "删除沉淀集失败" });

        }

    } catch (error) {

        logger.error('PRECIPITATION', '删除沉淀集失败', error);

        res.status(500).json({ error: '删除沉淀集失败' });

    }

});




// Outline History Endpoints


const OUTLINE_HISTORY_PATH = path.join(DATA_DIR, "outline-history.json");





router.get("/outlines", (req, res) => {


    try {


        const data = readJsonFile(OUTLINE_HISTORY_PATH) || [];





        // Auto-repair missing title fields


        let needsRepair = false;


        const repairedData = data.map(record => {


            if (!record.title && record.docName) {


                needsRepair = true;


                return { ...record, title: record.docName };


            }


            if (!record.title && !record.docName) {


                needsRepair = true;


                return { ...record, title: '未命名存档', docName: '未命名存档' };


            }


            return record;


        });





        // Save repaired data back if any repairs were made


        if (needsRepair) {


            writeJsonFile(OUTLINE_HISTORY_PATH, repairedData);


            logger.info('OUTLINES', '已自动修复缺失的 title 字段');


        }





        res.json(repairedData);


    } catch (error) {


        logger.error('OUTLINES', '获取大纲历史失败', error);


        res.status(500).json({ error: '获取大纲历史失败' });


    }


});





router.post("/outlines", (req, res) => {


    try {


        const newRecord = req.body;


        if (!newRecord || !newRecord.id || !newRecord.template) {


            return res.status(400).json({ error: "无效的大纲历史数据" });


        }





        const existingRecords = readJsonFile(OUTLINE_HISTORY_PATH) || [];


        const updatedRecords = [newRecord, ...existingRecords];





        if (writeJsonFile(OUTLINE_HISTORY_PATH, updatedRecords)) {


            logger.info('OUTLINES', `已保存大纲历史: ${newRecord.id}`);


            res.json({ ok: true });


        } else {


            res.status(500).json({ error: "保存大纲历史失败" });


        }


    } catch (error) {


        logger.error('OUTLINES', '保存大纲历史失败', error);


        res.status(500).json({ error: '保存大纲历史失败' });


    }


});





router.delete("/outlines/:id", (req, res) => {


    try {


        const { id } = req.params;


        const existingRecords = readJsonFile(OUTLINE_HISTORY_PATH) || [];


        const updatedRecords = existingRecords.filter(r => r.id !== id);





        if (writeJsonFile(OUTLINE_HISTORY_PATH, updatedRecords)) {


            logger.info('OUTLINES', `已删除大纲历史: ${id}`);


            res.json({ ok: true });


        } else {


            res.status(500).json({ error: "删除大纲历史失败" });


        }


    } catch (error) {


        logger.error('OUTLINES', '删除大纲历史失败', error);


        res.status(500).json({ error: '删除大纲历史失败' });


    }


});





router.patch("/outlines/:id", (req, res) => {


    try {


        const { id } = req.params;


        const { title } = req.body;


        if (!title) {


            return res.status(400).json({ error: "标题不能为空" });


        }





        const existingRecords = readJsonFile(OUTLINE_HISTORY_PATH) || [];


        const recordIndex = existingRecords.findIndex(r => r.id === id);





        if (recordIndex === -1) {


            return res.status(404).json({ error: "未找到该存档" });


        }





        existingRecords[recordIndex].title = title;





        if (writeJsonFile(OUTLINE_HISTORY_PATH, existingRecords)) {


            logger.info('OUTLINES', `已更新大纲标题: ${id} -> ${title}`);


            res.json({ ok: true });


        } else {


            res.status(500).json({ error: "更新大纲标题失败" });


        }


    } catch (error) {


        logger.error('OUTLINES', '更新大纲标题失败', error);


        res.status(500).json({ error: '更新大纲标题失败' });


    }


});





// Button logic generation endpoint


router.post("/button-logic", async (req, res) => {


    try {


        const { buttonId, naturalLanguage, currentConfig } = req.body;





        if (!naturalLanguage) {


            return res.status(400).json({ error: 'naturalLanguage is required' });


        }





        const prompt = `You are a button configuration assistant. The user wants to modify a button's behavior.





Current button configuration:


- ID: ${buttonId || 'new button'}


- Label: ${currentConfig?.label || 'undefined'}


- Action Type: ${currentConfig?.kind || 'undefined'}


- Prompt: ${currentConfig?.prompt || 'undefined'}





User's natural language request:


"${naturalLanguage}"





Based on this request, suggest the optimal button configuration. Return a JSON object with these fields:


{


  "label": "suggested button label",


  "kind": "action type (outline_extract, dispatch, final_generate, upload_file, or custom)",


  "prompt": "suggested prompt for AI processing (if applicable)",


  "explanation": "brief explanation of the suggested configuration"


}





Action type guidelines:


- outline_extract: Extract document outline/structure


- dispatch: Execute custom instructions on documents


- final_generate: Generate final output


- upload_file: Upload file action


- custom: Custom action





Only return the JSON object, no other text.`;





        const { callAI } = await import("./server_utils.js");


        const messages = [


            { role: "system", content: "You are a helpful assistant that generates button configurations. You only output JSON." },


            { role: "user", content: prompt }


        ];


        const aiResponse = await callAI(messages);





        let parsedResult;


        try {


            const cleanJson = aiResponse.replace(/```json/g, "").replace(/```/g, "").trim();


            parsedResult = JSON.parse(cleanJson);


        } catch (e) {


            logger.warn("BUTTON_LOGIC", "AI returned invalid JSON for button logic, falling back to raw", { raw: aiResponse });


            parsedResult = {


                explanation: "Failed to parse AI response",


                raw_response: aiResponse


            };


        }





        res.json({


            success: true,


            suggestion: parsedResult


        });


    } catch (err) {


        logger.error('BUTTON_LOGIC', 'Failed to generate button logic', err);


        res.status(500).json({ error: err.message || 'Failed to generate button logic' });


    }


});





// Replay Intent API


router.post("/precipitation/intent", async (req, res) => {


    try {


        const { section, context } = req.body;


        if (!section) {


            return res.status(400).json({ error: "Missing section data" });


        }





        logger.info("REPLAY", `Parsing Intent for: ${section.buttonLabel || "Unknown Action"}`, { sectionId: section.id });





        // Construct a focused prompt for the AI


        const prompt = `


You are an expert RPA (Robotic Process Automation) Step Analyzer.


Your task is to analyze a recorded user action and determine the user's INTENT, then find the best matching target in the current environment context.





[RECORDED ACTION]


- Action ID: ${section.id}


- Original Button Label: ${section.buttonLabel}


- Button Kind: ${section.buttonKind}


- Input Preview: ${JSON.stringify(section.input || {})}


- Timestamp: ${section.timestamp}





[CURRENT CONTEXT - Available Buttons]


The following buttons exist in the current UI state. You must find the one that matches the recorded action best.


${context && context.availableButtons ? JSON.stringify(context.availableButtons, null, 2) : "No context provided"}





[INSTRUCTIONS]


1. Analyze what the user was trying to do based on the recorded action.


2. Look at the "Available Buttons" list.


3. Find the best match. 


   - Exact label match is best.


   - Fuzzy label match (e.g., "Upload" vs "Upload File") is second best.


   - Functionality match (based on Kind) is third best.


4. If the intended action is "add text" or "upload", identifying the target panel/area is crucial.





[OUTPUT FORMAT]


Return ONLY a valid JSON object. No markdown, no explanations outside JSON.


{


    "analysis": "Brief reasoning here",


    "intent": "upload_file" | "click_button" | "input_text" | "unknown",


    "confidence": 0.0 to 1.0,


    "target": {


        "label": "The label of the button to click in current context",


        "id": "The ID of the button if found"


    }


}


`;





        const { callAI } = await import("./server_utils.js");





        // System prompt to enforce JSON


        const messages = [


            { role: "system", content: "You are a precise backend API that outputs only valid JSON." },


            { role: "user", content: prompt }


        ];





        const aiResponse = await callAI(messages);





        // Robust JSON Parsing


        let parsedResult;


        try {


            // Strip markdown code fences if LLM adds them


            const cleanJson = aiResponse.replace(/```json/g, "").replace(/```/g, "").trim();


            parsedResult = JSON.parse(cleanJson);


        } catch (e) {


            logger.warn("REPLAY", "AI returned invalid JSON, falling back to raw", { raw: aiResponse });


            parsedResult = {


                analysis: "Failed to parse AI response",


                intent: "unknown",


                confidence: 0,


                raw_response: aiResponse


            };


        }





        res.json(parsedResult);





    } catch (error) {


        logger.error("REPLAY", "Intent Analysis Failed", error);


        res.status(500).json({ error: "Interior Server Error during Intent Analysis" });


    }


});











// =====================================================
// 服务端 Replay 执行 API
// 应用端只是用户交互界面，真正的 Replay 逻辑在后管端执行
// 点击应用端按钮 → 服务端从配置目录加载文件 → 执行沉淀集 Replay → 返回结果
// =====================================================

const REPLAY_CONFIG_PATH = path.join(DATA_DIR, "replay-config.json");

// 获取 Replay 配置（目录路径等）
router.get("/replay/config", (req, res) => {
    try {
        const data = readJsonFile(REPLAY_CONFIG_PATH);
        res.json(data || { dirPath: "", autoLoadFiles: true });
    } catch (error) {
        logger.error('REPLAY_CONFIG', '获取 Replay 配置失败', error);
        res.status(500).json({ error: '获取 Replay 配置失败' });
    }
});

// 保存 Replay 配置
router.post("/replay/config", (req, res) => {
    try {
        const { dirPath, autoLoadFiles } = req.body || {};
        const config = {
            dirPath: typeof dirPath === "string" ? dirPath : "",
            autoLoadFiles: autoLoadFiles !== false
        };
        if (writeJsonFile(REPLAY_CONFIG_PATH, config)) {
            logger.info('REPLAY_CONFIG', `已保存 Replay 配置: ${config.dirPath}`);
            res.json({ ok: true, config });
        } else {
            res.status(500).json({ error: "保存 Replay 配置失败" });
        }
    } catch (error) {
        logger.error('REPLAY_CONFIG', '保存 Replay 配置失败', error);
        res.status(500).json({ error: '保存 Replay 配置失败' });
    }
});

// 从目录读取文件列表
const listFilesInDir = (dirPath) => {
    if (!dirPath || !fs.existsSync(dirPath)) return [];
    try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        return entries
            .filter(e => e.isFile())
            .map(e => ({
                name: e.name,
                path: path.join(dirPath, e.name),
                ext: path.extname(e.name).toLowerCase()
            }));
    } catch (err) {
        logger.error('REPLAY', '读取目录失败', err);
        return [];
    }
};

// 读取文件内容
const readFileContent = (filePath) => {
    try {
        const ext = path.extname(filePath).toLowerCase();
        if (['.txt', '.md', '.json', '.html', '.xml', '.csv'].includes(ext)) {
            return fs.readFileSync(filePath, 'utf-8');
        }
        // 对于其他文件类型，返回 base64
        const buffer = fs.readFileSync(filePath);
        return buffer.toString('base64');
    } catch (err) {
        logger.error('REPLAY', `读取文件失败: ${filePath}`, err);
        return null;
    }
};

// 列出配置目录中的文件 - 供前端调用
router.get("/replay/files", (req, res) => {
    try {
        const replayConfig = readJsonFile(REPLAY_CONFIG_PATH) || {};
        const dirPath = replayConfig.dirPath;
        
        if (!dirPath) {
            return res.json({ files: [], dirPath: '', error: '未配置目录路径' });
        }
        
        if (!fs.existsSync(dirPath)) {
            return res.json({ files: [], dirPath, error: '目录不存在' });
        }
        
        const files = listFilesInDir(dirPath);
        res.json({ files, dirPath });
    } catch (error) {
        logger.error('REPLAY', '获取目录文件列表失败', error);
        res.status(500).json({ error: '获取目录文件列表失败' });
    }
});

// 从配置目录读取单个文件 - 供前端 Replay 使用
router.post("/replay/read-file", async (req, res) => {
    try {
        const { fileName, customDirPath } = req.body || {};
        
        if (!fileName || typeof fileName !== 'string') {
            return res.status(400).json({ error: 'fileName 必须是非空字符串' });
        }
        
        // 获取配置的目录路径
        const replayConfig = readJsonFile(REPLAY_CONFIG_PATH) || {};
        const dirPath = customDirPath || replayConfig.dirPath;
        
        if (!dirPath) {
            return res.status(400).json({ error: '未配置 Replay 目录路径，请先在文档列表面板中配置' });
        }
        
        if (!fs.existsSync(dirPath)) {
            return res.status(404).json({ error: `目录不存在: ${dirPath}` });
        }
        
        // 构建完整文件路径
        const filePath = path.join(dirPath, fileName);
        
        // 安全检查：确保文件路径在配置目录内
        const resolvedPath = path.resolve(filePath);
        const resolvedDir = path.resolve(dirPath);
        if (!resolvedPath.startsWith(resolvedDir)) {
            return res.status(403).json({ error: '不允许访问目录外的文件' });
        }
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: `文件不存在: ${fileName}` });
        }
        
        // 读取文件内容
        const ext = path.extname(fileName).toLowerCase();
        let content;
        
        if (['.txt', '.md', '.json', '.html', '.xml', '.csv'].includes(ext)) {
            content = fs.readFileSync(filePath, 'utf-8');
        } else if (ext === '.docx') {
            // DOCX 文件返回 base64，让前端处理
            const buffer = fs.readFileSync(filePath);
            content = buffer.toString('base64');
            return res.json({ 
                name: fileName, 
                content, 
                isBase64: true, 
                ext,
                needsParsing: true 
            });
        } else {
            // 其他文件类型尝试读取为文本
            try {
                content = fs.readFileSync(filePath, 'utf-8');
            } catch {
                const buffer = fs.readFileSync(filePath);
                content = buffer.toString('base64');
                return res.json({ name: fileName, content, isBase64: true, ext });
            }
        }
        
        logger.info('REPLAY', `已读取文件: ${fileName}`, { dirPath });
        res.json({ name: fileName, content, isBase64: false, ext });
        
    } catch (error) {
        logger.error('REPLAY', '读取文件失败', error);
        res.status(500).json({ error: error.message || '读取文件失败' });
    }
});

// 执行沉淀集 Replay - 核心 API
// 应用端按钮点击后调用此接口，服务端从配置的目录加载文件，执行所有沉淀步骤
router.post("/replay/execute", async (req, res) => {
    try {
        const { groupIds, buttonLabel, dirPath: customDirPath } = req.body || {};
        
        if (!Array.isArray(groupIds) || !groupIds.length) {
            return res.status(400).json({ error: "groupIds 必须是非空数组" });
        }

        logger.info('REPLAY', `开始执行 Replay: ${buttonLabel || '未命名按钮'}`, { groupIds });

        // 1. 获取 Replay 配置
        const replayConfig = readJsonFile(REPLAY_CONFIG_PATH) || {};
        const dirPath = customDirPath || replayConfig.dirPath;

        // 2. 从配置目录加载文件
        const loadedFiles = [];
        if (dirPath && fs.existsSync(dirPath)) {
            const files = listFilesInDir(dirPath);
            for (const file of files) {
                const content = readFileContent(file.path);
                if (content !== null) {
                    loadedFiles.push({
                        name: file.name,
                        content,
                        ext: file.ext,
                        path: file.path
                    });
                }
            }
            logger.info('REPLAY', `已从目录加载 ${loadedFiles.length} 个文件`, { dirPath });
        }

        // 3. 获取沉淀集和沉淀记录
        const groups = readJsonFile(PRECIPITATION_GROUPS_PATH) || [];
        const records = readJsonFile(PRECIPITATION_RECORDS_PATH) || [];
        
        const targetGroups = groupIds
            .map(gid => groups.find(g => g.id === gid))
            .filter(Boolean);

        if (!targetGroups.length) {
            return res.status(404).json({ error: "未找到指定的沉淀集" });
        }

        // 4. 收集所有要执行的沉淀记录
        const seen = new Set();
        const recordList = [];
        const groupNames = [];
        
        for (const group of targetGroups) {
            groupNames.push(group.name || group.id);
            for (const depId of (group.depositIds || [])) {
                if (seen.has(depId)) continue;
                const record = records.find(r => r.id === depId);
                if (record) {
                    seen.add(depId);
                    recordList.push(record);
                }
            }
        }

        // 5. 执行 Replay 逻辑
        const results = [];
        const docsCreated = [];

        for (const record of recordList) {
            const sections = Array.isArray(record.sections) ? record.sections : [];
            
            for (const section of sections) {
                const meta = extractReplayMeta(section.content || "") || {};
                const metaType = (meta?.type || "").toString();
                
                let status = "done";
                let reason = "";
                let output = null;

                // 处理文档添加类型
                if (metaType === "add_doc" || metaType === "upload_doc") {
                    const docName = meta.docName || meta.selectedDocName || "";
                    
                    // 从加载的文件中查找匹配的文档
                    const matchedFile = loadedFiles.find(f => {
                        const name = f.name.toLowerCase();
                        const target = docName.toLowerCase();
                        return name === target || name.includes(target) || target.includes(name);
                    });

                    if (matchedFile) {
                        docsCreated.push({
                            name: matchedFile.name,
                            content: matchedFile.content,
                            source: "replay_auto_load",
                            path: matchedFile.path
                        });
                        status = "done";
                        reason = `已自动加载文档: ${matchedFile.name}`;
                    } else if (loadedFiles.length > 0) {
                        // 如果没有精确匹配但有文件，加载第一个未使用的
                        const unused = loadedFiles.find(f => 
                            !docsCreated.some(d => d.name === f.name)
                        );
                        if (unused) {
                            docsCreated.push({
                                name: unused.name,
                                content: unused.content,
                                source: "replay_auto_load",
                                path: unused.path
                            });
                            status = "done";
                            reason = `已自动加载文档: ${unused.name}（模糊匹配）`;
                        } else {
                            status = "skip";
                            reason = "目录中无更多未加载的文件";
                        }
                    } else {
                        status = "skip";
                        reason = docName ? `未配置目录或目录中无文件: ${docName}` : "未记录文件名且未配置目录";
                    }
                } else {
                    // 其他类型的沉淀步骤
                    output = {
                        metaType,
                        sectionId: section.id,
                        action: section.action || section.buttonLabel || "未知操作"
                    };
                }

                results.push({
                    recordId: record.id,
                    recordTitle: record.title || record.name,
                    sectionId: section.id,
                    action: section.action || section.buttonLabel || metaType,
                    status,
                    reason,
                    output
                });
            }
        }

        // 6. 返回结果
        res.json({
            ok: true,
            buttonLabel,
            groupNames,
            totalGroups: targetGroups.length,
            totalRecords: recordList.length,
            totalSteps: results.length,
            docsLoaded: docsCreated,
            dirPath: dirPath || null,
            results
        });

        logger.info('REPLAY', `Replay 执行完成: ${results.length} 步`, { 
            docsLoaded: docsCreated.length 
        });

    } catch (error) {
        logger.error('REPLAY', 'Replay 执行失败', error);
        res.status(500).json({ error: error.message || 'Replay 执行失败' });
    }
});




export default router;





