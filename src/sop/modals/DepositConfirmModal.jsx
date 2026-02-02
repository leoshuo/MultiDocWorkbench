/**
 * DepositConfirmModal - 沉淀确认与优化弹窗
 * 从 SOPWorkbench.jsx 提取的独立组件
 */
import React, { useState, useMemo } from 'react';
import { StructuredRecordEditor } from '../components/StructuredRecordEditor';
import { extractReplayMeta, getScriptForSection, extractFullStepContent } from '../logic/depositOps';
import { parseRecordContent, serializeToContent } from '../components/StructuredRecordEditor';

/**
 * 沉淀确认弹窗组件
 * @param {Object} props
 * @param {Object} props.data - 沉淀确认数据
 * @param {Function} props.setData - 更新数据的函数
 * @param {number} props.selectedSectionIndex - 选中的章节索引
 * @param {Function} props.setSelectedSectionIndex - 设置选中章节索引
 * @param {Function} props.onCancel - 取消回调
 * @param {Function} props.onDiscard - 放弃录制回调
 * @param {Function} props.onConfirm - 确认保存回调
 * @param {Function} props.onAIProcess - AI优化处理回调
 * @param {Function} props.getScriptForSection - 获取章节脚本函数
 * @param {Function} props.updateScriptForSection - 更新章节脚本函数
 * @param {boolean} props.isEditMode - 是否为编辑模式（编辑现有沉淀）
 * @param {Function} props.onFlexUpload - 【新增】灵活上传回调，参数为 (sectionIndex, keywords)
 * @param {Function} props.api - 【新增】API 调用函数
 * @param {Function} props.showToast - 【新增】Toast 提示函数
 */
