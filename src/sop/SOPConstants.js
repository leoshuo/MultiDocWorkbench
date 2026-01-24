/**
 * SOP工作台常量定义
 * 包含UI文本、默认配置、存储键等
 */

// ========== UI文本常量 ==========
export const UI_TEXT = {
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
  t48: "可新增/删除多条规则，用于分别配置标题/摘要的输出方式",
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

// ========== 存储键常量 ==========
export const LLM_BUTTONS_STORAGE_KEY = 'llm_buttons_v1';
export const LLM_BUTTONS_MIGRATION_KEY = 'llm_buttons_migrated_v2';
export const DEPOSITS_STORAGE_KEY = 'deposits_v1';
export const DEPOSITS_SEQ_STORAGE_KEY = 'deposits_seq_v1';
export const REPLAY_META_MARKER = '__REPLAY_META__';
export const REPLAY_DIR_HANDLE_KEY = 'replay_dir_handle_v1';
export const SHARED_SCENE_KEY = 'shared_scene_id';

// ========== 处理Tab配置 ==========
export const PROCESSING_TAB_SEQUENCE = ['tab_outline', 'tab_records', 'tab_config', 'tab_strategy'];

export const PROCESSING_TAB_LABELS = {
  tab_outline: '大纲配置',
  tab_records: '沉淀配置',
  tab_config: '应用端按钮配置',
  tab_strategy: '自迭代配置'
};

export const LEGACY_PROCESSING_TAB_LABELS = {
  tab_outline: ['大纲预览', '大纲模式', '大纲配置'],
  tab_records: ['沉淀记录', '沉淀列表', '沉淀配置'],
  tab_config: ['应用端按钮配置', '应用端配置', '应用端按钮'],
  tab_strategy: ['策略自更新配置', '自迭代配置']
};

// ========== 默认配置 ==========
export const DEFAULT_SECTION_REQUIREMENTS = {
  inputSource: 'optional',
  actionExecution: 'optional',
  executionSummary: 'optional',
  recordLocation: 'optional'
};

export const DEFAULT_APP_BUTTONS = [
  { id: 'app_btn_daily_merge', label: '日报合并写作（主任版）', groupIds: [] },
  { id: 'app_btn_competitor_report', label: '竞品分析报告写作', groupIds: [] },
  { id: 'app_btn_custom_write', label: '自定义写作', groupIds: [] }
];

export const DEFAULT_PRECIPITATION_MODE = 'llm';

// ========== 默认Prompt ==========
export const DEFAULT_OUTLINE_BUTTON_PROMPT = `请输出 JSON 数组：

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
{{text}}`.trim();

export const DEFAULT_DISPATCH_SYSTEM_PROMPT = `请输出 JSON：
- summary: 简要摘要
- detail: 详细说明
- edits: [{sectionId, field:'title'|'summary', content}]
只输出 JSON。`.trim();

export const DEFAULT_FINAL_SYSTEM_PROMPT = `请输出 Markdown 格式的最终文档。`.trim();

// ========== 正则表达式 ==========
export const INPUT_SOURCE_PREFIX_RE = /^输入来源[:：]?\s*/;
