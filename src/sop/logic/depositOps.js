/**
 * 沉淀操作纯函数模块
 * 包含与沉淀记录相关的工具函数
 */

import { REPLAY_META_MARKER, UI_TEXT } from '../SOPConstants';

/**
 * 截断文本到指定长度
 * @param {string} text - 原始文本
 * @param {number} max - 最大长度，默认600
 * @returns {string} 截断后的文本
 */
export const clipText = (text, max = 600) => {
  const raw = (text ?? '').toString();
  if (raw.length <= max) return raw;
  return `${raw.slice(0, max)}...`;
};

/**
 * 附加 Replay 元数据到文本
 * @param {string} text - 原始文本
 * @param {object} meta - 元数据对象
 * @returns {string} 带元数据的文本
 */
export const appendReplayMeta = (text, meta) => {
  try {
    const payload = JSON.stringify(meta || {});
    return `${(text || '').toString()}\n\n${REPLAY_META_MARKER}\n${payload}`;
  } catch (_) {
    return (text || '').toString();
  }
};

/**
 * 从文本中提取 Replay 元数据
 * @param {string} content - 带元数据的文本
 * @returns {object|null} 元数据对象或null
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
 * 描述输入来源
 * @param {object|string} input - 输入对象
 * @returns {string} 输入描述
 */