export const DepositConfirmModal = ({
  data,
  setData,
  selectedSectionIndex,
  setSelectedSectionIndex,
  onCancel,
  onDiscard,
  onConfirm,
  onAIProcess,
  getScriptForSection,
  updateScriptForSection,
  isEditMode = false,
  onFlexUpload = null,
  api = null,
  showToast = null,
}) => {
  // 脚本视图模式：'llm' 显示大模型记录内容（默认），'script' 显示结构化脚本
  const [scriptViewMode, setScriptViewMode] = useState('llm');
  const [llmEditorViewMode, setLlmEditorViewMode] = useState(null);
  // 【新增】灵活上传加载状态
  const [flexUploadLoading, setFlexUploadLoading] = useState(false);
  
  if (!data) return null;

  const isLlmMode = data.precipitationMode === 'llm';
  
  // 【新增】获取当前选中 section 的类型
  const currentSection = selectedSectionIndex >= 0 && data.sections?.[selectedSectionIndex];
  const currentSectionMeta = currentSection ? extractReplayMeta(currentSection.content || '') : null;
  const currentSectionType = currentSectionMeta?.type || currentSection?.llmScript?.type || '';
  // 【改进】多种方式判断是否为上传文档类型
  const sectionAction = currentSection?.action || '';
  const isAddDocSection = currentSectionType === 'add_doc' || 
    sectionAction.includes('上传') || 
    sectionAction.includes('add_doc') ||
    currentSection?.llmScript?.docSelector != null ||
    currentSectionMeta?.source === 'upload';
  
  // 【新增】灵活上传处理函数
  // @param {string} keywords - 匹配关键词
  // @param {Function} onComplete - 完成后的回调，参数为 (matchResult)
  const handleFlexUpload = async (keywords, onComplete) => {
    if (!keywords?.trim() || !api) return;
    
    try {
      setFlexUploadLoading(true);
      
      // 获取当前文档名称作为示例
      const exampleName = currentSectionMeta?.docName || '';
      
      // 调用 API 生成文件选择器
      const res = await api('/api/replay/file-selector', {
        method: 'POST',
        body: { description: keywords.trim(), exampleName }
      });
      
      const selector = res?.selector;
      if (!selector || typeof selector !== 'object') {
        showToast?.('生成文件匹配规则失败');
        return;
      }
      
      // 生成匹配结果描述
      const selectorHint = selector.kind === 'regex'
        ? `regex=${(selector.pattern || '').toString()}`
        : `keywords=${Array.isArray(selector.keywords) ? selector.keywords.join(',') : ''}${selector.extension ? ` ext=${selector.extension}` : ''}`;
      
      // 更新当前 section 的 llmScript、meta 和 content（原始文本）
      setData(prev => {
        if (!prev.sections || selectedSectionIndex < 0) return prev;
        
        const updatedSections = [...prev.sections];
        const section = updatedSections[selectedSectionIndex];
        if (!section) return prev;
        
        // 【新增】构建要追加到原始文本的匹配信息
        const flexMatchInfo = [
          `【灵活名称上传】${keywords.trim()}`,
          `【灵活匹配关键词】${selectorHint}`
        ].join('\n');
        
        // 【新增】更新 content 原始文本，追加匹配信息
        let updatedContent = section.content || '';
        // 移除旧的灵活匹配信息（如果有）
        updatedContent = updatedContent
          .replace(/【灵活名称上传】[^\n]*/g, '')
          .replace(/【灵活匹配关键词】[^\n]*/g, '')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        // 追加新的匹配信息
        updatedContent = updatedContent + '\n\n' + flexMatchInfo;
        
        // 更新 section 的 llmScript、meta 和 content
        updatedSections[selectedSectionIndex] = {
          ...section,
          content: updatedContent,
          llmScript: {
            ...(section.llmScript || {}),
            docSelector: selector,
            flexKeywords: keywords.trim(),
            flexMatchResult: selectorHint,
            actionDescription: `灵活上传文档：${keywords.trim()}`,
            description: keywords.trim()
          },
          meta: {
            ...(section.meta || {}),
            docSelector: selector,
            flexKeywords: keywords.trim(),
            flexMatchResult: selectorHint
          }
        };
        
        return {
          ...prev,
          sections: updatedSections
        };
      });
      
      showToast?.(res?.usedModel === false ? '匹配规则生成成功（未使用大模型）' : '匹配规则生成成功');
      
      // 调用完成回调，让 StructuredRecordEditor 更新字段
      if (onComplete) {
        onComplete(selectorHint);
      }
      
      // 如果外部提供了回调，也调用它
      if (onFlexUpload) {
        onFlexUpload(selectedSectionIndex, keywords.trim(), selector);
      }
      
    } catch (err) {
      console.error('[灵活上传] 失败:', err);
      showToast?.(err?.message || '灵活上传失败');
    } finally {
      setFlexUploadLoading(false);
    }
  };

  // 重新解构：将原始文本重新解析为结构化内容并同步到列表
  const handleRebuildStructured = () => {
    const rawContent = (data?.llmRecordContent || llmRecordContent || '').toString();
    if (!rawContent.trim()) {
      showToast?.('没有可解构的内容');
      return;
    }

    const parsed = parseRecordContent(rawContent);
    const sections = Array.isArray(data?.sections) ? data.sections : [];

    const rebuiltSteps = sections.length > 0
      ? sections.map((section, idx) => {
          const parsedStep = parsed[idx] || {};
          return {
            title: section?.action || parsedStep.title || `步骤 ${idx + 1}`,
            fields: parsedStep.fields || {}
          };
        })
      : parsed;

    const normalizedContent = serializeToContent(rebuiltSteps);

    setData(prev => {
      const nextSections = Array.isArray(prev?.sections) ? [...prev.sections] : [];
      if (nextSections.length > 0) {
        nextSections.forEach((section, idx) => {
          const stepContent = extractFullStepContent(normalizedContent, idx + 1);
          if (stepContent) {
            nextSections[idx] = {
              ...section,
              llmScript: {
                ...(section.llmScript || {}),
                structuredScriptContent: stepContent
              }
            };
          }
        });
      }

      return {
        ...prev,
        llmRecordContent: normalizedContent,
        sections: nextSections
      };
    });

    setLlmEditorViewMode('structured');
    showToast?.('已重新解构为结构化内容');
  };
  
  // 生成大模型记录内容（从 sections 中提取 llmScript 信息 + 结构化脚本内容）
  const llmRecordContent = useMemo(() => {
    if (!data.sections || data.sections.length === 0) return '暂无大模型记录';
    
    // 辅助函数：生成单个步骤的完整大模型记录
    const generateStepRecord = (section, idx) => {
      const llm = section.llmScript || {};
      const originalScript = section.originalScript || {};
      // 【关键修复】从 content 中解析 meta 数据，并与 section.meta 合并（parsedMeta 优先）
      const parsedMeta = extractReplayMeta(section.content) || {};
      // 合并 meta，确保 parsedMeta 中的字段不被空的 section.meta 覆盖
      const sectionMeta = section.meta || {};
      const meta = { ...sectionMeta, ...parsedMeta };
      
      // 【关键调试】打印原始 content 中的 __REPLAY_META__ 部分
      const contentStr = section.content || '';
      const replayMetaIdx = contentStr.indexOf('__REPLAY_META__');
      if (replayMetaIdx !== -1) {
        const jsonPart = contentStr.slice(replayMetaIdx + '__REPLAY_META__'.length).trim();
        console.log('[generateStepRecord] 原始 JSON 解析:', {
          jsonLength: jsonPart.length,
          jsonFirst200: jsonPart.substring(0, 200),
          hasOutputsInJson: jsonPart.includes('"outputs"'),
          hasExecutionResultInJson: jsonPart.includes('"executionResult"')
        });
      } else {
        console.log('[generateStepRecord] 警告: section.content 中没有 __REPLAY_META__ 标记!');
      }
      
      // 【调试】打印完整的 section 数据
      console.log('[generateStepRecord] section 数据:', {
        idx,
        action: section.action,
        hasContent: !!section.content,
        contentLength: (section.content || '').length,
        hasReplayMeta: section.content?.includes('__REPLAY_META__'),
        parsedMetaKeys: Object.keys(parsedMeta),
        metaType: meta.type,
        metaInputs: meta.inputs,
        metaDestinations: meta.destinations,
        metaOutputs: meta.outputs,
        // 【关键调试】检查 executionResult 是否存在
        'parsedMeta.outputs': parsedMeta.outputs,
        'parsedMeta.outputs?.executionResult': parsedMeta.outputs?.executionResult,
        'meta.outputs?.executionResult': meta.outputs?.executionResult,
        'meta.targetSummaries': meta.targetSummaries,
        'meta.selectedSectionTitles': meta.selectedSectionTitles
      });
      
      const lines = [];
      
      lines.push(`=== 步骤 ${idx + 1}: ${section.action || section.generalizedTitle || '操作'} ===`);
      
      // ========== 核心字段（大模型记录） ==========
      if (llm.type || meta.type) lines.push(`【操作类型】${llm.type || meta.type}`);
      if (llm.description || meta.actionDescription || meta.intentDescription) {
        lines.push(`【描述】${llm.description || meta.actionDescription || meta.intentDescription}`);
      }
      if (llm.docName || meta.docName) lines.push(`【文档名称】${llm.docName || meta.docName}`);
      if (llm.docSelector) lines.push(`【文档选择器】${JSON.stringify(llm.docSelector)}`);
      
      // ========== 目标标题信息 ==========
      if (llm.targetSectionTitle || meta.targetSectionTitle) {
        lines.push(`【目标标题】${llm.targetSectionTitle || meta.targetSectionTitle}`);
      }
      // 多标题选择
      const selectedTitles = llm.selectedSectionTitles || meta.selectedSectionTitles || [];
      if (selectedTitles.length > 0) {
        lines.push(`【目标标题】${selectedTitles.join('、')}`);
      }
      if (llm.targetSectionId || meta.sectionId || meta.targetSectionId) {
        lines.push(`【目标标题ID】${llm.targetSectionId || meta.sectionId || meta.targetSectionId}`);
      }
      
      // ========== 指令与指导 ==========
      if (llm.instructions || meta.instructions) lines.push(`【指令】${llm.instructions || meta.instructions}`);
      if (llm.promptContent || meta.promptContent) lines.push(`【Prompt内容】${llm.promptContent || meta.promptContent}`);
      // 【关键】统一使用【AI执行指导】字段，保证 replay 可正确解析并执行计算逻辑
      if (llm.aiGuidance || meta.aiGuidance) lines.push(`【AI执行指导】${llm.aiGuidance || meta.aiGuidance}`);
      
      // 【新增】输出格式和计算公式 - 单独显示，确保在列表中可见
      // 从 llmScript、meta、以及 section.content 中提取
      const outputFormat = llm.outputFormat || meta.outputFormat || '';
      const calculationFormula = llm.calculationFormula || meta.calculationFormula || '';
      
      // 如果没有在 llm/meta 中找到，尝试从 content 中提取
      const contentText = (section.content || '').split('__REPLAY_META__')[0].trim();
      let extractedOutputFormat = outputFormat;
      let extractedCalculationFormula = calculationFormula;
      
      if (!extractedOutputFormat && contentText) {
        const outputMatch = contentText.match(/【输出格式】\s*([\s\S]*?)(?=【[^输]|\n\n\n|===|$)/);
        if (outputMatch) extractedOutputFormat = outputMatch[1].trim();
      }
      if (!extractedCalculationFormula && contentText) {
        const calcMatch = contentText.match(/【计算公式】\s*([\s\S]*?)(?=【[^计]|\n\n\n|===|$)/);
        if (calcMatch) extractedCalculationFormula = calcMatch[1].trim();
      }
      
      // 显示输出格式和计算公式
      if (extractedOutputFormat) lines.push(`【输出格式】${extractedOutputFormat}`);
      if (extractedCalculationFormula) lines.push(`【计算公式】${extractedCalculationFormula}`);
      
      if (llm.specialRequirements || meta.specialRequirements) lines.push(`【特殊要求】${llm.specialRequirements || meta.specialRequirements}`);
      
      // ========== 输入来源信息（关键：从 inputs 数组提取详细信息）==========
      // 【关键修复】优先使用 llm.inputs，它从原始 meta 继承了完整的 inputs 数据（包含 originalText）
      // 数据来源优先级：llm.inputs > section.meta.inputs > parsedMeta.inputs
      const llmInputs = llm.inputs || [];
      const sectionMetaInputs = section?.meta?.inputs || [];
      const inputs = llmInputs.length > 0 ? llmInputs : (sectionMetaInputs.length > 0 ? sectionMetaInputs : (meta.inputs || []));
      
      if (inputs.length > 0) {
        const inputLines = inputs.map((inp, i) => {
          const parts = [];
          if (inp.kind) parts.push(`类型: ${inp.kind}`);
          if (inp.docName) parts.push(`文档: ${inp.docName}`);
          if (inp.contextSummary) parts.push(`来源: ${inp.contextSummary}`);
          if (inp.textLength) parts.push(`字数: ${inp.textLength}`);
          return parts.length > 0 ? `  [${i + 1}] ${parts.join(', ')}` : null;
        }).filter(Boolean);
        if (inputLines.length > 0) {
          lines.push(`【输入来源】\n${inputLines.join('\n')}`);
        }
        
        // 提取选中文本的内容特征
        const selectionInput = inputs.find(inp => inp.kind === 'selection');
        if (selectionInput) {
          // 【关键】原文字段 - 优先显示，使用 originalText（包含加粗标记等格式）
          // 确保录制时的原始选中内容不丢失
          const fullOriginalText = selectionInput.originalText || selectionInput.text || '';
          if (fullOriginalText) {
            lines.push(`【原文】${fullOriginalText}`);
          }
          if (selectionInput.textHead) lines.push(`【内容开头】${selectionInput.textHead}`);
          if (selectionInput.textTail) lines.push(`【内容结尾】${selectionInput.textTail}`);
          if (selectionInput.contextBefore) lines.push(`【前文上下文】${selectionInput.contextBefore}`);
          if (selectionInput.contextAfter) lines.push(`【后文上下文】${selectionInput.contextAfter}`);
          if (selectionInput.contentFeatures) {
            const features = selectionInput.contentFeatures;
            const featureParts = [];
            if (features.charCount) featureParts.push(`${features.charCount}字`);
            if (features.lineCount) featureParts.push(`${features.lineCount}行`);
            if (features.hasNumbers) featureParts.push(`含数字`);
            if (features.hasDates) featureParts.push(`含日期`);
            // 【新增】加粗信息
            if (features.hasBold) {
              featureParts.push(`含加粗(${features.boldCount || 0}处)`);
            }
            if (featureParts.length > 0) {
              lines.push(`【内容特征】${featureParts.join('、')}`);
            }
            // 单独显示加粗文本
            if (features.hasBold && Array.isArray(features.boldTexts) && features.boldTexts.length > 0) {
              const boldPreview = features.boldTexts.slice(0, 5).map(t => `「${t}」`).join('、');
              lines.push(`【加粗内容】${boldPreview}${features.boldTexts.length > 5 ? `...共${features.boldTexts.length}处` : ''}`);
            }
          }
          // 如果有原始文本（包含加粗标记），显示原始文本片段
          if (selectionInput.originalText && /\*\*[^*\n]+\*\*/.test(selectionInput.originalText)) {
            const originalPreview = selectionInput.originalText.length > 300 
              ? selectionInput.originalText.substring(0, 300) + '...' 
              : selectionInput.originalText;
            lines.push(`【原始选中（含标记）】${originalPreview}`);
          }
        }
      } else {
        // 回退：从其他字段提取
        if (llm.inputSourceDesc || meta.inputSourceDesc) lines.push(`【输入来源】${llm.inputSourceDesc || meta.inputSourceDesc}`);
        if (llm.contextSummary) lines.push(`【上下文摘要】${llm.contextSummary}`);
        
        // 【新增】从 section.content 原始文本中提取字段
        const contentText = (section.content || '').split('__REPLAY_META__')[0].trim();
        if (contentText) {
          // 尝试提取【选中内容】
          const selectedContentMatch = contentText.match(/【选中内容】([^【]*)/);
          if (selectedContentMatch && selectedContentMatch[1]) {
            lines.push(`【具体内容】${selectedContentMatch[1].trim()}`);
          }
          // 尝试提取【原文】- 完整原文信息
          const originalTextMatch = contentText.match(/【原文】([^【]*)/);
          if (originalTextMatch && originalTextMatch[1]) {
            lines.push(`【原文】${originalTextMatch[1].trim()}`);
          }
          // 尝试提取【内容描述】
          const contentDescMatch = contentText.match(/【内容描述】([^【]*)/);
          if (contentDescMatch && contentDescMatch[1]) {
            lines.push(`【内容特征】${contentDescMatch[1].trim()}`);
          }
        }
      }
      // 【修复】灵活上传相关字段
      if (llm.flexKeywords) lines.push(`【灵活名称上传】${llm.flexKeywords}`);
      if (llm.flexMatchResult) lines.push(`【灵活匹配关键词】${llm.flexMatchResult}`);
      
      // ========== 内容特征（回退：从顶层字段提取） ==========
      if (!inputs.find(inp => inp.kind === 'selection')) {
        if (llm.contentStart || meta.contentStart) lines.push(`【内容开头】${llm.contentStart || meta.contentStart}`);
        if (llm.contentEnd || meta.contentEnd) lines.push(`【内容结尾】${llm.contentEnd || meta.contentEnd}`);
        if (llm.contextBefore || meta.contextBefore) lines.push(`【前文上下文】${llm.contextBefore || meta.contextBefore}`);
        if (llm.contextAfter || meta.contextAfter) lines.push(`【后文上下文】${llm.contextAfter || meta.contextAfter}`);
      }
      
      // ========== 目标位置信息（关键：从 destinations 数组提取）==========
      // 辅助函数：将摘要索引转换为友好的位置描述
      const getSummaryPositionLabel = (summaryIndex) => {
        if (summaryIndex === undefined || summaryIndex === null) return '标题摘要';
        const idx = parseInt(summaryIndex, 10);
        if (idx === 0) return '第1个摘要';
        if (idx === 1) return '第2个摘要';
        if (idx === 2) return '第3个摘要';
        return `第${idx + 1}个摘要`;
      };
      
      const getLevelLabel = (level) => {
        if (level === 1) return '一级标题';
        if (level === 2) return '二级标题';
        if (level === 3) return '三级标题';
        return `${level}级标题`;
      };
      
      const destinations = llm.destinations || meta.destinations || [];
      const targetSummaries = llm.targetSummaries || meta.targetSummaries || [];
      const opType = llm.type || meta.type || '';
      
      // 【调试】打印目标位置信息
      console.log('[generateStepRecord] 目标位置信息:', {
        'destinations': destinations,
        'targetSummaries': targetSummaries,
        'opType': opType,
        'destinations[0]?.summaryIndex': destinations[0]?.summaryIndex,
        'targetSummaries[0]?.summaryIndex': targetSummaries[0]?.summaryIndex
      });
      
      // 【修复】合并 destinations 和 targetSummaries 的 summaryIndex 信息
      // 优先使用 targetSummaries（包含更完整的 summaryIndex 信息）
      const mergedTargets = destinations.length > 0 ? destinations.map((dest, i) => {
        // 如果 dest 没有 summaryIndex，尝试从 targetSummaries 中查找
        if (dest.summaryIndex === undefined || dest.summaryIndex === null) {
          const matchingTarget = targetSummaries.find(t => t.sectionId === dest.sectionId);
          if (matchingTarget) {
            return { ...dest, summaryIndex: matchingTarget.summaryIndex };
          }
        }
        return dest;
      }) : targetSummaries;
      
      // 【修复】针对不同操作类型显示不同的目标位置
      if (opType === 'add_doc' || opType === 'upload_doc' || opType === 'delete_doc') {
        // 上传/删除文档的目标位置是文档列表
        lines.push(`【目标位置】文档列表`);
      } else if (mergedTargets.length > 0) {
        // 其他操作类型：显示详细的目标位置
        const destLines = mergedTargets.map((dest, i) => {
          // 如果目标是 docs_list，显示"文档列表"
          if (dest.kind === 'docs_list') {
            return `  [${i + 1}] 文档列表`;
          }
          
          const levelLabel = dest.sectionLevel ? getLevelLabel(dest.sectionLevel) : '';
          const positionLabel = getSummaryPositionLabel(dest.summaryIndex);
          const titlePart = dest.sectionTitle ? `「${dest.sectionTitle}」` : '';
          const overwriteNote = dest.hadContentBefore ? '（覆盖原有内容）' : '';
          
          // 格式：一级标题「XXX」的第1个摘要（覆盖原有内容）
          return `  [${i + 1}] ${levelLabel}${titlePart}的${positionLabel}${overwriteNote}`;
        }).filter(Boolean);
        if (destLines.length > 0) {
          lines.push(`【目标位置】\n${destLines.join('\n')}`);
        }
      }
      
      // ========== 执行结果 ==========
      // 【关键】优先从 parsedMeta.outputs 获取，确保能获取到录制时保存的执行结果
      const outputs = parsedMeta.outputs || meta.outputs || llm.outputs || {};
      
      // 【调试】打印完整数据结构
      console.log('[generateStepRecord] 执行结果数据:', {
        'parsedMeta.outputs': parsedMeta.outputs,
        'meta.outputs': meta.outputs,
        'llm.outputs': llm.outputs,
        'outputs': outputs,
        'outputs.executionResult': outputs.executionResult,
        'meta.type': meta.type,
        'destinations': destinations,
        'targetSummaries': targetSummaries,
        'meta.selectedSectionTitles': meta.selectedSectionTitles,
        'meta.targetSectionsDetail': meta.targetSectionsDetail
      });
      
      // 【关键】详细的执行结果描述
      let hasExecutionResult = false;
      
      if (outputs.executionResult) {
        lines.push(`【执行结果】${outputs.executionResult}`);
        hasExecutionResult = true;
      } else if (llm.result || meta.result) {
        lines.push(`【执行结果】${llm.result || meta.result}`);
        hasExecutionResult = true;
      } else if (mergedTargets.length > 0) {
        // 根据目标位置自动生成执行结果
        const resultDesc = mergedTargets.map(dest => {
          const levelLabel = dest.sectionLevel ? getLevelLabel(dest.sectionLevel) : '';
          const positionLabel = getSummaryPositionLabel(dest.summaryIndex);
          const titlePart = dest.sectionTitle ? `「${dest.sectionTitle}」` : '';
          return `成功写入${levelLabel}${titlePart}的${positionLabel}`;
        }).join('；');
        if (resultDesc) {
          lines.push(`【执行结果】${resultDesc}`);
          hasExecutionResult = true;
        }
      }
      
      // 【新增】从其他字段推断执行结果
      if (!hasExecutionResult) {
        // 尝试从 selectedSectionTitles 或 targetSectionsDetail 生成
        const sectionTitles = meta.selectedSectionTitles || [];
        const sectionsDetail = meta.targetSectionsDetail || [];
        
        if (sectionsDetail.length > 0) {
          const resultDesc = sectionsDetail.map(s => {
            const levelLabel = s.level ? getLevelLabel(s.level) : '';
            const titlePart = s.title ? `「${s.title}」` : '';
            return `成功写入${levelLabel}${titlePart}的摘要`;
          }).join('；');
          if (resultDesc) {
            lines.push(`【执行结果】${resultDesc}`);
            hasExecutionResult = true;
          }
        } else if (sectionTitles.length > 0) {
          const resultDesc = sectionTitles.map(title => `成功写入「${title}」的摘要`).join('；');
          lines.push(`【执行结果】${resultDesc}`);
          hasExecutionResult = true;
        }
      }
      
      // 【最终回退】根据操作类型生成默认执行结果
      if (!hasExecutionResult) {
        // 尝试从 section.content 原始文本中提取目标标题
        const contentText = (section.content || '').split('__REPLAY_META__')[0].trim();
        const targetTitleMatch = contentText.match(/【目标标题】([^【\n]*)/);
        const targetTitle = targetTitleMatch ? targetTitleMatch[1].trim() : '';
        
        const actionType = meta.type || '';
        const actionName = section.action || '';
        
        if (actionType === 'insert_to_summary' || actionType === 'insert_to_summary_multi' || actionName.includes('填入摘要')) {
          if (targetTitle) {
            lines.push(`【执行结果】已成功在「${targetTitle}」下填入摘要`);
          } else {
            lines.push(`【执行结果】已成功执行填入摘要操作`);
          }
          hasExecutionResult = true;
        } else if (actionType === 'add_doc' || actionName.includes('添加文档') || actionName.includes('上传')) {
          lines.push(`【执行结果】已成功添加文档「${meta.docName || ''}」`);
          hasExecutionResult = true;
        } else if (actionType === 'dispatch' || actionName.includes('调度')) {
          lines.push(`【执行结果】已成功执行调度操作`);
          hasExecutionResult = true;
        } else if (actionType) {
          lines.push(`【执行结果】操作执行完成（${actionType}）`);
          hasExecutionResult = true;
        } else if (actionName) {
          // 【新增】从 section.action 推断执行结果
          lines.push(`【执行结果】已成功执行「${actionName}」操作`);
          hasExecutionResult = true;
        }
      }
      
      // 【兜底】确保总是有执行结果
      if (!hasExecutionResult) {
        lines.push(`【执行结果】操作已完成`);
      }
      
      // 【修复】对于 add_doc 类型，不再重复显示输出摘要（已有执行结果字段）
      if (outputs.summary && opType !== 'add_doc' && opType !== 'upload_doc') {
        lines.push(`【输出摘要】${outputs.summary}`);
      }
      if (outputs.writtenContent) {
        const contentPreview = outputs.writtenContent.length > 200 
          ? outputs.writtenContent.substring(0, 200) + '...' 
          : outputs.writtenContent;
        lines.push(`【写入内容】${contentPreview}`);
      }
      if (outputs.status) lines.push(`【执行状态】${outputs.status || 'done'}`);
      
      // ========== 完整脚本记录（保留该 section 的所有脚本信息） ==========
      // 【修复】优先使用结构化脚本中该步骤的内容，然后是其他来源
      // 从 data.structuredScript 中提取该步骤的内容（如果有）
      const structuredStepContent = data.structuredScript 
        ? getScriptForSection(data.structuredScript, idx) 
        : '';
      
      // 选择最佳内容来源：结构化脚本 > section.content > originalScript > llmScript
      const fullScriptContent = structuredStepContent || section.content || originalScript.content || llm.rawContent || llm.structuredScriptContent;
      
      if (fullScriptContent) {
        // 清理 __REPLAY_META__ 标记前的文本内容
        const textPart = fullScriptContent.split('__REPLAY_META__')[0].trim();
        // 提取 __REPLAY_META__ 后的 JSON 数据（格式化显示）
        const metaIdx = fullScriptContent.indexOf('__REPLAY_META__');
        let metaPart = '';
        if (metaIdx !== -1) {
          try {
            const jsonStr = fullScriptContent.slice(metaIdx + '__REPLAY_META__'.length).trim();
            const metaObj = JSON.parse(jsonStr);
            metaPart = JSON.stringify(metaObj, null, 2);
          } catch (e) {
            metaPart = fullScriptContent.slice(metaIdx + '__REPLAY_META__'.length).trim();
          }
        }
        // 组合完整脚本记录
        const fullRecord = textPart + (metaPart ? `\n\n__REPLAY_META__\n${metaPart}` : '');
        if (fullRecord.trim()) {
          lines.push(`\n【完整脚本记录】\n${fullRecord}`);
        }
      }
      
      // ========== 原始 Meta 数据（JSON格式，用于调试/完整性） ==========
      const hasMeaningfulMeta = meta && Object.keys(meta).filter(k => 
        meta[k] !== null && meta[k] !== undefined && meta[k] !== ''
      ).length > 0;
      
      if (hasMeaningfulMeta) {
        // 只保留关键字段，避免内容过长
        const compactMeta = {};
        ['type', 'buttonAction', 'docName', 'sectionId', 'targetSectionTitle', 'buttonId', 'overwritten', 'source'].forEach(key => {
          if (meta[key] !== null && meta[key] !== undefined && meta[key] !== '') {
            compactMeta[key] = meta[key];
          }
        });
        if (Object.keys(compactMeta).length > 0) {
          lines.push(`\n【原始回放参数】${JSON.stringify(compactMeta)}`);
        }
      }
      
      return lines.length > 1 ? lines.join('\n') : `=== 步骤 ${idx + 1}: ${section.action || '操作'} ===\n（暂无大模型记录）`;
    };
    
    // 如果选中了某个步骤，只显示该步骤的大模型记录
    if (selectedSectionIndex >= 0) {
      const section = data.sections[selectedSectionIndex];
      if (!section) return '该步骤暂无大模型记录';
      return generateStepRecord(section, selectedSectionIndex);
    }
    
    // 显示所有步骤的大模型记录
    return data.sections.map((section, idx) => generateStepRecord(section, idx)).join('\n\n---\n\n');
  }, [data.sections, selectedSectionIndex, data.structuredScript]);

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div 
        className="modal-card" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          width: '900px', 
          maxWidth: '95vw', 
          maxHeight: '90vh', 
          display: 'flex', 
          flexDirection: 'column' 
        }}
      >
        {/* 头部 */}
        <div className="modal-head">
          <h3>{isEditMode ? '✏️ 编辑沉淀' : '📝 沉淀确认与优化'}</h3>
          <button className="ghost xsmall" type="button" onClick={onCancel}>✕</button>
        </div>
        
        {/* 主体 */}
        <div className="modal-body" style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          {/* 第一行：沉淀名称 + 沉淀模式 */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#374151' }}>
                沉淀名称
              </label>
              <input
                type="text"
                value={data.depositName || ''}
                onChange={(e) => setData(prev => ({ ...prev, depositName: e.target.value }))}
                placeholder="请输入沉淀名称"
                style={{ 
                  width: '100%', 
                  padding: '8px 12px', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '6px', 
                  fontSize: '14px' 
                }}
              />
            </div>
            <div style={{ width: '200px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#374151' }}>
                沉淀模式
              </label>
              <select
                value={data.precipitationMode || 'llm'}
                onChange={(e) => {
                  const newMode = e.target.value;
                  // 同时更新所有 section 的 sectionReplayMode
                  const updatedSections = (data.sections || []).map(s => ({
                    ...s,
                    sectionReplayMode: newMode
                  }));
                  setData(prev => ({ 
                    ...prev, 
                    precipitationMode: newMode,
                    sections: updatedSections
                  }));
                }}
                style={{ 
                  width: '100%', 
                  padding: '8px 12px', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '6px', 
                  fontSize: '14px', 
                  background: '#fff' 
                }}
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
            background: isLlmMode ? '#eff6ff' : '#fef3c7',
            border: `1px solid ${isLlmMode ? '#bfdbfe' : '#fcd34d'}`,
            borderRadius: '6px',
            fontSize: '13px'
          }}>
            {isLlmMode ? (
              <><b>🤖 大模型Replay</b>：Replay 时 AI 会理解沉淀内容，结合当前上下文智能执行，适应性强。如无法执行会告知原因后尝试脚本Replay</>
            ) : (
              <><b>📜 脚本Replay</b>：Replay 时严格按照录制的脚本执行，要求字段完全匹配</>
            )}
          </div>

          {/* 录制的步骤摘要 */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#374151' }}>
              录制的操作（共 {data.sections?.length || 0} 步）
              <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: '8px' }}>点击查看对应脚本</span>
            </label>
            <div style={{ 
              background: '#f9fafb', 
              border: '1px solid #e5e7eb', 
              borderRadius: '6px', 
              padding: '8px', 
              maxHeight: '120px', 
              overflow: 'auto' 
            }}>
              {/* 全部显示选项 */}
              <div 
                onClick={() => setSelectedSectionIndex(-1)}
                style={{ 
                  padding: '6px 10px', 
                  marginBottom: '4px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  background: selectedSectionIndex === -1 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                    : 'transparent',
                  color: selectedSectionIndex === -1 ? '#fff' : '#6b7280',
                  fontWeight: selectedSectionIndex === -1 ? 500 : 400,
                  transition: 'all 0.2s'
                }}
              >
                📋 全部步骤
              </div>
              {/* 各个 section */}
              {data.sections?.map((s, i) => {
                // 获取该 section 的 replay 模式，优先使用 section 级别设置
                const sectionMode = s.sectionReplayMode || data.precipitationMode || 'llm';
                const isSectionLlm = sectionMode === 'llm';
                
                return (
                  <div 
                    key={i} 
                    style={{ 
                      padding: '6px 10px', 
                      borderRadius: '4px',
                      background: selectedSectionIndex === i 
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                        : 'transparent',
                      color: selectedSectionIndex === i ? '#fff' : '#111827',
                      fontWeight: selectedSectionIndex === i ? 500 : 400,
                      transition: 'all 0.2s',
                      marginBottom: i < data.sections.length - 1 ? '2px' : '0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}
                  >
                    <span 
                      onClick={() => setSelectedSectionIndex(i)}
                      style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      <span style={{ marginRight: '8px', opacity: 0.7 }}>{i + 1}.</span>
                      <span>{s.action || s.generalizedTitle || '操作'}</span>
                    </span>
                    {/* 每个 section 的 replay 模式下拉框 */}
                    <select
                      value={sectionMode}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        const newSectionMode = e.target.value;
                        const updatedSections = [...(data.sections || [])];
                        updatedSections[i] = { ...updatedSections[i], sectionReplayMode: newSectionMode };
                        setData(prev => ({ ...prev, sections: updatedSections }));
                      }}
                      style={{
                        padding: '2px 6px',
                        fontSize: '10px',
                        borderRadius: '3px',
                        border: `1px solid ${isSectionLlm ? '#93c5fd' : '#fcd34d'}`,
                        background: selectedSectionIndex === i 
                          ? 'rgba(255,255,255,0.9)' 
                          : (isSectionLlm ? '#eff6ff' : '#fffbeb'),
                        color: isSectionLlm ? '#1d4ed8' : '#b45309',
                        cursor: 'pointer',
                        minWidth: '80px'
                      }}
                      title={isSectionLlm ? '大模型Replay：AI 智能执行' : '脚本Replay：严格匹配执行'}
                    >
                      <option value="llm">🤖 大模型</option>
                      <option value="script">📜 脚本</option>
                    </select>
                    {/* 【修改】每个操作的校验模式开关 */}
                    {(() => {
                      const sectionValidation = s.sectionValidationMode || 'none'; // 默认不校验
                      const isValidationEnabled = sectionValidation === 'strict';
                      return (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            // 切换校验模式
                            const newMode = isValidationEnabled ? 'none' : 'strict';
                            const updatedSections = [...(data.sections || [])];
                            updatedSections[i] = { ...updatedSections[i], sectionValidationMode: newMode };
                            setData(prev => ({ ...prev, sections: updatedSections }));
                          }}
                          style={{ 
                            fontSize: '10px', 
                            padding: '2px 6px', 
                            borderRadius: '3px',
                            border: `1px solid ${isValidationEnabled ? '#f59e0b' : '#10b981'}`,
                            background: selectedSectionIndex === i 
                              ? 'rgba(255,255,255,0.9)' 
                              : (isValidationEnabled ? '#fef3c7' : '#f0fdf4'),
                            color: isValidationEnabled ? '#b45309' : '#059669',
                            cursor: 'pointer',
                            fontWeight: 500
                          }}
                          title={isValidationEnabled 
                            ? '点击切换为不校验：努力找到目标位置执行' 
                            : '点击切换为校验：必须满足所有字段校验才执行，否则 skip'}
                        >
                          {isValidationEnabled ? '🔒校验' : '🔓不校验'}
                        </button>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 脚本内容区域 - 支持切换结构化脚本/大模型记录 */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              {/* 左侧：视图模式下拉框 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <select
                  value={scriptViewMode}
                  onChange={(e) => setScriptViewMode(e.target.value)}
                  style={{ 
                    padding: '4px 12px', 
                    border: '1px solid #d1d5db',
                    borderRadius: '4px', 
                    fontSize: '14px', 
                    fontWeight: 500,
                    background: scriptViewMode === 'llm' ? '#eff6ff' : '#f0fdf4',
                    color: '#374151',
                    cursor: 'pointer'
                  }}
                >
                  <option value="script">📜 结构化脚本内容</option>
                  <option value="llm">🤖 大模型记录内容</option>
                </select>
                <span style={{ fontWeight: 400, color: '#6b7280', fontSize: '13px' }}>
                  {selectedSectionIndex >= 0 
                    ? `（当前显示：步骤 ${selectedSectionIndex + 1}）`
                    : (scriptViewMode === 'llm'
                        ? '（只读，查看各步骤的大模型记录）'
                        : (isLlmMode 
                            ? '（可编辑，AI 优化结果将显示在此）' 
                            : '（可编辑，Replay 时将严格执行此脚本）')
                      )
                  }
                </span>
              </div>
              {/* 右侧：操作按钮/校验模式 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {scriptViewMode === 'llm' && (
                  <button
                    type="button"
                    onClick={handleRebuildStructured}
                    style={{
                      padding: '4px 10px',
                      border: '1px solid #60a5fa',
                      borderRadius: '4px',
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                    title="从原始文本重新解构为结构化内容并同步列表"
                  >
                    重新解构
                  </button>
                )}
                {scriptViewMode === 'script' && (
                  <>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>Replay校验</span>
                  <select
                    value={data.validationMode || 'none'}
                    onChange={(e) => setData(prev => ({ ...prev, validationMode: e.target.value }))}
                    title={data.validationMode === 'strict' 
                      ? '强校验：必须校验满足相似的前后特征或相似内容才可处理，较容易导致 pass' 
                      : '不校验：不做强制校验要求，基于提供信息努力找到目标位置并执行'}
                    style={{ 
                      padding: '4px 10px', 
                      border: `1px solid ${data.validationMode === 'strict' ? '#f59e0b' : '#d1d5db'}`,
                      borderRadius: '4px', 
                      fontSize: '13px', 
                      background: data.validationMode === 'strict' ? '#fffbeb' : '#fff',
                      color: data.validationMode === 'strict' ? '#b45309' : '#374151',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="none">🔓 不校验</option>
                    <option value="strict">🔒 强校验</option>
                  </select>
                </>
                )}
              </div>
            </div>
            
            {/* 根据视图模式显示不同内容 */}
            {scriptViewMode === 'script' ? (
              /* 结构化脚本内容 - 可编辑 */
              <textarea
                value={selectedSectionIndex >= 0 
                  ? getScriptForSection(data.structuredScript, selectedSectionIndex)
                  : (data.structuredScript || '')
                }
                onChange={(e) => {
                  if (selectedSectionIndex >= 0) {
                    const updatedScript = updateScriptForSection(
                      data.structuredScript, 
                      selectedSectionIndex, 
                      e.target.value
                    );
                    setData(prev => ({ ...prev, structuredScript: updatedScript }));
                  } else {
                    setData(prev => ({ ...prev, structuredScript: e.target.value }));
                  }
                }}
                placeholder={'请输入或编辑结构化脚本，Replay 时将按此脚本执行...'}
                style={{ 
                  width: '100%', 
                  height: '220px', 
                  padding: '12px', 
                  border: `1px solid ${data.structuredScript ? '#a7f3d0' : '#d1d5db'}`,
                  borderRadius: '6px', 
                  fontSize: '13px',
                  background: data.structuredScript ? '#f0fdf4' : '#fff',
                  color: '#1f2937',
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                  resize: 'vertical',
                  lineHeight: '1.5'
                }}
              />
            ) : (
              /* 大模型记录内容 - 结构化可编辑 */
              <div style={{ position: 'relative' }}>
                {data.autoProcessing ? (
                  <div style={{
                    padding: '60px 20px',
                    textAlign: 'center',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
                    <div style={{ color: '#667eea', fontWeight: 500 }}>AI 正在自动生成结构化记录...</div>
                  </div>
                ) : selectedSectionIndex === -1 ? (
                  /* 【新增】全部步骤选中时显示提示信息，不显示结构化编辑 */
                  <div style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px dashed #e2e8f0'
                  }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
                    <div style={{ color: '#64748b', fontWeight: 500, marginBottom: '8px' }}>
                      已选择「全部步骤」
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '13px' }}>
                      请在上方列表中选择具体的步骤，以查看和编辑该步骤的结构化内容
                    </div>
                  </div>
                ) : (
                  <div style={{ 
                    maxHeight: '350px', 
                    overflow: 'auto',
                    border: '1px solid #bfdbfe',
                    borderRadius: '8px',
                    padding: '12px',
                    background: '#fafbff'
                  }}>
                    <StructuredRecordEditor
                      content={data.llmRecordContent || llmRecordContent}
                      onChange={(newContent) => {
                        // 【修复】除了更新 llmRecordContent，还要从内容中提取灵活上传字段并同步到 section
                        setData(prev => {
                          const updated = { ...prev, llmRecordContent: newContent };
                          
                          // 尝试提取灵活名称上传字段值
                          const flexMatch = newContent.match(/【灵活名称上传】([^\n【]*)/);
                          const flexKeywordsMatch = newContent.match(/【灵活匹配关键词】([^\n【]*)/);
                          
                          const hasSelectedSection = selectedSectionIndex >= 0 && prev.sections?.[selectedSectionIndex];
                          if (hasSelectedSection) {
                            // 同步更新当前步骤的结构化内容（确保列表展示与编辑一致）
                            const stepContent = extractFullStepContent(newContent, selectedSectionIndex + 1);
                            if (stepContent) {
                              const updatedSections = [...prev.sections];
                              const section = updatedSections[selectedSectionIndex];
                              updatedSections[selectedSectionIndex] = {
                                ...section,
                                llmScript: {
                                  ...(section.llmScript || {}),
                                  structuredScriptContent: stepContent
                                }
                              };
                              updated.sections = updatedSections;
                            }
                          }

                          if (flexMatch && hasSelectedSection) {
                            const flexValue = flexMatch[1]?.trim() || '';
                            const flexKeywordsValue = flexKeywordsMatch?.[1]?.trim() || '';
                            
                            // 同步更新 section 的 llmScript
                            const updatedSections = [...prev.sections];
                            const section = updatedSections[selectedSectionIndex];
                            updatedSections[selectedSectionIndex] = {
                              ...section,
                              llmScript: {
                                ...(section.llmScript || {}),
                                flexKeywords: flexValue,
                                // 如果有匹配结果，也保存
                                ...(flexKeywordsValue ? { flexMatchResult: flexKeywordsValue } : {})
                              }
                            };
                            updated.sections = updatedSections;
                          }
                          
                          return updated;
                        });
                      }}
                      disabled={data.autoProcessing}
                      placeholder="暂无大模型记录，请先进行 AI 优化生成"
                      fieldValidation={data.fieldValidation || {}}
                      onFieldValidationChange={(newValidation) => {
                        setData(prev => ({ ...prev, fieldValidation: newValidation }));
                      }}
                      // 【关键】传入原始 sections 数组，确保步骤数量与录制一致
                      sections={data.sections}
                      // 【新增】外部控制步骤跳转，使用上方的操作步骤列表统一控制
                      activeStepIndex={selectedSectionIndex}
                      // 【新增】灵活上传功能（仅 add_doc 类型可用）
                      onFlexUpload={isAddDocSection ? handleFlexUpload : null}
                      flexUploadLoading={flexUploadLoading}
                      forcedViewMode={llmEditorViewMode}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI 优化区域 - 根据当前视图模式进行优化 */}
          <>
            {/* 补充要求 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#374151' }}>
                修改指示（可选）
                <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: '8px' }}>告诉 AI 如何调整脚本</span>
              </label>
              <textarea
                value={data.userRequirements || ''}
                onChange={(e) => setData(prev => ({ ...prev, userRequirements: e.target.value }))}
                placeholder="例如：把职称去掉，只留下名字；第2步改为通用描述..."
                style={{ 
                  width: '100%', 
                  height: '50px', 
                  padding: '10px 12px', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '6px', 
                  fontSize: '14px', 
                  resize: 'vertical' 
                }}
              />
            </div>

            {/* AI 优化按钮 */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                onClick={() => onAIProcess(scriptViewMode)}
                disabled={data.isProcessing}
                style={{
                  background: data.isProcessing 
                    ? '#9ca3af' 
                    : (scriptViewMode === 'llm' 
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                        : 'linear-gradient(135deg, #10b981 0%, #059669 100%)'),
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  cursor: data.isProcessing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {data.isProcessing 
                  ? '⏳ AI 处理中...' 
                  : (scriptViewMode === 'llm' 
                      ? (data.llmRecordContent ? '🔄 AI 重新优化大模型记录' : '🤖 大模型Replay：AI 智能执行')
                      : (data.structuredScript ? '🔄 AI 重新优化脚本' : '📜 脚本Replay 优化')
                    )
                }
              </button>
              <span style={{ color: '#6b7280', fontSize: '13px' }}>
                {scriptViewMode === 'llm' 
                  ? (data.llmRecordContent 
                      ? '基于大模型记录内容和修改指示优化，结果写回大模型记录' 
                      : '将录制内容转化为大模型可理解的结构化记录')
                  : (data.structuredScript 
                      ? '基于脚本内容和修改指示优化，结果写回脚本记录' 
                      : '将录制内容转化为可复用的结构化脚本')
                }
              </span>
            </div>
          </>
        </div>

        {/* 底部 */}
        <div className="modal-foot" style={{ 
          borderTop: '1px solid #e5e7eb', 
          padding: '12px 16px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            {isLlmMode 
              ? '🤖 大模型Replay：AI 智能执行' 
              : '📜 脚本Replay：严格匹配执行'}
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="ghost small" 
              type="button" 
              onClick={onCancel}
              style={{ padding: '8px 16px' }}
            >
              取消
            </button>
            {!isEditMode && (
              <button 
                className="ghost small" 
                type="button" 
                onClick={onDiscard}
                style={{ padding: '8px 16px', color: '#dc2626' }}
              >
                放弃录制
              </button>
            )}
            <button 
              type="button" 
              onClick={onConfirm}
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
              {isEditMode ? '✓ 保存修改' : '✓ 确认保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepositConfirmModal;