export const describeInput = (input) => {
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

/**
 * 描述目标位置
 * @param {object|string} dest - 目标对象
 * @returns {string} 目标描述
 */
export const describeDestination = (dest) => {
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

/**
 * 格式化操作内容为可读文本
 * @param {object} meta - 元数据对象
 * @param {string[]} extraLines - 额外行
 * @returns {string} 格式化后的文本
 */
export const formatOpContent = (meta, extraLines = []) => {
  const m = meta && typeof meta === 'object' ? meta : {};
  const inputs = Array.isArray(m.inputs) ? m.inputs : [];
  const destinations = Array.isArray(m.destinations) ? m.destinations : [];
  const targetSummaries = Array.isArray(m.targetSummaries) ? m.targetSummaries : [];
  const lines = [];
  
  // 辅助函数：获取层级标签
  const getLevelLabel = (level) => {
    if (level === 1) return '一级标题';
    if (level === 2) return '二级标题';
    if (level === 3) return '三级标题';
    return `${level}级标题`;
  };
  
  // 辅助函数：获取选中内容输入
  const selectionInput = inputs.find(i => i.kind === 'selection');
  const docName = selectionInput?.docName || m.docName || m.selectedDocName || '';
  
  // ========== 按操作类型处理 ==========
  
  if (m.type === 'add_doc' || m.type === 'upload_doc') {
    // ===== 添加/上传文档 =====
    const uploadInput = inputs.find((i) => i.kind === 'upload_file');
    const fileName = uploadInput?.docName || m.docName || UI_TEXT.t135;
    
    lines.push(`【操作类型】添加文档 (add_doc)`);
    
    // 描述字段
    const description = m.intentDescription || m.description || m.title || '';
    if (description) {
      lines.push(`【描述】${description}`);
    }
    
    lines.push(`【文档名称】${fileName}`);
    
    // 来源类型
    if (m.source) {
      lines.push(`【来源类型】${m.source === 'upload' ? '文件上传' : m.source}`);
    }
    
    // 是否覆盖
    if (m.overwritten !== undefined) {
      lines.push(`【是否覆盖】${m.overwritten ? '是（覆盖同名文档）' : '否（新增文档）'}`);
    }
    
    // 处理过程
    if (m.process) {
      lines.push(`【处理过程】${m.process}`);
    }
    
    // 特殊要求
    if (m.specialRequirements) {
      lines.push(`【特殊要求】${m.specialRequirements}`);
    }
    
    // AI 执行指导
    if (m.aiGuidance) {
      lines.push(`【AI执行指导】${m.aiGuidance}`);
    }
    
    // 输入来源
    if (inputs.length > 0) {
      const inputLines = inputs.map((inp, idx) => {
        const parts = [];
        if (inp.kind) parts.push(`类型: ${inp.kind}`);
        if (inp.docName) parts.push(`文档: ${inp.docName}`);
        if (inp.contextSummary) parts.push(`来源: ${inp.contextSummary}`);
        if (inp.sourceType) parts.push(`来源类型: ${inp.sourceType}`);
        return `[${idx + 1}] ${parts.join(', ')}`;
      });
      lines.push(`【输入来源】\n${inputLines.join('\n')}`);
    }
    
    // 文档选择器
    if (m.docSelector) {
      lines.push(`【文档选择器】${JSON.stringify(m.docSelector)}`);
    }
    
    // 灵活上传字段
    if (m.flexKeywords) {
      lines.push(`【灵活名称上传】${m.flexKeywords}`);
    }
    if (m.flexMatchResult) {
      lines.push(`【灵活匹配关键词】${m.flexMatchResult}`);
    }
    
    // 目标位置
    lines.push(`【目标位置】文档列表`);
    
    // 目的地详情
    if (destinations.length > 0) {
      const destLines = destinations.map((d, idx) => {
        return `[${idx + 1}] ${describeDestination(d)}`;
      });
      lines.push(`【目的地详情】\n${destLines.join('\n')}`);
    }
    
    // 执行结果
    if (m.outputs?.executionResult) {
      lines.push(`【执行结果】${m.outputs.executionResult}`);
    } else if (m.outputs?.summary) {
      lines.push(`【执行结果】${m.outputs.summary}`);
    } else {
      lines.push(`【执行结果】已成功添加文档「${fileName}」`);
    }
    
    // 执行状态
    if (m.outputs?.status) {
      lines.push(`【执行状态】${m.outputs.status}`);
    }
    
    // 上下文信息
    if (m.context) {
      const ctx = m.context;
      const ctxParts = [];
      if (ctx.sceneId) ctxParts.push(`场景ID: ${ctx.sceneId}`);
      if (ctx.loadedDocsCount !== undefined) ctxParts.push(`已加载文档数: ${ctx.loadedDocsCount}`);
      if (ctx.hasOutline !== undefined) ctxParts.push(`有大纲: ${ctx.hasOutline ? '是' : '否'}`);
      if (ctx.outlineSectionsCount !== undefined) ctxParts.push(`大纲章节数: ${ctx.outlineSectionsCount}`);
      if (ctxParts.length > 0) {
        lines.push(`【上下文】${ctxParts.join(', ')}`);
      }
    }
    
    // 时间戳
    if (m.ts) {
      lines.push(`【记录时间】${new Date(m.ts).toLocaleString()}`);
    }
    
  } else if (m.type === 'delete_doc') {
    // ===== 删除文档 =====
    lines.push(`【操作类型】删除文档 (delete_doc)`);
    lines.push(`【文档名称】${m.docName || '未知'}`);
    if (m.outputs?.executionResult) {
      lines.push(`【执行结果】${m.outputs.executionResult}`);
    } else if (m.outputs?.summary) {
      lines.push(`【执行结果】${m.outputs.summary}`);
    } else {
      lines.push(`【执行结果】已成功删除文档`);
    }
    
  } else if (m.type === 'insert_to_summary_multi') {
    // ===== 多摘要填入 =====
    lines.push(`【操作类型】多摘要填入 (insert_to_summary_multi)`);
    lines.push(`【来源文档】${docName || '未知文档'}`);
    
    // 选中内容的详细信息
    if (selectionInput) {
      const textHead = selectionInput.textHead || selectionInput.textExcerpt?.slice(0, 30) || '';
      const textTail = selectionInput.textTail || selectionInput.textExcerpt?.slice(-30) || '';
      lines.push(`【选中内容】以「${textHead}...」开头，以「...${textTail}」结尾（共${selectionInput.textLength || 0}字）`);
      // 原文 - 完整记录选中的原文内容
      if (selectionInput.originalText || selectionInput.text) {
        lines.push(`【原文】${selectionInput.originalText || selectionInput.text}`);
      }
      // 内容特征
      if (selectionInput.contentFeatures) {
        const cf = selectionInput.contentFeatures;
        const features = [];
        if (cf.charCount) features.push(`${cf.charCount}字`);
        if (cf.lineCount) features.push(`${cf.lineCount}行`);
        if (cf.hasNumbers) features.push('含数字');
        if (cf.hasDates) features.push('含日期');
        if (cf.hasBold) features.push(`含加粗(${cf.boldCount || 0}处)`);
        if (features.length > 0) {
          lines.push(`【内容特征】${features.join('、')}`);
        }
      }
      if (selectionInput.contextBefore) {
        lines.push(`【前文上下文】...${selectionInput.contextBefore}`);
      }
      if (selectionInput.contextAfter) {
        lines.push(`【后文上下文】${selectionInput.contextAfter}...`);
      }
    }
    
    // 目标位置的详细信息
    if (targetSummaries.length > 0) {
      lines.push(`【目标位置】共 ${targetSummaries.length} 个摘要：`);
      targetSummaries.forEach((t, idx) => {
        const levelLabel = getLevelLabel(t.sectionLevel);
        lines.push(`  ${idx + 1}. ${levelLabel}「${t.sectionTitle}」的第${(t.summaryIndex || 0) + 1}个摘要${t.hadContentBefore ? '（替换）' : '（新建）'}`);
      });
    }
    
    // 【关键】AI 执行指导 - 用于 LLM Replay 时的计算/处理指导
    if (m.aiGuidance) {
      lines.push(`【AI执行指导】${m.aiGuidance}`);
    } else {
      lines.push(`【AI执行指导】（可选）在此处填写数据处理指导，例如：`);
      lines.push(`  - 计算公式：总次数 = 预警调度次数 + 电台调度次数 + 视频巡检次数`);
      lines.push(`  - 输出格式：政治中心区调度检查 {{总次数}} 次`);
    }
    
    // 执行结果
    if (m.outputs?.executionResult) {
      lines.push(`【执行结果】${m.outputs.executionResult}`);
    } else if (m.outputs?.summary) {
      lines.push(`【执行结果】${m.outputs.summary}`);
    }
    
  } else if (m.type === 'insert_to_summary') {
    // ===== 单标题填入摘要 =====
    lines.push(`【操作类型】填入摘要 (insert_to_summary)`);
    lines.push(`【来源文档】${docName || '未知文档'}`);
    
    // 选中内容
    if (selectionInput) {
      const textHead = selectionInput.textHead || selectionInput.textExcerpt?.slice(0, 30) || '';
      const textTail = selectionInput.textTail || selectionInput.textExcerpt?.slice(-30) || '';
      lines.push(`【选中内容】以「${textHead}...」开头，以「...${textTail}」结尾（共${selectionInput.textLength || 0}字）`);
      if (selectionInput.originalText || selectionInput.text) {
        lines.push(`【原文】${selectionInput.originalText || selectionInput.text}`);
      }
      if (selectionInput.contentFeatures) {
        const cf = selectionInput.contentFeatures;
        const features = [];
        if (cf.charCount) features.push(`${cf.charCount}字`);
        if (cf.lineCount) features.push(`${cf.lineCount}行`);
        if (cf.hasNumbers) features.push('含数字');
        if (cf.hasDates) features.push('含日期');
        if (cf.hasBold) features.push(`含加粗(${cf.boldCount || 0}处)`);
        if (features.length > 0) {
          lines.push(`【内容特征】${features.join('、')}`);
        }
      }
      if (selectionInput.contextBefore) {
        lines.push(`【前文上下文】...${selectionInput.contextBefore}`);
      }
      if (selectionInput.contextAfter) {
        lines.push(`【后文上下文】${selectionInput.contextAfter}...`);
      }
    }
    
    // 目标位置
    const selectedTitles = m.selectedSectionTitles || [];
    const targetSectionsDetail = m.targetSectionsDetail || [];
    if (targetSectionsDetail.length > 0) {
      lines.push(`【目标位置】共 ${targetSectionsDetail.length} 个标题：`);
      targetSectionsDetail.forEach((t, idx) => {
        const levelLabel = getLevelLabel(t.level);
        lines.push(`  ${idx + 1}. ${levelLabel}「${t.title}」的摘要`);
      });
    } else if (selectedTitles.length > 0) {
      lines.push(`【目标标题】${selectedTitles.join('、')}`);
    } else if (destinations.length > 0) {
      lines.push(`【目标位置】共 ${destinations.length} 个位置：`);
      destinations.forEach((d, idx) => {
        const levelLabel = d.sectionLevel ? getLevelLabel(d.sectionLevel) : '';
        lines.push(`  ${idx + 1}. ${levelLabel}「${d.sectionTitle || d.label || ''}」`);
      });
    }
    
    // 【关键】AI 执行指导 - 用于 LLM Replay 时的计算/处理指导
    if (m.aiGuidance) {
      lines.push(`【AI执行指导】${m.aiGuidance}`);
    } else {
      lines.push(`【AI执行指导】（可选）在此处填写数据处理指导，例如：`);
      lines.push(`  - 计算公式：总次数 = 预警调度次数 + 电台调度次数 + 视频巡检次数`);
      lines.push(`  - 输出格式：政治中心区调度检查 {{总次数}} 次`);
    }
    
    // 执行结果
    if (m.outputs?.executionResult) {
      lines.push(`【执行结果】${m.outputs.executionResult}`);
    } else if (m.outputs?.summary) {
      lines.push(`【执行结果】${m.outputs.summary}`);
    }
    
  } else if (m.type === 'dispatch' || m.type === 'dispatch_input') {
    // ===== 执行指令/调度 =====
    lines.push(`【操作类型】执行指令 (dispatch)`);
    lines.push(`【指令内容】${m.instructions || m.promptContent || ''}`);
    
    // 输入来源
    if (m.inputSourceDesc) {
      lines.push(`【输入来源】${m.inputSourceDesc}`);
    }
    if (m.inputContentExcerpt) {
      lines.push(`【输入内容】${m.inputContentExcerpt.slice(0, 200)}${m.inputContentExcerpt.length > 200 ? '...' : ''}`);
    }
    
    // 目标位置
    if (m.outputTargetDesc) {
      lines.push(`【目标位置】${m.outputTargetDesc}`);
    } else if (m.targetSectionTitle) {
      lines.push(`【目标标题】${m.targetSectionTitle}`);
    } else if (destinations.length > 0) {
      const destTitles = destinations.map(d => d.sectionTitle || d.label || '').filter(Boolean);
      if (destTitles.length > 0) {
        lines.push(`【目标位置】${destTitles.join('、')}`);
      }
    }
    
    // 执行结果
    if (m.outputs?.executionResult) {
      lines.push(`【执行结果】${m.outputs.executionResult}`);
    } else if (m.outputs?.summary) {
      lines.push(`【执行结果】${m.outputs.summary}`);
    } else if (m.outputs?.outputContent) {
      lines.push(`【输出内容】${m.outputs.outputContent.slice(0, 200)}${m.outputs.outputContent.length > 200 ? '...' : ''}`);
    }
    
  } else if (m.type === 'dispatch_multi_summary') {
    // ===== 多摘要执行指令 =====
    lines.push(`【操作类型】多摘要执行指令 (dispatch_multi_summary)`);
    lines.push(`【指令内容】${m.instructions || m.promptContent || ''}`);
    
    // 目标位置的详细信息
    if (targetSummaries.length > 0) {
      lines.push(`【目标位置】共 ${targetSummaries.length} 个摘要：`);
      targetSummaries.forEach((t, idx) => {
        const levelLabel = getLevelLabel(t.sectionLevel);
        const contentPreview = t.originalContentExcerpt ? `（原内容：${t.originalContentExcerpt.slice(0, 30)}...）` : '';
        lines.push(`  ${idx + 1}. ${levelLabel}「${t.sectionTitle}」的第${(t.summaryIndex || 0) + 1}个摘要${contentPreview}`);
      });
    }
    
    // 执行结果
    if (m.outputs?.executionResult) {
      lines.push(`【执行结果】${m.outputs.executionResult}`);
    } else if (m.outputs?.summary) {
      lines.push(`【执行结果】${m.outputs.summary}`);
    }
    
  } else if (m.type === 'outline_extract') {
    // ===== 大纲抽取 =====
    lines.push(`【操作类型】大纲抽取 (outline_extract)`);
    lines.push(`【来源文档】${m.selectedDocName || m.docName || '未知'}`);
    
    if (m.inputContentExcerpt) {
      lines.push(`【输入内容】${m.inputContentExcerpt.slice(0, 200)}${m.inputContentExcerpt.length > 200 ? '...' : ''}`);
    }
    
    // 生成的大纲
    const generatedSections = m.outputs?.generatedSections || [];
    if (generatedSections.length > 0) {
      lines.push(`【生成大纲】共 ${generatedSections.length} 个标题`);
    }
    
    // 执行结果
    if (m.outputs?.executionResult) {
      lines.push(`【执行结果】${m.outputs.executionResult}`);
    } else if (m.outputs?.summary) {
      lines.push(`【执行结果】${m.outputs.summary}`);
    } else {
      lines.push(`【执行结果】已成功抽取大纲，生成 ${generatedSections.length} 个标题`);
    }
    
  } else if (m.type === 'outline_clear') {
    // ===== 清除大纲 =====
    lines.push(`【操作类型】清除大纲 (outline_clear)`);
    if (m.outputs?.executionResult) {
      lines.push(`【执行结果】${m.outputs.executionResult}`);
    } else {
      lines.push(`【执行结果】已清除大纲`);
    }
    
  } else if (m.type === 'restore_history_outline') {
    // ===== 应用历史大纲 =====
    lines.push(`【操作类型】应用历史大纲 (restore_history_outline)`);
    if (m.outlineTitle) {
      lines.push(`【大纲名称】${m.outlineTitle}`);
    }
    if (m.outlineId) {
      lines.push(`【大纲ID】${m.outlineId}`);
    }
    if (m.outputs?.executionResult) {
      lines.push(`【执行结果】${m.outputs.executionResult}`);
    } else {
      lines.push(`【执行结果】已应用历史大纲`);
    }
    
  } else if (m.type === 'outline_link_doc' || m.type === 'link_doc') {
    // ===== 关联文档 =====
    lines.push(`【操作类型】关联文档 (outline_link_doc)`);
    lines.push(`【文档名称】${m.docName || '未知'}`);
    if (m.targetSectionTitle) {
      lines.push(`【目标标题】${m.targetSectionTitle}`);
    }
    if (m.outputs?.executionResult) {
      lines.push(`【执行结果】${m.outputs.executionResult}`);
    } else {
      lines.push(`【执行结果】已关联文档到标题`);
    }
    
  } else if (m.type === 'copy_full_to_summary') {
    // ===== 复制全文到摘要 =====
    lines.push(`【操作类型】复制全文到摘要 (copy_full_to_summary)`);
    lines.push(`【来源文档】${m.docName || '未知'}`);
    if (m.targetSectionTitle) {
      lines.push(`【目标标题】${m.targetSectionTitle}`);
    }
    if (m.outputs?.executionResult) {
      lines.push(`【执行结果】${m.outputs.executionResult}`);
    } else if (m.outputs?.summary) {
      lines.push(`【执行结果】${m.outputs.summary}`);
    }
    
  } else if (m.type === 'add_section' || m.type === 'add_title') {
    // ===== 添加标题 =====
    lines.push(`【操作类型】添加标题 (add_section)`);
    if (m.newSection) {
      lines.push(`【新标题】${m.newSection.title || '未命名'}`);
      lines.push(`【标题级别】${getLevelLabel(m.newSection.level)}`);
    }
    if (m.afterSection) {
      lines.push(`【插入位置】在「${m.afterSection.title}」之后`);
    }
    if (m.outputs?.executionResult) {
      lines.push(`【执行结果】${m.outputs.executionResult}`);
    } else {
      lines.push(`【执行结果】已添加新标题`);
    }
    
  } else if (m.type === 'delete_section' || m.type === 'remove_title') {
    // ===== 删除标题 =====
    lines.push(`【操作类型】删除标题 (delete_section)`);
    if (m.targetSection) {
      lines.push(`【删除标题】${m.targetSection.title || '未命名'}`);
    }
    const removedSections = m.removedSections || [];
    if (removedSections.length > 0) {
      lines.push(`【删除数量】共 ${removedSections.length} 个标题`);
    }
    if (m.outputs?.executionResult) {
      lines.push(`【执行结果】${m.outputs.executionResult}`);
    } else {
      lines.push(`【执行结果】已删除标题`);
    }
    
  } else if (m.type === 'edit_title' || m.type === 'rename_section') {
    // ===== 编辑标题 =====
    lines.push(`【操作类型】编辑标题 (edit_title)`);
    if (m.targetSectionTitle) {
      lines.push(`【原标题】${m.targetSectionTitle}`);
    }
    if (m.outputs?.executionResult) {
      lines.push(`【执行结果】${m.outputs.executionResult}`);
    } else {
      lines.push(`【执行结果】已编辑标题`);
    }
    
  } else if (m.type === 'generate_final_doc') {
    // ===== 生成最终文档 =====
    lines.push(`【操作类型】生成最终文档 (generate_final_doc)`);
    if (m.outputs?.executionResult) {
      lines.push(`【执行结果】${m.outputs.executionResult}`);
    } else if (m.outputs?.summary) {
      lines.push(`【执行结果】${m.outputs.summary}`);
    } else {
      lines.push(`【执行结果】已生成最终文档`);
    }
    
  } else {
    // ===== 其他/默认操作 =====
    const typeLabel = m.type || m.buttonAction || '未知操作';
    lines.push(`【操作类型】${typeLabel}`);
    
    // 来源文档
    if (docName) {
      lines.push(`【来源文档】${docName}`);
    }
    
    // 选中内容
    if (selectionInput) {
      if (selectionInput.text || selectionInput.textExcerpt) {
        const text = selectionInput.text || selectionInput.textExcerpt;
        lines.push(`【选中内容】${text.slice(0, 100)}${text.length > 100 ? '...' : ''}`);
      }
      if (selectionInput.originalText || selectionInput.text) {
        lines.push(`【原文】${selectionInput.originalText || selectionInput.text}`);
      }
    }
    
    // 输入描述
    if (inputs.length && !selectionInput) {
      const inputDesc = inputs.map(describeInput).filter(Boolean).join('；');
      if (inputDesc) {
        lines.push(`【输入来源】${inputDesc}`);
      }
    }
    
    // 指令内容
    if (m.instructions || m.promptContent) {
      lines.push(`【指令内容】${m.instructions || m.promptContent}`);
    }
    
    // 目标位置
    if (m.targetSectionTitle) {
      lines.push(`【目标标题】${m.targetSectionTitle}`);
    } else if (destinations.length) {
      const destDesc = destinations.map(describeDestination).filter(Boolean).join('；');
      if (destDesc) {
        lines.push(`【目标位置】${destDesc}`);
      }
    }
    
    // 处理过程
    if (m.process) {
      lines.push(`【处理过程】${m.process}`);
    }
    
    // 执行结果
    if (m.outputs?.executionResult) {
      lines.push(`【执行结果】${m.outputs.executionResult}`);
    } else if (m.outputs?.summary) {
      lines.push(`【执行结果】${m.outputs.summary}`);
    } else if (m.record) {
      lines.push(`【执行结果】${m.record}`);
    } else {
      lines.push(`【执行结果】操作已完成`);
    }
  }

  if (Array.isArray(extraLines) && extraLines.length) {
    lines.push('');
    lines.push(...extraLines.filter(Boolean));
  }

  return lines.join('\n').trim();
};

/**
 * 解析沉淀段落内容，提取结构化信息
 * @param {string} content - 沉淀段落内容
 * @returns {object} 解析后的结构化信息
 */
export const parseDepositSectionContent = (content) => {
  const raw = (content || '').toString();
  const idx = raw.indexOf(REPLAY_META_MARKER);
  const base = idx === -1 ? raw.trim() : raw.slice(0, idx).trim();
  const lines = base.
    split(/\r?\n/).
    map((line) => line.trim()).
    filter(Boolean);

  const recordLine =
    lines.find((line) => line.startsWith('操作记录：')) ||
    lines.find((line) => line.startsWith('操作记录')) ||
    lines.find((line) => line.startsWith('操作：')) ||
    lines[0] ||
    '';
  const operationRecord = recordLine.
    replace(/^操作记录：?/, '').
    replace(/^操作：?/, '').
    trim();
  const actionExecution =
    (lines.find((line) => line.startsWith('动作执行：')) || '').
      replace(/^动作执行：?/, '').
      trim() ||
    (lines.find((line) => line.startsWith('动作：')) || '').
      replace(/^动作：?/, '').
      trim();
  const executionSummary =
    (lines.find((line) => line.startsWith('执行摘要：')) || '').
      replace(/^执行摘要：?/, '').
      trim();
  const recordLocation =
    (lines.find((line) => line.startsWith('记录位置：')) || '').
      replace(/^记录位置：?/, '').
      trim();
  const inputLine = lines.find((line) => line.startsWith('输入来源：')) || '';

  return {
    operationRecord,
    actionExecution,
    executionSummary,
    recordLocation,
    inputLine: inputLine.replace(/^输入来源：?/, '').trim()
  };
};

/**
 * 标准化需求值
 * @param {string} value - 原始值
 * @returns {string} 'required' 或 'optional'
 */
export const normalizeRequirement = (value) => value === 'required' ? 'required' : 'optional';

/**
 * 获取段落的需求配置
 * @param {object} section - 段落对象
 * @returns {object} 需求配置对象
 */
export const getSectionRequirements = (section) => {
  const meta = extractReplayMeta(section?.content || '') || {};
  const raw = section?.requirements || meta?.requirements || {};
  return {
    inputSource: normalizeRequirement(raw.inputSource),
    actionExecution: normalizeRequirement(raw.actionExecution),
    executionSummary: normalizeRequirement(raw.executionSummary),
    recordLocation: normalizeRequirement(raw.recordLocation)
  };
};

// 操作元数据版本
export const OP_META_VERSION = 1;

/**
 * 生成初始结构化脚本（基于录制内容，包含详细上下文）
 * @param {Array} sections - 沉淀段落数组
 * @returns {string} 格式化的脚本内容
 */
export const generateInitialScript = (sections) => {
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
          
          // 1. 来源文档
          const docName = meta.docName || selectionInput?.docName || '未记录';
          lines.push(`【来源文档】${docName}`);
          
          // 2. 选中的内容（作为内容描述）
          const textExcerpt = selectionInput?.textExcerpt || selectionInput?.text || '';
          if (textExcerpt) {
            lines.push(`【选中内容】${textExcerpt.slice(0, 150)}${textExcerpt.length > 150 ? '...' : ''}`);
            lines.push(`【内容描述】需要从文档中找到与以下内容相似或相同的段落："${textExcerpt.slice(0, 100)}${textExcerpt.length > 100 ? '...' : ''}"`);
          }
          
          // 【新增】原文 - 完整记录选中的原文内容
          const originalText = selectionInput?.originalText || selectionInput?.text || '';
          if (originalText) {
            lines.push(`【原文】${originalText}`);
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
          
          // 5. AI 执行指导 - 【关键】用于 LLM Replay 时的计算/处理指导
          // 如果原始 meta 中有 aiGuidance，使用它；否则生成默认提示
          const existingAiGuidance = meta.aiGuidance || '';
          if (existingAiGuidance) {
            lines.push(`【AI执行指导】${existingAiGuidance}`);
          } else {
            // 【自动生成提示】帮助用户理解这个字段的用途
            lines.push(`【AI执行指导】（可选）在此处填写数据处理指导，例如：`);
            lines.push(`  - 计算公式：总次数 = 预警调度次数 + 电台调度次数 + 视频巡检次数`);
            lines.push(`  - 输出格式：政治中心区调度检查 {{总次数}} 次`);
            lines.push(`  - 或其他处理要求：提取姓名、格式化日期等`);
          }
          
          // 6. 执行结果 - 【修改】优先使用 executionResult
          if (outputs.executionResult) {
            lines.push(`【执行结果】${outputs.executionResult}`);
          } else if (outputs.summary) {
            lines.push(`【执行结果】${outputs.summary}`);
          }
          lines.push(`【特殊要求】${meta.specialRequirements || '无'}`);
          
        } else if (type === 'add_doc' || type === 'upload_doc') {
          // 添加文档
          lines.push(`【文档名称】${meta.docName || '未记录'}`);
          if (meta.docSelector) {
            lines.push(`【文档选择器】${JSON.stringify(meta.docSelector)}`);
          }
          const outputs = meta.outputs || {};
          if (outputs.executionResult) {
            lines.push(`【执行结果】${outputs.executionResult}`);
          } else if (outputs.summary) {
            lines.push(`【执行结果】${outputs.summary}`);
          } else {
            lines.push(`【执行结果】已成功添加文档「${meta.docName || ''}」`);
          }
          lines.push(`【特殊要求】${meta.specialRequirements || '无'}`);
          
        } else if (type === 'outline_extract') {
          // 大纲抽取
          if (meta.actionDescription) {
            lines.push(`【动作描述】${meta.actionDescription}`);
          }
          lines.push(`【来源文档】${meta.selectedDocName || meta.docName || '未记录'}`);
          
          const inputExcerpt = meta.inputContentExcerpt || '';
          if (inputExcerpt) {
            const excerpt = inputExcerpt.length > 200 ? inputExcerpt.substring(0, 200) + '...' : inputExcerpt;
            lines.push(`【输入内容】${excerpt}`);
          }
          
          const outputs = meta.outputs || {};
          const generatedSections = outputs.generatedSections || [];
          if (generatedSections.length > 0) {
            lines.push(`【生成大纲】共 ${generatedSections.length} 个标题：`);
            generatedSections.slice(0, 10).forEach((sec, idx) => {
              const levelText = sec.levelText || `${sec.level}级`;
              lines.push(`  ${idx + 1}. [${levelText}] ${sec.title}`);
              if (sec.summary) {
                const summaryExcerpt = sec.summary.length > 80 ? sec.summary.substring(0, 80) + '...' : sec.summary;
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
          
          // 执行结果（outputs 已在上面声明）
          if (outputs.executionResult) {
            lines.push(`【执行结果】${outputs.executionResult}`);
          } else if (outputs.summary) {
            lines.push(`【执行结果】${outputs.summary}`);
          } else {
            lines.push(`【执行结果】已成功抽取大纲，生成 ${generatedSections.length} 个标题`);
          }
          
          if (meta.aiGuidance) {
            lines.push(`【AI指导】${meta.aiGuidance}`);
          }
          lines.push(`【特殊要求】${meta.specialRequirements || '无'}`);
          
        } else if (type === 'add_outline_section') {
          // 新增标题
          if (meta.actionDescription) {
            lines.push(`【动作描述】${meta.actionDescription}`);
          }
          
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
          
          const newSection = meta.newSection;
          if (newSection) {
            lines.push(`【新增标题】${newSection.levelText || `${newSection.level}级`}标题「${newSection.title}」`);
            if (newSection.summary) {
              lines.push(`  摘要：${newSection.summary}`);
            }
          }
          
          // 执行结果
          const outputs = meta.outputs || {};
          if (outputs.executionResult) {
            lines.push(`【执行结果】${outputs.executionResult}`);
          } else if (outputs.summary) {
            lines.push(`【执行结果】${outputs.summary}`);
          } else if (newSection) {
            lines.push(`【执行结果】已成功添加标题「${newSection.title}」`);
          }
          
          if (meta.aiGuidance) {
            lines.push(`【AI指导】${meta.aiGuidance}`);
          }
          lines.push(`【特殊要求】${meta.specialRequirements || '无'}`);
          
        } else if (type === 'delete_outline_section') {
          // 删除标题
          if (meta.actionDescription) {
            lines.push(`【动作描述】${meta.actionDescription}`);
          }
          
          const targetSection = meta.targetSection;
          if (targetSection) {
            lines.push(`【目标标题】${targetSection.levelText || `${targetSection.level}级`}标题「${targetSection.title}」`);
            if (targetSection.summary) {
              const excerpt = targetSection.summary.length > 100 ? targetSection.summary.substring(0, 100) + '...' : targetSection.summary;
              lines.push(`  摘要：${excerpt}`);
            }
          }
          
          const removedSections = meta.removedSections || [];
          if (removedSections.length > 0) {
            lines.push(`【删除详情】共删除 ${removedSections.length} 个标题：`);
            removedSections.slice(0, 8).forEach((sec, idx) => {
              lines.push(`  ${idx + 1}. [${sec.levelText || `${sec.level}级`}] ${sec.title}`);
            });
            if (removedSections.length > 8) {
              lines.push(`  ... 还有 ${removedSections.length - 8} 个标题`);
            }
          }
          
          // 执行结果
          const outputs = meta.outputs || {};
          if (outputs.executionResult) {
            lines.push(`【执行结果】${outputs.executionResult}`);
          } else if (outputs.summary) {
            lines.push(`【执行结果】${outputs.summary}`);
          } else {
            lines.push(`【执行结果】已成功删除 ${removedSections.length || 1} 个标题`);
          }
          
          if (meta.aiGuidance) {
            lines.push(`【AI指导】${meta.aiGuidance}`);
          }
          lines.push(`【特殊要求】${meta.specialRequirements || '无'}`);
          
        } else if (type === 'restore_history_outline') {
          // 恢复历史大纲
          lines.push(`【大纲名称】${meta.outlineTitle || meta.outlineId || '未记录'}`);
          if (meta.outlineId) {
            lines.push(`【大纲ID】${meta.outlineId}`);
          }
          const outputs = meta.outputs || {};
          if (outputs.executionResult) {
            lines.push(`【执行结果】${outputs.executionResult}`);
          } else if (outputs.summary) {
            lines.push(`【执行结果】${outputs.summary}`);
          } else {
            lines.push(`【执行结果】已应用历史大纲「${meta.outlineTitle || ''}」`);
          }
          lines.push(`【特殊要求】${meta.specialRequirements || '无'}`);
          
        } else if (type === 'dispatch' || type === 'execute_instruction') {
          // 执行指令
          const actionDesc = meta.actionDescription || '';
          if (actionDesc) {
            lines.push(`【动作描述】${actionDesc}`);
          }
          
          const promptContent = meta.promptContent || meta.instructions || meta.process || '';
          if (promptContent) {
            lines.push(`【指令内容】${promptContent}`);
          }
          
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
          
          const inputContent = meta.inputContent || meta.inputContentExcerpt || '';
          if (inputContent) {
            const excerpt = inputContent.length > 300 ? inputContent.substring(0, 300) + '...' : inputContent;
            lines.push(`【输入内容】${excerpt}`);
          }
          
          const targetSectionsDetail = meta.targetSectionsDetail || [];
          if (targetSectionsDetail.length > 0) {
            lines.push(`【目标位置】共 ${targetSectionsDetail.length} 个标题：`);
            targetSectionsDetail.forEach((t, idx) => {
              const levelText = t.levelText || `${t.level || 1}级`;
              lines.push(`  ${idx + 1}. ${levelText}标题「${t.title}」`);
              if (t.originalSummary) {
                const summaryExcerpt = t.originalSummary.length > 100 ? t.originalSummary.substring(0, 100) + '...' : t.originalSummary;
                lines.push(`     原内容：${summaryExcerpt}`);
              }
            });
          } else {
            const selectedTitles = meta.selectedSectionTitles || [];
            if (selectedTitles.length > 0) {
              lines.push(`【目标标题】${selectedTitles.join('、')}`);
            }
          }
          
          const outputTargetDesc = meta.outputTargetDesc || '';
          if (outputTargetDesc) {
            lines.push(`【输出目标】${outputTargetDesc}`);
          }
          
          const outputs = meta.outputs || {};
          const edits = outputs.edits || [];
          if (edits.length > 0) {
            lines.push(`【输出编辑】共 ${edits.length} 处修改：`);
            edits.forEach((edit, idx) => {
              const newVal = edit.newValueExcerpt || edit.newValue || '';
              const excerpt = newVal.length > 150 ? newVal.substring(0, 150) + '...' : newVal;
              lines.push(`  ${idx + 1}. 字段: ${edit.field || 'summary'}`);
              lines.push(`     新值: ${excerpt}`);
            });
          }
          if (outputs.outputContent) {
            const excerpt = outputs.outputContent.length > 300 ? outputs.outputContent.substring(0, 300) + '...' : outputs.outputContent;
            lines.push(`【输出内容】${excerpt}`);
          }
          // 执行结果 - 优先使用 executionResult
          if (outputs.executionResult) {
            lines.push(`【执行结果】${outputs.executionResult}`);
          } else if (outputs.summary) {
            lines.push(`【执行结果】${outputs.summary}`);
          } else {
            lines.push(`【执行结果】指令执行完成`);
          }
          
          const aiGuidance = meta.aiGuidance || '';
          if (aiGuidance) {
            lines.push(`【AI指导】${aiGuidance}`);
          }
          
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
          if (outputs.executionResult) {
            lines.push(`【执行结果】${outputs.executionResult}`);
          } else if (outputs.summary) {
            lines.push(`【执行结果】${outputs.summary}`);
          } else {
            lines.push(`【执行结果】操作已完成`);
          }
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

/**
 * 从完整脚本中提取某个步骤的内容
 * @param {string} fullScript - 完整脚本内容
 * @param {number} sectionIndex - 步骤索引（从0开始）
 * @returns {string} 该步骤的内容
 */
export const getScriptForSection = (fullScript, sectionIndex) => {
  if (!fullScript || sectionIndex < 0) return fullScript || '';
  
  // 方法1：使用 --- 分隔符分割（最新格式）
  const dashSeparatorSections = fullScript.split(/\n---\n/).map(s => s.trim()).filter(Boolean);
  if (dashSeparatorSections.length > 1 && sectionIndex < dashSeparatorSections.length) {
    return dashSeparatorSections[sectionIndex];
  }
  
  // 方法2：尝试匹配 [步骤N] 格式（AI 优化后），支持多行内容
  const aiFormatRegex = /(\[步骤\d+\][\s\S]*?)(?=\n\[步骤\d+\]|$)/g;
  const aiMatches = [...fullScript.matchAll(aiFormatRegex)];
  if (aiMatches.length > 0 && sectionIndex < aiMatches.length) {
    return aiMatches[sectionIndex][1].trim();
  }
  
  // 方法3：尝试匹配 === 步骤 N: 标题 === 格式（初始格式）
  const initialFormatRegex = /(===\s*步骤\s*\d+[：:][^=]*?===[\s\S]*?)(?====\s*步骤|===\s*Replay|===\s*脚本|---\n提示|$)/g;
  const initialMatches = [...fullScript.matchAll(initialFormatRegex)];
  if (initialMatches.length > 0 && sectionIndex < initialMatches.length) {
    return initialMatches[sectionIndex][1].trim();
  }
  
  // 如果无法解析，返回全部内容
  return fullScript;
};

/**
 * 更新完整脚本中某个步骤的内容
 * @param {string} fullScript - 完整脚本内容
 * @param {number} sectionIndex - 步骤索引（从0开始）
 * @param {string} newContent - 新的步骤内容
 * @returns {string} 更新后的完整脚本
 */
export const updateScriptForSection = (fullScript, sectionIndex, newContent) => {
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

/**
 * 从结构化脚本中提取指定字段的值
 * @param {string} script - 脚本内容
 * @param {string} fieldName - 字段名（如 "操作类型"、"来源文档" 等）
 * @returns {string} 字段值
 */
export const extractFromScript = (script, fieldName) => {
  if (!script) return '';
  const regex = new RegExp(`【${fieldName}】(.+?)(?=\\n|$)`);
  const match = script.match(regex);
  return match ? match[1].trim() : '';
};

/**
 * 解析结构化脚本中每个步骤的字段
 * 支持两种格式：[步骤N] 和 === 步骤 N: ===
 * @param {string} script - 脚本内容
 * @returns {Array} 解析后的步骤数组
 */
export const parseLLMStepsFromScript = (script) => {
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
      aiGuidance: parseField(stepContent, 'AI执行指导') || parseField(stepContent, 'AI指导') || parseField(stepContent, '执行指导'),
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
        aiGuidance: parseField(stepContent, 'AI执行指导') || parseField(stepContent, 'AI指导') || parseField(stepContent, '执行指导'),
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

/**
 * 直接从内容中解析【AI执行指导】字段
 * @param {string} content - 内容
 * @returns {string} AI 执行指导内容
 */
export const parseAiGuidanceDirectly = (content) => {
  if (!content) return '';
  const regex = /【AI执行指导】\s*([\s\S]*?)(?=【[^A]|【AI执行指导】|\[步骤|\n\n\n|---\n|===|$)/s;
  const match = content.match(regex);
  if (match) {
    return match[1].trim();
  }
  return '';
};

/**
 * 基于 llmScript 和 originalMeta 生成新的 Replay 元数据
 * @param {object} llmStep - LLM 步骤解析结果
 * @param {object} originalMeta - 原始元数据
 * @param {object} section - 段落对象
 * @returns {object} 新的 Replay 元数据
 */
export const generateReplayMeta = (llmStep, originalMeta, section) => {
  const baseMeta = originalMeta || {};
  
  return {
    ...baseMeta,
    type: llmStep?.type || baseMeta.type || section?.action,
    buttonAction: llmStep?.type || baseMeta.buttonAction || 'dispatch',
    intentDescription: llmStep?.description || baseMeta.intentDescription || section?.action,
    inputSourceDesc: llmStep?.inputSource || baseMeta.inputSourceDesc || '',
    outputTargetDesc: llmStep?.outputTarget || baseMeta.outputTargetDesc || '',
    targetTitle: llmStep?.targetTitle || baseMeta.targetTitle || '',
    contentDescription: llmStep?.contentDescription || baseMeta.contentDescription || '',
    contextBefore: llmStep?.contextBefore || baseMeta.contextBefore || '',
    contextAfter: llmStep?.contextAfter || baseMeta.contextAfter || '',
    aiGuidance: llmStep?.aiGuidance || baseMeta.aiGuidance || '',
    specialRequirements: llmStep?.specialRequirements || baseMeta.specialRequirements || '无',
    generatedByLLM: true,
    generatedAt: Date.now()
  };
};

/**
 * 从结构化脚本中提取某个步骤的完整格式化内容
 * @param {string} script - 脚本内容
 * @param {number} stepNum - 步骤编号
 * @returns {string|null} 步骤内容
 */
export const extractFullStepContent = (script, stepNum) => {
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
